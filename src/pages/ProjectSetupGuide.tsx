import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Circle, ArrowRight, Repeat } from "lucide-react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import ComplianceExplainer from "@/components/onboarding/ComplianceExplainer";
import { useProjectsQuery, useGetProjectRegistrationsQuery } from "@/store/api/projects";
import { useEntitlements } from "@/hooks/useEntitlements";

/** Pull a plain array out of the various wrapped/paged project responses. */
const toArray = (resp: unknown): Array<{ id?: string }> => {
  if (Array.isArray(resp)) return resp as Array<{ id?: string }>;
  if (resp && typeof resp === "object") {
    const r = resp as Record<string, unknown>;
    if (Array.isArray(r.data)) return r.data as Array<{ id?: string }>;
    if (Array.isArray(r.content)) return r.content as Array<{ id?: string }>;
  }
  return [];
};

interface GuideStep {
  key: string;
  title: string;
  desc: string;
  cta: string;
  onClick: () => void;
  done: boolean;
}

/**
 * Guided project setup. Rather than re-implement the three battle-tested screens
 * (create project, attach registrations, build BOM), this threads them into one
 * journey — deep-linking to each existing screen and framing compliance as the
 * goal. The default "Set up your first project" destination from the Welcome guide.
 */
const ProjectSetupGuide = () => {
  const navigate = useNavigate();
  const { hasCapability, ready } = useEntitlements();
  const { data: projects } = useProjectsQuery();

  const projectList = useMemo(() => toArray(projects), [projects]);
  const latestProjectId = projectList[0]?.id;
  const hasProject = projectList.length > 0;

  const { data: regs } = useGetProjectRegistrationsQuery(
    { projectId: latestProjectId || "" },
    { skip: !latestProjectId },
  );
  const hasRegistrations = toArray(regs).length > 0;

  const isDeveloper = ready && hasCapability("DEVELOP");

  const steps: GuideStep[] = [
    {
      key: "project",
      title: "Create your project",
      desc: "A project groups the homes you're delivering at one site. Its jurisdiction drives the compliance checklist.",
      cta: hasProject ? "Create another" : "Create project",
      onClick: () => navigate("/projects/new"),
      done: hasProject,
    },
    {
      key: "registrations",
      title: "Attach registrations",
      desc: "Add each home and its homeowner to the project — the thing that receives the compliant entitlement at handover.",
      cta: "Add a registration",
      onClick: () =>
        navigate(latestProjectId ? `/onboarding?projectId=${latestProjectId}` : "/onboarding"),
      done: hasRegistrations,
    },
    {
      key: "bom",
      title: "Build a BOM against a registration",
      desc: "Add the items installed in each home — appliances, fixtures, finishes — each carrying warranty and compliance information.",
      cta: "Open the project",
      onClick: () => navigate(latestProjectId ? `/projects/${latestProjectId}` : "/projects"),
      done: false,
    },
    {
      key: "compliance",
      title: "Run compliance & hand over",
      desc: "Complete the registration's compliance checklist, then send the homeowner their entitlement. Handover stays locked until it's complete.",
      cta: "Open compliance",
      onClick: () => navigate(latestProjectId ? `/projects/${latestProjectId}` : "/projects"),
      done: false,
    },
  ];

  // The first not-yet-done step is the "current" one.
  const currentIndex = steps.findIndex((s) => !s.done);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Set up a project</h1>
          <p className="text-muted-foreground mt-1">
            Four steps from an empty project to a compliant handover.
          </p>
        </div>

        {isDeveloper && (
          <Card className="mb-6 border-primary/30 bg-primary/[0.03]">
            <CardContent className="flex items-start gap-3 p-4">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Repeat className="h-5 w-5" />
              </span>
              <div>
                <p className="font-medium">Handing construction to a builder?</p>
                <p className="text-sm text-muted-foreground">
                  Create the project and its units here, then use the{" "}
                  <strong>Share</strong> button on the project to assign a builder —
                  they'll attach registrations, build BOMs and run compliance, while
                  you oversee handover.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <ol className="space-y-3">
          {steps.map((s, i) => {
            const isCurrent = i === currentIndex;
            return (
              <li
                key={s.key}
                className={`rounded-xl border p-4 transition-colors ${
                  s.done
                    ? "bg-muted/30"
                    : isCurrent
                      ? "border-primary/60 bg-primary/[0.04]"
                      : "bg-card"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 shrink-0">
                    {s.done ? (
                      <CheckCircle2 className="h-6 w-6 text-primary" />
                    ) : (
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full border-2 text-xs font-semibold ${
                          isCurrent
                            ? "border-primary text-primary"
                            : "border-muted-foreground/40 text-muted-foreground"
                        }`}
                      >
                        {i + 1}
                      </span>
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={`font-medium ${s.done ? "text-muted-foreground" : ""}`}>
                      {s.title}
                    </p>
                    <p className="text-sm text-muted-foreground">{s.desc}</p>
                  </div>
                  <Button
                    variant={isCurrent ? "default" : "outline"}
                    size="sm"
                    className="shrink-0"
                    onClick={s.onClick}
                  >
                    {s.cta}
                    {isCurrent && <ArrowRight className="ml-1.5 h-4 w-4" />}
                  </Button>
                </div>
              </li>
            );
          })}
        </ol>

        <div className="mt-8">
          <ComplianceExplainer />
        </div>
      </main>
    </div>
  );
};

export default ProjectSetupGuide;
