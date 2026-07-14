import { Navigate } from "react-router-dom";
import { useOrganization } from "@/hooks/useOrganization";
import AccessBoundary from "@/components/AccessBoundary";
import {
  type BuilderRole,
  hasAnyBuilderRole,
  readBuilderRoleFromStorage,
  BUILDER_ROLE_LABELS,
} from "@/lib/roles";

interface RoleGateProps {
  /** Builder roles allowed to render the children. */
  roles: readonly BuilderRole[];
  /**
   * Where the "back" button sends a user who doesn't match. Defaults to
   * /dashboard so they land somewhere they can use.
   */
  fallback?: string;
  /**
   * When true, silently redirect instead of showing the access-boundary message.
   * Default is to explain the boundary rather than bounce (which reads like a bug).
   */
  redirect?: boolean;
  children: React.ReactNode;
}

/** Human list like "Administrator or Project Manager". */
const listRoles = (roles: readonly BuilderRole[]): string => {
  const labels = roles.map((r) => BUILDER_ROLE_LABELS[r]);
  if (labels.length <= 1) return labels[0] ?? "a different role";
  return `${labels.slice(0, -1).join(", ")} or ${labels[labels.length - 1]}`;
};

/**
 * Route-level guard for the new 5-role builder hierarchy.
 *
 * Used inside <ProtectedRoute> blocks so the user is already authenticated;
 * this gate only enforces role membership. While the OrganizationProvider is
 * still hydrating it falls back to localStorage so we don't briefly redirect
 * the user away from a page they're allowed to see.
 */
export const RoleGate = ({ roles, fallback = "/dashboard", redirect = false, children }: RoleGateProps) => {
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
    if (redirect) return <Navigate to={fallback} replace />;
    const currentLabel = effectiveRole ? BUILDER_ROLE_LABELS[effectiveRole] : null;
    return (
      <AccessBoundary
        title={`This area is for ${listRoles(roles)}`}
        description="You don't have access to this page. Your administrator controls what each role can reach."
        hint={
          currentLabel
            ? `You're signed in as ${currentLabel}. Ask your administrator to update your role if you need access.`
            : undefined
        }
        to={fallback}
      />
    );
  }

  return <>{children}</>;
};

export default RoleGate;
