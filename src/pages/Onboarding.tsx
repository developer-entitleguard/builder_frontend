import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useGetCustomerDetailsQuery } from "@/lib/api/services/customerDetails";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import WorkflowSteps from "@/components/WorkflowSteps";
import CustomerDetailsForm from "@/components/CustomerDetailsForm";
import ItemsSelectionForm from "@/components/ItemsSelectionForm";
import DocumentUploadForm from "@/components/DocumentUploadForm";
import ReviewApprovalForm from "@/components/ReviewApprovalForm";
import SendConfirmationForm from "@/components/SendConfirmationForm";
import type { CustomerDetailsResponse } from "@/lib/api/types";

const Onboarding = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [currentStep, setCurrentStep] = useState('customer');
  const [registrationId, setRegistrationId] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
    customer: Record<string, unknown>;
    items: Record<string, unknown>;
    documents: Record<string, unknown>;
  }>({
    customer: {},
    items: {},
    documents: { documents: {}, itemDetails: {} }
  });
  const [customerDetailsData, setCustomerDetailsData] = useState<CustomerDetailsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [recentSelectedItemIds, setRecentSelectedItemIds] = useState<string[] | null>(null);

  const editingId = searchParams.get('id');
  const builderId = user && 'builderOrganization' in user 
    ? user.builderOrganization.id 
    : null;

  const { data: customerDetailsResponse, isLoading: isFetchingDetails } = useGetCustomerDetailsQuery(
    { builderId: builderId || '', customerId: editingId || '' },
    { skip: !builderId || !editingId }
  );

  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  useEffect(() => {
    if (editingId && user) {
      setRegistrationId(editingId);
    }
  }, [editingId, user]);

  useEffect(() => {
    if (customerDetailsResponse?.data && editingId) {
      setLoading(true);
      try {
        const customer = customerDetailsResponse.data.customer;
        const dtos = customerDetailsResponse.data.dtos;
        const customerFormData = {
          firstName: customer.firstName || '',
          lastName: customer.lastName || '',
          email: customer.email || '',
          phone: customer.contact || '',
          propertyAddress: customer.address || '',
          city: customer.city || '',
          state: customer.state || '',
          zipCode: customer.zip || '',
          projectName: customer.projectName || '',
          settlementDate: customer.settlementDate || '',
          notes: customer.notes || ''
        };

        const itemsFormData: Record<string, unknown> = {};
        if (dtos && dtos.length > 0) {
          dtos.forEach(categoryData => {
            if (categoryData.items && categoryData.items.length > 0) {
              itemsFormData[categoryData.category] = categoryData.items.map(item => ({
                id: item.id,
                name: item.name,
                mapped: item.mapped
              }));
            }
          });
        }

        setFormData({
          customer: customerFormData,
          items: itemsFormData,
          documents: { documents: {}, itemDetails: {} }
        });
        setCustomerDetailsData(customerDetailsResponse);
        let initialStep = 'customer';
        let savedFormData = null;
        const savedData = getSavedStep(editingId);
        if (savedData.step) {
          initialStep = savedData.step;
          savedFormData = savedData.savedFormData;
        }
        if (dtos && dtos.length > 0) {
          const hasMappedItems = dtos.some(cat => 
            cat.items.some(item => item.mapped)
          );
          if (hasMappedItems) {
            initialStep = 'documents';
          } else if (initialStep === 'customer') {
            initialStep = 'items';
          }
        } else if (customer.firstName && customer.email && initialStep === 'customer') {
          initialStep = 'items';
        }
        if (savedFormData) {
          setFormData(savedFormData);
        }
        setCurrentStep(initialStep);

      } catch (error: unknown) {
        toast({
          title: "Error loading registration",
          description: error instanceof Error ? error.message : 'An error occurred',
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    }
  }, [customerDetailsResponse, editingId, user, toast]);

  const handleStepClick = (stepId: string) => {
    setCurrentStep(stepId);
    saveCurrentStep(stepId);
  };

  const saveCurrentStep = (step: string) => {
    if (!editingId) return;
    
    try {
      const stepData = {
        currentStep: step,
        lastUpdated: new Date().toISOString(),
        customerId: editingId,
        formData: formData // Save the entire form data
      };
      localStorage.setItem(`onboarding_step_${editingId}`, JSON.stringify(stepData));
    } catch (error) {
      console.error('Failed to save current step:', error);
    }
  };

  const getSavedStep = (customerId: string): { step: string | null; savedFormData: Record<string, unknown> | null } => {
    try {
      const savedData = localStorage.getItem(`onboarding_step_${customerId}`);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        return {
          step: parsed.currentStep || null,
          savedFormData: parsed.formData || null
        };
      }
    } catch (error) {
      console.error('Failed to get saved step:', error);
    }
    return { step: null, savedFormData: null };
  };

  const saveRegistrationData = async (stepData: Record<string, unknown>, step: string) => {
    if (!user) return;

    try {
      console.log('Onboarding - saveRegistrationData called:', { step, stepData });
      const updatedFormData = { ...formData, [step]: stepData };
      console.log('Onboarding - updatedFormData:', updatedFormData);
      setFormData(updatedFormData);

      const registrationData: Record<string, unknown> = {
        builder_id: user.id,
        status: 'draft'
      };

      // Add customer data
      if (updatedFormData.customer) {
        const customerData = updatedFormData.customer as Record<string, string>;
        console.log('Onboarding - Processing customer data:', customerData);
        Object.assign(registrationData, {
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
        });
        console.log('Onboarding - Mapped registration data:', registrationData);
      }

      // Add items data
      if (updatedFormData.items) {
        registrationData.selected_items = updatedFormData.items;
      }

      // Add documents data
      if (updatedFormData.documents) {
        registrationData.documents_uploaded = updatedFormData.documents;
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
          .update(registrationData)
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
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: "destructive"
      });
    }
  };

  const handleCustomerNext = async (customerData: Record<string, unknown>) => {
    if (customerData.registrationId && typeof customerData.registrationId === 'string') {
      setRegistrationId(customerData.registrationId);
    }
    setFormData(prev => ({ ...prev, customer: customerData }));
    // Skip saveRegistrationData for customer step - only customer API is called
    handleNextStep();
  };

  const handleItemsNext = async (itemsData: Record<string, unknown>) => {
    if (itemsData.registrationId && typeof itemsData.registrationId === 'string') {
      setRegistrationId(itemsData.registrationId);
    }
    const justSelected = (itemsData as { selected_items?: string[] }).selected_items || [];
    setRecentSelectedItemIds(justSelected);
    setFormData(prev => ({ ...prev, items: itemsData }));
    handleNextStep();
  };

  const handleDocumentsNext = async (documentsData: Record<string, unknown>) => {
    await saveRegistrationData(documentsData, 'documents');
    handleNextStep();
  };

  const handleSaveAndExit = async () => {
    toast({
      title: "Registration saved",
      description: "You can continue this registration later from your dashboard."
    });
    navigate('/dashboard');
  };

  const handleNextStep = () => {
    const steps = ['customer', 'items', 'documents', 'review', 'send'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      const nextStep = steps[currentIndex + 1];
      setCurrentStep(nextStep);
      saveCurrentStep(nextStep);
    }
  };

  const handlePreviousStep = () => {
    const steps = ['customer', 'items', 'documents', 'review', 'send'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      const prevStep = steps[currentIndex - 1];
      setCurrentStep(prevStep);
      saveCurrentStep(prevStep);
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

      if (editingId) {
        localStorage.removeItem(`onboarding_step_${editingId}`);
      }

      toast({
        title: "Entitlement sent!",
        description: "The warranty entitlement has been sent to the homeowner."
      });

      handleNextStep();
    } catch (error: unknown) {
      toast({
        title: "Error sending entitlement",
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: "destructive"
      });
    }
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'customer':
        return <CustomerDetailsForm onNext={handleCustomerNext as (data: unknown) => void} initialData={formData.customer} />;
      case 'items':
        return <ItemsSelectionForm 
          onNext={handleItemsNext as (data: unknown) => void} 
          initialData={{
            ...formData.items, 
            ...formData.customer,
            builderId: builderId,
            customerId: editingId || (formData.customer as Record<string, unknown>)?.customerId as string
          }} 
          registrationId={registrationId} 
        />;
      case 'documents': {
        const selectedItems = recentSelectedItemIds && recentSelectedItemIds.length > 0
          ? recentSelectedItemIds
          : ((formData.items as Record<string, unknown>)?.selected_items as string[] || []);
        return <DocumentUploadForm 
          onNext={handleDocumentsNext as (data: unknown) => void} 
          initialData={{
            ...formData.documents, 
            ...formData.items, 
            ...formData.customer,
            builderId: builderId,
            customerId: editingId || (formData.customer as Record<string, unknown>)?.customerId as string,
            selected_items: selectedItems
          } as unknown as Parameters<typeof DocumentUploadForm>[0]['initialData']} 
          selectedItems={selectedItems} 
        />;
      }
      case 'review':
        return <ReviewApprovalForm onNext={handleSendEntitlement} formData={formData as unknown as Parameters<typeof ReviewApprovalForm>[0]['formData']} onCustomerDetailsLoaded={setCustomerDetailsData} />;
      case 'send':
        return <SendConfirmationForm customerDetailsData={customerDetailsData} isLoading={loading} />;
      default:
        return <WorkflowSteps currentStep={currentStep} onStepClick={handleStepClick} />;
    }
  };

  if (!user) {
    return null;
  }

  if (loading || isFetchingDetails) {
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
    </div>
  );
};

export default Onboarding;