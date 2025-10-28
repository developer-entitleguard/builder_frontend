import { api } from '@/store/api/apiSlice';
import type { 
  CustomerItemRequest,
  CustomerItemResponse
} from '@/lib/api/types';

export const customerItemApi = api.injectEndpoints({
  endpoints: (build) => ({
    createCustomerItem: build.mutation<CustomerItemResponse, CustomerItemRequest>({
      query: (data) => ({
        url: '/api/builder/customeritem',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['CustomerItem', 'CustomerDetails'],
    }),
  }),
});

export const {
  useCreateCustomerItemMutation,
} = customerItemApi;
