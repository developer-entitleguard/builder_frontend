import { Link } from "react-router-dom";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AccessBoundaryProps {
  /** Short heading — what boundary was hit. */
  title: string;
  /** One or two lines explaining why, and what to do about it. */
  description: string;
  /** Optional secondary line (e.g. who to ask) shown in a subtle chip. */
  hint?: string;
  /** Where the primary button goes. Defaults to /dashboard. */
  to?: string;
  /** Label for the primary button. */
  actionLabel?: string;
}

/**
 * Shown when a user reaches a page their role or plan doesn't include. Replaces
 * a silent redirect (which reads like a bug) with a clear explanation and a way
 * back — while still keeping them out of the gated page.
 */
const AccessBoundary = ({
  title,
  description,
  hint,
  to = "/dashboard",
  actionLabel = "Back to dashboard",
}: AccessBoundaryProps) => (
  <div className="min-h-[60vh] flex items-center justify-center px-4">
    <div className="w-full max-w-md rounded-xl border bg-card p-8 text-center shadow-sm">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400">
        <Lock className="h-5 w-5" />
      </div>
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>
      {hint && (
        <p className="mx-auto mt-4 inline-block rounded-lg border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      <div className="mt-6">
        <Button asChild>
          <Link to={to}>{actionLabel}</Link>
        </Button>
      </div>
    </div>
  </div>
);

export default AccessBoundary;
