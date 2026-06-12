import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Project, PropertyType, ProjectStatus, CreateProjectData } from "@/hooks/useProjects";
import { BUILDING_CLASS_OPTIONS, DEFAULT_BUILDING_CLASS_BY_TYPE } from "@/lib/buildingClass";
import { useGetStatusesByModuleQuery } from "@/lib/api/services/status";
import { useGetTopographyTypesQuery, useGetBalRatingsQuery } from "@/store/api/projectOptions";
import { 
  Home,
  Building2,
  Building,
  LayoutGrid,
  Hammer,
  PlusCircle,
  Settings
} from "lucide-react";
import { cn } from "@/lib/utils";

interface EditProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
  onSave: (id: string, data: Partial<CreateProjectData>) => Promise<boolean>;
}

const propertyTypes: { value: PropertyType; label: string; icon: React.ElementType }[] = [
  { value: 'house', label: 'House', icon: Home },
  { value: 'townhouse', label: 'Townhouse', icon: Building2 },
  { value: 'apartment', label: 'Apartment', icon: Building },
  { value: 'duplex', label: 'Duplex', icon: LayoutGrid },
];

/** Property features that gate which compliance certificates apply. */
const PROPERTY_FEATURES: { key: "has_gas" | "has_ducted_hvac" | "has_pool" | "has_lift" | "is_strata"; label: string }[] = [
  { key: "has_gas", label: "Gas connection" },
  { key: "has_ducted_hvac", label: "Ducted air conditioning" },
  { key: "has_pool", label: "Swimming pool / spa" },
  { key: "has_lift", label: "Lift" },
  { key: "is_strata", label: "Strata scheme" },
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

// Map our internal ProjectStatus to the status `name` used by the PROJECT status API
const mapProjectStatusToApiName = (status: ProjectStatus): string => {
  switch (status) {
    case "planning":
      return "PLANNING";
    case "in_progress":
      return "IN PROGRESS";
    case "on_hold":
      return "ON HOLD";
    case "completed":
      return "COMPLETED";
    case "cancelled":
      return "CANCELLED";
  }
};

export const EditProjectDialog = ({ open, onOpenChange, project, onSave }: EditProjectDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: statusResponse } = useGetStatusesByModuleQuery({ module: "PROJECT" });
  const projectStatuses = useMemo(() => statusResponse?.data ?? [], [statusResponse?.data]);

  const { data: balRatingsResponse } = useGetBalRatingsQuery();
  const balRatings = balRatingsResponse?.data ?? [];

  const { data: topographyTypesResponse } = useGetTopographyTypesQuery();
  const topographyTypes = topographyTypesResponse?.data ?? [];
  const [formData, setFormData] = useState<Partial<CreateProjectData>>({
    name: project.name,
    address: project.address,
    city: project.city,
    state: project.state,
    postcode: project.postcode,
    property_type: project.property_type,
    building_class: project.building_class,
    start_date: project.start_date,
    target_end_date: project.target_end_date,
    status: project.status,
    description: project.description,
    bal_rating: project.bal_rating,
    topography_type: project.topography_type,
    has_gas: project.has_gas,
    has_pool: project.has_pool,
    has_lift: project.has_lift,
    is_strata: project.is_strata,
    has_ducted_hvac: project.has_ducted_hvac
  });

  useEffect(() => {
    if (open) {
      setFormData({
        name: project.name,
        address: project.address,
        city: project.city,
        state: project.state,
        postcode: project.postcode,
        property_type: project.property_type,
        building_class: project.building_class,
        start_date: project.start_date,
        target_end_date: project.target_end_date,
        status: project.status,
        statusId: null, // reset so the useEffect below re-matches from API
        description: project.description,
        bal_rating: project.bal_rating,
        topography_type: project.topography_type,
        has_gas: project.has_gas,
        has_pool: project.has_pool,
        has_lift: project.has_lift,
        is_strata: project.is_strata,
        has_ducted_hvac: project.has_ducted_hvac
      });
    }
  }, [open, project]);

  // When editing, pre-select the current status by mapping Project.status -> API status id
  useEffect(() => {
    if (!projectStatuses.length || formData.statusId) return;

    const targetName = mapProjectStatusToApiName(project.status);
    const match = projectStatuses.find(
      (s) => (s.name ?? "").toUpperCase() === targetName
    );

    if (match) {
      setFormData((prev) => ({ ...prev, statusId: match.id }));
    }
  }, [project, projectStatuses, formData.statusId]);

  const updateField = (field: keyof CreateProjectData, value: CreateProjectData[keyof CreateProjectData]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Changing the property type re-applies the NCC building-class default for that
  // type (the builder can still override). Custom keeps the existing choice.
  const handleSelectType = (type: PropertyType) => {
    setFormData(prev => ({
      ...prev,
      property_type: type,
      building_class: DEFAULT_BUILDING_CLASS_BY_TYPE[type] ?? prev.building_class ?? null,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const success = await onSave(project.id, formData);
    
    setIsSubmitting(false);
    if (success) {
      onOpenChange(false);
    }
  };

  const isValid = formData.name && formData.address && formData.city && formData.state && formData.postcode && formData.building_class;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Project</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Project Name */}
          <div>
            <Label htmlFor="edit-name">Project Name *</Label>
            <Input
              id="edit-name"
              value={formData.name || ''}
              onChange={e => updateField('name', e.target.value)}
              placeholder="e.g., Smith Family Home"
              className="mt-1.5"
            />
          </div>
          
          {/* Property Type */}
          <div>
            <Label>Property Type</Label>
            <div className="grid grid-cols-4 gap-2 mt-1.5">
              {propertyTypes.map(type => {
                const Icon = type.icon;
                const isSelected = formData.property_type === type.value;
                
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => handleSelectType(type.value)}
                    className={cn(
                      "p-2 rounded-lg border-2 text-center transition-all",
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <Icon className={cn("h-5 w-5 mx-auto mb-1", isSelected ? "text-primary" : "text-muted-foreground")} />
                    <div className="text-xs font-medium">{type.label}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Building class (NCC) — auto-selected from type, editable, mandatory */}
          <div>
            <Label htmlFor="edit-building_class">Building class (NCC) *</Label>
            <Select
              value={formData.building_class ?? ''}
              onValueChange={v => updateField('building_class', v || null)}
            >
              <SelectTrigger id="edit-building_class" className="mt-1.5">
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
                'Drives which compliance documents apply.'}
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

          {/* Address */}
          <div>
            <Label htmlFor="edit-address">Property Address *</Label>
            <Input
              id="edit-address"
              value={formData.address || ''}
              onChange={e => updateField('address', e.target.value)}
              placeholder="123 Main Street"
              className="mt-1.5"
            />
          </div>
          
          {/* City & State */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit-city">City *</Label>
              <Input
                id="edit-city"
                value={formData.city || ''}
                onChange={e => updateField('city', e.target.value)}
                placeholder="Sydney"
                className="mt-1.5"
              />
            </div>
            
            <div>
              <Label htmlFor="edit-state">State *</Label>
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
          
          {/* Postcode & Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit-postcode">Postcode *</Label>
              <Input
                id="edit-postcode"
                value={formData.postcode || ''}
                onChange={e => updateField('postcode', e.target.value)}
                placeholder="2000"
                className="mt-1.5"
                maxLength={4}
              />
            </div>
            
            <div>
              <Label htmlFor="edit-status">Status</Label>
              <Select
                value={formData.statusId ?? ''}
                onValueChange={v => updateField('statusId', v || null)}
                disabled={projectStatuses.length === 0}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder={projectStatuses.length === 0 ? "Loading statuses..." : "Select status"}>
                    {formData.statusId
                      ? (projectStatuses.find(s => s.id === formData.statusId)?.name ?? "Select status")
                      : "Select status"}
                  </SelectValue>
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
          </div>
          
          {/* Timeline */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit-start_date">Start Date</Label>
              <Input
                id="edit-start_date"
                type="date"
                value={formData.start_date || ''}
                onChange={e => updateField('start_date', e.target.value || null)}
                className="mt-1.5"
              />
            </div>
            
            <div>
              <Label htmlFor="edit-target_end_date">Target End Date</Label>
              <Input
                id="edit-target_end_date"
                type="date"
                value={formData.target_end_date || ''}
                onChange={e => updateField('target_end_date', e.target.value || null)}
                className="mt-1.5"
              />
            </div>
          </div>
          
          {/* BAL Rating & Topography */}
                 <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit-bal_rating">BAL Rating</Label>
              <Select
                value={formData.bal_rating || ''}
                onValueChange={v => updateField('bal_rating', v || null)}
                disabled={balRatings.length === 0}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder={balRatings.length === 0 ? "Loading..." : "Select BAL rating"}>
                    {formData.bal_rating
                      ? (balRatings.find(r => r.id === formData.bal_rating)?.balRatingText ?? "Select BAL rating")
                      : "Select BAL rating"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {balRatings.map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.balRatingText}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-topography_type">Topography Type</Label>
              <Select
                value={formData.topography_type || ''}
                onValueChange={v => updateField('topography_type', v || null)}
                disabled={topographyTypes.length === 0}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder={topographyTypes.length === 0 ? "Loading..." : "Select topography"}>
                    {formData.topography_type
                      ? (topographyTypes.find(t => t.id === formData.topography_type)?.topographyTypeText ?? "Select topography")
                      : "Select topography"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {topographyTypes.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.topographyTypeText}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="edit-description">Description / Notes</Label>
            <Textarea
              id="edit-description"
              value={formData.description || ''}
              onChange={e => updateField('description', e.target.value || null)}
              placeholder="Any additional notes about this project..."
              className="mt-1.5"
              rows={3}
            />
          </div>
          
          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!isValid || isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
