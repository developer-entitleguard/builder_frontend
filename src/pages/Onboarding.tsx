import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import WorkflowSteps from "@/components/WorkflowSteps";
import CustomerDetailsForm from "@/components/CustomerDetailsForm";
import ItemsSelectionForm from "@/components/ItemsSelectionForm";
import DocumentUploadForm from "@/components/DocumentUploadForm";
import ReviewApprovalForm from "@/components/ReviewApprovalForm";
import SendConfirmationForm from "@/components/SendConfirmationForm";

const Onboarding = () => {
  const { user } = useAuth();
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

  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  // Check for existing registration ID in URL params and load data
  useEffect(() => {
    const editingId = searchParams.get('id');
    if (editingId && user) {
      setRegistrationId(editingId);
      loadExistingRegistration(editingId);
    }
  }, [searchParams, user]);

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
        items: data.selected_items || {},
        documents: data.documents_uploaded || {}
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

  const handleStepClick = (stepId: string) => {
    setCurrentStep(stepId);
  };

  const saveRegistrationData = async (stepData: any, step: string) => {
    if (!user) return;

    try {
      console.log('Onboarding - saveRegistrationData called:', { step, stepData });
      const updatedFormData = { ...formData, [step]: stepData };
      console.log('Onboarding - updatedFormData:', updatedFormData);
      setFormData(updatedFormData);

      let registrationData: any = {
        builder_id: user.id,
        status: 'draft'
      };

      // Add customer data
      if (updatedFormData.customer) {
        const customerData = updatedFormData.customer as any;
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
          .insert(registrationData)
          .select()
          .single();

        if (error) throw error;
        setRegistrationId(data.id);
      }
    } catch (error: any) {
      toast({
        title: "Error saving data",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleCustomerNext = async (customerData: any) => {
    if (customerData.registrationId) {
      setRegistrationId(customerData.registrationId);
    }
    setFormData(prev => ({ ...prev, customer: customerData }));
    handleNextStep();
  };

  const handleItemsNext = async (itemsData: any) => {
    if (itemsData.registrationId) {
      setRegistrationId(itemsData.registrationId);
    }
    setFormData(prev => ({ ...prev, items: itemsData }));
    handleNextStep();
  };

  const handleDocumentsNext = async (documentsData: any) => {
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
      setCurrentStep(steps[currentIndex + 1]);
    }
  };

  const handlePreviousStep = () => {
    const steps = ['customer', 'items', 'documents', 'review', 'send'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
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
    } catch (error: any) {
      toast({
        title: "Error sending entitlement",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'customer':
        return <CustomerDetailsForm onNext={handleCustomerNext} initialData={formData.customer} />;
      case 'items':
        return <ItemsSelectionForm onNext={handleItemsNext} initialData={formData.items} registrationId={registrationId} />;
      case 'documents':
        return <DocumentUploadForm onNext={handleDocumentsNext} initialData={formData.documents} selectedItems={(formData.items as any)?.selected_items || []} />;
      case 'review':
        return <ReviewApprovalForm onNext={handleSendEntitlement} formData={formData} />;
      case 'send':
        return <SendConfirmationForm />;
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