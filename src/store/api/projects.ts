import { api } from "./apiSlice";

export interface BuilderProjectApi {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  postcode: string;
  propertyType: string;
  startDate: string | null;
  targetEndDate: string | null;
  actualEndDate: string | null;
  status: string;
  description: string | null;
  activitiesVisibleToHomeowner: boolean;
  createdAt: string;
}

export interface BuilderProjectsResponse {
  success: boolean;
  message: string;
  data: BuilderProjectApi[];
}

export interface BuilderProjectResponse {
  success: boolean;
  message: string;
  data: BuilderProjectApi;
}

export interface CreateBuilderProjectBody {
  activitiesVisibleToHomeowner: boolean;
  address: string;
  city: string;
  description: string;
  name: string;
  postcode: string;
  propertyType: string;
  startDate: string;
  state: string;
  statusId: string;
  targetEndDate: string;
}

export type UpdateBuilderProjectBody = CreateBuilderProjectBody;

export interface BuilderProjectRegistration {
  id?: string;
  customerName?: string;
  customer_email?: string;
  customerEmail?: string;
  property_address?: string;
  propertyAddress?: string;
  projectId?: string | null;
  [key: string]: unknown;
}

export interface BuilderProjectRegistrationsResponse {
  success: boolean;
  message: string;
  data: BuilderProjectRegistration[];
}

/** Single item from GET /api/builder/registrations/nonlinked */
export interface NonLinkedRegistrationApi {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  contact?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  country?: string | null;
  project?: unknown;
  status?: { id: string; name: string; module?: string };
  builderOrganization?: unknown;
  billOfMaterials?: unknown;
  [key: string]: unknown;
}

export interface NonLinkedRegistrationsResponse {
  success: boolean;
  message: string;
  data: NonLinkedRegistrationApi[];
}

export const projectsApi = api.injectEndpoints({
  endpoints: (build) => ({
    // GET /api/builder/projects
    projects: build.query<BuilderProjectsResponse, void>({
      query: () => ({
        url: "/api/builder/projects",
        method: "GET",
      }),
      providesTags: ["Projects"],
    }),
    // GET /api/builder/projects/:id
    projectById: build.query<BuilderProjectResponse, { id: string }>({
      query: ({ id }) => ({
        url: `/api/builder/projects/${id}`,
        method: "GET",
      }),
    }),
    // POST /api/builder/projects
    createProject: build.mutation<BuilderProjectResponse, CreateBuilderProjectBody>({
      query: (body) => ({
        url: "/api/builder/projects",
        method: "POST",
        body,
      }),
      invalidatesTags: (result) =>
        result?.success ? ["Projects"] : [],
    }),
    // PUT /api/builder/projects/:id
    updateProject: build.mutation<
      BuilderProjectResponse,
      { id: string; body: UpdateBuilderProjectBody }
    >({
      query: ({ id, body }) => ({
        url: `/api/builder/projects/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (result) =>
        result?.success ? ["Projects"] : [],
    }),
    // GET /api/builder/projects/:projectId/registrations
    getProjectRegistrations: build.query<
      BuilderProjectRegistrationsResponse,
      { projectId: string }
    >({
      query: ({ projectId }) => ({
        url: `/api/builder/projects/${projectId}/registrations`,
        method: "GET",
      }),
      providesTags: (_result, _error, { projectId }) => [
        { type: "Projects", id: projectId },
        { type: "Projects", id: `${projectId}-registrations` },
      ],
    }),
    // GET /api/builder/registrations/nonlinked
    getNonLinkedRegistrations: build.query<NonLinkedRegistrationsResponse, void>({
      query: () => ({
        url: "/api/builder/registrations/nonlinked",
        method: "GET",
      }),
      providesTags: ["Projects"],
    }),
    // PUT /api/builder/projects/:projectId/registrations/Update
    updateProjectRegistrations: build.mutation<
      { success: boolean; message: string; data?: unknown },
      { projectId: string; builderCustomerIds: string[] }
    >({
      query: ({ projectId, builderCustomerIds }) => ({
        url: `/api/builder/projects/${projectId}/registrations/Update`,
        method: "PUT",
        body: builderCustomerIds,
      }),
      invalidatesTags: ["Projects"],
    }),
  }),
});

export const {
  useProjectsQuery,
  useProjectByIdQuery,
  useGetProjectRegistrationsQuery,
  useGetNonLinkedRegistrationsQuery,
  useUpdateProjectRegistrationsMutation,
  useCreateProjectMutation,
  useUpdateProjectMutation,
} = projectsApi;

