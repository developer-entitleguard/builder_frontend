import { Navigate } from "react-router-dom";
import { useEntitlements } from "@/hooks/useEntitlements";

interface ModuleGateProps {
  /** Org-level module / bolt-on required to render the children (e.g. "SALES"). */
  module: string;
  /** Where to send a builder whose org lacks the module. Defaults to /dashboard. */
  fallback?: string;
  children: React.ReactNode;
}

/**
 * Route-level guard for org-level modules / bolt-ons. Unlike the nav helpers
 * (which fail open during load to avoid flash-hiding the shell), this waits for
 * entitlements to load and then redirects when the org does not hold the module
 * — so a builder with, say, SALES turned off cannot reach the page by deep link.
 *
 * On a genuine entitlements error it fails open (renders) rather than locking a
 * paying builder out of a page they should have; `hasModule` already returns
 * true in that state.
 */
export const ModuleGate = ({ module, fallback = "/dashboard", children }: ModuleGateProps) => {
  const { isLoading, hasModule } = useEntitlements();

  if (isLoading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-sm text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (!hasModule(module)) {
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
};

export default ModuleGate;
