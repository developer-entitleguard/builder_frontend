import { adminFetch, useAdminMutation, useAdminQuery } from './adminClient';
import type { AdminCatalog, EntitlementState } from './types';

export const useGetAdminCatalogQuery = () => useAdminQuery<AdminCatalog>('/api/admin/catalog');

export const useGetAdminEntitlementsQuery = ({ orgType, orgId }: { orgType: string; orgId: string }) =>
  useAdminQuery<EntitlementState>(`/api/admin/orgs/${orgType}/${orgId}/entitlements`);

export const useSetAdminCapabilityMutation = () =>
  useAdminMutation<{ orgType: string; orgId: string; key: string; enabled: boolean }, void>(
    ({ orgType, orgId, key, enabled }) =>
      adminFetch<void>(`/api/admin/orgs/${orgType}/${orgId}/entitlements/capability`, {
        method: 'PUT',
        body: JSON.stringify({ key, enabled }),
      }),
  );

export const useSetAdminBoltonMutation = () =>
  useAdminMutation<{ orgType: string; orgId: string; key: string; enabled: boolean }, void>(
    ({ orgType, orgId, key, enabled }) =>
      adminFetch<void>(`/api/admin/orgs/${orgType}/${orgId}/entitlements/bolton`, {
        method: 'PUT',
        body: JSON.stringify({ key, enabled }),
      }),
  );

/**
 * Project + Compliance (Lite): apply (enabled=true) or clear (enabled=false) the
 * Lite preset in one call. Applying pins the org to projects + registrations +
 * the Documents surface only; clearing removes all bolt-ons back to capability
 * defaults. Atomic alternative to flipping ~12 module bolt-ons by hand.
 */
export const useSetAdminComplianceLitePresetMutation = () =>
  useAdminMutation<{ orgType: string; orgId: string; enabled: boolean }, void>(
    ({ orgType, orgId, enabled }) =>
      adminFetch<void>(`/api/admin/orgs/${orgType}/${orgId}/entitlements/preset/compliance-lite`, {
        method: 'PUT',
        body: JSON.stringify({ enabled }),
      }),
  );
