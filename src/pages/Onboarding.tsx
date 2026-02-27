import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import WorkflowSteps from "@/components/WorkflowSteps";
import CustomerDetailsForm, { type CustomerDetailsFormData, type CustomerDetailsFormRef } from "@/components/CustomerDetailsForm";
import ItemsSelectionForm from "@/components/ItemsSelectionForm";
import ReviewApprovalForm from "@/components/ReviewApprovalForm";
import SendConfirmationForm from "@/components/SendConfirmationForm";
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
import { useCreateCustomerEntitlementMutation, useGetCustomerDetailsQuery, useCreateBuilderCustomerMutation } from "@/store/api";

// Builder login: allow onboarding when JWT is in localStorage (no Supabase user required)
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

// User/org id for registrations: Supabase user id or builder auth id (org id used as builder id for API)
const getBuilderId = (): string | null => {
  const userData = localStorage.getItem("userData");
  if (userData) {
    try {
      const parsed = JSON.parse(userData);
      const orgId = parsed?.userInfo?.builderOrganization?.id ?? parsed?.builderOrganization?.id ?? parsed?.builder_organization?.id;
      const userId = parsed?.userInfo?.id ?? parsed?.id;
      return orgId ?? userId ?? null;
    } catch {
      // ignore
    }
  }
  return null;
};

type CustomerFormData = CustomerDetailsFormData & { registrationId?: string };

