import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import type { BuilderQuery } from "@/lib/api/services/query";
import { useGetBuilderVendorsQuery } from "@/lib/api/services/builderVendor";
import {
  useUpdateQueryMutation,
  useAddQueryCommentMutation,
  useLazyGetQueryByIdQuery,
} from "@/lib/api/services/query";
import { useGetStatusesByModuleQuery } from "@/lib/api/services/status";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import {
  CalendarIcon,
  ArrowLeft,
  Check,
  LinkIcon,
  Send,
  Upload,
  Cloud,
  Loader2,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { viewPhotoUrl } from "@/lib/api/services/files";
import VendorLinkModal from "@/components/VendorLinkModal";
import AssignVendorDialog from "@/components/queries/AssignVendorDialog";
import { canAssignVendors } from "@/lib/roles";
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
  const canScheduleAssign = canAssignVendors(builderRole);
  const navigate = useNavigate();
  const { toast } = useToast();

  // ── State ──
  const [queryData, setQueryData] = useState<BuilderQuery | null>(null);
  const [selectedVendor, setSelectedVendor] = useState("");
  const [vendorPhone, setVendorPhone] = useState("");
  const [priorityLevel, setPriorityLevel] = useState<string>("Medium");
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [comment, setComment] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [vendorLinkModalOpen, setVendorLinkModalOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  // ── Derived ──
  const group = statusGroup(queryData?.status?.name);
  const isPending = group === "pending";
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

  const { data: vendorsData, isLoading: isLoadingVendors } =
    useGetBuilderVendorsQuery(
      { builderId: builderId ?? "" },
      { skip: !builderId || !isPending }
    );
  const vendors = (vendorsData as {
    data?: Array<{ id: string; name: string; type?: string; contact?: string; vendorType?: 'INTERNAL' | 'EXTERNAL' | null }>;
  })?.data ?? [];

  // What classification is the vendor currently picked in the dropdown?
  const effectiveVendorId = selectedVendor || queryData?.vendor?.id || "";
  const selectedVendorClassification =
    vendors.find((v) => v.id === effectiveVendorId)?.vendorType ?? null;
  const isInternalVendorPicked = selectedVendorClassification === "INTERNAL";
  const isExternalVendorPicked = selectedVendorClassification === "EXTERNAL";

  // ── Target status IDs ──
  const assignedToVendorStatusId = statuses.find(
    (s) =>
      s.name.toUpperCase().replace(/\s+/g, "_") === "ASSIGNED_TO_VENDOR"
  )?.id;
  const createdStatusId = statuses.find(
    (s) => s.name.toUpperCase() === "CREATED"
  )?.id;
  const doneStatusId = statuses.find(
    (s) => s.name.toUpperCase() === "DONE"
  )?.id;

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

  // Sync form state when data loads
  useEffect(() => {
    if (queryData) {
      if (queryData.priorityLevel) setPriorityLevel(queryData.priorityLevel);
      if (queryData.dueDate) setDueDate(new Date(queryData.dueDate));
    }
  }, [queryData]);

  // ── Handlers ──

  const handleAssignCase = async () => {
    if (!queryData || !assignedToVendorStatusId) return;
    const vendorId = selectedVendor?.trim() || undefined;
    if (!vendorId) {
      toast({
        title: "Error",
        description: "Please select a vendor",
        variant: "destructive",
      });
      return;
    }
    try {
      const dueDateString = dueDate
        ? dueDate.toISOString().split("T")[0]
        : undefined;
      const result = await updateQuery({
        id: queryData.id,
        statusId: assignedToVendorStatusId,
        vendorId,
        vendorNumber: vendorPhone?.trim() || undefined,
        priorityLevel: priorityLevel.toUpperCase(),
        dueDate: dueDateString,
        userId: userId ?? undefined,
      }).unwrap();

      if (result.success) {
        toast({ title: "Success", description: "Vendor assigned successfully" });
        setVendorLinkModalOpen(true);
        if (id) await fetchQuery(id);
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to assign vendor",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "An error occurred while assigning vendor",
        variant: "destructive",
      });
    }
  };

  const handleSendBack = async () => {
    if (!queryData || !createdStatusId) return;
    try {
      const result = await updateQuery({
        id: queryData.id,
        statusId: createdStatusId,
        userId: userId ?? undefined,
      }).unwrap();

      if (result.success) {
        toast({ title: "Success", description: "Query sent back for review" });
        if (id) await fetchQuery(id);
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to send back",
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

  const handleMarkComplete = async () => {
    if (!queryData || !doneStatusId) return;
    try {
      const result = await updateQuery({
        id: queryData.id,
        statusId: doneStatusId,
        userId: userId ?? undefined,
        queryFileMapDto: uploadedFiles.map((f) => ({
          type: "vendor",
          files: f,
        })),
      }).unwrap();

      if (result.success) {
        toast({ title: "Success", description: "Query marked as complete" });
        setUploadedFiles([]);
        if (id) await fetchQuery(id);
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to complete query",
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
              {queryData.createdAt
                ? `Created on ${new Date(queryData.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`
                : ""}
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate("/queries")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Queries
            </Button>
            {(isVendor || isVendorComplete) && (
              <Button
                variant="outline"
                onClick={() => setVendorLinkModalOpen(true)}
              >
                <LinkIcon className="h-4 w-4 mr-2" />
                Get Vendor Link
              </Button>
            )}
            {isVendor && (
              <Button onClick={handleMarkComplete} disabled={isUpdating}>
                <Check className="h-4 w-4 mr-2" />
                {isUpdating ? "Updating..." : "Mark Complete"}
              </Button>
            )}
            {isVendorComplete && (
              <>
                <Button
                  variant="outline"
                  onClick={handleSendBack}
                  disabled={isUpdating}
                >
                  Re-assign Vendor
                </Button>
                <Button onClick={handleMarkComplete} disabled={isUpdating}>
                  <Check className="h-4 w-4 mr-2" />
                  {isUpdating ? "Updating..." : "Mark as Done"}
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ── Left Column ── */}
          <div className="lg:col-span-2 space-y-6">
            {/* Case Details */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Case Details</CardTitle>
                <Badge variant="secondary" className="bg-gray-100 text-gray-700">
                  {queryData.status?.name || "-"}
                </Badge>
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
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* ── Right Column ── */}
          <div className="space-y-6">
            {/* Assign to Vendor — pending statuses only */}
            {isPending && (
              <Card>
                <CardHeader>
                  <CardTitle>Assign to Vendor</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="vendor-select">Select Vendor</Label>
                    <Select
                      value={
                        selectedVendor ||
                        queryData.vendor?.id ||
                        ""
                      }
                      onValueChange={(value) => {
                        setSelectedVendor(value);
                        const v = vendors.find((v) => v.id === value);
                        if (v?.contact) setVendorPhone(v.contact);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            isLoadingVendors
                              ? "Loading vendors..."
                              : queryData.vendor?.name || "Select a vendor..."
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {isLoadingVendors ? (
                          <SelectItem value="loading" disabled>
                            Loading vendors...
                          </SelectItem>
                        ) : vendors.length === 0 ? (
                          <SelectItem value="no-vendors" disabled>
                            No vendors available
                          </SelectItem>
                        ) : (
                          vendors.map((vendor) => (
                            <SelectItem key={vendor.id} value={vendor.id}>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span>{vendor.name}</span>
                                {vendor.type && (
                                  <span className="text-xs text-muted-foreground">
                                    ({vendor.type})
                                  </span>
                                )}
                                {vendor.vendorType === "INTERNAL" && (
                                  <Badge variant="default" className="text-[10px] px-1.5 py-0">
                                    Internal
                                  </Badge>
                                )}
                                {vendor.vendorType === "EXTERNAL" && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                    External
                                  </Badge>
                                )}
                                {!vendor.vendorType && (
                                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                                    Unclassified
                                  </Badge>
                                )}
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="vendor-phone">Vendor Contact</Label>
                    <Input
                      id="vendor-phone"
                      placeholder="(555) 555-5555"
                      value={
                        vendorPhone || queryData.vendor?.contact || ""
                      }
                      onChange={(e) => setVendorPhone(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label>Priority Level</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {["Low", "Medium", "High", "Critical"].map((level) => (
                        <Button
                          key={level}
                          variant={
                            priorityLevel === level ? "default" : "outline"
                          }
                          size="sm"
                          onClick={() => setPriorityLevel(level)}
                        >
                          {level}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* External vendors get a manual due date — internal vendors
                      inherit theirs from the booked schedule slot. */}
                  {isExternalVendorPicked && (
                    <div>
                      <Label>Due Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !dueDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dueDate ? (
                              format(dueDate, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={dueDate}
                            onSelect={setDueDate}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}

                  {isExternalVendorPicked && (
                    <Button
                      className="w-full"
                      onClick={handleAssignCase}
                      disabled={isUpdating || !queryData}
                    >
                      {isUpdating ? "Assigning..." : "Assign Case"}
                    </Button>
                  )}

                  {isInternalVendorPicked && canScheduleAssign && builderId && queryData && (
                    <Button
                      type="button"
                      className="w-full"
                      onClick={() => setAssignDialogOpen(true)}
                    >
                      Assign with schedule…
                    </Button>
                  )}

                  {!selectedVendorClassification && effectiveVendorId && (
                    <p className="text-xs text-muted-foreground">
                      Vendor classification isn't set — ask an admin to mark this vendor as Internal or External under Admin → Vendors.
                    </p>
                  )}
                  {!effectiveVendorId && (
                    <p className="text-xs text-muted-foreground">
                      Pick a vendor to continue. Internal vendors get a scheduled booking; external vendors get a manual due date.
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

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
                              {new Date(h.changedAt).toLocaleString("en-US", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
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

        {/* Bottom actions for vendor status */}
        {isVendor && (
          <div className="flex justify-center gap-4 mt-8">
            <Button
              variant="outline"
              onClick={handleSendBack}
              disabled={isUpdating}
            >
              {isUpdating ? "Sending..." : "Send Back to Reviewer"}
            </Button>
            <Button
              onClick={handleMarkComplete}
              disabled={isUpdating}
            >
              <Check className="h-4 w-4 mr-2" />
              {isUpdating ? "Updating..." : "Mark as Complete"}
            </Button>
          </div>
        )}
      </main>

      {/* Vendor Link Modal */}
      {queryData.id && (
        <VendorLinkModal
          open={vendorLinkModalOpen}
          onClose={() => setVendorLinkModalOpen(false)}
          queryId={queryData.id}
        />
      )}

      {/* Schedule-aware assign dialog (Customer Support / Admin) */}
      {queryData.id && builderId && (
        <AssignVendorDialog
          open={assignDialogOpen}
          onOpenChange={setAssignDialogOpen}
          queryId={queryData.id}
          builderId={builderId}
          onAssigned={() => {
            // Refresh the page-level query so the newly assigned vendor + due date land in the UI.
            getQueryById({ id: queryData.id });
          }}
        />
      )}
    </div>
  );
};

export default QueryDetail;
