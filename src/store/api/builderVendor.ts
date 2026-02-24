import { api } from './apiSlice';
import type {
  VendorResponse,
  CreateVendorRequest,
  UpdateVendorRequest,
} from '@/lib/api/types';

export const builderVendorApi = api.injectEndpoints({
  endpoints: (build) => ({
    getBuilderVendors: build.query<VendorResponse, { builderId: string }>({
      query: ({ builderId }) => ({
        url: `/api/builder/vendor`,
        method: 'GET',
        params: { builderId },
      }),
      providesTags: ['Vendor'],
    }),
    createOrUpdateBuilderVendor: build.mutation<
      VendorResponse,
      CreateVendorRequest | UpdateVendorRequest
    >({
      query: (data) => ({
        url: '/api/builder/vendor',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Vendor'],
    }),
    deleteBuilderVendor: build.mutation<
      { success: boolean; message: string },
      string
    >({
      query: (id) => ({
        url: `/api/builder/vendor/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Vendor'],
    }),
  }),
});

export const {
  useGetBuilderVendorsQuery,
  useCreateOrUpdateBuilderVendorMutation,
  useDeleteBuilderVendorMutation,
} = builderVendorApi;
