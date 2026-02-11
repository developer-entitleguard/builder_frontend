import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProjects, PropertyType, CreateProjectData } from "@/hooks/useProjects";
import { useAuth } from "@/hooks/useAuth";
import { useGetStatusesByModuleQuery } from "@/lib/api/services/status";
import { 
  ArrowLeft, 
  ArrowRight, 
  Check,
  Home,
  Building2,
  Building,
  LayoutGrid,
  Hammer,
  PlusCircle,
  Settings,
  MapPin,
  Calendar
} from "lucide-react";
import { cn } from "@/lib/utils";

const propertyTypes: { value: PropertyType; label: string; description: string; icon: React.ElementType }[] = [
  { value: 'house', label: 'House', description: 'Single family home', icon: Home },
  { value: 'townhouse', label: 'Townhouse', description: 'Multi-story attached home', icon: Building2 },
  { value: 'apartment', label: 'Apartment', description: 'Unit in multi-dwelling building', icon: Building },
  { value: 'duplex', label: 'Duplex', description: 'Two separate dwellings', icon: LayoutGrid },
  { value: 'renovation', label: 'Renovation', description: 'Existing property upgrade', icon: Hammer },
  { value: 'extension', label: 'Extension', description: 'Addition to existing property', icon: PlusCircle },
  { value: 'custom', label: 'Custom', description: 'Other project type', icon: Settings }
];

const australianStates = [
  { value: 'NSW', label: 'New South Wales' },
  { value: 'VIC', label: 'Victoria' },
  { value: 'QLD', label: 'Queensland' },
  { value: 'WA', label: 'Western Australia' },
  { value: 'SA', label: 'South Australia' },
  { value: 'TAS', label: 'Tasmania' },
  { value: 'ACT', label: 'Australian Capital Territory' },
  { value: 'NT', label: 'Northern Territory' }
];

const STEPS = ['basics', 'type', 'timeline'] as const;
type Step = typeof STEPS[number];

// Consider authenticated if Supabase user OR builder JWT in localStorage
const hasBuilderAuth = (): boolean => {
  try {
    const userData = localStorage.getItem("userData");
    if (!userData) return false;
    const parsed = JSON.parse(userData);
    return !!parsed?.jwt;
  } catch {
    return false;
  }
};

