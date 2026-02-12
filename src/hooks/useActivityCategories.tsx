import { useState, useCallback } from "react";

export interface ActivityCategory {
  id: string;
  name: string;
  project_id?: string;
  order_index?: number;
  created_at?: string;
  updated_at?: string;
}

export interface CreateCategoryData {
  name: string;
  project_id?: string;
  order_index?: number;
}

/**
 * Stub hook for activity categories. Returns empty list and no-op CRUD.
 * Replace with real API (e.g. GET/POST/PUT/DELETE /api/builder/projects/:projectId/categories) when backend is ready.
 */
export const useActivityCategories = (_projectId: string | undefined) => {
  const [categories] = useState<ActivityCategory[]>([]);

  const createCategory = useCallback(
    async (_data: CreateCategoryData): Promise<ActivityCategory | null> => {
      return null;
    },
    []
  );

  const updateCategory = useCallback(
    async (_id: string, _data: Partial<CreateCategoryData>): Promise<boolean> => {
      return false;
    },
    []
  );

  const deleteCategory = useCallback(async (_id: string): Promise<boolean> => {
    return false;
  }, []);

  return {
    categories,
    loading: false,
    createCategory,
    updateCategory,
    deleteCategory,
  };
};
