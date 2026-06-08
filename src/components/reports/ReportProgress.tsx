import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { ReportProgressSection } from "@/store/api/reports";
import { CHART_COLORS, KpiCard, SectionCard, formatDate } from "./reportUtils";

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: "#16a34a",
  IN_PROGRESS: "#2563eb",
  SCHEDULED: "#7c3aed",
  DRAFT: "#94a3b8",
  CANCELLED: "#dc2626",
};

export const ReportProgress = ({ progress }: { progress: ReportProgressSection }) => {
  const completionData = [
    { name: "Completed", value: progress.completedActivities },
    { name: "Remaining", value: Math.max(0, progress.totalActivities - progress.completedActivities) },
  ];

  const targetTone =
    progress.daysToTarget === null
      ? "default"
      : progress.scheduleOverdue
        ? "danger"
        : progress.daysToTarget <= 14
          ? "warning"
          : "positive";
  const targetValue =
    progress.daysToTarget === null
      ? "—"
      : progress.daysToTarget < 0
        ? `${Math.abs(progress.daysToTarget)}d overdue`
        : `${progress.daysToTarget}d left`;

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Progress</h2>
      <p className="text-sm text-muted-foreground">{progress.narrative}</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Complete" value={`${progress.percentComplete}%`} tone="positive" />
        <KpiCard
          label="Activities done"
          value={`${progress.completedActivities}/${progress.totalActivities}`}
        />
        <KpiCard
          label="Overdue"
          value={progress.overdueCount}
          tone={progress.overdueCount > 0 ? "danger" : "positive"}
        />
        <KpiCard label="Target date" value={targetValue} tone={targetTone} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <SectionCard title="Overall completion">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={completionData}
                dataKey="value"
                nameKey="name"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
              >
                <Cell fill="#16a34a" />
                <Cell fill="#e2e8f0" />
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="Activities by category">
          {progress.byCategory.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activities to chart.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={progress.byCategory} margin={{ left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="categoryName" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={50} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="completed" stackId="a" name="Completed" fill="#16a34a" />
                <Bar dataKey="outstanding" stackId="a" name="Outstanding" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>
      </div>

      {progress.jobStatusBreakdown.length > 0 && (
        <SectionCard title="Assigned job status" description="Distinct jobs backing this project's activities.">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={progress.jobStatusBreakdown} dataKey="count" nameKey="status" outerRadius={80} label>
                {progress.jobStatusBreakdown.map((entry, i) => (
                  <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </SectionCard>
      )}

      {progress.overdueActivities.length > 0 && (
        <SectionCard title="Overdue activities">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Activity</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Due</TableHead>
                <TableHead className="text-right">Days overdue</TableHead>
                <TableHead>Assignee</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {progress.overdueActivities.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell>{row.categoryName ?? "—"}</TableCell>
                  <TableCell>{formatDate(row.dueDate)}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="destructive">{row.daysOverdue}</Badge>
                  </TableCell>
                  <TableCell>{row.assignee ?? "Unassigned"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </SectionCard>
      )}
    </section>
  );
};
