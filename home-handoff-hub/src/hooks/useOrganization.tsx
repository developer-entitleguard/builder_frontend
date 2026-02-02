import { useState, useEffect, createContext, useContext, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

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

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export const OrganizationProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [organizations, setOrganizations] = useState<UserOrganizationRole[]>([]);
  const [currentOrganization, setCurrentOrganizationState] = useState<Organization | null>(null);
  const [currentRole, setCurrentRole] = useState<'admin' | 'user' | 'superadmin' | null>(null);
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

  useEffect(() => {
    if (user) {
      fetchUserOrganizations();
    } else {
      setOrganizations([]);
      setCurrentOrganizationState(null);
      setCurrentRole(null);
      setImpersonatedOrgState(null);
      setLoading(false);
    }
  }, [user]);

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
    loading,
    hasAccess: organizations.length > 0 || isSuperAdmin,
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
