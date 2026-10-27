/**
 * Platform-admin impersonation — the banner and its session helpers.
 *
 * Copied verbatim into every portal (builder / merchant / trade / business),
 * like portalSession.ts. Keep this file identical across repos.
 *
 * A platform admin opens a portal through /auth/callback with an impersonation
 * code. The session has no refresh token and expires with the impersonation.
 * While it lasts, a banner sits on top of every page; closing it ends the
 * session on the server and signs this tab out.
 */
import { useEffect, useState } from "react";
import type { ImpersonationInfo, PortalSessionAdapter } from "@/lib/auth/portalSession";

/** Also cleared by each portal's clearSession(), so signing out drops the banner. */
export const IMPERSONATION_STORAGE_KEY = "eg.impersonation";
const STORAGE_KEY = IMPERSONATION_STORAGE_KEY;

/** Fired on change so a banner mounted above the router (builder) picks up a new session. */
const CHANGE_EVENT = "eg:impersonation";

export function rememberImpersonation(info: ImpersonationInfo | null | undefined): void {
  try {
    if (info) localStorage.setItem(STORAGE_KEY, JSON.stringify(info));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage unavailable: no banner, and the server still enforces the session.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function readImpersonation(): ImpersonationInfo | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ImpersonationInfo) : null;
  } catch {
    return null;
  }
}

/**
 * Ends the impersonation: tells the server (which then rejects the token),
 * forgets the session locally, and leaves the portal.
 */
export async function endImpersonation(adapter: PortalSessionAdapter): Promise<void> {
  const token = adapter.accessToken();
  if (token) {
    try {
      await fetch(`${adapter.apiBaseUrl()}/api/impersonation/end`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // Offline: the session still dies at its expiry, and this tab forgets it now.
    }
  }
  rememberImpersonation(null);
  adapter.clearSession();
  // The platform-admin portal opened this tab; close it when the browser allows.
  window.close();
  window.location.replace("/");
}

function minutesLeft(expiresAt: string, now: number): number {
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - now) / 60000));
}

export function ImpersonationBanner({ adapter }: { adapter: PortalSessionAdapter }) {
  const [info, setInfo] = useState<ImpersonationInfo | null>(() =>
    adapter.accessToken() ? readImpersonation() : null,
  );
  const [now, setNow] = useState(() => Date.now());
  const [ending, setEnding] = useState(false);

  // Confirm with the server once per load: a stale entry (the session ended in
  // another tab, or a normal sign-in replaced it) must not keep a banner up.
  useEffect(() => {
    const token = adapter.accessToken();
    if (!info || !token) return;
    let cancelled = false;
    fetch(`${adapter.apiBaseUrl()}/api/impersonation/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        if (cancelled) return;
        if (res.status === 404) {
          rememberImpersonation(null);
          setInfo(null);
        } else if (res.status === 401) {
          void endImpersonation(adapter);
        }
      })
      .catch(() => {
        // Network trouble: keep the banner.
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const reread = () => setInfo(adapter.accessToken() ? readImpersonation() : null);
    window.addEventListener(CHANGE_EVENT, reread);
    return () => window.removeEventListener(CHANGE_EVENT, reread);
  }, [adapter]);

  useEffect(() => {
    if (!info) return;
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, [info]);

  useEffect(() => {
    if (info && minutesLeft(info.expiresAt, now) === 0) void endImpersonation(adapter);
  }, [info, now, adapter]);

  if (!info) return null;

  const who = info.adminName && info.adminName !== info.adminEmail
    ? `${info.adminName} (${info.adminEmail})`
    : info.adminEmail;
  const close = () => {
    setEnding(true);
    void endImpersonation(adapter);
  };

  return (
    <div
      role="status"
      className="sticky top-0 z-[1000] flex w-full items-center gap-3 bg-red-600 px-3 py-1.5 text-xs text-white shadow sm:px-4 sm:py-2 sm:text-sm"
    >
      {/* Phones: one line, org and time only; the rest is in the title (long-press). */}
      <span className="min-w-0 flex-1 truncate sm:hidden" title={`Signed in as platform admin ${who}`}>
        <strong className="font-semibold">Impersonating</strong> {info.orgName ?? "this organisation"} ·{" "}
        {minutesLeft(info.expiresAt, now)} min
      </span>
      <span className="hidden min-w-0 flex-1 sm:inline">
        <strong className="font-semibold">Impersonating</strong>{" "}
        {info.orgName ?? "this organisation"}
        {info.portal ? ` (${info.portal})` : ""}
        {info.actingAsEmail ? ` as ${info.actingAsEmail}` : ""} · signed in as platform admin {who} · ends in{" "}
        {minutesLeft(info.expiresAt, now)} min · every change is logged
      </span>
      <button
        type="button"
        onClick={close}
        disabled={ending}
        aria-label="End impersonation"
        className="shrink-0 rounded border border-white/60 px-2 py-0.5 text-xs font-medium hover:bg-white/15 disabled:opacity-60"
      >
        {ending ? "Ending…" : (
          <>
            <span className="sm:hidden">End ✕</span>
            <span className="hidden sm:inline">End impersonation ✕</span>
          </>
        )}
      </button>
    </div>
  );
}
