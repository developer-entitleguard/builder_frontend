import { api } from '@/store/api/apiSlice';
import type { 
  Vendor, 
  CreateVendorRequest,
  UpdateVendorRequest,
  VendorResponse
} from '@/lib/api/types.ts';

export const builderVendorApi = api.injectEndpoints({
  endpoints: (build) => ({
    getBuilderVendors: build.query<VendorResponse, { builderId: string }>({
      query: ({ builderId }) => ({
        url: `/api/builder/vendor?builderId=${builderId}`,
        method: 'GET',
      }),
      providesTags: ['Vendor'],
    }),

    createOrUpdateBuilderVendor: build.mutation<VendorResponse, CreateVendorRequest | UpdateVendorRequest>({
      query: (data) => ({
        url: '/api/builder/vendor',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Vendor'],
    }),

    deleteBuilderVendor: build.mutation<{ success: boolean; message: string }, string>({
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

