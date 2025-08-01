import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Organization {
  id: string;
  name: string;
  address: string;
  contact_email: string;
  contact_phone: string;
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
      // For now, create a mock organization until migration is run
      // This will be replaced with actual data after migration
      setUserRole('admin');
      setOrganization({
        id: 'mock-org-id',
        name: 'Sample Builder Organization',
        address: 'Sydney, NSW',
        contact_email: 'admin@entitleguard.com',
        contact_phone: '02 1234 5678'
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