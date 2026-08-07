export type AdminOrgType = 'BUILDER' | 'MERCHANT' | 'TRADE' | 'AUDITOR';

export interface AdminOrg {
  id?: string;
  orgType?: AdminOrgType | string;
  name?: string;
  abn?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  address?: string | null;
  description?: string | null;
  licenceNumber?: string | null;
  services?: string[] | null;
  isActive?: boolean | null;
  /** When the organisation signed up / was created (ISO string). */
  createdAt?: string | null;
}

export interface AdminUser {
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  contact?: string | null;
  role?: string;
  password?: string;
  isActive?: boolean | null;
}

export interface PlatformAdmin {
  id?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  password?: string;
  isActive?: boolean | null;
}

export interface OrgBolton {
  moduleKey?: string;
  enabled?: boolean;
  source?: string;
}

export interface EntitlementState {
  orgType: string;
  orgId: string;
  capabilities: string[];
  modules: string[];
  boltons: OrgBolton[];
}

export interface AdminCatalog {
  orgTypes: string[];
  capabilities: string[];
  modules: string[];
  rolesByOrgType: Record<string, string[]>;
}

// ---- Platform Announcements -------------------------------------------------

export type AnnouncementKind = 'MODAL' | 'BANNER';
export type AnnouncementSeverity = 'INFO' | 'WARNING' | 'CRITICAL';
export type AnnouncementScope = 'EVERYONE' | 'PORTAL' | 'ORG' | 'INDIVIDUAL';
/** Distinct from AdminOrgType: COMMERCIAL + CONSUMER are separate identities. */
export type AnnouncementPortal =
  | 'BUILDER'
  | 'MERCHANT'
  | 'TRADE'
  | 'AUDITOR'
  | 'COMMERCIAL'
  | 'CONSUMER';
export type RecipientType = 'USER_INFO' | 'BUSINESS_USER' | 'CUSTOMER';

export interface AnnouncementTarget {
  scope: AnnouncementScope;
  portal?: AnnouncementPortal | null;
  orgId?: string | null;
  recipientType?: RecipientType | null;
  recipientId?: string | null;
  /** Display-only hint (org/user name); not persisted server-side. */
  label?: string | null;
}

export interface Announcement {
  id?: string;
  kind: AnnouncementKind;
  severity: AnnouncementSeverity;
  title?: string | null;
  message: string;
  linkUrl?: string | null;
  linkLabel?: string | null;
  requiresAck?: boolean | null;
  dismissible?: boolean | null;
  /** ISO strings (datetime-local in the form). */
  startAt?: string | null;
  endAt?: string | null;
  isActive?: boolean | null;
  targets: AnnouncementTarget[];
  createdByAdminId?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  ackCount?: number | null;
}

export interface RecipientSearchResult {
  recipientType: RecipientType;
  recipientId: string;
  name?: string | null;
  email?: string | null;
  portal: AnnouncementPortal;
}

export interface AdminLoginResponse {
  success: boolean;
  message: string;
  data: {
    jwt: string;
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  } | null;
}
