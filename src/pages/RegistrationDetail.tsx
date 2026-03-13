import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useGetCustomerDetailsQuery, useCreateCustomerEntitlementMutation, useDeleteBuilderCustomerMutation } from '@/store/api';
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
  FileText,
  Trash2,
  DollarSign,
  KeyRound
} from 'lucide-react';
import Header from '@/components/Header';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SelectedItemShape {
  id?: string;
  category?: string;
  name?: string;
  brand?: string;
  model?: string;
  warranty_years?: number;
  warranty_documents?: Array<{ url?: string } | string>;
  manual_documents?: Array<{ url?: string } | string>;
  manual_url?: string;
  documentation_url?: string;
}

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
  status_name?: string | null;
  selected_items: unknown;
  documents_uploaded: unknown;
  created_at: string;
  updated_at: string;
  entitlement_sent_at: string | null;
  price: number | null;
  num_bedrooms: number | null;
  num_rooms: number | null;
  total_built_up_area: number | null;
}

const hasBuilderAuth = (): boolean => {
  try {
    const userData = localStorage.getItem('userData');
    if (!userData) return false;
    const parsed = JSON.parse(userData);
    return !!(parsed?.jwt);
  } catch {
    return false;
  }
};

const getBuilderId = (): string | null => {
  try {
    const userData = localStorage.getItem('userData');
    if (!userData) return null;
    const parsed = JSON.parse(userData);
    const orgId = parsed?.userInfo?.builderOrganization?.id ?? parsed?.builderOrganization?.id ?? parsed?.builder_organization?.id;
    return orgId ?? parsed?.userInfo?.id ?? parsed?.id ?? null;
  } catch {
    return null;
  }
};

const RegistrationDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { organization } = useOrganization();
  const { toast } = useToast();
  const [registration, setRegistration] = useState<RegistrationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [handoverDialogOpen, setHandoverDialogOpen] = useState(false);

  const builderId = organization?.id ?? getBuilderId();
  const isBuilderFlow = !user && hasBuilderAuth();
  const { data: customerDetailsResponse, isLoading: loadingFromApi } = useGetCustomerDetailsQuery(
    { builderId: builderId ?? '', customerId: id ?? '' },
    { skip: !id || !builderId || !isBuilderFlow }
  );
  const [createCustomerEntitlement] = useCreateCustomerEntitlementMutation();
  const [deleteBuilderCustomer] = useDeleteBuilderCustomerMutation();

  const fetchRegistration = useCallback(async () => {
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

      setRegistration(data as RegistrationData);
    } catch (error: unknown) {
      toast({
        title: "Error loading registration",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive"
      });
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  }, [user, id, toast, navigate]);

  useEffect(() => {
    if (!id) {
      navigate('/dashboard');
      return;
    }
    if (user) {
      fetchRegistration();
    } else if (!isBuilderFlow) {
      setLoading(false);
      if (!hasBuilderAuth()) navigate('/dashboard');
    }
  }, [user, id, navigate, isBuilderFlow, fetchRegistration]);

  useEffect(() => {
    if (!isBuilderFlow || !customerDetailsResponse?.data?.customer) return;
    const c = customerDetailsResponse.data.customer as unknown as Record<string, unknown>;
    const project = c.project as { createdAt?: string; updatedAt?: string; name?: string } | undefined;
    const statusObj = c.status as { name?: string } | undefined;
    const apiStatusName = statusObj?.name ?? '';
    let internalStatus: string = 'draft';
    const n = apiStatusName.toUpperCase().replace(/\s+/g, ' ');
    if (n === 'ENTITLEMENT') internalStatus = 'documents_pending';
    else if (n === 'SENT' || n === 'DELIVERED') internalStatus = 'sent';

    // Build selected items from customerDetails dtos (category + item name/brand/model)
    const dataWithDtos = customerDetailsResponse.data as {
      dtos?: Array<{
        category?: string | null;
        items?: Array<{
          id?: string | null;
          builderCustomerMapId?: string | null;
          builder_customer_map_id?: string | null;
          name?: string | null;
          category?: string | null;
          brand?: string | null;
          model?: string | null;
        }> | null;
      }>;
    };

    const selectedItems: SelectedItemShape[] = [];
    if (Array.isArray(dataWithDtos.dtos)) {
      for (const dto of dataWithDtos.dtos) {
        const dtoCategory = dto.category ?? "Other";
        if (!Array.isArray(dto.items)) continue;
        for (const rawItem of dto.items) {
          const id =
            rawItem.builderCustomerMapId ??
            rawItem.builder_customer_map_id ??
            rawItem.id ??
            undefined;
          const category = rawItem.category ?? dtoCategory ?? "Other";
          const name = rawItem.name ?? "Unnamed item";
          selectedItems.push({
            id,
            name,
            category,
            brand: rawItem.brand ?? undefined,
            model: rawItem.model ?? undefined,
          });
        }
      }
    }

    setRegistration({
      id: c.id as string,
      customer_name: `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim(),
      customer_email: (c.email as string) ?? '',
      customer_phone: (c.contact as string | null) ?? null,
      property_address: (c.address as string) ?? '',
      property_city: (c.city as string) ?? '',
      property_state: (c.state as string) ?? '',
      property_zip: (c.zip as string) ?? '',
      project_name: (c.projectName as string | null) ?? project?.name ?? null,
      settlement_date: (c.settlementDate as string | null) ?? null,
      notes: (c.notes as string | null) ?? null,
      status: internalStatus,
      status_name: apiStatusName || null,
      selected_items: selectedItems,
      documents_uploaded: {},
      created_at: project?.createdAt ?? '',
      updated_at: project?.updatedAt ?? '',
      entitlement_sent_at: null,
      price: null,
      num_bedrooms: null,
      num_rooms: null,
      total_built_up_area: null,
    });
    setLoading(false);
  }, [isBuilderFlow, customerDetailsResponse]);

  useEffect(() => {
    if (isBuilderFlow && !loadingFromApi && !customerDetailsResponse?.data?.customer && builderId && id) {
      toast({
        title: "Registration not found",
        description: "This registration doesn't exist or you don't have access to it.",
        variant: "destructive"
      });
      navigate('/dashboard');
    } else if (isBuilderFlow && !loadingFromApi) {
      setLoading(false);
    }
  }, [isBuilderFlow, loadingFromApi, customerDetailsResponse, builderId, id, toast, navigate]);

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
        ? statusName
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

  const isHandedOver = registration?.status === 'handed_over';
  const isHandedStatus =
    registration?.status === 'handed_over' ||
    (registration?.status_name ?? '').toUpperCase() === 'HANDED';

  const handleContinueOnboarding = () => {
    // Navigate to onboarding with the registration ID to continue editing
    navigate(`/onboarding?id=${id}`);
  };

  const handleSendEntitlement = async () => {
    if (!registration) return;

    try {
      if (isBuilderFlow) {
        await createCustomerEntitlement({ builderCustomerId: registration.id }).unwrap();
      } else {
        const { error } = await supabase
          .from('homeowner_registrations')
          .update({
            status: 'sent',
            entitlement_sent_at: new Date().toISOString()
          })
          .eq('id', registration.id);
        if (error) throw error;
      }

      toast({
        title: "Entitlement sent!",
        description: "The warranty entitlement has been sent to the homeowner."
      });

      if (user) fetchRegistration();
    } catch (error: unknown) {
      const msg = error && typeof error === 'object' && 'data' in error
        ? (error as { data?: unknown }).data
        : error instanceof Error
          ? error.message
          : 'Failed to send entitlement';
      toast({
        title: "Error sending entitlement",
        description: String(msg ?? 'Failed to send entitlement'),
        variant: "destructive"
      });
    }
  };

  const handleMarkHandedOver = async () => {
    if (!registration) return;

    try {
      const { error } = await supabase
        .from('homeowner_registrations')
        .update({ 
          status: 'handed_over'
        })
        .eq('id', registration.id);

      if (error) throw error;

      toast({
        title: "Property handed over",
        description: "The property has been marked as handed over. This registration is now read-only."
      });

      setHandoverDialogOpen(false);
      fetchRegistration();
    } catch (error: unknown) {
      toast({
        title: "Error updating status",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive"
      });
    }
  };

  const handleDelete = async () => {
    if (!registration) return;

    try {
      if (isBuilderFlow) {
        await deleteBuilderCustomer(registration.id).unwrap();
      } else {
        const { error } = await supabase
          .from('homeowner_registrations')
          .delete()
          .eq('id', registration.id);
        if (error) throw error;
      }

      toast({
        title: "Registration deleted",
        description: registration.status === 'sent'
          ? "The property has been removed from the homeowner's entitlements."
          : "The registration has been deleted successfully."
      });

      navigate('/dashboard');
    } catch (error: unknown) {
      const msg = error && typeof error === 'object' && 'data' in error
        ? (error as { data?: unknown }).data
        : error instanceof Error
          ? error.message
          : 'Failed to delete';
      toast({
        title: "Error deleting registration",
        description: String(msg ?? 'Failed to delete'),
        variant: "destructive"
      });
    }
  };

  const isLoading = user ? loading : (isBuilderFlow ? loadingFromApi : false);

  if (isLoading) {
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
            {getStatusBadge(registration.status, registration.status_name)}
            {!isHandedOver && (
              <>
                <Button variant="outline" onClick={handleContinueOnboarding}>
                  <Edit className="h-4 w-4 mr-2" />
                  {isHandedStatus ? 'View Details' : 'Continue Editing'}
                </Button>
                {registration.status !== 'sent' && (
                  <Button onClick={handleSendEntitlement}>
                    <Send className="h-4 w-4 mr-2" />
                    Send Entitlement
                  </Button>
                )}
                {registration.status === 'sent' && (
                  <Button variant="secondary" onClick={() => setHandoverDialogOpen(true)}>
                    <KeyRound className="h-4 w-4 mr-2" />
                    Mark Handed Over
                  </Button>
                )}
                <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </>
            )}
            {isHandedOver && (
              <p className="text-sm text-muted-foreground italic">This registration is read-only</p>
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
              {registration.price != null && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Property Price</p>
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm">${registration.price.toLocaleString()}</p>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-3 gap-4">
                {registration.num_bedrooms != null && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Bedrooms</p>
                    <p className="text-sm">{registration.num_bedrooms}</p>
                  </div>
                )}
                {registration.num_rooms != null && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Rooms</p>
                    <p className="text-sm">{registration.num_rooms}</p>
                  </div>
                )}
                {registration.total_built_up_area != null && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Built Up Area</p>
                    <p className="text-sm">{registration.total_built_up_area} sqm</p>
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Created</p>
                <p className="text-sm">
                  {registration.created_at
                    ? new Date(registration.created_at).toLocaleDateString()
                    : '—'}
                </p>
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
              {registration.selected_items && Array.isArray(registration.selected_items) && registration.selected_items.length > 0 ? (
                <div className="space-y-4">
                  {/* Group items by category */}
                  {Object.entries(
                    (registration.selected_items as SelectedItemShape[]).reduce((acc: Record<string, SelectedItemShape[]>, item: SelectedItemShape) => {
                      const category = item.category || 'Other';
                      if (!acc[category]) acc[category] = [];
                      acc[category].push(item);
                      return acc;
                    }, {} as Record<string, SelectedItemShape[]>)
                  ).map(([category, items]) => (
                    <div key={category}>
                      <h4 className="font-medium text-sm mb-2">{category}</h4>
                      <div className="space-y-2">
                        {items.map((item: SelectedItemShape, index: number) => (
                          <div key={item.id || index} className="flex items-center justify-between p-2 bg-muted rounded-md">
                            <div className="flex-1">
                              <p className="text-sm font-medium">{item.name}</p>
                              {item.brand && <p className="text-xs text-muted-foreground">{item.brand} {item.model}</p>}
                            </div>
                            {item.warranty_years && (
                              <Badge variant="outline" className="text-xs ml-2">
                                {item.warranty_years}yr warranty
                              </Badge>
                            )}
                          </div>
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
              {(() => {
                // Collect documents from selected items
                const allDocuments: { type: string; name: string; url: string }[] = [];
                
                if (registration.selected_items && Array.isArray(registration.selected_items)) {
                  (registration.selected_items as SelectedItemShape[]).forEach((item: SelectedItemShape) => {
                    if (item.warranty_documents && Array.isArray(item.warranty_documents)) {
                      item.warranty_documents.forEach((doc: { url?: string } | string) => {
                        const urlVal = typeof doc === 'object' && doc && 'url' in doc ? (doc as { url?: string }).url : doc;
                        allDocuments.push({ type: 'Warranty', name: `${item.name ?? 'Item'} - Warranty`, url: typeof urlVal === 'string' ? urlVal : '' });
                      });
                    }
                    if (item.manual_documents && Array.isArray(item.manual_documents)) {
                      item.manual_documents.forEach((doc: { url?: string } | string) => {
                        const urlVal = typeof doc === 'object' && doc && 'url' in doc ? (doc as { url?: string }).url : doc;
                        allDocuments.push({ type: 'Manual', name: `${item.name ?? 'Item'} - Manual`, url: typeof urlVal === 'string' ? urlVal : '' });
                      });
                    }
                    if (item.manual_url) {
                      allDocuments.push({ type: 'Manual', name: `${item.name ?? 'Item'} - Manual`, url: item.manual_url });
                    }
                    if (item.documentation_url) {
                      allDocuments.push({ type: 'Documentation', name: `${item.name ?? 'Item'} - Documentation`, url: item.documentation_url });
                    }
                  });
                }

                // Also collect documents from customerDetails dtos.fileResponseDto so we can show
                // "<Item name> - <fileName>" entries for each mapped item document.
                const dataWithDtos = customerDetailsResponse?.data as
                  | {
                      dtos?: Array<{
                        category?: string | null;
                        items?: Array<{
                          name?: string | null;
                          fileResponseDto?: Array<{
                            id?: string;
                            fileName?: string;
                            fileUrl?: string;
                          }> | null;
                        }> | null;
                      }>;
                    }
                  | undefined;

                if (dataWithDtos?.dtos && Array.isArray(dataWithDtos.dtos)) {
                  for (const dto of dataWithDtos.dtos) {
                    if (!dto.items || !Array.isArray(dto.items)) continue;
                    for (const item of dto.items) {
                      if (!item.fileResponseDto || !Array.isArray(item.fileResponseDto)) continue;
                      for (const f of item.fileResponseDto) {
                        const fileName = f.fileName ?? "document";
                        const url = f.fileUrl ?? "";
                        const itemName = item.name ?? "Item";
                        allDocuments.push({
                          type: "Document",
                          name: `${itemName} - ${fileName}`,
                          url,
                        });
                      }
                    }
                  }
                }
                
                // Also check documents_uploaded object
                const docsUploaded = registration.documents_uploaded as Record<string, unknown> | null | undefined;
                if (docsUploaded && typeof docsUploaded === 'object' && Object.keys(docsUploaded).length > 0) {
                  Object.entries(docsUploaded).forEach(([docType, files]) => {
                    if (Array.isArray(files)) {
                      (files as Array<{ name?: string; url?: string }>).forEach((file: { name?: string; url?: string }) => {
                        allDocuments.push({ type: docType, name: file.name ?? docType, url: file.url ?? '' });
                      });
                    }
                  });
                }
                
                if (allDocuments.length > 0) {
                  return (
                    <div className="space-y-2">
                      {allDocuments.map((doc, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-md">
                          <div className="flex-1">
                            <p className="text-sm">{doc.name}</p>
                            <Badge variant="outline" className="text-xs">{doc.type}</Badge>
                          </div>
                          {/* {doc.url && (
                            <a 
                              href={doc.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline ml-2"
                            >
                              View
                            </a>
                          )} */}
                        </div>
                      ))}
                    </div>
                  );
                }
                
                return <p className="text-muted-foreground text-sm">No documents uploaded yet.</p>;
              })()}
            </CardContent>
          </Card>
        </div>
      </main>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Registration</AlertDialogTitle>
            <AlertDialogDescription>
              {registration?.status === 'sent' 
                ? "This will remove the property from the homeowner's entitlements. This action cannot be undone."
                : "Are you sure you want to delete this registration? This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={handoverDialogOpen} onOpenChange={setHandoverDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as Handed Over</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark this property as handed over? Once marked, this registration will become read-only and cannot be edited.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleMarkHandedOver}>
              Confirm Handover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default RegistrationDetail;