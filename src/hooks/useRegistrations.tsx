import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface RegistrationData {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  property_address: string;
  property_city: string;
  property_state: string;
  property_zip: string;
  project_name?: string;
  settlement_date?: string;
  notes?: string;
  selected_items?: any;
}

export const useRegistrations = () => {
  const { organization } = useOrganization();
  const { user } = useAuth();
  const { toast } = useToast();
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (organization) {
      fetchRegistrations();
    }
  }, [organization]);

  const fetchRegistrations = async () => {
    try {
      const { data, error } = await supabase
        .from('homeowner_registrations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRegistrations(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching registrations",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createRegistration = async (data: RegistrationData) => {
    if (!user) throw new Error('Not authenticated');
    const registrationData = {
      ...data,
      status: 'draft',
      builder_id: user.id
    };

    const { data: result, error } = await supabase
      .from('homeowner_registrations')
      .insert(registrationData)
      .select()
      .single();

    if (error) throw error;
    
    await fetchRegistrations();
    return result;
  };

  const updateRegistration = async (id: string, data: Partial<RegistrationData>) => {
    const { error } = await supabase
      .from('homeowner_registrations')
      .update(data)
      .eq('id', id);

    if (error) throw error;
    await fetchRegistrations();
  };

  return {
    registrations,
    loading,
    createRegistration,
    updateRegistration,
    refreshRegistrations: fetchRegistrations
  };
};