import { useState, useEffect, useImperativeHandle, forwardRef, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, MapPin, Phone, Mail, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { australianStates, validateAustralianPhone, formatAustralianPhone, validateAustralianPostcode, validateEmail } from "@/utils/validation";
import { useProjectsQuery } from "@/store/api/projects";
import { useCreateBuilderCustomerMutation } from "@/store/api";
import { useOrganization } from "@/hooks/useOrganization";

export interface CustomerDetailsFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  unitNumber: string;
  propertyAddress: string;
  city: string;
  state: string;
  zipCode: string;
  projectId: string;
  projectName: string;
  settlementDate: string;
  notes: string;
  price: string;
  numBedrooms: string;
  numRooms: string;
  totalBuiltUpArea: string;
}

export interface CustomerDetailsFormProps {
  onNext: (data: CustomerDetailsFormData & { registrationId?: string }) => void;
  initialData?: Partial<CustomerDetailsFormData> & { id?: string; registrationId?: string };
  registrationId?: string | null;
  /** When true, form is read-only (view mode only). */
  readOnly?: boolean;
  /** Called after customer is saved via Save & Exit (API success). Use to e.g. toast and navigate away. */
  onSavedAndExit?: (registrationId: string) => void;
}

export interface CustomerDetailsFormRef {
  /** Validate, call /api/builder/customer, then call onSavedAndExit on success. */
  saveAndExit: () => Promise<void>;
}

