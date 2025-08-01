import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft,
  Edit,
  Send,
  User,
  Home,
  Calendar,
  Mail,
  Phone,
  MapPin,
  Building,
  Package,
  FileText
} from 'lucide-react';
import Header from '@/components/Header';

interface RegistrationData {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  property_address: string;
  property_city: string;
  property_state: string;
  property_zip: string;
  project_name: string | null;
  settlement_date: string | null;
  notes: string | null;
  status: string;
  selected_items: any;
  documents_uploaded: any;
  created_at: string;
  updated_at: string;
  entitlement_sent_at: string | null;
}

const RegistrationDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [registration, setRegistration] = useState<RegistrationData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !id) {
      navigate('/dashboard');
      return;
    }
    fetchRegistration();
  }, [user, id, navigate]);

  const fetchRegistration = async () => {
    if (!user || !id) return;

    try {
      const { data, error } = await supabase
        .from('homeowner_registrations')
        .select('*')
        .eq('id', id)
        .eq('builder_id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          toast({
            title: "Registration not found",
            description: "This registration doesn't exist or you don't have access to it.",
            variant: "destructive"
          });
          navigate('/dashboard');
          return;
        }
        throw error;
      }

      setRegistration(data);
    } catch (error: any) {
      toast({
        title: "Error loading registration",
        description: error.message,
        variant: "destructive"
      });
      navigate('/dashboard');
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

  const handleContinueOnboarding = () => {
    // Navigate to onboarding with the registration ID to continue editing
    navigate(`/onboarding?id=${id}`);
  };

  const handleSendEntitlement = async () => {
    if (!registration) return;

    try {
      const { error } = await supabase
        .from('homeowner_registrations')
        .update({ 
          status: 'sent',
          entitlement_sent_at: new Date().toISOString()
        })
        .eq('id', registration.id);

      if (error) throw error;

      toast({
        title: "Entitlement sent!",
        description: "The warranty entitlement has been sent to the homeowner."
      });

      fetchRegistration(); // Refresh data
    } catch (error: any) {
      toast({
        title: "Error sending entitlement",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg">Loading registration...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!registration) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">Registration Not Found</h1>
            <Button onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">{registration.customer_name}</h1>
              <p className="text-muted-foreground">{registration.customer_email}</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {getStatusBadge(registration.status)}
            {registration.status !== 'sent' && registration.status !== 'delivered' && (
              <Button variant="outline" onClick={handleContinueOnboarding}>
                <Edit className="h-4 w-4 mr-2" />
                Continue Editing
              </Button>
            )}
            {registration.status === 'ready_for_review' && (
              <Button onClick={handleSendEntitlement}>
                <Send className="h-4 w-4 mr-2" />
                Send Entitlement
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm">{registration.customer_email}</p>
                  </div>
                </div>
                {registration.customer_phone && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Phone</p>
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm">{registration.customer_phone}</p>
                    </div>
                  </div>
                )}
              </div>
              {registration.settlement_date && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Settlement Date</p>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm">{new Date(registration.settlement_date).toLocaleDateString()}</p>
                  </div>
                </div>
              )}
              {registration.notes && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Notes</p>
                  <p className="text-sm bg-muted p-2 rounded">{registration.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Property Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="h-5 w-5" />
                Property Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Address</p>
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm">
                    {registration.property_address}, {registration.property_city}, {registration.property_state} {registration.property_zip}
                  </p>
                </div>
              </div>
              {registration.project_name && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Project</p>
                  <div className="flex items-center space-x-2">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm">{registration.project_name}</p>
                  </div>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-muted-foreground">Created</p>
                <p className="text-sm">{new Date(registration.created_at).toLocaleDateString()}</p>
              </div>
              {registration.entitlement_sent_at && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Entitlement Sent</p>
                  <p className="text-sm">{new Date(registration.entitlement_sent_at).toLocaleDateString()}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Selected Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Selected Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              {registration.selected_items && Object.keys(registration.selected_items).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(registration.selected_items).map(([category, items]: [string, any]) => (
                    <div key={category}>
                      <h4 className="font-medium text-sm mb-2">{category}</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {Array.isArray(items) && items.map((item: string, index: number) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {item}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No items selected yet.</p>
              )}
            </CardContent>
          </Card>

          {/* Documents */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              {registration.documents_uploaded && Object.keys(registration.documents_uploaded).length > 0 ? (
                <div className="space-y-2">
                  {Object.entries(registration.documents_uploaded).map(([docType, files]: [string, any]) => (
                    <div key={docType} className="flex items-center justify-between">
                      <span className="text-sm">{docType}</span>
                      <Badge variant="outline" className="text-xs">
                        {Array.isArray(files) ? files.length : 0} files
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No documents uploaded yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default RegistrationDetail;