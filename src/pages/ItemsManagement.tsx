import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import {
  useGetCategorysQuery,
  useGetBillOfMaterialsQuery,
  useGetBillMaterialsQuery,
  useCreateItemMutation,
  useUpdateItemMutation,
  useDeleteItemMutation,
} from "@/store/api";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Upload, FileText, X } from "lucide-react";
import InfoCircleOutlined from "@ant-design/icons/es/icons/InfoCircleOutlined";
import { Tooltip } from "antd";
import Header from "@/components/Header";
import { BOMUpload } from "@/components/BOMUpload";

interface BuilderItem {
  id: string;
  name: string;
  category: string;
  make: string | null;
  brand: string | null;
  model: string | null;
  description: string | null;
  price: number | null;
  documentation_url: string | null;
  notes: string | null;
  purchaser: string | null;
  bom_id: string | null;
  warranty_years: number | null;
  manual_url: string | null;
  manual_documents?: Array<{
    id: string;
    name: string;
    fileId?: string;
  }>;
}

interface BillOfMaterials {
  id: string;
  name: string;
  project_name: string | null;
}

const InfoHint = ({ text, maxChars = 25 }: { text: string; maxChars?: number }) => (
  <div className="mt-2 flex items-center gap-2 rounded-md bg-blue-50 px-2.5 py-1.5 text-xs text-blue-700">
    {(() => {
      const shortText = text.length > maxChars ? `${text.slice(0, maxChars)}...` : text;
      return (
        <>
          <Tooltip title={text}>
            <InfoCircleOutlined className="shrink-0 text-sm" />
          </Tooltip>
          <Tooltip title={text}>
            <span className="block w-full overflow-hidden text-ellipsis whitespace-nowrap">
              {shortText}
            </span>
          </Tooltip>
        </>
      );
    })()}
  </div>
);

const FALLBACK_CATEGORIES = [
  "Kitchen", "Bathroom", "Appliances", "Electrical", "Plumbing",
  "Flooring", "Trim", "HVAC", "Windows & Doors", "Other"
];

// Builder login: allow access when JWT in localStorage (e.g. role: "admin") without Supabase user
const hasBuilderAuth = (): boolean => {
  try {
    const userData = localStorage.getItem("userData");
    if (!userData) return false;
    const parsed = JSON.parse(userData);
    return !!(parsed?.jwt);
  } catch {
    return false;
  }
};

// Current user id: Supabase user.id or builder id from localStorage
const getCurrentUserId = (supabaseUserId: string | undefined): string | null => {
  if (supabaseUserId) return supabaseUserId;
  try {
    const userData = localStorage.getItem("userData");
    if (!userData) return null;
    const data = JSON.parse(userData);
    return data?.id ?? data?.userInfo?.id ?? data?.user_info?.id ?? null;
  } catch {
    return null;
  }
};

