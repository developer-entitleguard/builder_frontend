import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ReportFinancialSection } from "@/store/api/reports";
import { KpiCard, SectionCard, formatCurrency, formatNumber } from "./reportUtils";

export const ReportFinancial = ({ financial }: { financial: ReportFinancialSection }) => {
  const budgetVsActual = [
    {
      name: "Budget vs spend",
      Estimate: financial.totalEstimatedCost ?? 0,
      Committed: financial.committedSpend ?? 0,
      Paid: financial.paidSpend ?? 0,
    },
  ];

  const varianceTone =
    financial.variance === null ? "default" : financial.variance >= 0 ? "positive" : "danger";

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Financial</h2>
      <p className="text-sm text-muted-foreground">{financial.narrative}</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Final price" value={formatCurrency(financial.finalPrice)} />
        <KpiCard label="Estimated cost" value={formatCurrency(financial.totalEstimatedCost)} />
        <KpiCard label="Committed spend" value={formatCurrency(financial.committedSpend)} />
        <KpiCard
          label="Variance vs estimate"
          value={formatCurrency(financial.variance)}
          tone={varianceTone}
          hint={
            financial.marginPercentage !== null
              ? `Margin ${financial.marginPercentage.toFixed(1)}%`
              : undefined
          }
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <SectionCard title="Estimated cost by category">
          {financial.estimatedByCategory.length === 0 ? (
            <p className="text-sm text-muted-foreground">No cost breakdown available.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={financial.estimatedByCategory} margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="category" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCurrency(v)} width={80} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="total" name="Estimated" fill="#2563eb" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

        <SectionCard title="Budget vs actual">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={budgetVsActual} margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCurrency(v)} width={80} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Legend />
              <Bar dataKey="Estimate" fill="#94a3b8" />
              <Bar dataKey="Committed" fill="#2563eb" />
              <Bar dataKey="Paid" fill="#16a34a" />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>
      </div>

      {financial.costItems.length > 0 && (
        <SectionCard title="Cost line items">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit rate</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Linked activity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {financial.costItems.map((item, i) => (
                <TableRow key={`${item.name}-${i}`}>
                  <TableCell>{item.category ?? "—"}</TableCell>
                  <TableCell className="font-medium">{item.name ?? "—"}</TableCell>
                  <TableCell className="text-right">{formatNumber(item.quantity)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.unitRate)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.totalCost)}</TableCell>
                  <TableCell>{item.linkedActivityName ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </SectionCard>
      )}
    </section>
  );
};
