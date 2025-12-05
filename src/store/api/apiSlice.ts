import { createApi, fetchBaseQuery, BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import { supabase } from '@/integrations/supabase/client';
import { getApiBaseUrl } from '../../lib/config';

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
    
    headers.set('Accept', 'application/json');
    return headers;
  },
  fetchFn: async (input, init) => {
    // Don't set Content-Type for FormData - browser will set it with boundary
    if (init?.body instanceof FormData) {
      if (init.headers) {
        const headers = new Headers(init.headers);
        headers.delete('Content-Type');
        init.headers = headers;
      }
    } else if (init?.body && typeof init.body === 'object' && !(init.body instanceof FormData)) {
      // Set Content-Type for JSON requests
      if (init.headers) {
        const headers = new Headers(init.headers);
        if (!headers.has('Content-Type')) {
          headers.set('Content-Type', 'application/json');
        }
        init.headers = headers;
      }
    }
    return fetch(input, init);
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
    'Document',
    'Dashboard',
    'Auth',
    'BuilderUser',
    'BuilderOrganization',
    'Vendor',
    'BuilderCustomer',
    'CustomerDetails',
    'CustomerItem',
    'ItemMap'
  ],
  endpoints: () => ({}),
});
