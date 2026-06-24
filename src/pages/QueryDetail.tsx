import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import type { BuilderQuery } from "@/lib/api/services/query";
import {
  useUpdateQueryMutation,
  useAddQueryCommentMutation,
  useLazyGetQueryByIdQuery,
} from "@/lib/api/services/query";
import { useGetStatusesByModuleQuery } from "@/lib/api/services/status";
import { useGetEligibleOwnersQuery } from "@/store/api";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  LinkIcon,
  Send,
  Upload,
  Cloud,
  Loader2,
  FileText,
} from "lucide-react";
import { viewPhotoUrl } from "@/lib/api/services/files";
import VendorLinkModal from "@/components/VendorLinkModal";
import JobsPanel from "@/components/queries/JobsPanel";
import { CoverageReviewPanel } from "@/components/CoverageReviewPanel";
import { formatDateTime } from "@/lib/datetime";
import { canManageJobs } from "@/lib/roles";
import {
  ATTACHMENT_ACCEPT,
  ATTACHMENT_HELP_TEXT,
  classifyAttachment,
  validateAttachmentBatch,
} from "@/lib/queryAttachments";

// ── Status helpers ──────────────────────────────────────────────────

function statusGroup(name?: string) {
  const upper = (name ?? "").toUpperCase().replace(/\s+/g, "_");
  switch (upper) {
    case "CREATED":
    case "REVIEW":
    case "INPROGRESS":
    case "IN_PROGRESS":
      return "pending";
    case "ASSIGNED":
    case "ASSINGED":
    case "ASSIGNED_TO_VENDOR":
    case "AWAITING_VENDOR_ACTION":
      return "vendor";
    case "COMPLETED":
      return "vendorComplete";
    case "DONE":
      return "complete";
    default:
      return "pending";
  }
}

