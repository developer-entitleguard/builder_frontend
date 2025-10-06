import { api } from '@/store/api/apiSlice';
import type { 
  BuilderOrganization,
  UpdateBuilderOrganizationRequest,
  BuilderOrganizationResponse
} from '@/lib/api/types';

export const builderOrganizationApi = api.injectEndpoints({
  endpoints: (build) => ({
    updateBuilderOrganization: build.mutation<BuilderOrganizationResponse, UpdateBuilderOrganizationRequest>({
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
  useUpdateBuilderOrganizationMutation,
} = builderOrganizationApi;
