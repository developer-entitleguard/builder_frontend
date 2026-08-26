import { createApi, fetchBaseQuery, BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import { getApiBaseUrl } from '@/lib/config';
import { clearSession, getRefreshToken, refreshAccessToken } from '@/lib/auth/session';

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

/**
 * On a 401, try to renew the session before giving up on it. The access token is
 * short-lived by design now, so a 401 usually means "expired", not "signed out" —
 * we refresh and replay the request, and only bounce the user to sign in when the
 * refresh token is gone or spent too.
 */
const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401 && getRefreshToken()) {
    const renewed = await refreshAccessToken();
    if (renewed) {
      result = await baseQuery(args, api, extraOptions);
    }
  }

  if (result.error && result.error.status === 401) {
    console.warn('API request failed with 401, redirecting to login');
    clearSession();
    if (!window.location.pathname.startsWith('/auth')) {
      window.location.href = '/auth?expired=1';
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
    // Project + Compliance (Lite) — simplified Documents surface (folder upload + check).
    'ProjectDocuments',
    // Platform Synergy PRD §3.4 — effective entitlements (org modules/capabilities + caller permissions).
    'Entitlements',
    // Developer/Builder Decoupling PRD — scoped builder delegation per project.
    'ProjectShares',
    // Sales module (SALES bolt-on) — quotes, invoices, sales-customer directory.
    'Quote',
    'Invoice',
    'Customer',
    // Commercial Segment PRD 1 — commercial projects, registrations, businesses, handover.
    'Commercial',
    'CommercialBusiness',
    // Platform Announcements — builder-staff CLIENT consume side (banner/modal + ack).
    'Announcement',
  ],
  endpoints: () => ({}),
});
