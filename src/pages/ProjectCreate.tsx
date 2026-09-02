import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProjects, PropertyType, CreateProjectData } from "@/hooks/useProjects";
import { BUILDING_CLASS_OPTIONS, DEFAULT_BUILDING_CLASS_BY_TYPE } from "@/lib/buildingClass";
import { useAuth } from "@/hooks/useAuth";
import { useEntitlements } from "@/hooks/useEntitlements";
import { useToast } from "@/hooks/use-toast";
import { useGetStatusesByModuleQuery } from "@/lib/api/services/status";
import { useGetTopographyTypesQuery, useGetBalRatingsQuery } from "@/store/api/projectOptions";
import { useGenerateActivitiesMutation } from "@/store/api/activities";
import { useGenerateProjectComplianceDocumentsMutation } from "@/store/api/complianceDocuments";
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
  Calendar,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";

// Per-type guidance shown under the describe box — tells the builder what detail
// to include so the AI can generate accurate activities, compliance docs and the
// right number of unit registrations.
const describeGuidance: Record<PropertyType, string> = {
  house:
    "e.g. Single storey, 4 bedrooms, double garage, swimming pool, ~220m² built-up area, slab on ground.",
  duplex:
    "Describe both dwellings — e.g. two 3-bedroom single-storey dwellings, each with a single carport, ~180m² each.",
  townhouse:
    "e.g. 6 townhouses — 4× 3-bedroom and 2× 2-bedroom, double storey, shared driveway, ~1,100m² total built-up area, amenities.",
  apartment:
    "e.g. 24 apartments across 2 blocks — 10× 1-bed, 10× 2-bed, 4× 3-bed, 5 storeys, basement carpark, gym, ~2,400m² total built-up area.",
  renovation:
    "Describe the scope — storeys, bedrooms affected, special items (pool, sauna, garages), built-up area, finishes and site constraints.",
  extension:
    "Describe the addition — storeys, new rooms/bedrooms, special items (pool, sauna, carports/garages), built-up area, finishes.",
  custom:
    "Describe the project — storeys, bedrooms, special items (pool, sauna, carports/garages), built-up area, finishes and site constraints.",
};

// Property types that produce more than one dwelling/registration.
const MULTI_DWELLING: PropertyType[] = ["townhouse", "apartment", "duplex"];

/** Property features that gate which compliance certificates apply. */
const PROPERTY_FEATURES: { key: "has_gas" | "has_ducted_hvac" | "has_pool" | "has_lift" | "is_strata"; label: string }[] = [
  { key: "has_gas", label: "Gas connection" },
  { key: "has_ducted_hvac", label: "Ducted air conditioning" },
  { key: "has_pool", label: "Swimming pool / spa" },
  { key: "has_lift", label: "Lift" },
  { key: "is_strata", label: "Strata scheme" },
];

