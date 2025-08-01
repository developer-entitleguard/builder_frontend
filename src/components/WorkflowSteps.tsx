import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  User, 
  Home, 
  Upload, 
  Eye, 
  Send, 
  CheckCircle,
  Clock,
  ArrowRight
} from "lucide-react";

interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  status: 'completed' | 'current' | 'pending';
  action?: string;
}

interface WorkflowStepsProps {
  currentStep: string;
  onStepClick: (stepId: string) => void;
}

const WorkflowSteps = ({ currentStep, onStepClick }: WorkflowStepsProps) => {
  const steps: WorkflowStep[] = [
    {
      id: 'customer',
      title: 'Customer Details',
      description: 'Enter homebuyer information and property details',
      icon: <User className="h-5 w-5" />,
      status: currentStep === 'customer' ? 'current' : 'completed',
      action: 'Enter Details'
    },
    {
      id: 'items',
      title: 'Select Items',
      description: 'Choose appliances, fittings, and structural components',
      icon: <Home className="h-5 w-5" />,
      status: currentStep === 'items' ? 'current' : currentStep === 'customer' ? 'pending' : 'completed',
      action: 'Select Items'
    },
    {
      id: 'documents',
      title: 'Upload Documents',
      description: 'Attach warranties, manuals, and certificates',
      icon: <Upload className="h-5 w-5" />,
      status: currentStep === 'documents' ? 'current' : ['customer', 'items'].includes(currentStep) ? 'pending' : 'completed',
      action: 'Upload Files'
    },
    {
      id: 'review',
      title: 'Review & Approve',
      description: 'Verify brands, warranties, and coverage details',
      icon: <Eye className="h-5 w-5" />,
      status: currentStep === 'review' ? 'current' : ['customer', 'items', 'documents'].includes(currentStep) ? 'pending' : 'completed',
      action: 'Review Details'
    },
    {
      id: 'send',
      title: 'Send to Homeowner',
      description: 'Deliver complete documentation package',
      icon: <Send className="h-5 w-5" />,
      status: currentStep === 'send' ? 'current' : 'pending',
      action: 'Send Package'
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'current':
        return <Clock className="h-4 w-4 text-primary" />;
      default:
        return <div className="h-4 w-4 rounded-full border-2 border-muted" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="outline" className="text-success border-success">Completed</Badge>;
      case 'current':
        return <Badge className="bg-primary">Current</Badge>;
      default:
        return <Badge variant="outline" className="text-muted-foreground">Pending</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-2">Warranty Documentation Workflow</h2>
        <p className="text-muted-foreground">Follow these steps to create a complete documentation package for your homebuyer</p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {steps.map((step, index) => (
          <Card 
            key={step.id} 
            className={`relative transition-all hover:shadow-medium cursor-pointer ${
              step.status === 'current' 
                ? 'ring-2 ring-primary shadow-medium' 
                : step.status === 'completed'
                ? 'bg-success/5 border-success/20'
                : ''
            }`}
            onClick={() => onStepClick(step.id)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${
                    step.status === 'current' 
                      ? 'bg-primary text-primary-foreground' 
                      : step.status === 'completed'
                      ? 'bg-success text-success-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {step.icon}
                  </div>
                  <div className="text-sm font-medium text-muted-foreground">
                    Step {index + 1}
                  </div>
                </div>
                {getStatusIcon(step.status)}
              </div>
              <CardTitle className="text-lg">{step.title}</CardTitle>
              <CardDescription className="text-sm">
                {step.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between">
                {getStatusBadge(step.status)}
                {step.status !== 'pending' && (
                  <Button 
                    variant={step.status === 'current' ? 'default' : 'outline'} 
                    size="sm"
                    className="ml-2"
                  >
                    {step.action}
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default WorkflowSteps;