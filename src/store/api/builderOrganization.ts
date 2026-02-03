import { api } from './apiSlice';
import type {
  BuilderOrganizationResponse,
  UpdateBuilderOrganizationRequest,
} from '@/lib/api/types';

export const builderOrganizationApi = api.injectEndpoints({
  endpoints: (build) => ({
    getBuilderOrganization: build.query<BuilderOrganizationResponse, string>({
      query: (builderId) => ({
        url: `/api/builderorganization`,
        method: 'GET',
        params: { builderId },
      }),
      providesTags: ['BuilderOrganization'],
    }),
    updateBuilderOrganization: build.mutation<
      BuilderOrganizationResponse,
      UpdateBuilderOrganizationRequest
    >({
      query: (data) => ({
        url: '/api/builder/organization',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['BuilderOrganization'],
    }),
  }),
});

export const {
  useGetBuilderOrganizationQuery,
  useUpdateBuilderOrganizationMutation,
} = builderOrganizationApi;
