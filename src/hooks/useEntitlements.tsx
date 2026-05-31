import { useGetEntitlementsQuery } from '@/store/api/entitlements';

/**
 * Platform Synergy PRD (§3.4). Reads the caller's effective entitlements once
 * (RTK Query caches it) and exposes guard helpers for nav visibility + route
 * gating.
 *
 * Fail-open while loading: helpers return `true` until the first response lands
 * so the shell doesn't flash-hide nav on a slow network. Once loaded, gating is
 * exact. Modules/capabilities are org-level; permissions are role-derived.
 */
export function useEntitlements() {
  const { data, isLoading, isError } = useGetEntitlementsQuery();

  const ready = !isLoading && !isError && !!data;

  const has = (set: string[] | undefined, key: string) => {
    if (!ready) return true; // optimistic during load
    return !!set && set.includes(key);
  };

  return {
    entitlements: data,
    isLoading,
    isError,
    ready,
    orgType: data?.orgType ?? null,
    orgId: data?.orgId ?? null,
    hasModule: (key: string) => has(data?.modules, key),
    hasCapability: (key: string) => has(data?.capabilities, key),
    hasPermission: (key: string) => has(data?.permissions, key),
  };
}
