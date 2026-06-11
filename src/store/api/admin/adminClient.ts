import { useCallback, useEffect, useState } from 'react';
import { getApiBaseUrl } from '@/lib/config';
import { ADMIN_DATA_KEY, getAdminData } from '../adminApiSlice';

/** Error shape thrown by adminFetch — `data.message` mirrors the backend body. */
export interface AdminFetchError {
  status: number;
  data: { message?: string } & Record<string, unknown>;
}

/**
 * Core fetch for the platform-admin API. Attaches the admin JWT (except for the
 * login endpoint), JSON-encodes bodies, and on a 401 against `/api/admin/**`
 * clears the admin session and bounces to the admin login (never the builder one).
 */
export async function adminFetch<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers ?? {});
  headers.set('Accept', 'application/json');
  if (!path.includes('adminlogin')) {
    const admin = getAdminData();
    if (admin?.jwt) {
      headers.set('authorization', `Bearer ${admin.jwt}`);
    }
  }
  if (init.body != null && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(getApiBaseUrl() + path, { ...init, headers });

  if (res.status === 401 && path.startsWith('/api/admin')) {
    try {
      localStorage.removeItem(ADMIN_DATA_KEY);
    } catch {
      // ignore
    }
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/platform-admin/login')) {
      window.location.href = '/platform-admin/login';
    }
  }

  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw { status: res.status, data: body ?? {} } as AdminFetchError;
  }
  return body as T;
}

// --- coarse cache invalidation bus ---------------------------------------
// A mutation bumps the version; every mounted admin query refetches. Coarse but
// perfectly adequate for an admin panel, and avoids per-tag bookkeeping.
let version = 0;
const listeners = new Set<() => void>();

export function invalidateAdmin() {
  version += 1;
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export interface AdminQueryResult<T> {
  data?: T;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

/**
 * Plain-fetch query hook mirroring RTK Query's `useQuery` return shape. Refetches
 * when `path` changes or any mutation invalidates. Pass `null` to skip.
 */
export function useAdminQuery<T>(path: string | null): AdminQueryResult<T> {
  const [state, setState] = useState<{ data?: T; isLoading: boolean; isError: boolean }>({
    isLoading: path != null,
    isError: false,
  });

  const load = useCallback(() => {
    if (path == null) {
      setState({ data: undefined, isLoading: false, isError: false });
      return;
    }
    setState((s) => ({ ...s, isLoading: true, isError: false }));
    adminFetch<T>(path)
      .then((data) => setState({ data, isLoading: false, isError: false }))
      .catch(() => setState({ data: undefined, isLoading: false, isError: true }));
  }, [path]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => subscribe(load), [load]);

  return { ...state, refetch: load };
}

export interface AdminMutationHandle<TRes> {
  unwrap: () => Promise<TRes>;
}

/**
 * Plain-fetch mutation hook mirroring RTK Query's `[trigger, { isLoading }]`
 * tuple. `trigger(args)` returns an object with `.unwrap()` resolving to the
 * response; a successful call invalidates all admin queries.
 */
export function useAdminMutation<TArgs, TRes>(
  fn: (args: TArgs) => Promise<TRes>,
): readonly [(args: TArgs) => AdminMutationHandle<TRes>, { isLoading: boolean }] {
  const [isLoading, setIsLoading] = useState(false);

  const trigger = useCallback(
    (args: TArgs): AdminMutationHandle<TRes> => {
      const promise = (async () => {
        setIsLoading(true);
        try {
          const result = await fn(args);
          invalidateAdmin();
          return result;
        } finally {
          setIsLoading(false);
        }
      })();
      return { unwrap: () => promise };
    },
    [fn],
  );

  return [trigger, { isLoading }] as const;
}
