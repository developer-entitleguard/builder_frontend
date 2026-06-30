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
  unitNumber?: string | null;
  status: JobStatus;
  category?: JobCategory | null;
  assigneeUserId?: string | null;
  assigneeOrgType?: string | null;
  assigneeOrgId?: string | null;
  assigneeName?: string | null;
  assigneeEmail?: string | null;
  /** Derived display fields, populated by the backend on read. */
  assigneeDisplayName?: string | null;
  assigneeInitials?: string | null;
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
  completedAt?: string | null;
  createdByUserId?: string | null;
  isActive?: boolean;
}

export interface CreateJobRequest {
  queryId: string;
  builderId: string;
  /** Optional — defaults to the source query's title on the backend. */
  title?: string;
  scope?: string;
  categoryId?: string;
  status?: JobStatus;
  /**
   * Optional dwelling (BuilderCustomer registration) this job is performed
   * against. Links any resulting trade compliance certificate into that
   * registration's handover pack (PRD Phase 4 linkage).
   */
  registrationId?: string;
}

/**
 * Builder vendor assignment for a job. Pass a single {@code vendorId}; the
 * backend routes by vendor kind. Internal vendors also require a schedule
 * window ({@code date}/{@code startTime}/{@code endTime}); external vendors
 * ignore it.
 */
/** One reserved time block for an internal vendor. */
export interface VendorBlockInput {
  date: string;       // yyyy-MM-dd
  startTime: string;  // HH:mm or HH:mm:ss
  endTime: string;
  notes?: string;
}

export interface AssignJobVendorRequest {
  id: string;
  builderId: string;
  queryId: string;
  vendorId: string;
  /**
   * Multi-block path (internal vendors): one or more time blocks to reserve.
   * Overlaps are allowed (double-booking) and blocks must be in the future.
   */
  blocks?: VendorBlockInput[];
  /** Legacy single-block fields — still accepted for back-compat. */
  date?: string;
  startTime?: string;
  endTime?: string;
  notes?: string;
}

/** A reserved time block as returned by GET /api/builder/job/{id}/blocks. */
export interface VendorBlock {
  id: string;
  date: string;            // yyyy-MM-dd
  startTime: string | null; // HH:mm:ss
  endTime: string | null;
  status: string;
  notes: string | null;
  queryId: string | null;
  queryTitle: string | null;
  queryUnitNumber: string | null;
  queryAddress: string | null;
}

export interface ApiResult {
  success: boolean;
  message: string;
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

    // Tri-modal vendor assignment (low-level: raw assignee fields).
    assignJob: build.mutation<BuilderJob, AssignJobRequest & { queryId: string }>({
      query: ({ id, builderId, queryId, ...body }) => ({
        url: `/api/builder/job/${id}/assign`,
        method: 'PUT',
        params: { builderId },
        body,
      }),
      invalidatesTags: (result, error, { queryId }) => [{ type: 'Job', id: queryId }],
    }),

    // Builder vendor assignment: pass a vendorId (+ optional schedule for
    // internal vendors). Books the vendor's calendar and mirrors onto the
    // source query so internal vendors see it / external links can be shared.
    assignJobVendor: build.mutation<ApiResult, AssignJobVendorRequest>({
      query: ({ id, builderId, queryId, ...body }) => ({
        url: `/api/builder/job/${id}/assign-vendor`,
        method: 'PUT',
        params: { builderId },
        body,
      }),
      invalidatesTags: (result, error, { id, queryId, vendorId }) => [
        { type: 'Job', id: queryId },
        { type: 'Job', id: `blocks-${id}` },
        'Query',
        'VendorAvailability',
        'VendorSchedule',
        { type: 'VendorSchedule', id: vendorId },
      ],
    }),

