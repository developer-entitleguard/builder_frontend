import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { useToast } from "@/hooks/use-toast";
import {
  useProjectsQuery,
  useCreateProjectMutation,
  useUpdateProjectMutation,
  type BuilderProjectApi,
} from "@/store/api/projects";

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
  /** NCC building classification code (e.g. CLASS_1A). */
  building_class: string | null;
  start_date: string | null;
  target_end_date: string | null;
  actual_end_date: string | null;
  status: ProjectStatus;
  statusId?: string | null;
  description: string | null;
  bal_rating: string | null;
  topography_type: string | null;
  activities_visible_to_homeowner: boolean;
  created_at: string;
  updated_at: string;
  /** Developer/Builder Decoupling: OPERATOR (owns) or SCOPED_BUILDER (delegated). */
  access_role?: "OPERATOR" | "SCOPED_BUILDER";
}

export interface CreateProjectData {
  name: string;
  address: string;
  city: string;
  state: string;
  postcode: string;
  property_type: PropertyType;
  /** NCC building classification code (e.g. CLASS_1A). Mandatory on create/update. */
  building_class?: string | null;
  start_date?: string | null;
  target_end_date?: string | null;
  /** Status id from API (e.g. getStatusesByModule PROJECT). Preferred when creating via builder API. */
  statusId?: string | null;
  status?: ProjectStatus;
  description?: string | null;
  bal_rating?: string | null;
  topography_type?: string | null;
  activities_visible_to_homeowner?: boolean;
  /** When true (default), auto-generate activities, compliance docs & unit registrations on create. */
  auto_generate?: boolean;
  /** Number of units for multi-dwelling types (townhouse/apartment); duplex is always 2. */
  dwelling_count?: number | null;
}

const mapPropertyType = (value: string | null | undefined): PropertyType => {
  if (!value) return "custom";
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

const mapStatus = (value: string | null | undefined): ProjectStatus => {
  if (!value) return "planning";
  const key = value.toLowerCase().replace(/\s+/g, "_");
  switch (key) {
    case "planning":
      return "planning";
    case "inprogress":
    case "in_progress":
      return "in_progress";
    case "onhold":
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

  const [createProjectMutation] = useCreateProjectMutation();
  const [updateProjectMutation] = useUpdateProjectMutation();

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
      building_class: p.buildingClass ?? null,
      start_date: p.startDate,
      target_end_date: p.targetEndDate,
      actual_end_date: p.actualEndDate,
      status: mapStatus(p.status),
      description: p.description,
      bal_rating: p.balRatingId ?? null,
      topography_type: p.topographyTypeId ?? null,
      activities_visible_to_homeowner: p.activitiesVisibleToHomeowner,
      created_at: p.createdAt,
      updated_at: p.createdAt,
      access_role: p.accessRole,
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
        building_class: apiProject.buildingClass ?? null,
        start_date: apiProject.startDate,
        target_end_date: apiProject.targetEndDate,
        actual_end_date: apiProject.actualEndDate,
        status: mapStatus(apiProject.status),
        description: apiProject.description,
        bal_rating: apiProject.balRatingId ?? null,
        topography_type: apiProject.topographyTypeId ?? null,
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

  const createProject = async (data: CreateProjectData): Promise<string | null> => {
    try {
      const body = {
        activitiesVisibleToHomeowner: data.activities_visible_to_homeowner ?? true,
        address: data.address,
        balRatingId: data.bal_rating ?? null,
        city: data.city,
        description: data.description ?? "",
        name: data.name,
        postcode: data.postcode,
        propertyType: data.property_type,
        buildingClass: data.building_class ?? null,
        startDate: data.start_date ?? "",
        state: data.state,
        statusId: data.statusId ?? data.status ?? "",
        targetEndDate: data.target_end_date ?? "",
        topographyTypeId: data.topography_type ?? null,
        autoGenerate: data.auto_generate ?? true,
        dwellingCount: data.dwelling_count ?? null,
      };
      const result = await createProjectMutation(body).unwrap();
      if (!result?.success) {
        toast({
          title: "Error creating project",
          description: result?.message || "Failed to create project",
          variant: "destructive",
        });
        return null;
      }
      toast({
        title: "Success",
        description: result.message || "Project created successfully",
      });
      // data carries the new project's id (used to trigger generation).
      return result.data ?? null;
    } catch (err: unknown) {
      toast({
        title: "Error creating project",
        description:
          err && typeof err === "object" && "data" in err
            ? String((err as { data: unknown }).data)
            : err instanceof Error
              ? err.message
              : "Failed to create project",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateProject = async (id: string, data: CreateProjectData): Promise<boolean> => {
    try {
      const body = {
        activitiesVisibleToHomeowner: data.activities_visible_to_homeowner ?? true,
        address: data.address,
        balRatingId: data.bal_rating ?? null,
        city: data.city,
        description: data.description ?? "",
        name: data.name,
        postcode: data.postcode,
        propertyType: data.property_type,
        buildingClass: data.building_class ?? null,
        startDate: data.start_date ?? "",
        state: data.state,
        statusId: data.statusId ?? data.status ?? "planning",
        targetEndDate: data.target_end_date ?? "",
        topographyTypeId: data.topography_type ?? null,
      };

      const result = await updateProjectMutation({ id, body }).unwrap();

      if (!result?.success) {
        toast({
          title: "Error updating project",
          description: result?.message || "Failed to update project",
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Project updated",
        description: result.message || "Project updated successfully",
      });

      await refetchProjects();
      return true;
    } catch (error: unknown) {
      toast({
        title: "Error updating project",
        description:
          error && typeof error === "object" && "data" in error
            ? String((error as { data: unknown }).data)
            : error instanceof Error
              ? error.message
              : "Failed to update project",
        variant: "destructive",
      });
      return false;
    }
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
