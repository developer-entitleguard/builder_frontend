import { useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  History,
  RotateCcw,
  Send,
  Upload,
  XCircle,
} from "lucide-react";
import {
  downloadOnboardingTemplate,
  useCommitBuilderOnboardingMutation,
  useGetBuilderOnboardingStatusQuery,
  useListBuilderOnboardingImportsQuery,
  usePreviewBuilderOnboardingMutation,
  useRollbackBuilderOnboardingMutation,
  type OnboardingPreview,
  type OnboardingRow,
} from "@/store/api/builderOnboarding";

interface PreviewEnvelope {
  success: boolean;
  message: string;
  data: OnboardingPreview;
}
import { format as formatDate } from "date-fns";

/**
 * Bulk-onboarding page. Builders being onboarded to EntitleGuard upload a
 * single spreadsheet containing every project they've handed over and one
 * row per registration (customer/unit). The page walks them through three
 * stages:
 *
 *   1. <b>Download template</b> — CSV or XLSX skeleton with the agreed
 *      column headers + one sample row.
 *   2. <b>Preview</b> — parse the upload server-side without persisting and
 *      show counts + per-row outcomes. Lets the operator catch typos before
 *      a 50-email blast fires.
 *   3. <b>Commit & send invitations</b> — persists rows + sends one
 *      onboarding invitation email per newly created customer.
 *
 * A "History" tab lists previous batches so an operator can audit past
 * imports and roll one back if necessary.
 *
 * Auth: route is gated to ADMINISTRATOR / PROJECT_MANAGER (the same roles
 * that can run the legacy project import). The header doesn't show this
 * link for other roles.
 */
const STATUS_BADGE: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "outline",
  PROCESSING: "outline",
  COMPLETED: "default",
  FAILED: "destructive",
  ROLLED_BACK: "secondary",
};

const ACCEPT_EXTS = [".csv", ".xlsx", ".xls"];

const isAcceptableFile = (file: File): boolean => {
  const lower = file.name.toLowerCase();
  return ACCEPT_EXTS.some((ext) => lower.endsWith(ext));
};

const rowOutcomeBadge = (row: OnboardingRow) => {
  switch (row.status) {
    case "OK":
      return (
        <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">
          New
        </Badge>
      );
    case "DUPLICATE":
      return (
        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
          Duplicate
        </Badge>
      );
    case "ERROR":
      return <Badge variant="destructive">Error</Badge>;
    default:
      return <Badge variant="outline">—</Badge>;
  }
};

