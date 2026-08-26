import { getApiBaseUrl } from '@/lib/config';

/**
 * Portal session handling: keeps the builder signed in across days without
 * re-entering a password.
 *
 * Login returns a short-lived access token plus a long-lived refresh token. The
 * access token still lives in `localStorage.userData.jwt` where every existing
 * call site (RTK Query and the hand-rolled `fetch` services alike) already looks
 * for it; the refresh token sits under its own key so it is never sent as a
 * bearer credential by accident.
 *
 * Two things keep the access token current:
 *  - a proactive timer that renews it before it expires. Because it writes back
 *    to `userData.jwt`, every call site benefits without changing any of them.
 *  - a reactive refresh on a 401 in the RTK Query base query, which covers the
 *    gap after a laptop wakes from sleep with a token that died while asleep.
 */

const USER_DATA_KEY = 'userData';
const REFRESH_TOKEN_KEY = 'eg.builder.refresh_token';

/** Renew this long before expiry, so a slow network can't leave us stranded. */
const REFRESH_MARGIN_MS = 5 * 60 * 1000;

/** Upper bound on a single timer hop — setTimeout gets unreliable beyond ~24 days. */
const MAX_TIMER_MS = 6 * 60 * 60 * 1000;

export interface StoredSession {
  jwt?: string;
  [key: string]: unknown;
}

export function readUserData(): StoredSession | null {
  try {
    const raw = localStorage.getItem(USER_DATA_KEY);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
}

export function getAccessToken(): string | null {
  return readUserData()?.jwt ?? null;
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setRefreshToken(token: string | null | undefined): void {
  if (token) {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}

/** Swaps in a renewed access token, leaving the rest of the stored profile alone. */
function storeAccessToken(jwt: string): void {
  const current = readUserData() ?? {};
  localStorage.setItem(USER_DATA_KEY, JSON.stringify({ ...current, jwt }));
}

export function clearSession(): void {
  localStorage.removeItem(USER_DATA_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  stopProactiveRefresh();
}

/** Expiry of a JWT in epoch ms, or null if it can't be read. */
export function readExpiry(token: string | null): number | null {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

/**
 * Tells the backend to revoke the refresh token, so signing out ends the session
 * server-side rather than only forgetting it locally. Best-effort: a failure here
 * must not block the user from signing out.
 */
export async function revokeSession(): Promise<void> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return;
  try {
    await fetch(`${getApiBaseUrl()}/unsecure/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
  } catch {
    // Offline sign-out still clears the browser's copy.
  }
}

// A refresh in flight, shared by every caller. Without this, a page that fires
// six queries at once on a dead token would send six refreshes — and because
// each rotates the token, five would be racing against an already-superseded
// value and would log the user out.
let inFlight: Promise<string | null> | null = null;

/**
 * Renews the access token. Returns the new token, or null when the session is
 * genuinely over and the user has to sign in again.
 */
export function refreshAccessToken(): Promise<string | null> {
  if (inFlight) return inFlight;

  const refreshToken = getRefreshToken();
  if (!refreshToken) return Promise.resolve(null);

  inFlight = (async () => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/unsecure/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        // 401 means the refresh token is spent; anything else is a server or
        // network problem where dropping the session would be the wrong call, so
        // we keep it and let the next attempt try again.
        if (response.status === 401) clearSession();
        return null;
      }

      const body = await response.json();
      const jwt: string | undefined = body?.data?.jwt;
      if (!jwt) return null;

      storeAccessToken(jwt);
      setRefreshToken(body?.data?.refreshToken);
      scheduleProactiveRefresh();
      return jwt;
    } catch {
      return null;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

let refreshTimer: ReturnType<typeof setTimeout> | null = null;

export function stopProactiveRefresh(): void {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
}

/**
 * Arms a timer to renew the access token shortly before it expires, so requests
 * rarely meet a 401 at all. Re-arms itself after each renewal.
 */
export function scheduleProactiveRefresh(): void {
  stopProactiveRefresh();
  if (!getRefreshToken()) return;

  const expiry = readExpiry(getAccessToken());
  if (expiry === null) return;

  const delay = Math.min(Math.max(expiry - Date.now() - REFRESH_MARGIN_MS, 0), MAX_TIMER_MS);
  refreshTimer = setTimeout(() => {
    // Past the margin, refresh; otherwise this was a capped hop, so just re-arm.
    if (Date.now() >= expiry - REFRESH_MARGIN_MS) {
      void refreshAccessToken();
    } else {
      scheduleProactiveRefresh();
    }
  }, delay);
}

let listenersBound = false;

/**
 * Starts session upkeep for the tab. Also renews on wake/refocus: a laptop that
 * slept through the expiry has a dead token and a stopped timer, and catching
 * that here means the user's first click after opening the lid works.
 */
export function initSessionRefresh(): void {
  const renewIfStale = () => {
    if (document.visibilityState === 'hidden' || !getRefreshToken()) return;
    const expiry = readExpiry(getAccessToken());
    if (expiry === null || Date.now() >= expiry - REFRESH_MARGIN_MS) {
      void refreshAccessToken();
    } else {
      scheduleProactiveRefresh();
    }
  };

  renewIfStale();

  if (listenersBound) return;
  listenersBound = true;
  // visibilitychange fires on document, not window; focus covers alt-tabbing
  // back to an already-visible tab.
  document.addEventListener('visibilitychange', renewIfStale);
  window.addEventListener('focus', renewIfStale);
}
