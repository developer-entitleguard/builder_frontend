import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Download, RotateCcw, Upload } from "lucide-react";
import type { DirectoryImportResult } from "@/store/api/directoryImport";

/** Human wording for the resolver's warning codes, shared by both directories. */
const WARNING_LABELS: Record<string, string> = {
  INVALID_PHONE: "phone number isn't a valid Australian format",
  INVALID_ABN: "ABN isn't 11 digits",
  AMBIGUOUS_NAME: "matched on name alone — more than one record answers to it",
  DUPLICATE_EMAIL: "more than one record has this email",
  DUPLICATE_IDENTITY: "more than one record shares this ABN or email",
  DEFAULTED_TYPE: "type was blank — imported with the default",
  ENRICHED: "filled in blank fields on the existing record",
};

export interface DirectoryImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** "vendor" | "supplier" — drives labels and which counts are read. */
  kind: "vendor" | "supplier";
  onDownloadTemplate: () => void | Promise<void>;
  downloadingTemplate: boolean;
  onUpload: (file: File, dryRun: boolean) => Promise<DirectoryImportResult | null>;
  uploading: boolean;
  onRollback: (batchId: string) => Promise<boolean>;
  rollingBack: boolean;
  /** Called after a committed import or a rollback, to refresh the list. */
  onCompleted?: () => void;
}

/**
 * Two-step CSV import for the vendor and supplier directories.
 *
 * <p>The upload is always previewed first ({@code dryRun}) and only committed
 * once the operator has seen what it will create — these files add records to
 * the whole organisation, and for internal vendors they provision logins, so
 * "upload and find out" is the wrong default.
 *
 * <p>After a committed import the batch stays on screen with an Undo, which
 * deactivates only the records this import created. Records it merely matched
 * are left alone.
 */
