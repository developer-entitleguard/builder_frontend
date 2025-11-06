import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useGetDashboardCountQuery, useGetCustomerListQuery } from "@/store/api/dashboard";
import { useDeleteBuilderCustomerMutation } from "@/lib/api/services/builderCustomer";
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';
import type { SerializedError } from '@reduxjs/toolkit';
import Header from "@/components/Header";
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
  MoreVertical,
  Trash2,
  Eye,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HomeownerRegistration {
  id: string;
  customer_name: string;
  customer_email: string;
  property_address: string;
  property_city: string;
  property_state: string;
  project_name: string | null;
  status: string;
  created_at?: string;
  entitlement_sent_at?: string | null;
  settlementDate?: string | null;
}

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteBuilderCustomer, { isLoading: isDeleting }] = useDeleteBuilderCustomerMutation();

  const builderId = user && 'builderOrganization' in user 
    ? user.builderOrganization.id 
    : null;

  // Fetch dashboard counts from API - called when navigating to /dashboard
  const { data: dashboardCounts, isLoading: countsLoading, error: countsError } = useGetDashboardCountQuery(
    { builderId: builderId || "" },
    { 
      skip: !builderId,
      refetchOnMountOrArgChange: true,
      refetchOnFocus: false,
      refetchOnReconnect: false
    }
  );

  // Fetch customer list from API - called when navigating to /dashboard
  const { data: customerListData, isLoading: customersLoading, error: customersError } = useGetCustomerListQuery(
    { builderId: builderId || "" },
    { 
      skip: !builderId,
      refetchOnMountOrArgChange: true,
      refetchOnFocus: false,
      refetchOnReconnect: false
    }
  );

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    
    // Ensure APIs are called when navigating to dashboard
    if (builderId) {
      console.log('Dashboard: Calling getDashboardCount and getCustomerList APIs with builderId:', builderId);
    }
  }, [user, navigate, builderId]);

  // Redirect to auth page when API errors occur (especially connection errors)
  useEffect(() => {
    if (builderId && (countsError || customersError)) {
      // Check if it's a connection error or other critical error
      // RTK Query errors can be FetchBaseQueryError or SerializedError
      const isConnectionError = (error: FetchBaseQueryError | SerializedError | undefined) => {
        if (!error) return false;
        
        // Check for FetchBaseQueryError (network/HTTP errors)
        if ('status' in error) {
          const fetchError = error as FetchBaseQueryError;
          // Check for network/connection errors
          if (fetchError.status === 'FETCH_ERROR' || fetchError.status === 'PARSING_ERROR') {
            return true;
          }
          // Check for connection refused errors in the error message
          // The 'error' property exists on TIMEOUT_ERROR and CUSTOM_ERROR types
          if ('error' in fetchError && typeof fetchError.error === 'string') {
            const errorMessage = fetchError.error.toLowerCase();
            if (errorMessage.includes('econnrefused') || 
                errorMessage.includes('network error') ||
                errorMessage.includes('failed to fetch')) {
              return true;
            }
          }
        }
        
        // Check for SerializedError (other errors)
        if ('message' in error) {
          const serializedError = error as SerializedError;
          if (serializedError.message) {
            const errorMessage = serializedError.message.toLowerCase();
            if (errorMessage.includes('econnrefused') || 
                errorMessage.includes('network error') ||
                errorMessage.includes('failed to fetch')) {
              return true;
            }
          }
        }
        
        return false;
      };
      
      const hasConnectionError = isConnectionError(countsError) || isConnectionError(customersError);
      
      if (hasConnectionError) {
        console.warn('Dashboard API connection error detected, redirecting to auth');
        toast({
          title: "Connection Error",
          description: "Unable to connect to the server. Please try again later.",
          variant: "destructive",
        });
        // Clear user data and redirect to auth
        localStorage.removeItem('userData');
        navigate("/auth", { replace: true });
      }
    }
  }, [countsError, customersError, builderId, navigate, toast]);

  // Map API data to HomeownerRegistration format
  const registrations: HomeownerRegistration[] = customerListData?.data?.map((customer) => ({
    id: customer.id,
    customer_name: `${customer.firstName} ${customer.lastName || ''}`.trim(),
    customer_email: customer.email || '',
    property_address: customer.address || '',
    property_city: customer.city || '',
    property_state: customer.state || '',
    project_name: customer.projectName,
    status: customer.status?.name || 'DRAFT',
    settlementDate: customer.settlementDate,
  })) || [];

  const getStatusBadge = (status: string) => {
    const formatStatusName = (statusName: string): string => {
      if (!statusName) return 'DRAFT';
      return statusName
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    };

    const getStatusVariant = (statusName: string): "default" | "secondary" | "outline" => {
      const statusUpper = statusName?.toUpperCase() || '';
      if (statusUpper === 'DRAFT') return 'secondary';
      if (statusUpper === 'DOCUMENTS_PENDING') return 'outline';
      return 'default';
    };

    const formattedStatus = formatStatusName(status || 'DRAFT');
    const variant = getStatusVariant(status || 'DRAFT');

    return <Badge variant={variant}>{formattedStatus}</Badge>;
  };

  const getStatusIcon = (status: string) => {
    const statusUpper = status.toUpperCase();
    switch (statusUpper) {
      case "DRAFT":
        return <FileText className="h-4 w-4 text-muted-foreground" />;
      case "DOCUMENTS_PENDING":
        return <Clock className="h-4 w-4 text-orange-500" />;
      case "READY_FOR_REVIEW":
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case "ENTITLEMENT":
      case "SENT":
        return <Send className="h-4 w-4 text-green-500" />;
      case "DELIVERED":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const handleDeleteCustomer = async (id: string, customerName: string) => {
    if (!confirm(`Are you sure you want to delete ${customerName}? This action cannot be undone.`)) {
      return;
    }

    try {
      const result = await deleteBuilderCustomer(id).unwrap() as unknown;
      // Use the message from API response if available
      let successMessage = "Customer deleted successfully";
      if (result && typeof result === 'object' && result !== null && 'message' in result) {
        successMessage = String((result as { message: string }).message);
      } else if (result && typeof result === 'string') {
        successMessage = result;
      }
      toast({ title: successMessage });
    } catch (error: unknown) {
      let errorMessage = "Failed to delete customer";
      
      // Handle RTK Query error format
      if (error && typeof error === 'object') {
        // Check if error has data property (RTK Query standard error format)
        if ('data' in error) {
          const errorData = error.data;
          // Check if errorData is an object with message property
          if (errorData && typeof errorData === 'object' && 'message' in errorData) {
            errorMessage = String(errorData.message);
          } else if (typeof errorData === 'string') {
            errorMessage = errorData;
          }
        } else if ('message' in error) {
          errorMessage = String(error.message);
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error deleting customer",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const filteredRegistrations = registrations.filter(
    (reg) =>
      reg.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reg.customer_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reg.property_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reg.project_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    totalHomeowners: dashboardCounts?.data?.totalHomeowners ?? registrations.length,
    entitlementsSent: dashboardCounts?.data?.entitlementsSent ?? registrations.filter(
      (r) => r.status?.toUpperCase() === "ENTITLEMENT" || r.status?.toUpperCase() === "SENT" || r.status?.toUpperCase() === "DELIVERED"
    ).length,
    pending: dashboardCounts?.data?.pending ?? registrations.filter(
      (r) => r.status?.toUpperCase() === "DRAFT" || r.status?.toUpperCase() === "DOCUMENTS_PENDING"
    ).length,
    readyForReview: dashboardCounts?.data?.readyForReview ?? registrations.filter((r) => r.status?.toUpperCase() === "READY_FOR_REVIEW").length,
  };

  const isLoading = builderId && (countsLoading || customersLoading);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Building2 className="h-8 w-8 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                    {stats.totalHomeowners}
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
                    {stats.entitlementsSent}
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
                    {stats.readyForReview}
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
            onClick={() => navigate("/onboarding")}
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search homeowners..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button
            onClick={() => navigate("/onboarding")}
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
            {filteredRegistrations.length === 0 ? (
              <div className="text-center py-12">
                <Home className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  No registrations yet
                </h3>
                <p className="text-muted-foreground mb-4">
                  Start by creating your first homeowner registration
                </p>
                <Button onClick={() => navigate("/onboarding")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Registration
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredRegistrations.map((registration) => {
                  const isEntitlementSent = registration.status?.toUpperCase() === "ENTITLEMENT" || registration.status?.toUpperCase() === "SENT" || registration.status?.toUpperCase() === "DELIVERED";
                  return (
                  <div
                    key={registration.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => isEntitlementSent 
                      ? navigate(`/registration/${registration.id}`)
                      : navigate(`/onboarding?id=${registration.id}`)
                    }
                  >
                    <div className="flex items-center space-x-4 flex-1">
                      {getStatusIcon(registration.status)}
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
                      {getStatusBadge(registration.status)}
                      <div className="text-right">
                        {registration.settlementDate && (
                          <p className="text-sm text-muted-foreground">
                            Settlement:{" "}
                            {new Date(
                              registration.settlementDate
                            ).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/registration/${registration.id}`);
                          }}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          {!(registration.status?.toUpperCase() === "ENTITLEMENT" || registration.status?.toUpperCase() === "SENT" || registration.status?.toUpperCase() === "DELIVERED") && (
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteCustomer(registration.id, registration.customer_name);
                              }}
                              className="text-red-600 focus:text-red-600 focus:bg-red-50"
                              disabled={isDeleting}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;
