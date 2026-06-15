import { api } from './apiSlice';
import type { CustomerEntitlementResponse } from '@/lib/api/types';
import type { BulkOperationResponse } from './bulkTypes';

export const customerEntitlementApi = api.injectEndpoints({
  endpoints: (build) => ({
    createCustomerEntitlement: build.mutation<
      CustomerEntitlementResponse,
      { builderCustomerId: string; handoverDate?: string }
    >({
      // handoverDate (ISO yyyy-MM-dd) is the settlement/handover date chosen in
      // the popup; omitted → the backend defaults to today.
      query: ({ builderCustomerId, handoverDate }) => ({
        url: `/api/create/customerentitlement/${builderCustomerId}`,
        method: 'POST',
        body: handoverDate ? { handoverDate } : {},
      }),
      invalidatesTags: ['CustomerDetails', 'Dashboard', 'BuilderCustomer', 'Registration'],
    }),
    // Hand over many registrations at once. Per-row compliance gate applies, so
    // the response carries a per-row outcome list for partial-success reporting.
    bulkHandover: build.mutation<
      BulkOperationResponse,
      { customerIds: string[]; handoverDate?: string }
    >({
      query: (body) => ({
        url: '/api/builder/customers/handover',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['CustomerDetails', 'Dashboard', 'BuilderCustomer', 'Registration'],
    }),
  }),
});

export const {
  useCreateCustomerEntitlementMutation,
  useBulkHandoverMutation,
} = customerEntitlementApi;
