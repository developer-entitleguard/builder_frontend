import { useNavigate } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Printer, AlertCircle, FileBarChart, CalendarCheck, Rocket, ChevronRight } from "lucide-react";
import { useGetOrgReportQuery, type OrgReport as OrgReportData, type OrgReportProjectRow } from "@/store/api/reports";
import { KpiCard, ProgressBar, SectionCard, formatCurrency, formatDate } from "@/components/reports/reportUtils";
import { cn } from "@/lib/utils";

type Risk = "ON_TRACK" | "AT_RISK" | "OFF_TRACK" | "UNKNOWN";

const ON_TIME: Record<Risk, { label: string; pill: string; bar: string; border: string }> = {
  OFF_TRACK: { label: "Off track", pill: "bg-red-100 text-red-700 hover:bg-red-100", bar: "bg-red-500", border: "border-l-red-500" },
  AT_RISK: { label: "At risk", pill: "bg-amber-100 text-amber-700 hover:bg-amber-100", bar: "bg-amber-500", border: "border-l-amber-500" },
  UNKNOWN: { label: "Unknown", pill: "bg-muted text-muted-foreground hover:bg-muted", bar: "bg-slate-300", border: "border-l-slate-300" },
  ON_TRACK: { label: "On track", pill: "bg-green-100 text-green-700 hover:bg-green-100", bar: "bg-green-500", border: "border-l-green-500" },
};

// Highest risk first so problems surface at the top.
const RISK_ORDER: Risk[] = ["OFF_TRACK", "AT_RISK", "UNKNOWN", "ON_TRACK"];
const riskOf = (p: OrgReportProjectRow): Risk => (p.onTimeLikelihood as Risk) ?? "UNKNOWN";
const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);

const OnTimeBadge = ({ row }: { row: OrgReportProjectRow }) => {
  const cfg = ON_TIME[riskOf(row)];
  return (
    <Badge className={cfg.pill} title={row.onTimeRationale ?? undefined}>
      {cfg.label}
    </Badge>
  );
};

const Metric = ({ label, detail, percent, bar }: { label: string; detail: string; percent: number; bar: string }) => (
  <div>
    <div className="flex justify-between text-xs mb-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{detail}</span>
    </div>
    <ProgressBar percent={percent} className={bar} />
  </div>
);

const ProjectCard = ({ p, onOpen }: { p: OrgReportProjectRow; onOpen: () => void }) => {
  const cfg = ON_TIME[riskOf(p)];
  return (
    <div className={cn("flex flex-col gap-3 rounded-lg border border-l-4 bg-card p-4 shadow-sm", cfg.border)}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium truncate">{p.name}</p>
          <p className="text-xs text-muted-foreground">
            {p.status ?? "—"}
            {p.buildingClass ? ` · ${p.buildingClass}` : ""}
          </p>
        </div>
        <OnTimeBadge row={p} />
      </div>

      <Metric label="Tasks" detail={`${pct(p.tasksCompleted, p.tasksTotal)}% · ${p.tasksCompleted}/${p.tasksTotal}`} percent={pct(p.tasksCompleted, p.tasksTotal)} bar="bg-blue-500" />
      <Metric label="Compliance" detail={`${p.complianceReceived}/${p.complianceTotal}`} percent={pct(p.complianceReceived, p.complianceTotal)} bar="bg-green-500" />
      <Metric label="Budget (paid)" detail={`${formatCurrency(p.totalPaid)} / ${formatCurrency(p.totalAmount)}`} percent={pct(p.totalPaid, p.totalAmount)} bar="bg-violet-500" />

      {p.onTimeRationale && <p className="text-xs text-muted-foreground leading-snug">{p.onTimeRationale}</p>}

      <div className="mt-auto flex items-center justify-between border-t pt-2">
        <span className="text-xs text-muted-foreground">Target {formatDate(p.targetEndDate)}</span>
        <Button variant="ghost" size="sm" onClick={onOpen}>
          <FileBarChart className="h-4 w-4 mr-1" />
          View report
        </Button>
      </div>
    </div>
  );
};

