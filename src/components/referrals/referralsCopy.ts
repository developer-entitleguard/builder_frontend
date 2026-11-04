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
import type {
  ReferralStaffStatus,
  ReferralStatus,
  RewardRecipient,
  RewardTrigger,
} from "@/store/api/referrals";

export const REFERRALS_MODULE = "REFERRALS";

/** Section 12: who sees the Referrals area at all (the queue). */
export const REFERRALS_VIEW_ROLES: readonly BuilderRole[] = [
  BUILDER_ROLES.ADMINISTRATOR,
  BUILDER_ROLES.CUSTOMER_SUPPORT,
];

/** The method line, shown under the measures (VR1). */
export const METHOD_LINE = "Calculated by Entitle Guard from records of completed work.";

export const NOT_ENOUGH_RECORDS = "Not enough records yet";

export const REWARD_OWNERSHIP_NOTE = "Your business owns and pays any reward. Entitle Guard only records it.";

export const TERMS_VERSION_NOTE =
  "Saving creates a new version. Referrals already shared keep the terms they were made under.";

export const REVIEW_REQUESTS_NOTE =
  "Review requests go out automatically after a paid invoice, a closed query, or 30 days after handover. Every customer is asked; nobody can choose who.";

/**
 * The caller's Verified Referrals rights. The backend enforces every one of
 * these; the UI only hides what would be refused. Module check is fail-closed
 * so an org without REFERRALS never sees the area flash in.
 */
export const useReferralsAccess = () => {
  const { builderRole } = useOrganization();
  const { hasModule, ready } = useEntitlements();
  const role = builderRole ?? readBuilderRoleFromStorage();
  const enabled = ready && hasModule(REFERRALS_MODULE);
  const isAdmin = enabled && isAdministrator(role);
  return {
    role,
    enabled,
    /** The queue: Administrator and Customer Support (REFERRAL_UPDATE). */
    canViewQueue: enabled && hasAnyBuilderRole(role, REFERRALS_VIEW_ROLES),
    /** Proof Page, terms and review link edits: Administrator only. */
    canManage: isAdmin,
  };
};

export const STATUS_LABEL: Record<ReferralStatus, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  CONTRACT_SIGNED: "Contract signed",
  REWARD_DUE: "Reward due",
  REWARD_PAID: "Reward paid",
  CLOSED: "Closed",
};

export const STATUS_VARIANT: Record<ReferralStatus, "default" | "secondary" | "outline"> = {
  NEW: "default",
  CONTACTED: "secondary",
  CONTRACT_SIGNED: "secondary",
  REWARD_DUE: "default",
  REWARD_PAID: "outline",
  CLOSED: "outline",
};

const STAFF_STATUSES: ReferralStaffStatus[] = [
  "CONTACTED",
  "CONTRACT_SIGNED",
  "REWARD_DUE",
  "REWARD_PAID",
  "CLOSED",
];

/** Statuses staff may set. REWARD_* are left out under no-reward terms (they answer 409). */
export const statusOptions = (rewardTerms: boolean): ReferralStaffStatus[] =>
  rewardTerms ? STAFF_STATUSES : STAFF_STATUSES.filter((s) => s !== "REWARD_DUE" && s !== "REWARD_PAID");

export const RECIPIENT_LABEL: Record<RewardRecipient, string> = {
  NONE: "No reward",
  OWNER: "The owner who referred",
  FRIEND: "The friend who was referred",
  BOTH: "Both the owner and the friend",
};

export const TRIGGER_LABEL: Record<RewardTrigger, string> = {
  CONTRACT_SIGNED: "When the friend signs a contract",
  HANDOVER: "When the friend's home is handed over",
};

export const fmtDate = (s: string | null | undefined): string => (s ? formatDate(s) : "");

export const fmtMoney = (n: number | null | undefined): string =>
  n == null ? "" : new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(n);

/** "1 Mar 2021 to 4 Nov 2026", or whichever end is known. */
export const fmtRange = (from: string | null, to: string | null): string => {
  const a = fmtDate(from);
  const b = fmtDate(to);
  if (a && b) return `${a} to ${b}`;
  return a || b;
};

const GOOGLE_HOSTS = ["google.com", "google.com.au", "g.page"];
const PRODUCT_REVIEW_HOSTS = ["productreview.com.au"];

const hostMatches = (host: string, allowed: string[]) =>
  allowed.some((h) => host === h || host.endsWith(`.${h}`));

/**
 * Mirrors the backend's check so the form can say what's wrong before saving.
 * Blank is allowed (clears the link). The backend stays the authority.
 */
export const reviewUrlError = (value: string, kind: "google" | "productReview"): string | null => {
  const v = value.trim();
  if (!v) return null;
  let url: URL;
  try {
    url = new URL(v);
  } catch {
    return "Enter a full link starting with https://";
  }
  if (url.protocol !== "https:") return "The link must start with https://";
  const host = url.hostname.toLowerCase();
  if (kind === "google" && !hostMatches(host, GOOGLE_HOSTS)) {
    return "Use your Google review link (google.com, google.com.au or g.page)";
  }
  if (kind === "productReview" && !hostMatches(host, PRODUCT_REVIEW_HOSTS)) {
    return "Use your ProductReview link (productreview.com.au)";
  }
  return null;
};
