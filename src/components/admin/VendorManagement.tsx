import { useEffect, useMemo, useState } from "react";
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
import { Plus, Edit, Trash2, Users, Mail, Phone, Building2, Briefcase, Upload, Send } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useGetBuilderVendorsQuery,
  useCreateOrUpdateBuilderVendorMutation,
  useDeleteBuilderVendorMutation,
} from "@/store/api";
import DirectoryImportDialog from "@/components/admin/DirectoryImportDialog";
import {
  useUploadVendorsCsvMutation,
  useRollbackVendorImportMutation,
  useSendVendorInviteMutation,
  type DirectoryImportResult,
} from "@/store/api/directoryImport";
import { useVendorTemplateDownload } from "@/lib/api/services/templateDownload";

// Per PRD §9.2: 'Sellers' removed post-V7 migration. Goods sellers now live in
// the Supplier Management tab. The backend still accepts 'Sellers' as a free-text
// value for any historical row not yet migrated, but the UI no longer offers it.
const vendorTypes = ['Tradesman', 'Plumber', 'Electrician', 'Landscaper', 'Others'] as const;
const vendorClassifications = ['INTERNAL', 'EXTERNAL'] as const;

const vendorSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  contact_email: z.string().email("Please enter a valid email"),
  contact_phone: z.string().min(8, "Phone number must be at least 8 characters"),
  type: z.enum(vendorTypes),
  vendorType: z.enum(vendorClassifications),
  specializations: z.string().optional(),
  description: z.string().optional()
});

type VendorFormData = z.infer<typeof vendorSchema>;

interface Vendor {
  id: string;
  name: string;
  contact_email: string;
  contact_phone: string;
  type: string;
  vendorType: 'INTERNAL' | 'EXTERNAL' | null;
  specializations: string;
  hasLogin: boolean;
  description: string | null;
  created_at: string;
}

interface VendorManagementProps {
  organizationId?: string;
}

