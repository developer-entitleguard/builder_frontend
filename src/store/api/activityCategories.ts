import { api } from "./apiSlice";

export interface BuilderActivityCategoryApi {
  id: string;
  projectId: string;
  name: string;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
}

export interface BuilderActivityCategoriesResponse {
  success: boolean;
  message: string;
  data: BuilderActivityCategoryApi[];
}

export interface BuilderActivityCategoryResponse {
  success: boolean;
  message: string;
  data: BuilderActivityCategoryApi;
}

export interface CreateBuilderActivityCategoryBody {
  name: string;
  orderIndex: number;
}

export const activityCategoriesApi = api.injectEndpoints({
  endpoints: (build) => ({
    // GET /api/builder/projects/:projectId/activity_categories
    getActivityCategoriesByProject: build.query<
      BuilderActivityCategoriesResponse,
      { projectId: string }
    >({
      query: ({ projectId }) => ({
        url: `/api/builder/projects/${projectId}/activity_categories`,
        method: "GET",
      }),
      providesTags: (_result, _error, { projectId }) => [
        { type: "ActivityCategories", id: projectId },
      ],
    }),

    // POST /api/builder/projects/:projectId/activity_categories
    createActivityCategory: build.mutation<
      BuilderActivityCategoryResponse,
      { projectId: string; body: CreateBuilderActivityCategoryBody }
    >({
      query: ({ projectId, body }) => ({
        url: `/api/builder/projects/${projectId}/activity_categories`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: "ActivityCategories", id: projectId },
      ],
    }),
  }),
});

export const {
  useGetActivityCategoriesByProjectQuery,
  useCreateActivityCategoryMutation,
} = activityCategoriesApi;

