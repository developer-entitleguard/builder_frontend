import { api } from '@/store/api/apiSlice';

/**
 * Ticket/Query/Job domain refactor (Builder context). A builder ticket converts
 * to a query, and that query spawns one or more jobs (one query → many jobs).
 * Jobs are assigned to a vendor — internal (EG portal user), an external EG org
 * (e.g. a Trade org), or an off-platform contact reached via an emailed link.
 *
 * Backend: {@code BuilderJobController} under {@code /api/builder/job}. The
 * builder org id is passed explicitly as {@code builderId} (builder JWTs omit
 * the org_id claim).
 */

export type JobStatus =
  | 'DRAFT'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export interface JobCategory {
  id: string;
  name: string;
  displayOrder?: number;
  enabled?: boolean;
}

export interface BuilderJob {
  id: string;
  orgType: string;
  orgId: string;
  title: string;
  scope?: string | null;
  status: JobStatus;
  category?: JobCategory | null;
  assigneeUserId?: string | null;
  assigneeOrgType?: string | null;
  assigneeOrgId?: string | null;
  assigneeName?: string | null;
  assigneeEmail?: string | null;
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
  completedAt?: string | null;
  createdByUserId?: string | null;
  isActive?: boolean;
}

export interface CreateJobRequest {
  queryId: string;
  builderId: string;
  title: string;
  scope?: string;
  categoryId?: string;
  status?: JobStatus;
}

export interface AssignJobRequest {
  id: string;
  builderId: string;
  /** Internal vendor — a UserInfo id within the builder org. */
  assigneeUserId?: string;
  /** External EG org (e.g. a Trade org). */
  assigneeOrgType?: string;
  assigneeOrgId?: string;
  /** Off-platform contact (reached via an emailed link). */
  assigneeName?: string;
  assigneeEmail?: string;
}

export const jobsApi = api.injectEndpoints({
  endpoints: (build) => ({
    // EG-curated category taxonomy for the create picker.
    getJobCategories: build.query<JobCategory[], void>({
      query: () => ({ url: '/api/builder/job/categories', method: 'GET' }),
    }),

    // Jobs spawned from a converted ticket query.
    getJobsForQuery: build.query<
      BuilderJob[],
      { queryId: string; builderId?: string }
    >({
      query: ({ queryId, builderId }) => ({
        url: '/api/builder/job',
        method: 'GET',
        params: {
          queryId,
          ...(builderId ? { builderId } : {}),
        },
      }),
      providesTags: (result, error, { queryId }) => [{ type: 'Job', id: queryId }],
    }),

    // Spawn a job from the query.
    createJobFromQuery: build.mutation<BuilderJob, CreateJobRequest>({
      query: ({ queryId, builderId, ...body }) => ({
        url: `/api/builder/job/from-query/${queryId}`,
        method: 'POST',
        params: builderId ? { builderId } : {},
        body,
      }),
      invalidatesTags: (result, error, { queryId }) => [{ type: 'Job', id: queryId }],
    }),

    // Change job status (DRAFT → ASSIGNED → IN_PROGRESS → COMPLETED / CANCELLED).
    updateJobStatus: build.mutation<
      BuilderJob,
      { id: string; builderId: string; status: JobStatus; queryId: string }
    >({
      query: ({ id, builderId, status }) => ({
        url: `/api/builder/job/${id}/status`,
        method: 'PUT',
        params: { builderId },
        body: { status },
      }),
      invalidatesTags: (result, error, { queryId }) => [{ type: 'Job', id: queryId }],
    }),

    // Tri-modal vendor assignment.
    assignJob: build.mutation<BuilderJob, AssignJobRequest & { queryId: string }>({
      query: ({ id, builderId, queryId, ...body }) => ({
        url: `/api/builder/job/${id}/assign`,
        method: 'PUT',
        params: { builderId },
        body,
      }),
      invalidatesTags: (result, error, { queryId }) => [{ type: 'Job', id: queryId }],
    }),

    deleteJob: build.mutation<
      void,
      { id: string; builderId: string; queryId: string }
    >({
      query: ({ id, builderId }) => ({
        url: `/api/builder/job/${id}`,
        method: 'DELETE',
        params: { builderId },
      }),
      invalidatesTags: (result, error, { queryId }) => [{ type: 'Job', id: queryId }],
    }),
  }),
});

export const {
  useGetJobCategoriesQuery,
  useGetJobsForQueryQuery,
  useCreateJobFromQueryMutation,
  useUpdateJobStatusMutation,
  useAssignJobMutation,
  useDeleteJobMutation,
} = jobsApi;
