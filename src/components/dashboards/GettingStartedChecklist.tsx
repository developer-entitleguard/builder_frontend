import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Circle, X, Rocket } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useOrganization } from "@/hooks/useOrganization";
import { useProjectsQuery } from "@/store/api/projects";
import {
  useGetBuilderVendorsQuery,
  useGetBuilderSuppliersQuery,
} from "@/store/api";

/** Extracts a record count from the various paged / wrapped response shapes. */
const count = (resp: unknown): number => {
  if (!resp || typeof resp !== "object") return 0;
  const r = resp as Record<string, unknown>;
  if (Array.isArray(r.data)) return r.data.length;
  if (typeof r.totalElements === "number") return r.totalElements;
  if (typeof r.total === "number") return r.total;
  if (Array.isArray(r.content)) return r.content.length;
  const data = r.data as Record<string, unknown> | undefined;
  if (data && Array.isArray(data.content)) return data.content.length;
  if (data && typeof data.totalElements === "number") return data.totalElements;
  return 0;
};

const dismissKey = (orgId: string | undefined) => `eg_getting_started_dismissed_${orgId ?? "unknown"}`;

const GettingStartedChecklist = () => {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id;

  const [dismissed, setDismissed] = useState(() =>
    typeof window !== "undefined" && localStorage.getItem(dismissKey(orgId)) === "true",
  );

  const { data: vendors } = useGetBuilderVendorsQuery(
    { builderId: orgId || "" },
    { skip: !orgId },
  );
  const { data: suppliers } = useGetBuilderSuppliersQuery({ page: 0, size: 1 });
  const { data: projects } = useProjectsQuery();

  const steps = useMemo(
    () => [
      {
        key: "trades",
        label: "Add your trades",
        help: "The vendors who carry out work on your builds.",
        to: "/admin",
        done: count(vendors) > 0,
      },
      {
        key: "suppliers",
        label: "Add your suppliers",
        help: "The businesses that provide your materials and goods.",
        to: "/admin",
        done: count(suppliers) > 0,
      },
      {
        key: "project",
        label: "Create your first project",
        help: "Set up a property with its activities, then register homeowners and hand over.",
        to: "/projects/new",
        done: count(projects) > 0,
      },
    ],
    [vendors, suppliers, projects],
  );

  const completed = steps.filter((s) => s.done).length;
  const allDone = completed === steps.length;

  const dismiss = () => {
    if (orgId) localStorage.setItem(dismissKey(orgId), "true");
    setDismissed(true);
  };

  if (dismissed || allDone) return null;

  return (
    <Card className="border-primary/30 bg-primary/[0.03]">
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Rocket className="h-5 w-5 text-primary" />
            Getting started
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {completed} of {steps.length} done — finish setup to run your first handover.
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground"
          aria-label="Dismiss getting started"
          onClick={dismiss}
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {steps.map((s) => (
          <Link
            key={s.key}
            to={s.to}
            className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 transition-colors hover:bg-accent"
          >
            {s.done ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
            ) : (
              <Circle className="h-5 w-5 shrink-0 text-muted-foreground" />
            )}
            <div className="min-w-0">
              <p className={`font-medium ${s.done ? "text-muted-foreground line-through" : ""}`}>
                {s.label}
              </p>
              <p className="text-sm text-muted-foreground truncate">{s.help}</p>
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
};

export default GettingStartedChecklist;
