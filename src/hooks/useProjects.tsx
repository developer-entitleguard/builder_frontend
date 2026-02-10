import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { useToast } from "@/hooks/use-toast";
import { useProjectsQuery, type BuilderProjectApi } from "@/store/api/projects";

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

const mapPropertyType = (value: string): PropertyType => {
  const key = value.toLowerCase();
  switch (key) {
    case "house":
      return "house";
    case "townhouse":
      return "townhouse";
    case "apartment":
      return "apartment";
    case "duplex":
      return "duplex";
    case "renovation":
      return "renovation";
    case "extension":
      return "extension";
    case "custom":
      return "custom";
    default:
      return "custom";
  }
};

const mapStatus = (value: string): ProjectStatus => {
  const key = value.toLowerCase();
  switch (key) {
    case "planning":
      return "planning";
    case "inprogress":
      return "in_progress";
    case "in_progress":
      return "in_progress";
    case "onhold":
      return "on_hold";
    case "on_hold":
      return "on_hold";
    case "completed":
      return "completed";
    case "cancelled":
      return "cancelled";
    default:
      return "planning";
  }
};

export const useProjects = () => {
  const { user } = useAuth();
  const { organization } = useOrganization();
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);

  const {
    data: apiProjects,
    isLoading,
    isFetching,
    error,
    refetch: refetchProjects,
  } = useProjectsQuery();

  const loading = isLoading || isFetching;

  useEffect(() => {
    if (!apiProjects?.data) {
      setProjects([]);
      return;
    }
    const mapped: Project[] = apiProjects.data.map((p: BuilderProjectApi) => ({
      id: p.id,
      builder_id: "", // not provided by API; not needed for UI
      name: p.name,
      address: p.address,
      city: p.city,
      state: p.state,
      postcode: p.postcode,
      property_type: mapPropertyType(p.propertyType),
      start_date: p.startDate,
      target_end_date: p.targetEndDate,
      actual_end_date: p.actualEndDate,
      status: mapStatus(p.status),
      description: p.description,
      activities_visible_to_homeowner: p.activitiesVisibleToHomeowner,
      created_at: p.createdAt,
      updated_at: p.createdAt,
    }));
    setProjects(mapped);
  }, [apiProjects]);

  useEffect(() => {
    if (!error) return;
    toast({
      title: "Error fetching projects",
      description: (error as { data?: unknown })?.data
        ? String((error as { data?: unknown }).data)
        : "Failed to fetch projects",
      variant: "destructive",
    });
  }, [error, toast]);

  const fetchProject = async (id: string): Promise<Project | null> => {
    try {
      const apiProject = apiProjects?.data.find((p) => p.id === id) as BuilderProjectApi | undefined;
      if (!apiProject) return null;
      return {
        id: apiProject.id,
        builder_id: "",
        name: apiProject.name,
        address: apiProject.address,
        city: apiProject.city,
        state: apiProject.state,
        postcode: apiProject.postcode,
        property_type: mapPropertyType(apiProject.propertyType),
        start_date: apiProject.startDate,
        target_end_date: apiProject.targetEndDate,
        actual_end_date: apiProject.actualEndDate,
        status: mapStatus(apiProject.status),
        description: apiProject.description,
        activities_visible_to_homeowner: apiProject.activitiesVisibleToHomeowner,
        created_at: apiProject.createdAt,
        updated_at: apiProject.createdAt,
      };
    } catch (error: unknown) {
      toast({
        title: "Error fetching project",
        description: error instanceof Error ? error.message : "Failed to fetch project",
        variant: "destructive",
      });
      return null;
    }
  };

  const createProject = async (_data: CreateProjectData): Promise<Project | null> => {
    throw new Error("Project creation via API is not yet implemented for builder flow.");
  };

  const updateProject = async (): Promise<boolean> => {
    throw new Error("Project update via API is not yet implemented for builder flow.");
  };

  const deleteProject = async (): Promise<boolean> => {
    throw new Error("Project delete via API is not yet implemented for builder flow.");
  };

  const currentProjects = projects.filter((p) => p.status !== "completed" && p.status !== "cancelled");
  const completedProjects = projects.filter((p) => p.status === "completed" || p.status === "cancelled");

  return {
    projects,
    currentProjects,
    completedProjects,
    loading,
    fetchProjects: refetchProjects,
    fetchProject,
    createProject,
    updateProject,
    deleteProject,
  };
};
