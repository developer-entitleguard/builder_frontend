import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useGetBuilderOrganizationQuery, useUpdateBuilderOrganizationMutation } from "@/lib/api/services/builderOrganization";
import { validatePhone, validateABN } from "@/utils/validation";
import { Building, Save, Edit } from "lucide-react";

const organizationSchema = z.object({
  name: z.string().min(1, "Organization name is required"),
  address: z.string().min(1, "Address is required"),
  contact_email: z.string().email("Invalid email address"),
  contact_phone: z.string().refine((phone) => validatePhone(phone), {
    message: "Please enter a valid Australian phone number",
  }),
  abn: z.string().optional().refine((abn) => !abn || validateABN(abn), {
    message: "Please enter a valid ABN (11 digits)",
  }),
  description: z.string().optional(),
});

type OrganizationFormData = z.infer<typeof organizationSchema>;

interface OrganizationDetailsProps {
  organization?: {
    id?: string;
    name?: string;
    address?: string;
    contact?: string;
    email?: string;
    contact_email?: string;
    contact_phone?: string;
    abn?: string | null;
    description?: string;
  }; // Optional for backward compatibility
}

export function OrganizationDetails({ organization: propOrganization }: OrganizationDetailsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Get builderId from user (organization ID)
  const builderId = user && 'builderOrganization' in user && user.builderOrganization
    ? user.builderOrganization.id
    : user && 'id' in user 
    ? user.id 
    : null;

  // Fetch organization data from API
  const { 
    data: apiResponse, 
    isLoading: isApiLoading, 
    error: apiError 
  } = useGetBuilderOrganizationQuery(
    builderId || '',
    { skip: !builderId }
  );

  // Update organization mutation
  const [updateOrganization, { isLoading: isUpdating }] = useUpdateBuilderOrganizationMutation();

  // Use API data if available, otherwise fall back to prop
  const organization = apiResponse?.data || propOrganization;

  // Helper to get email (handles both API format and prop format)
  const getEmail = () => {
    if (!organization) return "";
    if ('email' in organization) return organization.email || "";
    if ('contact_email' in organization) return organization.contact_email || "";
    return "";
  };

  // Helper to get phone (handles both API format and prop format)
  const getPhone = () => {
    if (!organization) return "";
    if ('contact' in organization) return organization.contact || "";
    if ('contact_phone' in organization) return organization.contact_phone || "";
    return "";
  };

  const form = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      name: organization?.name || "",
      address: organization?.address || "",
      contact_email: getEmail(),
      contact_phone: getPhone(),
      abn: organization?.abn || "",
      description: organization?.description || "",
    },
  });

  // Update form when API data loads
  useEffect(() => {
    if (organization) {
      const email = 'email' in organization ? organization.email : ('contact_email' in organization ? organization.contact_email : "");
      const phone = 'contact' in organization ? organization.contact : ('contact_phone' in organization ? organization.contact_phone : "");
      
      form.reset({
        name: organization.name || "",
        address: organization.address || "",
        contact_email: email || "",
        contact_phone: phone || "",
        abn: organization.abn || "",
        description: organization.description || "",
      });
    }
  }, [apiResponse, form, organization]);

  const onSubmit = async (data: OrganizationFormData) => {
    if (!organization?.id) {
      toast({
        title: "Error",
        description: "Organization ID is missing",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await updateOrganization({
        id: organization.id,
        name: data.name,
        address: data.address,
        contact: data.contact_phone,
        email: data.contact_email,
        abn: data.abn || null,
        description: data.description || null,
      }).unwrap();

      toast({
        title: "Success",
        description: "Organization details updated successfully",
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating organization:", error);
      toast({
        title: "Error",
        description: "Failed to update organization details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Show loading state
  if (isApiLoading && !propOrganization) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  // Show error state
  if (apiError && !propOrganization) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8">
          <p className="text-destructive">Failed to load organization details</p>
        </div>
      </div>
    );
  }

  if (!isEditing) {
    // Map API response fields to display fields
    const displayEmail = organization 
      ? ('email' in organization ? organization.email : ('contact_email' in organization ? organization.contact_email : ""))
      : "";
    const displayPhone = organization
      ? ('contact' in organization ? organization.contact : ('contact_phone' in organization ? organization.contact_phone : ""))
      : "";

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-lg font-semibold">{organization?.name || "Organization"}</h3>
          </div>
          <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <label className="font-medium text-muted-foreground">Address</label>
            <p className="mt-1">{organization?.address || "Not provided"}</p>
          </div>
          <div>
            <label className="font-medium text-muted-foreground">Contact Email</label>
            <p className="mt-1">{displayEmail || "Not provided"}</p>
          </div>
          <div>
            <label className="font-medium text-muted-foreground">Contact Phone</label>
            <p className="mt-1">{displayPhone || "Not provided"}</p>
          </div>
          <div>
            <label className="font-medium text-muted-foreground">ABN</label>
            <p className="mt-1">{organization?.abn || "Not provided"}</p>
          </div>
          {organization?.description && (
            <div className="col-span-full">
              <label className="font-medium text-muted-foreground">Description</label>
              <p className="mt-1">{organization.description}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Organization Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Textarea {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="contact_email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact Email</FormLabel>
                <FormControl>
                  <Input type="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="contact_phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact Phone</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="04XX XXX XXX" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="abn"
          render={({ field }) => (
            <FormItem>
              <FormLabel>ABN (Optional)</FormLabel>
              <FormControl>
                <Input {...field} placeholder="12 345 678 901" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                <Textarea {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-2">
          <Button type="submit" disabled={loading || isUpdating}>
            <Save className="h-4 w-4 mr-2" />
            {loading || isUpdating ? "Saving..." : "Save Changes"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsEditing(false)}
            disabled={loading || isUpdating}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}