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
      query: (data) => ({
        url: `/api/builder/user`,
        method: 'POST',
        body: {
          ...('id' in data && data.id ? { id: data.id } : {}),
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName || '',
          contact: data.contact || '',
          role: data.role,
          vendorType: data.vendorType ?? null,
          specializations: data.specializations ?? '',
          builderOrganizationId: data.builderOrganizationId,
        },
      }),
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
