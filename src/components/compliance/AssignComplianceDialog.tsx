import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Building2, Loader2, Mail } from "lucide-react";
import {
  useLazyLookupAssigneeOrgQuery,
  type AssigneeLookupApi,
  type ComplianceAssignBody,
  type ComplianceDocumentApi,
} from "@/store/api/complianceDocuments";

interface AssignComplianceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: ComplianceDocumentApi | null;
  isSaving: boolean;
  onAssign: (body: ComplianceAssignBody) => Promise<void>;
  /**
   * Per-unit assignment: when there is no single `document` (assigning a per-unit
   * TYPE across all units), pass the type name here plus a note explaining the
   * fan-out so the copy reads correctly.
   */
  documentLabel?: string;
  helperNote?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Compliance Document Assignment. Assign a compliance line by email. As the
 * builder types, we resolve the email to an EntitleGuard org (TRADE/MERCHANT):
 *  - matched  → assign to the whole org; anyone there can fulfil it.
 *  - no match → off-platform contact; they get a 30-day magic link to upload
 *    without logging in.
 * Either way, when the assignee uploads, the line goes to SUBMITTED and waits
 * for the builder to approve.
 */
export const AssignComplianceDialog = ({
  open,
  onOpenChange,
  document,
  isSaving,
  onAssign,
  documentLabel,
  helperNote,
}: AssignComplianceDialogProps) => {
  const docLabel = document?.documentName ?? documentLabel;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [match, setMatch] = useState<AssigneeLookupApi | null>(null);
  const [triggerLookup, { isFetching: isLooking }] = useLazyLookupAssigneeOrgQuery();

  useEffect(() => {
    if (open) {
      setName("");
      setEmail("");
      setMatch(null);
    }
  }, [open]);

  // Debounced email → org resolution.
  useEffect(() => {
    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) {
      setMatch(null);
      return;
    }
    const handle = setTimeout(async () => {
      try {
        const res = await triggerLookup(trimmed).unwrap();
        setMatch(res?.data ?? null);
      } catch {
        setMatch(null);
      }
    }, 400);
    return () => clearTimeout(handle);
  }, [email, triggerLookup]);

  const emailValid = EMAIL_RE.test(email.trim());
  const canSubmit = emailValid && !isSaving;
  const isOrg = !!match?.matched;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    if (isOrg && match) {
      await onAssign({
        assigneeOrgType: match.orgType,
        assigneeOrgId: match.orgId,
      });
    } else {
      await onAssign({
        assigneeName: name.trim() || null,
        assigneeEmail: email.trim(),
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !isSaving && onOpenChange(next)}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Assign compliance document</DialogTitle>
          <DialogDescription>
            {docLabel
              ? `Assign "${docLabel}" to whoever will provide it. Enter their email — if they're on EntitleGuard we route it to their organisation, otherwise they get a link to upload.`
              : "Assign this compliance document to whoever will provide it."}
          </DialogDescription>
        </DialogHeader>
        {helperNote && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {helperNote}
          </div>
        )}
        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="assignee-email" className="text-xs text-muted-foreground">
              Contact email
            </Label>
            <div className="relative mt-1">
              <Input
                id="assignee-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
              />
              {isLooking && (
                <Loader2 className="h-4 w-4 animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              )}
            </div>
          </div>

          {/* Resolution result */}
          {emailValid && !isLooking && isOrg && (
            <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              <Building2 className="h-4 w-4 shrink-0" />
              <span>
                Assign to <strong>{match?.orgName}</strong> ({match?.orgType?.toLowerCase()}) — anyone
                on their team can complete it.
              </span>
            </div>
          )}
          {emailValid && !isLooking && !isOrg && (
            <div className="flex items-center gap-2 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800">
              <Mail className="h-4 w-4 shrink-0" />
              <span>Not on EntitleGuard — they'll get a link to upload (valid 30 days).</span>
            </div>
          )}

          {/* Contact name only relevant for the off-platform case */}
          {emailValid && !isOrg && (
            <div>
              <Label htmlFor="assignee-name" className="text-xs text-muted-foreground">
                Contact name (optional)
              </Label>
              <Input
                id="assignee-name"
                className="mt-1"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Joe's Electrical"
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Assigning…
              </>
            ) : isOrg ? (
              "Assign to organisation"
            ) : (
              "Send upload link"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
