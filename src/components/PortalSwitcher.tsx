import { useEffect, useRef, useState } from "react";
import { LayoutGrid, ExternalLink, ArrowLeftRight, LogOut, Check } from "lucide-react";
import type { PortalSessionAdapter, Seat } from "@/lib/auth/portalSession";
import { usePortalSwitcher } from "@/lib/auth/usePortalSwitcher";

/**
 * Unified sign-in — the header "portals" button (Google-Workspace style grid).
 * Renders nothing for a person with a single seat. One tile per seat, grouped
 * by portal; the current seat is marked; other portals open in a new window,
 * seats in this portal switch in place.
 *
 * Styling uses Tailwind utility classes on the portal's own design tokens
 * (bg-popover, border, text-muted-foreground …) so it looks native everywhere.
 */
const PORTAL_ORDER = ["BUILDER", "MERCHANT", "TRADE", "AUDITOR", "BUSINESS"] as const;

export interface PortalSwitcherProps {
  adapter: PortalSessionAdapter;
  /** Called after "Sign out of all portals" completes; navigate to the login page. */
  onSignedOutEverywhere?: () => void;
  className?: string;
}

export function PortalSwitcher({ adapter, onSignedOutEverywhere, className }: PortalSwitcherProps) {
  const sw = usePortalSwitcher(adapter);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!sw.visible) return null;

  // Group tiles by organisation (the legal entity), portals in a fixed order
  // inside each group. Seats not yet linked to an organisation fall back to
  // their own org name so nothing is hidden.
  const byPortal = (a: Seat, b: Seat) => PORTAL_ORDER.indexOf(a.portal) - PORTAL_ORDER.indexOf(b.portal);
  const groupKey = (s: Seat) => s.organisationId ?? `${s.orgType}:${s.orgId}`;
  const groupName = (s: Seat) => s.organisationName ?? s.orgName ?? s.portalLabel;
  const groups: { key: string; name: string; seats: Seat[] }[] = [];
  for (const seat of [...sw.seats].sort(byPortal)) {
    const key = groupKey(seat);
    const g = groups.find((x) => x.key === key);
    if (g) g.seats.push(seat);
    else groups.push({ key, name: groupName(seat), seats: [seat] });
  }
  groups.sort((a, b) => {
    const aActive = a.seats.some((s) => s.seatId === sw.activeSeat?.seatId) ? 0 : 1;
    const bActive = b.seats.some((s) => s.seatId === sw.activeSeat?.seatId) ? 0 : 1;
    return aActive - bActive || a.name.localeCompare(b.name);
  });

  const tileFor = (seat: Seat) => {
    const isActive = sw.activeSeat?.seatId === seat.seatId;
    const here = sw.opensHere(seat);
    const busy = sw.busySeatId === seat.seatId;
    return (
      <button
        key={seat.seatId}
        type="button"
        disabled={isActive || busy}
        onClick={() => void sw.open(seat)}
        className={
          "flex w-full items-start gap-3 rounded-md border px-3 py-2 text-left text-sm transition-colors " +
          (isActive
            ? "border-primary/40 bg-primary/5 cursor-default"
            : "border-border hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring")
        }
        aria-current={isActive ? "true" : undefined}
      >
        <span
          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded bg-muted font-semibold text-xs uppercase"
          aria-hidden
        >
          {seat.portalLabel.slice(0, 2)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{seat.portalLabel}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {seat.roleLabel ?? seat.role}
            {isActive ? " · this window" : here ? " · switch" : " · new window"}
          </span>
        </span>
        <span className="mt-1 shrink-0 text-muted-foreground" aria-hidden>
          {isActive ? (
            <Check className="h-4 w-4" />
          ) : here ? (
            <ArrowLeftRight className="h-4 w-4" />
          ) : (
            <ExternalLink className="h-4 w-4" />
          )}
        </span>
        <span className="sr-only">
          {isActive ? "Current" : here ? "Switch to this seat" : "Open in a new window"}
          {busy ? ", opening" : ""}
        </span>
      </button>
    );
  };

  return (
    <div ref={rootRef} className={"relative " + (className ?? "")}>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Your portals"
        title="Your portals"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <LayoutGrid className="h-5 w-5" />
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Your portals"
          className="absolute right-0 z-50 mt-2 w-80 rounded-lg border border-border bg-popover p-3 text-popover-foreground shadow-lg"
        >
          <div className="mb-2 px-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Your portals</p>
            {sw.name && <p className="truncate text-sm">{sw.name}</p>}
          </div>
          <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto">
            {groups.map((g) => (
              <div key={g.key} className="flex flex-col gap-1.5">
                <p className="truncate px-1 text-xs text-muted-foreground">{g.name}</p>
                {g.seats.map(tileFor)}
              </div>
            ))}
          </div>
          {sw.error && <p className="mt-2 px-1 text-xs text-destructive">{sw.error}</p>}
          <div className="mt-3 border-t border-border pt-2">
            <button
              type="button"
              onClick={async () => {
                await sw.signOutAll();
                setOpen(false);
                onSignedOutEverywhere?.();
              }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              Sign out of all portals
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default PortalSwitcher;