const Onboarding = () => {
  const { user } = useAuth();
  const { organization } = useOrganization();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [currentStep, setCurrentStep] = useState('customer');
  const [registrationId, setRegistrationId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    customer: {},
    items: {},
    documents: {}
  });
  const [loading, setLoading] = useState(false);
  const [originalEmail, setOriginalEmail] = useState<string | null>(null);
  const [originalStatus, setOriginalStatus] = useState<string | null>(null);
  const [emailChangeDialogOpen, setEmailChangeDialogOpen] = useState(false);
  const [pendingCustomerData, setPendingCustomerData] = useState<CustomerFormData | null>(null);
  const customerFormRef = useRef<CustomerDetailsFormRef>(null);

  const isAuthenticated = !!user || hasBuilderAuth();
  const effectiveUserId = user?.id ?? getBuilderId();
  const builderId = organization?.id ?? getBuilderId();
  const editingId = searchParams.get('id');

  // Builder flow: load customer from API when opening with ?id= (customer id)
  const { data: customerDetailsResponse, isLoading: isLoadingCustomer, error: customerError } = useGetCustomerDetailsQuery(
    { builderId: builderId ?? '', customerId: editingId ?? '' },
    { skip: !editingId || !builderId || !hasBuilderAuth() }
  );

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth');
    }
  }, [isAuthenticated, navigate]);

  // Builder flow: when getCustomerDetails returns, pre-fill customer form (support camelCase or snake_case from API)
  useEffect(() => {
    if (!hasBuilderAuth() || !editingId || !customerDetailsResponse?.data?.customer) return;
    const c = customerDetailsResponse.data.customer as unknown as Record<string, unknown>;
    const get = (camel: string, snake?: string) =>
      (c[camel] as string) ?? (snake && (c[snake] as string)) ?? '';
    const getNum = (camel: string, snake?: string): string => {
      const v = c[camel] ?? (snake && c[snake]);
      if (v == null) return '';
      if (typeof v === 'number' && !Number.isNaN(v)) return String(v);
      if (typeof v === 'string') return v;
      return '';
    };
    const project = c.project as { id?: string; name?: string } | undefined;
    setFormData((prev) => ({
      ...prev,
      customer: {
        firstName: get('firstName', 'first_name'),
        lastName: get('lastName', 'last_name'),
        email: get('email'),
        phone: get('contact', 'phone'),
        propertyAddress: get('address', 'property_address'),
        city: get('city'),
        state: get('state'),
        zipCode: get('zip', 'zip_code'),
        projectId: project?.id ?? get('projectId', 'project_id'),
        projectName: project?.name ?? get('projectName', 'project_name'),
        settlementDate: get('settlementDate', 'settlement_date'),
        notes: get('notes'),
        price: getNum('price'),
        numBedrooms: getNum('numBedrooms', 'num_bedrooms'),
        numRooms: getNum('numRooms', 'num_rooms'),
        totalBuiltUpArea: getNum('totalBuiltUpArea', 'total_built_up_area'),
      }
    }));
  }, [editingId, customerDetailsResponse]);

  // Builder flow: handle customer not found or API error
  useEffect(() => {
    if (!hasBuilderAuth() || !editingId) return;
    if (customerError && !isLoadingCustomer) {
      toast({
        title: "Registration not found",
        description: "This registration doesn't exist or you don't have access to it.",
        variant: "destructive"
      });
      navigate('/dashboard');
    }
  }, [editingId, customerError, isLoadingCustomer, navigate, toast]);

  const loadExistingRegistration = useCallback(
    async (id: string) => {
      if (!effectiveUserId) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('homeowner_registrations')
          .select('*')
          .eq('id', id)
          .eq('builder_id', effectiveUserId)
          .single();

        if (error) {
          if ((error as { code?: string }).code === 'PGRST116') {
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

        // Parse the existing data and populate form
        setOriginalEmail(data.customer_email);
        setOriginalStatus(data.status);
        
        const existingFormData = {
          customer: {
            firstName: data.customer_name?.split(' ')[0] || '',
            lastName: data.customer_name?.split(' ').slice(1).join(' ') || '',
            email: data.customer_email || '',
            phone: data.customer_phone || '',
            propertyAddress: data.property_address || '',
            city: data.property_city || '',
            state: data.property_state || '',
            zipCode: data.property_zip || '',
            projectName: data.project_name || '',
            settlementDate: data.settlement_date || '',
            notes: data.notes || ''
          },
          items: { selected_items: Array.isArray(data.selected_items) ? data.selected_items : [] },
          documents: data.documents_uploaded || {}
        };

        setFormData(existingFormData);

        // Determine which step to start on based on data completeness
        if (data.status === 'ready_for_review') {
          setCurrentStep('review');
        } else if (data.selected_items && Array.isArray(data.selected_items) && data.selected_items.length > 0) {
          setCurrentStep('review');
        } else if (data.customer_name && data.customer_email) {
          setCurrentStep('items');
        }
      } catch (error: unknown) {
        toast({
          title: "Error loading registration",
          description: error instanceof Error ? error.message : "Failed to load registration",
          variant: "destructive"
        });
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    },
    [effectiveUserId, navigate, toast]
  );

  // Set registrationId from URL when editing existing customer
  useEffect(() => {
    if (!editingId || !isAuthenticated) return;
    setRegistrationId(editingId);
    if (hasBuilderAuth()) {
      // Builder flow: don't call Supabase; customer data comes from getCustomerDetailsQuery above
      return;
    }
    if (effectiveUserId) {
      loadExistingRegistration(editingId);
    }
  }, [editingId, isAuthenticated, effectiveUserId, loadExistingRegistration]);

  const handleStepClick = (stepId: string) => {
    setCurrentStep(stepId);
  };

  const saveRegistrationData = async (stepData: unknown, step: string) => {
    const orgId = organization?.id ?? getBuilderId();
    if (!isAuthenticated || !effectiveUserId || !orgId) return;

    try {
      console.log('Onboarding - saveRegistrationData called:', { step, stepData });
      const updatedFormData = { ...formData, [step]: stepData as unknown };
      console.log('Onboarding - updatedFormData:', updatedFormData);
      setFormData(updatedFormData);

      let registrationData: Record<string, unknown> = {
        builder_id: effectiveUserId,
        organization_id: orgId,
        status: 'draft'
      };

      // Add customer data
      if (updatedFormData.customer) {
        const customerData = updatedFormData.customer as {
          firstName?: string;
          lastName?: string;
          email?: string;
          phone?: string;
          propertyAddress?: string;
          city?: string;
          state?: string;
          zipCode?: string;
          projectName?: string;
          settlementDate?: string | null;
          notes?: string;
        };
        console.log('Onboarding - Processing customer data:', customerData);
        registrationData = {
          ...registrationData,
          customer_name: customerData.firstName && customerData.lastName 
            ? `${customerData.firstName} ${customerData.lastName}` 
            : '',
          customer_email: customerData.email || '',
          customer_phone: customerData.phone || '',
          property_address: customerData.propertyAddress || '',
          property_city: customerData.city || '',
          property_state: customerData.state || '',
          property_zip: customerData.zipCode || '',
          project_name: customerData.projectName || '',
          settlement_date: customerData.settlementDate || null,
          notes: customerData.notes || ''
        };
        console.log('Onboarding - Mapped registration data:', registrationData);
      }

      // Add items data - extract the array from the nested structure
      if (updatedFormData.items) {
        const itemsData = updatedFormData.items as { selected_items?: unknown };
        (registrationData as { selected_items?: unknown }).selected_items =
          itemsData.selected_items ?? updatedFormData.items;
      }

      // Add documents data
      if (updatedFormData.documents) {
        (registrationData as { documents_uploaded?: unknown }).documents_uploaded = updatedFormData.documents;
      }

      // Update status based on current step
      if (step === 'documents' && Object.keys(updatedFormData.documents).length > 0) {
        registrationData.status = 'ready_for_review';
      } else if (step === 'items' && Object.keys(updatedFormData.items).length > 0) {
        registrationData.status = 'documents_pending';
      }

      if (registrationId) {
        // Update existing registration
        const { error } = await supabase
          .from('homeowner_registrations')
          .update(registrationData as never)
          .eq('id', registrationId);

        if (error) throw error;
      } else {
        // Create new registration
        const { data, error } = await supabase
          .from('homeowner_registrations')
          .insert(registrationData as never)
          .select()
          .single();

        if (error) throw error;
        setRegistrationId(data.id);
      }
    } catch (error: unknown) {
      toast({
        title: "Error saving data",
        description: error instanceof Error ? error.message : "Failed to save data",
        variant: "destructive"
      });
    }
  };

  const handleCustomerNext = async (customerData: CustomerFormData) => {
    // Check if email changed for sent registrations
    if (originalStatus === 'sent' && originalEmail && customerData.email !== originalEmail) {
      setPendingCustomerData(customerData);
      setEmailChangeDialogOpen(true);
      return;
    }
    
    if (customerData.registrationId) {
      setRegistrationId(customerData.registrationId);
    }
    setFormData(prev => ({ ...prev, customer: customerData }));
    handleNextStep();
  };

  const confirmEmailChange = async () => {
    if (!pendingCustomerData) return;
    
    setEmailChangeDialogOpen(false);
    if (pendingCustomerData.registrationId) {
      setRegistrationId(pendingCustomerData.registrationId);
    }
    setFormData(prev => ({ ...prev, customer: pendingCustomerData }));
    setPendingCustomerData(null);
    handleNextStep();
  };

  const handleItemsNext = async (itemsData: unknown) => {
    // Extract the actual items array from the nested structure
    let items: unknown = itemsData;
    if (itemsData && typeof itemsData === 'object' && 'selected_items' in (itemsData as Record<string, unknown>)) {
      items = (itemsData as { selected_items: unknown }).selected_items;
    }
    setFormData(prev => ({ ...prev, items: { selected_items: items } }));
    handleNextStep();
  };

  const handleDocumentsNext = async (documentsData: unknown) => {
    await saveRegistrationData(documentsData, 'documents');
    handleNextStep();
  };

  const handleSaveAndExit = async () => {
    if (currentStep === 'customer') {
      await customerFormRef.current?.saveAndExit();
      return;
    }
    if (currentStep === 'items' && hasBuilderAuth()) {
      const ok = await saveCustomerFromFormData();
      if (!ok) {
        toast({
          title: "Error saving",
          description: "Could not save customer. Please try again.",
          variant: "destructive"
        });
        return;
      }
    }
    if (currentStep === 'review' && hasBuilderAuth() && registrationId) {
      try {
        await createCustomerEntitlement({ builderCustomerId: registrationId }).unwrap();
        toast({
          title: "Entitlement created",
          description: "Customer entitlement has been created. You can continue later from your dashboard."
        });
        navigate('/dashboard');
        return;
      } catch (error: unknown) {
        const description =
          error && typeof error === "object" && "data" in error
            ? String((error as { data?: unknown }).data ?? "Failed to create entitlement")
            : error instanceof Error ? error.message : "Failed to create entitlement";
        toast({
          title: "Error creating entitlement",
          description,
          variant: "destructive"
        });
        return;
      }
    }
    toast({
      title: "Registration saved",
      description: "You can continue this registration later from your dashboard."
    });
    navigate('/dashboard');
  };

  const handleNextStep = () => {
    const steps = ['customer', 'items', 'review', 'send'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  };

  const handlePreviousStep = () => {
    const steps = ['customer', 'items', 'review', 'send'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };

  const [createCustomerEntitlement] = useCreateCustomerEntitlementMutation();
  const [createBuilderCustomer] = useCreateBuilderCustomerMutation();

  const saveCustomerFromFormData = useCallback(async (): Promise<boolean> => {
    if (!hasBuilderAuth()) return true;
    const customer = formData.customer as Partial<CustomerFormData>;
    const builderOrganizationId = organization?.id ?? getBuilderId();
    if (!builderOrganizationId) return false;
    const numBedrooms = customer.numBedrooms ? Number(customer.numBedrooms) : undefined;
    const numRooms = customer.numRooms ? Number(customer.numRooms) : undefined;
    const price = customer.price ? Number(customer.price) : undefined;
    const totalBuiltUpArea = customer.totalBuiltUpArea ? Number(customer.totalBuiltUpArea) : undefined;
    try {
      await createBuilderCustomer({
        id: registrationId ?? customer.registrationId ?? undefined,
        firstName: (customer.firstName ?? '').trim(),
        lastName: (customer.lastName ?? '').trim(),
        email: (customer.email ?? '').trim(),
        contact: (customer.phone ?? '').trim(),
        address: (customer.propertyAddress ?? '').trim(),
        city: (customer.city ?? '').trim(),
        state: customer.state ?? '',
        zip: (customer.zipCode ?? '').trim(),
        country: 'Australia',
        projectId: customer.projectId || undefined,
        projectName: customer.projectName || undefined,
        settlementDate: customer.settlementDate || undefined,
        notes: customer.notes?.trim() || undefined,
        numBedrooms: numBedrooms !== undefined && !Number.isNaN(numBedrooms) ? numBedrooms : undefined,
        numRooms: numRooms !== undefined && !Number.isNaN(numRooms) ? numRooms : undefined,
        price: price !== undefined && !Number.isNaN(price) ? price : undefined,
        totalBuiltUpArea: totalBuiltUpArea !== undefined && !Number.isNaN(totalBuiltUpArea) ? totalBuiltUpArea : undefined,
        consentMethod: 'form',
        consentReceived: true,
        consentReceivedAt: new Date().toISOString(),
        consentToken: undefined,
        builderOrganizationId,
      }).unwrap();
      return true;
    } catch {
      return false;
    }
  }, [formData.customer, registrationId, organization, createBuilderCustomer]);

  const handleSendEntitlement = async () => {
    if (!registrationId) return;

    try {
      // Builder flow: call API (matches old project: /api/create/customerentitlement/:builderCustomerId)
      if (hasBuilderAuth()) {
        await createCustomerEntitlement({ builderCustomerId: registrationId }).unwrap();
      } else {
        const { error } = await supabase
          .from('homeowner_registrations')
          .update({
            status: 'sent',
            entitlement_sent_at: new Date().toISOString()
          })
          .eq('id', registrationId);
        if (error) throw error;
      }

      toast({
        title: "Entitlement sent!",
        description: "The warranty entitlement has been sent to the homeowner."
      });

      handleNextStep();
    } catch (error: unknown) {
      const description =
        error && typeof error === 'object' && 'data' in error
          ? String((error as { data?: unknown }).data ?? 'Failed to send entitlement')
          : error instanceof Error
          ? error.message
          : 'Failed to send entitlement';
      toast({
        title: "Error sending entitlement",
        description,
        variant: "destructive"
      });
    }
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'customer':
        return (
          <CustomerDetailsForm
            ref={customerFormRef}
            onNext={handleCustomerNext}
            initialData={formData.customer}
            registrationId={registrationId}
            onSavedAndExit={() => {
              toast({
                title: "Registration saved",
                description: "You can continue this registration later from your dashboard."
              });
              navigate('/dashboard');
            }}
          />
        );
      case 'items':
        return (
          <ItemsSelectionForm
            onNext={handleItemsNext}
            initialData={formData.items}
            registrationId={registrationId}
            onSaveCustomerBeforeContinue={hasBuilderAuth() ? saveCustomerFromFormData : undefined}
          />
        );
      case 'review':
        return (
          <ReviewApprovalForm
            onNext={hasBuilderAuth() ? handleNextStep : handleSendEntitlement}
            formData={formData}
            registrationId={registrationId}
            useBuilderEntitlementApi={hasBuilderAuth()}
          />
        );
      case 'send':
        return <SendConfirmationForm registrationId={registrationId} />;
      default:
        return <WorkflowSteps currentStep={currentStep} onStepClick={handleStepClick} />;
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  const isEditingLoading = loading || (hasBuilderAuth() && !!editingId && isLoadingCustomer);
  if (isEditingLoading) {
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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentStep === 'overview' ? (
          <WorkflowSteps currentStep={currentStep} onStepClick={handleStepClick} />
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Buyer Onboarding Form</h1>
                <p className="text-muted-foreground mt-1">Create comprehensive documentation packages for your homebuyers</p>
              </div>
              <div className="flex items-center space-x-4">
                <Button variant="outline" onClick={handleSaveAndExit}>
                  Save & Exit
                </Button>
                <div className="text-sm text-muted-foreground">
                  Step {['customer', 'items', 'documents', 'review', 'send'].indexOf(currentStep) + 1} of 5
                </div>
              </div>
            </div>
            
            {/* Navigation */}
            <div className="flex items-center justify-between">
              <div>
                {['customer', 'items', 'documents', 'review', 'send'].indexOf(currentStep) > 0 && (
                  <Button variant="outline" onClick={handlePreviousStep}>
                    Previous
                  </Button>
                )}
              </div>
              <div className="flex space-x-2">
                {['customer', 'items', 'documents', 'review', 'send'].map((step, index) => (
                  <div
                    key={step}
                    className={`w-3 h-3 rounded-full ${
                      ['customer', 'items', 'documents', 'review', 'send'].indexOf(currentStep) >= index
                        ? 'bg-primary'
                        : 'bg-muted'
                    }`}
                  />
                ))}
              </div>
            </div>
            
            {renderCurrentStep()}
          </div>
        )}
      </main>

      <AlertDialog open={emailChangeDialogOpen} onOpenChange={setEmailChangeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Email Change</AlertDialogTitle>
            <AlertDialogDescription>
              This registration has already been sent to the homeowner. Changing the email address will require resending the entitlement to the new email. Do you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingCustomerData(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmEmailChange}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Onboarding;