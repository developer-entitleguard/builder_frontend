import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Users, Mail, Phone, Building2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import {
  useGetBuilderVendorsQuery,
  useCreateOrUpdateBuilderVendorMutation,
  useDeleteBuilderVendorMutation,
} from "@/lib/api/services/builderVendor";

const vendorTypes = ['Tradesman', 'Plumber', 'Electrician', 'Landscaper', 'Sellers', 'Others'] as const;

const vendorSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  contact_email: z.string().email("Please enter a valid email"),
  contact_phone: z.string().min(8, "Phone number must be at least 8 characters"),
  type: z.enum(vendorTypes),
  description: z.string().optional()
});

type VendorFormData = z.infer<typeof vendorSchema>;

interface Vendor {
  id: string;
  name: string;
  contact_email: string;
  contact_phone: string;
  type: string;
  description: string | null;
  created_at: string;
}

interface VendorManagementProps {
  organizationId?: string;
}

const VendorManagement = ({ organizationId }: VendorManagementProps) => {
  const { user } = useAuth();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const { toast } = useToast();

  const builderId =
    (user && "builderOrganization" in user && user.builderOrganization
      ? user.builderOrganization.id
      : user && "id" in user
      ? user.id
      : organizationId) || null;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<VendorFormData>({
    resolver: zodResolver(vendorSchema),
    defaultValues: {
      name: "",
      contact_email: "",
      contact_phone: "",
      type: vendorTypes[0],
      description: "",
    },
  });

  const watchedType = watch('type');

  const {
    data: vendorResponse,
    isLoading: isVendorsLoading,
    error: vendorsError,
    refetch: refetchVendors,
  } = useGetBuilderVendorsQuery(
    { builderId: builderId || "" },
    { skip: !builderId }
  );

  const [createOrUpdateVendor, { isLoading: isSavingVendor }] =
    useCreateOrUpdateBuilderVendorMutation();
  const [deleteVendor, { isLoading: isDeletingVendor }] =
    useDeleteBuilderVendorMutation();

  useEffect(() => {
    if (vendorResponse?.data) {
      const mapped = vendorResponse.data.map((apiVendor) => ({
        id: apiVendor.id,
        name: apiVendor.name,
        contact_email: apiVendor.email,
        contact_phone: apiVendor.contact,
        type: apiVendor.type,
        description: apiVendor.description,
        created_at: apiVendor.created_at,
      }));
      setVendors(mapped);
    }
  }, [vendorResponse]);

  useEffect(() => {
    if (vendorsError) {
      toast({
        title: "Error fetching vendors",
        description: "Failed to load vendors. Please try again.",
        variant: "destructive",
      });
    }
  }, [vendorsError, toast]);

  const onSubmit = async (data: VendorFormData) => {
    if (!builderId) {
      toast({
        title: "Error",
        description: "Organization ID is missing",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingVendor) {
        await createOrUpdateVendor({
          id: editingVendor.id,
          name: data.name,
          email: data.contact_email,
          contact: data.contact_phone,
          type: data.type,
          description: data.description || undefined,
          builderOrganizationId: builderId,
        }).unwrap();

        toast({
          title: "Vendor updated",
          description: "Vendor has been updated successfully"
        });
      } else {
        await createOrUpdateVendor({
          name: data.name,
          email: data.contact_email,
          contact: data.contact_phone,
          type: data.type,
          description: data.description || undefined,
          builderOrganizationId: builderId,
        }).unwrap();

        toast({
          title: "Vendor added",
          description: "New vendor has been added successfully"
        });
      }

      await refetchVendors();
      setDialogOpen(false);
      setEditingVendor(null);
      reset();
    } catch (error) {
      const errorMessage =
        error && typeof error === "object" && "data" in error
          ? (error as { data?: { message?: string } }).data?.message
          : undefined;
      toast({
        title: "Error",
        description: errorMessage || "Failed to save vendor",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setValue('name', vendor.name);
    setValue('contact_email', vendor.contact_email);
    setValue('contact_phone', vendor.contact_phone);
    setValue('type', vendor.type as VendorFormData["type"]);
    setValue('description', vendor.description || '');
    setDialogOpen(true);
  };

  const handleDelete = async (vendorId: string) => {
    try {
      await deleteVendor(vendorId).unwrap();

      toast({
        title: "Vendor deleted",
        description: "Vendor has been removed successfully"
      });

      await refetchVendors();
    } catch (error) {
      const errorMessage =
        error && typeof error === "object" && "data" in error
          ? (error as { data?: { message?: string } }).data?.message
          : undefined;
      toast({
        title: "Error deleting vendor",
        description: errorMessage || "Failed to delete vendor",
        variant: "destructive",
      });
    }
  };

  const getTypeIcon = (type: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      'Tradesman': <Building2 className="h-4 w-4" />,
      'Plumber': <Building2 className="h-4 w-4" />,
      'Electrician': <Building2 className="h-4 w-4" />,
      'Landscaper': <Building2 className="h-4 w-4" />,
      'Sellers': <Users className="h-4 w-4" />,
      'Others': <Building2 className="h-4 w-4" />
    };
    return iconMap[type] || <Building2 className="h-4 w-4" />;
  };

  if (isVendorsLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading vendors...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Vendor Management
            </CardTitle>
            <CardDescription>
              Manage your organization's vendors and suppliers
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingVendor(null); reset(); }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Vendor
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>
                  {editingVendor ? 'Edit Vendor' : 'Add New Vendor'}
                </DialogTitle>
                <DialogDescription>
                  {editingVendor ? 'Update vendor information.' : 'Add a new vendor to your organization.'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    {...register('name')}
                    placeholder="Enter vendor name"
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive">{errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact_email">Contact Email *</Label>
                  <Input
                    id="contact_email"
                    type="email"
                    {...register('contact_email')}
                    placeholder="vendor@example.com"
                  />
                  {errors.contact_email && (
                    <p className="text-sm text-destructive">{errors.contact_email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact_phone">Contact Phone *</Label>
                  <Input
                    id="contact_phone"
                    {...register('contact_phone')}
                    placeholder="Enter phone number"
                  />
                  {errors.contact_phone && (
                    <p className="text-sm text-destructive">{errors.contact_phone.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Type *</Label>
                  <Select
                    value={watchedType}
                    onValueChange={(value) =>
                      setValue("type", value as VendorFormData["type"])
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select vendor type" />
                    </SelectTrigger>
                    <SelectContent>
                      {vendorTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.type && (
                    <p className="text-sm text-destructive">{errors.type.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    {...register('description')}
                    placeholder="Enter vendor description (optional)"
                    className="min-h-[80px]"
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setDialogOpen(false);
                      setEditingVendor(null);
                      reset();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting || isSavingVendor}
                  >
                    {isSubmitting || isSavingVendor
                      ? 'Saving...'
                      : editingVendor
                        ? 'Update'
                        : 'Add'} Vendor
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {vendors.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No vendors yet</h3>
            <p className="text-muted-foreground mb-4">
              Start by adding your first vendor to the organization
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {vendors.map((vendor) => (
              <div key={vendor.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(vendor.type)}
                        <h4 className="font-semibold text-foreground">{vendor.name}</h4>
                      </div>
                      <Badge variant="secondary">{vendor.type}</Badge>
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        <span>{vendor.contact_email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        <span>{vendor.contact_phone}</span>
                      </div>
                      {vendor.description && (
                        <p className="mt-2 text-sm">{vendor.description}</p>
                      )}
                    </div>
                    {/* <p className="text-xs text-muted-foreground mt-2">
                      Added: {new Date(vendor.created_at).toLocaleDateString()}
                    </p> */}
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(vendor)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Vendor</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{vendor.name}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(vendor.id)}
                            disabled={isDeletingVendor}
                          >
                            {isDeletingVendor ? 'Deleting...' : 'Delete'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VendorManagement;