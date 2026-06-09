// Backend timestamps are Java LocalDateTime serialized WITHOUT a timezone
// (e.g. "2026-06-09T00:05:51"). The server runs in UTC, so these are UTC
// wall-times. JavaScript's `new Date("…")` treats an offset-less datetime as
// LOCAL, which renders them ~hours off (e.g. Sydney). Normalise by tagging
// offset-less datetimes as UTC, then format in the viewer's local zone.

/** Parse a backend timestamp, treating an offset-less datetime as UTC. */
export function parseServerDate(value?: string | null): Date | null {
  if (!value) return null;
  const v = value.trim();
  // Has a timezone (Z or ±hh:mm / ±hhmm)? Trust it. Otherwise, if it's a
  // datetime (has a time component), tag it as UTC. Plain dates pass through.
  const hasTz = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(v);
  const iso = !hasTz && v.includes("T") ? `${v}Z` : v;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Date + time in the viewer's local zone (e.g. "9 Jun 2026, 10:05 am"). */
export function formatDateTime(value?: string | null): string {
  const d = parseServerDate(value);
  if (!d) return value ?? "—";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Date only, in the viewer's local zone. */
export function formatDate(value?: string | null): string {
  const d = parseServerDate(value);
  if (!d) return value ?? "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
