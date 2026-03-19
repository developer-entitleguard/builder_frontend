import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { useToast } from "@/hooks/use-toast";
import { Project } from "@/hooks/useProjects";
import { Activity } from "@/hooks/useActivities";
import {
  useLazyGetProjectPricingQuery,
  useLazyGetPricingCostItemsQuery,
  useCreatePricingCostItemsMutation,
  useUpdatePricingCostItemMutation,
  useCreateProjectPricingMutation,
  useGenerateProjectPricingMutation,
} from "@/store/api/pricing";
import type {
  BuilderPricingEntry,
  BuilderPricingCostItem,
} from "@/store/api/pricing";

export type CostCategory = 'materials' | 'labour' | 'subcontractors' | 'overheads';

export interface CostItem {
  id: string;
  pricing_id: string;
  category: CostCategory;
  name: string;
  description: string | null;
  unit_rate: number | null;
  quantity: number;
  total_cost: number;
  linked_activity_id: string | null;
  is_ai_generated: boolean;
  is_modified: boolean;
  ai_assumptions: string | null;
  from_bom: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProjectPricing {
  id: string;
  project_id: string;
  builder_id: string;
  total_estimated_cost: number;
  buffer_percentage: number;
  buffer_amount: number;
  margin_percentage: number;
  margin_amount: number;
  final_price: number;
  created_at: string;
  updated_at: string;
}

interface GeneratedCostItem {
  category: CostCategory;
  name: string;
  description: string;
  total_cost: number;
  ai_assumptions: string;
  linked_activity_id: string | null;
  from_bom?: boolean;
}

const hasBuilderAuth = (): boolean => {
  try {
    const userData = localStorage.getItem("userData");
    if (!userData) return false;
    const parsed = JSON.parse(userData) as { jwt?: string } | null;
    return !!parsed?.jwt;
  } catch {
    return false;
  }
};

function mapBuilderPricingToState(
  entry: BuilderPricingEntry | undefined
): {
  pricing: ProjectPricing | null;
} {
  if (!entry || entry.id == null) {
    return { pricing: null };
  }
  const pricingRecord: ProjectPricing = {
    id: entry.id,
    project_id: entry.projectId ?? "",
    builder_id: "",
    total_estimated_cost: entry.totalEstimatedCost ?? 0,
    buffer_percentage: entry.bufferPercentage ?? 0,
    buffer_amount: entry.bufferAmount ?? 0,
    margin_percentage: entry.marginPercentage ?? 0,
    margin_amount: entry.marginAmount ?? 0,
    final_price: entry.finalPrice ?? entry.totalEstimatedCost ?? 0,
    created_at: entry.createdAt ?? new Date().toISOString(),
    updated_at: entry.updatedAt ?? new Date().toISOString(),
  };
  return { pricing: pricingRecord };
}

const hasPricingValues = (entry: BuilderPricingEntry): boolean => {
  return (
    entry.totalEstimatedCost != null ||
    entry.bufferAmount != null ||
    entry.bufferPercentage != null ||
    entry.marginAmount != null ||
    entry.marginPercentage != null ||
    entry.finalPrice != null
  );
};

const getEntryTimestamp = (entry: BuilderPricingEntry): number => {
  const ts = entry.updatedAt ?? entry.createdAt;
  if (!ts) return 0;
  const ms = new Date(ts).getTime();
  return Number.isFinite(ms) ? ms : 0;
};

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message) return error.message;
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }
  return fallback;
};

const selectBestPricingEntry = (
  entries: BuilderPricingEntry[]
): BuilderPricingEntry | undefined => {
  if (!entries.length) return undefined;
  const withValues = entries.filter(hasPricingValues);
  const source = withValues.length > 0 ? withValues : entries;
  return source
    .slice()
    .sort((a, b) => getEntryTimestamp(b) - getEntryTimestamp(a))[0];
};

