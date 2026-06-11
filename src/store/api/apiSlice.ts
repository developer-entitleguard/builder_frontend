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
    
    // Do NOT hard-set Content-Type here. Once it's explicitly set, neither
    // fetchBaseQuery nor the browser will replace it — which mislabels multipart
    // FormData uploads as application/json (no boundary) and yields HTTP 415.
    // Letting fetchBaseQuery decide gives the right header for each body type:
    //   • plain-object body  → application/json (auto-stringified)
    //   • FormData body       → multipart/form-data; boundary=… (browser-set)
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
    // Ticket/Query/Job refactor — jobs spawned from a converted ticket query.
    'Job',
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
    // Builder staff in-app notifications (bell + /notifications page).
    'Notification',
    'ProjectImport',
    'Warranty',
    // PRD_Org_Terms_And_Conditions Phase 4.
    'OrgTerms',
    // PRD_Compliance_Documents — project/registration compliance docs + handover gating.
    'ComplianceDocuments',
    'ComplianceAttachments',
    'HandoverReadiness',
    // Platform Synergy PRD §3.4 — effective entitlements (org modules/capabilities + caller permissions).
    'Entitlements',
    // Developer/Builder Decoupling PRD — scoped builder delegation per project.
    'ProjectShares',
  ],
  endpoints: () => ({}),
});
