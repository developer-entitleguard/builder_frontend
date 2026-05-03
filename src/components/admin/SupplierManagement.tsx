import { useEffect, useState } from "react";
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
import { Plus, Edit, Trash2, Truck, Mail, Phone, Building2, FileDigit, Wallet } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useGetBuilderSuppliersQuery,
  useCreateOrUpdateBuilderSupplierMutation,
  useDeleteBuilderSupplierMutation,
  type SupplierResponseItem,
} from "@/store/api";
import { validateABN } from "@/utils/validation";

// Per PRD §6.4 enum.
const supplierTypes = [
  { value: 'WHOLESALER', label: 'Wholesaler' },
  { value: 'DISTRIBUTOR', label: 'Distributor' },
  { value: 'MANUFACTURER', label: 'Manufacturer' },
  { value: 'IMPORTER', label: 'Importer' },
  { value: 'OTHER', label: 'Other' },
] as const;

const paymentTermsOptions = [
  { value: 'NET_7', label: 'Net 7' },
  { value: 'NET_14', label: 'Net 14' },
  { value: 'NET_30', label: 'Net 30' },
  { value: 'NET_60', label: 'Net 60' },
] as const;

const supplierSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  contactName: z.string().optional(),
  email: z.string().email("Please enter a valid email").or(z.literal('')).optional(),
  phone: z.string().optional(),
  abn: z.string()
    .optional()
    .refine((v) => !v || validateABN(v), { message: "ABN must be 11 digits (or empty)" }),
  supplierType: z.enum(['WHOLESALER', 'DISTRIBUTOR', 'MANUFACTURER', 'IMPORTER', 'OTHER']),
  paymentTerms: z.enum(['NET_7', 'NET_14', 'NET_30', 'NET_60']).optional().or(z.literal('')),
  notes: z.string().optional(),
});

type SupplierFormData = z.infer<typeof supplierSchema>;

