import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
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
  organization: any;
}

export function OrganizationDetails({ organization }: OrganizationDetailsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      name: organization?.name || "",
      address: organization?.address || "",
      contact_email: organization?.contact_email || "",
      contact_phone: organization?.contact_phone || "",
      abn: organization?.abn || "",
      description: organization?.description || "",
    },
  });

  const onSubmit = async (data: OrganizationFormData) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('builder_organizations')
        .update({
          name: data.name,
          address: data.address,
          contact_email: data.contact_email,
          contact_phone: data.contact_phone,
          abn: data.abn || null,
          description: data.description || null,
        })
        .eq('id', organization?.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Organization details updated successfully",
      });
      setIsEditing(false);
      
      // Refresh the page to show updated data
      window.location.reload();
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

  if (!isEditing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-lg font-semibold">{organization?.name}</h3>
          </div>
          <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <label className="font-medium text-muted-foreground">Address</label>
            <p className="mt-1">{organization?.address}</p>
          </div>
          <div>
            <label className="font-medium text-muted-foreground">Contact Email</label>
            <p className="mt-1">{organization?.contact_email}</p>
          </div>
          <div>
            <label className="font-medium text-muted-foreground">Contact Phone</label>
            <p className="mt-1">{organization?.contact_phone}</p>
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
          <Button type="submit" disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? "Saving..." : "Save Changes"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsEditing(false)}
            disabled={loading}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}