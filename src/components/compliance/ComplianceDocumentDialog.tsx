import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import type {
  ComplianceDocumentApi,
  ComplianceDocumentBody,
} from "@/store/api/complianceDocuments";
import {
  MANDATORY_OPTIONS,
  STATUS_OPTIONS,
  mandatoryLabel,
  statusLabel,
} from "./complianceConstants";

interface ComplianceDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // When editing, the existing document; null for create.
  document: ComplianceDocumentApi | null;
  isSaving: boolean;
  onSave: (body: ComplianceDocumentBody) => Promise<void>;
}

const emptyForm: ComplianceDocumentBody = {
  documentName: "",
  category: "",
  description: "",
  mandatory: "REQUIRED",
  issuer: "",
  appliesTo: "",
  status: "REQUIRED",
  notes: "",
};

export const ComplianceDocumentDialog = ({
  open,
  onOpenChange,
  document,
  isSaving,
  onSave,
}: ComplianceDocumentDialogProps) => {
  const [form, setForm] = useState<ComplianceDocumentBody>(emptyForm);

  useEffect(() => {
    if (!open) return;
    if (document) {
      setForm({
        documentName: document.documentName ?? "",
        category: document.category ?? "",
        description: document.description ?? "",
        mandatory: document.mandatory ?? "REQUIRED",
        issuer: document.issuer ?? "",
        appliesTo: document.appliesTo ?? "",
        status: document.status ?? "REQUIRED",
        notes: document.notes ?? "",
        orderIndex: document.orderIndex ?? undefined,
      });
    } else {
      setForm(emptyForm);
    }
  }, [open, document]);

  const update = <K extends keyof ComplianceDocumentBody>(
    key: K,
    value: ComplianceDocumentBody[K]
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!form.documentName.trim()) return;
    await onSave({ ...form, documentName: form.documentName.trim() });
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !isSaving && onOpenChange(next)}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>
            {document ? "Edit compliance document" : "Add compliance document"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="cd-name">Document name *</Label>
            <Input
              id="cd-name"
              value={form.documentName}
              onChange={(e) => update("documentName", e.target.value)}
              placeholder="e.g. Occupation Certificate"
              disabled={isSaving}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cd-category">Category</Label>
              <Input
                id="cd-category"
                value={form.category ?? ""}
                onChange={(e) => update("category", e.target.value)}
                placeholder="e.g. Certificates"
                disabled={isSaving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cd-issuer">Issuer</Label>
              <Input
                id="cd-issuer"
                value={form.issuer ?? ""}
                onChange={(e) => update("issuer", e.target.value)}
                placeholder="e.g. Principal Certifier"
                disabled={isSaving}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Requirement</Label>
              <Select
                value={form.mandatory ?? "REQUIRED"}
                onValueChange={(v) => update("mandatory", v)}
                disabled={isSaving}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MANDATORY_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {mandatoryLabel(opt)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={form.status ?? "REQUIRED"}
                onValueChange={(v) => update("status", v)}
                disabled={isSaving}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {statusLabel(opt)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cd-applies">Applies to</Label>
            <Input
              id="cd-applies"
              value={form.appliesTo ?? ""}
              onChange={(e) => update("appliesTo", e.target.value)}
              placeholder="e.g. All dwellings"
              disabled={isSaving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cd-description">Description</Label>
            <Textarea
              id="cd-description"
              value={form.description ?? ""}
              onChange={(e) => update("description", e.target.value)}
              rows={2}
              disabled={isSaving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cd-notes">Notes</Label>
            <Textarea
              id="cd-notes"
              value={form.notes ?? ""}
              onChange={(e) => update("notes", e.target.value)}
              rows={2}
              disabled={isSaving}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !form.documentName.trim()}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving…
              </>
            ) : document ? (
              "Save changes"
            ) : (
              "Add document"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
