import { api } from '@/store/api/apiSlice';
import type { 
  BuilderCustomer,
  CreateBuilderCustomerRequest,
  BuilderCustomerResponse
} from '@/lib/api/types';

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
  }),
});

export const {
  useCreateBuilderCustomerMutation,
} = builderCustomerApi;
