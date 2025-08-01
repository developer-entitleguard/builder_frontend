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
    try {
      // For demo purposes, use the mock organization data
      // In a real app, this would fetch based on actual authenticated user
      setUserRole('admin');
      setOrganization({
        id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        name: 'Premier Homes Australia',
        address: '123 Builder Street, Sydney NSW 2000',
        contact_email: 'admin@premierhomes.com.au',
        contact_phone: '02 9876 5432',
        abn: '12345678901',
        description: 'Leading residential construction company specializing in quality homes across Sydney and surrounding areas.'
      });
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