const propertyTypes: { value: PropertyType; label: string; description: string; icon: React.ElementType }[] = [
  { value: 'house', label: 'House', description: 'Single family home', icon: Home },
  { value: 'townhouse', label: 'Townhouse', description: 'Multi-story attached home', icon: Building2 },
  { value: 'apartment', label: 'Apartment', description: 'Unit in multi-dwelling building', icon: Building },
  { value: 'duplex', label: 'Duplex', description: 'Two separate dwellings', icon: LayoutGrid },
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

// Commercial Segment PRD 1 (R3). 'segment' is prepended only for dual-access
// builders (see `steps` inside the component); a single-access builder never
// sees it and the type defaults silently.
type Step = 'segment' | 'basics' | 'type' | 'timeline';
const BASE_STEPS: Step[] = ['basics', 'type', 'timeline'];

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
  const { hasModule, segments, ready: entitlementsReady } = useEntitlements();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [generateActivities] = useGenerateActivitiesMutation();
  const [generateCompliance] = useGenerateProjectComplianceDocumentsMutation();

  // Commercial Segment PRD 1 (R3). The project-type selector is shown only to a
  // dual-access builder; a single-access builder never sees it and the type
  // defaults silently (RESIDENTIAL, or COMMERCIAL for a commercial-only org).
  const showSegmentStep = segments.residential && segments.commercial;

  const [currentStep, setCurrentStep] = useState<Step>('basics');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const [formData, setFormData] = useState<CreateProjectData>({
    name: '',
    address: '',
    city: '',
    state: '',
    postcode: '',
    property_type: 'house',
    // Commercial Segment PRD 1 (R3). Default residential; only a dual-access
    // builder changes it via the segment step.
    project_type: 'RESIDENTIAL',
    building_class: DEFAULT_BUILDING_CLASS_BY_TYPE['house'],
    start_date: null,
    target_end_date: null,
    statusId: null,
    description: null,
    bal_rating: null,
    topography_type: null,
    auto_generate: true,
    dwelling_count: null
  });

  // Commercial Segment PRD 1 (R3/R4). Commercial and mixed-use projects skip the
  // residential property-type step (NCC class is captured per building part in the
  // commercial workspace); the segment step is prepended only for dual-access.
  const isCommercial = formData.project_type === 'COMMERCIAL' || formData.project_type === 'MIXED_USE';
  const steps = useMemo<Step[]>(() => {
    const base: Step[] = isCommercial ? ['basics', 'timeline'] : BASE_STEPS;
    return showSegmentStep ? (['segment', ...base] as Step[]) : base;
  }, [showSegmentStep, isCommercial]);

  // Once entitlements resolve, land on the real first step (segment for dual-access).
  const initStepRef = useRef(false);
  useEffect(() => {
    if (entitlementsReady && !initStepRef.current) {
      initStepRef.current = true;
      setCurrentStep(steps[0]);
    }
  }, [entitlementsReady, steps]);

  const { data: statusResponse } = useGetStatusesByModuleQuery({ module: 'PROJECT' });
  const projectStatuses = statusResponse?.data ?? [];

  const { data: balRatingsResponse } = useGetBalRatingsQuery();
  const balRatings = balRatingsResponse?.data ?? [];

  const { data: topographyTypesResponse } = useGetTopographyTypesQuery();
  const topographyTypes = topographyTypesResponse?.data ?? [];

  useEffect(() => {
    if (!authLoading && !user && !hasBuilderAuth()) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const currentStepIndex = steps.indexOf(currentStep);

  const updateField = (field: keyof CreateProjectData, value: CreateProjectData[keyof CreateProjectData]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Selecting a type also seeds the dwelling count: duplex is always 2, other
  // multi-dwelling types default to 1 (builder edits it), single dwellings none.
  const handleSelectType = (type: PropertyType) => {
    setFormData(prev => ({
      ...prev,
      property_type: type,
      // Auto-select the NCC building class for the type (builder can override).
      // Keep an existing manual choice for "custom", which has no default.
      building_class: DEFAULT_BUILDING_CLASS_BY_TYPE[type] ?? prev.building_class ?? null,
      dwelling_count:
        type === 'duplex' ? 2 : MULTI_DWELLING.includes(type) ? (prev.dwelling_count ?? 1) : null,
    }));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 'segment':
        return !!formData.project_type;
      case 'basics':
        return formData.name && formData.address && formData.city && formData.state && formData.postcode;
      case 'type': {
        if (!formData.property_type) return false;
        // Building class is mandatory (auto-selected, but custom needs a choice).
        if (!formData.building_class) return false;
        // Townhouse/apartment need an explicit unit count (duplex is fixed at 2).
        const needsCount =
          formData.property_type === 'townhouse' || formData.property_type === 'apartment';
        if (needsCount && !(formData.dwelling_count && formData.dwelling_count >= 1)) return false;
        return true;
      }
      case 'timeline':
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex]);
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex]);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    // Commercial/mixed-use: the NCC class lives per building part, so send a
    // commercial property_type and no residential building_class; the commercial
    // workspace captures the rest.
    // "commercial" is outside the residential PropertyType union on purpose: the
    // backend accepts it for COMMERCIAL / MIXED_USE projects.
    const payload: CreateProjectData = isCommercial
      ? ({
          ...formData,
          property_type: 'commercial',
          building_class: null,
          dwelling_count: null,
          auto_generate: false,
        } as unknown as CreateProjectData)
      : formData;
    const projectId = await createProject(payload);

    if (!projectId) {
      setIsSubmitting(false);
      return;
    }

    // Commercial projects go straight to the commercial workspace; the residential
    // auto-generation below does not apply to them.
    if (isCommercial) {
      setIsSubmitting(false);
      navigate(`/projects/${projectId}/commercial`);
      return;
    }

    // Auto-generate activities + compliance using the SAME foreground endpoints
    // the manual "Generate" buttons use, passing the project description as the
    // prompt. This is reliable (unlike a background job) and lets the builder's
    // description drive generation. Best-effort: a failure never blocks the flow.
    const prompt = formData.description?.trim();
    if (formData.auto_generate && prompt) {
      setIsGenerating(true);
      // Only generate activities when the org actually has the Activities module;
      // compliance always generates. (Backend enforces the same gate.)
      const tasks: Promise<unknown>[] = [generateCompliance({ projectId, prompt }).unwrap()];
      if (hasModule("ACTIVITIES")) {
        tasks.push(generateActivities({ projectId, prompt }).unwrap());
      }
      const results = await Promise.allSettled(tasks);
      setIsGenerating(false);
      if (results.some((r) => r.status === "rejected")) {
        toast({
          title: "Project created",
          description:
            "Some auto-generation didn't complete — you can use the Generate buttons on the project's Activities and Compliance tabs.",
        });
      }
    }

    setIsSubmitting(false);
    navigate(`/projects/${projectId}`);
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {steps.map((step, index) => (
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
          {index < steps.length - 1 && (
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

  const renderTypeStep = () => {
    const selectedType = formData.property_type;
    const isMultiDwelling = MULTI_DWELLING.includes(selectedType);
    const isDuplex = selectedType === 'duplex';

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {propertyTypes.map(type => {
            const Icon = type.icon;
            const isSelected = formData.property_type === type.value;

            return (
              <button
                key={type.value}
                type="button"
                onClick={() => handleSelectType(type.value)}
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

        {/* NCC building class — auto-selected from the type, editable, mandatory */}
        <div className="w-full md:w-1/2">
          <Label htmlFor="building_class">Building class (NCC) *</Label>
          <Select
            value={formData.building_class ?? ''}
            onValueChange={v => updateField('building_class', v || null)}
          >
            <SelectTrigger id="building_class" className="mt-1.5">
              <SelectValue placeholder="Select building class" />
            </SelectTrigger>
            <SelectContent>
              {BUILDING_CLASS_OPTIONS.map(opt => (
                <SelectItem key={opt.code} value={opt.code}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">
            {BUILDING_CLASS_OPTIONS.find(o => o.code === formData.building_class)?.description ??
              'Auto-selected from the property type — adjust if needed. Drives which compliance documents apply.'}
          </p>
        </div>

        {/* Property features (gate which compliance certificates apply) */}
        <div>
          <Label>Property features</Label>
          <p className="text-xs text-muted-foreground mb-2">
            Tick what applies so the matching certificates are included.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {PROPERTY_FEATURES.map(f => (
              <label key={f.key} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={!!formData[f.key]}
                  onCheckedChange={v => updateField(f.key, v === true)}
                />
                {f.label}
              </label>
            ))}
          </div>
        </div>

        {/* Number of units for multi-dwelling developments */}
        {isMultiDwelling && (
          isDuplex ? (
            <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
              A duplex creates <strong className="text-foreground">2</strong> unit registrations automatically.
            </div>
          ) : (
            <div className="w-1/2">
              <Label htmlFor="dwelling_count">Number of units *</Label>
              <Input
                id="dwelling_count"
                type="number"
                min={1}
                value={formData.dwelling_count ?? ''}
                onChange={e =>
                  updateField('dwelling_count', e.target.value ? parseInt(e.target.value, 10) : null)
                }
                placeholder="e.g. 6"
                className="mt-1.5"
              />
              <p className="text-xs text-muted-foreground mt-1">
                One registration is created per unit (numbered 1–N).
              </p>
            </div>
          )
        )}

        {/* Describe-your-project box, feeding the auto-generation */}
        <div>
          <Label htmlFor="describe">Describe your project</Label>
          <Textarea
            id="describe"
            value={formData.description || ''}
            onChange={e => updateField('description', e.target.value || null)}
            placeholder={describeGuidance[selectedType]}
            className="mt-1.5"
            rows={5}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Used to auto-generate your activities and compliance documents. The more detail, the better.
          </p>
        </div>
      </div>
    );
  };

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
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="bal_rating">BAL Rating</Label>
          <Select
            value={formData.bal_rating || ''}
            onValueChange={v => updateField('bal_rating', v || null)}
            disabled={balRatings.length === 0}
          >
            <SelectTrigger className="mt-1.5">
              <SelectValue placeholder={balRatings.length === 0 ? "Loading..." : "Select BAL rating"} />
            </SelectTrigger>
            <SelectContent>
              {balRatings.map(r => (
                <SelectItem key={r.id} value={r.id}>{r.balRatingText}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="topography_type">Topography Type</Label>
          <Select
            value={formData.topography_type || ''}
            onValueChange={v => updateField('topography_type', v || null)}
            disabled={topographyTypes.length === 0}
          >
            <SelectTrigger className="mt-1.5">
              <SelectValue placeholder={topographyTypes.length === 0 ? "Loading..." : "Select topography"} />
            </SelectTrigger>
            <SelectContent>
              {topographyTypes.map(t => (
                <SelectItem key={t.id} value={t.id}>{t.topographyTypeText}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Auto-generate switch (single control for all three) */}
      <div className="flex items-start gap-3 rounded-lg border p-4">
        <Sparkles className="h-5 w-5 text-primary mt-0.5 shrink-0" />
        <div className="flex-1">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="auto-generate" className="text-sm font-medium cursor-pointer">
              Auto-generate activities, compliance documents &amp; registrations
            </Label>
            <Switch
              id="auto-generate"
              checked={formData.auto_generate ?? true}
              onCheckedChange={v => updateField('auto_generate', v)}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Uses your project description to draft activities and the NSW compliance checklist.
            {MULTI_DWELLING.includes(formData.property_type) &&
              ' Unit registrations are created automatically for each dwelling.'}
          </p>
        </div>
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

  const renderSegmentStep = () => {
    const options: { value: string; label: string; description: string; icon: React.ElementType }[] = [
      { value: 'RESIDENTIAL', label: 'Residential', description: 'Homes: houses, townhouses, apartments, duplexes', icon: Home },
      { value: 'COMMERCIAL', label: 'Commercial', description: 'NCC Class 3–9: shops, offices, warehouses, care', icon: Building2 },
      { value: 'MIXED_USE', label: 'Mixed use', description: 'One building with both residential and commercial parts', icon: LayoutGrid },
    ];
    const selected = formData.project_type ?? 'RESIDENTIAL';
    return (
      <div className="space-y-4">
        <div className="grid gap-3">
          {options.map((opt) => {
            const Icon = opt.icon;
            const isSelected = selected === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => updateField('project_type', opt.value)}
                className={cn(
                  'flex items-start gap-3 rounded-lg border p-4 text-left transition-colors',
                  isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
                )}
              >
                <Icon className={cn('h-5 w-5 mt-0.5', isSelected ? 'text-primary' : 'text-muted-foreground')} />
                <div>
                  <div className="font-medium">{opt.label}</div>
                  <div className="text-sm text-muted-foreground">{opt.description}</div>
                </div>
              </button>
            );
          })}
        </div>
        {selected !== 'RESIDENTIAL' && (
          <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
            After the basics, you'll set up NCC classes per building part, contract and
            factor details, registrations and the document checklist in the commercial
            workspace.
          </div>
        )}
      </div>
    );
  };

  const stepTitles = {
    segment: 'Project Type',
    basics: 'Project Basics',
    type: 'Property Type',
    timeline: 'Timeline & Confirm'
  };

  const stepHints = {
    segment: 'Choose the building segment. This is fixed once the project is created.',
    basics: 'Name the build and its address — e.g. "42 Rose St, Bathurst". This is what homeowners and your team will see.',
    type: 'Pick the property type and NCC class so activities and compliance are scoped correctly.',
    timeline: 'Set the key dates. Warranty periods are calculated from the settlement date you enter here.'
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
            
            <h2 className="text-xl font-semibold mb-1">{stepTitles[currentStep]}</h2>
            <p className="text-sm text-muted-foreground mb-6">{stepHints[currentStep]}</p>
            
            {currentStep === 'segment' && renderSegmentStep()}
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
                  {isGenerating
                    ? 'Generating activities & compliance…'
                    : isSubmitting
                      ? 'Creating...'
                      : 'Create Project'}
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
