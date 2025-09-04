import { createApi, fetchBaseQuery, BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import { supabase } from '@/integrations/supabase/client';
import { getApiBaseUrl } from '../../lib/config';

// Base query with authentication
const baseQuery = fetchBaseQuery({
  baseUrl: getApiBaseUrl(),
  prepareHeaders: async (headers) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        headers.set('authorization', `Bearer ${session.access_token}`);
      }
    } catch (error) {
      console.warn('Failed to get session for API request:', error);
    }
    
    headers.set('Content-Type', 'application/json');
    headers.set('Accept', 'application/json');
    return headers;
  },
});

// Base query with re-authentication
const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401) {
    // Try to refresh the session
    try {
      const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError || !session) {
        // Refresh failed, redirect to login
        await supabase.auth.signOut();
        window.location.href = '/auth';
        return result;
      }

      // Retry the original query with new token
      result = await baseQuery(args, api, extraOptions);
    } catch (error) {
      await supabase.auth.signOut();
      window.location.href = '/auth';
    }
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
    'Auth'
  ],
  endpoints: () => ({}),
});
