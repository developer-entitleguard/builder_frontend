import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { useToast } from "@/hooks/use-toast";
import { Project } from "@/hooks/useProjects";
import { Activity } from "@/hooks/useActivities";
import { useLazyGetProjectPricingQuery } from "@/store/api/pricing";
import type { BuilderPricingEntry } from "@/store/api/pricing";

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

function mapBuilderPricingToState(entry: BuilderPricingEntry | undefined): {
  pricing: ProjectPricing | null;
  costItems: CostItem[];
} {
  if (!entry || entry.id == null) {
    return { pricing: null, costItems: [] };
  }
  const pricingId = entry.id;
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
  const items: CostItem[] = (entry.costItems ?? []).map((c, idx) => ({
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
  }));
  return { pricing: pricingRecord, costItems: items };
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

  const fetchPricing = useCallback(async () => {
    if (!projectId) return;

    if (isBuilder) {
      try {
        setLoading(true);
        const result = await fetchBuilderPricing({ projectId }).unwrap();
        if (result?.success && Array.isArray(result.data)) {
          const latest = result.data.length > 0 ? result.data[result.data.length - 1] : undefined;
          const { pricing: p, costItems: items } = mapBuilderPricingToState(latest);
          setPricing(p);
          setCostItems(items);
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
      const { data: pricingData, error: pricingError } = await (supabase as any)
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
        const { data: itemsData, error: itemsError } = await (supabase as any)
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
    } catch (error: any) {
      console.error("Error fetching pricing:", error);
      toast({
        title: "Error fetching pricing",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [user, projectId, toast, isBuilder, fetchBuilderPricing]);

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
        const result = await fetchBuilderPricing({ projectId }).unwrap();
        if (result?.success && Array.isArray(result.data)) {
          const latest = result.data.length > 0 ? result.data[result.data.length - 1] : undefined;
          const { pricing: p, costItems: items } = mapBuilderPricingToState(latest);
          setPricing(p);
          setCostItems(items);
          const total = p?.final_price ?? items.reduce((s, i) => s + i.total_cost, 0);
          toast({
            title: "Pricing loaded",
            description: items.length
              ? `${items.length} cost items, total $${total.toLocaleString()}`
              : "No pricing entries yet.",
          });
          return true;
        }
        setPricing(null);
        setCostItems([]);
        toast({
          title: "No pricing data",
          description: result?.message ?? "No pricing entries returned.",
        });
        return true;
      } catch (e) {
        toast({
          title: "Error loading pricing",
          description: e instanceof Error ? e.message : "Failed to load pricing",
          variant: "destructive",
        });
        return false;
      } finally {
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
        await (supabase as any)
          .from('project_pricing')
          .delete()
          .eq('id', pricing.id);
      }
      
      // Create new pricing record
      const { data: newPricing, error: pricingError } = await (supabase as any)
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

      const { error: itemsError } = await (supabase as any)
        .from('project_cost_items')
        .insert(costItemsToInsert);

      if (itemsError) throw itemsError;
      
      await fetchPricing();
      
      toast({
        title: "Pricing generated",
        description: `AI generated ${generatedItems.length} cost items totaling $${totalCost.toLocaleString()}`
      });
      
      return true;
    } catch (error: any) {
      console.error("Error generating pricing:", error);
      toast({
        title: "Error generating pricing",
        description: error.message,
        variant: "destructive"
      });
      return false;
    } finally {
      setGenerating(false);
    }
  };

  const updateCostItem = async (itemId: string, updates: Partial<CostItem>): Promise<boolean> => {
    try {
      const { error } = await (supabase as any)
        .from('project_cost_items')
        .update({
          ...updates,
          is_modified: true
        })
        .eq('id', itemId);

      if (error) throw error;
      
      // Update local state
      setCostItems(prev => prev.map(item => 
        item.id === itemId ? { ...item, ...updates, is_modified: true } : item
      ));
      
      // Recalculate totals
      await recalculateTotals();
      
      return true;
    } catch (error: any) {
      toast({
        title: "Error updating cost item",
        description: error.message,
        variant: "destructive"
      });
      return false;
    }
  };

  const deleteCostItem = async (itemId: string): Promise<boolean> => {
    try {
      const { error } = await (supabase as any)
        .from('project_cost_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
      
      setCostItems(prev => prev.filter(item => item.id !== itemId));
      await recalculateTotals();
      
      return true;
    } catch (error: any) {
      toast({
        title: "Error deleting cost item",
        description: error.message,
        variant: "destructive"
      });
      return false;
    }
  };

  const addCostItem = async (item: Omit<CostItem, 'id' | 'pricing_id' | 'created_at' | 'updated_at'>): Promise<boolean> => {
    if (!pricing) return false;
    
    try {
      const { error } = await (supabase as any)
        .from('project_cost_items')
        .insert({
          ...item,
          pricing_id: pricing.id,
          is_ai_generated: false,
          is_modified: false
        });

      if (error) throw error;
      
      await fetchPricing();
      return true;
    } catch (error: any) {
      toast({
        title: "Error adding cost item",
        description: error.message,
        variant: "destructive"
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
    
    const { error } = await (supabase as any)
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

      const { error } = await (supabase as any)
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
    } catch (error: any) {
      toast({
        title: "Error updating buffer/margin",
        description: error.message,
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
