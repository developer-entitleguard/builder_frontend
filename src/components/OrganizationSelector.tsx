import { useOrganization } from "@/hooks/useOrganization";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2 } from "lucide-react";
import { viewPhotoUrl } from "@/lib/api/services/files";

const OrganizationSelector = () => {
  const { 
    organizations, 
    currentOrganization, 
    setCurrentOrganization,
    hasMultipleOrgs 
  } = useOrganization();

  if (!hasMultipleOrgs || !currentOrganization) {
    return null;
  }

  return (
    <Select 
      value={currentOrganization.id} 
      onValueChange={setCurrentOrganization}
    >
      <SelectTrigger className="w-[200px]">
        <Building2 className="h-4 w-4 mr-2" />
        <SelectValue placeholder="Select organization" />
      </SelectTrigger>
      <SelectContent>
        {organizations.map((orgRole) => (
          <SelectItem key={orgRole.organization.id} value={orgRole.organization.id}>
            <div className="flex items-center gap-2">
              {orgRole.organization.brandingLogoFileId && (
                <img
                  src={viewPhotoUrl(orgRole.organization.brandingLogoFileId)}
                  alt=""
                  className="h-5 w-auto max-w-[60px] object-contain"
                />
              )}
              <span>{orgRole.organization.name}</span>
              <span className="text-xs text-muted-foreground capitalize">
                ({orgRole.role})
              </span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default OrganizationSelector;
