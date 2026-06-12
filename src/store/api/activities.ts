import { api } from "./apiSlice";

export interface BuilderActivityApi {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  statusName: string;
  percentageComplete: number;
  dueDate: string | null;
  completedAt: string | null;
  orderIndex: number;
  categoryId?: string | null;
  categoryName?: string | null;
  completed?: boolean;
  isActive?: boolean;
  quote?: number | null;
  pricePaid?: number | null;
  vendorName?: string | null;
  vendorEmail?: string | null;
  vendorPhone?: string | null;
  priority?: string | null;
  /** Phase B: the linked job (assignment) and its assignee, when assigned out. */
  jobId?: string | null;
  jobStatus?: string | null;
  assigneeDisplayName?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Phase B activity-assignment request (tri-modal; UI collects a contact). */
export interface ActivityAssignBody {
  assigneeName?: string | null;
  assigneeEmail?: string | null;
  assigneeOrgType?: string | null;
  assigneeOrgId?: string | null;
  assigneeUserId?: string | null;
  /** Link an EXISTING builder job instead of spawning one. */
  jobId?: string | null;
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

export interface DeleteBuilderActivityResponse {
  success: boolean;
  message: string;
  data: unknown;
}

export interface DeleteBuilderActivitiesResponse {
  success: boolean;
  message: string;
  data: BuilderActivityApi[];
}

export interface BuilderActivityUpdate {
  id?: string;
  activityId?: string;
  content?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface GenerateActivitiesResponse {
  success: boolean;
  message: string;
  // Array on success; a small marker object (e.g. { reason }) on a soft failure
  // such as insufficient input; null on a system error.
  data: BuilderActivityApi[] | { reason?: string } | null;
}

export interface CreateBuilderActivityBody {
  // New builder API fields (requestDto) from swagger
  categoryId?: string | null;
  completed?: boolean;
  completedAt: string | null;
  description: string;
  dueDate: string | null;
  name: string;
  orderIndex: number;
  pricePaid?: number | null;
  quote?: number | null;
  vendorEmail?: string | null;
  vendorName?: string | null;
  vendorPhone?: string | null;
  // Legacy fields still accepted by backend (kept for compatibility)
  percentageComplete: number;
  statusId: string;
}

export interface UpdateBuilderActivityBody {
  categoryId?: string | null;
  completed?: boolean;
  completedAt: string | null;
  description: string;
  dueDate: string | null;
  name: string;
  orderIndex: number;
  pricePaid?: number | null;
  quote?: number | null;
  vendorEmail?: string | null;
  vendorName?: string | null;
  vendorPhone?: string | null;
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

    // GET /api/builder/projects/:projectId/activities/:id
    getActivityById: build.query<
      BuilderActivityResponse,
      { projectId: string; id: string }
    >({
      query: ({ projectId, id }) => ({
        url: `/api/builder/projects/${projectId}/activities/${id}`,
        method: "GET",
      }),
      providesTags: (_result, _error, { projectId, id }) => [
        { type: "Activities", id: projectId },
        { type: "Activities", id },
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

    // POST /api/builder/projects/:projectId/activities/generate (AI generation)
    generateActivities: build.mutation<
      GenerateActivitiesResponse,
      { projectId: string; prompt: string }
    >({
      query: ({ projectId, prompt }) => ({
        url: `/api/builder/projects/${projectId}/activities/generate`,
        method: "POST",
        body: { prompt },
      }),
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: "Activities", id: projectId },
        { type: "ActivityCategories", id: projectId },
      ],
    }),

    // POST /api/builder/projects/:projectId/activities/schedule (AI auto-schedule)
    scheduleActivities: build.mutation<
      {
        success: boolean;
        message: string;
        data: {
          feasibility?: string;
          message?: string;
          recommendedEndDate?: string | null;
          activitiesUpdated?: number;
        } | null;
      },
      { projectId: string }
    >({
      query: ({ projectId }) => ({
        url: `/api/builder/projects/${projectId}/activities/schedule`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: "Activities", id: projectId },
        { type: "Projects", id: projectId },
        "Projects",
      ],
    }),

    // PUT /api/builder/projects/:projectId/activities/:id
    updateActivity: build.mutation<
      BuilderActivityResponse,
      { projectId: string; id: string; body: UpdateBuilderActivityBody }
    >({
      query: ({ projectId, id, body }) => ({
        url: `/api/builder/projects/${projectId}/activities/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_result, _error, { projectId, id }) => [
        { type: "Activities", id: projectId },
        { type: "Activities", id },
      ],
    }),

    // POST /api/builder/projects/:projectId/activities/:activityId/assign
    assignActivity: build.mutation<
      BuilderActivityResponse,
      { projectId: string; activityId: string; body: ActivityAssignBody }
    >({
      query: ({ projectId, activityId, body }) => ({
        url: `/api/builder/projects/${projectId}/activities/${activityId}/assign`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, { projectId, activityId }) => [
        { type: "Activities", id: projectId },
        { type: "Activities", id: activityId },
      ],
    }),

    // DELETE /api/builder/projects/:projectId/activities/:id
    deleteActivity: build.mutation<
      DeleteBuilderActivityResponse,
      { projectId: string; id: string }
    >({
      query: ({ projectId, id }) => ({
        url: `/api/builder/projects/${projectId}/activities/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: "Activities", id: projectId },
      ],
    }),

    // DELETE /api/builder/projects/:projectId/activities (bulk delete)
    deleteActivities: build.mutation<
      DeleteBuilderActivitiesResponse,
      { projectId: string; ids: string[] }
    >({
      query: ({ projectId, ids }) => ({
        url: `/api/builder/projects/${projectId}/activities`,
        method: "DELETE",
        body: ids,
      }),
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: "Activities", id: projectId },
      ],
    }),

    // GET /api/builder/activity/:activityId/activity_updates
    getActivityUpdates: build.query<
      { success: boolean; message: string; data: BuilderActivityUpdate[] },
      { activityId: string }
    >({
      query: ({ activityId }) => ({
        url: `/api/builder/activity/${activityId}/activity_updates`,
        method: "GET",
      }),
      providesTags: (_result, _error, { activityId }) => [
        { type: "Activities", id: `updates-${activityId}` },
      ],
    }),

    // POST /api/builder/activity/:activityId/activity_updates
    postActivityUpdate: build.mutation<
      { success: boolean; message: string; data?: BuilderActivityUpdate },
      { activityId: string; body: { content: string } }
    >({
      query: ({ activityId, body }) => ({
        url: `/api/builder/activity/${activityId}/activity_updates`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, { activityId }) => [
        { type: "Activities", id: `updates-${activityId}` },
      ],
    }),
  }),
});

export const {
  useGetActivitiesByProjectQuery,
  useGetActivityByIdQuery,
  useGetActivityUpdatesQuery,
  usePostActivityUpdateMutation,
  useCreateActivityMutation,
  useGenerateActivitiesMutation,
  useScheduleActivitiesMutation,
  useUpdateActivityMutation,
  useAssignActivityMutation,
  useDeleteActivityMutation,
  useDeleteActivitiesMutation,
} = activitiesApi;

