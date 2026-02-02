import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { useToast } from "@/hooks/use-toast";

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
}

export interface ActivityUpdate {
  id: string;
  activity_id: string;
  builder_id: string;
  content: string;
  attachments: any[];
  created_at: string;
}

export interface CreateActivityData {
  name: string;
  description?: string | null;
  status?: ActivityStatus;
  priority?: ActivityPriority;
  percentage_complete?: number;
  due_date?: string | null;
}

export const useActivities = (projectId: string | undefined) => {
  const { user } = useAuth();
  const { organization } = useOrganization();
  const { toast } = useToast();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchActivities = useCallback(async () => {
    if (!projectId || !user) return;
    
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('project_activities')
        .select('*')
        .eq('project_id', projectId)
        .order('order_index', { ascending: true });

      if (error) throw error;
      setActivities((data as Activity[]) || []);
    } catch (error: any) {
      toast({
        title: "Error fetching activities",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [projectId, user, toast]);

  const createActivity = async (data: CreateActivityData): Promise<Activity | null> => {
    if (!user || !projectId) throw new Error('Not authenticated or no project');
    if (!organization) throw new Error('No organization found');
    
    try {
      const maxOrder = activities.length > 0 
        ? Math.max(...activities.map(a => a.order_index)) + 1 
        : 0;

      const { data: result, error } = await (supabase as any)
        .from('project_activities')
        .insert({
          ...data,
          project_id: projectId,
          builder_id: user.id,
          organization_id: organization.id,
          status: data.status || 'pending',
          priority: data.priority || 'medium',
          percentage_complete: data.percentage_complete || 0,
          order_index: maxOrder
        })
        .select()
        .single();

      if (error) throw error;
      
      await fetchActivities();
      toast({
        title: "Activity added",
        description: "New activity has been added to the project."
      });
      return result as Activity;
    } catch (error: any) {
      toast({
        title: "Error creating activity",
        description: error.message,
        variant: "destructive"
      });
      return null;
    }
  };

  const updateActivity = async (id: string, data: Partial<CreateActivityData & { status: ActivityStatus; percentage_complete: number }>): Promise<boolean> => {
    try {
      const updateData: any = { ...data };
      
      if (data.status === 'done') {
        updateData.completed_at = new Date().toISOString();
        updateData.percentage_complete = 100;
      }

      const { error } = await (supabase as any)
        .from('project_activities')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
      
      await fetchActivities();
      return true;
    } catch (error: any) {
      toast({
        title: "Error updating activity",
        description: error.message,
        variant: "destructive"
      });
      return false;
    }
  };

  const deleteActivity = async (id: string): Promise<boolean> => {
    try {
      const { error } = await (supabase as any)
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
    } catch (error: any) {
      toast({
        title: "Error deleting activity",
        description: error.message,
        variant: "destructive"
      });
      return false;
    }
  };

  // Activity Updates
  const fetchUpdates = async (activityId: string): Promise<ActivityUpdate[]> => {
    try {
      const { data, error } = await (supabase as any)
        .from('activity_updates')
        .select('*')
        .eq('activity_id', activityId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data as ActivityUpdate[]) || [];
    } catch (error: any) {
      toast({
        title: "Error fetching updates",
        description: error.message,
        variant: "destructive"
      });
      return [];
    }
  };

  const postUpdate = async (activityId: string, content: string): Promise<boolean> => {
    if (!user || !organization) return false;
    
    try {
      const { error } = await (supabase as any)
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
    } catch (error: any) {
      toast({
        title: "Error posting update",
        description: error.message,
        variant: "destructive"
      });
      return false;
    }
  };

  return {
    activities,
    loading,
    fetchActivities,
    createActivity,
    updateActivity,
    deleteActivity,
    fetchUpdates,
    postUpdate
  };
};