    // List the reserved time blocks for a job's source query (internal vendor).
    getJobBlocks: build.query<
      { success: boolean; message: string; data: VendorBlock[] },
      { id: string; builderId: string }
    >({
      query: ({ id, builderId }) => ({
        url: `/api/builder/job/${id}/blocks`,
        method: 'GET',
        params: { builderId },
      }),
      providesTags: (result, error, { id }) => [{ type: 'Job', id: `blocks-${id}` }],
    }),

    // Remove a single reserved time block from the internal vendor's calendar.
    removeJobBlock: build.mutation<
      ApiResult,
      { id: string; builderId: string; slotId: string; queryId: string; vendorId: string }
    >({
      query: ({ id, builderId, slotId }) => ({
        url: `/api/builder/job/${id}/block/${slotId}`,
        method: 'DELETE',
        params: { builderId },
      }),
      invalidatesTags: (result, error, { id, queryId, vendorId }) => [
        { type: 'Job', id: `blocks-${id}` },
        { type: 'Job', id: queryId },
        'Query',
        { type: 'VendorSchedule', id: vendorId },
        'VendorAvailability',
      ],
    }),

    // Text the assigned vendor the job/query link to a typed-in number (for
    // vendors who don't check email). Works for internal and external vendors.
    sendJobSms: build.mutation<
      ApiResult,
      { id: string; builderId: string; queryId: string; phone: string }
    >({
      query: ({ id, builderId, phone }) => ({
        url: `/api/builder/job/${id}/send-sms`,
        method: 'PUT',
        params: { builderId },
        body: { phone },
      }),
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

    // Link (or clear) the dwelling/registration a job is performed against.
    // Pass registrationId: null/'' to unlink. Invalidates the handover pack so
    // the registration's trade-certificate panel refreshes.
    linkJobRegistration: build.mutation<
      BuilderJob,
      { id: string; builderId: string; queryId: string; registrationId: string | null }
    >({
      query: ({ id, builderId, registrationId }) => ({
        url: `/api/builder/job/${id}/registration`,
        method: 'PUT',
        params: { builderId },
        body: { registrationId },
      }),
      invalidatesTags: (result, error, { queryId, registrationId }) => [
        { type: 'Job', id: queryId },
        ...(registrationId
          ? [{ type: 'HandoverReadiness' as const, id: `trade-certs-${registrationId}` }]
          : []),
      ],
    }),

    // -----------------------------------------------------------------------
    // Vendor-facing (assignee-scoped). The logged-in internal vendor reads and
    // acts on the jobs assigned to *them* for a query. Status changes touch only
    // the job — never the parent query.
    // -----------------------------------------------------------------------

    // The calling internal vendor's own jobs on a query (title + scope).
    getMyJobsForQuery: build.query<
      { success: boolean; message: string; data: BuilderJob[] },
      { queryId: string }
    >({
      query: ({ queryId }) => ({
        url: '/api/vendor/me/jobs',
        method: 'GET',
        params: { queryId },
      }),
      providesTags: (result, error, { queryId }) => [{ type: 'Job', id: `vendor-${queryId}` }],
    }),

    // The calling internal vendor updates one of their jobs' status.
    updateMyJobStatus: build.mutation<
      ApiResult,
      { id: string; status: JobStatus; queryId: string }
    >({
      query: ({ id, status }) => ({
        url: `/api/vendor/me/jobs/${id}/status`,
        method: 'PUT',
        body: { status },
      }),
      invalidatesTags: (result, error, { queryId }) => [{ type: 'Job', id: `vendor-${queryId}` }],
    }),
  }),
});

export const {
  useGetJobCategoriesQuery,
  useGetJobsForQueryQuery,
  useCreateJobFromQueryMutation,
  useUpdateJobStatusMutation,
  useAssignJobMutation,
  useAssignJobVendorMutation,
  useGetJobBlocksQuery,
  useRemoveJobBlockMutation,
  useSendJobSmsMutation,
  useDeleteJobMutation,
  useLinkJobRegistrationMutation,
  useGetMyJobsForQueryQuery,
  useUpdateMyJobStatusMutation,
} = jobsApi;
