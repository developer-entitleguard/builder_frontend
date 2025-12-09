import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import type { BuilderQuery } from "@/lib/api/services/query";
import { getApiBaseUrl, getApiBaseUrlWithPrefix } from "@/lib/config";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Check,
  Clock,
  FileText,
  MessageCircle,
  User,
  Wrench,
  Upload,
  Cloud,
  Send,
} from "lucide-react";

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

interface Comment {
  id: string;
  user: string;
  timestamp: string;
  content: string;
  highlighted?: boolean;
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

const mockTimeline: TimelineEvent[] = [
  {
    id: "1",
    type: "created",
    timestamp: "Nov 15, 2023 - 09:14 AM",
    user: "Michael Chen submitted the case",
    description: "Case Created",
    icon: <FileText className="h-4 w-4 text-blue-500" />
  },
  {
    id: "2",
    type: "assigned",
    timestamp: "Nov 15, 2023 - 10:22 AM",
    user: "Assigned to reviewer Emma Thompson",
    description: "Case Assigned",
    icon: <User className="h-4 w-4 text-blue-500" />
  },
  {
    id: "3",
    type: "comment",
    timestamp: "Nov 15, 2023 - 11:45 AM",
    user: "Reviewer Comment",
    description: "Reviewer Comment",
    comment: "This requires immediate attention from our hardware vendor. Please assess and repair ASAP.",
    icon: <MessageCircle className="h-4 w-4 text-blue-500" />
  },
  {
    id: "4",
    type: "vendor_assigned",
    timestamp: "Nov 15, 2023 - 01:30 PM",
    user: "Assigned to TechPower Solutions (You)",
    description: "Assigned to Vendor",
    icon: <Wrench className="h-4 w-4 text-blue-500" />
  },
  {
    id: "5",
    type: "awaiting",
    timestamp: "Current Status",
    user: "Awaiting Vendor Action",
    description: "Awaiting Vendor Action",
    icon: <Clock className="h-4 w-4 text-orange-500" />
  }
];

const mockComments: Comment[] = [
  {
    id: "1",
    user: "Emma Thompson",
    timestamp: "Nov 15, 2023 - 11:45 AM",
    content: "This requires immediate attention from our hardware vendor. Please assess and repair ASAP. The power fluctuations are affecting our database performance.",
    highlighted: true
  },
  {
    id: "2",
    user: "Michael Chen",
    timestamp: "Nov 15, 2023 - 02:10 PM",
    content: "I've implemented temporary monitoring to alert us if the fluctuations exceed critical thresholds. Please let me know when you'll be on-site."
  }
];

const AwaitingAction = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [queryData, setQueryData] = useState<BuilderQuery | null>(null);
  const [assessment, setAssessment] = useState<string>("");
  const [newComment, setNewComment] = useState<string>("");
  const [comments, setComments] = useState<Comment[]>(mockComments);

  // Get query data from navigation state
  useEffect(() => {
    if (location.state?.query) {
      const query = location.state.query as BuilderQuery;
      setQueryData(query);
    }
  }, [location.state]);

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

  const handlePostComment = () => {
    if (newComment.trim()) {
      const comment: Comment = {
        id: Date.now().toString(),
        user: user?.email || "Current User",
        timestamp: new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit"
        }),
        content: newComment
      };
      setComments([...comments, comment]);
      setNewComment("");
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
                    <Label className="text-sm font-medium text-gray-700">Priority</Label>
                    <Badge className={getPriorityColor(queryData?.priorityLevel || "Medium")}>
                      {queryData?.priorityLevel || "-"}
                    </Badge>
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
                <CardTitle>Case Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockTimeline.map((event, index) => (
                    <div key={event.id} className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        {event.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {event.description}
                        </p>
                        <p className="text-xs text-gray-500">
                          {event.timestamp}
                        </p>
                        <p className="text-sm text-gray-700 mt-1">
                          {event.user}
                        </p>
                        {event.comment && (
                          <div className="mt-2 p-2 bg-blue-50 border-l-4 border-blue-200 rounded">
                            <p className="text-sm text-gray-700 italic">
                              "{event.comment}"
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Comments */}
            <Card>
              <CardHeader>
                <CardTitle>Comments</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Existing Comments */}
                <div className="space-y-4">
                  {comments.map((comment) => (
                    <div 
                      key={comment.id} 
                      className={`p-3 rounded-lg ${comment.highlighted ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm text-gray-900">
                          {comment.user}
                        </span>
                        <span className="text-xs text-gray-500">
                          {comment.timestamp}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">
                        {comment.content}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Add Comment */}
                <div className="border-t pt-4">
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
                  <Button onClick={handlePostComment} className="w-full">
                    <Send className="h-4 w-4 mr-2" />
                    Post Comment
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
