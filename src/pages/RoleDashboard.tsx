import { lazy, Suspense } from "react";
import { useOrganization } from "@/hooks/useOrganization";
import { readBuilderRoleFromStorage, BUILDER_ROLES } from "@/lib/roles";
import CustomerSupportDashboard from "@/components/dashboards/CustomerSupportDashboard";
import InternalVendorDashboard from "@/components/dashboards/InternalVendorDashboard";
import ExternalVendorDashboard from "@/components/dashboards/ExternalVendorDashboard";
import WelcomeDialog from "@/components/onboarding/WelcomeDialog";

// The original project-manager focused dashboard (registrations, BOM, etc.)
// is preserved as-is and lazy-loaded so the lighter-role dashboards stay snappy.
const ProjectManagerDashboard = lazy(() => import("@/pages/Dashboard"));

const Loading = () => (
  <div className="min-h-[40vh] flex items-center justify-center text-sm text-muted-foreground">
    Loading dashboard…
  </div>
);

const RoleDashboard = () => {
  const { builderRole, loading } = useOrganization();
  if (loading) return <Loading />;

  const role = builderRole ?? readBuilderRoleFromStorage();

  const dashboard = (() => {
    switch (role) {
      case BUILDER_ROLES.CUSTOMER_SUPPORT:
        return <CustomerSupportDashboard />;
      case BUILDER_ROLES.INTERNAL_VENDOR:
        return <InternalVendorDashboard />;
      case BUILDER_ROLES.EXTERNAL_VENDOR:
        return <ExternalVendorDashboard />;
      case BUILDER_ROLES.ADMINISTRATOR:
      case BUILDER_ROLES.PROJECT_MANAGER:
      default:
        return (
          <Suspense fallback={<Loading />}>
            <ProjectManagerDashboard />
          </Suspense>
        );
    }
  })();

  return (
    <>
      {/* First-run orientation; self-guards to staff roles and shows once per org. */}
      <WelcomeDialog />
      {dashboard}
    </>
  );
};

export default RoleDashboard;
