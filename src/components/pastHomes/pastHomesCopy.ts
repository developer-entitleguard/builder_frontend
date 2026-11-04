import { format as formatDate } from "date-fns";
import type {
  CoverPositionValue,
  PastHomeActivationState,
  PastHomeFile,
  PastHomeRowStatus,
  Proposals,
} from "@/store/api/pastHomes";

/**
 * Plain-words copy for Past Homes. Wording lint (PRD 8.4): never say a home or
 * item "is covered" / "is not covered". Cover positions describe where a home
 * sits against the statutory periods, nothing more.
 */

export const LOW_CONFIDENCE = 0.8;

export const ROW_STATUS_LABEL: Record<PastHomeRowStatus, string> = {
  PROPOSED: "To confirm",
  CONFIRMED: "Confirmed",
  MERGED: "Merged with the existing record",
  SKIPPED: "Skipped",
  ERROR: "Needs fixing",
};

export const ACTIVATION_LABEL: Record<PastHomeActivationState, string> = {
  NOT_INVITED: "Not invited yet",
  NO_CONTACT: "No email address, cannot invite",
  INVITED: "Invitation sent",
  REMINDED: "Reminder sent",
  ACTIVATED: "Owner has activated the home",
  NOT_OWNER: "Recipient says they no longer own this home",
  OWNER_CHANGED: "Owner changed or sold, not invited",
  ALREADY_ON_RECORD: "Already on record, not invited again",
};

export const activationLabel = (state: PastHomeActivationState | null | undefined): string =>
  state ? ACTIVATION_LABEL[state] ?? state : "Not confirmed yet";

export const POSITION_LABEL: Record<CoverPositionValue, string> = {
  IN_STATUTORY: "Within statutory period",
  IN_OUTER_LIMIT_ONLY: "Outer limit only",
  PAST_BOTH: "Past both periods",
  UNCLEAR: "Unclear",
};

export const POSITION_CLASS: Record<CoverPositionValue, string> = {
  IN_STATUTORY: "bg-green-100 text-green-800 border-green-200",
  IN_OUTER_LIMIT_ONLY: "bg-amber-100 text-amber-800 border-amber-200",
  PAST_BOTH: "bg-muted text-muted-foreground border-border",
  UNCLEAR: "bg-slate-100 text-slate-700 border-slate-200",
};

export const humanise = (s: string | null | undefined): string => {
  if (!s) return "";
  if (s === "ALL") return "All classes";
  const lower = s.replace(/_/g, " ").toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
};

export const fmtDate = (s: string | null | undefined): string => {
  if (!s) return "";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return formatDate(d, "d MMM yyyy");
};

export const FILE_STATUS_LABEL: Record<string, string> = {
  STORED: "Reading the file…",
  PROPOSED: "Values found",
  NO_PROPOSAL: "No values found, type them in",
};

export const parseProposals = (json: string | null | undefined): Proposals => {
  if (!json) return { home: [], items: [] };
  try {
    const p = JSON.parse(json) as Partial<Proposals>;
    return {
      home: Array.isArray(p.home) ? p.home : [],
      items: Array.isArray(p.items) ? p.items.filter((i) => i && Array.isArray(i.fields)) : [],
    };
  } catch {
    return { home: [], items: [] };
  }
};

/** countsJson → {status counts, activation counts}. Skips "activation:null". */
export const parseCounts = (
  json: string | null | undefined,
): { statuses: [string, number][]; activations: [string, number][] } => {
  const out = { statuses: [] as [string, number][], activations: [] as [string, number][] };
  if (!json) return out;
  try {
    const m = JSON.parse(json) as Record<string, number>;
    for (const [k, v] of Object.entries(m)) {
      if (k.startsWith("activation:")) {
        const s = k.slice("activation:".length);
        if (s && s !== "null") out.activations.push([s, v]);
      } else if (k !== "null") {
        out.statuses.push([k, v]);
      }
    }
  } catch {
    /* ignore */
  }
  return out;
};

export const isAnyFileStored = (files: PastHomeFile[]): boolean =>
  files.some((f) => f.status === "STORED");
