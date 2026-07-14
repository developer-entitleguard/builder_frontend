import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpFromLine,
  Plus,
  ShieldCheck,
  MessageSquare,
  TicketCheck,
  Repeat,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useOrganization } from "@/hooks/useOrganization";
import { useEntitlements } from "@/hooks/useEntitlements";
import { useGetBuilderTermsStatusQuery } from "@/store/api";
import {
  BUILDER_ROLE_LABELS,
  readBuilderRoleFromStorage,
  isVendor,
  isCustomerSupport,
  canManageProjects,
  type BuilderRole,
} from "@/lib/roles";
import { OPEN_WELCOME_EVENT, welcomeSeenKey as seenKey } from "@/components/onboarding/welcomeGuide";

/** Best-effort first name from the stored builder auth payload. */
const readFirstName = (): string | null => {
  try {
    const raw = localStorage.getItem("userData");
    if (!raw) return null;
    const d = JSON.parse(raw);
    return d?.firstName ?? d?.userInfo?.firstName ?? d?.user_info?.firstName ?? null;
  } catch {
    return null;
  }
};

interface PathCard {
  key: string;
  icon: React.ReactNode;
  title: string;
  badge?: string;
  desc: string;
  to: string;
  primary?: boolean;
}

/**
 * First-run orientation for staff users (Administrator / Project Manager /
 * Customer Support). Names the role, frames the platform around compliance at
 * handover, and offers a "fastest path" that adapts to the org's capabilities:
 *  - bulk import only when the org holds the PROJECT_IMPORT module,
 *  - an assign-to-builder path only when the org holds the DEVELOP capability,
 *  - guided project setup as the default for builders.
 *
 * Shows once per org (localStorage), and never over the blocking Terms dialog.
 * Vendors are excluded — they have their own scoped experience.
 */
