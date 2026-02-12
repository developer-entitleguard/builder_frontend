import { useState, useCallback, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { useToast } from "@/hooks/use-toast";
import {
  useGetActivitiesByProjectQuery,
  useCreateActivityMutation,
  type BuilderActivityApi,
} from "@/store/api/activities";
import { useGetStatusesByModuleQuery } from "@/lib/api/services/status";

export type ActivityStatus = 'pending' | 'in_progress' | 'done';
export type ActivityPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Activity {
  id: string;
  project_id: string;
  builder_id: string;
  name: string;
  description: string | null;
  status: ActivityStatus;
  priority: ActivityPriority;
  percentage_complete: number;
  due_date: string | null;
  completed_at: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
  /** Optional: for categorized list UI */
  category_id?: string | null;
  /** Derived from status === 'done' for checklist UI */
  completed?: boolean;
  /** Optional pricing & vendor fields for detail UI */
  quote?: number | null;
  price_paid?: number | null;
  vendor_name?: string | null;
  vendor_email?: string | null;
  vendor_phone?: string | null;
}

export interface ActivityUpdate {
  id: string;
  activity_id: string;
  builder_id: string;
  content: string;
  attachments: unknown[];
  created_at: string;
}

export interface CreateActivityData {
  name: string;
  description?: string | null;
  status?: ActivityStatus;
  priority?: ActivityPriority;
  percentage_complete?: number;
  due_date?: string | null;
  category_id?: string | null;
}

// Builder auth helper for JWT stored in localStorage.userData
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

const mapActivityStatus = (value: string): ActivityStatus => {
  const key = value.toLowerCase();
  switch (key) {
    case "pending":
      return "pending";
    case "inprogress":
    case "in_progress":
      return "in_progress";
    case "done":
      return "done";
    default:
      return "pending";
  }
};

export const useActivities = (projectId: string | undefined) => {
  const { user } = useAuth();
  const { organization } = useOrganization();
  const { toast } = useToast();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);

  const isBuilder = hasBuilderAuth();

  const { data: activityStatusesResponse } = useGetStatusesByModuleQuery(
    { module: "ACTIVITIES" },
    { skip: !isBuilder }
  );

  const pendingStatusId = useMemo(() => {
    if (!activityStatusesResponse?.data) return undefined;
    const pending = activityStatusesResponse.data.find(
      (s) => s.name.toUpperCase() === "PENDING"
    );
    return pending?.id;
  }, [activityStatusesResponse]);

  const {
    data: apiActivities,
    isLoading: apiLoading,
    refetch: refetchApiActivities,
  } = useGetActivitiesByProjectQuery(
    { projectId: projectId! },
    { skip: !projectId || !isBuilder }
  );

  const [createActivityMutation] = useCreateActivityMutation();

  // Map builder API activities into local Activity shape
  useEffect(() => {
    if (!isBuilder || !apiActivities?.data) return;

    const mapped: Activity[] = apiActivities.data.map((a: BuilderActivityApi) => {
      const status = mapActivityStatus(a.statusName);
      return {
        id: a.id,
        project_id: a.projectId,
        builder_id: "",
        name: a.name,
        description: a.description ?? null,
        status,
        priority: "medium",
        percentage_complete: a.percentageComplete ?? 0,
        due_date: a.dueDate ?? null,
        completed_at: a.completedAt ?? null,
        order_index: a.orderIndex ?? 0,
        created_at: a.createdAt,
        updated_at: a.updatedAt,
        completed: status === "done",
      };
    });

    setActivities(mapped);
  }, [isBuilder, apiActivities]);

  const fetchActivities = useCallback(async () => {
    if (!projectId) return;

    // If builder JWT auth is present, use builder activities API via RTK Query
    if (isBuilder) {
      await refetchApiActivities();
      return;
    }

    // Fallback: Supabase-based activities (legacy flow)
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await (supabase as typeof supabase)
        .from("project_activities")
        .select("*")
        .eq("project_id", projectId)
        .order("order_index", { ascending: true });

      if (error) throw error;
      setActivities((data as Activity[]) || []);
    } catch (error: unknown) {
      toast({
        title: "Error fetching activities",
        description: error instanceof Error ? error.message : "Failed to update activity",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [projectId, user, toast, isBuilder, refetchApiActivities]);

  const createActivity = async (data: CreateActivityData): Promise<Activity | null> => {
    if (!projectId) throw new Error("No project");

    // Builder API path via RTK Query
    if (isBuilder) {
      try {
        const maxOrder =
          activities.length > 0
            ? Math.max(...activities.map((a) => a.order_index)) + 1
            : 0;

        const body = {
          completedAt: data.status === "done" ? new Date().toISOString() : null,
          description: data.description ?? "",
          dueDate: data.due_date ?? "",
          name: data.name,
          orderIndex: maxOrder,
          percentageComplete:
            data.percentage_complete ??
            (data.status === "done" ? 100 : 0),
          // For now, use the activity status string as the statusId;
          // backend can map this to its internal status record.
          statusId: pendingStatusId ?? data.status ?? "pending",
        };

        const result = await createActivityMutation({
          projectId: projectId!,
          body,
        }).unwrap();

        if (!result?.data) {
          toast({
            title: "Error creating activity",
            description: result?.message || "Failed to create activity",
            variant: "destructive",
          });
          return null;
        }

        const createdApi = result.data;

        const created: Activity = {
          id: createdApi.id,
          project_id: createdApi.projectId,
          builder_id: "",
          name: createdApi.name,
          description: createdApi.description,
          status: mapActivityStatus(createdApi.statusName),
          priority: "medium",
          percentage_complete: createdApi.percentageComplete ?? 0,
          due_date: createdApi.dueDate,
          completed_at: createdApi.completedAt,
          order_index: createdApi.orderIndex,
          created_at: createdApi.createdAt,
          updated_at: createdApi.updatedAt,
        };

        toast({
          title: "Activity added",
          description: result.message || "New activity has been added to the project.",
        });

        // RTK Query invalidates the list; local state will be updated via useEffect
        return created;
      } catch (error: unknown) {
        toast({
          title: "Error creating activity",
          description:
            error instanceof Error
              ? error.message
              : "Failed to create activity",
          variant: "destructive",
        });
        return null;
      }
    }

    // Legacy Supabase path
    if (!user) throw new Error("Not authenticated");
    if (!organization) throw new Error("No organization found");

    try {
      const maxOrder =
        activities.length > 0
          ? Math.max(...activities.map((a) => a.order_index)) + 1
          : 0;

      const { data: result, error } = await (supabase as typeof supabase)
        .from("project_activities")
        .insert({
          ...data,
          project_id: projectId,
          builder_id: user.id,
          organization_id: organization.id,
          status: data.status || "pending",
          priority: data.priority || "medium",
          percentage_complete: data.percentage_complete || 0,
          order_index: maxOrder,
        })
        .select()
        .single();

      if (error) throw error;

      await fetchActivities();
      toast({
        title: "Activity added",
        description: "New activity has been added to the project.",
      });
      return result as Activity;
    } catch (error: unknown) {
      toast({
        title: "Error creating activity",
          description: error instanceof Error ? error.message : "Failed to create activity",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateActivity = async (id: string, data: Partial<CreateActivityData & { status: ActivityStatus; percentage_complete: number; completed?: boolean }>): Promise<boolean> => {
    try {
      const updateData: Record<string, unknown> = { ...data };
      if (typeof data.completed === "boolean") {
        updateData.status = data.completed ? "done" : "pending";
        updateData.percentage_complete = data.completed ? 100 : 0;
        if (data.completed) updateData.completed_at = new Date().toISOString();
        delete updateData.completed;
      }
      if (data.status === "done") {
        updateData.completed_at = new Date().toISOString();
        updateData.percentage_complete = 100;
      }

      const { error } = await (supabase as typeof supabase)
        .from('project_activities')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
      
      await fetchActivities();
      return true;
    } catch (error: unknown) {
      toast({
        title: "Error updating activity",
        description: error instanceof Error ? error.message : "Failed to delete activity",
        variant: "destructive"
      });
      return false;
    }
  };

  const deleteActivity = async (id: string): Promise<boolean> => {
    try {
      const { error } = await (supabase as typeof supabase)
        .from('project_activities')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      await fetchActivities();
      toast({
        title: "Activity deleted",
        description: "Activity has been removed."
      });
      return true;
    } catch (error: unknown) {
      toast({
        title: "Error deleting activity",
        description: error instanceof Error ? error.message : "Failed to delete activity",
        variant: "destructive"
      });
      return false;
    }
  };

  // Activity Updates
  const fetchUpdates = async (activityId: string): Promise<ActivityUpdate[]> => {
    try {
      const { data, error } = await (supabase as typeof supabase)
        .from('activity_updates')
        .select('*')
        .eq('activity_id', activityId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data as ActivityUpdate[]) || [];
    } catch (error: unknown) {
      toast({
        title: "Error fetching updates",
        description: error instanceof Error ? error.message : "Failed to fetch updates",
        variant: "destructive"
      });
      return [];
    }
  };

  const postUpdate = async (activityId: string, content: string): Promise<boolean> => {
    if (!user || !organization) return false;
    
    try {
      const { error } = await (supabase as typeof supabase)
        .from('activity_updates')
        .insert({
          activity_id: activityId,
          builder_id: user.id,
          organization_id: organization.id,
          content
        });

      if (error) throw error;
      
      toast({
        title: "Update posted",
        description: "Your update has been added."
      });
      return true;
    } catch (error: unknown) {
      toast({
        title: "Error posting update",
        description: error instanceof Error ? error.message : "Failed to post update",
        variant: "destructive"
      });
      return false;
    }
  };

  return {
    activities,
    loading: isBuilder ? apiLoading : loading,
    fetchActivities,
    createActivity,
    updateActivity,
    deleteActivity,
    fetchUpdates,
    postUpdate
  };
};
