import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useGetCustomerDetailsQuery } from '@/lib/api/services/customerDetails';
import { useGetCustomerListQuery } from '@/store/api/dashboard';
import { 
  ArrowLeft,
  Edit,
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

const RegistrationDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const builderId = user && 'builderOrganization' in user 
    ? user.builderOrganization.id 
    : null;

  const { data: customerDetailsData, isLoading: loading, error } = useGetCustomerDetailsQuery(
    { builderId: builderId || '', customerId: id || '' },
    { skip: !builderId || !id }
  );

  const { data: customerListData } = useGetCustomerListQuery(
    { builderId: builderId || '' },
    { skip: !builderId || !id }
  );

  const customerStatus = customerListData?.data?.find(c => c.id === id)?.status?.name?.toUpperCase();
  const isEntitlementSent = customerStatus === "ENTITLEMENT" || customerStatus === "SENT" || customerStatus === "DELIVERED";

  useEffect(() => {
    if (!user) {
      navigate('/dashboard');
      return;
    }
  }, [user, navigate]);

  useEffect(() => {
    if (error) {
      toast({
        title: "Error loading registration",
        description: "Failed to load customer details. Please try again.",
        variant: "destructive"
      });
    }
  }, [error, toast]);

  const customer = customerDetailsData?.data?.customer;

  const handleContinueOnboarding = () => {
    // Navigate to onboarding with the customer ID to continue editing
    navigate(`/onboarding?id=${id}`);
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

  if (!customer) {
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
              <h1 className="text-3xl font-bold text-foreground">{customer.firstName} {customer.lastName}</h1>
              <p className="text-muted-foreground">{customer.email}</p>
            </div>
          </div>
          {!isEntitlementSent && (
            <div className="flex items-center space-x-4">
              <Button variant="outline" onClick={handleContinueOnboarding}>
                <Edit className="h-4 w-4 mr-2" />
                Continue Editing
              </Button>
            </div>
          )}
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
                    <p className="text-sm">{customer.email}</p>
                  </div>
                </div>
                {customer.contact && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Phone</p>
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm">{customer.contact}</p>
                    </div>
                  </div>
                )}
              </div>
              {customer.settlementDate && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Settlement Date</p>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm">{new Date(customer.settlementDate).toLocaleDateString()}</p>
                  </div>
                </div>
              )}
              {customer.notes && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Notes</p>
                  <p className="text-sm bg-muted p-2 rounded">{customer.notes}</p>
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
                    {customer.address}, {customer.city}, {customer.state} {customer.zip}
                  </p>
                </div>
              </div>
              {customer.projectName && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Project</p>
                  <div className="flex items-center space-x-2">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm">{customer.projectName}</p>
                  </div>
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
              {customerDetailsData?.data?.dtos && customerDetailsData.data.dtos.length > 0 ? (
                <div className="space-y-4">
                  {customerDetailsData.data.dtos
                    .map((categoryData) => ({
                      category: categoryData.category,
                      items: categoryData.items.filter((item) => item.mapped),
                    }))
                    .filter((categoryData) => categoryData.items.length > 0)
                    .map((categoryData) => (
                      <div key={categoryData.category}>
                        <h4 className="font-medium text-sm mb-2">{categoryData.category}</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {categoryData.items.map((item) => (
                            <Badge key={item.id} variant="outline" className="text-xs">
                              {item.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  {customerDetailsData.data.dtos.every((c) => !c.items.some((i) => i.mapped)) && (
                    <p className="text-muted-foreground text-sm">No items mapped yet.</p>
                  )}
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
              {customerDetailsData?.data?.totalDocuments && customerDetailsData.data.totalDocuments > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Total Documents: {customerDetailsData.data.totalDocuments}
                  </p>
                  {customerDetailsData.data.dtos.map((categoryData) => {
                    const itemsWithFiles = categoryData.items.filter(item => item.fileId);
                    if (itemsWithFiles.length > 0) {
                      return (
                        <div key={categoryData.category}>
                          <h4 className="font-medium text-sm mb-2">{categoryData.category}</h4>
                          <div className="space-y-1">
                            {itemsWithFiles.map((item) => (
                              <div key={item.id} className="flex items-center justify-between">
                                <span className="text-sm">{item.name}</span>
                                <Badge variant="outline" className="text-xs">
                                  {item.serialNumber || 'No serial'}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })}
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