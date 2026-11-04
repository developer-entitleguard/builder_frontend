import { useOrganization } from "@/hooks/useOrganization";
import { useEntitlements } from "@/hooks/useEntitlements";
import {
  BUILDER_ROLES,
  hasAnyBuilderRole,
  isAdministrator,
  readBuilderRoleFromStorage,
  type BuilderRole,
} from "@/lib/roles";
import { formatDate } from "@/lib/datetime";
import type { Readiness } from "@/store/api/completion";

/** Section 12: who sees the Completion Gate at all. */
export const COMPLETION_VIEW_ROLES: readonly BuilderRole[] = [
  BUILDER_ROLES.ADMINISTRATOR,
  BUILDER_ROLES.PROJECT_MANAGER,
  BUILDER_ROLES.CUSTOMER_SUPPORT,
];

/** Accept / send back, chase, chase wording and dates. */
export const COMPLETION_MANAGE_ROLES: readonly BuilderRole[] = [
  BUILDER_ROLES.ADMINISTRATOR,
  BUILDER_ROLES.PROJECT_MANAGER,
];

export const COMPLETION_MODULE = "COMPLETION_GATE";

export const ADVISORY_NOTE = "This is a document check, not legal advice.";

export const WAIVER_VISIBILITY_NOTE = "A waiver and its reason are shown to the owner and to Entitle Guard.";

/**
 * The caller's Completion Gate rights. The backend enforces every one of these;
 * the UI only hides what would be refused. Module check is fail-closed so an
 * org without COMPLETION_GATE never sees the tab flash in.
 */
export const useCompletionAccess = () => {
  const { builderRole } = useOrganization();
  const { hasModule, ready } = useEntitlements();
  const role = builderRole ?? readBuilderRoleFromStorage();
  const enabled = ready && hasModule(COMPLETION_MODULE);
  return {
    role,
    enabled,
    canView: enabled && hasAnyBuilderRole(role, COMPLETION_VIEW_ROLES),
    canManage: enabled && hasAnyBuilderRole(role, COMPLETION_MANAGE_ROLES),
    isAdmin: enabled && isAdministrator(role),
  };
};

/** Plain words. Readiness is about documents only, never whether a claim may be made. */
export const READINESS_LABEL: Record<Readiness, string> = {
  NOT_READY: "Documents outstanding",
  READY_TO_ISSUE: "Documents in place",
  ISSUED: "Final claim issued",
  PAID: "Final claim paid",
};

export const READINESS_CLASS: Record<Readiness, string> = {
  NOT_READY: "bg-amber-100 text-amber-800 hover:bg-amber-100",
  READY_TO_ISSUE: "bg-green-100 text-green-800 hover:bg-green-100",
  ISSUED: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  PAID: "bg-slate-100 text-slate-700 hover:bg-slate-100",
};

export const CHECK_LABEL: Record<string, string> = {
  type: "Document type",
  address: "Address",
  licence: "Licence",
  signature: "Signature",
  date: "Date",
  expiry: "Expiry",
};

/** The six checks, in the order they are shown. */
export const CHECK_ORDER = ["type", "address", "licence", "signature", "date", "expiry"] as const;

/** A PASS still waits for a person; never present it as accepted. */
export const latestCheckLabel = (r: string | null | undefined): string | null => {
  switch (r) {
    case "PASS":
      return "Checks passed, awaiting your review";
    case "FAIL":
      return "Checks found problems";
    case "NOT_CHECKED":
      return "Not checked";
    default:
      return null;
  }
};

export const fmtDay = (s: string | null | undefined): string => (s ? formatDate(s) : "—");

export const fmtMoney = (n: number | null | undefined): string =>
  n == null
    ? "—"
    : new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 2 }).format(n);

export const completionTabPath = (projectId: string) => `/projects/${projectId}?tab=completion`;

export const HANDOVER_STOPPED_PREFIX = "Handover stopped";

export const isHandoverStopped = (message: string | null | undefined): boolean =>
  !!message && message.trim().startsWith(HANDOVER_STOPPED_PREFIX);
