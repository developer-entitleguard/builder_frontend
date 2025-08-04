import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  Settings
} from 'lucide-react';

interface HomeownerRegistration {
  id: string;
  customer_name: string;
  customer_email: string;
  property_address: string;
  property_city: string;
  property_state: string;
  project_name: string;
  status: string;
  created_at: string;
  entitlement_sent_at: string | null;
}

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [registrations, setRegistrations] = useState<HomeownerRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchRegistrations();
  }, [user, navigate]);

  const fetchRegistrations = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('homeowner_registrations')
        .select('*')
        .eq('builder_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        toast({
          title: "Error loading registrations",
          description: error.message,
          variant: "destructive"
        });
      } else {
        setRegistrations(data || []);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load registrations",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };


  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { label: 'Draft', variant: 'secondary' as const },
      documents_pending: { label: 'Documents Pending', variant: 'outline' as const },
      ready_for_review: { label: 'Ready for Review', variant: 'default' as const },
      sent: { label: 'Sent', variant: 'default' as const },
      delivered: { label: 'Delivered', variant: 'default' as const }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return <Badge variant={config.variant}>{config.label}</Badge>;
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
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const filteredRegistrations = registrations.filter(reg =>
    reg.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    reg.customer_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    reg.property_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    reg.project_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: registrations.length,
    sent: registrations.filter(r => r.status === 'sent' || r.status === 'delivered').length,
    pending: registrations.filter(r => r.status === 'draft' || r.status === 'documents_pending').length,
    ready: registrations.filter(r => r.status === 'ready_for_review').length
  };

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
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/items')}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Package className="h-8 w-8 text-blue-500" />
                  <div className="ml-4">
                    <h3 className="font-semibold text-foreground">Manage Items</h3>
                    <p className="text-sm text-muted-foreground">Add and organize master item list</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  View
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/queries')}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <MessageSquare className="h-8 w-8 text-green-500" />
                  <div className="ml-4">
                    <h3 className="font-semibold text-foreground">Homeowner Queries</h3>
                    <p className="text-sm text-muted-foreground">Respond to homeowner questions</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  View
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/admin')}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Settings className="h-8 w-8 text-orange-500" />
                  <div className="ml-4">
                    <h3 className="font-semibold text-foreground">Organization Admin</h3>
                    <p className="text-sm text-muted-foreground">Manage org details and users</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  Manage
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/onboarding')}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Plus className="h-8 w-8 text-purple-500" />
                  <div className="ml-4">
                    <h3 className="font-semibold text-foreground">New Registration</h3>
                    <p className="text-sm text-muted-foreground">Start homeowner onboarding</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  Start
                </Button>
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
          <Button onClick={() => navigate('/onboarding')} className="whitespace-nowrap">
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
                <h3 className="text-lg font-medium text-foreground mb-2">No registrations yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start by creating your first homeowner registration
                </p>
                <Button onClick={() => navigate('/onboarding')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Registration
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredRegistrations.map((registration) => (
                  <div
                    key={registration.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/registration/${registration.id}`)}
                  >
                    <div className="flex items-center space-x-4 flex-1">
                      {getStatusIcon(registration.status)}
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-semibold text-lg text-foreground">{registration.customer_name}</h4>
                          <Badge variant="outline" className="text-xs">
                            {registration.project_name || 'No Project'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">{registration.customer_email}</p>
                        <p className="text-sm text-muted-foreground">
                          📍 {registration.property_address}, {registration.property_city}, {registration.property_state}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      {getStatusBadge(registration.status)}
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
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;