const BuilderOnboarding = () => {
  const { toast } = useToast();

  // --- file + preview state ---
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewEnvelope | undefined>(undefined);

  // --- commit + status polling ---
  const [batchId, setBatchId] = useState<string | null>(null);
  const [pollEnabled, setPollEnabled] = useState(false);

  const [previewMutate, { isLoading: previewing }] = usePreviewBuilderOnboardingMutation();
  const [commitMutate, { isLoading: committing }] = useCommitBuilderOnboardingMutation();
  const [rollbackMutate, { isLoading: rollingBack }] = useRollbackBuilderOnboardingMutation();

  const { data: statusResp, refetch: refetchStatus } = useGetBuilderOnboardingStatusQuery(
    { batchId: batchId ?? "" },
    {
      skip: !batchId,
      pollingInterval: pollEnabled ? 2000 : 0,
    },
  );
  const status = statusResp?.data;

  const { data: importsResp, refetch: refetchImports } = useListBuilderOnboardingImportsQuery();
  const imports = importsResp?.data ?? [];

  // Stop polling once the batch reaches a terminal state.
  useEffect(() => {
    if (!status) return;
    if (
      status.status === "COMPLETED" ||
      status.status === "FAILED" ||
      status.status === "ROLLED_BACK"
    ) {
      setPollEnabled(false);
      refetchImports();
    }
  }, [status, refetchImports]);

  const previewData = preview?.data;

  const errorRows = useMemo(() => {
    if (!status?.errorReport) return [];
    try {
      const parsed = JSON.parse(status.errorReport);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [status?.errorReport]);

  // --- handlers ---

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.files?.[0];
    if (!next) return;
    if (!isAcceptableFile(next)) {
      toast({
        title: "Unsupported file type",
        description: "Upload a .csv, .xlsx or .xls file.",
        variant: "destructive",
      });
      e.target.value = "";
      return;
    }
    setFile(next);
    setPreview(undefined);
    setBatchId(null);
    setPollEnabled(false);
    e.target.value = "";
  };

  const handleDownload = async (fmt: "csv" | "xlsx") => {
    try {
      await downloadOnboardingTemplate(fmt);
    } catch (e) {
      toast({
        title: "Template download failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handlePreview = async () => {
    if (!file) {
      toast({ title: "Pick a file first" });
      return;
    }
    try {
      const res = await previewMutate({ file }).unwrap();
      if (!res.success) {
        toast({
          title: "Preview failed",
          description: res.message,
          variant: "destructive",
        });
        return;
      }
      setPreview(res);
      toast({
        title: "Preview ready",
        description: `${res.data.newRegistrationCount} new · ${res.data.duplicateCount} duplicate · ${res.data.errorCount} errors`,
      });
    } catch (e) {
      const message = typeof e === "object" && e && "data" in e
        ? String((e as { data?: unknown }).data ?? "")
        : e instanceof Error
          ? e.message
          : "Unknown error";
      toast({ title: "Preview failed", description: message, variant: "destructive" });
    }
  };

  const handleCommit = async () => {
    if (!file) {
      toast({ title: "Pick a file first" });
      return;
    }
    if (!previewData) {
      toast({
        title: "Preview before sending",
        description: "Run preview first so you can confirm what gets created.",
        variant: "destructive",
      });
      return;
    }
    if (previewData.newRegistrationCount === 0) {
      toast({
        title: "Nothing to import",
        description: "All rows are either duplicates or errors.",
        variant: "destructive",
      });
      return;
    }
    const confirmMsg =
      `This will create ${previewData.newRegistrationCount} registration(s) ` +
      `across ${previewData.projectCount} project(s), and email each new customer ` +
      `an invitation to download the app. Continue?`;
    if (!window.confirm(confirmMsg)) {
      return;
    }
    try {
      const res = await commitMutate({ file }).unwrap();
      if (!res.success) {
        toast({
          title: "Commit failed",
          description: res.message,
          variant: "destructive",
        });
        return;
      }
      setBatchId(res.data.batchId);
      setPollEnabled(true);
      toast({
        title: "Import queued",
        description: `Batch ${res.data.batchId.slice(0, 8)}… processing in the background`,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error";
      toast({ title: "Commit failed", description: message, variant: "destructive" });
    }
  };

  const handleRollback = async (id: string) => {
    if (
      !window.confirm(
        "Roll back this import? Created projects and registrations will be marked inactive. " +
          "Emails already sent cannot be recalled.",
      )
    ) {
      return;
    }
    try {
      const res = await rollbackMutate({ batchId: id }).unwrap();
      toast({
        title: res.success ? "Rollback complete" : "Rollback failed",
        description: res.message,
        variant: res.success ? "default" : "destructive",
      });
      refetchStatus();
      refetchImports();
    } catch (e) {
      toast({
        title: "Rollback failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileSpreadsheet className="h-7 w-7" />
            Bulk Onboarding
          </h1>
          <p className="text-muted-foreground mt-1">
            Upload your past projects and registrations from a spreadsheet, then
            invite every customer to download the EntitleGuard app.
          </p>
        </div>

        <Tabs defaultValue="upload">
          <TabsList>
            <TabsTrigger value="upload">
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="h-4 w-4 mr-2" />
              History
            </TabsTrigger>
          </TabsList>

          {/* ── Upload tab ─────────────────────────────────────────────── */}
          <TabsContent value="upload" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>1. Download the template</CardTitle>
                <CardDescription>
                  One row per registration. Repeat the project columns for each
                  unit of the same project (1 row for a house, 2 for a duplex,
                  N for an apartment block).
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => handleDownload("csv")}>
                  <Download className="h-4 w-4 mr-2" />
                  CSV template
                </Button>
                <Button variant="outline" onClick={() => handleDownload("xlsx")}>
                  <Download className="h-4 w-4 mr-2" />
                  Excel template
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>2. Upload and preview</CardTitle>
                <CardDescription>
                  We'll parse the file and show you what will be created. No
                  data is saved and no emails are sent at this step.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="onboarding-file">Spreadsheet</Label>
                  <Input
                    id="onboarding-file"
                    type="file"
                    accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    onChange={handleFileChange}
                  />
                  {file && (
                    <p className="text-xs text-muted-foreground">
                      Selected: <span className="font-medium">{file.name}</span>{" "}
                      ({Math.ceil(file.size / 1024)} KB)
                    </p>
                  )}
                </div>
                <Button onClick={handlePreview} disabled={!file || previewing}>
                  {previewing ? "Parsing…" : "Preview"}
                </Button>
              </CardContent>
            </Card>

            {previewData && (
              <Card>
                <CardHeader>
                  <CardTitle>Preview</CardTitle>
                  <CardDescription>
                    Inspect the parsed rows below. Duplicates are skipped; errors
                    are excluded from the commit.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <StatCard
                      label="Total rows"
                      value={previewData.totalRows}
                    />
                    <StatCard
                      label="Projects"
                      value={previewData.projectCount}
                    />
                    <StatCard
                      label="New"
                      value={previewData.newRegistrationCount}
                      tone="success"
                    />
                    <StatCard
                      label="Duplicates"
                      value={previewData.duplicateCount}
                      tone="warning"
                    />
                    <StatCard
                      label="Errors"
                      value={previewData.errorCount}
                      tone={previewData.errorCount > 0 ? "danger" : undefined}
                    />
                  </div>

                  <div className="border rounded-md max-h-[420px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">Row</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Project</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Unit</TableHead>
                          <TableHead>Issue</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewData.rows.map((r) => (
                          <TableRow key={r.rowNumber}>
                            <TableCell className="font-mono text-xs">
                              {r.rowNumber}
                            </TableCell>
                            <TableCell>{rowOutcomeBadge(r)}</TableCell>
                            <TableCell className="max-w-[160px] truncate">
                              {r.projectName || "—"}
                            </TableCell>
                            <TableCell className="max-w-[160px] truncate">
                              {[r.customerFirstName, r.customerLastName]
                                .filter(Boolean)
                                .join(" ") || "—"}
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate text-xs">
                              {r.customerEmail || "—"}
                            </TableCell>
                            <TableCell>{r.unitNumber || "—"}</TableCell>
                            <TableCell className="max-w-[220px] truncate text-xs text-muted-foreground">
                              {r.error || ""}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <p className="text-sm text-muted-foreground">
                      Once you click <strong>Send invitations</strong>,
                      registrations are created and one invitation email goes
                      out per new customer. Emails cannot be recalled.
                    </p>
                    <Button
                      onClick={handleCommit}
                      disabled={
                        committing ||
                        !previewData ||
                        previewData.newRegistrationCount === 0
                      }
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {committing
                        ? "Submitting…"
                        : `Send invitations (${previewData.newRegistrationCount})`}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {batchId && (
              <Card>
                <CardHeader>
                  <CardTitle>3. Processing</CardTitle>
                  <CardDescription>
                    Batch {batchId.slice(0, 8)}… is processing in the
                    background. This page polls every 2 seconds.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge variant={STATUS_BADGE[status?.status ?? "PENDING"] ?? "outline"}>
                      {status?.status ?? "PENDING"}
                    </Badge>
                    {status?.status === "COMPLETED" && (
                      <span className="flex items-center text-sm text-green-700">
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Imported {status.processedCount ?? 0} registration(s)
                      </span>
                    )}
                  </div>
                  {!status && <Skeleton className="h-12 w-full" />}
                  {status && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <StatCard label="Processed" value={status.processedCount ?? 0} />
                      <StatCard
                        label="Errors"
                        value={status.errorCount ?? 0}
                        tone={
                          (status.errorCount ?? 0) > 0 ? "danger" : undefined
                        }
                      />
                      <StatCard
                        label="File"
                        value={status.filePath ?? "—"}
                        isString
                      />
                    </div>
                  )}
                  {errorRows.length > 0 && (
                    <div className="border rounded-md p-3 text-xs space-y-1 max-h-[160px] overflow-y-auto">
                      <p className="font-medium mb-1 flex items-center">
                        <AlertTriangle className="h-3.5 w-3.5 mr-1 text-yellow-600" />
                        Row issues
                      </p>
                      {errorRows.map((row, idx) => (
                        <div key={idx} className="text-muted-foreground">
                          {typeof row === "object"
                            ? `Line ${(row as { line: number }).line} (${(row as { type?: string }).type ?? "ERROR"}): ${(row as { error: string }).error}`
                            : String(row)}
                        </div>
                      ))}
                    </div>
                  )}
                  {status?.status === "COMPLETED" && (
                    <Button
                      variant="outline"
                      onClick={() => handleRollback(batchId)}
                      disabled={rollingBack}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      {rollingBack ? "Rolling back…" : "Roll back this batch"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── History tab ────────────────────────────────────────────── */}
          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Previous imports</CardTitle>
                <CardDescription>
                  Every bulk-onboarding run for this builder organisation.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {imports.length === 0 && (
                  <p className="text-sm text-muted-foreground py-6 text-center">
                    No imports yet.
                  </p>
                )}
                {imports.length > 0 && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Batch</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Processed</TableHead>
                        <TableHead>Errors</TableHead>
                        <TableHead>File</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="w-32" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {imports.map((row) => (
                        <TableRow key={row.batchId}>
                          <TableCell className="font-mono text-xs">
                            {row.batchId.slice(0, 8)}…
                          </TableCell>
                          <TableCell>
                            <Badge variant={STATUS_BADGE[row.status] ?? "outline"}>
                              {row.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{row.processedCount ?? 0}</TableCell>
                          <TableCell>
                            {row.errorCount ?? 0}
                            {(row.errorCount ?? 0) > 0 && (
                              <XCircle className="inline-block h-3.5 w-3.5 ml-1 text-red-500" />
                            )}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate text-xs">
                            {row.filePath ?? "—"}
                          </TableCell>
                          <TableCell className="text-xs">
                            {row.createdAt
                              ? formatDate(new Date(row.createdAt), "yyyy-MM-dd HH:mm")
                              : "—"}
                          </TableCell>
                          <TableCell>
                            {row.status === "COMPLETED" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRollback(row.batchId)}
                                disabled={rollingBack}
                              >
                                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                                Rollback
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

interface StatCardProps {
  label: string;
  value: number | string;
  tone?: "success" | "warning" | "danger";
  isString?: boolean;
}

const StatCard = ({ label, value, tone, isString }: StatCardProps) => {
  const toneClass =
    tone === "success"
      ? "text-green-700"
      : tone === "warning"
        ? "text-yellow-700"
        : tone === "danger"
          ? "text-red-700"
          : "text-foreground";
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p
        className={`mt-1 font-semibold ${toneClass} ${isString ? "text-sm truncate" : "text-2xl"}`}
        title={String(value)}
      >
        {value}
      </p>
    </div>
  );
};

export default BuilderOnboarding;
