/**
 * Unified sign-in — shared portal session contract.
 *
 * Copied verbatim into every portal (builder / merchant / trade / business);
 * only the adapter passed in differs. Keep this file identical across repos.
 */

export type PortalKey = "BUILDER" | "MERCHANT" | "TRADE" | "AUDITOR" | "BUSINESS";

/** One seat as the backend returns it (SeatView). */
export interface Seat {
  seatId: string;
  orgType: PortalKey;
  orgId: string;
  orgName: string | null;
  role: string;
  roleLabel: string | null;
  /** Portal the seat opens in: BUILDER | MERCHANT | TRADE | AUDITOR | BUSINESS. */
  portal: PortalKey;
  /** User-facing name: Build, Retail, Trade, Audit, Business. */
  portalLabel: string;
  /** Origin of that portal, no trailing slash. */
  portalUrl: string | null;
  isDefault: boolean;
  /** Organisation model: the legal entity the seat's surface belongs to (null when unlinked). */
  organisationId?: string | null;
  organisationName?: string | null;
}

/** `data` of the login / verify / redeem / refresh envelope (AuthTokenResponse). */
export interface SessionPayload {
  id?: string;
  jwt: string;
  refreshToken?: string;
  expiresInMs?: number;
  refreshExpiresInMs?: number;
  userInfo?: Record<string, unknown> & { id?: string; email?: string; role?: string };
  seat?: Seat;
  /** The org entity behind `seat` (shape depends on org type). */
  org?: Record<string, unknown> | null;
  seats?: Seat[];
}

export interface SessionEnvelope {
  success: boolean;
  message: string;
  data?: SessionPayload;
}

/** 403 body when the person is genuine but holds no seat in this portal. */
export interface NoSeatForPortal {
  success: false;
  code: "NO_SEAT_FOR_PORTAL";
  portal: PortalKey;
  message: string;
  availableSeats: Seat[];
}

export function isNoSeatForPortal(body: unknown): body is NoSeatForPortal {
  return !!body && typeof body === "object" && (body as { code?: string }).code === "NO_SEAT_FOR_PORTAL";
}

/**
 * What each portal must provide. The adapter is the ONLY per-portal code:
 * where the API lives, which portal this is, and how this SPA stores a session.
 */
export interface PortalSessionAdapter {
  /** The portal this SPA is. AUDITOR seats also open here when this is TRADE. */
  portal: PortalKey;
  apiBaseUrl: () => string;
  accessToken: () => string | null;
  /** Persist a freshly issued session exactly as the portal's login page does. */
  storeSession: (payload: SessionPayload) => void;
  clearSession: () => void;
}

/** Whether a seat opens in THIS portal (same origin → switch in place, not a new window). */
export function seatOpensHere(seat: Seat, here: PortalKey): boolean {
  const norm = (p: PortalKey) => (p === "AUDITOR" ? "TRADE" : p);
  return norm(seat.portal) === norm(here);
}

async function authed<T>(adapter: PortalSessionAdapter, path: string, init?: RequestInit): Promise<T> {
  const token = adapter.accessToken();
  const res = await fetch(`${adapter.apiBaseUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    throw new Error(`${path} failed with ${res.status}`);
  }
  return (await res.json()) as T;
}

export interface MySeats {
  userId: string;
  email: string;
  name: string;
  activeSeatId: string | null;
  seats: Seat[];
}

export function fetchMySeats(adapter: PortalSessionAdapter): Promise<MySeats> {
  return authed<MySeats>(adapter, "/api/me/seats");
}

export interface Handoff {
  code: string;
  url: string;
  seat: Seat;
}

export function requestHandoff(adapter: PortalSessionAdapter, seatId: string, returnTo?: string): Promise<Handoff> {
  return authed<Handoff>(adapter, "/api/session/handoff", {
    method: "POST",
    body: JSON.stringify({ seatId, returnTo }),
  });
}

/** Redeem a handoff code on this origin. Returns the session or null when the code is spent. */
export async function redeemHandoff(adapter: PortalSessionAdapter, code: string): Promise<SessionPayload | null> {
  const res = await fetch(`${adapter.apiBaseUrl()}/unsecure/session/redeem`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  if (!res.ok) return null;
  const body = (await res.json()) as SessionEnvelope;
  return body.success && body.data?.jwt ? body.data : null;
}

export async function signOutEverywhere(adapter: PortalSessionAdapter): Promise<void> {
  try {
    await authed(adapter, "/api/session/logout-all", { method: "POST" });
  } catch {
    // Best effort: the local sign-out still happens.
  }
  adapter.clearSession();
}

/**
 * Opens a seat. Same portal → redeem in place and reload (storage is per
 * origin, so the two seats cannot coexist in one window). Other portal → a
 * new window. The blank window is opened synchronously in the click handler
 * so popup blockers allow it; its location is set once the handoff resolves.
 */
export async function openSeat(adapter: PortalSessionAdapter, seat: Seat, returnTo?: string): Promise<void> {
  if (seatOpensHere(seat, adapter.portal)) {
    const handoff = await requestHandoff(adapter, seat.seatId, returnTo);
    const session = await redeemHandoff(adapter, handoff.code);
    if (!session) throw new Error("Could not switch seat");
    adapter.storeSession(session);
    window.location.assign(returnTo && returnTo.startsWith("/") ? returnTo : "/");
    return;
  }
  const popup = window.open("", "_blank", "noopener");
  try {
    const handoff = await requestHandoff(adapter, seat.seatId);
    if (popup) {
      popup.location.href = handoff.url;
    } else {
      window.open(handoff.url, "_blank", "noopener");
    }
  } catch (e) {
    popup?.close();
    throw e;
  }
}
