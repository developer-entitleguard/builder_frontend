/**
 * Shared primitives for the Google-Calendar-style week time-grid used by the
 * builder's JobAssignVendorDialog and the vendor's own MySchedule calendar.
 * Pure helpers only — no React, no data fetching.
 */

export const DAYS_IN_VIEW = 7;
export const HOUR_PX = 48; // pixel height of one hour row
export const GUTTER_PX = 56; // width of the left time gutter
export const DRAG_SNAP_MIN = 15; // drag snaps to the nearest 15 minutes

export type EventKind = "booking" | "block" | "staged" | "draft";

/** "HH:mm[:ss]" → "HH:mm" (zero-padded), or "" for null/blank. */
export const toHHmm = (raw: string | null | undefined): string => {
  if (!raw) return "";
  const [h, m] = raw.split(":");
  return `${h?.padStart(2, "0") ?? ""}:${m?.padStart(2, "0") ?? ""}`;
};

/** "HH:mm[:ss]" → minutes since midnight. */
export const hmToMin = (raw: string | null | undefined): number => {
  if (!raw) return 0;
  const [h, m] = raw.split(":");
  return Number(h) * 60 + Number(m);
};

/** minutes since midnight → "HH:mm" (zero-padded, clamped to a day). */
export const minToHHmm = (min: number): string => {
  const clamped = Math.max(0, Math.min(24 * 60, min));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

export const hourLabel = (h: number): string => {
  const ampm = h < 12 || h === 24 ? "AM" : "PM";
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr} ${ampm}`;
};

/** Half-open overlap test on zero-padded HH:mm strings. */
export const rangesOverlap = (
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
) => aStart < bEnd && aEnd > bStart;

/** Default a 1-hour booking from a window start, clamped to the window end. */
export const defaultEnd = (start: string, windowEnd: string): string => {
  const [sh, sm] = start.split(":");
  const proposed = `${String(Number(sh) + 1).padStart(2, "0")}:${sm}`;
  return windowEnd && proposed > windowEnd ? windowEnd : proposed;
};

/** A location label from a booking's denormalised query fields. */
export const locationLabel = (b: {
  queryUnitNumber: string | null;
  queryAddress: string | null;
}): string => {
  const unit = b.queryUnitNumber ? `Unit ${b.queryUnitNumber}` : "";
  return [unit, b.queryAddress].filter(Boolean).join(", ");
};

/**
 * Pack a day's events into side-by-side lanes so overlapping (double-booked)
 * blocks render next to each other, like Google Calendar. Events are grouped
 * into clusters of chained overlaps; within a cluster each event gets the first
 * lane free at its start, and every event in the cluster shares the cluster's
 * lane count for its width. Generic over the event shape — only start/end (in
 * minutes) are read.
 */
export const layoutDay = <T extends { start: number; end: number }>(
  events: T[],
): Array<T & { lane: number; laneCount: number }> => {
  const sorted = [...events].sort((a, b) => a.start - b.start || a.end - b.end);
  const out: Array<T & { lane: number; laneCount: number }> = [];
  let cluster: Array<T & { lane: number }> = [];
  let clusterEnd = -1;

  const flush = () => {
    const laneEnds: number[] = [];
    cluster.forEach((ev) => {
      let lane = 0;
      while (lane < laneEnds.length && laneEnds[lane] > ev.start) lane += 1;
      ev.lane = lane;
      laneEnds[lane] = ev.end;
    });
    const laneCount = laneEnds.length || 1;
    cluster.forEach((ev) => out.push({ ...ev, laneCount }));
    cluster = [];
  };

  sorted.forEach((ev) => {
    if (cluster.length === 0 || ev.start < clusterEnd) {
      cluster.push({ ...ev, lane: 0 });
      clusterEnd = Math.max(clusterEnd, ev.end);
    } else {
      flush();
      cluster.push({ ...ev, lane: 0 });
      clusterEnd = ev.end;
    }
  });
  flush();
  return out;
};
