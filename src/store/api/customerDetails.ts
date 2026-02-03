import { api } from './apiSlice';
import type { CustomerDetailsResponse } from '@/lib/api/types';

export const customerDetailsApi = api.injectEndpoints({
  endpoints: (build) => ({
    getCustomerDetails: build.query<
      CustomerDetailsResponse,
      { builderId: string; customerId: string }
    >({
      query: ({ builderId, customerId }) => ({
        url: `/api/customerdetails`,
        method: 'GET',
        params: { builderId, customerId },
      }),
      providesTags: ['CustomerDetails'],
    }),
  }),
});

export const {
  useGetCustomerDetailsQuery,
  useLazyGetCustomerDetailsQuery,
} = customerDetailsApi;
