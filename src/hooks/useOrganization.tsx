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
      // Try to fetch real user role and organization
      const { data: userRoleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role, organization_id')
        .eq('user_id', user.id)
        .single();

      if (roleError) {
        console.log('No user role found, creating default admin setup for:', user.email);
        
        // If no role exists, set up as admin with the sample organization
        setUserRole('admin');
        setOrganization({
          id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          name: 'Premier Homes Australia',
          address: '123 Builder Street, Sydney NSW 2000',
          contact_email: user.email || 'admin@premierhomes.com.au',
          contact_phone: '02 9876 5432',
          abn: '12345678901',
          description: 'Leading residential construction company specializing in quality homes across Sydney and surrounding areas.'
        });
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