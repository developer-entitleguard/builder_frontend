import { api } from "./apiSlice";

export interface BuilderApprovalResponse {
  success: boolean;
  message: string;
  data: unknown;
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
  useCreateApprovalMutation,
  useUpdateApprovalMutation,
} = approvalsApi;

