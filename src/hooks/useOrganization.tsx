import { useState, useEffect, createContext, useContext, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  BUILDER_ROLES,
  type BuilderRole,
  isAdministrator,
  normalizeBuilderRole,
} from "@/lib/roles";

interface Organization {
  id: string;
  name: string;
  address: string;
  contact_email: string;
  contact_phone: string;
  abn?: string | null;
  description?: string | null;
  contact_user_id?: string | null;
  created_at?: string;
  created_by?: string | null;
  status?: string | null;
  updated_at?: string;
}

interface UserOrganizationRole {
  organization: Organization;
  role: 'admin' | 'user' | 'superadmin';
}

interface OrganizationContextType {
  organizations: UserOrganizationRole[];
  currentOrganization: Organization | null;
  currentRole: 'admin' | 'user' | 'superadmin' | null;
  /**
   * Precise builder role from the new 5-role enum (Phase 1).
   * Null for Supabase superadmin or when no builder JWT is present.
   */
  builderRole: BuilderRole | null;
  loading: boolean;
  hasAccess: boolean;
  hasMultipleOrgs: boolean;
  setCurrentOrganization: (orgId: string) => void;
  isAdmin: boolean;
  isUser: boolean;
  isSuperAdmin: boolean;
  // Impersonation for superadmin
  impersonatedOrganization: Organization | null;
  setImpersonatedOrganization: (org: Organization | null) => void;
  effectiveOrganization: Organization | null;
  isImpersonating: boolean;
  // Legacy compatibility
  organization: Organization | null;
  userRole: string | null;
  // Refresh function
  refetch: () => Promise<void>;
}

const SELECTED_ORG_KEY = 'selected_organization_id';
const IMPERSONATED_ORG_KEY = 'impersonated_organization_id';

/**
 * Same-tab event dispatched whenever `localStorage.userData` is written or
 * removed (login, signout, session refresh). The browser only fires the
 * built-in `storage` event for OTHER tabs, so without this custom event the
 * provider would have no way to react to its own tab's auth changes —
 * leading to a stale `currentRole=null` after login and an "Access denied"
 * flash on /admin until the user hard-refreshes. Pages that write `userData`
 * MUST dispatch this event so the provider stays in sync.
 */
