import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchMySeats,
  openSeat,
  seatOpensHere,
  signOutEverywhere,
  type MySeats,
  type PortalSessionAdapter,
  type Seat,
} from "./portalSession";

/**
 * Unified sign-in — data hook behind the header PortalSwitcher. Loads the
 * caller's seats once (and again on window focus), exposes the active seat,
 * and opens seats. `visible` is false with one seat: the switcher is only for
 * people who can go somewhere else.
 */
export function usePortalSwitcher(adapter: PortalSessionAdapter) {
  const [data, setData] = useState<MySeats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busySeatId, setBusySeatId] = useState<string | null>(null);
  const loadedFor = useRef<string | null>(null);

  const load = useCallback(async () => {
    const token = adapter.accessToken();
    if (!token) return;
    try {
      const seats = await fetchMySeats(adapter);
      setData(seats);
      setError(null);
      loadedFor.current = token;
    } catch {
      setError("Could not load your portals");
    }
  }, [adapter]);

  useEffect(() => {
    void load();
    const onFocus = () => {
      // Re-check on refocus: an admin may have granted a seat meanwhile.
      if (adapter.accessToken() && adapter.accessToken() !== loadedFor.current) void load();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [adapter, load]);

  const open = useCallback(
    async (seat: Seat, returnTo?: string) => {
      setBusySeatId(seat.seatId);
      setError(null);
      try {
        await openSeat(adapter, seat, returnTo);
      } catch {
        setError(`Could not open ${seat.portalLabel}. Please try again.`);
      } finally {
        setBusySeatId(null);
      }
    },
    [adapter],
  );

  const signOutAll = useCallback(() => signOutEverywhere(adapter), [adapter]);

  const seats = data?.seats ?? [];
  const activeSeat = seats.find((s) => s.seatId === data?.activeSeatId) ?? null;

  return {
    seats,
    activeSeat,
    name: data?.name ?? null,
    email: data?.email ?? null,
    /** Show the switcher only when there is somewhere else to go. */
    visible: seats.length > 1,
    opensHere: (seat: Seat) => seatOpensHere(seat, adapter.portal),
    open,
    busySeatId,
    error,
    reload: load,
    signOutAll,
  };
}
