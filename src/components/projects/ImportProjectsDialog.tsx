import { useEffect, useMemo, useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Download, RotateCcw, Upload } from "lucide-react";
import {
  useGetProjectImportStatusQuery,
  useRollbackProjectImportMutation,
  useUploadProjectsMutation,
} from "@/store/api/projectImport";
import { useProjectImportTemplateDownload } from "@/lib/api/services/templateDownload";

interface ImportProjectsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  builderId: string | undefined;
  /** Called after a successful upload — typically refetches the projects list. */
  onCompleted?: () => void;
}

const STATUS_BADGE: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "outline",
  PROCESSING: "outline",
  COMPLETED: "default",
  FAILED: "destructive",
  ROLLED_BACK: "secondary",
};

export const ImportProjectsDialog = ({
  open,
  onOpenChange,
  builderId,
  onCompleted,
}: ImportProjectsDialogProps) => {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [pollEnabled, setPollEnabled] = useState(false);

  const [uploadProjects, { isLoading: uploading }] = useUploadProjectsMutation();
  const [rollback, { isLoading: rollingBack }] = useRollbackProjectImportMutation();
  const { download: downloadTemplate, isLoading: downloadingTemplate } =
    useProjectImportTemplateDownload();

  const { data: statusResp, refetch: refetchStatus } = useGetProjectImportStatusQuery(
    { batchId: batchId ?? "" },
    {
      skip: !batchId,
      pollingInterval: pollEnabled ? 2000 : 0,
    },
  );
  const status = statusResp?.data;

  // Reset everything whenever the dialog closes.
  useEffect(() => {
    if (!open) {
      setFile(null);
      setBatchId(null);
      setPollEnabled(false);
    }
  }, [open]);

  // Stop polling once the batch reaches a terminal state, and notify the parent.
  useEffect(() => {
    if (!status) return;
    if (
      status.status === "COMPLETED" ||
      status.status === "FAILED" ||
      status.status === "ROLLED_BACK"
    ) {
      setPollEnabled(false);
      if (status.status === "COMPLETED") {
        onCompleted?.();
      }
    }
  }, [status, onCompleted]);

  const errorRows = useMemo(() => {
    if (!status?.errorReport) return [];
    try {
      const parsed = JSON.parse(status.errorReport);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [status?.errorReport]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.files?.[0];
    if (!next) return;
    if (!next.name.toLowerCase().endsWith(".csv")) {
      toast({
        title: "Invalid file type",
        description: "Please upload a CSV file",
        variant: "destructive",
      });
      e.target.value = "";
      return;
    }
    setFile(next);
    e.target.value = "";
  };

  const handleUpload = async () => {
    if (!file) {
      toast({ title: "Pick a CSV first" });
      return;
    }
    if (!builderId) {
      toast({
        title: "No organisation selected",
        description: "Pick an organisation before uploading.",
        variant: "destructive",
      });
      return;
    }
    try {
      const res = await uploadProjects({ builderId, file }).unwrap();
      if (!res.success) {
        toast({ title: "Upload failed", description: res.message, variant: "destructive" });
        return;
      }
      setBatchId(res.data.batchId);
      setPollEnabled(true);
      toast({ title: "Upload queued", description: `Batch ${res.data.batchId.slice(0, 8)}…` });
    } catch (e) {
      toast({
        title: "Upload failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleRollback = async () => {
    if (!batchId) return;
    if (
      !window.confirm(
        "Roll back this import? Created projects, customers and BOMs will be marked inactive.",
      )
    ) {
      return;
    }
    try {
      const res = await rollback({ batchId }).unwrap();
      toast({
        title: res.success ? "Rollback complete" : "Rollback failed",
        description: res.message,
      });
      refetchStatus();
      if (res.success) {
        onCompleted?.();
      }
    } catch (e) {
      toast({
        title: "Rollback failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Import Projects from CSV</DialogTitle>
          <DialogDescription>
            Bulk-create projects, registrations and BOM rows from a single spreadsheet.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>1. Download the template</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={downloadTemplate}
              disabled={downloadingTemplate}
            >
              <Download className="h-4 w-4 mr-2" />
              project-import-template.csv
            </Button>
            <p className="text-xs text-muted-foreground">
              Columns:{" "}
              <code>
                projectName, projectDescription, startDate, targetEndDate, propertyType,
                customerFirstName, customerLastName, customerEmail, customerContact,
                customerAddress, customerCity, customerState, customerPostcode, bomName, bomItem
              </code>
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-csv">2. Upload completed CSV</Label>
            <Input
              id="project-csv"
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
            />
            {file && (
              <p className="text-xs text-muted-foreground">
                Selected file: <span className="font-medium">{file.name}</span>
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Processing runs in the background. Status polls every 2 seconds.
            </p>
          </div>

          {batchId && (
            <div className="border rounded-md p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Batch {batchId.slice(0, 8)}…</p>
                {status && (
                  <Badge variant={STATUS_BADGE[status.status] ?? "outline"}>
                    {status.status}
                  </Badge>
                )}
              </div>
              {!status && <Skeleton className="h-12" />}
              {status && (
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Processed</p>
                    <p className="font-medium">{status.processedCount ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Errors</p>
                    <p className="font-medium">{status.errorCount ?? 0}</p>
                  </div>
                </div>
              )}
              {errorRows.length > 0 && (
                <div className="border rounded-md p-2 text-xs space-y-1 max-h-[160px] overflow-y-auto">
                  {errorRows.map((row, idx) => (
                    <div key={idx} className="text-muted-foreground">
                      {typeof row === "object"
                        ? `Line ${(row as { line: number }).line}: ${(row as { error: string }).error}`
                        : String(row)}
                    </div>
                  ))}
                </div>
              )}
              {status?.status === "COMPLETED" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRollback}
                  disabled={rollingBack}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  {rollingBack ? "Rolling back…" : "Rollback this batch"}
                </Button>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={handleUpload} disabled={uploading || !file || !builderId}>
            <Upload className="h-4 w-4 mr-2" />
            {uploading ? "Uploading…" : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImportProjectsDialog;
