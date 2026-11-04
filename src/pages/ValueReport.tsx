import { useState } from "react";
import { BarChart3 } from "lucide-react";
import Header from "@/components/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  VALUE_REPORT_PERIODS,
  useGetValueReportQuery,
  valueReportErrorMessage,
  type ValueReportPeriod,
} from "@/store/api/valueReport";

const fmtDate = (iso: string | null | undefined): string => {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
};

const fmtDollars = (n: number) =>
  `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Value report (Revenue Capabilities F5). Administrator (ORG_MANAGE). What the
 * business's own records measured over a period. Measured results only: no
 * estimates, projections, savings, ROI, or any Entitle Guard fee or price (B4).
 */
const ValueReport = () => {
  const [months, setMonths] = useState<ValueReportPeriod>(12);
  const { data, isFetching, error } = useGetValueReportQuery(months);
  const measures = data?.measures ?? [];
  const empty = measures.every((m) => !m.count && !m.amount);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <BarChart3 className="h-7 w-7" />
              Value report
            </h1>
            <p className="text-muted-foreground mt-1">
              {data ? `${fmtDate(data.from)} to ${fmtDate(data.to)}` : "What your records show over the period."}
            </p>
          </div>
          <div className="space-y-1">
            <Label htmlFor="value-report-period">Period</Label>
            <Select value={String(months)} onValueChange={(v) => setMonths(Number(v) as ValueReportPeriod)}>
              <SelectTrigger id="value-report-period" className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VALUE_REPORT_PERIODS.map((p) => (
                  <SelectItem key={p} value={String(p)}>
                    Last {p} months
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isFetching && !data ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-28 w-full" />
            ))}
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">{valueReportErrorMessage(error, "Could not load the value report")}</p>
        ) : !data || empty ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Nothing recorded in this period yet.
            </CardContent>
          </Card>
        ) : (
          <div className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ${isFetching ? "opacity-60" : ""}`} aria-busy={isFetching}>
            {measures.map((m) => (
              <Card key={m.key}>
                <CardContent className="pt-6 space-y-1">
                  <p className="text-sm text-muted-foreground">{m.label}</p>
                  <p className="text-3xl font-semibold tabular-nums">{m.count.toLocaleString()}</p>
                  {m.amount != null && <p className="text-sm tabular-nums">{fmtDollars(m.amount)}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {data?.note && <p className="text-sm text-muted-foreground">{data.note}</p>}
      </main>
    </div>
  );
};

export default ValueReport;
