/**
 * Commercial Business constants shared by the project workspace (inline
 * create-or-select) and the business directory. Values mirror the backend
 * BusinessEntityType / BusinessContactRole enums.
 */

export const ENTITY_TYPES: { value: string; label: string }[] = [
  { value: "COMPANY", label: "Company (Pty Ltd)" },
  { value: "SOLE_TRADER", label: "Sole trader" },
  { value: "PARTNERSHIP", label: "Partnership" },
  { value: "TRUST", label: "Trust" },
  { value: "INCORPORATED_ASSOCIATION", label: "Incorporated association" },
  { value: "GOVERNMENT", label: "Government" },
];

export const entityTypeLabel = (value?: string | null): string =>
  ENTITY_TYPES.find((t) => t.value === value)?.label ?? value ?? "—";

/** Roles a builder manages in the directory (REGISTRATION_OVERRIDE is set per-tenancy, not here). */
export const CONTACT_ROLES: { value: string; label: string }[] = [
  { value: "PRIMARY", label: "Primary" },
  { value: "BILLING", label: "Billing" },
];