export const DirectoryImportDialog = ({
  open,
  onOpenChange,
  kind,
  onDownloadTemplate,
  downloadingTemplate,
  onUpload,
  uploading,
  onRollback,
  rollingBack,
  onCompleted,
}: DirectoryImportDialogProps) => {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<DirectoryImportResult | null>(null);
  const [committed, setCommitted] = useState<DirectoryImportResult | null>(null);

  const noun = kind === "vendor" ? "vendor" : "supplier";
  const nounPlural = kind === "vendor" ? "vendors" : "suppliers";

  useEffect(() => {
    if (!open) {
      setFile(null);
      setPreview(null);
      setCommitted(null);
    }
  }, [open]);

  const created = (r: DirectoryImportResult) =>
    (kind === "vendor" ? r.vendorsCreated : r.suppliersCreated) ?? 0;
  const matched = (r: DirectoryImportResult) =>
    (kind === "vendor" ? r.vendorsMatched : r.suppliersMatched) ?? 0;

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const chosen = event.target.files?.[0];
    event.target.value = "";
    if (!chosen) return;
    if (!chosen.name.toLowerCase().endsWith(".csv")) {
      toast({
        title: "Invalid file type",
        description: "Please upload a CSV file",
        variant: "destructive",
      });
      return;
    }
    setFile(chosen);
    setPreview(null);
    setCommitted(null);
  };

  const handlePreview = async () => {
    if (!file) return;
    const result = await onUpload(file, true);
    if (result) setPreview(result);
  };

  const handleCommit = async () => {
    if (!file) return;
    const result = await onUpload(file, false);
    if (!result) return;
    setCommitted(result);
    setPreview(null);
    toast({
      title: `${nounPlural[0].toUpperCase()}${nounPlural.slice(1)} imported`,
      description: `${created(result)} added, ${matched(result)} matched to existing records.`,
    });
    onCompleted?.();
  };

  const handleUndo = async () => {
    if (!committed?.batchId) return;
    const ok = await onRollback(committed.batchId);
    if (ok) {
      setCommitted(null);
      setFile(null);
      onCompleted?.();
      onOpenChange(false);
    }
  };

  const result = committed ?? preview;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import {nounPlural} from CSV</DialogTitle>
          <DialogDescription>
            {kind === "vendor"
              ? "Rows are matched against your directory by email, then phone, then name. Anything with no match is added."
              : "Rows are matched against your directory by ABN, then email, then phone, then name. Anything with no match is added."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!committed && (
            <div className="space-y-2">
              <Label htmlFor={`${kind}-csv`}>CSV file</Label>
              <Input id={`${kind}-csv`} type="file" accept=".csv" onChange={handleFileChange} />
              {file && (
                <p className="text-xs text-muted-foreground">
                  Selected: <span className="font-medium">{file.name}</span>
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Required column: <strong>name</strong>. Columns are matched by heading, so the
                order doesn't matter.
              </p>
              {kind === "vendor" && (
                <p className="text-xs text-muted-foreground">
                  Internal vendors need an email so their login can be created. Separate multiple
                  specializations with semicolons.
                </p>
              )}
            </div>
          )}

          {result && (
            <div className="space-y-3 rounded-md border p-3 text-sm">
              <p className="font-medium">
                {committed ? "Imported" : "Preview — nothing has been saved yet"}
              </p>
              <ul className="space-y-1">
                {matched(result) > 0 && (
                  <li>
                    <strong>{matched(result)}</strong> existing{" "}
                    {matched(result) === 1 ? noun : nounPlural} matched.
                  </li>
                )}
                <li>
                  <strong>{created(result)}</strong> new{" "}
                  {created(result) === 1 ? noun : nounPlural}{" "}
                  {committed ? "added to" : "will be added to"} your directory.
                </li>
                {kind === "vendor" && (result.internalLoginsProvisioned ?? 0) > 0 && (
                  <li>
                    <strong>{result.internalLoginsProvisioned}</strong> internal{" "}
                    {result.internalLoginsProvisioned === 1 ? "login" : "logins"}{" "}
                    {committed ? "created" : "will be created"} — no email is sent. Use the invite
                    action on each vendor when you're ready.
                  </li>
                )}
                {result.errorCount > 0 && (
                  <li className="text-destructive">
                    <strong>{result.errorCount}</strong>{" "}
                    {result.errorCount === 1 ? "row was" : "rows were"} skipped.
                  </li>
                )}
              </ul>

              {result.errors.length > 0 && (
                <div className="max-h-40 overflow-y-auto rounded border border-destructive/40 bg-destructive/5 p-2">
                  <p className="font-medium">Skipped rows</p>
                  <ul className="mt-1 space-y-1 text-xs">
                    {result.errors.slice(0, 20).map((e, i) => (
                      <li key={`${e.line}-${i}`}>
                        Line {e.line}
                        {e.subject ? ` (${e.subject})` : ""} — {e.error}
                      </li>
                    ))}
                  </ul>
                  {result.errors.length > 20 && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      …and {result.errors.length - 20} more.
                    </p>
                  )}
                </div>
              )}

              {result.warnings.length > 0 && (
                <div className="max-h-40 overflow-y-auto rounded border border-amber-300/60 bg-amber-50 p-2 dark:border-amber-500/30 dark:bg-amber-950/30">
                  <p className="font-medium">Worth checking</p>
                  <ul className="mt-1 space-y-1 text-xs">
                    {result.warnings.slice(0, 20).map((w, i) => (
                      <li key={`${w.line}-${w.warning}-${i}`}>
                        <span className="font-medium">{w.subject || `Line ${w.line}`}</span> —{" "}
                        {WARNING_LABELS[w.warning] ?? w.warning}
                      </li>
                    ))}
                  </ul>
                  {result.warnings.length > 20 && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      …and {result.warnings.length - 20} more.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex-wrap gap-2 sm:justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void onDownloadTemplate()}
            disabled={downloadingTemplate}
          >
            <Download className="mr-2 h-4 w-4" />
            {downloadingTemplate ? "Downloading…" : "Download template"}
          </Button>

          <div className="flex gap-2">
            {committed ? (
              <>
                {committed.batchId && created(committed) > 0 && (
                  <Button variant="outline" onClick={handleUndo} disabled={rollingBack}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    {rollingBack ? "Undoing…" : "Undo import"}
                  </Button>
                )}
                <Button onClick={() => onOpenChange(false)}>Done</Button>
              </>
            ) : preview ? (
              <>
                <Button variant="outline" onClick={() => setPreview(null)} disabled={uploading}>
                  Back
                </Button>
                <Button onClick={handleCommit} disabled={uploading || created(preview) + matched(preview) === 0}>
                  <Upload className="mr-2 h-4 w-4" />
                  {uploading ? "Importing…" : "Import"}
                </Button>
              </>
            ) : (
              <Button onClick={handlePreview} disabled={!file || uploading}>
                {uploading ? "Checking…" : "Preview import"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DirectoryImportDialog;
