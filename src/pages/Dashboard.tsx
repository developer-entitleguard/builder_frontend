import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useGetDashboardCountQuery, useGetRegistrationsQuery, useGetStatusesByTypeQuery } from "@/store/api/dashboard";
import { useGetBuilderOrganizationQuery } from "@/lib/api/services/builderOrganization";
import Header from "@/components/Header";
import { RegistrationTypeDialog } from "@/components/RegistrationTypeDialog";
import { BulkActionsBar } from "@/components/BulkActionsBar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Search,
  Building2,
  FileText,
  Clock,
  CheckCircle,
  Send,
  Users,
  Home,
  Package,
  MessageSquare,
  Settings,
  FolderKanban,
  Filter,
} from "lucide-react";

interface HomeownerRegistration {
  id: string;
  customer_name: string;
  customer_email: string;
  property_address: string;
  property_city: string;
  property_state: string;
  project_name: string;
  status: string;
  statusName: string;
  created_at: string;
  entitlement_sent_at: string | null;
  billMaterialId?: string;
}

interface OwnerRegistrationResponse {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string;
  contact: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  projectName: string;
  statusName: string;
  createdAt: string;
  builderId: string;
  builderName: string;
  billMaterialId?: string;
}

interface ProjectGroup {
  projectName: string;
  totalCount: number;
  sentCount: number;
  homeowners: Array<{
    id: string;
    firstName: string;
    lastName: string | null;
    email: string;
    contact: string;
    statusName: string;
    createdAt: string;
    builderId: string;
    builderName: string;
  }>;
}

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedRegistrations, setSelectedRegistrations] = useState<string[]>(
    []
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"by-owner" | "by-project">("by-owner");

  // Get builderId from localStorage (userData.userInfo.builderOrganization.id)
  const builderId = useMemo(() => {
    const userData = localStorage.getItem('userData');
    if (userData) {
      try {
        const parsedData = JSON.parse(userData);
        if (parsedData.userInfo?.builderOrganization?.id) {
          return parsedData.userInfo.builderOrganization.id;
        }
      } catch (error) {
        console.warn('Failed to parse userData:', error);
      }
    }
    // Fallback to user object if available
    if (user && 'builderOrganization' in user && user.builderOrganization) {
      return user.builderOrganization.id;
    }
    return null;
  }, [user]);

  // Fetch dashboard counts from API
  const { 
    data: dashboardCountData, 
    isLoading: isCountsLoading, 
    error: countsError,
    refetch: refetchDashboardCount
  } = useGetDashboardCountQuery(
    { builderId: builderId || '' },
    { 
      skip: !builderId,
      refetchOnMountOrArgChange: true
    }
  );

  // Fetch registrations by type - fetch both for instant tab switching
  const { 
    data: ownerRegistrationsData, 
    isLoading: isLoadingOwner,
    error: ownerError,
    refetch: refetchOwnerRegistrations
  } = useGetRegistrationsQuery(
    { builderId: builderId || '', type: 'owner' },
    { 
      skip: !builderId,
      refetchOnMountOrArgChange: true
    }
  );

  const { 
    data: projectRegistrationsData, 
    isLoading: isLoadingProject,
    error: projectError,
    refetch: refetchProjectRegistrations
  } = useGetRegistrationsQuery(
    { builderId: builderId || '', type: 'project' },
    { 
      skip: !builderId,
      refetchOnMountOrArgChange: true
    }
  );

  // Fetch statuses for filter dropdown
  const { 
    data: statusesData, 
    isLoading: isLoadingStatuses 
  } = useGetStatusesByTypeQuery(
    { type: 'BUILDER' }
  );

  const { 
    data: organizationData 
  } = useGetBuilderOrganizationQuery(
    builderId || '',
    { skip: !builderId }
  );

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
  }, [user, navigate]);

  useEffect(() => {
    if (builderId) {
      refetchOwnerRegistrations();
      refetchProjectRegistrations();
      refetchDashboardCount();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [builderId]);

  // Transform owner API response to component format
  const ownerRegistrations = useMemo(() => {
    if (!ownerRegistrationsData?.data || !Array.isArray(ownerRegistrationsData.data)) return [];
    
    return (ownerRegistrationsData.data as OwnerRegistrationResponse[]).map((item) => {
      // Map status from API format to component format
      let status = 'draft';
      if (item.statusName) {
        const statusLower = item.statusName.toLowerCase();
        if (statusLower === 'entitlement') {
          status = 'documents_pending';
        } else if (statusLower === 'sent') {
          status = 'sent';
        } else if (statusLower === 'draft') {
          status = 'draft';
        }
      }
      
      return {
        id: item.id,
        customer_name: `${item.firstName || ''} ${item.lastName || ''}`.trim(),
        customer_email: item.email || '',
        property_address: item.address || '',
        property_city: item.city || '',
        property_state: item.state || '',
        project_name: item.projectName || 'No Project',
        status: status,
        statusName: item.statusName || 'DRAFT',
        created_at: item.createdAt,
        entitlement_sent_at: item.statusName === 'SENT' ? item.createdAt : null,
        billMaterialId: item.billMaterialId,
      };
    });
  }, [ownerRegistrationsData]);

  // Transform project API response to component format
  const projectGroups = useMemo(() => {
    if (!projectRegistrationsData?.data || !Array.isArray(projectRegistrationsData.data)) return {};
    
    const groups: Record<string, HomeownerRegistration[]> = {};
    
    (projectRegistrationsData.data as ProjectGroup[]).forEach((project) => {
      const projectName = project.projectName || 'No Project';
      groups[projectName] = project.homeowners.map((homeowner) => {
        // Map status from API format to component format
        let status = 'draft';
        if (homeowner.statusName) {
          const statusLower = homeowner.statusName.toLowerCase();
          if (statusLower === 'entitlement') {
            status = 'documents_pending';
          } else if (statusLower === 'sent') {
            status = 'sent';
          } else if (statusLower === 'draft') {
            status = 'draft';
          }
        }
        
        return {
          id: homeowner.id,
          customer_name: `${homeowner.firstName || ''} ${homeowner.lastName || ''}`.trim(),
          customer_email: homeowner.email || '',
          property_address: homeowner.contact || '', // Using contact as fallback
          property_city: '',
          property_state: '',
          project_name: projectName,
          status: status,
          statusName: homeowner.statusName || 'DRAFT',
          created_at: homeowner.createdAt,
          entitlement_sent_at: homeowner.statusName === 'SENT' ? homeowner.createdAt : null,
        };
      });
    });
    
    return groups;
  }, [projectRegistrationsData]);

  // Determine which registrations to use based on active tab
  const currentRegistrations = activeTab === 'by-owner' ? ownerRegistrations : [];
  const isLoadingRegistrations = activeTab === 'by-owner' ? isLoadingOwner : isLoadingProject;
  const registrationsError = activeTab === 'by-owner' ? ownerError : projectError;

  // Get all registrations from project groups for filtering/search
  const allProjectRegistrations = useMemo(() => {
    return Object.values(projectGroups).flat();
  }, [projectGroups]);

  useEffect(() => {
    if (registrationsError) {
      toast({
        title: "Error loading registrations",
        description: "Failed to load registrations. Please try again.",
        variant: "destructive",
      });
    }
  }, [registrationsError, toast]);

  // Helper function to format status name for display
  const formatStatusName = (statusName: string): string => {
    // Handle both underscore and space-separated status names
    return statusName
      .split(/[_\s]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Helper function to convert API status name to filter value
  // Use the actual status name as the filter value to distinguish between similar statuses
  const statusNameToFilterValue = (statusName: string): string => {
    // Return the status name as-is (normalized to uppercase for consistency)
    return statusName.toUpperCase();
  };

  // Get statuses from API
  const statuses = statusesData?.data || [];

  const getFilterDisplayText = (filterValue: string): string => {
    if (filterValue === "all") return "All Statuses";
    const status = statuses.find(s => statusNameToFilterValue(s.name) === filterValue);
    return status ? formatStatusName(status.name) : "Filter by status";
  };

  const getStatusBadge = (status: string) => {
    // Normalize status to uppercase for API statusName values
    const normalizedStatus = status.toUpperCase();
    
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
      DRAFT: { label: "Draft", variant: "secondary" },
      ENTITLEMENT: { label: "Entitlement", variant: "default" },
      SENT: { label: "Sent", variant: "default" },
      DELIVERED: { label: "Delivered", variant: "default" },
      // Also support lowercase/underscore format for backward compatibility
      draft: { label: "Draft", variant: "secondary" },
      documents_pending: { label: "Documents Pending", variant: "outline" },
      ready_for_review: { label: "Ready for Review", variant: "default" },
      sent: { label: "Sent", variant: "default" },
      delivered: { label: "Delivered", variant: "default" },
      entitlement: { label: "Entitlement", variant: "default" },
    };

    const config = statusConfig[normalizedStatus] || statusConfig[status.toLowerCase().replace(/\s+/g, '_')] || statusConfig.DRAFT;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getStatusIcon = (status: string) => {
    // Normalize status to uppercase for API statusName values
    const normalizedStatus = status.toUpperCase();
    
    switch (normalizedStatus) {
      case "DRAFT":
        return <FileText className="h-4 w-4 text-muted-foreground" />;
      case "ENTITLEMENT":
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case "SENT":
        return <Send className="h-4 w-4 text-green-500" />;
      case "DELIVERED":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      // Also support lowercase/underscore format for backward compatibility
      case "draft":
        return <FileText className="h-4 w-4 text-muted-foreground" />;
      case "documents_pending":
        return <Clock className="h-4 w-4 text-orange-500" />;
      case "ready_for_review":
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case "sent":
        return <Send className="h-4 w-4 text-green-500" />;
      case "delivered":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "entitlement":
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const filteredRegistrations = currentRegistrations.filter((reg) => {
    const matchesSearch =
      reg.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reg.customer_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reg.property_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reg.project_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || reg.statusName.toUpperCase() === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRegistrations(filteredRegistrations.map((r) => r.id));
    } else {
      setSelectedRegistrations([]);
    }
  };

  const handleSelectRegistration = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedRegistrations((prev) => [...prev, id]);
    } else {
      setSelectedRegistrations((prev) => prev.filter((regId) => regId !== id));
    }
  };

  // Filter project groups by search and status
  const filteredProjectGroups = useMemo(() => {
    const filtered: Record<string, HomeownerRegistration[]> = {};
    
    Object.entries(projectGroups).forEach(([projectName, regs]) => {
      const filteredRegs = regs.filter((reg) => {
        const matchesSearch =
          reg.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          reg.customer_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          reg.property_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
          reg.project_name?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === "all" || reg.statusName.toUpperCase() === statusFilter;

        return matchesSearch && matchesStatus;
      });
      
      if (filteredRegs.length > 0) {
        filtered[projectName] = filteredRegs;
      }
    });
    
    return filtered;
  }, [projectGroups, searchTerm, statusFilter]);

  // Use API data for stats, fallback to calculated values if API data not available
  const stats = dashboardCountData?.data
    ? {
        total: dashboardCountData.data.totalHomeowners,
        sent: dashboardCountData.data.entitlementsSent,
        pending: dashboardCountData.data.pending,
        ready: dashboardCountData.data.readyForReview,
      }
    : {
    total: ownerRegistrations.length,
    sent: ownerRegistrations.filter(
      (r) => r.status === "sent" || r.status === "delivered" || r.status === "entitlement"
    ).length,
    pending: ownerRegistrations.filter(
      (r) => r.status === "draft" || r.status === "documents_pending"
    ).length,
    ready: ownerRegistrations.filter((r) => r.status === "ready_for_review").length,
  };

  // Show loading if either registrations or dashboard counts are loading
  if ((isCountsLoading && builderId) || isLoadingRegistrations) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Building2 className="h-8 w-8 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Show error if API call failed
  if (countsError && builderId) {
    toast({
      title: "Error loading dashboard stats",
      description: "Failed to load dashboard statistics. Showing local data.",
      variant: "destructive",
    });
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Organization Welcome Message */}
        {organizationData?.data?.name && (
          <div className="mb-6">
            <p className="text-lg font-semibold text-foreground">
               <span className="text-primary">{organizationData.data.name}</span>
            </p>
          </div>
        )}
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-blue-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    Total Homeowners
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    {stats.total}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Send className="h-8 w-8 text-green-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    Entitlements Sent
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    {stats.sent}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-orange-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    Pending
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    {stats.pending}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-blue-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    Ready for Review
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    {stats.ready}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => navigate("/items")}
          >
            <CardContent className="p-6">
              <div className="flex flex-col h-full">
                <div className="flex flex-col items-center text-center space-y-2">
                  <Package className="h-8 w-8 text-blue-500" />
                  <h3 className="font-semibold text-foreground">
                    Manage Items
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Add and organize master item list
                  </p>
                  <div className="flex justify-end mb-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="bg-primary text-primary-foreground"
                    >
                      View
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => navigate("/queries")}
          >
            <CardContent className="p-6">
              <div className="flex flex-col h-full">
                <div className="flex flex-col items-center text-center space-y-2">
                  <MessageSquare className="h-8 w-8 text-green-500" />
                  <h3 className="font-semibold text-foreground">
                    Homeowner Queries
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Respond to homeowner questions
                  </p>
                  <div className="flex justify-end mb-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="bg-primary text-primary-foreground"
                    >
                      View
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => navigate("/admin")}
          >
            <CardContent className="p-6">
              <div className="flex flex-col h-full">
                <div className="flex flex-col items-center text-center space-y-2">
                  <Settings className="h-8 w-8 text-orange-500" />
                  <h3 className="font-semibold text-foreground">
                    Organization Admin
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Manage org details and users
                  </p>
                  <div className="flex justify-end mb-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="bg-primary text-primary-foreground"
                    >
                      Manage
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => setDialogOpen(true)}
          >
            <CardContent className="p-6">
              <div className="flex flex-col h-full">
                <div className="flex flex-col items-center text-center space-y-2">
                  <Plus className="h-8 w-8 text-purple-500" />
                  <h3 className="font-semibold text-foreground">
                    New Registration
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Start homeowner onboarding
                  </p>
                  <div className="flex justify-end mb-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="bg-primary text-primary-foreground"
                    >
                      Start
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search homeowners..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="all">All Statuses</SelectItem>
                {isLoadingStatuses ? (
                  <SelectItem value="loading" disabled>
                    Loading statuses...
                  </SelectItem>
                ) : (
                  statuses.map((status) => (
                    <SelectItem 
                      key={status.id} 
                      value={statusNameToFilterValue(status.name)}
                    >
                      {formatStatusName(status.name)}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={() => setDialogOpen(true)}
            className="whitespace-nowrap"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Registration
          </Button>
        </div>

        {/* Registrations List */}
        <Card>
          <CardHeader>
            <CardTitle>Homeowner Registrations</CardTitle>
            <CardDescription>
              Manage and track your homeowner warranty registrations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "by-owner" | "by-project")} className="w-full">
              <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
                <TabsTrigger
                  value="by-owner"
                  className="flex items-center gap-2"
                >
                  <Users className="h-4 w-4" />
                  By Owner
                </TabsTrigger>
                <TabsTrigger
                  value="by-project"
                  className="flex items-center gap-2"
                >
                  <FolderKanban className="h-4 w-4" />
                  By Project
                </TabsTrigger>
              </TabsList>

              {/* By Owner Tab */}
              <TabsContent value="by-owner" className="mt-0">
                {isLoadingOwner ? (
                  <div className="text-center py-12">
                    <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-pulse" />
                    <p className="text-muted-foreground">Loading registrations...</p>
                  </div>
                ) : filteredRegistrations.length === 0 ? (
                  <div className="text-center py-12">
                    <Home className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      No registrations yet
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Start by creating your first homeowner registration
                    </p>
                    <Button onClick={() => setDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Registration
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredRegistrations.length > 0 && (
                      <div className="flex items-center gap-2 p-2 border-b">
                        <Checkbox
                          checked={
                            selectedRegistrations.length ===
                            filteredRegistrations.length
                          }
                          onCheckedChange={handleSelectAll}
                        />
                        <span className="text-sm text-muted-foreground">
                          Select All
                        </span>
                      </div>
                    )}
                    {filteredRegistrations.map((registration) => {
                      return (
                      <div
                        key={registration.id}
                        className="flex items-center gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <Checkbox
                          checked={selectedRegistrations.includes(
                            registration.id
                          )}
                          onCheckedChange={(checked) =>
                            handleSelectRegistration(
                              registration.id,
                              checked as boolean
                            )
                          }
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div
                          className="flex items-center justify-between flex-1 cursor-pointer"
                          onClick={() => {
                            const url = registration.billMaterialId 
                              ? `/onboarding?id=${registration.id}&bomId=${registration.billMaterialId}`
                              : `/onboarding?id=${registration.id}`;
                            navigate(url);
                          }}
                        >
                          <div className="flex items-center space-x-4 flex-1">
                            {getStatusIcon(registration.statusName)}
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <h4 className="font-semibold text-lg text-foreground">
                                  {registration.customer_name}
                                </h4>
                                <Badge variant="outline" className="text-xs">
                                  {registration.project_name || "No Project"}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mb-1">
                                {registration.customer_email}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                📍 {registration.property_address},{" "}
                                {registration.property_city},{" "}
                                {registration.property_state}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            {getStatusBadge(registration.statusName)}
                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">
                                Created:{" "}
                                {new Date(
                                  registration.created_at
                                ).toLocaleDateString()}
                              </p>
                              {registration.entitlement_sent_at && (
                                <p className="text-sm text-muted-foreground">
                                  Sent:{" "}
                                  {new Date(
                                    registration.entitlement_sent_at
                                  ).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              {/* By Project Tab */}
              <TabsContent value="by-project" className="mt-0">
                {isLoadingProject ? (
                  <div className="text-center py-12">
                    <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-pulse" />
                    <p className="text-muted-foreground">Loading projects...</p>
                  </div>
                ) : Object.keys(filteredProjectGroups).length === 0 ? (
                  <div className="text-center py-12">
                    <FolderKanban className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      No projects yet
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Registrations will be grouped by project name
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {Object.entries(filteredProjectGroups)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([projectName, projectRegs]) => {
                        // Find the project data from API response
                        const projectData = Array.isArray(projectRegistrationsData?.data)
                          ? (projectRegistrationsData.data as ProjectGroup[]).find(
                              (p) => p.projectName === projectName
                            )
                          : undefined;
                        return (
                          <Card key={projectName} className="border-2">
                            <CardHeader>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <Building2 className="h-6 w-6 text-primary" />
                                  <div>
                                    <CardTitle className="text-xl">
                                      {projectName}
                                    </CardTitle>
                                    <CardDescription>
                                      {projectData?.totalCount || projectRegs.length} homeowner
                                      {(projectData?.totalCount || projectRegs.length) !== 1 ? "s" : ""}
                                    </CardDescription>
                                  </div>
                                </div>
                                <Badge variant="secondary" className="text-sm">
                                  {projectData?.sentCount || projectRegs.filter(
                                    (r) =>
                                      r.status === "sent" ||
                                      r.status === "delivered" ||
                                      r.status === "entitlement"
                                  ).length}{" "}
                                  sent
                                </Badge>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-3">
                                {projectRegs.map((registration) => {
                                  return (
                                  <div
                                    key={registration.id}
                                    className="flex items-center justify-between p-3 border rounded-lg transition-colors hover:bg-accent/50 cursor-pointer"
                                    onClick={() => {
                                      const url = registration.billMaterialId 
                                        ? `/onboarding?id=${registration.id}&bomId=${registration.billMaterialId}`
                                        : `/onboarding?id=${registration.id}`;
                                      navigate(url);
                                    }}
                                  >
                                    <div className="flex items-center space-x-3 flex-1">
                                      {getStatusIcon(registration.statusName)}
                                      <div className="flex-1">
                                        <h4 className="font-semibold text-foreground">
                                          {registration.customer_name}
                                        </h4>
                                        {registration.property_address && (
                                          <p className="text-sm text-muted-foreground">
                                            {registration.property_address}
                                          </p>
                                        )}
                                        <p className="text-xs text-muted-foreground mt-1">
                                          {registration.customer_email}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                      {getStatusBadge(registration.statusName)}
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const url = registration.billMaterialId 
                                            ? `/onboarding?id=${registration.id}&bomId=${registration.billMaterialId}`
                                            : `/onboarding?id=${registration.id}`;
                                          navigate(url);
                                        }}
                                      >
                                        Edit
                                      </Button>
                                    </div>
                                  </div>
                                  );
                                })}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>

      <RegistrationTypeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={() => {
          // Refetch data when new registration is created
          window.location.reload();
        }}
      />

      <BulkActionsBar
        selectedCount={selectedRegistrations.length}
        selectedIds={selectedRegistrations}
        onClearSelection={() => setSelectedRegistrations([])}
        onSuccess={() => {
          // Refetch data when bulk action is completed without reloading the page
          refetchOwnerRegistrations();
          refetchProjectRegistrations();
        }}
      />
    </div>
  );
};

export default Dashboard;
