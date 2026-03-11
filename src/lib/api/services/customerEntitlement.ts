import { api } from '@/store/api/apiSlice';
import type { 
  CustomerEntitlementResponse
} from '@/lib/api/types.ts';

export const customerEntitlementApi = api.injectEndpoints({
  endpoints: (build) => ({
    createCustomerEntitlement: build.mutation<
      CustomerEntitlementResponse,
      { builderCustomerId: string; consentReceived?: boolean }
    >({
      query: ({ builderCustomerId, consentReceived }) => ({
        url: `/api/create/customerentitlement/${builderCustomerId}`,
        method: 'POST',
        ...(consentReceived !== undefined && { body: { consentReceived } }),
      }),
      invalidatesTags: ['CustomerDetails', 'Dashboard'],
    }),
  }),
});

export const {
  useCreateCustomerEntitlementMutation,
} = customerEntitlementApi;
