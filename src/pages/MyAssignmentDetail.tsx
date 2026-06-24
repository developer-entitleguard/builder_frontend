import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Check,
  Cloud,
  FileText,
  Loader2,
  Send,
  Upload,
  X,
} from "lucide-react";
import { viewPhotoUrl } from "@/lib/api/services/files";
import {
  ATTACHMENT_ACCEPT,
  ATTACHMENT_HELP_TEXT,
  classifyAttachment,
  validateAttachmentBatch,
} from "@/lib/queryAttachments";
import {
  useLazyGetQueryByIdQuery,
  useUpdateQueryMutation,
  useAddQueryCommentMutation,
  type BuilderQuery,
} from "@/lib/api/services/query";
import {
  useGetMyJobsForQueryQuery,
  useUpdateMyJobStatusMutation,
  type JobStatus,
} from "@/lib/api/services/jobs";
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

function getPriorityColor(priority?: string) {
  switch ((priority ?? "").toUpperCase()) {
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

const readUserId = (): string => {
  try {
    const raw = localStorage.getItem("userData");
    if (!raw) return "";
    const parsed = JSON.parse(raw);
    return parsed?.userInfo?.id ?? parsed?.id ?? "";
  } catch {
    return "";
  }
};

const readUserDisplayName = (): string => {
  try {
    const raw = localStorage.getItem("userData");
    if (!raw) return "You";
    const parsed = JSON.parse(raw);
    const info = parsed?.userInfo ?? parsed;
    const first = info?.firstName ?? "";
    const last = info?.lastName ?? "";
    const full = `${first} ${last}`.trim();
    return full || info?.email || "You";
  } catch {
    return "You";
  }
};

const MyAssignmentDetail = () => {
  const { queryId } = useParams<{ queryId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [getQueryById, { data: queryResp, isFetching }] = useLazyGetQueryByIdQuery();
  const queryData = queryResp?.data as BuilderQuery | undefined;

  const [updateQuery, { isLoading: updating }] = useUpdateQueryMutation();
  const [addComment, { isLoading: addingComment }] = useAddQueryCommentMutation();

  // Jobs assigned to *this* vendor on the query. Acting on a job never changes
  // the query — the builder/CS owns the query lifecycle.
  const { data: myJobsResp } = useGetMyJobsForQueryQuery(
    { queryId: queryId ?? "" },
    { skip: !queryId },
  );
  const myJobs = myJobsResp?.data ?? [];
  const [updateMyJobStatus, { isLoading: updatingJob }] = useUpdateMyJobStatusMutation();

  const [comment, setComment] = useState("");
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);

  useEffect(() => {
    if (queryId) {
      getQueryById({ id: queryId });
    }
  }, [queryId, getQueryById]);

  const userId = useMemo(readUserId, []);
  const userName = useMemo(readUserDisplayName, []);

  const done = isComplete(queryData?.status?.name);

  const queryFiles = (queryData as unknown as { queryFileMaps?: Array<{ id: string; type: string; files: { id: string; name: string; fileType?: string; filePath?: string } }> })?.queryFileMaps ?? [];
  const queryComments = queryData?.queryComments ?? [];

  // --- Handlers ---

  const refreshQuery = async () => {
    if (queryId) {
      await getQueryById({ id: queryId });
    }
  };

  const handleFilePick = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ATTACHMENT_ACCEPT;
    input.multiple = true;
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files) return;
      const arr = Array.from(files);
      const check = validateAttachmentBatch(arr, stagedFiles.length);
      if (!check.ok) {
        toast({ title: "Upload rejected", description: check.error, variant: "destructive" });
        return;
      }
      setStagedFiles((prev) => [...prev, ...arr]);
    };
    input.click();
  };

  const handleUploadFiles = async () => {
    if (!queryId || stagedFiles.length === 0) return;
    try {
      const queryFileMapDto = stagedFiles.map((f) => {
        const kind = classifyAttachment({ mimeType: f.type, name: f.name });
        return {
          type: kind === "other" ? "document" : kind,
          files: f,
        };
      });
      const res = await updateQuery({
        id: queryId,
        userId,
        queryFileMapDto,
      }).unwrap();
      if (!res.success) {
        toast({ title: "Upload failed", description: res.message, variant: "destructive" });
        return;
      }
      toast({ title: "Files uploaded" });
      setStagedFiles([]);
      await refreshQuery();
    } catch (e) {
      toast({
        title: "Upload failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleAddComment = async () => {
    if (!queryId || !comment.trim()) return;
    try {
      const res = await addComment({
        id: "",
        queryId,
        comment: comment.trim(),
        commentedBy: userName,
      }).unwrap();
      if (!res.success) {
        toast({ title: "Comment failed", description: res.message, variant: "destructive" });
        return;
      }
      toast({ title: "Comment added" });
      setComment("");
      await refreshQuery();
    } catch (e) {
      toast({
        title: "Comment failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleJobStatus = async (jobId: string, status: JobStatus, label: string) => {
    if (!queryId) return;
    try {
      const res = await updateMyJobStatus({ id: jobId, status, queryId }).unwrap();
      if (!res.success) {
        toast({ title: "Update failed", description: res.message, variant: "destructive" });
        return;
      }
      toast({ title: "Job updated", description: `Job ${label}.` });
    } catch (e) {
      toast({
        title: "Update failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  // --- Render ---

  if (isFetching && !queryData) {
    return (
      <div>
        <Header />
        <div className="max-w-5xl mx-auto p-4">
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!queryData) {
    return (
      <div>
        <Header />
        <div className="max-w-3xl mx-auto p-6">
          <Card>
            <CardContent className="py-12 text-center space-y-3">
              <p className="font-medium">Query not found or no longer assigned to you.</p>
              <Button variant="outline" onClick={() => navigate("/my-assignments")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to assignments
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const customer = queryData.orderItem?.order?.customerSourceMap?.customer;
  const shipTo = queryData.orderItem?.order?.shipToAddress;

  const customerName = customer?.name ?? queryData.customerName ?? "-";
  const customerPhone = customer?.contact ?? queryData.customerContact ?? "-";
  const customerEmail = customer?.email ?? queryData.customerEmail ?? "-";

  return (
    <div>
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/my-assignments">
                <ArrowLeft className="h-4 w-4 mr-1" />
                My assignments
              </Link>
            </Button>
            <div>
              <h1 className="text-xl font-semibold">{queryData.title}</h1>
              <p className="text-xs text-muted-foreground">Query #{queryData.id.slice(0, 8)}</p>
            </div>
          </div>
          <Badge variant="secondary" className="text-sm">
            {queryData.status?.name ?? "Unknown"}
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Case details */}
            <Card>
              <CardHeader>
                <CardTitle>Case Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">Title</Label>
                    <p className="font-medium">{queryData.title || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Priority</Label>
                    <div className="mt-1">
                      <Badge className={getPriorityColor(queryData.priorityLevel ?? undefined)}>
                        {queryData.priorityLevel ?? "-"}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Due Date</Label>
                    <p>
                      {queryData.dueDate
                        ? new Date(queryData.dueDate).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        : "-"}
                    </p>
                  </div>
                  {queryData.orderItem?.productName && (
                    <div>
                      <Label className="text-sm text-muted-foreground">Product</Label>
                      <p>
                        {queryData.orderItem.productName}
                        {queryData.orderItem.brand && ` (${queryData.orderItem.brand})`}
                      </p>
                    </div>
                  )}
                </div>
                <div className="mb-2">
                  <Label className="text-sm text-muted-foreground">Description</Label>
                  <p className="mt-1 whitespace-pre-wrap">{queryData.description || "-"}</p>
                </div>
              </CardContent>
            </Card>

            {/* Your job(s) — scope + job-level status actions */}
            {myJobs.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Your job{myJobs.length > 1 ? "s" : ""} ({myJobs.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {myJobs.map((job) => {
                    const jobDone = job.status === "COMPLETED" || job.status === "CANCELLED";
                    return (
                      <div key={job.id} className="rounded-md border p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium">{job.title}</p>
                            {job.unitNumber && (
                              <p className="mt-0.5 text-xs font-medium text-foreground">
                                Unit: {job.unitNumber}
                              </p>
                            )}
                            {job.scope ? (
                              <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">
                                {job.scope}
                              </p>
                            ) : (
                              <p className="mt-1 text-sm text-muted-foreground italic">
                                No specific scope — see the query description below.
                              </p>
                            )}
                            {job.scheduledStart && (
                              <p className="mt-2 text-xs text-muted-foreground">
                                Scheduled{" "}
                                {new Date(job.scheduledStart).toLocaleString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                            )}
                          </div>
                          <Badge className={jobStatusColor(job.status)}>{job.status}</Badge>
                        </div>
                        {!jobDone && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {job.status !== "IN_PROGRESS" && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={updatingJob}
                                onClick={() => handleJobStatus(job.id, "IN_PROGRESS", "marked in progress")}
                              >
                                {updatingJob ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                                Mark in progress
                              </Button>
                            )}
                            <Button
                              type="button"
                              size="sm"
                              disabled={updatingJob}
                              onClick={() => handleJobStatus(job.id, "COMPLETED", "marked complete")}
                            >
                              <Check className="h-4 w-4 mr-2" />
                              Mark job complete
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {/* Customer info */}
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
                    ) : queryData.customerAddress || queryData.customerCity ? (
                      <>
                        {queryData.customerAddress && <p>{queryData.customerAddress}</p>}
                        <p>
                          {queryData.customerCity}
                          {queryData.customerState && `, ${queryData.customerState}`}
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

            {/* Attached documents */}
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
                  <p className="text-gray-500 text-center py-4">No documents attached</p>
                )}
              </CardContent>
            </Card>

            {/* Upload documents — only while open */}
            {!done && (
              <Card>
                <CardHeader>
                  <CardTitle>Upload Documents</CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-gray-50"
                    onClick={handleFilePick}
                  >
                    <Cloud className="h-10 w-10 mx-auto text-gray-400 mb-2" />
                    <p className="text-gray-600">Select a photo, video or PDF</p>
                    <Button variant="outline" size="sm" className="mt-3" type="button">
                      <Upload className="h-4 w-4 mr-2" />
                      Browse Files
                    </Button>
                    <p className="text-xs text-gray-400 mt-2">{ATTACHMENT_HELP_TEXT}</p>
                  </div>
                  {stagedFiles.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {stagedFiles.map((file, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-2 rounded border"
                        >
                          <span className="text-sm truncate">{file.name}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() =>
                              setStagedFiles((prev) => prev.filter((_, idx) => idx !== i))
                            }
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        onClick={handleUploadFiles}
                        disabled={updating}
                        size="sm"
                        className="mt-2"
                      >
                        {updating ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4 mr-2" />
                        )}
                        Upload {stagedFiles.length} file{stagedFiles.length > 1 ? "s" : ""}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right column — comments + inline status actions */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Comments ({queryComments.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {queryComments.length > 0 ? (
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {[...queryComments]
                      .sort(
                        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                      )
                      .map((c) => (
                        <div key={c.id} className="p-3 rounded-md border bg-muted/50">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium">{c.commentedByName || c.commentedBy}</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(c.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{c.comment}</p>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No comments yet.</p>
                )}

                {!done && (
                  <div className="space-y-2 pt-2 border-t">
                    <Label>Add a comment</Label>
                    <Textarea
                      placeholder="Update the support team with progress or blockers"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      rows={3}
                    />
                    <Button
                      type="button"
                      onClick={handleAddComment}
                      disabled={!comment.trim() || addingComment}
                      size="sm"
                    >
                      {addingComment ? (
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

            {done && (
              <Card>
                <CardContent className="py-6 text-center">
                  <Badge variant="secondary" className="text-sm px-3 py-1">
                    <Check className="h-4 w-4 mr-2" />
                    This query is complete
                  </Badge>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default MyAssignmentDetail;
