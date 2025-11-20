import { api } from '@/store/api/apiSlice';
import type { 
  BuilderCustomer,
  CreateBuilderCustomerRequest,
  BuilderCustomerResponse
} from '@/lib/api/types.ts';

export const builderCustomerApi = api.injectEndpoints({
  endpoints: (build) => ({
    createBuilderCustomer: build.mutation<BuilderCustomerResponse, CreateBuilderCustomerRequest>({
      query: (data) => ({
        url: '/api/builder/customer',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['BuilderCustomer', 'CustomerDetails'],
    }),
    deleteBuilderCustomer: build.mutation<{ success: boolean; message: string }, string>({
      query: (id) => ({
        url: `/api/builder/customer/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['BuilderCustomer', 'CustomerDetails', 'Dashboard'],
    }),
  }),
});

export const {
  useCreateBuilderCustomerMutation,
  useDeleteBuilderCustomerMutation,
} = builderCustomerApi;
