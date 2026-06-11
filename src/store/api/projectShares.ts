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
  wholeOrgAccess?: boolean;
  sharedWithUserEmail?: string | null;
  grantedAt: string | null;
  revokedAt: string | null;
}

export interface OrgOption {
  id: string;
  name: string;
  email: string | null;
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
  /** Existing org chosen from the autocomplete. */
  builderOrgId?: string;
  /** New org name when inviting one not yet on the platform. */
  orgName?: string;
  /** Invited user's email (also the set-password recipient for a new org). */
  builderEmail?: string;
  /** True = everyone in the org can access; false/omitted = only the invited email. */
  wholeOrgAccess?: boolean;
}

interface OrgSearchResponse {
  success: boolean;
  message: string;
  data: OrgOption[];
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

    // Name autocomplete for "share with a developer organisation" (point 3).
    searchOrganizations: build.query<OrgSearchResponse, string>({
      query: (q) => ({
        url: `/api/builder/organizations/search`,
        method: "GET",
        params: { q },
      }),
    }),
  }),
});

export const {
  useGetProjectSharesQuery,
  useShareProjectMutation,
  useRevokeProjectShareMutation,
  useLazySearchOrganizationsQuery,
} = projectSharesApi;
