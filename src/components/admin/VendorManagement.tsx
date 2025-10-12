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
import { useGetBuilderVendorsQuery, useCreateOrUpdateBuilderVendorMutation, useDeleteBuilderVendorMutation } from "@/lib/api/services/builderVendor";
import type { Vendor as VendorType, CreateVendorRequest, UpdateVendorRequest } from "@/lib/api/types";

const vendorTypes = ['Tradesman', 'Plumber', 'Electrician', 'Landscaper', 'Sellers', 'Others'] as const;

const vendorSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  contact: z.string().min(8, "Phone number must be at least 8 characters"),
  type: z.enum(vendorTypes),
  description: z.string().optional()
});

type VendorFormData = z.infer<typeof vendorSchema>;

interface VendorManagementProps {
  organizationId?: string;
}

const VendorManagement = ({ organizationId: propOrganizationId }: VendorManagementProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<VendorType | null>(null);
  const { toast } = useToast();

  // Get organization ID from props or localStorage
  const getOrganizationId = (): string | undefined => {
    if (propOrganizationId) return propOrganizationId;
    
    try {
      const userData = localStorage.getItem('userData');
      if (userData) {
        const parsedData = JSON.parse(userData);
        return parsedData?.userInfo?.builderOrganization?.id;
      }
    } catch (error) {
      console.error('Error getting organization ID:', error);
    }
    return undefined;
  };

  const organizationId = getOrganizationId();

  // API Hooks
  const { data: vendorsData, isLoading, error } = useGetBuilderVendorsQuery(
    { builderId: organizationId || '' },
    { skip: !organizationId }
  );
  const [createOrUpdateVendor] = useCreateOrUpdateBuilderVendorMutation();
  const [deleteVendor] = useDeleteBuilderVendorMutation();

  const vendors = vendorsData?.data || [];

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<VendorFormData>({
    resolver: zodResolver(vendorSchema)
  });

  const watchedType = watch('type');

  // Show error toast if API fetch fails
  useEffect(() => {
    if (error) {
      toast({
        title: "Error fetching vendors",
        description: 'Failed to load vendors',
        variant: "destructive"
      });
    }
  }, [error, toast]);

  const onSubmit = async (data: VendorFormData) => {
    try {
      const vendorData = editingVendor 
        ? {
            id: editingVendor.id,
            name: data.name,
            email: data.email,
            contact: data.contact,
            type: data.type,
            description: data.description || '',
            builderOrganizationId: organizationId
          } as UpdateVendorRequest
        : {
            name: data.name,
            email: data.email,
            contact: data.contact,
            type: data.type,
            description: data.description || '',
            builderOrganizationId: organizationId
          } as CreateVendorRequest;

      const result = await createOrUpdateVendor(vendorData).unwrap();
      
      if (result.success) {
        toast({
          title: editingVendor ? "Vendor updated" : "Vendor added",
          description: result.message || (editingVendor ? "Vendor has been updated successfully" : "New vendor has been added successfully")
        });
        
        setDialogOpen(false);
        setEditingVendor(null);
        reset();
      }
    } catch (err) {
      const error = err as { data?: { message?: string }; message?: string };
      toast({
        title: "Error",
        description: error?.data?.message || error?.message || 'An unknown error occurred',
        variant: "destructive"
      });
    }
  };

  const handleEdit = (vendor: VendorType) => {
    setEditingVendor(vendor);
    setValue('name', vendor.name);
    setValue('email', vendor.email);
    setValue('contact', vendor.contact);
    setValue('type', vendor.type as typeof vendorTypes[number]);
    setValue('description', vendor.description || '');
    setDialogOpen(true);
  };

  const handleDelete = async (vendorId: string) => {
    try {
      const result = await deleteVendor(vendorId).unwrap();

      toast({
        title: "Vendor deleted",
        description: result.message || "Vendor has been removed successfully"
      });
    } catch (err) {
      const error = err as { data?: { message?: string }; message?: string };
      toast({
        title: "Error deleting vendor",
        description: error?.data?.message || error?.message || 'An unknown error occurred',
        variant: "destructive"
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

  if (!organizationId) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Organization not found</h3>
            <p className="text-muted-foreground">
              Unable to load vendor management. Please ensure you are logged in with a valid organization.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
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
                  <Label htmlFor="email">Contact Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    {...register('email')}
                    placeholder="vendor@example.com"
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact">Contact Phone *</Label>
                  <Input
                    id="contact"
                    {...register('contact')}
                    placeholder="Enter phone number"
                  />
                  {errors.contact && (
                    <p className="text-sm text-destructive">{errors.contact.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Type *</Label>
                  <Select value={watchedType} onValueChange={(value) => setValue('type', value as typeof vendorTypes[number])}>
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
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : editingVendor ? 'Update' : 'Add'} Vendor
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
                        <span>{vendor.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        <span>{vendor.contact}</span>
                      </div>
                      {vendor.description && (
                        <p className="mt-2 text-sm">{vendor.description}</p>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Added: {new Date(vendor.created_at).toLocaleDateString()}
                    </p>
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
                          <AlertDialogAction onClick={() => handleDelete(vendor.id)}>
                            Delete
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