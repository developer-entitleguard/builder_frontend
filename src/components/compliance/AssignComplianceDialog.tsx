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
import { Loader2 } from "lucide-react";
import type {
  ComplianceAssignBody,
  ComplianceDocumentApi,
} from "@/store/api/complianceDocuments";

interface AssignComplianceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: ComplianceDocumentApi | null;
  isSaving: boolean;
  onAssign: (body: ComplianceAssignBody) => Promise<void>;
}

/**
 * Activity ↔ Job ↔ Compliance Integration PRD (Phase A). Assign a required
 * compliance line out to a trade/auditor. We collect an off-platform contact
 * (name + email) — this spawns the expecting Job and fires the viral invite
 * loop. When the trade later attaches their certificate to that job, this line
 * auto-flips to RECEIVED with the file attached (no re-upload by the builder).
 */
export const AssignComplianceDialog = ({
  open,
  onOpenChange,
  document,
  isSaving,
  onAssign,
}: AssignComplianceDialogProps) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (open) {
      setName("");
      setEmail("");
    }
  }, [open]);

  const canSubmit = email.trim().length > 0;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    await onAssign({
      assigneeName: name.trim() || null,
      assigneeEmail: email.trim(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !isSaving && onOpenChange(next)}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Assign to a trade / auditor</DialogTitle>
          <DialogDescription>
            {document
              ? `Send "${document.documentName}" to the trade or auditor who will produce it. When they upload their certificate, this line is marked received automatically.`
              : "Send this compliance document to the trade or auditor who will produce it."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="assignee-name" className="text-xs text-muted-foreground">
              Contact name
            </Label>
            <Input
              id="assignee-name"
              className="mt-1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Joe's Electrical"
            />
          </div>
          <div>
            <Label htmlFor="assignee-email" className="text-xs text-muted-foreground">
              Contact email
            </Label>
            <Input
              id="assignee-email"
              type="email"
              className="mt-1"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving || !canSubmit}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Assigning…
              </>
            ) : (
              "Assign"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
