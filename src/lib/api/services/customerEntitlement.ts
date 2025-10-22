import { api } from '@/store/api/apiSlice';
import type { 
  CustomerEntitlementResponse
} from '@/lib/api/types';

export const customerEntitlementApi = api.injectEndpoints({
  endpoints: (build) => ({
    createCustomerEntitlement: build.mutation<CustomerEntitlementResponse, { builderCustomerId: string }>({
      query: ({ builderCustomerId }) => ({
        url: `/api/create/customerentitlement/${builderCustomerId}`,
        method: 'POST',
      }),
      invalidatesTags: ['CustomerDetails', 'Dashboard'],
    }),
  }),
});

export const {
  useCreateCustomerEntitlementMutation,
} = customerEntitlementApi;
