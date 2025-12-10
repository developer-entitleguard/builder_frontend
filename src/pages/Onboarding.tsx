import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCreateBuilderCustomerMutation } from "@/lib/api/services/builderCustomer";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import WorkflowSteps from "@/components/WorkflowSteps";
import CustomerDetailsForm from "@/components/CustomerDetailsForm";
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

// Type definitions
interface CustomerFormData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  propertyAddress?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  projectName?: string;
  settlementDate?: string;
  notes?: string;
  customerId?: string;
  registrationId?: string;
}

// RegistrationItem type matching ItemsSelectionForm
interface RegistrationItem {
  id: string;
  name: string;
  category: string;
  brand: string | null;
  model: string | null;
  make: string | null;
  description: string | null;
  price: number | null;
  bom_id: string | null;
  color?: string;
  custom_notes?: string;
  is_custom?: boolean;
  serial_number?: string;
  builderItemId?: string;
  seller?: string;
  quantity?: number;
  [key: string]: unknown;
}

interface ItemsFormData {
  selected_items?: RegistrationItem[];
  [key: string]: unknown;
}

interface OnboardingFormData {
  customer?: CustomerFormData;
  items?: ItemsFormData;
  documents?: Record<string, unknown>;
}

interface RegistrationData {
  builder_id: string;
  status: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  property_address?: string;
  property_city?: string;
  property_state?: string;
  property_zip?: string;
  project_name?: string;
  settlement_date?: string | null;
  notes?: string;
  selected_items?: ItemsFormData;
  documents_uploaded?: Record<string, unknown>;
}

