import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import type { BuilderQuery } from "@/lib/api/services/query";
import { useGetBuilderVendorsQuery } from "@/lib/api/services/builderVendor";
import { useUpdateQueryMutation, useAddQueryCommentMutation, useLazyGetQueryByIdQuery } from "@/lib/api/services/query";
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
import { CalendarIcon, ChevronDown, Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";
import { getApiBaseUrl, getApiBaseUrlWithPrefix } from "@/lib/config";
import { viewPhotoUrl } from "@/lib/api/services/files";

interface CaseReview {
  id: string;
  caseNumber: string;
  submittedBy: string;
  contactPhone: string;
  contactEmail: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  category: string;
  location: string;
  description: string;
  address: {
    street: string;
    suite: string;
    city: string;
    state: string;
    zip: string;
  };
  submittedAt: Date;
  photos: string[];
  status: "Open" | "Assigned" | "In Progress" | "Closed";
}

interface CaseHistory {
  id: string;
  action: string;
  timestamp: Date;
  by: string;
}

const mockCases: CaseReview[] = [
  {
    id: "1",
    caseNumber: "CR-2023-0458",
    submittedBy: "Michael Rodriguez",
    contactPhone: "(555) 123-4567",
    contactEmail: "m.rodriguez@example.com",
    priority: "High",
    category: "Plumbing Issue",
    location: "Main Building - 3rd Floor",
    description: "Water leak from ceiling in the break room. The leak appears to be coming from the bathroom on the floor above. Water is dripping steadily and has already caused damage to the ceiling tiles. This needs immediate attention as it's affecting the use of the break room and could cause further damage if not addressed quickly.",
    address: {
      street: "123 Business Center",
      suite: "Suite 300",
      city: "San Francisco",
      state: "CA",
      zip: "94103"
    },
    submittedAt: new Date("2023-11-15T10:23:00"),
    photos: [
      "/placeholder.svg",
      "/placeholder.svg", 
      "/placeholder.svg"
    ],
    status: "Open"
  },
  {
    id: "2",
    caseNumber: "CR-2023-0459",
    submittedBy: "Sarah Johnson",
    contactPhone: "(555) 987-6543",
    contactEmail: "s.johnson@example.com",
    priority: "Medium",
    category: "Electrical Issue",
    location: "Building B - 2nd Floor",
    description: "Power outlet in conference room not working. Multiple devices cannot be plugged in during meetings.",
    address: {
      street: "456 Corporate Plaza",
      suite: "Suite 200",
      city: "San Francisco",
      state: "CA",
      zip: "94105"
    },
    submittedAt: new Date("2023-11-15T14:30:00"),
    photos: [
      "/placeholder.svg",
      "/placeholder.svg"
    ],
    status: "Open"
  }
];

const mockVendors = [
  { id: "1", name: "ABC Plumbing Services", phone: "(555) 111-2222" },
  { id: "2", name: "XYZ Electrical Co.", phone: "(555) 333-4444" },
  { id: "3", name: "Premier Maintenance", phone: "(555) 555-6666" },
];

const mockHistory: CaseHistory[] = [
  {
    id: "1",
    action: "Case Created",
    timestamp: new Date("2023-11-15T10:23:00"),
    by: "Michael Rodriguez"
  },
  {
    id: "2", 
    action: "Case Assigned to Review",
    timestamp: new Date("2023-11-15T10:25:00"),
    by: "System"
  },
  {
    id: "3",
    action: "Case Opened by Reviewer", 
    timestamp: new Date("2023-11-15T11:02:00"),
    by: "Sarah Johnson"
  }
];

const PendingQueries = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [queryData, setQueryData] = useState<BuilderQuery | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<string>("");
  const [vendorPhone, setVendorPhone] = useState<string>("");
  const [priorityLevel, setPriorityLevel] = useState<"Low" | "Medium" | "High" | "Critical">("Medium");
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [comment, setComment] = useState<string>("");

  const builderId = user && 'builderOrganization' in user 
    ? user.builderOrganization.id 
    : null;

  // Fetch vendors from API
  const { data: vendorsData, isLoading: isLoadingVendors } = useGetBuilderVendorsQuery(
    { builderId: builderId || "" },
    { 
      skip: !builderId,
      refetchOnMountOrArgChange: true,
    }
  );

  const vendors = vendorsData?.data || [];

  // Update query mutation
  const [updateQuery, { isLoading: isUpdating }] = useUpdateQueryMutation();
  
  // Add comment mutation
  const [addComment, { isLoading: isAddingComment }] = useAddQueryCommentMutation();
  
  // Lazy query to refetch query data after adding comment
  const [getQueryById] = useLazyGetQueryByIdQuery();
  
  // Toast for notifications
  const { toast } = useToast();

  // Get query data from navigation state
  useEffect(() => {
    if (location.state?.query) {
      const query = location.state.query as BuilderQuery;
      setQueryData(query);
      
      // Update priority level from query data
      if (query.priorityLevel) {
        const priorityUpper = query.priorityLevel.toUpperCase();
        let priority: "Low" | "Medium" | "High" | "Critical" = "Medium";
        
        if (priorityUpper === "LOW") {
          priority = "Low";
        } else if (priorityUpper === "MEDIUM") {
          priority = "Medium";
        } else if (priorityUpper === "HIGH") {
          priority = "High";
        } else if (priorityUpper === "CRITICAL") {
          priority = "Critical";
        }
        
        setPriorityLevel(priority);
      }
      
      // Update due date from query data
      if (query.dueDate) {
        setDueDate(new Date(query.dueDate));
      }
      
      // Pre-select vendor if query already has a vendor assigned
      if (query.vendor?.id) {
        setSelectedVendor(query.vendor.id);
      }
      
      // Set vendor contact from query data if available
      if (query.vendor?.contact) {
        setVendorPhone(query.vendor.contact);
      }
    }
  }, [location.state]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "Low": return "bg-gray-100 text-gray-800";
      case "Medium": return "bg-blue-100 text-blue-800";
      case "High": return "bg-red-100 text-red-800";
      case "Critical": return "bg-red-200 text-red-900";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const handleAssignCase = async () => {
    if (!queryData) {
      console.error("No query data available");
      return;
    }

    try {
      // Call the update query API with only id, statusId, and vendorId
      const result = await updateQuery({
        id: queryData.id,
        statusId: queryData.status?.id || undefined,
        vendorId: selectedVendor?.trim() || undefined,
      }).unwrap();

      if (result.success) {
        toast({
          title: "Success",
          description: result.message || "Query Updated Successfully",
        });
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to update query",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error updating query:", error);
      toast({
        title: "Error",
        description: "An error occurred while updating the query",
        variant: "destructive",
      });
    }
  };

  const handleAddComment = async () => {
    if (!comment.trim()) {
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

    // Get user ID and builder organization ID
    const userId = user && 'id' in user ? user.id : null;
    const commentedBy = user && 'builderOrganization' in user 
      ? user.builderOrganization.id 
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
        comment: comment.trim(),
        commentedBy,
        id: userId,
        queryId: queryData.id,
      }).unwrap();

      if (result.success) {
        toast({
          title: "Success",
          description: result.message || "Comment added successfully",
        });
        setComment("");
        
        // Refetch query data to get updated comments
        if (queryData?.id) {
          try {
            const queryResult = await getQueryById({ id: queryData.id }).unwrap();
            if (queryResult.success && queryResult.data) {
              setQueryData(queryResult.data);
            }
          } catch (refetchError) {
            console.error("Error refetching query:", refetchError);
            // Don't show error toast for refetch failure, comment was already added
          }
        }
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to add comment",
          variant: "destructive",
        });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {queryData ? `Query ID: ${queryData.id}` : "Query Details"}
          </h1>
          <p className="text-gray-600 mt-2">
            {queryData?.createdAt 
              ? `Submitted on ${format(new Date(queryData.createdAt), "MMM d, yyyy 'at' h:mm a")}`
              : ""
            }
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Case Details */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Case Details</CardTitle>
                <Button variant="outline" size="sm">
                  {queryData?.status?.name || "Open"}
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Submitted By</Label>
                    <p className="text-gray-900">
                      {queryData?.orderItem?.order?.customerSourceMap?.customer?.name || "-"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Contact Phone</Label>
                    <p className="text-gray-900">
                      {queryData?.orderItem?.order?.customerSourceMap?.customer?.contact || "-"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Contact Email</Label>
                    <p className="text-gray-900">
                      {queryData?.orderItem?.order?.customerSourceMap?.customer?.email || "-"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Priority</Label>
                    <div className="mt-1">
                      <Badge className={getPriorityColor(priorityLevel)}>
                        {queryData?.priorityLevel || priorityLevel}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Category</Label>
                    <div className="mt-1">
                      <Badge variant="outline">
                        {queryData?.orderItem?.productName || "-"}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Location</Label>
                    <div className="mt-1">
                      <Badge variant="outline">
                        {queryData?.orderItem?.order?.customerSourceMap?.customer?.address?.city || "-"}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <Label className="text-sm font-medium text-gray-700">Description</Label>
                  <p className="text-gray-900 mt-2">
                    {queryData?.description || "-"}
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700">Address</Label>
                  <div className="text-gray-900 mt-2">
                    {queryData?.orderItem?.order?.shipToAddress ? (
                      <>
                        {queryData.orderItem.order.shipToAddress.street && (
                          <p>{queryData.orderItem.order.shipToAddress.street}</p>
                        )}
                        {queryData.orderItem.order.shipToAddress.apt && (
                          <p>{queryData.orderItem.order.shipToAddress.apt}</p>
                        )}
                        <p>
                          {queryData.orderItem.order.shipToAddress.city}
                          {queryData.orderItem.order.shipToAddress.state && `, ${queryData.orderItem.order.shipToAddress.state}`}
                          {queryData.orderItem.order.shipToAddress.zipCode && ` ${queryData.orderItem.order.shipToAddress.zipCode}`}
                        </p>
                      </>
                    ) : (
                      <p className="text-gray-500">No address available</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Photos Submitted */}
            <Card>
              <CardHeader>
                <CardTitle>
                  Photos Submitted ({queryData?.queryFileMaps?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {queryData?.queryFileMaps && queryData.queryFileMaps.length > 0 ? (
                  <div className="grid grid-cols-3 gap-4">
                    {queryData.queryFileMaps.map((fileMap) => {
                      const fileId = fileMap.files?.id;
                      const fileName = fileMap.files?.name || 'Query file';
                      
                      const imageUrl = fileId ? viewPhotoUrl(fileId) : null;
                      
                      return (
                        <div key={fileMap.id} className="aspect-square bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
                          {imageUrl ? (
                            <img 
                              src={imageUrl} 
                              alt={fileName}
                              className="w-full h-full object-cover rounded-lg"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = "/placeholder.svg";
                                target.onerror = null;
                              }}
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
                    No photos submitted
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Assign to Vendor */}
            <Card>
              <CardHeader>
                <CardTitle>Assign to Vendor</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="vendor-select">Select Vendor</Label>
                  <Select 
                    value={selectedVendor || (queryData?.vendor?.id || "")} 
                    onValueChange={(value) => {
                      setSelectedVendor(value);
                      // Auto-populate vendor phone when vendor is selected
                      const selectedVendorData = vendors.find(v => v.id === value);
                      if (selectedVendorData?.contact) {
                        setVendorPhone(selectedVendorData.contact);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={isLoadingVendors ? "Loading vendors..." : queryData?.vendor?.name || "Select a vendor..."} />
                    </SelectTrigger>
                    <SelectContent>
                      {isLoadingVendors ? (
                        <SelectItem value="loading" disabled>Loading vendors...</SelectItem>
                      ) : vendors.length === 0 ? (
                        <SelectItem value="no-vendors" disabled>No vendors available</SelectItem>
                      ) : (
                        vendors.map((vendor) => (
                          <SelectItem key={vendor.id} value={vendor.id}>
                            {vendor.name} {vendor.type && `(${vendor.type})`}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {queryData?.vendor && !vendors.find(v => v.id === queryData.vendor?.id) && (
                    <p className="text-sm text-gray-500 mt-1">
                      Current vendor: {queryData.vendor.name}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="vendor-phone">Vendor Contact</Label>
                  <Input
                    id="vendor-phone"
                    placeholder="(555) 555-5555"
                    value={vendorPhone || queryData?.vendor?.contact || ''}
                    onChange={(e) => setVendorPhone(e.target.value)}
                  />
                  {(selectedVendor && vendors.find(v => v.id === selectedVendor)) || queryData?.vendor ? (
                    <div className="text-sm text-gray-500 mt-1 space-y-1">
                      {(() => {
                        const vendor = selectedVendor 
                          ? vendors.find(v => v.id === selectedVendor)
                          : queryData?.vendor;
                        return (
                          <>
                            {vendor?.email && (
                              <p>Email: {vendor.email}</p>
                            )}
                            {vendor?.contact && (
                              <p>Contact: {vendor.contact}</p>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  ) : null}
                </div>

                <div>
                  <Label>Priority Level</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <Button
                      variant={priorityLevel === "Low" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPriorityLevel("Low")}
                    >
                      Low
                    </Button>
                    <Button
                      variant={priorityLevel === "Medium" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPriorityLevel("Medium")}
                    >
                      Medium
                    </Button>
                    <Button
                      variant={priorityLevel === "High" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPriorityLevel("High")}
                    >
                      High
                    </Button>
                    <Button
                      variant={priorityLevel === "Critical" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPriorityLevel("Critical")}
                    >
                      Critical
                    </Button>
                  </div>
                </div>

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
                        {dueDate ? format(dueDate, "PPP") : <span>Pick a date</span>}
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

                <Button 
                  className="w-full" 
                  onClick={handleAssignCase}
                  disabled={isUpdating || !queryData}
                >
                  {isUpdating ? "Assigning..." : "Assign Case"}
                </Button>
              </CardContent>
            </Card>

            {/* Add Comments */}
            <Card>
              <CardHeader>
                <CardTitle>Comments ({queryData?.queryComments?.length || 0})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Display existing comments */}
                {queryData?.queryComments && queryData.queryComments.length > 0 ? (
                  <div className="space-y-3 max-h-64 overflow-y-auto border rounded-lg p-4 bg-gray-50">
                    {[...queryData.queryComments]
                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .map((commentItem) => (
                        <div key={commentItem.id} className="border-b border-gray-200 pb-3 last:border-b-0 last:pb-0">
                          <p className="text-sm text-gray-900 mb-1">{commentItem.comment}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span>{format(new Date(commentItem.createdAt), "MMM d, yyyy 'at' h:mm a")}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500 text-sm border rounded-lg bg-gray-50">
                    No comments yet
                  </div>
                )}
                
                {/* Add new comment */}
                <div className="space-y-2">
                  <Label htmlFor="new-comment">Add a comment</Label>
                  <Textarea
                    id="new-comment"
                    placeholder="Add your comments or notes about this case..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={4}
                  />
                  <div className="flex gap-2">
                    {/* <Button variant="outline" size="sm">
                      <Paperclip className="h-4 w-4 mr-2" />
                      Attach File
                    </Button> */}
                    <Button 
                      size="sm" 
                      onClick={handleAddComment}
                      disabled={isAddingComment || !comment.trim()}
                    >
                      {isAddingComment ? "Adding..." : "Add Comment"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Case History */}
            <Card>
              <CardHeader>
                <CardTitle>
                  Case History ({queryData?.queryhistory?.length || 0})
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
                        <div key={item.id} className="flex">
                          <div className="flex-shrink-0 w-1 bg-blue-500 rounded-full mr-4"></div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">
                              {item.status?.name || "Unknown status"}
                            </p>
                            <p className="text-sm text-gray-600">
                              {format(new Date(item.changedAt), "MMM d, yyyy 'at' h:mm a")}
                            </p>
                            <p className="text-sm text-gray-500">
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
          </div>
        </div>
      </main>
    </div>
  );
};

export default PendingQueries;
