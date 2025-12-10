import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { BuilderQuery } from "@/lib/api/services/query";
import {
  useAddQueryCommentMutation,
  useLazyGetQueryByIdQuery,
} from "@/lib/api/services/query";
import { getApiBaseUrl, getApiBaseUrlWithPrefix } from "@/lib/config";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Check, Upload, Cloud, Send } from "lucide-react";

interface CaseAssessment {
  id: string;
  caseNumber: string;
  submittedBy: string;
  department: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  dueDate: string;
  description: string;
  status: "Awaiting Action" | "In Progress" | "Completed";
  assignedTo: string;
  assignedDate: string;
}

interface TimelineEvent {
  id: string;
  type: "created" | "assigned" | "comment" | "vendor_assigned" | "awaiting";
  timestamp: string;
  user: string;
  description: string;
  comment?: string;
  icon: React.ReactNode;
}

const mockCase: CaseAssessment = {
  id: "1",
  caseNumber: "CR-2023-0458",
  submittedBy: "Michael Chen",
  department: "IT Infrastructure",
  priority: "High",
  dueDate: "Nov 22, 2023",
  description: "Server rack in Data Center B is showing intermittent power fluctuations. Initial diagnostics suggest a potential issue with the power distribution unit. Need vendor assessment and repair to prevent potential downtime. This affects our primary database cluster which supports customer-facing applications.",
  status: "Awaiting Action",
  assignedTo: "TechPower Solutions (You)",
  assignedDate: "Nov 15, 2023"
};