const ProjectCreate = () => {
  const { user, loading: authLoading } = useAuth();
  const { createProject } = useProjects();
  const navigate = useNavigate();
  
  const [currentStep, setCurrentStep] = useState<Step>('basics');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState<CreateProjectData>({
    name: '',
    address: '',
    city: '',
    state: '',
    postcode: '',
    property_type: 'house',
    start_date: null,
    target_end_date: null,
    statusId: null,
    description: null
  });

  const { data: statusResponse } = useGetStatusesByModuleQuery({ module: 'PROJECT' });
  const projectStatuses = statusResponse?.data ?? [];

  useEffect(() => {
    if (!authLoading && !user && !hasBuilderAuth()) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const currentStepIndex = STEPS.indexOf(currentStep);

  const updateField = (field: keyof CreateProjectData, value: CreateProjectData[keyof CreateProjectData]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 'basics':
        return formData.name && formData.address && formData.city && formData.state && formData.postcode;
      case 'type':
        return formData.property_type;
      case 'timeline':
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex]);
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex]);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const project = await createProject(formData);
    setIsSubmitting(false);
    
    if (project) {
      navigate(`/projects`);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {STEPS.map((step, index) => (
        <div key={step} className="flex items-center">
          <div
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
              index < currentStepIndex
                ? "bg-primary text-primary-foreground"
                : index === currentStepIndex
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            )}
          >
            {index < currentStepIndex ? <Check className="h-4 w-4" /> : index + 1}
          </div>
          {index < STEPS.length - 1 && (
            <div
              className={cn(
                "w-16 h-1 mx-2",
                index < currentStepIndex ? "bg-primary" : "bg-muted"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );

  const renderBasicsStep = () => (
    <div className="space-y-6">
      <div>
        <Label htmlFor="name">Project Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={e => updateField('name', e.target.value)}
          placeholder="e.g., Smith Family Home"
          className="mt-1.5"
        />
      </div>
      
      <div>
        <Label htmlFor="address">Property Address *</Label>
        <Input
          id="address"
          value={formData.address}
          onChange={e => updateField('address', e.target.value)}
          placeholder="123 Main Street"
          className="mt-1.5"
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="city">City *</Label>
          <Input
            id="city"
            value={formData.city}
            onChange={e => updateField('city', e.target.value)}
            placeholder="Sydney"
            className="mt-1.5"
          />
        </div>
        
        <div>
          <Label htmlFor="state">State *</Label>
          <Select value={formData.state} onValueChange={v => updateField('state', v)}>
            <SelectTrigger className="mt-1.5">
              <SelectValue placeholder="Select state" />
            </SelectTrigger>
            <SelectContent>
              {australianStates.map(state => (
                <SelectItem key={state.value} value={state.value}>
                  {state.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="w-1/2">
        <Label htmlFor="postcode">Postcode *</Label>
        <Input
          id="postcode"
          value={formData.postcode}
          onChange={e => updateField('postcode', e.target.value)}
          placeholder="2000"
          className="mt-1.5"
          maxLength={4}
        />
      </div>
    </div>
  );

  const renderTypeStep = () => (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {propertyTypes.map(type => {
        const Icon = type.icon;
        const isSelected = formData.property_type === type.value;
        
        return (
          <button
            key={type.value}
            type="button"
            onClick={() => updateField('property_type', type.value)}
            className={cn(
              "p-4 rounded-lg border-2 text-left transition-all",
              isSelected
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            )}
          >
            <Icon className={cn("h-8 w-8 mb-2", isSelected ? "text-primary" : "text-muted-foreground")} />
            <div className="font-medium">{type.label}</div>
            <div className="text-xs text-muted-foreground mt-1">{type.description}</div>
          </button>
        );
      })}
    </div>
  );

  const renderTimelineStep = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="start_date">Start Date</Label>
          <Input
            id="start_date"
            type="date"
            value={formData.start_date || ''}
            onChange={e => updateField('start_date', e.target.value || null)}
            className="mt-1.5"
          />
        </div>
        
        <div>
          <Label htmlFor="target_end_date">Target End Date</Label>
          <Input
            id="target_end_date"
            type="date"
            value={formData.target_end_date || ''}
            onChange={e => updateField('target_end_date', e.target.value || null)}
            className="mt-1.5"
          />
        </div>
      </div>
      
      <div>
        <Label htmlFor="status">Initial Status</Label>
        <Select
          value={formData.statusId ?? ''}
          onValueChange={v => updateField('statusId', v || null)}
          disabled={projectStatuses.length === 0}
        >
          <SelectTrigger className="mt-1.5">
            <SelectValue placeholder={projectStatuses.length === 0 ? "Loading statuses..." : "Select status"} />
          </SelectTrigger>
          <SelectContent>
            {projectStatuses.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div>
        <Label htmlFor="description">Description / Notes (optional)</Label>
        <Textarea
          id="description"
          value={formData.description || ''}
          onChange={e => updateField('description', e.target.value || null)}
          placeholder="Any additional notes about this project..."
          className="mt-1.5"
          rows={4}
        />
      </div>

      {/* Summary */}
      <Card className="bg-muted/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Project Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <strong>{formData.name}</strong>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4" />
            {formData.address}, {formData.city} {formData.state} {formData.postcode}
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Home className="h-4 w-4" />
            {propertyTypes.find(t => t.value === formData.property_type)?.label}
          </div>
          {formData.start_date && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              Starts: {formData.start_date}
              {formData.target_end_date && ` → Ends: ${formData.target_end_date}`}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const stepTitles = {
    basics: 'Project Basics',
    type: 'Property Type',
    timeline: 'Timeline & Confirm'
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Button variant="ghost" onClick={() => navigate('/projects')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Projects
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Create New Project</CardTitle>
          </CardHeader>
          <CardContent>
            {renderStepIndicator()}
            
            <h2 className="text-xl font-semibold mb-6">{stepTitles[currentStep]}</h2>
            
            {currentStep === 'basics' && renderBasicsStep()}
            {currentStep === 'type' && renderTypeStep()}
            {currentStep === 'timeline' && renderTimelineStep()}
            
            <div className="flex justify-between mt-8">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={currentStepIndex === 0}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              
              {currentStep === 'timeline' ? (
                <Button 
                  onClick={handleSubmit} 
                  disabled={!canProceed() || isSubmitting}
                >
                  {isSubmitting ? 'Creating...' : 'Create Project'}
                  <Check className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button onClick={handleNext} disabled={!canProceed()}>
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ProjectCreate;
