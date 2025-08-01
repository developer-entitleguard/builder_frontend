import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
  const [currentStep, setCurrentStep] = useState('customer');
  const [registrationId, setRegistrationId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    customer: {},
    items: {},
    documents: {}
  });

  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  const handleStepClick = (stepId: string) => {
    setCurrentStep(stepId);
  };

  const saveRegistrationData = async (stepData: any, step: string) => {
    if (!user) return;

    try {
      const updatedFormData = { ...formData, [step]: stepData };
      setFormData(updatedFormData);

      let registrationData: any = {
        builder_id: user.id,
        status: 'draft'
      };

      // Add customer data
      if (updatedFormData.customer) {
        const customerData = updatedFormData.customer as any;
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

  const handleCustomerNext = async () => {
    // Get form data from localStorage or state as needed
    const data = {}; // This would be passed from the form component
    await saveRegistrationData(data, 'customer');
    handleNextStep();
  };

  const handleItemsNext = async () => {
    const data = {}; // This would be passed from the form component  
    await saveRegistrationData(data, 'items');
    handleNextStep();
  };

  const handleDocumentsNext = async () => {
    const data = {}; // This would be passed from the form component
    await saveRegistrationData(data, 'documents');
    handleNextStep();
  };

  const handleNextStep = () => {
    const steps = ['customer', 'items', 'documents', 'review', 'send'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
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
        return <CustomerDetailsForm onNext={handleCustomerNext} />;
      case 'items':
        return <ItemsSelectionForm onNext={handleItemsNext} />;
      case 'documents':
        return <DocumentUploadForm onNext={handleDocumentsNext} />;
      case 'review':
        return <ReviewApprovalForm onNext={handleSendEntitlement} />;
      case 'send':
        return <SendConfirmationForm />;
      default:
        return <WorkflowSteps currentStep={currentStep} onStepClick={handleStepClick} />;
    }
  };

  if (!user) {
    return null;
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
              <div className="text-sm text-muted-foreground">
                Step {['customer', 'items', 'documents', 'review', 'send'].indexOf(currentStep) + 1} of 5
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