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
import type { ReportComplianceSection, ReportRegistrationComplianceRow } from "@/store/api/reports";
import { KpiCard, SectionCard } from "./reportUtils";

const STATE_LABEL: Record<ReportRegistrationComplianceRow["state"], { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  READY: { label: "Ready", variant: "default" },
  ACKNOWLEDGED_GAP: { label: "Acknowledged gap", variant: "secondary" },
  BLOCKED: { label: "Blocked", variant: "destructive" },
};

export const ReportCompliance = ({ compliance }: { compliance: ReportComplianceSection }) => {
  const c = compliance.projectCompleteness;
  const completionData = [
    { name: "Received", value: c.requiredReceived },
    { name: "Outstanding", value: c.outstandingRequired },
  ];

  const readinessData = [
    {
      name: "Dwellings",
      Ready: compliance.registrationsReady,
      "Acknowledged gap": compliance.registrationsAcknowledgedGap,
      Blocked: compliance.registrationsBlocked,
    },
  ];

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Compliance</h2>
      <p className="text-sm text-muted-foreground">{compliance.narrative}</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Checklist complete"
          value={`${c.completenessPercent}%`}
          tone={c.completenessPercent === 100 ? "positive" : "warning"}
        />
        <KpiCard label="Required / received" value={`${c.requiredReceived}/${c.required}`} />
        <KpiCard
          label="Outstanding required"
          value={c.outstandingRequired}
          tone={c.outstandingRequired > 0 ? "danger" : "positive"}
        />
        <KpiCard
          label="Handover"
          value={c.readyForHandover ? "Ready" : "Not ready"}
          tone={c.readyForHandover ? "positive" : "warning"}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <SectionCard title="Project checklist completeness">
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
                <Cell fill="#dc2626" />
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="Dwellings by handover readiness">
          {compliance.registrationsTotal === 0 ? (
            <p className="text-sm text-muted-foreground">No dwellings registered for this project.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={readinessData} margin={{ left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Ready" stackId="a" fill="#16a34a" />
                <Bar dataKey="Acknowledged gap" stackId="a" fill="#f59e0b" />
                <Bar dataKey="Blocked" stackId="a" fill="#dc2626" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>
      </div>

      {compliance.outstandingRequiredDocuments.length > 0 && (
        <SectionCard title="Outstanding required documents">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Issuer</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {compliance.outstandingRequiredDocuments.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium">{doc.documentName ?? "—"}</TableCell>
                  <TableCell>{doc.category ?? "—"}</TableCell>
                  <TableCell>{doc.issuer ?? "—"}</TableCell>
                  <TableCell>{doc.status ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </SectionCard>
      )}

      {compliance.registrations.length > 0 && (
        <SectionCard title="Per-dwelling compliance">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dwelling</TableHead>
                <TableHead className="text-right">Complete</TableHead>
                <TableHead className="text-right">Required / received</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
                <TableHead>State</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {compliance.registrations.map((row) => {
                const badge = STATE_LABEL[row.state];
                return (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.label}</TableCell>
                    <TableCell className="text-right">{row.completenessPercent}%</TableCell>
                    <TableCell className="text-right">
                      {row.received}/{row.required}
                    </TableCell>
                    <TableCell className="text-right">{row.outstandingRequired}</TableCell>
                    <TableCell>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </SectionCard>
      )}
    </section>
  );
};
