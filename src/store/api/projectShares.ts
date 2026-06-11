import { api } from "./apiSlice";

/**
 * Developer/Builder Decoupling PRD (Requirement 2). Developer-only management of
 * the scoped builder delegation on a project. Backed by
 * /api/builder/projects/{projectId}/shares.
 */
export interface ProjectShare {
  id: string;
  projectId: string;
  builderOrgId: string | null;
  builderOrgName: string | null;
  builderOrgEmail: string | null;
  scope: string;
  status: "ACTIVE" | "REVOKED";
  grantedAt: string | null;
  revokedAt: string | null;
}

interface ProjectSharesResponse {
  success: boolean;
  message: string;
  data: ProjectShare[];
}

interface ProjectShareResponse {
  success: boolean;
  message: string;
  data: ProjectShare;
}

export interface ShareProjectBody {
  builderOrgId?: string;
  builderEmail?: string;
}

export const projectSharesApi = api.injectEndpoints({
  endpoints: (build) => ({
    getProjectShares: build.query<ProjectSharesResponse, string>({
      query: (projectId) => ({
        url: `/api/builder/projects/${projectId}/shares`,
        method: "GET",
      }),
      providesTags: (_r, _e, projectId) => [{ type: "ProjectShares", id: projectId }],
    }),

    shareProject: build.mutation<ProjectShareResponse, { projectId: string; body: ShareProjectBody }>({
      query: ({ projectId, body }) => ({
        url: `/api/builder/projects/${projectId}/shares`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_r, _e, { projectId }) => [{ type: "ProjectShares", id: projectId }],
    }),

    revokeProjectShare: build.mutation<ProjectShareResponse, { projectId: string; shareId: string }>({
      query: ({ projectId, shareId }) => ({
        url: `/api/builder/projects/${projectId}/shares/${shareId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_r, _e, { projectId }) => [{ type: "ProjectShares", id: projectId }],
    }),
  }),
});

export const {
  useGetProjectSharesQuery,
  useShareProjectMutation,
  useRevokeProjectShareMutation,
} = projectSharesApi;