function mapBuilderCostItemToState(
  c: BuilderPricingCostItem,
  pricingId: string,
  idx: number
): CostItem {
  return {
    id: c.id ?? `item-${idx}`,
    pricing_id: c.pricingId ?? pricingId,
    category: (c.category as CostCategory) ?? "materials",
    name: c.name ?? "",
    description: c.description ?? null,
    unit_rate: c.unitRate ?? null,
    quantity: c.quantity ?? 1,
    total_cost: c.totalCost ?? 0,
    linked_activity_id: c.linkedActivityId ?? null,
    is_ai_generated: c.isAiGenerated ?? false,
    is_modified: c.isModified ?? false,
    ai_assumptions: c.aiAssumptions ?? null,
    from_bom: c.fromBom ?? false,
    created_at: c.createdAt ?? new Date().toISOString(),
    updated_at: c.updatedAt ?? new Date().toISOString(),
  };
}

export const useProjectPricing = (projectId: string | undefined) => {
  const { user } = useAuth();
  const { organization } = useOrganization();
  const { toast } = useToast();
  const [pricing, setPricing] = useState<ProjectPricing | null>(null);
  const [costItems, setCostItems] = useState<CostItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const isBuilder = hasBuilderAuth();
  const [fetchBuilderPricing] = useLazyGetProjectPricingQuery();
  const [fetchBuilderCostItems] = useLazyGetPricingCostItemsQuery();
  const [createPricingCostItems] = useCreatePricingCostItemsMutation();
  const [updatePricingCostItem] = useUpdatePricingCostItemMutation();
  const [createProjectPricing] = useCreateProjectPricingMutation();
  const [generateProjectPricing] = useGenerateProjectPricingMutation();

  const sleep = (ms: number) =>
    new Promise<void>((resolve) => {
      setTimeout(resolve, ms);
    });

  const fetchPricing = useCallback(async () => {
    if (!projectId) return;

    if (isBuilder) {
      try {
        setLoading(true);
        const result = await fetchBuilderPricing({ projectId }).unwrap();
        if (result?.success && Array.isArray(result.data)) {
          const latest = selectBestPricingEntry(result.data);
          const { pricing: p } = mapBuilderPricingToState(latest);
          setPricing(p);

          if (latest?.id) {
            try {
              const costItemsResult = await fetchBuilderCostItems({
                pricingId: latest.id,
              }).unwrap();
              if (
                costItemsResult?.success &&
                Array.isArray(costItemsResult.data)
              ) {
                const items = costItemsResult.data.map((c, idx) =>
                  mapBuilderCostItemToState(c, latest.id!, idx)
                );
                setCostItems(items);
              } else {
                setCostItems([]);
              }
            } catch {
              setCostItems([]);
            }
          } else {
            setCostItems([]);
          }
        } else {
          setPricing(null);
          setCostItems([]);
        }
      } catch (e) {
        toast({
          title: "Error fetching pricing",
          description: e instanceof Error ? e.message : "Failed to load pricing",
          variant: "destructive",
        });
        setPricing(null);
        setCostItems([]);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!user) return;
    
    try {
      setLoading(true);
      
      // Fetch pricing
      const { data: pricingData, error: pricingError } = await (supabase as typeof supabase)
        .from('project_pricing')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (pricingError) throw pricingError;
      
      if (pricingData) {
        setPricing(pricingData as ProjectPricing);
        
        // Fetch cost items
        const { data: itemsData, error: itemsError } = await (supabase as typeof supabase)
          .from('project_cost_items')
          .select('*')
          .eq('pricing_id', pricingData.id)
          .order('category', { ascending: true });

        if (itemsError) throw itemsError;
        setCostItems((itemsData as CostItem[]) || []);
      } else {
        setPricing(null);
        setCostItems([]);
      }
    } catch (error: unknown) {
      console.error("Error fetching pricing:", error);
      toast({
        title: "Error fetching pricing",
        description: getErrorMessage(error, "Failed to load pricing"),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [user, projectId, toast, isBuilder, fetchBuilderPricing, fetchBuilderCostItems]);

  useEffect(() => {
    if (projectId && (isBuilder || user)) {
      fetchPricing();
    }
  }, [projectId, isBuilder, user, fetchPricing]);

  const generatePricing = async (project: Project, activities: Activity[]): Promise<boolean> => {
    if (!projectId) {
      toast({
        title: "Cannot generate pricing",
        description: "No project is selected.",
        variant: "destructive",
      });
      return false;
    }

    if (isBuilder) {
      try {
        setGenerating(true);

        // Step 1: POST /api/builder/projects/{projectId}/pricing → get pricingId
        const createResult = await createProjectPricing({ projectId }).unwrap();
        if (!createResult?.success || !createResult?.data?.pricingId) {
          throw new Error(createResult?.message ?? "Failed to create pricing record");
        }
        const pricingId = createResult.data.pricingId;

        // Step 2: POST /api/builder/projects/{projectId}/pricing/{pricingId}/generate
        await generateProjectPricing({ projectId, pricingId }).unwrap();

        // Regeneration can be eventually-consistent; poll pricing + cost-items briefly.
        setLoading(true);
        let latestPricing: ProjectPricing | null = null;
        let latestItems: CostItem[] = [];
        const maxAttempts = 5;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          const result = await fetchBuilderPricing({ projectId }).unwrap();
          if (result?.success && Array.isArray(result.data)) {
            const latest = selectBestPricingEntry(result.data);
            const { pricing: p } = mapBuilderPricingToState(latest);
            latestPricing = p;
            setPricing(p);

            if (latest?.id) {
              const costItemsResult = await fetchBuilderCostItems({
                pricingId: latest.id,
              }).unwrap();
              if (costItemsResult?.success && Array.isArray(costItemsResult.data)) {
                latestItems = costItemsResult.data.map((c, idx) =>
                  mapBuilderCostItemToState(c, latest.id!, idx)
                );
                setCostItems(latestItems);
              } else {
                latestItems = [];
                setCostItems([]);
              }
            } else {
              latestItems = [];
              setCostItems([]);
            }

            const hasMeaningfulPricing =
              latest?.totalEstimatedCost != null ||
              latest?.bufferAmount != null ||
              latest?.bufferPercentage != null ||
              latest?.marginAmount != null ||
              latest?.marginPercentage != null ||
              latest?.finalPrice != null;

            if (hasMeaningfulPricing || latestItems.length > 0) {
              break;
            }
          }

          await sleep(1200);
        }

        const total =
          latestPricing?.final_price ??
          latestPricing?.total_estimated_cost ??
          latestItems.reduce((s, i) => s + Number(i.total_cost), 0);
        toast({
          title: "Pricing generated",
          description: `${latestItems.length} cost items · Total $${total.toLocaleString()}`,
        });
        return true;
      } catch (e) {
        toast({
          title: "Error generating pricing",
          description: e instanceof Error ? e.message : "Failed to generate pricing",
          variant: "destructive",
        });
        return false;
      } finally {
        setLoading(false);
        setGenerating(false);
      }
    }

    if (!user) {
      toast({
        title: "Cannot generate pricing",
        description: "You must be signed in to generate an AI cost estimate.",
        variant: "destructive",
      });
      return false;
    }
    
    try {
      setGenerating(true);
      
      // Call the edge function
      const { data, error } = await supabase.functions.invoke('generate-project-pricing', {
        body: {
          project: {
            id: projectId,
            name: project.name,
            property_type: project.property_type,
            address: project.address,
            city: project.city,
            state: project.state,
            activities: activities.map(a => ({
              id: a.id,
              name: a.name,
              status: a.status,
              priority: a.priority
            }))
          }
        }
      });

      if (error) throw error;
      
      if (data.error) {
        throw new Error(data.error);
      }

      const generatedItems: GeneratedCostItem[] = data.cost_items;
      
      // Calculate total cost
      const totalCost = generatedItems.reduce((sum, item) => sum + item.total_cost, 0);
      
      // Delete existing pricing if any
      if (pricing) {
        await (supabase as typeof supabase)
          .from('project_pricing')
          .delete()
          .eq('id', pricing.id);
      }
      
      // Create new pricing record
      const { data: newPricing, error: pricingError } = await (supabase as typeof supabase)
        .from('project_pricing')
        .insert({
          project_id: projectId,
          builder_id: user.id,
          organization_id: organization?.id,
          total_estimated_cost: totalCost,
          final_price: totalCost
        })
        .select()
        .single();

      if (pricingError) throw pricingError;
      
      // Insert cost items
      const costItemsToInsert = generatedItems.map(item => ({
        pricing_id: newPricing.id,
        category: item.category,
        name: item.name,
        description: item.description,
        total_cost: item.total_cost,
        linked_activity_id: item.linked_activity_id,
        is_ai_generated: true,
        is_modified: false,
        ai_assumptions: item.ai_assumptions,
        from_bom: item.from_bom || false
      }));

      const { error: itemsError } = await (supabase as typeof supabase)
        .from('project_cost_items')
        .insert(costItemsToInsert);

      if (itemsError) throw itemsError;
      
      await fetchPricing();
      
      toast({
        title: "Pricing generated",
        description: `AI generated ${generatedItems.length} cost items totaling $${totalCost.toLocaleString()}`
      });
      
      return true;
    } catch (error: unknown) {
      console.error("Error generating pricing:", error);
      toast({
        title: "Error generating pricing",
        description: getErrorMessage(error, "Failed to generate pricing"),
        variant: "destructive"
      });
      return false;
    } finally {
      setGenerating(false);
    }
  };

  const updateCostItem = async (
    itemId: string,
    updates: Partial<CostItem>
  ): Promise<boolean> => {
    if (isBuilder && pricing?.id) {
      // Builder API path: PUT /api/builder/pricing/:pricingId/cost-items/:id
      try {
        const existing = costItems.find((i) => i.id === itemId);
        if (!existing) return false;

        const merged: CostItem = {
          ...existing,
          ...updates,
          is_modified: true,
        };

        const dto: BuilderPricingCostItem = {
          id: merged.id,
          pricingId: merged.pricing_id,
          category: merged.category,
          name: merged.name,
          description: merged.description,
          unitRate: merged.unit_rate ?? undefined,
          quantity: merged.quantity,
          totalCost: merged.total_cost,
          linkedActivityId: merged.linked_activity_id ?? undefined,
          isAiGenerated: merged.is_ai_generated,
          isModified: merged.is_modified,
          aiAssumptions: merged.ai_assumptions ?? undefined,
          fromBom: merged.from_bom,
        };

        await updatePricingCostItem({
          pricingId: pricing.id,
          id: itemId,
          item: dto,
        }).unwrap();

        setCostItems((prev) =>
          prev.map((item) =>
            item.id === itemId ? { ...merged } : item
          )
        );

        await recalculateTotals();
        return true;
      } catch (error: unknown) {
        toast({
          title: "Error updating cost item",
          description: getErrorMessage(error, "Failed to update cost item"),
          variant: "destructive",
        });
        return false;
      }
    }

    // Legacy Supabase path
    try {
      const { error } = await (supabase as typeof supabase)
        .from("project_cost_items")
        .update({
          ...updates,
          is_modified: true,
        })
        .eq("id", itemId);

      if (error) throw error;

      setCostItems((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, ...updates, is_modified: true } : item
        )
      );

      await recalculateTotals();

      return true;
    } catch (error: unknown) {
      toast({
        title: "Error updating cost item",
        description: getErrorMessage(error, "Failed to update cost item"),
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteCostItem = async (itemId: string): Promise<boolean> => {
    try {
      const { error } = await (supabase as typeof supabase)
        .from('project_cost_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
      
      setCostItems(prev => prev.filter(item => item.id !== itemId));
      await recalculateTotals();
      
      return true;
    } catch (error: unknown) {
      toast({
        title: "Error deleting cost item",
        description: getErrorMessage(error, "Failed to delete cost item"),
        variant: "destructive"
      });
      return false;
    }
  };

  const addCostItem = async (
    item: Omit<CostItem, "id" | "pricing_id" | "created_at" | "updated_at">
  ): Promise<boolean> => {
    if (!pricing) return false;

    if (isBuilder) {
      // Builder API path: POST /api/builder/pricing/:pricingId/cost-items
      try {
        const dto: BuilderPricingCostItem = {
          pricingId: pricing.id,
          category: item.category,
          name: item.name,
          description: item.description,
          unitRate: item.unit_rate ?? undefined,
          quantity: item.quantity,
          totalCost: item.total_cost,
          linkedActivityId: item.linked_activity_id ?? undefined,
          isAiGenerated: false,
          isModified: false,
          aiAssumptions: item.ai_assumptions ?? undefined,
          fromBom: item.from_bom,
        };

        await createPricingCostItems({
          pricingId: pricing.id,
          items: [dto],
        }).unwrap();

        await fetchPricing();
        return true;
      } catch (error: unknown) {
        toast({
          title: "Error adding cost item",
          description: getErrorMessage(error, "Failed to add cost item"),
          variant: "destructive",
        });
        return false;
      }
    }

    // Legacy Supabase path
    try {
      const { error } = await (supabase as typeof supabase)
        .from("project_cost_items")
        .insert({
          ...item,
          pricing_id: pricing.id,
          is_ai_generated: false,
          is_modified: false,
        });

      if (error) throw error;

      await fetchPricing();
      return true;
    } catch (error: unknown) {
      toast({
        title: "Error adding cost item",
        description: getErrorMessage(error, "Failed to add cost item"),
        variant: "destructive",
      });
      return false;
    }
  };

  const recalculateTotals = async () => {
    if (!pricing) return;
    
    const currentItems = costItems;
    const totalCost = currentItems.reduce((sum, item) => sum + Number(item.total_cost), 0);
    
    const bufferAmt = pricing.buffer_percentage > 0 
      ? (totalCost * pricing.buffer_percentage / 100) 
      : pricing.buffer_amount;
    
    const costPlusBuffer = totalCost + bufferAmt;
    
    const marginAmt = pricing.margin_percentage > 0 
      ? (costPlusBuffer * pricing.margin_percentage / 100) 
      : pricing.margin_amount;
    
    const finalPrice = costPlusBuffer + marginAmt;
    
    const { error } = await (supabase as typeof supabase)
      .from('project_pricing')
      .update({
        total_estimated_cost: totalCost,
        buffer_amount: bufferAmt,
        margin_amount: marginAmt,
        final_price: finalPrice
      })
      .eq('id', pricing.id);

    if (!error) {
      setPricing(prev => prev ? {
        ...prev,
        total_estimated_cost: totalCost,
        buffer_amount: bufferAmt,
        margin_amount: marginAmt,
        final_price: finalPrice
      } : null);
    }
  };

  const updateBufferMargin = async (updates: {
    buffer_percentage?: number;
    buffer_amount?: number;
    margin_percentage?: number;
    margin_amount?: number;
  }): Promise<boolean> => {
    if (!pricing) return false;
    
    try {
      const newPricing = { ...pricing, ...updates };
      
      const totalCost = costItems.reduce((sum, item) => sum + Number(item.total_cost), 0);
      
      const bufferAmt = (updates.buffer_percentage ?? newPricing.buffer_percentage) > 0 
        ? (totalCost * (updates.buffer_percentage ?? newPricing.buffer_percentage) / 100) 
        : (updates.buffer_amount ?? newPricing.buffer_amount);
      
      const costPlusBuffer = totalCost + bufferAmt;
      
      const marginAmt = (updates.margin_percentage ?? newPricing.margin_percentage) > 0 
        ? (costPlusBuffer * (updates.margin_percentage ?? newPricing.margin_percentage) / 100) 
        : (updates.margin_amount ?? newPricing.margin_amount);
      
      const finalPrice = costPlusBuffer + marginAmt;

      const { error } = await (supabase as typeof supabase)
        .from('project_pricing')
        .update({
          ...updates,
          buffer_amount: bufferAmt,
          margin_amount: marginAmt,
          final_price: finalPrice
        })
        .eq('id', pricing.id);

      if (error) throw error;
      
      setPricing(prev => prev ? {
        ...prev,
        ...updates,
        buffer_amount: bufferAmt,
        margin_amount: marginAmt,
        final_price: finalPrice
      } : null);
      
      return true;
    } catch (error: unknown) {
      toast({
        title: "Error updating buffer/margin",
        description: getErrorMessage(error, "Failed to update buffer/margin"),
        variant: "destructive"
      });
      return false;
    }
  };

  // Group cost items by category
  const groupedCostItems = costItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<CostCategory, CostItem[]>);

  return {
    pricing,
    costItems,
    groupedCostItems,
    loading,
    generating,
    fetchPricing,
    generatePricing,
    updateCostItem,
    deleteCostItem,
    addCostItem,
    updateBufferMargin
  };
};
