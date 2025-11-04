import { api } from '@/store/api/apiSlice';
import type { 
  ItemMapUpdate,
  ItemMapUpdateResponse
} from '@/lib/api/types';
import { getApiBaseUrl } from '@/lib/config';

export const itemMapApi = api.injectEndpoints({
  endpoints: (build) => ({
    updateItemMap: build.mutation<ItemMapUpdateResponse, FormData>({
      queryFn: async (formData) => {
        try {
          const userData = localStorage.getItem('userData');
          let token = '';
          if (userData) {
            const parsedData = JSON.parse(userData);
            token = parsedData.jwt || '';
          }

          const response = await fetch(`${getApiBaseUrl()}/api/itemmap/update`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
            body: formData,
          });

          if (!response.ok) {
            let errorData;
            const contentType = response.headers.get('content-type');
            try {
              if (contentType && contentType.includes('application/json')) {
                errorData = await response.json();
              } else {
                errorData = await response.text();
              }
            } catch {
              errorData = `HTTP ${response.status}: ${response.statusText}`;
            }
            
            return {
              error: {
                status: response.status,
                data: errorData,
              },
            };
          }

          const data = await response.json();
          return { data };
        } catch (error) {
          return {
            error: {
              status: 'FETCH_ERROR',
              error: String(error),
            },
          };
        }
      },
      invalidatesTags: ['ItemMap', 'CustomerDetails'],
    }),
  }),
});

export const {
  useUpdateItemMapMutation,
} = itemMapApi;
