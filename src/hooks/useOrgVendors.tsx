import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";

export interface OrgVendor {
  id: string;
  name: string;
  contact_email: string;
  contact_phone: string;
}

/**
 * Loads the organisation's saved vendors from Supabase. Shared by the activity
 * detail page and the activities list so both surface the same set of contacts
 * for the assignment typeahead (see {@link ContactCombobox}).
 */
export const useOrgVendors = () => {
  const { organization } = useOrganization();
  const [vendors, setVendors] = useState<OrgVendor[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!organization) return;
    let active = true;
    setLoading(true);
    supabase
      .from("vendors")
      .select("id, name, contact_email, contact_phone")
      .eq("organization_id", organization.id)
      .order("name")
      .then(({ data, error }) => {
        if (!active) return;
        if (!error && data) setVendors(data as OrgVendor[]);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [organization]);

  return { vendors, loading };
};
