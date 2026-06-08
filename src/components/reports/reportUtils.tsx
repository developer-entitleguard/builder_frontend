import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** Chart palette — readable in both screen and print. */
export const CHART_COLORS = [
  "#2563eb", // blue
  "#16a34a", // green
  "#f59e0b", // amber
  "#dc2626", // red
  "#7c3aed", // violet
  "#0891b2", // cyan
  "#db2777", // pink
  "#65a30d", // lime
];

export const formatCurrency = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(value);
};

export const formatNumber = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("en-AU").format(value);
};

export const formatDate = (value: string | null | undefined): string => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });
};

interface KpiCardProps {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: "default" | "positive" | "warning" | "danger";
}

const toneClasses: Record<NonNullable<KpiCardProps["tone"]>, string> = {
  default: "text-foreground",
  positive: "text-green-600",
  warning: "text-amber-600",
  danger: "text-red-600",
};

export const KpiCard = ({ label, value, hint, tone = "default" }: KpiCardProps) => (
  <Card>
    <CardContent className="pt-6">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={cn("text-2xl font-semibold mt-1", toneClasses[tone])}>{value}</p>
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </CardContent>
  </Card>
);

interface SectionCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export const SectionCard = ({ title, description, children, className }: SectionCardProps) => (
  <Card className={className}>
    <CardHeader>
      <CardTitle>{title}</CardTitle>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
    </CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
);
