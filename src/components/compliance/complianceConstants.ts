// Shared option lists + display helpers for compliance documents.
// `mandatory` = durable regulatory requirement; `status` = progress.

export const MANDATORY_OPTIONS = [
  "REQUIRED",
  "CONDITIONAL",
  "RECOMMENDED",
  "OPTIONAL",
] as const;

export const STATUS_OPTIONS = [
  "REQUIRED",
  "OPTIONAL",
  "SUBMITTED",
  "RECEIVED",
  "NOT_APPLICABLE",
] as const;

export const mandatoryLabel = (value: string | null | undefined): string => {
  switch ((value ?? "").toUpperCase()) {
    case "REQUIRED":
      return "Required";
    case "CONDITIONAL":
      return "Conditional";
    case "RECOMMENDED":
      return "Recommended";
    case "OPTIONAL":
      return "Optional";
    default:
      return value || "—";
  }
};

export const statusLabel = (value: string | null | undefined): string => {
  switch ((value ?? "").toUpperCase()) {
    case "RECEIVED":
      return "Received";
    case "SUBMITTED":
      return "Awaiting review";
    case "NOT_APPLICABLE":
      return "Not applicable";
    case "REQUIRED":
      return "Outstanding";
    case "OPTIONAL":
      return "Optional";
    default:
      return value || "—";
  }
};

export const statusBadgeClass = (value: string | null | undefined): string => {
  switch ((value ?? "").toUpperCase()) {
    case "RECEIVED":
      return "bg-green-100 text-green-700";
    case "SUBMITTED":
      return "bg-blue-100 text-blue-700";
    case "NOT_APPLICABLE":
      return "bg-gray-100 text-gray-600";
    case "REQUIRED":
      return "bg-amber-100 text-amber-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
};

export const mandatoryBadgeClass = (value: string | null | undefined): string => {
  switch ((value ?? "").toUpperCase()) {
    case "REQUIRED":
      return "bg-red-100 text-red-700";
    case "CONDITIONAL":
      return "bg-orange-100 text-orange-700";
    case "RECOMMENDED":
      return "bg-blue-100 text-blue-700";
    default:
      return "bg-gray-100 text-gray-600";
  }
};
