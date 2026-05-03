import { createApi, fetchBaseQuery, BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import { getApiBaseUrl } from '@/lib/config';

// Base query with authentication
const baseQuery = fetchBaseQuery({
  baseUrl: getApiBaseUrl(),
  prepareHeaders: async (headers, { endpoint }) => {
    if (!endpoint?.includes('unsecure')) {
      try {
        const userData = localStorage.getItem('userData');
        if (userData) {
          const parsedData = JSON.parse(userData);
          if (parsedData.jwt) {
            headers.set('authorization', `Bearer ${parsedData.jwt}`);
          }
        }
      } catch (error) {
        console.warn('Failed to get JWT token for API request:', error);
      }
    }
    
    // Only set Content-Type if it's not FormData (fetch will handle FormData automatically)
    // We check this by looking at the request body, but since we can't access it here,
    // we'll set it and let fetch override it for FormData (which it does automatically)
    headers.set('Content-Type', 'application/json');
    headers.set('Accept', 'application/json');
    return headers;
  },
});

// Base query with re-authentication
const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (args, api, extraOptions) => {
  const result = await baseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401) {
    console.warn('API request failed with 401, redirecting to login');
    localStorage.removeItem('userData');
    window.location.href = '/auth';
  }

  return result;
};

// Create the main API slice
export const api = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    'User',
    'Organization', 
    'Registration',
    'Item',
    'Query',
    'Activities',
    'ActivityCategories',
    'Document',
    'Dashboard',
    'Auth',
    'BuilderUser',
    'BuilderOrganization',
    'Vendor',
    'VendorSchedule',
    'VendorAvailability',
    'Supplier',
    'BuilderCustomer',
    'CustomerDetails',
    'CustomerItem',
    'ItemMap',
    'Projects',
    'Approvals',
    'ProjectPricing',
    'Ticket',
    'ProjectImport',
    'Warranty'
  ],
  endpoints: () => ({}),
});