function getPriorityColor(priority: string) {
  switch (priority) {
    case "Low":
    case "LOW":
      return "bg-green-100 text-green-800";
    case "Medium":
    case "MEDIUM":
      return "bg-yellow-100 text-yellow-800";
    case "High":
    case "HIGH":
      return "bg-red-100 text-red-800";
    case "Critical":
    case "CRITICAL":
      return "bg-red-200 text-red-900";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

// ── Component ───────────────────────────────────────────────────────

const QueryDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { organization, builderRole } = useOrganization();
  const canManageQueryJobs = canManageJobs(builderRole);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // ── State ──
  const [queryData, setQueryData] = useState<BuilderQuery | null>(null);
  const [comment, setComment] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [vendorLinkModalOpen, setVendorLinkModalOpen] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  // ── Derived ──
  const group = statusGroup(queryData?.status?.name);
  const isVendor = group === "vendor";
  const isVendorComplete = group === "vendorComplete";
  const isComplete = group === "complete";

  // ── Identity ──
  const builderId = useMemo(() => {
    const userData = localStorage.getItem("userData");
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        if (parsed.userInfo?.builderOrganization?.id)
          return parsed.userInfo.builderOrganization.id;
        if (parsed.builderOrganization?.id)
          return parsed.builderOrganization.id;
      } catch {
        /* ignore */
      }
    }
    return organization?.id ?? null;
  }, [organization?.id]);

  const userId = useMemo(() => {
    if (user && typeof user === "object" && "userId" in user)
      return String((user as { userId: unknown }).userId);
    const userData = localStorage.getItem("userData");
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        return parsed.userInfo?.id ?? parsed.id ?? null;
      } catch {
        return null;
      }
    }
    return null;
  }, [user]);

  // ── API hooks ──
  const [getQueryById] = useLazyGetQueryByIdQuery();
  const [updateQuery, { isLoading: isUpdating }] = useUpdateQueryMutation();
  const [addComment, { isLoading: isAddingComment }] =
    useAddQueryCommentMutation();

  const { data: statusesData } = useGetStatusesByModuleQuery(
    { module: "QUERY" },
    { skip: false }
  );
  const statuses = statusesData?.data ?? [];

  const { data: ownersData } = useGetEligibleOwnersQuery(
    { builderId: builderId ?? "" },
    { skip: !builderId }
  );
  const eligibleOwners = ownersData?.data ?? [];

  // ── Fetch query ──
  const fetchQuery = useCallback(
    async (queryId: string) => {
      try {
        const res = await getQueryById({ id: queryId }).unwrap();
        if (res.success && res.data) {
          setQueryData(res.data);
        }
      } catch (e) {
        console.error("Error fetching query:", e);
      } finally {
        setPageLoading(false);
      }
    },
    [getQueryById]
  );

  useEffect(() => {
    if (id) fetchQuery(id);
  }, [id, fetchQuery]);

  // ── Handlers ──

  // Persist the selected assessment files against the query without changing
  // its status (status is now driven solely by the dropdown).
  const handleUploadAssessment = async () => {
    if (!queryData || uploadedFiles.length === 0) return;
    try {
      const result = await updateQuery({
        id: queryData.id,
        userId: userId ?? undefined,
        queryFileMapDto: uploadedFiles.map((f) => ({
          type: "vendor",
          files: f,
        })),
      }).unwrap();

      if (result.success) {
        toast({ title: "Success", description: "Files uploaded" });
        setUploadedFiles([]);
        if (id) await fetchQuery(id);
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to upload files",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "An error occurred",
        variant: "destructive",
      });
    }
  };

  // Free-form status change via the dropdown — available to the same roles that
  // can manage jobs. Lets staff move the query to any QUERY-module status
  // without being constrained to the fixed lifecycle buttons.
  const handleStatusChange = async (statusId: string) => {
    if (!queryData || !statusId || statusId === queryData.status?.id) return;
    try {
      const result = await updateQuery({
        id: queryData.id,
        statusId,
        userId: userId ?? undefined,
      }).unwrap();

      if (result.success) {
        toast({ title: "Status updated" });
        if (id) await fetchQuery(id);
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to update status",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "An error occurred",
        variant: "destructive",
      });
    }
  };

  // Manually (re)assign the coordinating owner. Restricted to the eligible
  // owner/PM/CS users returned by the backend for this org.
  const handleOwnerChange = async (ownerUserId: string) => {
    if (!queryData || !ownerUserId || ownerUserId === queryData.ownerUserId) return;
    try {
      const result = await updateQuery({
        id: queryData.id,
        ownerUserId,
        userId: userId ?? undefined,
      }).unwrap();
      if (result.success) {
        toast({ title: "Owner updated" });
        if (id) await fetchQuery(id);
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to update owner",
          variant: "destructive",
        });
      }
    } catch {
      toast({ title: "Error", description: "An error occurred", variant: "destructive" });
    }
  };

  // When arriving with a #jobs hash (e.g. from the board's "add jobs" prompt),
  // scroll the Jobs section into view once the query has loaded.
  useEffect(() => {
    if (location.hash === "#jobs" && queryData) {
      const el = document.getElementById("jobs");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [location.hash, queryData]);

  const handleAddComment = async () => {
    if (!comment.trim() || !queryData) return;
    try {
      const result = await addComment({
        comment: comment.trim(),
        commentedBy: userId ?? "Builder",
        id: userId ?? "",
        queryId: queryData.id,
      }).unwrap();

      if (result.success) {
        toast({ title: "Comment added" });
        setComment("");
        if (id) await fetchQuery(id);
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to add comment",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "An error occurred",
        variant: "destructive",
      });
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

  // ── Derived display values ──
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
  const locationCity =
    queryData?.orderItem?.order?.customerSourceMap?.customer?.address?.city ??
    queryData?.customerCity ??
    "-";
  const shipToAddress = queryData?.orderItem?.order?.shipToAddress;
  const category = queryData?.orderItem?.productName || "General Query";
  const queryHistory = queryData?.queryhistory ?? [];
  const queryComments = queryData?.queryComments ?? [];
  const queryFiles = queryData?.queryFileMaps ?? [];

  // ── Loading state ──
  if (pageLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!queryData) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-7xl mx-auto px-4 py-8 text-center">
          <p className="text-muted-foreground">Query not found.</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => navigate("/queries")}
          >
            Back to Queries
          </Button>
        </main>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {queryData.title || "Query Details"}
            </h1>
            <p className="text-gray-600 mt-2">
              {queryData.createdAt ? `Created on ${formatDateTime(queryData.createdAt)}` : ""}
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate("/queries")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Queries
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ── Left Column ── */}
          <div className="lg:col-span-2 space-y-6">
            {/* Warranty coverage + auto-linked registration verification */}
            <CoverageReviewPanel
              entity={queryData}
              onResolved={() => id && fetchQuery(id)}
            />
            {/* Case Details */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Case Details</CardTitle>
                {canManageQueryJobs && statuses.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground">
                        Owner
                      </Label>
                      <Select
                        value={queryData.ownerUserId ?? ""}
                        onValueChange={handleOwnerChange}
                        disabled={isUpdating || eligibleOwners.length === 0}
                      >
                        <SelectTrigger className="h-8 w-[180px]">
                          <SelectValue placeholder="Unassigned" />
                        </SelectTrigger>
                        <SelectContent>
                          {eligibleOwners.map((o) => (
                            <SelectItem key={o.id} value={o.id}>
                              {o.name || o.id}
                              {o.role ? ` · ${o.role}` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground">
                        Status
                      </Label>
                      <Select
                        value={queryData.status?.id ?? ""}
                        onValueChange={handleStatusChange}
                        disabled={isUpdating}
                      >
                        <SelectTrigger className="h-8 w-[180px]">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          {statuses.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ) : (
                  <Badge
                    variant="secondary"
                    className="bg-gray-100 text-gray-700"
                  >
                    {queryData.status?.name || "-"}
                  </Badge>
                )}
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">
                      Submitted By
                    </Label>
                    <p className="text-gray-900 font-semibold">{customerName}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">
                      Contact Phone
                    </Label>
                    <p className="text-gray-900 font-semibold">{customerPhone}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">
                      Contact Email
                    </Label>
                    <p className="text-gray-900">{customerEmail}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">
                      Priority
                    </Label>
                    <div className="mt-1">
                      <Badge
                        className={getPriorityColor(
                          queryData.priorityLevel || "Medium"
                        )}
                      >
                        {queryData.priorityLevel || "-"}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">
                      Category
                    </Label>
                    <div className="mt-1">
                      <Badge variant="outline" className="font-semibold">
                        {category}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">
                      Location
                    </Label>
                    <div className="mt-1">
                      <Badge variant="outline" className="font-semibold">
                        {locationCity}
                      </Badge>
                    </div>
                  </div>
                  {queryData.unitNumber && (
                    <div>
                      <Label className="text-sm font-medium text-gray-700">
                        Unit
                      </Label>
                      <div className="mt-1">
                        <Badge variant="outline" className="font-semibold">
                          {queryData.unitNumber}
                        </Badge>
                      </div>
                    </div>
                  )}
                  {queryData.dueDate && (
                    <div>
                      <Label className="text-sm font-medium text-gray-700">
                        Due Date
                      </Label>
                      <p className="text-gray-900">
                        {new Date(queryData.dueDate).toLocaleDateString(
                          "en-US",
                          { year: "numeric", month: "short", day: "numeric" }
                        )}
                      </p>
                    </div>
                  )}
                </div>

                <div className="mb-6">
                  <Label className="text-sm font-medium text-gray-700">
                    Description
                  </Label>
                  <p className="text-gray-900 mt-2 leading-relaxed whitespace-pre-wrap">
                    {queryData.description || "-"}
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    Address
                  </Label>
                  <div className="text-gray-900 mt-2">
                    {shipToAddress ? (
                      <>
                        {shipToAddress.street && <p>{shipToAddress.street}</p>}
                        {shipToAddress.apt && <p>{shipToAddress.apt}</p>}
                        <p>
                          {shipToAddress.city}
                          {shipToAddress.state && `, ${shipToAddress.state}`}
                          {shipToAddress.zipCode && ` ${shipToAddress.zipCode}`}
                        </p>
                      </>
                    ) : queryData.customerAddress || queryData.customerCity ? (
                      <>
                        {queryData.customerAddress && (
                          <p>{queryData.customerAddress}</p>
                        )}
                        <p>
                          {queryData.customerCity}
                          {queryData.customerState &&
                            `, ${queryData.customerState}`}
                          {queryData.customerZip &&
                            ` ${queryData.customerZip}`}
                        </p>
                      </>
                    ) : (
                      <p className="text-gray-500">No address available</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Photos / Attached Images */}
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

            {/* Assessment Upload — vendor statuses only */}
            {isVendor && (
              <Card>
                <CardHeader>
                  <CardTitle>Add Your Assessment</CardTitle>
                </CardHeader>
                <CardContent>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    Upload Additional Images
                  </Label>
                  <div
                    className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-gray-50"
                    onClick={handleFileUpload}
                  >
                    <Cloud className="h-10 w-10 mx-auto text-gray-400 mb-2" />
                    <p className="text-gray-600">Select a photo, video or PDF</p>
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
                            size="sm"
                            onClick={() =>
                              setUploadedFiles((prev) =>
                                prev.filter((_, idx) => idx !== i)
                              )
                            }
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                      <Button
                        size="sm"
                        className="mt-2"
                        onClick={handleUploadAssessment}
                        disabled={isUpdating}
                      >
                        {isUpdating ? (
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

            {/* Jobs spawned from this converted ticket query (one query → many jobs). */}
            {id && (
              <div id="jobs" className="scroll-mt-24">
                <JobsPanel queryId={id} builderId={builderId} canManage={canManageQueryJobs} />
              </div>
            )}
          </div>

          {/* ── Right Column ── */}
          <div className="space-y-6">
            {/* Vendor Info — vendor / vendorComplete / complete statuses */}
            {(isVendor || isVendorComplete || isComplete) && queryData.vendor && (
              <Card>
                <CardHeader>
                  <CardTitle>Assigned Vendor</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <Label className="text-sm text-muted-foreground">Name</Label>
                    <p className="font-medium">{queryData.vendor.name}</p>
                  </div>
                  {queryData.vendor.contact && (
                    <div>
                      <Label className="text-sm text-muted-foreground">
                        Contact
                      </Label>
                      <p>{queryData.vendor.contact}</p>
                    </div>
                  )}
                  {queryData.vendor.email && (
                    <div>
                      <Label className="text-sm text-muted-foreground">
                        Email
                      </Label>
                      <p>{queryData.vendor.email}</p>
                    </div>
                  )}
                  {(isVendor || isVendorComplete) && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-2"
                      onClick={() => setVendorLinkModalOpen(true)}
                    >
                      <LinkIcon className="h-4 w-4 mr-2" />
                      Get Vendor Link
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Comments */}
            <Card>
              <CardHeader>
                <CardTitle>Comments ({queryComments.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {queryComments.length > 0 ? (
                  <div className="space-y-3 max-h-64 overflow-y-auto border rounded-lg p-4 bg-gray-50">
                    {[...queryComments]
                      .sort(
                        (a, b) =>
                          new Date(b.createdAt).getTime() -
                          new Date(a.createdAt).getTime()
                      )
                      .map((c) => (
                        <div
                          key={c.id}
                          className="p-3 bg-white rounded-md border"
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium">
                              {c.commentedByName || c.commentedBy}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatDateTime(c.createdAt)}
                            </span>
                          </div>
                          <p className="text-sm">{c.comment}</p>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    No comments yet
                  </p>
                )}

                {!isComplete && (
                  <div className="space-y-2 pt-2">
                    <Label>Add a comment</Label>
                    <Textarea
                      placeholder="Type your comment here..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      rows={3}
                    />
                    <Button
                      onClick={handleAddComment}
                      disabled={!comment.trim() || isAddingComment}
                      variant="destructive"
                      size="sm"
                    >
                      {isAddingComment ? (
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

            {/* Case History */}
            <Card>
              <CardHeader>
                <CardTitle>Case History ({queryHistory.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {queryHistory.length > 0 ? (
                  <div className="space-y-4">
                    {[...queryHistory]
                      .sort(
                        (a, b) =>
                          new Date(b.changedAt).getTime() -
                          new Date(a.changedAt).getTime()
                      )
                      .map((h, i) => (
                        <div key={h.id || i} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div className="w-3 h-3 rounded-full bg-blue-500" />
                            {i < queryHistory.length - 1 && (
                              <div className="w-0.5 flex-1 bg-blue-200" />
                            )}
                          </div>
                          <div className="pb-4">
                            <p className="font-semibold text-sm">
                              {h.status?.name || "Status changed"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDateTime(h.changedAt)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Updated by{" "}
                              {h.userInfo
                                ? `${(h.userInfo as { firstName?: string }).firstName ?? ""} ${(h.userInfo as { lastName?: string }).lastName ?? ""}`.trim() || "user"
                                : "user"}
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    No history available
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

      </main>

      {/* Vendor Link Modal */}
      {queryData.id && (
        <VendorLinkModal
          open={vendorLinkModalOpen}
          onClose={() => setVendorLinkModalOpen(false)}
          queryId={queryData.id}
        />
      )}
    </div>
  );
};

export default QueryDetail;
