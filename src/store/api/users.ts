/* eslint-disable @typescript-eslint/no-explicit-any */
import { api } from './apiSlice';
import type { 
  User, 
  UpdateUserRequest,
  PaginatedResponse,
  PaginationParams,
  SearchParams
} from '@/lib/api/types';

export const usersApi = api.injectEndpoints({
  endpoints: (build) => ({
    // Get all users with pagination
    getUsers: build.query<PaginatedResponse<User>, PaginationParams & SearchParams>({
      query: (params) => ({
        url: '/users',
        method: 'GET',
        params,
      }),
      providesTags: ['User'],
    }),

    // Get user by ID
    getUser: build.query<User, string>({
      query: (id) => ({
        url: `/users/${id}`,
        method: 'GET',
      }),
      providesTags: (result, error, id) => [{ type: 'User', id }],
    }),

    // Create user
    createUser: build.mutation<User, Omit<User, 'id' | 'created_at' | 'updated_at'>>({
      query: (data) => ({
        url: '/users',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['User'],
    }),

    // Update user
    updateUser: build.mutation<User, { id: string; data: UpdateUserRequest }>({
      query: ({ id, data }) => ({
        url: `/users/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'User', id },
        'User'
      ],
    }),

    // Delete user
    deleteUser: build.mutation<void, string>({
      query: (id) => ({
        url: `/users/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['User'],
    }),

    // Toggle user status
    toggleUserStatus: build.mutation<User, { id: string; isActive: boolean }>({
      query: ({ id, isActive }) => ({
        url: `/users/${id}/status`,
        method: 'PATCH',
        body: { is_active: isActive },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'User', id },
        'User'
      ],
    }),

    // Get user roles
    getUserRoles: build.query<any[], string>({
      query: (id) => ({
        url: `/users/${id}/roles`,
        method: 'GET',
      }),
      providesTags: (result, error, id) => [{ type: 'User', id }],
    }),

    // Assign role to user
    assignRole: build.mutation<any, { userId: string; roleData: any }>({
      query: ({ userId, roleData }) => ({
        url: `/users/${userId}/roles`,
        method: 'POST',
        body: roleData,
      }),
      invalidatesTags: (result, error, { userId }) => [
        { type: 'User', id: userId }
      ],
    }),

    // Remove role from user
    removeRole: build.mutation<void, { userId: string; roleId: string }>({
      query: ({ userId, roleId }) => ({
        url: `/users/${userId}/roles/${roleId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { userId }) => [
        { type: 'User', id: userId }
      ],
    }),

    // Get user activity
    getUserActivity: build.query<PaginatedResponse<any>, { id: string } & PaginationParams>({
      query: ({ id, ...params }) => ({
        url: `/users/${id}/activity`,
        method: 'GET',
        params,
      }),
      providesTags: (result, error, { id }) => [{ type: 'User', id }],
    }),
  }),
});

export const {
  useGetUsersQuery,
  useGetUserQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useToggleUserStatusMutation,
  useGetUserRolesQuery,
  useAssignRoleMutation,
  useRemoveRoleMutation,
  useGetUserActivityQuery,
} = usersApi;
