import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  Send,
  Check,
  Upload,
  Cloud,
  FileText,
  X,
  ArrowLeft,
  Clock,
} from "lucide-react";
import { getApiBaseUrl } from "@/lib/config";
import { viewPhotoUrl } from "@/lib/api/services/files";
import {
  ATTACHMENT_ACCEPT,
  ATTACHMENT_HELP_TEXT,
  classifyAttachment,
  validateAttachmentBatch,
} from "@/lib/queryAttachments";

interface VendorQueryData {
  id: string;
  title: string;
  description: string;
  priorityLevel: string;
  dueDate: string | null;
  status: { id: string; name: string; module: string };
  customerName?: string;
  customerEmail?: string;
  customerContact?: string;
  customerCity?: string;
  customerAddress?: string;
  customerState?: string;
  customerZip?: string;
  createdAt: string;
  queryComments?: Array<{
    id: string;
    commentedBy: string;
    comment: string;
    createdAt: string;
  }>;
  queryFileMaps?: Array<{
    id: string;
    type: string;
    files: { id: string; name: string; fileType?: string; filePath?: string };
  }>;
  orderItem?: {
    productName?: string;
    brand?: string;
    order?: {
      shipToAddress?: {
        street?: string;
        apt?: string;
        city?: string;
        state?: string;
        zipCode?: string;
      };
      customerSourceMap?: {
        customer?: {
          name?: string;
          email?: string;
          contact?: string;
          address?: { city?: string; state?: string; street?: string; zipCode?: string };
        };
      };
    };
  };
}

interface StatusOption {
  id: string;
  name: string;
  module: string;
}

interface VendorJob {
  id: string;
  title: string;
  scope?: string | null;
  status: string;
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
}