const CustomerDetailsForm = forwardRef<CustomerDetailsFormRef, CustomerDetailsFormProps>(
  ({ onNext, initialData, registrationId, readOnly, onSavedAndExit }, ref) => {
  const { toast } = useToast();
  const { organization } = useOrganization();
  const { data: projectsResponse, isLoading: projectsLoading } = useProjectsQuery();
  const projects = useMemo(() => projectsResponse?.data ?? [], [projectsResponse?.data]);
  const initialProject = (initialData as unknown as { project?: { id?: string; name?: string } } | undefined)?.project;
  const getNonEmpty = (v: unknown): string | undefined => {
    if (typeof v !== "string") return undefined;
    const t = v.trim();
    return t.length ? t : undefined;
  };
  const [createBuilderCustomer] = useCreateBuilderCustomerMutation();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: initialData?.firstName || '',
    lastName: initialData?.lastName || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    unitNumber: initialData?.unitNumber || '',
    propertyAddress: initialData?.propertyAddress || '',
    city: initialData?.city || '',
    state: initialData?.state || '',
    zipCode: initialData?.zipCode || '',
    projectId: getNonEmpty(initialData?.projectId) || getNonEmpty(initialProject?.id) || '',
    projectName: getNonEmpty(initialData?.projectName) || getNonEmpty(initialProject?.name) || '',
    settlementDate: initialData?.settlementDate || '',
    notes: initialData?.notes || '',
    price: initialData?.price || '',
    numBedrooms: initialData?.numBedrooms || '',
    numRooms: initialData?.numRooms || '',
    totalBuiltUpArea: initialData?.totalBuiltUpArea || ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Sync form when parent passes updated initialData (e.g. after fetching customer details from API)
  useEffect(() => {
    if (!initialData || typeof initialData !== 'object') return;
    const project = (initialData as unknown as { project?: { id?: string; name?: string } }).project;
    const nextProjectId = getNonEmpty((initialData as { projectId?: unknown }).projectId) ?? getNonEmpty(project?.id);
    const nextProjectName = getNonEmpty((initialData as { projectName?: unknown }).projectName) ?? getNonEmpty(project?.name);
    setFormData(prev => ({
      ...prev,
      firstName: initialData.firstName ?? prev.firstName,
      lastName: initialData.lastName ?? prev.lastName,
      email: initialData.email ?? prev.email,
      phone: initialData.phone ?? prev.phone,
      unitNumber: initialData.unitNumber ?? prev.unitNumber,
      propertyAddress: initialData.propertyAddress ?? prev.propertyAddress,
      city: initialData.city ?? prev.city,
      state: initialData.state ?? prev.state,
      zipCode: initialData.zipCode ?? prev.zipCode,
      projectId: nextProjectId ?? prev.projectId,
      projectName: nextProjectName ?? prev.projectName,
      settlementDate: initialData.settlementDate ?? prev.settlementDate,
      notes: initialData.notes ?? prev.notes,
      price: initialData.price ?? prev.price,
      numBedrooms: initialData.numBedrooms ?? prev.numBedrooms,
      numRooms: initialData.numRooms ?? prev.numRooms,
      totalBuiltUpArea: initialData.totalBuiltUpArea ?? prev.totalBuiltUpArea
    }));
  }, [initialData]);

  useEffect(() => {
    if (!projects.length) return;

    // Prefer matching by id when we already have a projectId
    if (formData.projectId) {
      const selectedById = projects.find(
        (p) => String(p.id) === String(formData.projectId)
      );
      if (selectedById) {
        setFormData((prev) => ({
          ...prev,
          projectId: String(selectedById.id),
          projectName: selectedById.name,
        }));
        return;
      }
    }

    // Fallback: when we only have a projectName from /api/customerdetails,
    // try to resolve the id by matching the name from /api/builder/projects.
    const initialProjectName =
      (initialData as { projectName?: string } | undefined)?.projectName;
    if (initialProjectName && !formData.projectId) {
      const matchByName = projects.find(
        (p) => p.name === initialProjectName
      );
      if (matchByName) {
        setFormData((prev) => ({
          ...prev,
          projectId: String(matchByName.id),
          projectName: matchByName.name,
        }));
      }
    }
  }, [projects, formData.projectId, initialData]);

  const handleInputChange = (field: string, value: string) => {
    if (readOnly) return;
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    
    // Format phone number as user types
    if (field === 'phone') {
      const formatted = formatAustralianPhone(value);
      setFormData(prev => ({ ...prev, [field]: formatted }));
    }
    
    // When a project is selected, update only project fields,
    // and auto-fill address fields **only if** they are still empty
    // so user-entered address/city/state/postcode are never overwritten.
    if (field === 'projectId' && value) {
      const selectedProject = projects.find(p => p.id === value);
      if (selectedProject) {
        setFormData(prev => {
          const shouldAutofillAddress =
            !prev.propertyAddress && !prev.city && !prev.state && !prev.zipCode;

          return {
            ...prev,
            projectId: value,
            projectName: selectedProject.name,
            ...(shouldAutofillAddress && {
              propertyAddress: selectedProject.address ?? prev.propertyAddress,
              city: selectedProject.city ?? prev.city,
              state: selectedProject.state ?? prev.state,
              zipCode: selectedProject.postcode ?? prev.zipCode,
            }),
          };
        });

        if (!errors.projectId) return;
        setErrors(prev => ({
          ...prev,
          projectId: '',
        }));
      }
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    
    if (!validateEmail(formData.email)) newErrors.email = 'Please enter a valid email address';
    
    if (!validateAustralianPhone(formData.phone)) {
      newErrors.phone = 'Please enter a valid Australian phone number';
    }
    
    if (!formData.propertyAddress.trim()) newErrors.propertyAddress = 'Property address is required';
    if (!formData.city.trim()) newErrors.city = 'City is required';
    if (!formData.state) newErrors.state = 'State is required';
    
    if (!validateAustralianPostcode(formData.zipCode, formData.state)) {
      newErrors.zipCode = `Please enter a valid postcode for ${formData.state}`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getBuilderOrganizationId = () =>
    organization?.id ?? (() => {
      try {
        const userData = localStorage.getItem('userData');
        if (userData) {
          const parsed = JSON.parse(userData);
          const org = parsed?.userInfo?.builderOrganization ?? parsed?.builderOrganization ?? parsed?.builder_organization;
          return org?.id ?? null;
        }
      } catch {
        // ignore
      }
      return null;
    })();

  /** Calls /api/builder/customer. Returns customer id on success, undefined on failure. */
  const saveCustomerToApi = async (): Promise<string | undefined> => {
    const builderOrganizationId = getBuilderOrganizationId();
    if (!builderOrganizationId) {
      toast({
        title: "Organization required",
        description: "No builder organization found. Please sign in again.",
        variant: "destructive"
      });
      return undefined;
    }

    const selectedProject = projects.find(p => p.id === formData.projectId);
    const numBedrooms = formData.numBedrooms ? Number(formData.numBedrooms) : undefined;
    const numRooms = formData.numRooms ? Number(formData.numRooms) : undefined;
    const price = formData.price ? Number(formData.price) : undefined;
    const totalBuiltUpArea = formData.totalBuiltUpArea ? Number(formData.totalBuiltUpArea) : undefined;

    const result = await createBuilderCustomer({
      id: registrationId || initialData?.id || initialData?.registrationId || undefined,
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      email: formData.email.trim(),
      contact: formData.phone.trim(),
      unitNumber: formData.unitNumber.trim() || undefined,
      address: formData.propertyAddress.trim(),
      city: formData.city.trim(),
      state: formData.state,
      zip: formData.zipCode.trim(),
      country: 'Australia',
      projectId: formData.projectId || undefined,
      projectName: selectedProject?.name || formData.projectName || undefined,
      settlementDate: formData.settlementDate || undefined,
      notes: formData.notes?.trim() || undefined,
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

    const customerId = result?.data?.id || registrationId;
    return customerId ? String(customerId) : undefined;
  };

  useImperativeHandle(ref, () => ({
    saveAndExit: async () => {
      if (!validateForm()) {
        toast({
          title: "Please fix the errors",
          description: "Check the highlighted fields and try again",
          variant: "destructive"
        });
        return;
      }
      setLoading(true);
      try {
        const customerId = await saveCustomerToApi();
        if (customerId) {
          toast({
            title: "Customer details saved",
            description: "You can continue this registration later from your dashboard."
          });
          onSavedAndExit?.(customerId);
        }
      } catch (error: unknown) {
        const err = error as { data?: unknown; message?: string };
        toast({
          title: "Error saving customer details",
          description: err?.data != null ? String(err.data) : err?.message ?? 'Failed to create customer',
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- ref must use latest formData/saveCustomerToApi
  }), [formData, organization, projects, registrationId, initialData, onSavedAndExit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (readOnly) {
      // In read-only mode, just move to next step with existing data.
      onNext({ ...formData, registrationId: registrationId ?? initialData?.registrationId });
      return;
    }

    if (!validateForm()) {
      toast({
        title: "Please fix the errors",
        description: "Check the highlighted fields and try again",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const customerId = await saveCustomerToApi();
      if (!customerId) return;

      toast({
        title: "Customer details saved",
        description: "Moving to item selection"
      });
      onNext({ ...formData, registrationId: customerId });
    } catch (error: unknown) {
      const err = error as { data?: unknown; message?: string };
      toast({
        title: "Error saving customer details",
        description: err?.data != null ? String(err.data) : err?.message ?? 'Failed to create customer',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-2">Customer Details</h2>
        <p className="text-muted-foreground">Enter the homebuyer's information and property details</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Personal Information
            </CardTitle>
            <CardDescription>
              Homebuyer's contact and identification details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                  <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  placeholder="Enter first name"
                  required
                  disabled={readOnly}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  placeholder="Enter last name"
                  required
                  disabled={readOnly}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="homebuyer@email.com"
                    className="pl-10"
                    required
                    disabled={readOnly}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="04XX XXX XXX or 0X XXXX XXXX"
                    className={`pl-10 ${errors.phone ? 'border-destructive' : ''}`}
                    required
                    disabled={readOnly}
                  />
                </div>
                {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Property Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Property Information
            </CardTitle>
            <CardDescription>
              Address and project details for the new home
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="unitNumber">Unit / Lot No.</Label>
                <Input
                  id="unitNumber"
                  value={formData.unitNumber}
                  onChange={(e) => handleInputChange('unitNumber', e.target.value)}
                  placeholder="e.g., 12"
                  disabled={readOnly}
                />
              </div>
              <div className="space-y-2 md:col-span-3">
                <Label htmlFor="propertyAddress">Property Address *</Label>
                <Input
                  id="propertyAddress"
                  value={formData.propertyAddress}
                  onChange={(e) => handleInputChange('propertyAddress', e.target.value)}
                  placeholder="123 Main Street"
                  required
                  disabled={readOnly}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  placeholder="City name"
                  required
                  disabled={readOnly}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State *</Label>
                <Select value={formData.state} onValueChange={(value) => handleInputChange('state', value)} disabled={readOnly}>
                  <SelectTrigger className={errors.state ? 'border-destructive' : ''}>
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {australianStates.map((state) => (
                      <SelectItem key={state.code} value={state.code}>
                        {state.name} ({state.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.state && <p className="text-sm text-destructive">{errors.state}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="zipCode">Postcode *</Label>
                <Input
                  id="zipCode"
                  value={formData.zipCode}
                  onChange={(e) => handleInputChange('zipCode', e.target.value)}
                  placeholder="4000"
                  maxLength={4}
                  className={errors.zipCode ? 'border-destructive' : ''}
                  required
                  disabled={readOnly}
                />
                {errors.zipCode && <p className="text-sm text-destructive">{errors.zipCode}</p>}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="projectId">Link to Project</Label>
                <Select 
                  // Radix Select does not allow empty-string item values; use undefined for "no selection"
                  value={formData.projectId || undefined} 
                  onValueChange={(value) => handleInputChange('projectId', value)}
                  disabled={readOnly}
                >
                  <SelectTrigger className={errors.projectId ? 'border-destructive' : ''}>
                    <SelectValue placeholder={projectsLoading ? "Loading projects..." : "Select a project"} />
                  </SelectTrigger>
                  <SelectContent>
                    {formData.projectId && !projects.some((p) => p.id === formData.projectId) && (
                      <SelectItem key={formData.projectId} value={formData.projectId}>
                        {formData.projectName || "Selected project"}
                      </SelectItem>
                    )}
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.projectId && <p className="text-sm text-destructive">{errors.projectId}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Property Price (Optional)</Label>
                <Input
                  id="price"
                  type="number"
                  value={formData.price}
                  onChange={(e) => handleInputChange('price', e.target.value)}
                  placeholder="e.g., 750000"
                  min="0"
                  step="1000"
                  disabled={readOnly}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="settlementDate">Settlement Date</Label>
                <Input
                  id="settlementDate"
                  type="date"
                  value={formData.settlementDate}
                  onChange={(e) => handleInputChange('settlementDate', e.target.value)}
                  disabled={readOnly}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="numBedrooms">Number of Bedrooms</Label>
                <Input
                  id="numBedrooms"
                  type="number"
                  value={formData.numBedrooms}
                  onChange={(e) => handleInputChange('numBedrooms', e.target.value)}
                  placeholder="e.g., 4"
                  min="0"
                  disabled={readOnly}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="numRooms">Number of Rooms</Label>
                <Input
                  id="numRooms"
                  type="number"
                  value={formData.numRooms}
                  onChange={(e) => handleInputChange('numRooms', e.target.value)}
                  placeholder="e.g., 8"
                  min="0"
                  disabled={readOnly}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="totalBuiltUpArea">Total Built Up Area (sqm)</Label>
                <Input
                  id="totalBuiltUpArea"
                  type="number"
                  value={formData.totalBuiltUpArea}
                  onChange={(e) => handleInputChange('totalBuiltUpArea', e.target.value)}
                  placeholder="e.g., 250"
                  min="0"
                  step="0.01"
                  disabled={readOnly}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Any additional information or special requirements..."
                className="min-h-[80px]"
                disabled={readOnly}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" size="lg" className="min-w-[150px]" disabled={loading}>
            {readOnly ? 'Next' : loading ? 'Saving...' : 'Continue to Items'}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </form>
    </div>
  );
});

CustomerDetailsForm.displayName = 'CustomerDetailsForm';

export default CustomerDetailsForm;