import { api } from './apiSlice';
import type {
  BuilderUserResponse,
  CreateBuilderUserRequest,
  UpdateBuilderUserRequest,
} from '@/lib/api/types';

export const builderUsersApi = api.injectEndpoints({
  endpoints: (build) => ({
    getBuilderUsers: build.query<BuilderUserResponse, { builderId: string }>({
      query: ({ builderId }) => ({
        url: `/api/builder/user`,
        method: 'GET',
        params: { builderId },
      }),
      providesTags: ['BuilderUser'],
    }),
    createOrUpdateBuilderUser: build.mutation<
      BuilderUserResponse,
      CreateBuilderUserRequest | UpdateBuilderUserRequest
    >({
      query: (data) => {
        const params = new URLSearchParams();
        params.set('email', data.email);
        params.set('firstName', data.firstName);
        params.set('lastName', data.lastName || '');
        params.set('contact', data.contact || '');
        params.set('role', data.role);
        params.set('builderOrganizationId', data.builderOrganizationId);
        if ('id' in data && data.id) params.set('id', data.id);
        return {
          url: `/api/builder/user?${params.toString()}`,
          method: 'POST',
        };
      },
      invalidatesTags: ['BuilderUser'],
    }),
    deleteBuilderUser: build.mutation<
      { success: boolean; message: string },
      string
    >({
      query: (id) => ({
        url: `/api/builder/user/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['BuilderUser'],
    }),
  }),
});

export const {
  useGetBuilderUsersQuery,
  useCreateOrUpdateBuilderUserMutation,
  useDeleteBuilderUserMutation,
} = builderUsersApi;
