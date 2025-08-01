import { useState } from "react";
import Header from "@/components/Header";
import WorkflowSteps from "@/components/WorkflowSteps";
import CustomerDetailsForm from "@/components/CustomerDetailsForm";
import ItemsSelectionForm from "@/components/ItemsSelectionForm";
import DocumentUploadForm from "@/components/DocumentUploadForm";
import ReviewApprovalForm from "@/components/ReviewApprovalForm";
import SendConfirmationForm from "@/components/SendConfirmationForm";
const Index = () => {
  const [currentStep, setCurrentStep] = useState('customer');
  const handleStepClick = (stepId: string) => {
    setCurrentStep(stepId);
  };
  const handleNextStep = () => {
    const steps = ['customer', 'items', 'documents', 'review', 'send'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  };
  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'customer':
        return <CustomerDetailsForm onNext={handleNextStep} />;
      case 'items':
        return <ItemsSelectionForm onNext={handleNextStep} />;
      case 'documents':
        return <DocumentUploadForm onNext={handleNextStep} />;
      case 'review':
        return <ReviewApprovalForm onNext={handleNextStep} />;
      case 'send':
        return <SendConfirmationForm />;
      default:
        return <WorkflowSteps currentStep={currentStep} onStepClick={handleStepClick} />;
    }
  };
  return <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentStep === 'overview' ? <WorkflowSteps currentStep={currentStep} onStepClick={handleStepClick} /> : <div className="space-y-6">
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
          </div>}
      </main>
    </div>;
};
export default Index;