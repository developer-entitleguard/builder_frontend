import { useCallback, useSyncExternalStore } from 'react';
import { ADMIN_DATA_KEY, getAdminData, type AdminData } from '@/store/api/adminApiSlice';

/**
 * Same-tab signal: the browser only fires the native `storage` event for OTHER
 * tabs, so login/logout in this tab dispatch this custom event to re-render
 * subscribers. Mirrors USER_DATA_EVENT in useOrganization.
 */
const ADMIN_DATA_EVENT = 'admindata-updated';

const subscribe = (callback: () => void) => {
  const handler = () => callback();
  window.addEventListener(ADMIN_DATA_EVENT, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(ADMIN_DATA_EVENT, handler);
    window.removeEventListener('storage', handler);
  };
};

const getSnapshot = () => localStorage.getItem(ADMIN_DATA_KEY);

/**
 * Minimal auth state for the platform super-admin portal. Deliberately has no
 * Supabase / useOrganization coupling so the whole `/platform-admin` subtree can
 * be lifted into a standalone frontend later. Session lives under `adminData`.
 */
export const useAdminAuth = () => {
  // Re-render whenever adminData changes (this tab via event, other tabs via storage).
  useSyncExternalStore(subscribe, getSnapshot, () => null);
  const admin = getAdminData();

  const setSession = useCallback((data: AdminData) => {
    localStorage.setItem(ADMIN_DATA_KEY, JSON.stringify(data));
    window.dispatchEvent(new Event(ADMIN_DATA_EVENT));
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(ADMIN_DATA_KEY);
    window.dispatchEvent(new Event(ADMIN_DATA_EVENT));
  }, []);

  return {
    admin,
    isAdminAuthed: !!admin?.jwt,
    setSession,
    logout,
  };
};