const Onboarding = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [createBuilderCustomer, { isLoading: isSaving }] = useCreateBuilderCustomerMutation();
  
  // Helper function to get step from URL
  const getStepFromUrl = (params: URLSearchParams) => {
    const stepParam = params.get('step');
    const validSteps = ['overview', 'customer', 'items', 'review', 'send'];
    return stepParam && validSteps.includes(stepParam) ? stepParam : 'customer';
  };
  
  // Initialize currentStep from URL params, fallback to 'customer'
  const [currentStep, setCurrentStep] = useState(() => getStepFromUrl(searchParams));
  const [registrationId, setRegistrationId] = useState<string | null>(null);
  const [formData, setFormData] = useState<OnboardingFormData>({
    customer: {},
    items: {},
    documents: {}
  });
  const [loading, setLoading] = useState(false);
  const [originalEmail, setOriginalEmail] = useState<string | null>(null);
  const [originalStatus, setOriginalStatus] = useState<string | null>(null);
  const [emailChangeDialogOpen, setEmailChangeDialogOpen] = useState(false);
  const [pendingCustomerData, setPendingCustomerData] = useState<CustomerFormData | null>(null);
  
  // Ref to track if we're updating URL from internal state change (to prevent loop)
  const isInternalStepChange = useRef(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  // Check for existing registration ID in URL params
  useEffect(() => {
    const editingId = searchParams.get('id');
    if (editingId && user) {
      setRegistrationId(editingId);
      // Legacy Supabase-backed registrations are no longer loaded.
      // We now rely on builder APIs and in-memory formData instead.
      setLoading(false);
    }
  }, [searchParams, user]);
  
  // Sync step from URL when URL changes externally (e.g., browser back/forward)
  useEffect(() => {
    if (isInternalStepChange.current) {
      isInternalStepChange.current = false;
      return;
    }
    
    const stepFromUrl = getStepFromUrl(searchParams);
    if (stepFromUrl !== currentStep) {
      setCurrentStep(stepFromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
  
  // Update URL when currentStep changes
  useEffect(() => {
    const currentStepParam = searchParams.get('step');
    if (currentStepParam !== currentStep) {
      isInternalStepChange.current = true;
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.set('step', currentStep);
      setSearchParams(newSearchParams, { replace: true });
    }
  }, [currentStep, searchParams, setSearchParams]);

  const loadExistingRegistration = async (id: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('homeowner_registrations')
        .select('*')
        .eq('id', id)
        .eq('builder_id', user?.id)
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

      // Parse the existing data and populate form
      setOriginalEmail(data.customer_email);
      setOriginalStatus(data.status);
      
      const existingFormData: OnboardingFormData = {
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
        items: (data.selected_items ? (Array.isArray(data.selected_items) ? { selected_items: data.selected_items as RegistrationItem[] } : {}) : {}) as ItemsFormData,
        documents: (data.documents_uploaded ? (typeof data.documents_uploaded === 'object' ? data.documents_uploaded as Record<string, unknown> : {}) : {})
      };

      setFormData(existingFormData);

      // Determine which step to start on based on data completeness
      if (data.status === 'ready_for_review') {
        setCurrentStep('review');
      } else if (data.selected_items && Object.keys(data.selected_items).length > 0) {
        setCurrentStep('documents');
      } else if (data.customer_name && data.customer_email) {
        setCurrentStep('items');
      }

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      toast({
        title: "Error loading registration",
        description: errorMessage,
        variant: "destructive"
      });
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleStepClick = (stepId: string) => {
    setCurrentStep(stepId);
    // Update URL immediately when step is clicked
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('step', stepId);
    setSearchParams(newSearchParams, { replace: true });
  };

  const saveRegistrationData = async (stepData: CustomerFormData | ItemsFormData | Record<string, unknown>, step: string) => {
    if (!user) return;

    try {
      console.log('Onboarding - saveRegistrationData called:', { step, stepData });
      const updatedFormData = { ...formData, [step]: stepData };
      console.log('Onboarding - updatedFormData:', updatedFormData);
      setFormData(updatedFormData);

      let registrationData: RegistrationData = {
        builder_id: user.id,
        status: 'draft'
      };

      // Add customer data
      if (updatedFormData.customer) {
        const customerData = updatedFormData.customer;
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

      // Add items data
      if (updatedFormData.items) {
        registrationData.selected_items = updatedFormData.items;
      }

      // Add documents data
      if (updatedFormData.documents) {
        registrationData.documents_uploaded = updatedFormData.documents as Record<string, unknown>;
      }

      // Update status based on current step
      if (step === 'documents' && Object.keys(updatedFormData.documents).length > 0) {
        registrationData.status = 'ready_for_review';
      } else if (step === 'items' && Object.keys(updatedFormData.items).length > 0) {
        registrationData.status = 'documents_pending';
      }

      // Prepare data for Supabase with proper types
      const supabaseData = {
        builder_id: registrationData.builder_id,
        status: registrationData.status,
        customer_name: registrationData.customer_name || '',
        customer_email: registrationData.customer_email || '',
        customer_phone: registrationData.customer_phone || '',
        property_address: registrationData.property_address || '',
        property_city: registrationData.property_city || '',
        property_state: registrationData.property_state || '',
        property_zip: registrationData.property_zip || '',
        project_name: registrationData.project_name || '',
        settlement_date: registrationData.settlement_date || null,
        notes: registrationData.notes || '',
        selected_items: registrationData.selected_items ? JSON.parse(JSON.stringify(registrationData.selected_items)) : null,
        documents_uploaded: registrationData.documents_uploaded ? JSON.parse(JSON.stringify(registrationData.documents_uploaded)) : null
      };

      if (registrationId) {
        // Update existing registration
        const { error } = await supabase
          .from('homeowner_registrations')
          .update(supabaseData)
          .eq('id', registrationId);

        if (error) throw error;
      } else {
        // Create new registration
        const { data, error } = await supabase
          .from('homeowner_registrations')
          .insert(supabaseData)
          .select()
          .single();

        if (error) throw error;
        setRegistrationId(data.id);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      toast({
        title: "Error saving data",
        description: errorMessage,
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

  const handleItemsNext = async (itemsData: { selected_items: RegistrationItem[] }) => {
    // Extract registrationId if it exists in the data (though it shouldn't be in FormData)
    const registrationIdFromData = (itemsData as { selected_items: RegistrationItem[]; registrationId?: string }).registrationId;
    if (registrationIdFromData) {
      setRegistrationId(registrationIdFromData);
    }
    setFormData(prev => ({ ...prev, items: itemsData as ItemsFormData }));
    // Go directly to review page, skipping documents
    setCurrentStep('review');
    // Update URL when moving to review step
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('step', 'review');
    setSearchParams(newSearchParams, { replace: true });
  };

  const handleDocumentsNext = async (documentsData: Record<string, unknown>) => {
    await saveRegistrationData(documentsData, 'documents');
    handleNextStep();
  };

  const handleSaveAndExit = async () => {
    try {
      // If we're on the customer step and have customer data, save it via API first
      if (currentStep === 'customer' && formData.customer) {
        const customerData = formData.customer;
        
        // Validate that we have at least some customer data
        if (customerData.firstName || customerData.email) {
          // Get builderOrganizationId from user
          const builderOrganizationId = user && 'builderOrganization' in user && user.builderOrganization
            ? user.builderOrganization.id
            : user && 'id' in user 
            ? user.id 
            : null;

          if (!builderOrganizationId) {
            toast({
              title: "Error",
              description: "Organization ID is missing. Please log in again.",
              variant: "destructive"
            });
            return;
          }

          // Map form data to API payload format
          const apiPayload = {
            firstName: customerData.firstName || '',
            lastName: customerData.lastName || '',
            email: customerData.email || '',
            contact: customerData.phone || '',
            address: customerData.propertyAddress || '',
            city: customerData.city || '',
            state: customerData.state || '',
            zip: customerData.zipCode || '',
            projectName: customerData.projectName || undefined,
            settlementDate: customerData.settlementDate || undefined,
            notes: customerData.notes || undefined,
            builderOrganizationId: builderOrganizationId
          };

          // Call the API to save customer data
          const response = await createBuilderCustomer(apiPayload).unwrap();
          
          // Update registrationId if we got one from the response
          if (response.data?.id) {
            setRegistrationId(response.data.id);
            // Update formData with the registrationId
            setFormData(prev => ({
              ...prev,
              customer: {
                ...prev.customer,
                customerId: response.data.id,
                registrationId: response.data.id
              }
            }));
          }

          toast({
            title: "Registration saved",
            description: "Customer details have been saved. You can continue this registration later from your dashboard."
          });
        } else {
          toast({
            title: "Registration saved",
            description: "You can continue this registration later from your dashboard."
          });
        }
      } else {
        // For other steps, just show the message
        toast({
          title: "Registration saved",
          description: "You can continue this registration later from your dashboard."
        });
      }
      
      // Navigate to dashboard
      navigate('/dashboard');
    } catch (error) {
      console.error('Error saving registration:', error);
      const errorMessage = error && typeof error === 'object' && 'data' in error 
        ? (error.data as { message?: string })?.message 
        : undefined;
      toast({
        title: "Error saving registration",
        description: errorMessage || "Failed to save registration. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleNextStep = () => {
    const steps = ['customer', 'items', 'review', 'send'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      const nextStep = steps[currentIndex + 1];
      setCurrentStep(nextStep);
      // Update URL when moving to next step
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.set('step', nextStep);
      setSearchParams(newSearchParams, { replace: true });
    }
  };

  const handlePreviousStep = () => {
    const steps = ['customer', 'items', 'review', 'send'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      const prevStep = steps[currentIndex - 1];
      setCurrentStep(prevStep);
      // Update URL when moving to previous step
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.set('step', prevStep);
      setSearchParams(newSearchParams, { replace: true });
    }
  };

  const handleSendEntitlement = async () => {
    if (!registrationId) return;

    try {
      const { error } = await supabase
        .from('homeowner_registrations')
        .update({ 
          status: 'sent',
          entitlement_sent_at: new Date().toISOString()
        })
        .eq('id', registrationId);

      if (error) throw error;

      toast({
        title: "Entitlement sent!",
        description: "The warranty entitlement has been sent to the homeowner."
      });

      handleNextStep();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      toast({
        title: "Error sending entitlement",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'overview':
        return <WorkflowSteps currentStep={currentStep} onStepClick={handleStepClick} />;
      case 'customer':
        return <CustomerDetailsForm onNext={handleCustomerNext} initialData={formData.customer} customerId={registrationId || undefined} />;
      case 'items': {
        const bomId = searchParams.get('bomId');
        return <ItemsSelectionForm onNext={handleItemsNext} initialData={formData.items} registrationId={registrationId} billMaterialId={bomId || undefined} />;
      }
      case 'review':
        return <ReviewApprovalForm onNext={handleSendEntitlement} formData={formData} />;
      case 'send':
        return <SendConfirmationForm customerId={(formData.customer as CustomerFormData)?.customerId} />;
      default:
        return <WorkflowSteps currentStep={currentStep} onStepClick={handleStepClick} />;
    }
  };

  if (!user) {
    return null;
  }

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
                <Button variant="outline" onClick={handleSaveAndExit} disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save & Exit'}
                </Button>
                <div className="text-sm text-muted-foreground">
                  Step {['customer', 'items', 'review', 'send'].indexOf(currentStep) + 1} of 4
                </div>
              </div>
            </div>
            
            {/* Navigation */}
            <div className="flex items-center justify-between">
              <div>
                {['customer', 'items', 'review', 'send'].indexOf(currentStep) > 0 && (
                  <Button variant="outline" onClick={handlePreviousStep}>
                    Previous
                  </Button>
                )}
              </div>
              <div className="flex space-x-2">
                {['customer', 'items', 'review', 'send'].map((step, index) => (
                  <div
                    key={step}
                    className={`w-3 h-3 rounded-full ${
                      ['customer', 'items', 'review', 'send'].indexOf(currentStep) >= index
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