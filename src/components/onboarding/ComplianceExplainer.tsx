import { ShieldCheck, FileCheck2, Lock } from "lucide-react";
import { COMPLIANCE_POINTS } from "@/lib/help/complianceCopy";

const ICONS = {
  what: ShieldCheck,
  how: FileCheck2,
  why: Lock,
} as const;

interface ComplianceExplainerProps {
  /** "card" = bordered standalone block; "bare" = no outer border (for embedding). */
  variant?: "card" | "bare";
  className?: string;
}

/**
 * The shared "what / how / why" explanation of compliance, for every builder and
 * developer. Reuses COMPLIANCE_POINTS so the Welcome dialog, Help center and this
 * block never drift. Drop it wherever compliance is first encountered.
 */
const ComplianceExplainer = ({ variant = "card", className = "" }: ComplianceExplainerProps) => (
  <div
    className={`${
      variant === "card" ? "rounded-xl border bg-card p-5" : ""
    } ${className}`}
  >
    <div className="flex items-center gap-2 text-sm font-semibold">
      <ShieldCheck className="h-4 w-4 text-primary" />
      Understanding compliance
    </div>
    <div className="mt-3 grid gap-3 sm:grid-cols-3">
      {COMPLIANCE_POINTS.map((p) => {
        const Icon = ICONS[p.key];
        return (
          <div key={p.key} className="rounded-lg border bg-background p-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Icon className="h-4 w-4" />
            </span>
            <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {p.label}
            </p>
            <p className="text-sm font-medium text-foreground">{p.heading}</p>
            <p className="mt-1 text-xs text-muted-foreground">{p.body}</p>
          </div>
        );
      })}
    </div>
  </div>
);

export default ComplianceExplainer;
