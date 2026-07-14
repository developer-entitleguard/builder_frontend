import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Circle, X, Rocket } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useOrganization } from "@/hooks/useOrganization";
import {
  useGetBuilderVendorsQuery,
  useGetBuilderSuppliersQuery,
  useGetBuilderUsersQuery,
  useGetBillOfMaterialsQuery,
} from "@/store/api";
import { useListOrgTermsVersionsQuery } from "@/store/api/orgTerms";

/** Extracts a record count from the various paged / wrapped / raw-array shapes. */
const count = (resp: unknown): number => {
  if (Array.isArray(resp)) return resp.length;
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

// Bumped from the original key so the refreshed checklist reappears for anyone
// who dismissed the previous version.
const dismissKey = (orgId: string | undefined) => `eg_getting_started_v2_dismissed_${orgId ?? "unknown"}`;

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

/**
 * Organisation setup checklist shown on the admin/PM dashboard. Walks a new
 * builder through the one-time setup — team, suppliers, trades, a bill of
 * materials, and terms & conditions — each step auto-ticking once the relevant
 * data exists. The project → compliance journey lives in the welcome guide and
 * the project setup hub, not here.
 */
const GettingStartedChecklist = () => {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id;
  const builderId = useMemo(() => resolveBuilderId(orgId), [orgId]);

  const [dismissed, setDismissed] = useState(() =>
    typeof window !== "undefined" && localStorage.getItem(dismissKey(orgId)) === "true",
  );

  const { data: users } = useGetBuilderUsersQuery({ builderId: orgId || "" }, { skip: !orgId });
  const { data: vendors } = useGetBuilderVendorsQuery({ builderId: orgId || "" }, { skip: !orgId });
  const { data: suppliers } = useGetBuilderSuppliersQuery({ page: 0, size: 1 });
  const { data: boms } = useGetBillOfMaterialsQuery({ builderId: builderId || "" }, { skip: !builderId });
  const { data: terms } = useListOrgTermsVersionsQuery();

  const steps = useMemo(
    () => [
      {
        key: "users",
        label: "Add your team",
        help: "Invite Project Managers and Customer Support so you can share the work.",
        to: "/admin?tab=users",
        // The signed-in admin always counts as one — done once a teammate is added.
        done: count(users) > 1,
      },
      {
        key: "suppliers",
        label: "Add your suppliers",
        help: "The businesses that provide your materials and goods.",
        to: "/admin?tab=suppliers",
        done: count(suppliers) > 0,
      },
      {
        key: "vendors",
        label: "Add your vendors",
        help: "The trades who carry out work on your builds.",
        to: "/admin?tab=vendors",
        done: count(vendors) > 0,
      },
      {
        key: "bom",
        label: "Create a Bill of Materials",
        help: "The master list of items you install, ready to attach to homes.",
        to: "/items",
        done: count(boms) > 0,
      },
      {
        key: "terms",
        label: "Set up your Terms & Conditions",
        help: "Homeowners accept these at handover.",
        to: "/terms-versions",
        done: count(terms) > 0,
      },
    ],
    [users, suppliers, vendors, boms, terms],
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
            {completed} of {steps.length} done — finish setting up your organisation.
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
