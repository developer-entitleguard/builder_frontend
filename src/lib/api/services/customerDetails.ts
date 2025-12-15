import { api } from '@/store/api/apiSlice';
import type { 
  CustomerDetailsResponse
} from '@/lib/api/types.ts';

export const customerDetailsApi = api.injectEndpoints({
  endpoints: (build) => ({
    getCustomerDetails: build.query<CustomerDetailsResponse, { builderId: string; customerId: string }>({
      query: ({ builderId, customerId }) => ({
        url: `/api/customerdetails?builderId=${builderId}&customerId=${customerId}`,
        method: 'GET',
      }),
      providesTags: ['CustomerDetails'],
    }),
  }),
});

export const {
  useGetCustomerDetailsQuery,
  useLazyGetCustomerDetailsQuery,
} = customerDetailsApi;
