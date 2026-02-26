import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import NoOrganizationAccess from "@/components/NoOrganizationAccess";
import OrganizationSelector from "@/components/OrganizationSelector";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2 } from "lucide-react";

interface OrganizationGateProps {
  children: React.ReactNode;
}

const OrganizationGate = ({ children }: OrganizationGateProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { 
    loading, 
    hasAccess, 
    hasMultipleOrgs, 
    currentOrganization,
    isSuperAdmin,
    effectiveOrganization
  } = useOrganization();

  // Redirect superadmins to /superadmin if they're not impersonating and not already there
  useEffect(() => {
    if (!loading && isSuperAdmin && !effectiveOrganization && !location.pathname.startsWith('/superadmin')) {
      navigate('/superadmin');
    }
  }, [loading, isSuperAdmin, effectiveOrganization, location.pathname, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading organization...</div>
      </div>
    );
  }

  // Superadmins can always access /superadmin, even without impersonation
  if (isSuperAdmin && location.pathname.startsWith('/superadmin')) {
    return <>{children}</>;
  }

  // Superadmin without impersonation - redirect handled by useEffect
  if (isSuperAdmin && !effectiveOrganization) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Building2 className="h-8 w-8 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Redirecting to Super Admin...</p>
        </div>
      </div>
    );
  }

  // No access to any organization (and not superadmin, and not a plain authenticated user)
  if (!hasAccess && !user) {
    return <NoOrganizationAccess />;
  }

  // Has multiple orgs but none selected yet
  if (hasMultipleOrgs && !currentOrganization) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-4 bg-muted rounded-full w-fit">
              <Building2 className="h-8 w-8 text-muted-foreground" />
            </div>
            <CardTitle>Select Organization</CardTitle>
            <CardDescription className="mt-2">
              You have access to multiple organizations. Please select one to continue.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <OrganizationSelector />
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};

export default OrganizationGate;
