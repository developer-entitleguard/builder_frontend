import { useState, useCallback, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  useGetActivityCategoriesByProjectQuery,
  useCreateActivityCategoryMutation,
  useUpdateActivityCategoryMutation,
  type BuilderActivityCategoryApi,
} from "@/store/api/activityCategories";

export interface ActivityCategory {
  id: string;
  name: string;
  project_id?: string;
  order_index?: number;
  created_at?: string;
  updated_at?: string;
  percentage_complete?: number;
  total_activities?: number;
  completed_activities?: number;
}

export interface CreateCategoryData {
  name: string;
  project_id?: string;
  order_index?: number;
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

export const useActivityCategories = (projectId: string | undefined) => {
  const { toast } = useToast();
  const [categories, setCategories] = useState<ActivityCategory[]>([]);

  const isBuilder = hasBuilderAuth();

  const {
    data: apiCategories,
    isLoading: apiLoading,
    refetch: refetchApiCategories,
  } = useGetActivityCategoriesByProjectQuery(
    { projectId: projectId! },
    { skip: !projectId || !isBuilder }
  );

  const [createCategoryMutation] = useCreateActivityCategoryMutation();
  const [updateCategoryMutation] = useUpdateActivityCategoryMutation();

  useEffect(() => {
    if (!isBuilder || !apiCategories?.data) return;

    const mapped: ActivityCategory[] = apiCategories.data.map(
      (c: BuilderActivityCategoryApi) => ({
        id: c.id,
        name: c.name,
        project_id: c.projectId,
        order_index: c.orderIndex,
        created_at: c.createdAt,
        updated_at: c.updatedAt,
        percentage_complete: c.percentageComplete,
        total_activities: c.totalActivities,
        completed_activities: c.completedActivities,
      })
    );

    setCategories(mapped);
  }, [isBuilder, apiCategories]);

  const createCategory = useCallback(
    async (data: CreateCategoryData): Promise<ActivityCategory | null> => {
      if (!projectId) {
        throw new Error("No project");
      }

      if (isBuilder) {
        try {
          const maxOrder =
            categories.length > 0
              ? Math.max(
                  ...categories.map((c) => c.order_index ?? 0)
                ) + 1
              : 0;

          const body = {
            name: data.name,
            orderIndex: maxOrder,
          };

          const result = await createCategoryMutation({
            projectId,
            body,
          }).unwrap();

          if (!result?.data) {
            toast({
              title: "Error creating category",
              description:
                result?.message || "Failed to create activity category",
              variant: "destructive",
            });
            return null;
          }

          const createdApi = result.data;

          const created: ActivityCategory = {
            id: createdApi.id,
            name: createdApi.name,
            project_id: createdApi.projectId,
            order_index: createdApi.orderIndex,
            created_at: createdApi.createdAt,
            updated_at: createdApi.updatedAt,
          };

          toast({
            title: "Category added",
            description:
              result.message ||
              "New activity category has been added to the project.",
          });

          // RTK Query invalidates and refetches; local state will be updated via useEffect
          return created;
        } catch (error: unknown) {
          toast({
            title: "Error creating category",
            description:
              error instanceof Error
                ? error.message
                : "Failed to create activity category",
            variant: "destructive",
          });
          return null;
        }
      }

      // Non-builder path not yet implemented
      return null;
    },
    [projectId, isBuilder, categories, createCategoryMutation, toast]
  );

  const updateCategory = useCallback(
    async (id: string, data: Partial<CreateCategoryData>): Promise<boolean> => {
      if (!projectId) {
        throw new Error("No project");
      }

      if (!isBuilder) {
        // Non-builder path not yet implemented
        return false;
      }

      try {
        const existing = categories.find((c) => c.id === id);
        if (!existing) {
          toast({
            title: "Category not found",
            description: "Unable to update activity category.",
            variant: "destructive",
          });
          return false;
        }

        const body = {
          name: data.name ?? existing.name,
          orderIndex: existing.order_index ?? 0,
        };

        const result = await updateCategoryMutation({
          projectId,
          id,
          body,
        }).unwrap();

        if (!result?.data) {
          toast({
            title: "Error updating category",
            description:
              result?.message || "Failed to update activity category",
            variant: "destructive",
          });
          return false;
        }

        toast({
          title: "Category updated",
          description:
            result.message ||
            "Activity category has been updated.",
        });

        // RTK Query invalidates and refetches; local state will be updated via useEffect
        return true;
      } catch (error: unknown) {
        toast({
          title: "Error updating category",
          description:
            error instanceof Error
              ? error.message
              : "Failed to update activity category",
          variant: "destructive",
        });
        return false;
      }
    },
    [projectId, isBuilder, categories, updateCategoryMutation, toast]
  );

  const deleteCategory = useCallback(async (_id: string): Promise<boolean> => {
    return false;
  }, []);

  return {
    categories,
    loading: isBuilder ? apiLoading : false,
    createCategory,
    updateCategory,
    deleteCategory,
    refetch: refetchApiCategories,
  };
};