function jobStatusColor(status: string) {
  switch (status) {
    case "ASSIGNED":
      return "bg-blue-100 text-blue-800";
    case "IN_PROGRESS":
      return "bg-yellow-100 text-yellow-800";
    case "COMPLETED":
      return "bg-green-100 text-green-800";
    case "CANCELLED":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

function getPriorityColor(priority: string) {
  switch (priority?.toUpperCase()) {
    case "LOW":
      return "bg-green-100 text-green-800";
    case "MEDIUM":
      return "bg-yellow-100 text-yellow-800";
    case "HIGH":
      return "bg-red-100 text-red-800";
    case "CRITICAL":
      return "bg-red-200 text-red-900";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

function isComplete(statusName?: string) {
  const upper = (statusName ?? "").toUpperCase().replace(/\s+/g, "_");
  return upper === "COMPLETED" || upper === "DONE";
}

const VendorQuery = () => {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const token = searchParams.get("token") ?? "";
  const queryIdParam = searchParams.get("queryId") ?? "";

  const [queryData, setQueryData] = useState<VendorQueryData | null>(null);
  const [statuses, setStatuses] = useState<StatusOption[]>([]);
  const [jobs, setJobs] = useState<VendorJob[]>([]);
  const [updatingJob, setUpdatingJob] = useState<string | null>(null);
  // Per-job schedule editor (datetime-local "yyyy-MM-ddTHH:mm").
  const [schedStart, setSchedStart] = useState<Record<string, string>>({});
  const [schedEnd, setSchedEnd] = useState<Record<string, string>>({});
  const [savingSchedule, setSavingSchedule] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const apiBase = getApiBaseUrl();
  const buildUrl = (path: string) =>
    import.meta.env.DEV ? path : `${apiBase}${path}`;

  const fetchQuery = async () => {
    if (!token) {
      setError("Invalid link — no token provided.");
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(
        buildUrl(`/unsecure/vendor/query?token=${encodeURIComponent(token)}`)
      );
      const data = await res.json();
      if (data.success) {
        setQueryData(data.data);
      } else {
        setError(data.message || "Failed to load query.");
      }
    } catch {
      setError("Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  const fetchStatuses = async () => {
    try {
      const res = await fetch(buildUrl("/unsecure/vendor/query/statuses"));
      const data = await res.json();
      if (data.success) setStatuses(data.data ?? []);
    } catch {
      /* ignore */
    }
  };

  const fetchJobs = async () => {
    if (!token) return;
    try {
      const res = await fetch(
        buildUrl(`/unsecure/vendor/query/jobs?token=${encodeURIComponent(token)}`)
      );
      const data = await res.json();
      if (data.success) setJobs(data.data ?? []);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    fetchQuery();
    fetchStatuses();
    fetchJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // ── Derived values ──
  const customerName =
    queryData?.orderItem?.order?.customerSourceMap?.customer?.name ??
    queryData?.customerName ??
    "-";
  const customerPhone =
    queryData?.orderItem?.order?.customerSourceMap?.customer?.contact ??
    queryData?.customerContact ??
    "-";
  const customerEmail =
    queryData?.orderItem?.order?.customerSourceMap?.customer?.email ??
    queryData?.customerEmail ??
    "-";
  const shipTo = queryData?.orderItem?.order?.shipToAddress;
  const queryFiles = queryData?.queryFileMaps ?? [];
  const queryComments = queryData?.queryComments ?? [];
  const done = isComplete(queryData?.status?.name);

  const completedStatusId = statuses.find(
    (s) => (s.name ?? "").toUpperCase() === "COMPLETED"
  )?.id;
  const createdStatusId = statuses.find(
    (s) => (s.name ?? "").toUpperCase() === "CREATED"
  )?.id;

  // ── Handlers ──

  const handleAddComment = async () => {
    if (!comment.trim() || !token) return;
    setSubmittingComment(true);
    try {
      const res = await fetch(
        buildUrl(
          `/unsecure/vendor/query/comment?token=${encodeURIComponent(token)}`
        ),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ comment: comment.trim() }),
        }
      );
      const data = await res.json();
      if (data.success) {
        toast({ title: "Comment added" });
        setComment("");
        await fetchQuery();
      } else {
        toast({
          title: "Error",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleFileUpload = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ATTACHMENT_ACCEPT;
    input.multiple = true;
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files) return;
      const arr = Array.from(files);
      const check = validateAttachmentBatch(arr, uploadedFiles.length);
      if (!check.ok) {
        toast({ title: "Error", description: check.error, variant: "destructive" });
        return;
      }
      setUploadedFiles((prev) => [...prev, ...arr]);
    };
    input.click();
  };

  const handleUploadFiles = async () => {
    if (uploadedFiles.length === 0) return;
    setUploading(true);
    try {
      const formData = new FormData();
      uploadedFiles.forEach((f) => formData.append("files", f));
      const res = await fetch(
        buildUrl(
          `/unsecure/vendor/query/files?token=${encodeURIComponent(token)}`
        ),
        { method: "POST", body: formData }
      );
      const data = await res.json();
      if (data.success) {
        toast({ title: "Files uploaded successfully" });
        setUploadedFiles([]);
        await fetchQuery();
      } else {
        toast({
          title: "Error",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "File upload failed",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleStatusChange = async (statusId: string, label: string) => {
    setUpdatingStatus(true);
    try {
      const res = await fetch(
        buildUrl(
          `/unsecure/vendor/query/status?token=${encodeURIComponent(token)}&statusId=${statusId}`
        ),
        { method: "POST" }
      );
      const data = await res.json();
      if (data.success) {
        toast({ title: "Success", description: `Query ${label}` });
        await fetchQuery();
      } else {
        toast({
          title: "Error",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleJobStatus = async (
    jobId: string,
    status: string,
    label: string
  ) => {
    setUpdatingJob(jobId);
    try {
      const res = await fetch(
        buildUrl(
          `/unsecure/vendor/query/jobs/status?token=${encodeURIComponent(
            token
          )}&jobId=${encodeURIComponent(jobId)}&status=${status}`
        ),
        { method: "POST" }
      );
      const data = await res.json();
      if (data.success) {
        toast({ title: "Success", description: `Job ${label}` });
        await fetchJobs();
      } else {
        toast({
          title: "Error",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setUpdatingJob(null);
    }
  };

  const handleJobSchedule = async (
    jobId: string,
    scheduledStart: string,
    scheduledEnd: string
  ) => {
    if (!scheduledStart) {
      toast({
        title: "Pick a date and time",
        variant: "destructive",
      });
      return;
    }
    setSavingSchedule(jobId);
    try {
      const res = await fetch(
        buildUrl(
          `/unsecure/vendor/query/jobs/schedule?token=${encodeURIComponent(
            token
          )}&jobId=${encodeURIComponent(
            jobId
          )}&scheduledStart=${encodeURIComponent(scheduledStart)}${
            scheduledEnd
              ? `&scheduledEnd=${encodeURIComponent(scheduledEnd)}`
              : ""
          }`
        ),
        { method: "POST" }
      );
      const data = await res.json();
      if (data.success) {
        toast({ title: "Success", description: "Time updated" });
        await fetchJobs();
      } else {
        toast({
          title: "Error",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setSavingSchedule(null);
    }
  };

  // ── Loading / Error states ──

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center">
            <p className="text-destructive font-medium">{error}</p>
            <p className="text-sm text-muted-foreground mt-2">
              This link may have expired or is invalid. Please contact the
              builder for a new link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Render ──

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-white">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-semibold">
              EntitleGuard — Vendor Portal
            </h1>
            <p className="text-sm text-muted-foreground">
              {queryData?.title || `Query #${queryIdParam.slice(0, 8)}`}
            </p>
          </div>
          <Badge variant="secondary" className="text-sm">
            {queryData?.status?.name || "Unknown"}
          </Badge>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Left Column ── */}
          <div className="lg:col-span-2 space-y-6">
            {/* Case Details */}
            <Card>
              <CardHeader>
                <CardTitle>Case Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">
                      Title
                    </Label>
                    <p className="font-medium">{queryData?.title || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">
                      Priority
                    </Label>
                    <div className="mt-1">
                      <Badge
                        className={getPriorityColor(
                          queryData?.priorityLevel || ""
                        )}
                      >
                        {queryData?.priorityLevel || "-"}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">
                      Due Date
                    </Label>
                    <p>
                      {queryData?.dueDate
                        ? new Date(queryData.dueDate).toLocaleDateString(
                            "en-US",
                            {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            }
                          )
                        : "-"}
                    </p>
                  </div>
                  {queryData?.orderItem?.productName && (
                    <div>
                      <Label className="text-sm text-muted-foreground">
                        Product
                      </Label>
                      <p>
                        {queryData.orderItem.productName}
                        {queryData.orderItem.brand &&
                          ` (${queryData.orderItem.brand})`}
                      </p>
                    </div>
                  )}
                </div>

                <div className="mb-4">
                  <Label className="text-sm text-muted-foreground">
                    Description
                  </Label>
                  <p className="mt-1 whitespace-pre-wrap">
                    {queryData?.description || "-"}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Your Jobs — what this vendor was specifically asked to do */}
            {jobs.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Your Job{jobs.length > 1 ? "s" : ""}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {jobs.map((job) => {
                    const jobDone =
                      job.status === "COMPLETED" || job.status === "CANCELLED";
                    const startVal =
                      schedStart[job.id] ??
                      (job.scheduledStart ? job.scheduledStart.slice(0, 16) : "");
                    const endVal =
                      schedEnd[job.id] ??
                      (job.scheduledEnd ? job.scheduledEnd.slice(0, 16) : "");
                    return (
                      <div
                        key={job.id}
                        className="rounded-lg border p-4 space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium">{job.title}</p>
                          <Badge className={jobStatusColor(job.status)}>
                            {job.status}
                          </Badge>
                        </div>
                        {job.scope ? (
                          <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                            {job.scope}
                          </p>
                        ) : (
                          <p className="text-sm italic text-muted-foreground">
                            No scope provided.
                          </p>
                        )}
                        {job.scheduledStart && (
                          <p className="text-xs text-muted-foreground">
                            Scheduled:{" "}
                            {new Date(job.scheduledStart).toLocaleString()}
                          </p>
                        )}
                        {!jobDone && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {job.status !== "IN_PROGRESS" && (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={updatingJob === job.id}
                                onClick={() =>
                                  handleJobStatus(
                                    job.id,
                                    "IN_PROGRESS",
                                    "marked in progress"
                                  )
                                }
                              >
                                {updatingJob === job.id ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : null}
                                Mark in progress
                              </Button>
                            )}
                            <Button
                              size="sm"
                              disabled={updatingJob === job.id}
                              onClick={() =>
                                handleJobStatus(
                                  job.id,
                                  "COMPLETED",
                                  "marked complete"
                                )
                              }
                            >
                              {updatingJob === job.id ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <Check className="h-4 w-4 mr-2" />
                              )}
                              Mark job complete
                            </Button>
                          </div>
                        )}
                        {!jobDone && (
                          <div className="pt-2 border-t space-y-2">
                            <Label className="text-xs">Set / change time</Label>
                            <div className="flex flex-wrap items-end gap-2">
                              <div className="space-y-1">
                                <Label className="text-[11px] text-muted-foreground">
                                  Start
                                </Label>
                                <Input
                                  type="datetime-local"
                                  className="h-9 w-[210px]"
                                  value={startVal}
                                  onChange={(e) =>
                                    setSchedStart((p) => ({
                                      ...p,
                                      [job.id]: e.target.value,
                                    }))
                                  }
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[11px] text-muted-foreground">
                                  End (optional)
                                </Label>
                                <Input
                                  type="datetime-local"
                                  className="h-9 w-[210px]"
                                  value={endVal}
                                  onChange={(e) =>
                                    setSchedEnd((p) => ({
                                      ...p,
                                      [job.id]: e.target.value,
                                    }))
                                  }
                                />
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={savingSchedule === job.id || !startVal}
                                onClick={() =>
                                  handleJobSchedule(job.id, startVal, endVal)
                                }
                              >
                                {savingSchedule === job.id ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <Clock className="h-4 w-4 mr-2" />
                                )}
                                Update time
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {/* Customer & Address */}
            <Card>
              <CardHeader>
                <CardTitle>Customer Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">Name</Label>
                    <p className="font-medium">{customerName}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Phone</Label>
                    <p className="font-medium">{customerPhone}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Email</Label>
                    <p>{customerEmail}</p>
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Address</Label>
                  <div className="mt-1">
                    {shipTo ? (
                      <>
                        {shipTo.street && <p>{shipTo.street}</p>}
                        {shipTo.apt && <p>{shipTo.apt}</p>}
                        <p>
                          {shipTo.city}
                          {shipTo.state && `, ${shipTo.state}`}
                          {shipTo.zipCode && ` ${shipTo.zipCode}`}
                        </p>
                      </>
                    ) : queryData?.customerAddress || queryData?.customerCity ? (
                      <>
                        {queryData.customerAddress && (
                          <p>{queryData.customerAddress}</p>
                        )}
                        <p>
                          {queryData.customerCity}
                          {queryData.customerState &&
                            `, ${queryData.customerState}`}
                          {queryData.customerZip && ` ${queryData.customerZip}`}
                        </p>
                      </>
                    ) : (
                      <p className="text-gray-500">No address available</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Attached Documents */}
            <Card>
              <CardHeader>
                <CardTitle>Attached Documents ({queryFiles.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {queryFiles.length > 0 ? (
                  <div className="grid grid-cols-3 gap-4">
                    {queryFiles.map((fileMap) => {
                      const fileId = fileMap.files?.id;
                      const fileName = fileMap.files?.name || "File";
                      const kind = classifyAttachment({
                        mimeType: fileMap.files?.fileType,
                        name: fileMap.files?.name,
                      });
                      if (!fileId) return null;
                      const url = viewPhotoUrl(fileId);
                      if (kind === "image") {
                        return (
                          <div
                            key={fileMap.id}
                            className="aspect-square rounded-lg overflow-hidden border cursor-pointer"
                            onClick={() => window.open(url, "_blank")}
                          >
                            <img src={url} alt={fileName} className="w-full h-full object-cover" />
                          </div>
                        );
                      }
                      if (kind === "video") {
                        return (
                          <div
                            key={fileMap.id}
                            className="aspect-square rounded-lg overflow-hidden border bg-black"
                          >
                            <video
                              src={url}
                              controls
                              preload="metadata"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        );
                      }
                      return (
                        <a
                          key={fileMap.id}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex flex-col items-center justify-center aspect-square rounded-lg border bg-gray-50 hover:bg-gray-100 p-3 text-center"
                        >
                          <FileText className="h-8 w-8 text-gray-400 mb-2" />
                          <span className="text-xs text-gray-600 truncate w-full">{fileName}</span>
                        </a>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">
                    No documents attached
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Upload Files — only when not complete */}
            {!done && (
              <Card>
                <CardHeader>
                  <CardTitle>Upload Documents</CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-gray-50"
                    onClick={handleFileUpload}
                  >
                    <Cloud className="h-10 w-10 mx-auto text-gray-400 mb-2" />
                    <p className="text-gray-600">
                      Select a photo, video or PDF
                    </p>
                    <Button variant="outline" size="sm" className="mt-3">
                      <Upload className="h-4 w-4 mr-2" />
                      Browse Files
                    </Button>
                    <p className="text-xs text-gray-400 mt-2">{ATTACHMENT_HELP_TEXT}</p>
                  </div>
                  {uploadedFiles.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {uploadedFiles.map((file, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-2 rounded border"
                        >
                          <span className="text-sm truncate">{file.name}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() =>
                              setUploadedFiles((prev) =>
                                prev.filter((_, idx) => idx !== i)
                              )
                            }
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        onClick={handleUploadFiles}
                        disabled={uploading}
                        size="sm"
                        className="mt-2"
                      >
                        {uploading ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4 mr-2" />
                        )}
                        Upload {uploadedFiles.length} file
                        {uploadedFiles.length > 1 ? "s" : ""}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* ── Right Column ── */}
          <div className="space-y-6">
            {/* Comments */}
            <Card>
              <CardHeader>
                <CardTitle>Comments ({queryComments.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {queryComments.length > 0 ? (
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {[...queryComments]
                      .sort(
                        (a, b) =>
                          new Date(b.createdAt).getTime() -
                          new Date(a.createdAt).getTime()
                      )
                      .map((c) => (
                        <div
                          key={c.id}
                          className="p-3 rounded-md border bg-muted/50"
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium">
                              {c.commentedBy}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(c.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm">{c.comment}</p>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No comments yet.
                  </p>
                )}

                {!done && (
                  <div className="space-y-2 pt-2 border-t">
                    <Label>Add a comment</Label>
                    <Textarea
                      placeholder="Enter your comment or update..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      rows={3}
                    />
                    <Button
                      onClick={handleAddComment}
                      disabled={!comment.trim() || submittingComment}
                      size="sm"
                    >
                      {submittingComment ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4 mr-2" />
                      )}
                      Post Comment
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Bottom Actions */}
        {!done && (
          <div className="flex justify-center gap-4 mt-8">
            {createdStatusId && (
              <Button
                variant="outline"
                onClick={() =>
                  handleStatusChange(createdStatusId, "sent back to reviewer")
                }
                disabled={updatingStatus}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                {updatingStatus ? "Sending..." : "Send Back to Reviewer"}
              </Button>
            )}
          </div>
        )}

        {done && (
          <div className="text-center mt-8">
            <Badge variant="secondary" className="text-base px-4 py-2">
              <Check className="h-4 w-4 mr-2" />
              This query has been completed
            </Badge>
          </div>
        )}
      </main>
    </div>
  );
};

export default VendorQuery;
