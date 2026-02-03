import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Upload, FileText, X } from "lucide-react";
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
}

interface BillOfMaterials {
  id: string;
  name: string;
  project_name: string | null;
}

const categories = [
  "Kitchen",
  "Bathroom", 
  "Appliances",
  "Electrical",
  "Plumbing",
  "Flooring",
  "Trim",
  "HVAC",
  "Windows & Doors",
  "Other"
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
  const [items, setItems] = useState<BuilderItem[]>([]);
  const [boms, setBoms] = useState<BillOfMaterials[]>([]);
  const [selectedBomId, setSelectedBomId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BuilderItem | null>(null);
  const [uploadingManual, setUploadingManual] = useState(false);
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

  const fetchBOMs = useCallback(async () => {
    if (!organization) return;
    try {
      const { data, error } = await supabase
        .from('bill_of_materials')
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBoms(data || []);
      if (data && data.length > 0) {
        setSelectedBomId((prev) => (prev ? prev : data[0].id));
      }
    } catch (error: unknown) {
      toast({
        title: "Error fetching Bill of Materials",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive"
      });
    }
  }, [organization, toast]);

  const fetchItems = useCallback(async () => {
    if (!organization) {
      setLoading(false);
      return;
    }
    try {
      let query = supabase
        .from('builder_items')
        .select('*')
        .eq('organization_id', organization.id);
      if (selectedBomId) {
        query = query.eq('bom_id', selectedBomId);
      }
      const { data, error } = await query
        .order('category', { ascending: true })
        .order('name', { ascending: true });
      if (error) throw error;
      setItems(data || []);
    } catch (error: unknown) {
      toast({
        title: "Error fetching items",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [organization, selectedBomId, toast]);

  useEffect(() => {
    if (isAuthenticated && organization) {
      fetchBOMs();
      fetchItems();
    } else if (!isAuthenticated) {
      setLoading(false);
    } else if (isAuthenticated && !orgLoading && !organization) {
      setLoading(false);
    }
  }, [isAuthenticated, organization, orgLoading, fetchBOMs, fetchItems]);

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
    setEditingItem(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.category) return;
    if (!isAuthenticated || !organization) {
      toast({ title: "Not signed in", description: "Please log in and try again.", variant: "destructive" });
      return;
    }
    const currentUserId = getCurrentUserId(user?.id);
    if (!editingItem && !currentUserId) {
      toast({ title: "Cannot add item", description: "User identity not available.", variant: "destructive" });
      return;
    }

    try {
      const itemData = {
        name: formData.name,
        category: formData.category,
        make: formData.make || null,
        brand: formData.brand || null,
        model: formData.model || null,
        description: formData.description || null,
        price: formData.price ? parseFloat(formData.price) : null,
        documentation_url: formData.documentation_url || null,
        notes: formData.notes || null,
        purchaser: formData.purchaser || null,
        warranty_years: formData.warranty_years ? parseInt(formData.warranty_years, 10) : null,
        manual_url: formData.manual_url || null
      };

      if (editingItem) {
        const { error } = await supabase
          .from('builder_items')
          .update(itemData)
          .eq('id', editingItem.id);

        if (error) throw error;
        toast({ title: "Item updated successfully" });
      } else {
        const { error } = await supabase
          .from('builder_items')
          .insert({ ...itemData, builder_id: currentUserId!, organization_id: organization.id });

        if (error) throw error;
        toast({ title: "Item added successfully" });
      }

      setDialogOpen(false);
      resetForm();
      fetchItems();
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

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;

    try {
      const { error } = await supabase
        .from('builder_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Item deleted successfully" });
      fetchItems();
    } catch (error: unknown) {
      toast({
        title: "Error deleting item",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive"
      });
    }
  };

  const handleManualUpload = async (file: File) => {
    const currentUserId = getCurrentUserId(user?.id);
    if (!currentUserId || !selectedBomId) return;

    setUploadingManual(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_manual.${fileExt}`;
      const filePath = `${currentUserId}/bom-manuals/${selectedBomId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('item-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('item-documents')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, manual_url: publicUrl }));
      
      toast({
        title: "Manual uploaded",
        description: "The manual document has been uploaded successfully",
      });
    } catch (error: unknown) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive"
      });
    } finally {
      setUploadingManual(false);
    }
  };

  const handleRemoveManual = async () => {
    if (!formData.manual_url) return;

    try {
      // Extract path from URL if it's a supabase storage URL
      const urlParts = formData.manual_url.split('/item-documents/');
      if (urlParts.length > 1) {
        const filePath = decodeURIComponent(urlParts[1]);
        await supabase.storage
          .from('item-documents')
          .remove([filePath]);
      }
      
      setFormData(prev => ({ ...prev, manual_url: '' }));
      toast({
        title: "Manual removed",
        description: "The manual document has been removed",
      });
    } catch (error: unknown) {
      toast({
        title: "Remove failed", 
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive"
      });
    }
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
            <h1 className="text-3xl font-bold text-foreground">Items Management</h1>
            <p className="text-muted-foreground mt-1">Manage your master list of items for homeowner registrations</p>
          </div>
          <div className="flex gap-2">
            <BOMUpload onSuccess={() => {
              fetchBOMs();
              fetchItems();
            }} />
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm} disabled={!selectedBomId}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingItem ? 'Edit Item' : 'Add New Item'}</DialogTitle>
                <DialogDescription>
                  {editingItem ? 'Update the item details below.' : 'Add a new item to your master list.'}
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
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="make">Make</Label>
                    <Input
                      id="make"
                      value={formData.make}
                      onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="brand">Brand</Label>
                    <Input
                      id="brand"
                      value={formData.brand}
                      onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="model">Model</Label>
                    <Input
                      id="model"
                      value={formData.model}
                      onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    />
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
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="warranty_years">Warranty (Years)</Label>
                    <Input
                      id="warranty_years"
                      type="number"
                      min="0"
                      max="99"
                      value={formData.warranty_years}
                      onChange={(e) => setFormData({ ...formData, warranty_years: e.target.value })}
                      placeholder="e.g., 2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="documentation_url">Documentation URL</Label>
                    <Input
                      id="documentation_url"
                      type="url"
                      value={formData.documentation_url}
                      onChange={(e) => setFormData({ ...formData, documentation_url: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="purchaser">Purchaser</Label>
                    <Input
                      id="purchaser"
                      value={formData.purchaser}
                      onChange={(e) => setFormData({ ...formData, purchaser: e.target.value })}
                      placeholder="Who purchases this item"
                    />
                  </div>
                </div>
                <div>
                  <Label>Manual Document</Label>
                  {formData.manual_url ? (
                    <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                      <FileText className="h-4 w-4 text-primary" />
                      <a 
                        href={formData.manual_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline flex-1 truncate"
                      >
                        View Manual
                      </a>
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
                  <p className="text-xs text-muted-foreground mt-1">
                    Upload a PDF or document for the product manual
                  </p>
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
              <Label htmlFor="bomSelect">Select Bill of Materials</Label>
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
                          <TableHead>Name</TableHead>
                          <TableHead>Make</TableHead>
                          <TableHead>Brand</TableHead>
                          <TableHead>Model</TableHead>
                          <TableHead>Warranty</TableHead>
                          <TableHead>Purchaser</TableHead>
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
                              <Button variant="outline" size="sm" onClick={() => handleDelete(item.id)}>
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
    </div>
  );
};

export default ItemsManagement;