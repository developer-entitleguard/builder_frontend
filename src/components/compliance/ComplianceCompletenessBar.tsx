import { Progress } from "@/components/ui/progress";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import type { ComplianceCompleteness } from "@/store/api/complianceDocuments";

interface ComplianceCompletenessBarProps {
  completeness: ComplianceCompleteness;
  label?: string;
}

export const ComplianceCompletenessBar = ({
  completeness,
  label = "Compliance completeness",
}: ComplianceCompletenessBarProps) => {
  const { completenessPercent, requiredReceived, required, outstandingRequired } = completeness;
  const ready = outstandingRequired === 0;

  return (
    <div className="rounded-lg border border-border p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-sm text-muted-foreground">
          {requiredReceived}/{required} required received
        </span>
      </div>
      <Progress value={completenessPercent} />
      <div className="flex items-center gap-2 text-sm">
        {ready ? (
          <>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span className="text-green-700">All required documents received.</span>
          </>
        ) : (
          <>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span className="text-amber-700">
              {outstandingRequired} required document(s) outstanding.
            </span>
          </>
        )}
      </div>
    </div>
  );
};
