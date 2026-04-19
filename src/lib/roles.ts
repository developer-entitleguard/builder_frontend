// Single source of truth for builder roles. Mirrors RoleType.java in the backend.

export const BUILDER_ROLES = {
  ADMINISTRATOR: "ADMINISTRATOR",
  PROJECT_MANAGER: "PROJECT_MANAGER",
  CUSTOMER_SUPPORT: "CUSTOMER_SUPPORT",
  INTERNAL_VENDOR: "INTERNAL_VENDOR",
  EXTERNAL_VENDOR: "EXTERNAL_VENDOR",
} as const;

export type BuilderRole = (typeof BUILDER_ROLES)[keyof typeof BUILDER_ROLES];

export const BUILDER_ROLE_LABELS: Record<BuilderRole, string> = {
  ADMINISTRATOR: "Administrator",
  PROJECT_MANAGER: "Project Manager",
  CUSTOMER_SUPPORT: "Customer Support",
  INTERNAL_VENDOR: "Internal Vendor",
  EXTERNAL_VENDOR: "External Vendor",
};

const LEGACY_TO_CANONICAL: Record<string, BuilderRole> = {
  admin: BUILDER_ROLES.ADMINISTRATOR,
  administrator: BUILDER_ROLES.ADMINISTRATOR,
  user: BUILDER_ROLES.PROJECT_MANAGER,
  "normal user": BUILDER_ROLES.PROJECT_MANAGER,
  normaluser: BUILDER_ROLES.PROJECT_MANAGER,
  "project manager": BUILDER_ROLES.PROJECT_MANAGER,
  projectmanager: BUILDER_ROLES.PROJECT_MANAGER,
  "customer support": BUILDER_ROLES.CUSTOMER_SUPPORT,
  customersupport: BUILDER_ROLES.CUSTOMER_SUPPORT,
  "internal vendor": BUILDER_ROLES.INTERNAL_VENDOR,
  internalvendor: BUILDER_ROLES.INTERNAL_VENDOR,
  "external vendor": BUILDER_ROLES.EXTERNAL_VENDOR,
  externalvendor: BUILDER_ROLES.EXTERNAL_VENDOR,
};

export const normalizeBuilderRole = (raw: string | null | undefined): BuilderRole | null => {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if ((BUILDER_ROLES as Record<string, string>)[trimmed]) {
    return trimmed as BuilderRole;
  }
  const fromLegacy = LEGACY_TO_CANONICAL[trimmed.toLowerCase()];
  return fromLegacy ?? null;
};

export const readBuilderRoleFromStorage = (): BuilderRole | null => {
  try {
    const raw = localStorage.getItem("userData");
    if (!raw) return null;
    const data = JSON.parse(raw);
    const value =
      data?.role ??
      data?.userInfo?.role ??
      data?.user_info?.role ??
      null;
    return normalizeBuilderRole(value);
  } catch {
    return null;
  }
};

export const isAdministrator = (role: BuilderRole | null | undefined): boolean =>
  role === BUILDER_ROLES.ADMINISTRATOR;

export const isProjectManager = (role: BuilderRole | null | undefined): boolean =>
  role === BUILDER_ROLES.PROJECT_MANAGER;

export const isCustomerSupport = (role: BuilderRole | null | undefined): boolean =>
  role === BUILDER_ROLES.CUSTOMER_SUPPORT;

export const isInternalVendor = (role: BuilderRole | null | undefined): boolean =>
  role === BUILDER_ROLES.INTERNAL_VENDOR;

export const isExternalVendor = (role: BuilderRole | null | undefined): boolean =>
  role === BUILDER_ROLES.EXTERNAL_VENDOR;

export const isVendor = (role: BuilderRole | null | undefined): boolean =>
  isInternalVendor(role) || isExternalVendor(role);

// PRD: Customer Support has BOM update authority; Project Manager creates/manages BOM.
export const canManageBom = (role: BuilderRole | null | undefined): boolean =>
  isAdministrator(role) || isProjectManager(role) || isCustomerSupport(role);

export const canManageProjects = (role: BuilderRole | null | undefined): boolean =>
  isAdministrator(role) || isProjectManager(role);

export const canTriageQueries = (role: BuilderRole | null | undefined): boolean =>
  isAdministrator(role) || isCustomerSupport(role);

export const canAssignVendors = (role: BuilderRole | null | undefined): boolean =>
  isAdministrator(role) || isCustomerSupport(role);

export const hasAnyBuilderRole = (
  role: BuilderRole | null | undefined,
  allowed: readonly BuilderRole[],
): boolean => !!role && allowed.includes(role);
