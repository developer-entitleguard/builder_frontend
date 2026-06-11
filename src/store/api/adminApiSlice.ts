/**
 * Platform super-admin session helpers. The session lives under a SEPARATE
 * localStorage key from the builder portal's `userData` so the two JWTs never
 * cross-contaminate. The admin data layer is plain `fetch` (see adminClient.ts),
 * NOT RTK Query — a second RTK Query slice hit a react-redux missed-first-
 * notification race (data landed in the store but the list stayed "Loading"
 * until the next user event). Plain fetch + useState flushes reliably and keeps
 * the portal free of store coupling, so it lifts into a standalone app cleanly.
 */
export const ADMIN_DATA_KEY = 'adminData';

export interface AdminData {
  jwt: string;
  id?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
}

export const getAdminData = (): AdminData | null => {
  try {
    const raw = localStorage.getItem(ADMIN_DATA_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.jwt ? (parsed as AdminData) : null;
  } catch {
    return null;
  }
};
