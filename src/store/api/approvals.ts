import { api } from "./apiSlice";

export interface BuilderApprovalResponse {
  success: boolean;
  message: string;
  data: unknown;
}

/** Single item from GET /api/builder/projects/:projectId/approvals */
export interface BuilderApprovalApi {
  id?: string;
  activityId?: string;
  activity_id?: string;
  projectId?: string;
  approvalType?: string;
  approval_type?: string;
  title?: string;
  description?: string | null;
  statusId?: string;
  statusName?: string;
  status?: string;
  requestedAt?: string;
  requested_at?: string;
  dueBy?: string | null;
  due_by?: string | null;
  decidedAt?: string | null;
  decided_at?: string | null;
  approverName?: string | null;
  approver_name?: string | null;
  approverEmail?: string | null;
  [key: string]: unknown;
}

export interface BuilderApprovalsListResponse {
  success: boolean;
  message: string;
  data: BuilderApprovalApi[];
}

export interface CreateBuilderApprovalBody {
  approvalType: string;
  approverEmail: string;
  approverName: string;
  description: string;
  dueBy: string;
  registrationId: string;
  statusId: string;
  title: string;
}

export interface UpdateBuilderApprovalBody {
  decisionComment: string;
  statusId: string;
}

export const approvalsApi = api.injectEndpoints({
  endpoints: (build) => ({
    // GET /api/builder/projects/:projectId/approvals
    getProjectApprovals: build.query<
      BuilderApprovalsListResponse,
      { projectId: string; approvalTypes?: string; statusIds?: string }
    >({
      query: ({ projectId, approvalTypes, statusIds }) => {
        const params = new URLSearchParams();
        if (approvalTypes) params.set("approvalTypes", approvalTypes);
        if (statusIds) params.set("statusIds", statusIds);
        const query = params.toString();
        return {
          url: `/api/builder/projects/${projectId}/approvals${query ? `?${query}` : ""}`,
          method: "GET",
        };
      },
      providesTags: (_result, _error, { projectId }) => [{ type: "Approvals", id: projectId }],
    }),

    // POST /api/builder/projects/:projectId/activities/:activityId/approvals
    createApproval: build.mutation<
      BuilderApprovalResponse,
      { projectId: string; activityId: string; body: CreateBuilderApprovalBody }
    >({
      query: ({ projectId, activityId, body }) => ({
        url: `/api/builder/projects/${projectId}/activities/${activityId}/approvals`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: "Approvals", id: projectId },
      ],
    }),

    // PUT /api/builder/projects/:projectId/activities/:activityId/approvals/:id
    updateApproval: build.mutation<
      BuilderApprovalResponse,
      { projectId: string; activityId: string; id: string; body: UpdateBuilderApprovalBody }
    >({
      query: ({ projectId, activityId, id, body }) => ({
        url: `/api/builder/projects/${projectId}/activities/${activityId}/approvals/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_result, _error, { projectId, id }) => [
        { type: "Approvals", id: projectId },
        { type: "Approvals", id },
      ],
    }),
  }),
});

export const {
  useGetProjectApprovalsQuery,
  useCreateApprovalMutation,
  useUpdateApprovalMutation,
} = approvalsApi;

