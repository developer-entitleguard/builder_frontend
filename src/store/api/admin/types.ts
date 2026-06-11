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
