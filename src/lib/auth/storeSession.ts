import { USER_DATA_EVENT } from '@/hooks/useOrganization';
import { initSessionRefresh, setRefreshToken } from '@/lib/auth/session';
import type { SessionPayload } from '@/lib/auth/portalSession';

/**
 * Unified sign-in — the ONE place a freshly issued builder session is written.
 *
 * Every entry point (legacy `/unsecure/builderlogin`, unified `/unsecure/auth/*`,
 * the `/auth/callback` handoff, the same-portal seat switch) funnels through
 * here so they all leave the browser in exactly the state `Auth.tsx` produced
 * before unified sign-in existed:
 *
 *   localStorage.userData        = { jwt, ...userInfo, builderOrganization }
 *   localStorage["eg.builder.refresh_token"] = refreshToken
 *   proactive refresh armed, USER_DATA_EVENT dispatched.
 *
 * `useOrganization.initFromBuilderAuth`, `lib/roles.ts`, `RoleGate` and
 * `RoleDashboard` read that blob unchanged, so nothing about how an existing
 * builder is recognised moves.
 */

const USER_DATA_KEY = 'userData';

/**
 * The `builderOrganization` slot of the blob.
 *
 * With a BUILDER seat the backend sends the seat's org as `payload.org`, which
 * is the org the person actually signed into (their default org's
 * `userInfo.builderOrganization` may be a different one when they hold several
 * builder seats). Without a seat — the legacy response — the source is exactly
 * what `Auth.tsx` always used.
 */
function resolveBuilderOrganization(payload: SessionPayload): unknown {
  if (payload.seat?.orgType === 'BUILDER' && payload.org) {
    return payload.org;
  }
  return (
    payload.userInfo?.builderOrganization ??
    (payload as { builderOrganization?: unknown }).builderOrganization
  );
}

/** Pure: the blob that will be written, for callers/tests that want to inspect it. */
export function buildUserDataBlob(payload: SessionPayload): Record<string, unknown> {
  const userInfo = payload.userInfo ?? {};
  const blob: Record<string, unknown> = {
    jwt: payload.jwt,
    ...userInfo,
    builderOrganization: resolveBuilderOrganization(payload),
  };
  // The role in THIS org. `userInfo.role` is the person's default-org role; a
  // seat carries the role for the org they actually signed into.
  if (payload.seat?.role) {
    blob.role = payload.seat.role;
  }
  return blob;
}

export function storeBuilderSession(payload: SessionPayload): void {
  localStorage.setItem(USER_DATA_KEY, JSON.stringify(buildUserDataBlob(payload)));
  // The long-lived half of the session, kept out of userData so it can never be
  // picked up and sent as a bearer token. From here on the app renews itself
  // instead of asking for the password again tomorrow.
  setRefreshToken(payload.refreshToken);
  initSessionRefresh();
  // Notify OrganizationProvider so it picks up the new role + org before we
  // navigate. Without this the provider's mount effect (which already ran with
  // an empty localStorage) leaves currentRole=null, and guarded pages like
  // /admin briefly flash "Access denied".
  window.dispatchEvent(new Event(USER_DATA_EVENT));
}