const WelcomeDialog = () => {
  const navigate = useNavigate();
  const { builderRole, currentOrganization } = useOrganization();
  const { hasModule, hasCapability, ready } = useEntitlements();

  const role: BuilderRole | null = builderRole ?? readBuilderRoleFromStorage();
  const orgId = currentOrganization?.id ?? null;
  const firstName = useMemo(readFirstName, []);

  // Suppress while the latest terms are still unaccepted — the Terms dialog owns
  // the screen until then.
  const { data: termsStatus } = useGetBuilderTermsStatusQuery();
  const termsAccepted = termsStatus?.data?.acceptedLatestVersion !== false;

  const isStaff = !!role && !isVendor(role);
  const alreadySeen =
    typeof window !== "undefined" &&
    localStorage.getItem(seenKey(orgId)) === "true";

  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!isStaff) return;
    if (!termsAccepted) return;
    if (alreadySeen) return;
    setOpen(true);
  }, [isStaff, termsAccepted, alreadySeen]);

  // Allow the Help menu (or anywhere) to re-open the guide on demand.
  useEffect(() => {
    if (!isStaff) return;
    const reopen = () => setOpen(true);
    window.addEventListener(OPEN_WELCOME_EVENT, reopen);
    return () => window.removeEventListener(OPEN_WELCOME_EVENT, reopen);
  }, [isStaff]);

  const markSeen = () => {
    if (orgId) localStorage.setItem(seenKey(orgId), "true");
    setOpen(false);
  };

  const go = (to: string) => {
    markSeen();
    navigate(to);
  };

  if (!isStaff) return null;

  const isDeveloper = ready && hasCapability("DEVELOP");
  const canImport = hasModule("PROJECT_IMPORT");
  const orgTypeLabel = isDeveloper ? "Developer" : "Builder";
  const roleLabel = role ? BUILDER_ROLE_LABELS[role] : "Team member";
  const showCompliance = canManageProjects(role); // Admin / PM operate compliance

  // ---- Adaptive path cards ---------------------------------------------------
  let cards: PathCard[];
  let heroLine: string;

  if (isCustomerSupport(role)) {
    heroLine =
      "You're the front line for homeowners — triage their queries and track warranty issues to resolution.";
    cards = [
      {
        key: "queries",
        icon: <MessageSquare className="h-5 w-5" />,
        title: "Open your query triage",
        desc: "Review incoming homeowner queries and assign a vendor to resolve each one.",
        to: "/queries",
        primary: true,
      },
      {
        key: "tickets",
        icon: <TicketCheck className="h-5 w-5" />,
        title: "Track warranty tickets",
        desc: "Follow issues through to resolution.",
        to: "/tickets",
      },
    ];
  } else {
    heroLine =
      "EG BuildOS helps you hand every homeowner a complete, compliant entitlement package — and prove it. Here's the fastest way to get there.";
    cards = [
      {
        key: "project",
        icon: <Plus className="h-5 w-5" />,
        title: "Set up your first project",
        desc: "Create a project, attach homeowner registrations, and build a BOM — the guided way.",
        to: "/projects/setup",
        primary: true,
      },
    ];
    if (isDeveloper) {
      cards.push({
        key: "assign",
        icon: <Repeat className="h-5 w-5" />,
        title: "Hand a project to a builder",
        desc: "Define the project and its units, then use Share to assign a builder to deliver it.",
        to: "/projects/setup",
      });
    }
    if (canImport) {
      cards.push({
        key: "import",
        icon: <ArrowUpFromLine className="h-5 w-5" />,
        title: "Import past projects",
        badge: "import access",
        desc: "Have history in a spreadsheet? Bulk-import projects and registrations in one pass.",
        to: "/onboarding/bulk",
      });
    }
  }

  const primary = cards.find((c) => c.primary) ?? cards[0];

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) markSeen();
      }}
    >
      <DialogContent className="max-w-xl bg-background p-0 overflow-hidden gap-0">
        {/* Hero */}
        <div className="bg-primary/[0.06] border-b px-6 pt-6 pb-5">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/60 bg-background px-3 py-1 text-xs font-semibold text-primary mb-3">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            {roleLabel} · {orgTypeLabel}
          </span>
          <DialogHeader className="space-y-2 text-left">
            <DialogTitle className="text-xl">
              Welcome to EG BuildOS{firstName ? `, ${firstName}` : ""}.
            </DialogTitle>
            <p className="text-sm text-muted-foreground">{heroLine}</p>
          </DialogHeader>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Compliance framing — shown to the operators who run it */}
          {showCompliance && (
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <ShieldCheck className="h-4 w-4 text-primary" />
                What compliance means here
              </div>
              <ul className="mt-2 grid gap-1.5 text-xs text-muted-foreground sm:grid-cols-3">
                <li>
                  <span className="font-medium text-foreground">What</span> — the
                  documents a home must have to be handed over.
                </li>
                <li>
                  <span className="font-medium text-foreground">How</span> — we
                  generate the checklist; you upload each document.
                </li>
                <li>
                  <span className="font-medium text-foreground">Why</span> —
                  handover stays locked until it's complete.
                </li>
              </ul>
            </div>
          )}

          {/* Adaptive path cards */}
          <div className="space-y-2.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {isCustomerSupport(role) ? "Where to start" : "Your fastest path"}
            </p>
            {cards.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => go(c.to)}
                className={`flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-left transition-colors hover:bg-accent ${
                  c.primary ? "border-primary/60 bg-primary/[0.04]" : "bg-card"
                }`}
              >
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  {c.icon}
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-2 font-medium">
                    {c.title}
                    {c.badge && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {c.badge}
                      </span>
                    )}
                  </span>
                  <span className="block text-sm text-muted-foreground">
                    {c.desc}
                  </span>
                </span>
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <Button className="flex-1" onClick={() => go(primary.to)}>
              {isCustomerSupport(role) ? "Go to my queries" : "Set up my first project"}
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={markSeen}>
              Explore on my own
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WelcomeDialog;
