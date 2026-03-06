import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import { useGetDashboardCountQuery, useDashboardRegistrationsQuery, useGetStatusesByTypeQuery } from '@/store/api';
import Header from '@/components/Header';
import { RegistrationTypeDialog } from '@/components/RegistrationTypeDialog';
import { BulkActionsBar } from '@/components/BulkActionsBar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
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
  KeyRound
} from 'lucide-react';

interface HomeownerRegistration {
  id: string;
  customer_name: string;
  customer_email: string;
  property_address: string;
  property_city: string;
  property_state: string;
  project_id: string | null;
  project_name: string;
  status: string;
  status_name: string | null;
  created_at: string;
  entitlement_sent_at: string | null;
}

interface Project {
  id: string;
  name: string;
}

// Builder login: allow dashboard when JWT is in localStorage (no Supabase user required)
const hasBuilderAuth = (): boolean => {
  try {
    const userData = localStorage.getItem("userData");
    if (!userData) return false;
    const parsed = JSON.parse(userData);
    return !!(parsed?.jwt);
  } catch {
    return false;
  }
};

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const { organization, loading: orgLoading } = useOrganization();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [registrations, setRegistrations] = useState<HomeownerRegistration[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRegistrations, setSelectedRegistrations] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  const isAuthenticated = !!user || hasBuilderAuth();

  // builderId for dashboard API (same as OLD project)
  const builderId = useMemo(() => {
    const userData = localStorage.getItem('userData');
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        if (parsed.userInfo?.builderOrganization?.id) return parsed.userInfo.builderOrganization.id;
        if (parsed.builderOrganization?.id) return parsed.builderOrganization.id;
      } catch {
        // ignore
      }
    }
    return organization?.id ?? null;
  }, [organization?.id]);

  const { data: countData } = useGetDashboardCountQuery(
    { builderId: builderId || '' },
    { skip: !builderId }
  );
  const { data: statusesData } = useGetStatusesByTypeQuery({ type: 'BUILDER' });
  const { data: ownerData, isLoading: isLoadingOwner, error: ownerError, refetch: refetchOwner } = useDashboardRegistrationsQuery(
    { builderId: builderId || '', type: 'owner' },
    { skip: !builderId }
  );
  const { data: projectData, refetch: refetchProject } = useDashboardRegistrationsQuery(
    { builderId: builderId || '', type: 'project' },
    { skip: !builderId }
  );

  const fetchRegistrations = useCallback(() => {
    refetchOwner();
    refetchProject();
  }, [refetchOwner, refetchProject]);

  // Map API owner response to local registrations state (same shape as OLD Dashboard)
  useEffect(() => {
    if (!builderId) return;
    if (isLoadingOwner) {
      setLoading(true);
      return;
    }
    setLoading(false);
    const raw = ownerData?.data;
    if (Array.isArray(raw)) {
      const mapped: HomeownerRegistration[] = (raw as Array<{
        id: string;
        firstName?: string;
        lastName?: string;
        email?: string;
        address?: string;
        city?: string;
        state?: string;
        projectName?: string;
        statusName?: string;
        createdAt?: string;
        project_id?: string | null;
      }>).map((item) => {
        let status = 'draft';
        if (item.statusName) {
          const s = item.statusName.toLowerCase();
          if (s === 'entitlement') status = 'documents_pending';
          else if (s === 'sent' || s === 'delivered') status = 'sent';
          else if (s === 'ready_for_review' || s === 'ready for review') status = 'ready_for_review';
          else status = s.replace(/\s+/g, '_');
        }
        return {
          id: item.id,
          customer_name: `${item.firstName ?? ''} ${item.lastName ?? ''}`.trim() || '—',
          customer_email: item.email ?? '',
          property_address: item.address ?? '',
          property_city: item.city ?? '',
          property_state: item.state ?? '',
          project_id: item.project_id ?? null,
          project_name: item.projectName ?? 'No Project',
          status,
          status_name: item.statusName ?? null,
          created_at: item.createdAt ?? new Date().toISOString(),
          entitlement_sent_at: item.statusName === 'SENT' ? (item.createdAt ?? null) : null,
        };
      });
      setRegistrations(mapped);
      const projectSet = new Map<string, { id: string; name: string }>();
      mapped.forEach((r) => {
        if (r.project_id && r.project_name && !projectSet.has(r.project_id)) {
          projectSet.set(r.project_id, { id: r.project_id, name: r.project_name });
        }
      });
      setProjects(Array.from(projectSet.values()));
    } else if (Array.isArray(projectData?.data) && (projectData.data as Array<{ projectName?: string; homeowners?: Array<{ id: string }> }>).length > 0) {
      const byProject = projectData.data as Array<{ projectName?: string; homeowners?: Array<{ id: string; firstName?: string; lastName?: string; email?: string; address?: string; city?: string; state?: string; statusName?: string; createdAt?: string }> }>;
      const mapped: HomeownerRegistration[] = [];
      byProject.forEach((proj) => {
        const projectName = proj.projectName ?? 'No Project';
        (proj.homeowners ?? []).forEach((h) => {
          let status = 'draft';
          if (h.statusName) {
            const s = h.statusName.toLowerCase();
            if (s === 'entitlement') status = 'documents_pending';
            else if (s === 'sent' || s === 'delivered') status = 'sent';
            else status = s.replace(/\s+/g, '_');
          }
          mapped.push({
            id: h.id,
            customer_name: `${h.firstName ?? ''} ${h.lastName ?? ''}`.trim() || '—',
            customer_email: h.email ?? '',
            property_address: h.address ?? '',
            property_city: h.city ?? '',
            property_state: h.state ?? '',
            project_id: null,
            project_name: projectName,
            status,
            status_name: h.statusName ?? null,
            created_at: h.createdAt ?? new Date().toISOString(),
            entitlement_sent_at: h.statusName === 'SENT' ? (h.createdAt ?? null) : null,
          });
        });
      });
      setRegistrations(mapped);
    }
  }, [builderId, isLoadingOwner, ownerData, projectData]);

  useEffect(() => {
    if (ownerError) {
      toast({
        title: 'Error loading registrations',
        description: 'Failed to load registrations. Please try again.',
        variant: 'destructive',
      });
    }
  }, [ownerError, toast]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }
    if (!organization && !builderId) return;
  }, [isAuthenticated, organization, builderId, navigate]);

  const getStatusBadge = (status: string, statusName?: string | null) => {
    const statusConfig = {
      draft: { label: 'Draft', variant: 'secondary' as const },
      documents_pending: { label: 'Documents Pending', variant: 'outline' as const },
      ready_for_review: { label: 'Ready for Review', variant: 'default' as const },
      sent: { label: 'Sent', variant: 'default' as const },
      delivered: { label: 'Delivered', variant: 'default' as const },
      handed_over: { label: 'Handed Over', variant: 'default' as const }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    const label =
      statusName && statusName.trim() !== ""
        ? statusName.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
        : config.label;
    return (
      <Badge
        variant={config.variant}
        className={status === 'handed_over' ? 'bg-green-600 text-white' : ''}
      >
        {label}
      </Badge>
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft':
        return <FileText className="h-4 w-4 text-muted-foreground" />;
      case 'documents_pending':
        return <Clock className="h-4 w-4 text-orange-500" />;
      case 'ready_for_review':
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case 'sent':
        return <Send className="h-4 w-4 text-green-500" />;
      case 'delivered':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'handed_over':
        return <KeyRound className="h-4 w-4 text-green-600" />;
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const filteredRegistrations = registrations.filter(reg => {
    const matchesSearch = reg.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reg.customer_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reg.property_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reg.project_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || reg.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRegistrations(filteredRegistrations.map(r => r.id));
    } else {
      setSelectedRegistrations([]);
    }
  };

  const handleSelectRegistration = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedRegistrations(prev => [...prev, id]);
    } else {
      setSelectedRegistrations(prev => prev.filter(regId => regId !== id));
    }
  };

  // Helper to get project name from project_id (legacy fallback)
  const getProjectName = (projectId: string | null): string => {
    if (!projectId) return 'No Project';
    const project = projects.find(p => p.id === projectId);
    return project?.name || 'Unknown Project';
  };

  // Map API status name to internal filter value (must match reg.status from registration mapping)
  const apiStatusToFilterValue = (name: string): string => {
    const n = name.toUpperCase().replace(/\s+/g, ' ');
    if (n === 'DRAFT') return 'draft';
    if (n === 'ENTITLEMENT') return 'documents_pending';
    if (n === 'SENT') return 'sent';
    if (n === 'READY FOR REVIEW') return 'ready_for_review';
    if (n === 'CREATED') return 'created';
    if (n === 'DELIVERED') return 'delivered';
    return name.toLowerCase().replace(/\s+/g, '_');
  };

  const statusOptions = useMemo(() => {
    const list = statusesData?.data ?? [];
    return list.map((s) => ({
      value: apiStatusToFilterValue(s.name),
      label: s.name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    }));
  }, [statusesData?.data]);

  // Group registrations by project (prefer API project_name, fallback to project_id lookup)
  const projectGroups = filteredRegistrations.reduce((acc, reg) => {
    const projectKey = reg.project_id || reg.project_name || 'no-project';
    const projectName = reg.project_name || getProjectName(reg.project_id);
    if (!acc[projectKey]) {
      acc[projectKey] = { name: projectName, registrations: [] };
    }
    acc[projectKey].registrations.push(reg);
    return acc;
  }, {} as Record<string, { name: string; registrations: HomeownerRegistration[] }>);

  // Use dashboard count API when available, else derive from registrations
  const stats = useMemo(() => {
    const d = countData?.data;
    if (d != null) {
      return {
        total: d.totalHomeowners ?? 0,
        sent: d.entitlementsSent ?? 0,
        pending: d.pending ?? 0,
        ready: d.readyForReview ?? 0,
      };
    }
    return {
      total: registrations.length,
      sent: registrations.filter(r => r.status === 'sent' || r.status === 'delivered').length,
      pending: registrations.filter(r => r.status === 'draft' || r.status === 'documents_pending').length,
      ready: registrations.filter(r => r.status === 'ready_for_review').length,
    };
  }, [countData?.data, registrations]);

  if (loading) {
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
                  <p className="text-sm font-medium text-muted-foreground">Total Homeowners</p>
                  <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Send className="h-8 w-8 text-green-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Entitlements Sent</p>
                  <p className="text-2xl font-bold text-foreground">{stats.sent}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-orange-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold text-foreground">{stats.pending}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-blue-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Ready for Review</p>
                  <p className="text-2xl font-bold text-foreground">{stats.ready}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Link to="/items" className="block h-full">
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="p-6">
                <div className="flex flex-col h-full">
                  <div className="flex flex-col items-center text-center space-y-2">
                    <Package className="h-8 w-8 text-blue-500" />
                    <h3 className="font-semibold text-foreground">Manage Items</h3>
                    <p className="text-sm text-muted-foreground">
                      Add and organize master item list
                    </p>
                    <div className="flex justify-end mb-4">
                      <Button
                        type="button"
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
          </Link>

          <Card
            className="hover:shadow-md transition-shadow cursor-pointer h-full"
            onClick={() => navigate("/queries")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                navigate("/queries");
              }
            }}
          >
            <CardContent className="p-6">
              <div className="flex flex-col h-full">
                <div className="flex flex-col items-center text-center space-y-2">
                  <MessageSquare className="h-8 w-8 text-green-500" />
                  <h3 className="font-semibold text-foreground">Homeowner Queries</h3>
                  <p className="text-sm text-muted-foreground">
                    Respond to homeowner questions
                  </p>
                  <div className="flex justify-end mb-4">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="bg-primary text-primary-foreground"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        navigate("/queries");
                      }}
                    >
                      View
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className="hover:shadow-md transition-shadow cursor-pointer h-full"
            onClick={() => navigate("/admin")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                navigate("/admin");
              }
            }}
          >
            <CardContent className="p-6">
              <div className="flex flex-col h-full">
                <div className="flex flex-col items-center text-center space-y-2">
                  <Settings className="h-8 w-8 text-orange-500" />
                  <h3 className="font-semibold text-foreground">Organization Admin</h3>
                  <p className="text-sm text-muted-foreground">
                    Manage org details and users
                  </p>
                  <div className="flex justify-end mb-4">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="bg-primary text-primary-foreground"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        navigate("/admin");
                      }}
                    >
                      Manage
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className="hover:shadow-md transition-shadow cursor-pointer h-full"
            onClick={() => setDialogOpen(true)}
          >
            <CardContent className="p-6">
              <div className="flex flex-col h-full">
                <div className="flex flex-col items-center text-center space-y-2">
                  <Plus className="h-8 w-8 text-purple-500" />
                  <h3 className="font-semibold text-foreground">New Registration</h3>
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
                {statusOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="whitespace-nowrap">
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
            <Tabs defaultValue="by-owner" className="w-full">
              <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
                <TabsTrigger value="by-owner" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  By Owner
                </TabsTrigger>
                <TabsTrigger value="by-project" className="flex items-center gap-2">
                  <FolderKanban className="h-4 w-4" />
                  By Project
                </TabsTrigger>
              </TabsList>

              {/* By Owner Tab */}
              <TabsContent value="by-owner" className="mt-0">
                {filteredRegistrations.length === 0 ? (
                  <div className="text-center py-12">
                    <Home className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">No registrations yet</h3>
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
                          checked={selectedRegistrations.length === filteredRegistrations.length}
                          onCheckedChange={handleSelectAll}
                        />
                        <span className="text-sm text-muted-foreground">Select All</span>
                      </div>
                    )}
                    {filteredRegistrations.map((registration) => (
                      <div
                        key={registration.id}
                        className="flex items-center gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <Checkbox
                          checked={selectedRegistrations.includes(registration.id)}
                          onCheckedChange={(checked) => handleSelectRegistration(registration.id, checked as boolean)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div 
                          className="flex items-center justify-between flex-1 cursor-pointer"
                          onClick={() => navigate(`/registration/${registration.id}`)}
                        >
                          <div className="flex items-center space-x-4 flex-1">
                            {getStatusIcon(registration.status)}
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <h4 className="font-semibold text-lg text-foreground">{registration.customer_name}</h4>
                                <Badge variant="outline" className="text-xs">
                                  {registration.project_name || getProjectName(registration.project_id)}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mb-1">{registration.customer_email}</p>
                              <p className="text-sm text-muted-foreground">
                                📍 {registration.property_address}, {registration.property_city}, {registration.property_state}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            {getStatusBadge(registration.status, registration.status_name)}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/onboarding?id=${registration.id}`);
                              }}
                            >
                              Continue editing
                            </Button>
                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">
                                Created: {new Date(registration.created_at).toLocaleDateString()}
                              </p>
                              {registration.entitlement_sent_at && (
                                <p className="text-sm text-muted-foreground">
                                  Sent: {new Date(registration.entitlement_sent_at).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* By Project Tab */}
              <TabsContent value="by-project" className="mt-0">
                {Object.keys(projectGroups).length === 0 ? (
                  <div className="text-center py-12">
                    <FolderKanban className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">No projects yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Registrations will be grouped by project name
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {Object.entries(projectGroups)
                      .sort(([, a], [, b]) => a.name.localeCompare(b.name))
                      .map(([projectKey, projectData]) => (
                        <Card key={projectKey} className="border-2">
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Building2 className="h-6 w-6 text-primary" />
                                <div>
                                  <CardTitle className="text-xl">{projectData.name}</CardTitle>
                                  <CardDescription>
                                    {projectData.registrations.length} homeowner{projectData.registrations.length !== 1 ? 's' : ''}
                                  </CardDescription>
                                </div>
                              </div>
                              <Badge variant="secondary" className="text-sm">
                                {projectData.registrations.filter(r => r.status === 'sent' || r.status === 'delivered').length} sent
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              {projectData.registrations.map((registration) => (
                                <div
                                  key={registration.id}
                                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                                  onClick={() => navigate(`/registration/${registration.id}`)}
                                >
                                  <div className="flex items-center space-x-3 flex-1">
                                    {getStatusIcon(registration.status)}
                                    <div className="flex-1">
                                      <h4 className="font-semibold text-foreground">{registration.customer_name}</h4>
                                      <p className="text-sm text-muted-foreground">{registration.property_address}</p>
                                      <p className="text-xs text-muted-foreground mt-1">
                                        {registration.customer_email}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-3">
                                    {getStatusBadge(registration.status, registration.status_name)}
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/onboarding?id=${registration.id}`);
                                      }}
                                    >
                                      Edit
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
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
        onSuccess={fetchRegistrations}
      />

      <BulkActionsBar
        selectedCount={selectedRegistrations.length}
        selectedIds={selectedRegistrations}
        onClearSelection={() => setSelectedRegistrations([])}
        onSuccess={fetchRegistrations}
      />
    </div>
  );
};

export default Dashboard;