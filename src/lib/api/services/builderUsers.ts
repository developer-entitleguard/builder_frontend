import { api } from '@/store/api/apiSlice';
import type { 
  BuilderUser, 
  CreateBuilderUserRequest,
  UpdateBuilderUserRequest,
  BuilderUserResponse
} from '@/lib/api/types.ts';

export const builderUsersApi = api.injectEndpoints({
  endpoints: (build) => ({
    getBuilderUsers: build.query<BuilderUserResponse, { builderId: string }>({
      query: ({ builderId }) => ({
        url: `/api/builder/user?builderId=${builderId}`,
        method: 'GET',
      }),
      providesTags: ['BuilderUser'],
    }),

    createOrUpdateBuilderUser: build.mutation<BuilderUserResponse, CreateBuilderUserRequest | UpdateBuilderUserRequest>({
      query: (data) => {
        const params = new URLSearchParams({
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName || '',
          contact: data.contact || '',
          role: data.role,
          builderOrganizationId: data.builderOrganizationId,
          ...('id' in data && { id: data.id })
        });

        return {
          url: `/api/builder/user?${params.toString()}`,
          method: 'POST',
        };
      },
      invalidatesTags: ['BuilderUser'],
    }),

    deleteBuilderUser: build.mutation<{ success: boolean; message: string }, string>({
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
