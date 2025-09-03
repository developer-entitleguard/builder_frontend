import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Organization {
  id: string;
  name: string;
  address: string;
  contact_email: string;
  contact_phone: string;
  abn?: string;
  description?: string;
}

interface UserRole {
  role: string;
  organization_id: string;
}

export const useOrganization = () => {
  const { user } = useAuth();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchUserOrganization();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchUserOrganization = async () => {
    if (!user) return;
    
    try {
      // First, ensure user has a profile
      await supabase.rpc('ensure_user_profile');
      
      // Fetch user role and organization
      const { data: userRoleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role, organization_id')
        .eq('user_id', user.id)
        .single();

      if (roleError) {
        console.error('Error fetching user role:', roleError);
        // User doesn't have a role yet - they might be a new organization contact
        setUserRole(null);
        setOrganization(null);
        return;
      }

      setUserRole(userRoleData.role);

      // Fetch organization details
      const { data: orgData, error: orgError } = await supabase
        .from('builder_organizations')
        .select('*')
        .eq('id', userRoleData.organization_id)
        .single();

      if (orgError) {
        console.error('Error fetching organization:', orgError);
        return;
      }

      setOrganization(orgData);
    } catch (error) {
      console.error('Error fetching user organization:', error);
    } finally {
      setLoading(false);
    }
  };

  return {
    organization,
    userRole,
    loading,
    isAdmin: userRole === 'admin',
    isUser: userRole === 'user'
  };
};