const AwaitingAction = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [queryData, setQueryData] = useState<BuilderQuery | null>(null);
  const [queryId, setQueryId] = useState<string | null>(null);
  const [assessment, setAssessment] = useState<string>("");
  const [newComment, setNewComment] = useState<string>("");
  // Toast notifications
  const { toast } = useToast();
  // Comment mutation and refetch
  const [addComment, { isLoading: isAddingComment }] = useAddQueryCommentMutation();
  const [getQueryById] = useLazyGetQueryByIdQuery();

  const fetchQueryById = useCallback(
    async (id: string) => {
      try {
        const res = await getQueryById({ id }).unwrap();
        if (res.success && res.data) {
          setQueryData(res.data);
        }
      } catch (error) {
        console.error("Error fetching query by id:", error);
      }
    },
    [getQueryById]
  );

  // Get query data from navigation state or session storage, then refetch from API
  useEffect(() => {
    const incomingId =
      (location.state?.query as BuilderQuery | undefined)?.id ||
      sessionStorage.getItem("queryDetailId");

    if (incomingId) {
      if (!queryId || queryId !== incomingId) {
        setQueryId(incomingId);
        sessionStorage.setItem("queryDetailId", incomingId);
      }
      // Set initial state from navigation (if available)
      if (location.state?.query) {
        setQueryData(location.state.query as BuilderQuery);
      }
      // Always refetch latest from API
      fetchQueryById(incomingId);
    }
  }, [location.state, queryId, fetchQueryById]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "Low": return "bg-green-100 text-green-800";
      case "Medium": return "bg-yellow-100 text-yellow-800";
      case "High": return "bg-red-100 text-red-800";
      case "Critical": return "bg-red-200 text-red-900";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const handleSendBack = () => {
    // Handle sending back to reviewer logic
    console.log("Sending back to reviewer");
  };

  const handleMarkComplete = () => {
    // Handle marking as complete logic
    console.log("Marking case as complete");
  };

  const handlePostComment = async () => {
    if (!newComment.trim()) {
      toast({
        title: "Error",
        description: "Please enter a comment",
        variant: "destructive",
      });
      return;
    }

    if (!queryData) {
      toast({
        title: "Error",
        description: "No query data available",
        variant: "destructive",
      });
      return;
    }

    const userId =
      user && typeof user === "object" && "id" in user && typeof (user as { id?: unknown }).id === "string"
        ? (user as { id: string }).id
        : null;
    const commentedBy =
      user &&
      typeof user === "object" &&
      "builderOrganization" in user &&
      (user as { builderOrganization?: { id?: unknown } }).builderOrganization?.id &&
      typeof (user as { builderOrganization: { id: unknown } }).builderOrganization.id === "string"
        ? (user as { builderOrganization: { id: string } }).builderOrganization.id
        : null;

    if (!userId || !commentedBy) {
      toast({
        title: "Error",
        description: "User information not available",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await addComment({
        comment: newComment.trim(),
        commentedBy,
        id: userId,
        queryId: queryData.id,
      }).unwrap();

      if (result.success) {
        toast({
          title: "Success",
          description: result.message || "Comment added successfully",
        });
        setNewComment("");

        try {
          const refreshed = await getQueryById({ id: queryData.id }).unwrap();
          if (refreshed.success && refreshed.data) {
            setQueryData(refreshed.data);
          }
        } catch (refetchError) {
          console.error("Error refetching query:", refetchError);
        }
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to add comment",
          variant: "destructive",
        });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleFileUpload = () => {
    // Handle file upload logic
    console.log("File upload triggered");
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {queryData ? `Query ID: ${queryData.id}` : "Query Details"}
            </h1>
            <p className="text-gray-600 mt-2">
              {queryData?.orderItem?.order?.createdAt 
                ? `Created on ${new Date(queryData.orderItem.order.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric"
                  })}`
                : ""
              }
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Review
            </Button>
            <Button onClick={handleMarkComplete}>
              <Check className="h-4 w-4 mr-2" />
              Complete
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Case Details */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Case Details</CardTitle>
                <Badge variant="secondary" className="bg-gray-100 text-gray-700">
                  {queryData?.status?.name || "-"}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Submitted by</Label>
                    <p className="text-gray-900">
                      {queryData?.orderItem?.order?.customerSourceMap?.customer?.name || "-"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Department</Label>
                    <p className="text-gray-900">-</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700 block mb-1">Priority</Label>
                    <div className="mt-1">
                      <Badge className={getPriorityColor(queryData?.priorityLevel || "Medium")}>
                        {queryData?.priorityLevel || "-"}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Due Date</Label>
                    <p className="text-gray-900">
                      {queryData?.dueDate 
                        ? new Date(queryData.dueDate).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric"
                          })
                        : "-"
                      }
                    </p>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700">Description</Label>
                  <p className="text-gray-900 mt-2 leading-relaxed">
                    {queryData?.description || "-"}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Attached Images */}
            <Card>
              <CardHeader>
                <CardTitle>
                  Attached Images ({queryData?.queryFileMaps?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {queryData?.queryFileMaps && queryData.queryFileMaps.length > 0 ? (
                  <div className="grid grid-cols-3 gap-4">
                    {queryData.queryFileMaps.map((fileMap) => {
                      const filePath = fileMap.files?.filePath;
                      const fileName = fileMap.files?.name || 'Query file';
                      
                      // Construct image URL - try /api/files endpoint first
                      let imageUrl: string | null = null;
                      if (filePath) {
                        if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
                          imageUrl = filePath;
                        } else if (filePath.startsWith('/')) {
                          const apiPrefix = getApiBaseUrlWithPrefix();
                          const apiBaseUrl = getApiBaseUrl();
                          // Try /api/files endpoint first as it's the most common pattern
                          imageUrl = apiBaseUrl 
                            ? `${apiBaseUrl}/api/files${filePath}`
                            : `${apiPrefix}/files${filePath}`;
                        } else {
                          const apiPrefix = getApiBaseUrlWithPrefix();
                          imageUrl = `${apiPrefix}/files/${filePath}`;
                        }
                      }
                      
                      // Track retry attempts to prevent infinite loops
                      const maxRetries = 3;
                      
                      return (
                        <div key={fileMap.id} className="aspect-square bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
                          {imageUrl ? (
                            <img 
                              src={imageUrl} 
                              alt={fileName}
                              className="w-full h-full object-cover rounded-lg"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                const retryCount = parseInt(target.dataset.retryCount || '0', 10);
                                
                                // Prevent infinite loops
                                if (retryCount >= maxRetries) {
                                  target.src = "/placeholder.svg";
                                  target.onerror = null; // Remove error handler to stop retries
                                  return;
                                }
                                
                                // Try alternative endpoints
                                if (filePath && filePath.startsWith('/')) {
                                  const apiPrefix = getApiBaseUrlWithPrefix();
                                  const apiBaseUrl = getApiBaseUrl();
                                  const alternatives = [
                                    apiBaseUrl ? `${apiBaseUrl}${filePath}` : `${apiPrefix}${filePath}`,
                                    apiBaseUrl ? `${apiBaseUrl}/api/uploads${filePath}` : `${apiPrefix}/uploads${filePath}`,
                                    apiBaseUrl ? `${apiBaseUrl}/api/file/download?path=${encodeURIComponent(filePath)}` : `${apiPrefix}/file/download?path=${encodeURIComponent(filePath)}`,
                                  ];
                                  
                                  const currentSrc = target.src;
                                  const nextAlt = alternatives.find(alt => alt !== currentSrc);
                                  
                                  if (nextAlt && retryCount < maxRetries) {
                                    target.dataset.retryCount = String(retryCount + 1);
                                    target.src = nextAlt;
                                  } else {
                                    target.src = "/placeholder.svg";
                                    target.onerror = null; // Remove error handler to stop retries
                                  }
                                } else {
                                  target.src = "/placeholder.svg";
                                  target.onerror = null; // Remove error handler to stop retries
                                }
                              }}
                              data-retry-count="0"
                            />
                          ) : (
                            <div className="text-gray-400">No image</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No images attached
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Add Your Assessment */}
            <Card>
              <CardHeader>
                <CardTitle>Add Your Assessment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    Details and actions taken
                  </Label>
                  <Textarea
                    placeholder="Enter your technical findings here..."
                    value={assessment}
                    onChange={(e) => setAssessment(e.target.value)}
                    rows={6}
                    className="w-full"
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    Upload Additional Images
                  </Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
                    <Cloud className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">Select file or take a photo</p>
                    <Button variant="outline" onClick={handleFileUpload}>
                      <Upload className="h-4 w-4 mr-2" />
                      Browse Files
                    </Button>
                    <p className="text-sm text-gray-500 mt-2">
                      Maximum 5 files (JPG, PNG, PDF) up to 10MB each
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bottom Action Buttons */}
            <div className="flex justify-end gap-4 pt-4">
              <Button variant="outline" onClick={handleSendBack}>
                Send Back to Reviewer
              </Button>
              <Button onClick={handleMarkComplete}>
                Mark as Complete
              </Button>
            </div>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Case Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>
                  Case Timeline ({queryData?.queryhistory?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {queryData?.queryhistory && queryData.queryhistory.length > 0 ? (
                  <div className="space-y-4">
                    {[...queryData.queryhistory]
                      .sort(
                        (a, b) =>
                          new Date(b.changedAt).getTime() -
                          new Date(a.changedAt).getTime()
                      )
                      .map((item) => (
                        <div key={item.id} className="flex items-start space-x-3">
                          <div className="flex-shrink-0 mt-1">
                            <div className="h-3 w-3 rounded-full bg-blue-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">
                              {item.status?.name || "Unknown status"}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(item.changedAt).toLocaleString("en-US", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </p>
                            <p className="text-sm text-gray-700 mt-1">
                              {item.userInfo ? "Updated by user" : "System update"}
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500 text-sm border rounded-lg bg-gray-50">
                    No history available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Comments */}
            <Card>
              <CardHeader>
                <CardTitle>Comments ({queryData?.queryComments?.length || 0})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Existing Comments */}
                {queryData?.queryComments && queryData.queryComments.length > 0 ? (
                  <div className="space-y-3 max-h-64 overflow-y-auto border rounded-lg p-4 bg-gray-50">
                    {[...queryData.queryComments]
                      .sort(
                        (a, b) =>
                          new Date(b.createdAt).getTime() -
                          new Date(a.createdAt).getTime()
                      )
                      .map((commentItem) => (
                        <div
                          key={commentItem.id}
                          className="border-b border-gray-200 pb-3 last:border-b-0 last:pb-0"
                        >
                          <p className="text-sm text-gray-900 mb-1">
                            {commentItem.comment}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span>
                              {new Date(commentItem.createdAt).toLocaleString("en-US", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </span>
                            <span className="text-[10px] uppercase tracking-wide bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">
                              {commentItem.commentedBy}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500 text-sm border rounded-lg bg-gray-50">
                    No comments yet
                  </div>
                )}

                {/* Add Comment */}
                <div className="border-t pt-4 space-y-2">
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    Add Comment
                  </Label>
                  <Textarea
                    placeholder="Type your comment here..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={3}
                    className="w-full mb-3"
                  />
                  <Button
                    onClick={handlePostComment}
                    className="w-full"
                    disabled={isAddingComment || !newComment.trim()}
                  >
                    {isAddingComment ? "Adding..." : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Post Comment
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AwaitingAction;
