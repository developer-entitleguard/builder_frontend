import { api } from './apiSlice';

/**
 * Platform Synergy PRD (§3.4). The single endpoint each SPA calls on login to
 * drive route guards + nav visibility. Returns the caller's org context,
 * effective capabilities + modules (org-level), and the caller's own
 * permissions (role-derived). Backed by GET /api/me/entitlements.
 */
export interface EntitlementsView {
  orgType: string;
  orgId: string;
  capabilities: string[];
  modules: string[];
  permissions: string[];
  /**
   * Commercial Segment PRD 1 (R2/R3). Derived building-segment access the SPA
   * uses to gate the project-type selector and commercial surfaces. residential
   * = the org holds BUILD|DEVELOP; commercial = it holds COMMERCIAL.
   */
  segments: { residential: boolean; commercial: boolean };
}

export const entitlementsApi = api.injectEndpoints({
  endpoints: (build) => ({
    getEntitlements: build.query<EntitlementsView, void>({
      query: () => ({ url: '/api/me/entitlements', method: 'GET' }),
      providesTags: ['Entitlements'],
    }),
  }),
});

export const { useGetEntitlementsQuery } = entitlementsApi;