export const USER_DATA_EVENT = 'userdata-updated';

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export const OrganizationProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [organizations, setOrganizations] = useState<UserOrganizationRole[]>([]);
  const [currentOrganization, setCurrentOrganizationState] = useState<Organization | null>(null);
  const [currentRole, setCurrentRole] = useState<'admin' | 'user' | 'superadmin' | null>(null);
  const [builderRole, setBuilderRole] = useState<BuilderRole | null>(null);
  const [impersonatedOrganization, setImpersonatedOrgState] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  const isSuperAdmin = currentRole === 'superadmin';

  const setCurrentOrganization = useCallback((orgId: string) => {
    const orgRole = organizations.find(o => o.organization.id === orgId);
    if (orgRole) {
      setCurrentOrganizationState(orgRole.organization);
      setCurrentRole(orgRole.role);
      localStorage.setItem(SELECTED_ORG_KEY, orgId);
    }
  }, [organizations]);

  const setImpersonatedOrganization = useCallback((org: Organization | null) => {
    setImpersonatedOrgState(org);
    if (org) {
      localStorage.setItem(IMPERSONATED_ORG_KEY, org.id);
    } else {
      localStorage.removeItem(IMPERSONATED_ORG_KEY);
    }
  }, []);

  // Effective organization is impersonated org for superadmins, otherwise current org
  const effectiveOrganization = isSuperAdmin && impersonatedOrganization 
    ? impersonatedOrganization 
    : currentOrganization;

  // When superadmin is impersonating, they act as admin of that organization
  const isImpersonating = isSuperAdmin && impersonatedOrganization !== null;
  const effectiveIsAdmin = isImpersonating || currentRole === 'admin';

  // Builder login: when no Supabase user but userData (JWT) in localStorage, use userInfo.builderOrganization
  const initFromBuilderAuth = useCallback(() => {
    try {
      const raw = localStorage.getItem("userData");
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (!data?.jwt) return false;
      // Support camelCase and snake_case from API
      const org =
        data.builderOrganization ??
        data.builder_organization ??
        data.userInfo?.builderOrganization ??
        data.user_info?.builder_organization;
      const rawRole =
        data.role ?? data.userInfo?.role ?? data.user_info?.role ?? "user";
      const canonicalBuilderRole =
        normalizeBuilderRole(typeof rawRole === "string" ? rawRole : null) ??
        BUILDER_ROLES.PROJECT_MANAGER;
      // Legacy 3-tuple kept for existing call sites; ADMINISTRATOR maps to "admin".
      const role: "admin" | "user" | "superadmin" = isAdministrator(canonicalBuilderRole)
        ? "admin"
        : "user";
      let mapped: Organization;
      if (org?.id) {
        mapped = {
          id: org.id,
          name: org.name ?? "",
          address: org.address ?? "",
          contact_email: org.email ?? org.contact_email ?? "",
          contact_phone: org.contact ?? org.contact_phone ?? "",
          abn: org.abn ?? null,
          description: org.description ?? null,
        };
      } else {
        // JWT present but no org: use placeholder so dashboard still shows
        const userId = data.id ?? data.userInfo?.id ?? "builder-user";
        mapped = {
          id: userId,
          name: data.email ? `${data.email} (Builder)` : "My Organization",
          address: "",
          contact_email: data.email ?? "",
          contact_phone: data.contact ?? "",
          abn: null,
          description: null,
        };
      }
      setOrganizations([{ organization: mapped, role }]);
      setCurrentOrganizationState(mapped);
      setCurrentRole(role);
      setBuilderRole(canonicalBuilderRole);
      setImpersonatedOrgState(null);
      localStorage.setItem(SELECTED_ORG_KEY, mapped.id);
      return true;
    } catch {
      return false;
    }
  }, []);

  /**
   * Resets context state to its logged-out shape. Extracted so both the
   * Supabase-no-session path and the userdata-cleared event handler can
   * share the exact same reset — keeps the two branches from drifting.
   */
  const resetToLoggedOut = useCallback(() => {
    setOrganizations([]);
    setCurrentOrganizationState(null);
    setCurrentRole(null);
    setBuilderRole(null);
    setImpersonatedOrgState(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    // Prefer builder JWT-based auth when present, regardless of Supabase user state
    const fromBuilder = initFromBuilderAuth();
    if (fromBuilder) {
      setLoading(false);
      return;
    }

    if (user) {
      fetchUserOrganizations();
    } else {
      setLoading(true);
      resetToLoggedOut();
    }
  }, [user, initFromBuilderAuth, resetToLoggedOut]);

  /**
   * Re-sync from localStorage whenever auth state changes in this tab
   * (custom {@link USER_DATA_EVENT} dispatched by Auth/Header) or in another
   * tab (native `storage` event). Without this listener the provider's
   * one-shot mount effect leaves `currentRole=null` after a login that
   * happened later in the session, which surfaces as a false "Access
   * denied" alert on guarded pages until the user hard-refreshes.
   */
  useEffect(() => {
    const reload = () => {
      const fromBuilder = initFromBuilderAuth();
      if (!fromBuilder) {
        resetToLoggedOut();
      } else {
        setLoading(false);
      }
    };
    const storageHandler = (e: StorageEvent) => {
      if (e.key === 'userData') reload();
    };
    window.addEventListener(USER_DATA_EVENT, reload);
    window.addEventListener('storage', storageHandler);
    return () => {
      window.removeEventListener(USER_DATA_EVENT, reload);
      window.removeEventListener('storage', storageHandler);
    };
  }, [initFromBuilderAuth, resetToLoggedOut]);

  // Auto-select organization when organizations load
  useEffect(() => {
    if (loading) return;
    
    // Superadmins don't belong to organizations - they can only impersonate
    if (currentRole === 'superadmin') {
      // Superadmins don't have a current organization by default
      // They must use impersonation to act on behalf of an organization
      return;
    }
    
    // For non-superadmin with no org access
    if (organizations.length === 0) {
      setCurrentOrganizationState(null);
      return;
    }

    // Check for previously selected org
    const savedOrgId = localStorage.getItem(SELECTED_ORG_KEY);
    const savedOrg = savedOrgId ? organizations.find(o => o.organization.id === savedOrgId) : null;

    if (savedOrg) {
      setCurrentOrganizationState(savedOrg.organization);
      setCurrentRole(savedOrg.role);
    } else if (organizations.length === 1) {
      // Auto-select if only one org
      setCurrentOrganizationState(organizations[0].organization);
      setCurrentRole(organizations[0].role);
      localStorage.setItem(SELECTED_ORG_KEY, organizations[0].organization.id);
    }
  }, [organizations, loading]);

  const fetchUserOrganizations = async () => {
    if (!user) return;
    
    setLoading(true); // Ensure loading is true when starting fetch
    try {
      // Ensure user has a profile
      await supabase.rpc('ensure_user_profile');
      
      // Fetch all user roles with their organizations
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role, organization_id')
        .eq('user_id', user.id);

      if (rolesError) {
        console.error('Error fetching user roles:', rolesError);
        setOrganizations([]);
        setLoading(false);
        return;
      }

      if (!userRoles || userRoles.length === 0) {
        setOrganizations([]);
        setLoading(false);
        return;
      }

      // Check if user is superadmin (superadmin role has NULL organization_id)
      const superadminRole = userRoles.find(r => r.role === 'superadmin' && r.organization_id === null);
      if (superadminRole) {
        setCurrentRole('superadmin');
        // Superadmins don't belong to organizations - they use impersonation
        // No need to fetch organizations for superadmin
        setOrganizations([]);
        setLoading(false);
        return;
      }

      // Fetch organization details for each role (excluding superadmin roles without org)
      const orgIds = userRoles
        .filter(r => r.organization_id)
        .map(r => r.organization_id);

      if (orgIds.length > 0) {
        const { data: orgsData, error: orgsError } = await supabase
          .from('builder_organizations')
          .select('*')
          .in('id', orgIds);

        if (orgsError) {
          console.error('Error fetching organizations:', orgsError);
          setOrganizations([]);
          setLoading(false);
          return;
        }

        // Combine roles with organization data
        const userOrgRoles: UserOrganizationRole[] = userRoles
          .filter(r => r.organization_id)
          .map(role => {
            const org = orgsData?.find(o => o.id === role.organization_id);
            if (!org) return null;
            return {
              organization: org as Organization,
              role: role.role as 'admin' | 'user' | 'superadmin'
            };
          })
          .filter((item): item is UserOrganizationRole => item !== null);

        setOrganizations(userOrgRoles);
      } else {
        setOrganizations([]);
      }
    } catch (error) {
      console.error('Error fetching user organizations:', error);
      setOrganizations([]);
    } finally {
      setLoading(false);
    }
  };

  const value: OrganizationContextType = {
    organizations,
    currentOrganization,
    currentRole,
    builderRole,
    loading,
    hasAccess: !!user || organizations.length > 0 || isSuperAdmin,
    hasMultipleOrgs: organizations.length > 1,
    setCurrentOrganization,
    isAdmin: effectiveIsAdmin,
    isUser: currentRole === 'user',
    isSuperAdmin,
    impersonatedOrganization,
    setImpersonatedOrganization,
    effectiveOrganization,
    isImpersonating,
    // Legacy compatibility
    organization: effectiveOrganization,
    userRole: currentRole,
    refetch: fetchUserOrganizations
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
};

export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
};
