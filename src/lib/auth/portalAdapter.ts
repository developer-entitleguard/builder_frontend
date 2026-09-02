import { getApiBaseUrl } from '@/lib/config';
import { clearSession, getAccessToken, revokeSession } from '@/lib/auth/session';
import { storeBuilderSession } from '@/lib/auth/storeSession';
import type { PortalSessionAdapter } from '@/lib/auth/portalSession';

/**
 * Unified sign-in — the Builder portal's adapter for the shared
 * `portalSession.ts` contract. This is the only per-portal code the shared
 * switcher / callback need: which portal this is, where the API lives, how to
 * read the bearer token, and how to store / clear a session the way this SPA
 * already does.
 */
export const builderSessionAdapter: PortalSessionAdapter = {
  portal: 'BUILDER',
  apiBaseUrl: getApiBaseUrl,
  accessToken: () => getAccessToken(),
  storeSession: storeBuilderSession,
  clearSession: () => {
    // Revoke this window's refresh token server-side first (best effort,
    // fire-and-forget), then forget the browser's copy — same order as the
    // header's Sign Out.
    void revokeSession();
    clearSession();
  },
};
