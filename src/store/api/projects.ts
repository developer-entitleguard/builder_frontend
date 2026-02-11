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
  }),
});

export const { useProjectsQuery, useProjectByIdQuery, useCreateProjectMutation } = projectsApi;

