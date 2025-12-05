import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import type { BuilderQuery } from "@/lib/api/services/query";
import { useGetBuilderVendorsQuery } from "@/lib/api/services/builderVendor";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
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
import { CalendarIcon, ChevronDown, ArrowLeft, Check, Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";

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
  status: "Open" | "Assigned" | "In Progress" | "Completed";
}

interface CaseHistory {
  id: string;
  action: string;
  timestamp: Date;
  by: string;
}

const mockCase: CaseReview = {
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
  status: "Completed"
};

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

const QueriesComplete = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [queryData, setQueryData] = useState<BuilderQuery | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<string>("");
  const [vendorPhone, setVendorPhone] = useState<string>("");
  const [priorityLevel, setPriorityLevel] = useState<"Low" | "Medium" | "High" | "Critical">("Medium");
  const [dueDate, setDueDate] = useState<Date | undefined>(new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)); // 2 days from now
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

  const handleAssignCase = () => {
    // Handle case assignment logic here
    console.log("Assigning case to vendor:", selectedVendor, "Priority:", priorityLevel);
  };

  const handleAddComment = () => {
    // Handle adding comment logic here
    console.log("Adding comment:", comment);
    setComment("");
  };

  const handleMarkAsDone = () => {
    // Handle marking case as done
    console.log("Marking case as done");
    navigate("/dashboard");
  };

  const handleBackToCases = () => {
    // Navigate back to cases list
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {queryData ? `Query ID: ${queryData.id}` : `Case Review #{mockCase.caseNumber}`}
            </h1>
            <p className="text-gray-600 mt-2">
              {queryData?.orderItem?.order?.createdAt 
                ? `Submitted on ${format(new Date(queryData.orderItem.order.createdAt), "MMM d, yyyy 'at' h:mm a")}`
                : `Submitted on ${format(mockCase.submittedAt, "MMM d, yyyy 'at' h:mm a")}`
              }
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleBackToCases}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to cases
            </Button>
            <Button onClick={handleMarkAsDone}>
              <Check className="h-4 w-4 mr-2" />
              Mark as done
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
                <Button variant="outline" size="sm">
                  {queryData?.status?.name || "Complete"}
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Submitted By</Label>
                    <p className="text-gray-900 font-semibold">
                      {queryData?.orderItem?.order?.customerSourceMap?.customer?.name || mockCase.submittedBy}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Contact Phone</Label>
                    <p className="text-gray-900 font-semibold">
                      {queryData?.orderItem?.order?.customerSourceMap?.customer?.contact || mockCase.contactPhone}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Contact Email</Label>
                    <p className="text-gray-900">
                      {queryData?.orderItem?.order?.customerSourceMap?.customer?.email || mockCase.contactEmail}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Priority</Label>
                    <Badge className={getPriorityColor(queryData?.priorityLevel || mockCase.priority)}>
                      {queryData?.priorityLevel || mockCase.priority}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Category</Label>
                    <Badge variant="outline" className="font-semibold">
                      {queryData?.orderItem?.productName || mockCase.category}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Location</Label>
                    <Badge variant="outline" className="font-semibold">
                      {queryData?.orderItem?.order?.customerSourceMap?.customer?.address?.city || mockCase.location}
                    </Badge>
                  </div>
                </div>

                <div className="mb-6">
                  <Label className="text-sm font-medium text-gray-700">Description</Label>
                  <p className="text-gray-900 mt-2 leading-relaxed">
                    {queryData?.description || mockCase.description}
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
                      <>
                        <p>{mockCase.address.street}</p>
                        <p>{mockCase.address.suite}</p>
                        <p>{mockCase.address.city}, {mockCase.address.state} {mockCase.address.zip}</p>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Photos Submitted */}
            <Card>
              <CardHeader>
                <CardTitle>Photos Submitted ({mockCase.photos.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  {mockCase.photos.map((photo, index) => (
                    <div key={index} className="aspect-square bg-gray-200 rounded-lg flex items-center justify-center">
                      <img 
                        src={photo} 
                        alt={`Case photo ${index + 1}`}
                        className="w-full h-full object-cover rounded-lg"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = "/placeholder.svg";
                        }}
                      />
                    </div>
                  ))}
                </div>
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
                  <Select value={selectedVendor} onValueChange={setSelectedVendor}>
                    <SelectTrigger>
                      <SelectValue placeholder={isLoadingVendors ? "Loading vendors..." : "Select a vendor..."} />
                    </SelectTrigger>
                    <SelectContent>
                      {isLoadingVendors ? (
                        <SelectItem value="loading" disabled>Loading vendors...</SelectItem>
                      ) : vendors.length > 0 ? (
                        vendors.map((vendor) => (
                          <SelectItem key={vendor.id} value={vendor.id}>
                            {vendor.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-vendors" disabled>No vendors available</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="vendor-phone">Or Enter Vendor Phone Number</Label>
                  <Input
                    id="vendor-phone"
                    placeholder="(555) 555-5555"
                    value={vendorPhone}
                    onChange={(e) => setVendorPhone(e.target.value)}
                  />
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

                <Button className="w-full" onClick={handleAssignCase}>
                  Assign Case
                </Button>
              </CardContent>
            </Card>

            {/* Add Comments */}
            <Card>
              <CardHeader>
                <CardTitle>Add Comments</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Add your comments or notes about this case..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={4}
                />
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Paperclip className="h-4 w-4 mr-2" />
                    Attach File
                  </Button>
                  <Button size="sm" onClick={handleAddComment}>
                    Add Comment
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Case History */}
            <Card>
              <CardHeader>
                <CardTitle>Case History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockHistory.map((item, index) => (
                    <div key={item.id} className="flex">
                      <div className="flex-shrink-0 w-1 bg-blue-500 rounded-full mr-4"></div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{item.action}</p>
                        <p className="text-sm text-gray-600">
                          {format(item.timestamp, "MMM d, yyyy 'at' h:mm a")}
                        </p>
                        <p className="text-sm text-gray-500">By: {item.by}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default QueriesComplete;
