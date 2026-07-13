import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  /** Optional leading icon (a lucide icon element). */
  icon?: React.ReactNode;
  /** Short heading — what this screen is for. */
  title: string;
  /** One line explaining what to do next. */
  description?: string;
  /** Optional call-to-action. Provide either `to` (route) or `onClick`. */
  actionLabel?: string;
  to?: string;
  onClick?: () => void;
}

/**
 * Shared empty-state block so blank screens explain what they're for and link to
 * the next action, instead of showing an empty table. Used across Projects,
 * Items, Registrations and Queries.
 */
const EmptyState = ({ icon, title, description, actionLabel, to, onClick }: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center text-center gap-3 py-14 px-4">
    {icon && <div className="text-muted-foreground/70">{icon}</div>}
    <h3 className="text-lg font-semibold text-foreground">{title}</h3>
    {description && (
      <p className="text-sm text-muted-foreground max-w-md">{description}</p>
    )}
    {actionLabel && (to || onClick) && (
      to ? (
        <Button asChild className="mt-2">
          <Link to={to}>{actionLabel}</Link>
        </Button>
      ) : (
        <Button className="mt-2" onClick={onClick}>{actionLabel}</Button>
      )
    )}
  </div>
);

export default EmptyState;
