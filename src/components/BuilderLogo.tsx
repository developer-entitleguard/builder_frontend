import { useGetBuilderBrandingQuery } from "@/store/api/builderBranding";
import { useOrganization } from "@/hooks/useOrganization";
import { viewPhotoUrl } from "@/lib/api/services/files";
import { cn } from "@/lib/utils";

/**
 * EngineeringPlan_Builder_Branding_And_Handover_Email §5.1. The builder org's
 * logo for the portal shell. Reads the branding query (RTK, invalidated on
 * upload/remove) so a freshly uploaded logo shows without re-login, and falls
 * back to the logo id carried in the login payload while that loads.
 * Renders nothing when the org has no logo.
 */
interface BuilderLogoProps {
  className?: string;
  /** Skip the network read (e.g. when the caller knows the user is not builder-authenticated). */
  skip?: boolean;
}

export function BuilderLogo({ className, skip }: BuilderLogoProps) {
  const { currentOrganization } = useOrganization();
  const { data } = useGetBuilderBrandingQuery(undefined, { skip });
  const fileId = data ? data.logoFileId : currentOrganization?.brandingLogoFileId ?? null;
  if (!fileId) {
    return null;
  }
  return (
    <img
      src={viewPhotoUrl(fileId)}
      alt={currentOrganization?.name ? `${currentOrganization.name} logo` : "Organisation logo"}
      className={cn("h-8 w-auto max-w-[140px] object-contain", className)}
    />
  );
}