const VendorManagement = ({ organizationId }: VendorManagementProps) => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const [uploadVendorsCsv, { isLoading: importing }] = useUploadVendorsCsvMutation();
  const [rollbackImport, { isLoading: rollingBack }] = useRollbackVendorImportMutation();
  const [sendInvite, { isLoading: sendingInvite }] = useSendVendorInviteMutation();
  const { download: downloadTemplate, isLoading: downloadingTemplate } =
    useVendorTemplateDownload();
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const { toast } = useToast();

  const builderId = organizationId;
  const {
    data: vendorsResponse,
    isLoading: loading,
    refetch: refetchVendors,
  } = useGetBuilderVendorsQuery(
    { builderId: builderId || "" },
    { skip: !builderId }
  );
  const [createOrUpdateVendor] = useCreateOrUpdateBuilderVendorMutation();
  const [deleteVendor] = useDeleteBuilderVendorMutation();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<VendorFormData>({
    resolver: zodResolver(vendorSchema),
    defaultValues: {
      vendorType: 'EXTERNAL',
      specializations: '',
    }
  });

  const watchedType = watch('type');
  const watchedVendorType = watch('vendorType');

  useEffect(() => {
    const list = vendorsResponse?.data ?? [];
    const mapped: Vendor[] = list.map((v) => ({
      id: v.id,
      name: v.name,
      contact_email: v.email,
      contact_phone: v.contact,
      type: v.type,
      vendorType: (v.vendorType as Vendor["vendorType"]) ?? null,
      specializations: v.specializations ?? "",
      hasLogin: !!v.userInfo?.id,
      description: v.description ?? null,
      created_at: v.created_at ?? new Date().toISOString(),
    }));
    setVendors(mapped);
  }, [vendorsResponse?.data]);

  const onSubmit = async (data: VendorFormData) => {
    try {
      if (!builderId) throw new Error("Missing organization id.");

      const payload = {
        name: data.name,
        email: data.contact_email,
        contact: data.contact_phone,
        type: data.type,
        vendorType: data.vendorType,
        specializations: data.specializations || null,
        // Backend auto-creates / links the user_info row for INTERNAL vendors
        // using `email`. No FK needed from the UI.
        userInfoId: null,
        description: data.description || null,
        builderOrganizationId: builderId,
      };

      if (editingVendor) {
        await createOrUpdateVendor({ id: editingVendor.id, ...payload }).unwrap();
        toast({ title: "Vendor updated", description: "Vendor has been updated successfully" });
      } else {
        await createOrUpdateVendor(payload).unwrap();
        toast({ title: "Vendor added", description: "New vendor has been added successfully" });
      }

      refetchVendors();
      setDialogOpen(false);
      setEditingVendor(null);
      reset();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save vendor",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setValue('name', vendor.name);
    setValue('contact_email', vendor.contact_email);
    setValue('contact_phone', vendor.contact_phone);
    setValue('type', vendor.type as any);
    setValue('vendorType', (vendor.vendorType ?? 'EXTERNAL') as any);
    setValue('specializations', vendor.specializations);
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

      refetchVendors();
    } catch (error: unknown) {
      toast({
        title: "Error deleting vendor",
        description: error instanceof Error ? error.message : "Failed to delete vendor",
        variant: "destructive"
      });
    }
  };

  /**
   * Preview or commit a vendor CSV. Returns the result so the dialog can show
   * the counts; a failure toasts and returns null so the dialog stays put.
   */
  const handleImportUpload = async (
    file: File,
    dryRun: boolean
  ): Promise<DirectoryImportResult | null> => {
    try {
      const response = await uploadVendorsCsv({ file, dryRun }).unwrap();
      if (!response.success) {
        toast({
          title: "Import failed",
          description: response.message,
          variant: "destructive",
        });
        return null;
      }
      return response.data;
    } catch (error: unknown) {
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : "Couldn't import the file",
        variant: "destructive",
      });
      return null;
    }
  };

  const handleImportRollback = async (batchId: string): Promise<boolean> => {
    try {
      const response = await rollbackImport({ batchId }).unwrap();
      toast({
        title: response.success ? "Import undone" : "Couldn't undo the import",
        description: response.message,
        variant: response.success ? undefined : "destructive",
      });
      if (response.success) refetchVendors();
      return !!response.success;
    } catch (error: unknown) {
      toast({
        title: "Couldn't undo the import",
        description: error instanceof Error ? error.message : "Rollback failed",
        variant: "destructive",
      });
      return false;
    }
  };

  /**
   * Send an internal vendor their set-password email. Imported internal vendors
   * get a login but no mail, so this is the step that gives them access.
   */
  const handleSendInvite = async (vendorId: string) => {
    try {
      const response = await sendInvite({ vendorId }).unwrap();
      toast({
        title: response.success ? "Invite sent" : "Couldn't send the invite",
        description: response.message,
        variant: response.success ? undefined : "destructive",
      });
    } catch (error: unknown) {
      toast({
        title: "Couldn't send the invite",
        description: error instanceof Error ? error.message : "Invite failed",
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
      // 'Sellers' kept in the icon map for legacy rows that still carry that
      // value (pre-V7 migration leftovers), even though it's no longer offered.
      'Sellers': <Users className="h-4 w-4" />,
      'Others': <Building2 className="h-4 w-4" />
    };
    return iconMap[type] || <Building2 className="h-4 w-4" />;
  };

  if (loading) {
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
          <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Import CSV
          </Button>
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
                  <Label htmlFor="type">Trade *</Label>
                  <Select value={watchedType} onValueChange={(value) => setValue('type', value as any)}>
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
                  <Label>Classification *</Label>
                  <Select
                    value={watchedVendorType}
                    onValueChange={(value) => setValue('vendorType', value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Internal or external?" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INTERNAL">Internal (in-house)</SelectItem>
                      <SelectItem value="EXTERNAL">External (third party)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Internal vendors get calendar self-service; external vendors only see assigned queries.
                  </p>
                </div>

                {watchedVendorType === 'INTERNAL' && (
                  <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
                    A login will be auto-provisioned for this internal vendor using
                    the contact email above. They'll receive a set-password email
                    and can sign in to manage their schedule on <strong>My Schedule</strong>.
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="specializations">Specializations</Label>
                  <Input
                    id="specializations"
                    {...register('specializations')}
                    placeholder="Comma-separated, e.g. Plumbing, HVAC"
                  />
                  <p className="text-xs text-muted-foreground">
                    Used by Customer Support to filter when assigning queries.
                  </p>
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
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(vendor.type)}
                        <h4 className="font-semibold text-foreground">{vendor.name}</h4>
                      </div>
                      <Badge variant="secondary">{vendor.type}</Badge>
                      {vendor.vendorType && (
                        <Badge variant={vendor.vendorType === 'INTERNAL' ? 'default' : 'outline'}>
                          {vendor.vendorType === 'INTERNAL' ? 'Internal' : 'External'}
                        </Badge>
                      )}
                      {vendor.vendorType === 'INTERNAL' && (
                        <Badge variant={vendor.hasLogin ? 'secondary' : 'destructive'} className="text-[10px]">
                          {vendor.hasLogin ? 'Login active' : 'Login pending'}
                        </Badge>
                      )}
                      {vendor.specializations && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Briefcase className="h-3 w-3" />
                          {vendor.specializations}
                        </span>
                      )}
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
                    <p className="text-xs text-muted-foreground mt-2">
                      Added: {new Date(vendor.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    {vendor.vendorType === 'INTERNAL' && vendor.contact_email && (
                      <Button
                        variant="outline"
                        size="sm"
                        title="Send set-password invite"
                        disabled={sendingInvite}
                        onClick={() => handleSendInvite(vendor.id)}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    )}
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

      <DirectoryImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        kind="vendor"
        onDownloadTemplate={downloadTemplate}
        downloadingTemplate={downloadingTemplate}
        onUpload={handleImportUpload}
        uploading={importing}
        onRollback={handleImportRollback}
        rollingBack={rollingBack}
        onCompleted={refetchVendors}
      />
    </Card>
  );
};

export default VendorManagement;