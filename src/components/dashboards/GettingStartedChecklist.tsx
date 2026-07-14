import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Circle, X, Rocket } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useOrganization } from "@/hooks/useOrganization";
import { useEntitlements } from "@/hooks/useEntitlements";
import { useProjectsQuery } from "@/store/api/projects";
import {
  useGetBuilderVendorsQuery,
  useGetBuilderSuppliersQuery,
  useGetDashboardCountQuery,
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

/** Mirrors Dashboard's builderId resolution (JWT payload first, org context fallback). */
const resolveBuilderId = (fallback: string | undefined): string | null => {
  try {
    const raw = localStorage.getItem("userData");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.userInfo?.builderOrganization?.id) return parsed.userInfo.builderOrganization.id;
      if (parsed.builderOrganization?.id) return parsed.builderOrganization.id;
    }
  } catch {
    /* ignore */
  }
  return fallback ?? null;
};

const GettingStartedChecklist = () => {
  const { currentOrganization } = useOrganization();
  const { hasModule } = useEntitlements();
  const orgId = currentOrganization?.id;
  const builderId = useMemo(() => resolveBuilderId(orgId), [orgId]);

  const [dismissed, setDismissed] = useState(() =>
    typeof window !== "undefined" && localStorage.getItem(dismissKey(orgId)) === "true",
  );

  const { data: vendors } = useGetBuilderVendorsQuery(
    { builderId: orgId || "" },
    { skip: !orgId },
  );
  const { data: suppliers } = useGetBuilderSuppliersQuery({ page: 0, size: 1 });
  const { data: projects } = useProjectsQuery();
  const { data: countData } = useGetDashboardCountQuery(
    { builderId: builderId || "" },
    { skip: !builderId },
  );
  const entitlementsSent = countData?.data?.entitlementsSent ?? 0;

  // Steps are compliance-first and adapt to the org's enabled modules, so a
  // construction builder without the SUPPLIERS module never sees a suppliers step.
  const steps = useMemo(
    () =>
      [
        {
          key: "project",
          label: "Create your first project",
          help: "Set up a property, then attach homeowner registrations and build a BOM.",
          to: "/projects/new",
          done: count(projects) > 0,
          show: true,
        },
        {
          key: "vendors",
          label: "Add your trades",
          help: "The vendors who carry out work on your builds.",
          to: "/admin",
          done: count(vendors) > 0,
          show: hasModule("VENDORS"),
        },
        {
          key: "suppliers",
          label: "Add your suppliers",
          help: "The businesses that provide your materials and goods.",
          to: "/admin",
          done: count(suppliers) > 0,
          show: hasModule("SUPPLIERS"),
        },
        {
          key: "compliance",
          label: "Run compliance & send your first entitlement",
          help: "Complete a registration's compliance checklist, then hand it over to the homeowner.",
          to: "/registrations",
          done: entitlementsSent > 0,
          show: hasModule("COMPLIANCE_DOCS"),
        },
      ].filter((s) => s.show),
    [vendors, suppliers, projects, entitlementsSent, hasModule],
  );

  const completed = steps.filter((s) => s.done).length;
  const allDone = completed === steps.length;

  const dismiss = () => {
    if (orgId) localStorage.setItem(dismissKey(orgId), "true");
    setDismissed(true);
  };

  if (dismissed || allDone || steps.length === 0) return null;

  return (
    <Card className="border-primary/30 bg-primary/[0.03]">
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Rocket className="h-5 w-5 text-primary" />
            Getting started
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {completed} of {steps.length} done — a complete, compliant handover is the goal.
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
