import { Navigate } from "react-router-dom";
import { useOrganization } from "@/hooks/useOrganization";
import {
  type BuilderRole,
  hasAnyBuilderRole,
  readBuilderRoleFromStorage,
} from "@/lib/roles";

interface RoleGateProps {
  /** Builder roles allowed to render the children. */
  roles: readonly BuilderRole[];
  /**
   * Where to send a user who doesn't match. Defaults to /dashboard so they
   * land somewhere they can use rather than seeing a hard 404.
   */
  fallback?: string;
  children: React.ReactNode;
}

/**
 * Route-level guard for the new 5-role builder hierarchy.
 *
 * Used inside <ProtectedRoute> blocks so the user is already authenticated;
 * this gate only enforces role membership. While the OrganizationProvider is
 * still hydrating it falls back to localStorage so we don't briefly redirect
 * the user away from a page they're allowed to see.
 */
export const RoleGate = ({ roles, fallback = "/dashboard", children }: RoleGateProps) => {
  const { builderRole, loading } = useOrganization();

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-sm text-muted-foreground">
        Loading...
      </div>
    );
  }

  const effectiveRole = builderRole ?? readBuilderRoleFromStorage();
  if (!hasAnyBuilderRole(effectiveRole, roles)) {
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
};

export default RoleGate;