const ItemsManagement = () => {
  const { user } = useAuth();
  const { organization, loading: orgLoading } = useOrganization();
  const { toast } = useToast();
  const [selectedBomId, setSelectedBomId] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDeleteId, setItemToDeleteId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<BuilderItem | null>(null);
  const [uploadingManual, setUploadingManual] = useState(false);
  const [manualFile, setManualFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    make: "",
    brand: "",
    model: "",
    description: "",
    price: "",
    documentation_url: "",
    notes: "",
    purchaser: "",
    warranty_years: "",
    manual_url: ""
  });

  const isAuthenticated = !!user || hasBuilderAuth();

  const { data: categoriesResponse } = useGetCategorysQuery();
  const [createItem, { isLoading: isCreating }] = useCreateItemMutation();
  const [updateItem, { isLoading: isUpdating }] = useUpdateItemMutation();
  const [deleteItem] = useDeleteItemMutation();

  const categories = useMemo(() => {
    const list = categoriesResponse?.data;
    if (list?.length) return list.map((c) => c.name);
    return FALLBACK_CATEGORIES;
  }, [categoriesResponse?.data]);

  const builderOrganizationId = organization?.id ?? (() => {
    try {
      const d = localStorage.getItem("userData");
      if (!d) return null;
      const p = JSON.parse(d);
      return p?.userInfo?.builderOrganization?.id ?? p?.builderOrganization?.id ?? null;
    } catch {
      return null;
    }
  })();

  const {
    data: bomsResponse,
    isLoading: isLoadingBOMs,
    refetch: refetchBOMs,
  } = useGetBillOfMaterialsQuery(
    builderOrganizationId ? { builderId: builderOrganizationId } : ({} as { builderId: string }),
    { skip: !builderOrganizationId }
  );

  const {
    data: billMaterialsResponse,
    isLoading: isLoadingBillMaterials,
    refetch: refetchBillMaterials,
  } = useGetBillMaterialsQuery(selectedBomId, { skip: !selectedBomId });

  const boms = useMemo(() => {
    return (bomsResponse?.data ?? []).map((bom) => ({
      id: bom.id,
      name: bom.bomName,
      project_name: bom.projectName ?? null,
    }));
  }, [bomsResponse?.data]);

  useEffect(() => {
    if (boms.length > 0 && !selectedBomId) setSelectedBomId(boms[0].id);
  }, [boms, selectedBomId]);

  const items = useMemo<BuilderItem[]>(() => {
    const data = billMaterialsResponse?.data;
    if (!data || !Array.isArray(data)) return [];
    return (data as Array<{
      id: string;
      name: string;
      category: string;
      make: string | null;
      brand: string | null;
      model: string | null;
      text: string | null;
      note: string | null;
      price: string | null;
      documentationUrl: string | null;
      purchaser: string | null;
      warranty?: number | string | null;
      builderItemFiles?: Array<{
        id: string;
        type: string;
        files?: {
          id?: string;
          name?: string;
          filePath?: string;
        };
      }>;
    }>).map((item) => {
      const manual_documents: Array<{ id: string; name: string; fileId?: string }> = [];
      if (Array.isArray(item.builderItemFiles)) {
        for (const f of item.builderItemFiles) {
          const typeLower = (f.type ?? '').toLowerCase();
          if (typeLower === 'manual') {
            const file = f.files ?? {};
            manual_documents.push({
              id: f.id,
              name: file.name || 'document',
              fileId: file.id,
            });
          }
        }
      }
      return {
        id: item.id,
        name: item.name,
        category: item.category,
        make: item.make ?? null,
        brand: item.brand ?? null,
        model: item.model ?? null,
        description: item.text ?? null,
        price: item.price ? parseFloat(item.price) : null,
        documentation_url: item.documentationUrl ?? null,
        notes: item.note ?? null,
        purchaser: item.purchaser ?? null,
        bom_id: selectedBomId || null,
        warranty_years:
          item.warranty != null && item.warranty !== ""
            ? Number(item.warranty)
            : null,
        manual_url: null as string | null,
        manual_documents,
      };
    }).sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
  }, [billMaterialsResponse?.data, selectedBomId]);

  const loading = isLoadingBOMs || (!!selectedBomId && isLoadingBillMaterials);
  const refetchItems = useCallback(() => {
    refetchBOMs();
    refetchBillMaterials();
  }, [refetchBOMs, refetchBillMaterials]);

  const resetForm = () => {
    setFormData({
      name: "",
      category: "",
      make: "",
      brand: "",
      model: "",
      description: "",
      price: "",
      documentation_url: "",
      notes: "",
      purchaser: "",
      warranty_years: "",
      manual_url: ""
    });
    setManualFile(null);
    setEditingItem(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.category) return;
    if (!isAuthenticated || !builderOrganizationId) {
      toast({ title: "Not signed in", description: "Please log in and try again.", variant: "destructive" });
      return;
    }

    const warrantyYears =
      formData.warranty_years !== ""
        ? Number(formData.warranty_years)
        : null;
    if (
      warrantyYears != null &&
      (!Number.isFinite(warrantyYears) || warrantyYears < 0 || warrantyYears > 10)
    ) {
      toast({
        title: "Invalid warranty",
        description: "Warranty (Years) must be between 0 and 10.",
        variant: "destructive",
      });
      return;
    }

    try {
      const builderItemFilesDtos =
        manualFile != null ? [{ type: "Manual" as const, file: manualFile }] : undefined;

      const payload = {
        name: formData.name,
        category: formData.category,
        make: formData.make || undefined,
        brand: formData.brand || undefined,
        model: formData.model || undefined,
        text: formData.description || undefined,
        note: formData.notes || null,
        price: formData.price ? parseFloat(formData.price) : null,
        documentationUrl: formData.documentation_url || undefined,
        purchaser: formData.purchaser || undefined,
        warranty: warrantyYears,
        builderOrganizationId,
        ...(selectedBomId ? { billMaterialId: selectedBomId } : {}),
        ...(builderItemFilesDtos ? { builderItemFilesDtos } : {}),
      };

      if (editingItem) {
        await updateItem({ id: editingItem.id, data: payload }).unwrap();
        toast({ title: "Item updated successfully" });
      } else {
        await createItem(payload).unwrap();
        toast({ title: "Item added successfully" });
      }

      setDialogOpen(false);
      resetForm();
      refetchBillMaterials();
    } catch (error: unknown) {
      toast({
        title: "Error saving item",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive"
      });
    }
  };

  const handleEdit = (item: BuilderItem) => {
    setEditingItem(item);
    setManualFile(null);
    setFormData({
      name: item.name,
      category: item.category,
      make: item.make || "",
      brand: item.brand || "",
      model: item.model || "",
      description: item.description || "",
      price: item.price?.toString() || "",
      documentation_url: item.documentation_url || "",
      notes: item.notes || "",
      purchaser: item.purchaser || "",
      warranty_years: item.warranty_years?.toString() || "",
      manual_url: item.manual_url || ""
    });
    setDialogOpen(true);
  };

  const openDeleteDialog = (id: string) => {
    setItemToDeleteId(id);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDeleteId) return;
    try {
      await deleteItem(itemToDeleteId).unwrap();
      toast({ title: "Item deleted successfully" });
      refetchBillMaterials();
      setDeleteDialogOpen(false);
      setItemToDeleteId(null);
    } catch (error: unknown) {
      toast({
        title: "Error deleting item",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive"
      });
    }
  };

  const handleManualUpload = async (file: File) => {
    setUploadingManual(true);
    try {
      setManualFile(file);
      setFormData(prev => ({ ...prev, manual_url: file.name }));
      toast({
        title: "Manual selected",
        description: "The manual document will be uploaded when you save the item.",
      });
    } finally {
      setUploadingManual(false);
    }
  };

  const handleRemoveManual = async () => {
    setManualFile(null);
    setFormData(prev => ({ ...prev, manual_url: "" }));
  };

  const groupedItems = items.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, BuilderItem[]>);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg">Loading items...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg">Please log in to access items management.</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Warranty Items Library</h1>
            <p className="text-muted-foreground mt-1">Build and manage reusable sets of installed items and their warranties. Attach a set to any homeowner registration at handover.</p>
          </div>
          <div className="flex gap-2">
            <BOMUpload onSuccess={refetchItems} />
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm} disabled={!selectedBomId}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingItem ? 'Edit Item' : 'Add Warranty Item'}</DialogTitle>
                <DialogDescription>
                  {editingItem ? 'Update the item details below.' : 'Add an installed item and its warranty details to your library.'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Item Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">Category *</Label>
                    <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category} value={category}>{category}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="make">Make</Label>
                    <Input
                      id="make"
                      value={formData.make}
                      onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                    />
                    <InfoHint text="The manufacturer or supplier name if different from the brand. Often the same as Brand." />
                  </div>
                  <div>
                    <Label htmlFor="brand">Brand</Label>
                    <Input
                      id="brand"
                      value={formData.brand}
                      onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    />
                    <InfoHint text="The brand or company that makes this item e.g. Bosch, Daikin, Rheem." />
                  </div>
                  <div>
                    <Label htmlFor="model">Model</Label>
                    <Input
                      id="model"
                      value={formData.model}
                      onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    />
                    <InfoHint text="The specific product model number or name e.g. DX20SK or 850E. Helps the homeowner identify their exact product when making a claim." />
                  </div>
                  <div>
                    <Label htmlFor="price">Price (AUD)</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="warranty_years">Warranty (Years)</Label>
                    <Input
                      id="warranty_years"
                      type="number"
                      min="0"
                      max="10"
                      value={formData.warranty_years}
                      onChange={(e) =>
                        setFormData({ ...formData, warranty_years: e.target.value })
                      }
                      placeholder="e.g., 2"
                    />
                    <InfoHint text="Expiry is calculated from the homeowner's settlement date." />
                  </div>
                  <div>
                    <Label htmlFor="documentation_url">Supplier warranty URL</Label>
                    <Input
                      id="documentation_url"
                      type="url"
                      value={formData.documentation_url}
                      onChange={(e) => setFormData({ ...formData, documentation_url: e.target.value })}
                      placeholder="https://..."
                    />
                    <InfoHint text="Shown to homeowner when making a claim." />
                  </div>
                  <div>
                    <Label htmlFor="purchaser">Installed by</Label>
                    <Input
                      id="purchaser"
                      value={formData.purchaser}
                      onChange={(e) => setFormData({ ...formData, purchaser: e.target.value })}
                      placeholder="Who purchases this item"
                    />
                    <InfoHint text="Routes warranty queries to the right trade or supplier." />
                  </div>
                </div>
                <div>
                  <Label>Product manual (PDF)</Label>
                  {manualFile ? (
                    <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                      <FileText className="h-4 w-4 text-primary" />
                      <span className="text-sm flex-1 truncate">
                        {manualFile.name}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveManual}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Input
                        id="manual_file"
                        type="file"
                        accept=".pdf,.doc,.docx,.txt"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleManualUpload(file);
                        }}
                        disabled={uploadingManual}
                        className="flex-1"
                      />
                      {uploadingManual && (
                        <span className="text-sm text-muted-foreground">Uploading...</span>
                      )}
                    </div>
                  )}
                  {editingItem?.manual_documents && editingItem.manual_documents.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {editingItem.manual_documents.map((doc) => (
                        <div key={doc.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <FileText className="h-4 w-4" />
                          <span className="flex-1 truncate">{doc.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <InfoHint
                    text="Upload the installation or product manual as a PDF. Homeowners can access this from the app if they need setup or troubleshooting help."
                    maxChars={98}
                  />
                </div>
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingItem ? 'Update Item' : 'Add Item'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {boms.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground text-center">
                No Bill of Materials found. Upload a BOM to get started.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="mb-6">
              <Label htmlFor="bomSelect">Select item set</Label>
              <Select value={selectedBomId} onValueChange={(value) => {
                setSelectedBomId(value);
              }}>
                <SelectTrigger className="w-full max-w-md">
                  <SelectValue placeholder="Select a Bill of Materials" />
                </SelectTrigger>
                <SelectContent>
                  {boms.map((bom) => (
                    <SelectItem key={bom.id} value={bom.id}>
                      {bom.name} {bom.project_name && `- ${bom.project_name}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {items.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <p className="text-muted-foreground text-center">
                    No items found in this Bill of Materials.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedItems).map(([category, categoryItems]) => (
              <Card key={category}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {category}
                    <Badge variant="secondary">{categoryItems.length} items</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item name</TableHead>
                          <TableHead>Make</TableHead>
                          <TableHead>Brand</TableHead>
                          <TableHead>Model</TableHead>
                          <TableHead>Warranty (years)</TableHead>
                          <TableHead>Installed by</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                    <TableBody>
                      {categoryItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell>{item.make || "-"}</TableCell>
                          <TableCell>{item.brand || "-"}</TableCell>
                          <TableCell>{item.model || "-"}</TableCell>
                          <TableCell>{item.warranty_years ? `${item.warranty_years} yr${item.warranty_years > 1 ? 's' : ''}` : "-"}</TableCell>
                          <TableCell>{item.purchaser || "-"}</TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button variant="outline" size="sm" onClick={() => handleEdit(item)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => openDeleteDialog(item.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                       ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))}
              </div>
            )}
          </>
        )}
      </main>

      <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => { setDeleteDialogOpen(open); if (!open) setItemToDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this item? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ItemsManagement;