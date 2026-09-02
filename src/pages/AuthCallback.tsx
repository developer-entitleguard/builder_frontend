import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { redeemHandoff, type PortalSessionAdapter } from "@/lib/auth/portalSession";

/**
 * Unified sign-in — `/auth/callback?code=…&returnTo=…`. The landing route for a
 * portal-switcher handoff: redeems the single-use code for a session on this
 * origin, stores it exactly as the login page would, and continues to
 * `returnTo` (in-portal path only) or the portal's home.
 */
export interface AuthCallbackProps {
  adapter: PortalSessionAdapter;
  /** Where to go when no valid returnTo is given (e.g. "/dashboard"). */
  home: string;
  /** The login route to offer when the code is spent (e.g. "/auth"). */
  loginPath: string;
}

export function AuthCallback({ adapter, home, loginPath }: AuthCallbackProps) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const code = params.get("code");
    const returnTo = params.get("returnTo");
    if (!code) {
      setFailed(true);
      return;
    }
    let cancelled = false;
    (async () => {
      const session = await redeemHandoff(adapter, code);
      if (cancelled) return;
      if (!session) {
        setFailed(true);
        return;
      }
      adapter.storeSession(session);
      const target = returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : home;
      navigate(target, { replace: true });
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (failed) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 text-center">
          <h1 className="text-lg font-semibold">This link has expired</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Portal links work once and only for a minute. Sign in again to continue.
          </p>
          <button
            type="button"
            onClick={() => navigate(loginPath, { replace: true })}
            className="mt-4 inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Go to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground" aria-live="polite">
      Signing you in…
    </div>
  );
}

export default AuthCallback;
