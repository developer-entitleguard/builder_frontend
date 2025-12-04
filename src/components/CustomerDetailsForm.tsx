import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, MapPin, Phone, Mail, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCreateBuilderCustomerMutation } from "@/lib/api/services/builderCustomer";
import { useGetCustomerDetailsQuery } from "@/lib/api/services/customerDetails";
import { useToast } from "@/hooks/use-toast";
import { skipToken } from "@reduxjs/toolkit/query";
import { australianStates, validateAustralianPhone, formatAustralianPhone, validateAustralianPostcode, validateEmail } from "@/utils/validation";

interface CustomerFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  propertyAddress: string;
  city: string;
  state: string;
  zipCode: string;
  projectName: string;
  settlementDate: string;
  notes: string;
  customerId?: string;
  registrationId?: string;
}

interface CustomerDetailsFormProps {
  onNext: (data: CustomerFormData) => void;
  initialData?: Partial<CustomerFormData>;
  customerId?: string;
}

const CustomerDetailsForm = ({ onNext, initialData, customerId }: CustomerDetailsFormProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [createBuilderCustomer, { isLoading: isCreating }] = useCreateBuilderCustomerMutation();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: initialData?.firstName || '',
    lastName: initialData?.lastName || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    propertyAddress: initialData?.propertyAddress || '',
    city: initialData?.city || '',
    state: initialData?.state || '',
    zipCode: initialData?.zipCode || '',
    projectName: initialData?.projectName || '',
    settlementDate: initialData?.settlementDate || '',
    notes: initialData?.notes || ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch customer details when customerId is provided
  const { data: customerDetailsData, isLoading: isLoadingCustomer } = useGetCustomerDetailsQuery(
    user?.id && customerId
      ? { builderId: user.id as string, customerId }
      : skipToken
  );

  // Populate form fields when customer data is fetched
  useEffect(() => {
    if (customerDetailsData?.data?.customer) {
      const customer = customerDetailsData.data.customer;
      setFormData({
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
      });
    }
  }, [customerDetailsData]);

  const handleInputChange = (field: string, value: string) => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: "Please fix the errors",
        description: "Check the highlighted fields and try again",
        variant: "destructive"
      });
      return;
    }

    // If customerId exists, we're editing an existing customer
    // In this case, we might need to update instead of create
    // For now, we'll still create/update via the API
    // The API should handle updates if customerId is provided in the future
    
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
    
    setLoading(true);
    try {
      // Map form data to API payload format
      const customerData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        contact: formData.phone,
        address: formData.propertyAddress,
        city: formData.city,
        state: formData.state,
        zip: formData.zipCode,
        projectName: formData.projectName || undefined,
        settlementDate: formData.settlementDate || undefined,
        notes: formData.notes || undefined,
        builderOrganizationId: builderOrganizationId
      };
      
      // If customerId exists, we're editing - but the API might still create
      // This depends on your backend implementation
      const response = await createBuilderCustomer(customerData).unwrap();
      
      toast({
        title: customerId ? "Customer details updated" : "Customer details saved",
        description: "Moving to item selection"
      });
      
      // Pass the customer data and response to the next step
      // Use existing customerId if available, otherwise use the response ID
      onNext({ 
        ...formData, 
        customerId: customerId || response.data?.id,
        registrationId: customerId || response.data?.id // For backward compatibility
      });
    } catch (error) {
      console.error('Error saving customer details:', error);
      const errorMessage = error && typeof error === 'object' && 'data' in error 
        ? (error.data as { message?: string })?.message 
        : undefined;
      toast({
        title: "Error saving customer details",
        description: errorMessage || "Failed to save customer details. Please try again.",
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
            <div className="space-y-2">
              <Label htmlFor="propertyAddress">Property Address *</Label>
              <Input
                id="propertyAddress"
                value={formData.propertyAddress}
                onChange={(e) => handleInputChange('propertyAddress', e.target.value)}
                placeholder="123 Main Street"
                required
              />
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
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State *</Label>
                <Select value={formData.state} onValueChange={(value) => handleInputChange('state', value)}>
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
                />
                {errors.zipCode && <p className="text-sm text-destructive">{errors.zipCode}</p>}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="projectName">Project/Community Name</Label>
                <Input
                  id="projectName"
                  value={formData.projectName}
                  onChange={(e) => handleInputChange('projectName', e.target.value)}
                  placeholder="e.g., Sunset Ridge Community"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="settlementDate">Settlement Date</Label>
                <Input
                  id="settlementDate"
                  type="date"
                  value={formData.settlementDate}
                  onChange={(e) => handleInputChange('settlementDate', e.target.value)}
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
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" size="lg" className="min-w-[150px]" disabled={loading || isCreating || isLoadingCustomer}>
            {(loading || isCreating || isLoadingCustomer) ? 'Loading...' : 'Continue to Items'}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CustomerDetailsForm;