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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Printer, AlertCircle, FileBarChart } from "lucide-react";
import { useGetOrgReportQuery } from "@/store/api/reports";
import { KpiCard, SectionCard, formatDate } from "@/components/reports/reportUtils";

const OrgReport = () => {
  const navigate = useNavigate();
  const { data, isLoading, isError, error } = useGetOrgReportQuery();

  const report = data?.data ?? null;
  const errorMessage =
    (data && !data.success ? data.message : undefined) ??
    (isError ? "Unable to load this report." : undefined);

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
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
            <div className="h-64 bg-muted animate-pulse rounded-lg" />
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
              <p className="text-sm text-muted-foreground shrink-0">
                Generated {formatDate(report.generatedAt)}
              </p>
            </div>

            {/* Totals */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard label="Projects" value={report.totals.projects} />
              <KpiCard label="Tickets" value={report.totals.tickets} />
              <KpiCard
                label="Open tickets"
                value={report.totals.openTickets}
                tone={report.totals.openTickets > 0 ? "warning" : "positive"}
              />
              <KpiCard label="Queries" value={report.totals.queries} />
            </div>

            {/* Monthly trend */}
            <SectionCard
              title="Monthly activity"
              description="Tickets and queries created over the last 12 months."
            >
              <ResponsiveContainer width="100%" height={300}>
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

            {/* Status breakdowns */}
            <div className="grid lg:grid-cols-2 gap-4">
              <SectionCard title="Tickets by status">
                {report.ticketsByStatus.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No tickets yet.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={report.ticketsByStatus} margin={{ left: -10 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="status" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={50} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="count" name="Tickets" fill="#2563eb" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </SectionCard>

              <SectionCard title="Queries by status">
                {report.queriesByStatus.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No queries yet.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={report.queriesByStatus} margin={{ left: -10 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="status" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={50} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="count" name="Queries" fill="#16a34a" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </SectionCard>
            </div>

            {/* Projects portfolio with drill-down */}
            <SectionCard
              title="Projects"
              description="Open a project to view its detailed report."
            >
              {report.projects.length === 0 ? (
                <p className="text-sm text-muted-foreground">No projects yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Target end</TableHead>
                      <TableHead className="text-right">Report</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.projects.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell>{p.status ?? "—"}</TableCell>
                        <TableCell className="capitalize">{p.propertyType ?? "—"}</TableCell>
                        <TableCell>{p.buildingClass ?? "—"}</TableCell>
                        <TableCell>{formatDate(p.targetEndDate)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/projects/${p.id}/report`)}
                          >
                            <FileBarChart className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </SectionCard>
          </>
        )}
      </main>
    </div>
  );
};

export default OrgReport;
