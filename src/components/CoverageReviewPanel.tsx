import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  useVerifyRegistrationMutation,
  useRejectRegistrationMutation,
} from "@/lib/api/services/query";
import type { CoverageFields } from "@/store/api/coverage";
import { AlertTriangle, ShieldCheck, ShieldQuestion, HomeIcon } from "lucide-react";

/**
 * Ticket/Query value-add (builder side). Renders, for a ticket or query:
 *  1. a "verify you built this home" banner when its linked registration was
 *     auto-created from a consumer's support request, with Verify / Reject; and
 *  2. the advisory AI warranty / duty-of-care coverage assessment card.
 *
 * Both inputs come straight off the raw Ticket/Query entity (CoverageFields).
 */
export function CoverageReviewPanel({
  entity,
  onResolved,
}: {
  entity: CoverageFields;
  /** Called after a successful verify/reject so a parent using local state can refetch. */
  onResolved?: () => void;
}) {
  const { toast } = useToast();
  const [verifyMut, { isLoading: verifying }] = useVerifyRegistrationMutation();
  const [rejectMut, { isLoading: rejecting }] = useRejectRegistrationMutation();

  const regId = entity.linkedRegistrationId ?? undefined;
  const showVerifyBanner = entity.registrationAutoCreated === true && !!regId;
  const showCoverage = entity.coverageStatus === "ok" && !!entity.coverageVerdict;

  if (!showVerifyBanner && !showCoverage) {
    return null;
  }

  const handleVerify = async () => {
    if (!regId) return;
    try {
      const res = await verifyMut({ registrationId: regId }).unwrap();
      if (!res.success) {
        toast({ title: "Couldn't verify", description: res.message, variant: "destructive" });
        return;
      }
      toast({ title: "Registration verified" });
      onResolved?.();
    } catch (e) {
      toast({
        title: "Couldn't verify",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleReject = async () => {
    if (!regId) return;
    const reason = window.prompt(
      "Reject this auto-linked registration? Optionally add a short reason:",
      "",
    );
    if (reason === null) return; // cancelled
    try {
      const res = await rejectMut({ registrationId: regId, reason: reason || undefined }).unwrap();
      if (!res.success) {
        toast({ title: "Couldn't reject", description: res.message, variant: "destructive" });
        return;
      }
      toast({ title: "Registration rejected" });
      onResolved?.();
    } catch (e) {
      toast({
        title: "Couldn't reject",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const references = (entity.coverageReferences ?? "")
    .split("\n")
    .map((r) => r.trim())
    .filter(Boolean);

  return (
    <>
      {showVerifyBanner && (
        <Alert variant="destructive">
          <HomeIcon className="h-4 w-4" />
          <AlertTitle>Verify this home was built by you</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>
              This home was not previously registered and has been auto-linked from the
              customer&rsquo;s request. Please confirm you built this home before continuing.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={handleVerify} disabled={verifying || rejecting}>
                <ShieldCheck className="h-4 w-4 mr-1" />
                {verifying ? "Verifying…" : "Yes, we built this home"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleReject}
                disabled={verifying || rejecting}
              >
                {rejecting ? "Rejecting…" : "No / not ours"}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {showCoverage && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              {entity.coverageVerdict === "LIKELY_COVERED" ? (
                <ShieldCheck className="h-4 w-4" />
              ) : entity.coverageVerdict === "LIKELY_NOT_COVERED" ? (
                <AlertTriangle className="h-4 w-4" />
              ) : (
                <ShieldQuestion className="h-4 w-4" />
              )}
              Warranty / duty-of-care assessment
              <Badge variant={verdictVariant(entity.coverageVerdict)}>
                {verdictLabel(entity.coverageVerdict)}
              </Badge>
              {entity.coverageCategory && (
                <Badge variant="outline">{prettyCategory(entity.coverageCategory)}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {entity.coverageBuilderMessage && (
              <p className="whitespace-pre-line text-foreground">{entity.coverageBuilderMessage}</p>
            )}
            <div className="grid gap-2 md:grid-cols-2">
              {entity.coverageWarrantyBasis && (
                <Field label="Basis" value={entity.coverageWarrantyBasis} />
              )}
              {entity.coverageWarrantyExpiry && (
                <Field label="Warranty expiry" value={entity.coverageWarrantyExpiry} />
              )}
              {typeof entity.coverageConfidence === "number" && (
                <Field
                  label="Confidence"
                  value={`${Math.round((entity.coverageConfidence ?? 0) * 100)}%`}
                />
              )}
              {entity.coverageAssessedAt && (
                <Field
                  label="Assessed"
                  value={new Date(entity.coverageAssessedAt).toLocaleString()}
                />
              )}
            </div>
            {entity.coverageRationale && (
              <details className="text-muted-foreground">
                <summary className="cursor-pointer text-xs font-medium">Reasoning</summary>
                <p className="mt-1 whitespace-pre-line">{entity.coverageRationale}</p>
              </details>
            )}
            {references.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">Sources</p>
                <ul className="mt-1 space-y-0.5">
                  {references.map((r, i) => (
                    <li key={i}>
                      <a
                        className="text-xs underline break-all"
                        href={r}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {r}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Advisory only — an AI-generated guide based on the handover date and the reported
              issue, not a legal determination.
            </p>
          </CardContent>
        </Card>
      )}
    </>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  );
}

function verdictVariant(v?: string | null): "default" | "secondary" | "destructive" | "outline" {
  if (v === "LIKELY_COVERED") return "default";
  if (v === "LIKELY_NOT_COVERED") return "destructive";
  return "secondary";
}

function verdictLabel(v?: string | null): string {
  switch (v) {
    case "LIKELY_COVERED":
      return "Likely covered";
    case "LIKELY_NOT_COVERED":
      return "Likely not covered";
    default:
      return "Uncertain";
  }
}

function prettyCategory(c: string): string {
  return c
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