const HealthBand = ({ report }: { report: OrgReportData }) => {
  const projects = report.projects;
  const total = projects.length;
  const tasksDone = projects.reduce((s, p) => s + p.tasksCompleted, 0);
  const tasksTotal = projects.reduce((s, p) => s + p.tasksTotal, 0);
  const compDone = projects.reduce((s, p) => s + p.complianceReceived, 0);
  const compTotal = projects.reduce((s, p) => s + p.complianceTotal, 0);
  const paid = projects.reduce((s, p) => s + p.totalPaid, 0);
  const amount = projects.reduce((s, p) => s + p.totalAmount, 0);

  const counts: Record<Risk, number> = { OFF_TRACK: 0, AT_RISK: 0, UNKNOWN: 0, ON_TRACK: 0 };
  projects.forEach((p) => (counts[riskOf(p)] += 1));

  return (
    <SectionCard title="Portfolio health">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* On-time distribution */}
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-sm text-muted-foreground">On-time outlook</span>
            <span className="text-sm font-medium">{total} projects</span>
          </div>
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
            {RISK_ORDER.map((r) =>
              counts[r] > 0 ? (
                <div key={r} className={ON_TIME[r].bar} style={{ width: `${(counts[r] / total) * 100}%` }} />
              ) : null,
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
            {RISK_ORDER.map((r) => (
              <span key={r} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className={cn("h-2.5 w-2.5 rounded-full", ON_TIME[r].bar)} />
                {ON_TIME[r].label} <span className="font-medium text-foreground">{counts[r]}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Aggregate progress / compliance / budget */}
        <div className="space-y-3">
          <Metric label="Overall progress" detail={`${pct(tasksDone, tasksTotal)}% · ${tasksDone}/${tasksTotal} tasks`} percent={pct(tasksDone, tasksTotal)} bar="bg-blue-500" />
          <Metric label="Compliance attached" detail={`${pct(compDone, compTotal)}% · ${compDone}/${compTotal} docs`} percent={pct(compDone, compTotal)} bar="bg-green-500" />
          <Metric label="Budget paid" detail={`${formatCurrency(paid)} / ${formatCurrency(amount)}`} percent={pct(paid, amount)} bar="bg-violet-500" />
        </div>
      </div>
    </SectionCard>
  );
};

const HighlightPanel = ({
  title,
  icon: Icon,
  accent,
  items,
  onOpen,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  items: { p: OrgReportProjectRow; detail: string }[];
  onOpen: (id: string) => void;
}) => (
  <div className="rounded-lg border bg-card p-4">
    <div className="mb-3 flex items-center gap-2">
      <span className={cn("flex h-8 w-8 items-center justify-center rounded-md", accent)}>
        <Icon className="h-4 w-4" />
      </span>
      <h3 className="font-semibold">{title}</h3>
      <Badge variant="secondary" className="ml-auto">{items.length}</Badge>
    </div>
    <ul className="divide-y">
      {items.map(({ p, detail }) => (
        <li key={p.id}>
          <button
            onClick={() => onOpen(p.id)}
            className="flex w-full items-center justify-between gap-2 rounded px-1 py-2 text-left hover:bg-muted/50"
          >
            <span className="min-w-0">
              <span className="block truncate font-medium">{p.name}</span>
              <span className="block text-xs text-muted-foreground">{detail}</span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
        </li>
      ))}
    </ul>
  </div>
);

const OrgReport = () => {
  const navigate = useNavigate();
  const { data, isLoading, isError, error } = useGetOrgReportQuery();

  const report = data?.data ?? null;
  const errorMessage =
    (data && !data.success ? data.message : undefined) ??
    (isError ? "Unable to load this report." : undefined);

  const sortedProjects = report
    ? [...report.projects].sort((a, b) => RISK_ORDER.indexOf(riskOf(a)) - RISK_ORDER.indexOf(riskOf(b)))
    : [];

  const completingSoon = (report?.projects ?? [])
    .filter((p) => p.completingSoon)
    .sort((a, b) => (a.targetEndDate ?? "").localeCompare(b.targetEndDate ?? ""))
    .map((p) => ({ p, detail: `Target ${formatDate(p.targetEndDate)} · ${pct(p.tasksCompleted, p.tasksTotal)}% done` }));

  const readyToStart = (report?.projects ?? [])
    .filter((p) => p.readyToStart)
    .sort((a, b) => (a.startDate ?? "").localeCompare(b.startDate ?? ""))
    .map((p) => ({ p, detail: `Starts ${formatDate(p.startDate)}` }));

  // Empty sections are hidden, so nothing renders a "no data" placeholder.
  const hasProjects = sortedProjects.length > 0;
  const hasTickets = (report?.totals.tickets ?? 0) > 0;
  const hasQueries = (report?.totals.queries ?? 0) > 0;
  const hasHighlights = completingSoon.length > 0 || readyToStart.length > 0;
  const hasOps = hasTickets || hasQueries;

  return (
    <div className="min-h-screen bg-background">
      <div className="print:hidden">
        <Header />
      </div>

      <div className="sticky top-0 z-10 bg-card border-b border-border shadow-sm print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to dashboard
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()} disabled={!report}>
            <Printer className="h-4 w-4 mr-2" />
            Print / Save as PDF
          </Button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        {isLoading && (
          <div className="space-y-4">
            <div className="h-8 w-64 bg-muted animate-pulse rounded" />
            <div className="h-28 bg-muted animate-pulse rounded-lg" />
            <div className="grid md:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-44 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          </div>
        )}

        {!isLoading && errorMessage && (
          <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <span>{errorMessage || (error ? "Something went wrong." : "")}</span>
          </div>
        )}

        {!isLoading && report && (
          <>
            {/* Header band */}
            <div className="border-b pb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Management Report</p>
                <h1 className="text-3xl font-bold text-foreground mt-1">
                  {report.organizationName ?? "Organization"}
                </h1>
              </div>
              <p className="text-sm text-muted-foreground shrink-0">Generated {formatDate(report.generatedAt)}</p>
            </div>

            {/* Portfolio health — only when there are projects */}
            {hasProjects && <HealthBand report={report} />}

            {/* Look-ahead highlights — only render panels that have entries */}
            {hasHighlights && (
              <div className="grid gap-4 md:grid-cols-2">
                {completingSoon.length > 0 && (
                  <HighlightPanel
                    title="Completing soon"
                    icon={CalendarCheck}
                    accent="bg-blue-100 text-blue-700"
                    items={completingSoon}
                    onOpen={(id) => navigate(`/projects/${id}/report`)}
                  />
                )}
                {readyToStart.length > 0 && (
                  <HighlightPanel
                    title="Ready to start"
                    icon={Rocket}
                    accent="bg-violet-100 text-violet-700"
                    items={readyToStart}
                    onOpen={(id) => navigate(`/projects/${id}/report`)}
                  />
                )}
              </div>
            )}

            {/* Projects — risk-first cards */}
            {hasProjects && (
              <section className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <h2 className="text-xl font-semibold">Projects</h2>
                  <span className="text-sm text-muted-foreground">Highest risk first</span>
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {sortedProjects.map((p) => (
                    <ProjectCard key={p.id} p={p} onOpen={() => navigate(`/projects/${p.id}/report`)} />
                  ))}
                </div>
              </section>
            )}

            {/* Dense table for comparison */}
            {hasProjects && (
              <SectionCard title="All projects" description="Same data in a compact, comparable table.">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Tasks</TableHead>
                      <TableHead className="text-right">Compliance</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>On time?</TableHead>
                      <TableHead className="text-right">Report</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedProjects.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell>{p.status ?? "—"}</TableCell>
                        <TableCell className="text-right tabular-nums">{p.tasksCompleted}/{p.tasksTotal}</TableCell>
                        <TableCell className="text-right tabular-nums">{p.complianceReceived}/{p.complianceTotal}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatCurrency(p.totalPaid)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatCurrency(p.totalAmount)}</TableCell>
                        <TableCell><OnTimeBadge row={p} /></TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => navigate(`/projects/${p.id}/report`)}>
                            <FileBarChart className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </SectionCard>
            )}

            {/* Operations — only when there are tickets and/or queries */}
            {hasOps && (
              <section className="space-y-4 pt-2">
                <h2 className="text-xl font-semibold">Operations</h2>

                <div className="grid grid-cols-3 gap-4">
                  <KpiCard label="Tickets" value={report.totals.tickets} />
                  <KpiCard
                    label="Open tickets"
                    value={report.totals.openTickets}
                    tone={report.totals.openTickets > 0 ? "warning" : "positive"}
                  />
                  <KpiCard label="Queries" value={report.totals.queries} />
                </div>

                <SectionCard title="Monthly activity" description="Tickets and queries created over the last 12 months.">
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={report.monthly} margin={{ left: -10 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="tickets" name="Tickets" stroke="#2563eb" strokeWidth={2} />
                      <Line type="monotone" dataKey="queries" name="Queries" stroke="#16a34a" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </SectionCard>

                {(hasTickets || hasQueries) && (
                  <div className={cn("grid gap-4", hasTickets && hasQueries ? "lg:grid-cols-2" : "grid-cols-1")}>
                    {hasTickets && (
                      <SectionCard title="Tickets by status">
                        <ResponsiveContainer width="100%" height={240}>
                          <BarChart data={report.ticketsByStatus} margin={{ left: -10 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="status" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={50} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Bar dataKey="count" name="Tickets" fill="#2563eb" />
                          </BarChart>
                        </ResponsiveContainer>
                      </SectionCard>
                    )}
                    {hasQueries && (
                      <SectionCard title="Queries by status">
                        <ResponsiveContainer width="100%" height={240}>
                          <BarChart data={report.queriesByStatus} margin={{ left: -10 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="status" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={50} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Bar dataKey="count" name="Queries" fill="#16a34a" />
                          </BarChart>
                        </ResponsiveContainer>
                      </SectionCard>
                    )}
                  </div>
                )}
              </section>
            )}

            {!hasProjects && !hasOps && (
              <p className="text-sm text-muted-foreground">No report data yet.</p>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default OrgReport;
