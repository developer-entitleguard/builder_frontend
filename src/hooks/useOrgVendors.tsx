import { useMemo } from "react";
import { useOrganization } from "@/hooks/useOrganization";
import { useGetBuilderVendorsQuery } from "@/store/api/builderVendor";

export interface OrgVendor {
  id: string;
  name: string;
  contact_email: string;
  contact_phone: string;
}

/**
 * Loads the organisation's saved vendors from the builder API
 * (`GET /api/builder/vendor?builderId=…`) — the same source the Admin → Vendors
 * screen uses. Shared by the activity detail page and the activities list so the
 * assignment typeahead (see {@link ContactCombobox}) shows real vendors.
 *
 * Note: builder vendors live in the Java backend, NOT the legacy Supabase
 * `vendors` table, so this must go through RTK Query (JWT-authed), not Supabase.
 */
export const useOrgVendors = () => {
  const { organization } = useOrganization();
  const builderId = organization?.id;

  const { data, isLoading } = useGetBuilderVendorsQuery(
    { builderId: builderId as string },
    { skip: !builderId }
  );

  const vendors: OrgVendor[] = useMemo(
    () =>
      (data?.data ?? []).map((v) => ({
        id: v.id,
        name: v.name ?? "",
        contact_email: v.email ?? "",
        contact_phone: v.contact ?? "",
      })),
    [data]
  );

  return { vendors, loading: isLoading };
};
