/* eslint-disable @typescript-eslint/no-explicit-any */
import { api } from './apiSlice';
import type { 
  HomeownerRegistration, 
  CreateRegistrationRequest, 
  UpdateRegistrationRequest,
  PaginatedResponse,
  PaginationParams,
  SearchParams
} from '@/lib/api/types';

export const registrationsApi = api.injectEndpoints({
  endpoints: (build) => ({
    // Get all registrations with pagination
    getRegistrations: build.query<PaginatedResponse<HomeownerRegistration>, PaginationParams & SearchParams>({
      query: (params) => ({
        url: '/registrations',
        method: 'GET',
        params,
      }),
      providesTags: ['Registration'],
    }),

    // Get registration by ID
    getRegistration: build.query<HomeownerRegistration, string>({
      query: (id) => ({
        url: `/registrations/${id}`,
        method: 'GET',
      }),
      providesTags: (result, error, id) => [{ type: 'Registration', id }],
    }),

    // Create registration
    createRegistration: build.mutation<HomeownerRegistration, CreateRegistrationRequest>({
      query: (data) => ({
        url: '/registrations',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Registration'],
    }),

    // Update registration
    updateRegistration: build.mutation<HomeownerRegistration, { id: string; data: UpdateRegistrationRequest }>({
      query: ({ id, data }) => ({
        url: `/registrations/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Registration', id },
        'Registration'
      ],
    }),

    // Delete registration
    deleteRegistration: build.mutation<void, string>({
      query: (id) => ({
        url: `/registrations/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Registration'],
    }),

    // Approve registration
    approveRegistration: build.mutation<HomeownerRegistration, { id: string; notes?: string }>({
      query: ({ id, notes }) => ({
        url: `/registrations/${id}/approve`,
        method: 'PATCH',
        body: { notes },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Registration', id },
        'Registration'
      ],
    }),

    // Reject registration
    rejectRegistration: build.mutation<HomeownerRegistration, { id: string; reason: string }>({
      query: ({ id, reason }) => ({
        url: `/registrations/${id}/reject`,
        method: 'PATCH',
        body: { reason },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Registration', id },
        'Registration'
      ],
    }),

    // Complete registration
    completeRegistration: build.mutation<HomeownerRegistration, string>({
      query: (id) => ({
        url: `/registrations/${id}/complete`,
        method: 'PATCH',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Registration', id },
        'Registration'
      ],
    }),

    // Send entitlement
    sendEntitlement: build.mutation<HomeownerRegistration, string>({
      query: (id) => ({
        url: `/registrations/${id}/send-entitlement`,
        method: 'PATCH',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Registration', id },
        'Registration'
      ],
    }),

    // Get registrations by status
    getRegistrationsByStatus: build.query<PaginatedResponse<HomeownerRegistration>, { status: string } & PaginationParams>({
      query: ({ status, ...params }) => ({
        url: `/registrations/status/${status}`,
        method: 'GET',
        params,
      }),
      providesTags: ['Registration'],
    }),

    // Get registrations by organization
    getRegistrationsByOrganization: build.query<PaginatedResponse<HomeownerRegistration>, { organizationId: string } & PaginationParams>({
      query: ({ organizationId, ...params }) => ({
        url: `/registrations/organization/${organizationId}`,
        method: 'GET',
        params,
      }),
      providesTags: ['Registration'],
    }),

    // Get registration statistics
    getRegistrationStats: build.query<any, { organizationId?: string }>({
      query: (params) => ({
        url: '/registrations/stats',
        method: 'GET',
        params,
      }),
      providesTags: ['Registration'],
    }),

    // Search registrations
    searchRegistrations: build.query<PaginatedResponse<HomeownerRegistration>, { query: string } & PaginationParams>({
      query: ({ query, ...params }) => ({
        url: '/registrations/search',
        method: 'GET',
        params: { ...params, q: query },
      }),
      providesTags: ['Registration'],
    }),
  }),
});

export const {
  useGetRegistrationsQuery,
  useGetRegistrationQuery,
  useCreateRegistrationMutation,
  useUpdateRegistrationMutation,
  useDeleteRegistrationMutation,
  useApproveRegistrationMutation,
  useRejectRegistrationMutation,
  useCompleteRegistrationMutation,
  useSendEntitlementMutation,
  useGetRegistrationsByStatusQuery,
  useGetRegistrationsByOrganizationQuery,
  useGetRegistrationStatsQuery,
  useLazySearchRegistrationsQuery,
} = registrationsApi;