const SupplierManagement = () => {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SupplierResponseItem | null>(null);

  const { data: page, isLoading: loading, refetch } = useGetBuilderSuppliersQuery({ page: 0, size: 100 });
  const [upsert] = useCreateOrUpdateBuilderSupplierMutation();
  const [del] = useDeleteBuilderSupplierMutation();

  const suppliers = page?.content ?? [];

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
    defaultValues: { supplierType: 'OTHER' },
  });

  const watchedType = watch('supplierType');
  const watchedTerms = watch('paymentTerms');

  useEffect(() => {
    if (editing) {
      setValue('name', editing.name);
      setValue('contactName', editing.contactName ?? '');
      setValue('email', editing.email ?? '');
      setValue('phone', editing.phone ?? '');
      setValue('abn', editing.abn ?? '');
      setValue('supplierType', (editing.supplierType as SupplierFormData['supplierType']) ?? 'OTHER');
      setValue('paymentTerms', (editing.paymentTerms as SupplierFormData['paymentTerms']) ?? '' as never);
      setValue('notes', editing.notes ?? '');
    } else {
      reset({ supplierType: 'OTHER' });
    }
  }, [editing, reset, setValue]);

  const onSubmit = async (data: SupplierFormData) => {
    try {
      const payload = {
        ...(editing ? { id: editing.id } : {}),
        name: data.name,
        contactName: data.contactName || null,
        email: data.email || null,
        phone: data.phone || null,
        abn: data.abn || null,
        supplierType: data.supplierType,
        paymentTerms: data.paymentTerms || null,
        notes: data.notes || null,
      };
      await upsert(payload).unwrap();
      toast({
        title: editing ? "Supplier updated" : "Supplier added",
        description: editing
          ? "Supplier has been updated successfully"
          : "New supplier has been added successfully",
      });
      refetch();
      setDialogOpen(false);
      setEditing(null);
      reset({ supplierType: 'OTHER' });
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save supplier",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await del(id).unwrap();
      toast({ title: "Supplier deleted", description: "Supplier has been removed successfully" });
      refetch();
    } catch (error: unknown) {
      toast({
        title: "Error deleting supplier",
        description: error instanceof Error ? error.message : "Failed to delete supplier",
        variant: "destructive",
      });
    }
  };

  const labelFor = (value: string | null | undefined, options: ReadonlyArray<{ value: string; label: string }>) =>
    value ? (options.find((o) => o.value === value)?.label ?? value) : null;

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading suppliers...</p>
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
              <Truck className="h-5 w-5" />
              Supplier Management
            </CardTitle>
            <CardDescription>
              Manage goods sellers (wholesalers, distributors, manufacturers, importers).
            </CardDescription>
          </div>
          <Dialog
            open={dialogOpen}
            onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) {
                setEditing(null);
                reset({ supplierType: 'OTHER' });
              }
            }}
          >
            <DialogTrigger asChild>
              <Button onClick={() => { setEditing(null); reset({ supplierType: 'OTHER' }); }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Supplier
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{editing ? 'Edit Supplier' : 'Add New Supplier'}</DialogTitle>
                <DialogDescription>
                  {editing ? 'Update supplier information.' : 'Add a new supplier to your organization.'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input id="name" {...register('name')} placeholder="Enter supplier name" />
                  {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactName">Contact Person</Label>
                  <Input id="contactName" {...register('contactName')} placeholder="e.g. Jane Smith" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" {...register('email')} placeholder="supplier@example.com" />
                    {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" {...register('phone')} placeholder="04XX XXX XXX" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="abn">ABN</Label>
                  <Input id="abn" {...register('abn')} placeholder="11 digits (optional)" maxLength={14} />
                  {errors.abn && <p className="text-sm text-destructive">{errors.abn.message}</p>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Type *</Label>
                    <Select
                      value={watchedType}
                      onValueChange={(v) => setValue('supplierType', v as SupplierFormData['supplierType'])}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {supplierTypes.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Payment Terms</Label>
                    <Select
                      value={watchedTerms ?? ''}
                      onValueChange={(v) => setValue('paymentTerms', v as SupplierFormData['paymentTerms'])}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Optional" />
                      </SelectTrigger>
                      <SelectContent>
                        {paymentTermsOptions.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea id="notes" {...register('notes')} placeholder="Optional notes" className="min-h-[80px]" />
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setDialogOpen(false);
                      setEditing(null);
                      reset({ supplierType: 'OTHER' });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : editing ? 'Update' : 'Add'} Supplier
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {suppliers.length === 0 ? (
          <div className="text-center py-8">
            <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No suppliers yet</h3>
            <p className="text-muted-foreground mb-4">
              Start by adding your first supplier to the organization.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {suppliers.map((s) => (
              <div key={s.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        <h4 className="font-semibold text-foreground">{s.name}</h4>
                      </div>
                      <Badge variant="secondary">{labelFor(s.supplierType, supplierTypes) ?? s.supplierType}</Badge>
                      {s.paymentTerms && (
                        <Badge variant="outline" className="inline-flex items-center gap-1">
                          <Wallet className="h-3 w-3" />
                          {labelFor(s.paymentTerms, paymentTermsOptions)}
                        </Badge>
                      )}
                      {s.abn && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <FileDigit className="h-3 w-3" />
                          ABN {s.abn}
                        </span>
                      )}
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      {s.contactName && (
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          <span>{s.contactName}</span>
                        </div>
                      )}
                      {s.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          <span>{s.email}</span>
                        </div>
                      )}
                      {s.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          <span>{s.phone}</span>
                        </div>
                      )}
                      {s.notes && <p className="mt-2 text-sm whitespace-pre-line">{s.notes}</p>}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <Button variant="outline" size="sm" onClick={() => { setEditing(s); setDialogOpen(true); }}>
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
                          <AlertDialogTitle>Delete Supplier</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{s.name}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(s.id)}>Delete</AlertDialogAction>
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

export default SupplierManagement;
