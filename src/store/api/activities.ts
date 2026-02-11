import { api } from "./apiSlice";

export interface BuilderActivityApi {
  id: string;
  projectId: string;
  builderId: string;
  name: string;
  description: string | null;
  status: string;
  percentageComplete: number;
  dueDate: string | null;
  completedAt: string | null;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
}

export interface BuilderActivitiesResponse {
  success: boolean;
  message: string;
  data: BuilderActivityApi[];
}

export interface BuilderActivityResponse {
  success: boolean;
  message: string;
  data: BuilderActivityApi;
}

export interface CreateBuilderActivityBody {
  completedAt: string | null;
  description: string;
  dueDate: string | null;
  name: string;
  orderIndex: number;
  percentageComplete: number;
  statusId: string;
}

export const activitiesApi = api.injectEndpoints({
  endpoints: (build) => ({
    // GET /api/builder/projects/:projectId/activities
    getActivitiesByProject: build.query<
      BuilderActivitiesResponse,
      { projectId: string }
    >({
      query: ({ projectId }) => ({
        url: `/api/builder/projects/${projectId}/activities`,
        method: "GET",
      }),
      providesTags: (result, _error, { projectId }) => [
        { type: "Activities", id: projectId },
      ],
    }),

    // POST /api/builder/projects/:projectId/activities
    createActivity: build.mutation<
      BuilderActivityResponse,
      { projectId: string; body: CreateBuilderActivityBody }
    >({
      query: ({ projectId, body }) => ({
        url: `/api/builder/projects/${projectId}/activities`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: "Activities", id: projectId },
      ],
    }),
  }),
});

export const {
  useGetActivitiesByProjectQuery,
  useCreateActivityMutation,
} = activitiesApi;

