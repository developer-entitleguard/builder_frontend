import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { useToast } from "@/hooks/use-toast";

export type PropertyType = 'house' | 'townhouse' | 'apartment' | 'duplex' | 'renovation' | 'extension' | 'custom';
export type ProjectStatus = 'planning' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';

export interface Project {
  id: string;
  builder_id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  postcode: string;
  property_type: PropertyType;
  start_date: string | null;
  target_end_date: string | null;
  actual_end_date: string | null;
  status: ProjectStatus;
  description: string | null;
  activities_visible_to_homeowner: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateProjectData {
  name: string;
  address: string;
  city: string;
  state: string;
  postcode: string;
  property_type: PropertyType;
  start_date?: string | null;
  target_end_date?: string | null;
  status?: ProjectStatus;
  description?: string | null;
}

export const useProjects = () => {
  const { user } = useAuth();
  const { organization } = useOrganization();
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProjects = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects((data as Project[]) || []);
    } catch (error: any) {
      toast({
        title: "Error fetching projects",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (user) {
      fetchProjects();
    }
  }, [user, fetchProjects]);

  const fetchProject = async (id: string): Promise<Project | null> => {
    try {
      const { data, error } = await (supabase as any)
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Project;
    } catch (error: any) {
      toast({
        title: "Error fetching project",
        description: error.message,
        variant: "destructive"
      });
      return null;
    }
  };

  const createProject = async (data: CreateProjectData): Promise<Project | null> => {
    if (!user) throw new Error('Not authenticated');
    if (!organization) throw new Error('No organization found');
    
    try {
      const { data: result, error } = await (supabase as any)
        .from('projects')
        .insert({
          ...data,
          builder_id: user.id,
          organization_id: organization.id,
          status: data.status || 'planning'
        })
        .select()
        .single();

      if (error) throw error;
      
      await fetchProjects();
      toast({
        title: "Project created",
        description: "Your new project has been created successfully."
      });
      return result as Project;
    } catch (error: any) {
      toast({
        title: "Error creating project",
        description: error.message,
        variant: "destructive"
      });
      return null;
    }
  };

  const updateProject = async (id: string, data: Partial<CreateProjectData & { activities_visible_to_homeowner: boolean }>): Promise<boolean> => {
    try {
      const { error } = await (supabase as any)
        .from('projects')
        .update(data)
        .eq('id', id);

      if (error) throw error;
      
      await fetchProjects();
      toast({
        title: "Project updated",
        description: "Project has been updated successfully."
      });
      return true;
    } catch (error: any) {
      toast({
        title: "Error updating project",
        description: error.message,
        variant: "destructive"
      });
      return false;
    }
  };

  const deleteProject = async (id: string): Promise<boolean> => {
    try {
      const { error } = await (supabase as any)
        .from('projects')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      await fetchProjects();
      toast({
        title: "Project deleted",
        description: "Project has been deleted successfully."
      });
      return true;
    } catch (error: any) {
      toast({
        title: "Error deleting project",
        description: error.message,
        variant: "destructive"
      });
      return false;
    }
  };

  const currentProjects = projects.filter(p => p.status !== 'completed' && p.status !== 'cancelled');
  const completedProjects = projects.filter(p => p.status === 'completed' || p.status === 'cancelled');

  return {
    projects,
    currentProjects,
    completedProjects,
    loading,
    fetchProjects,
    fetchProject,
    createProject,
    updateProject,
    deleteProject
  };
};
