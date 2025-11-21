import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useGetCategorysQuery, useGetBillOfMaterialsQuery, useGetBillMaterialsQuery } from "@/store/api/items";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2 } from "lucide-react";
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
}

interface BillOfMaterials {
  id: string;
  name: string;
  project_name: string | null;
}

const ItemsManagement = () => {
  console.log('ItemsManagement - Component initialized');
  const { user } = useAuth();
  const { organization, loading: orgLoading } = useOrganization();
  const { toast } = useToast();
  const { data: categoriesResponse, isLoading: isLoadingCategories } = useGetCategorysQuery();
  const { data: bomsResponse, isLoading: isLoadingBOMs } = useGetBillOfMaterialsQuery();
  const [selectedBomId, setSelectedBomId] = useState<string>("");
  const { data: billMaterialsResponse, isLoading: isLoadingBillMaterials } = useGetBillMaterialsQuery(selectedBomId, {
    skip: !selectedBomId,
  });
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BuilderItem | null>(null);
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
    purchaser: ""
  });

  // Map API BOMs response to component format
  const boms = useMemo(() => {
    return bomsResponse?.data?.map(bom => ({
      id: bom.id,
      name: bom.bomName,
      project_name: bom.projectName || null,
    })) || [];
  }, [bomsResponse?.data]);

  // Map API bill materials response to BuilderItem format
  const items = useMemo(() => {
    if (!billMaterialsResponse?.data) return [];
    
    return billMaterialsResponse.data.map(item => ({
      id: item.id,
      name: item.name,
      category: item.category,
      make: item.make || null,
      brand: item.brand || null,
      model: item.model || null,
      description: item.text || null,
      price: item.price ? parseFloat(item.price) : null,
      documentation_url: item.documentationUrl || null,
      notes: item.note || null,
      purchaser: item.puchaser || null,
      bom_id: item.billOfMaterials?.id || null,
    })).sort((a, b) => {
      // Sort by category first, then by name
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      return a.name.localeCompare(b.name);
    });
  }, [billMaterialsResponse?.data]);

  // Auto-select first BOM when BOMs are loaded
  useEffect(() => {
    if (boms.length > 0 && !selectedBomId) {
      setSelectedBomId(boms[0].id);
    }
  }, [boms, selectedBomId]);

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
      purchaser: ""
    });
    setEditingItem(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.category) return;
    if (!user) {
      toast({ title: "Not signed in", description: "Please log in and try again.", variant: "destructive" });
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
        purchaser: formData.purchaser || null
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
          .insert({ ...itemData, builder_id: user.id });

        if (error) throw error;
        toast({ title: "Item added successfully" });
      }

      setDialogOpen(false);
      resetForm();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save item';
      toast({
        title: "Error saving item",
        description: errorMessage,
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
      purchaser: item.purchaser || ""
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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete item';
      toast({
        title: "Error deleting item",
        description: errorMessage,
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

  console.log('ItemsManagement - Render state:', { loading, user: !!user, itemsCount: items.length, userLoading: !user });
  console.log('ItemsManagement - About to render, conditions:', { 
    isLoading: loading, 
    hasUser: !!user, 
    shouldShowMain: !loading && !!user 
  });

  if (loading || isLoadingBOMs || (selectedBomId && isLoadingBillMaterials)) {
    console.log('ItemsManagement - Showing loading state');
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

  if (!user) {
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

  console.log('ItemsManagement - Rendering main component');
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
              // Items will automatically refetch when selectedBomId changes or cache is invalidated
            }} />
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
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
                        <SelectValue placeholder={isLoadingCategories ? "Loading categories..." : "Select category"} />
                      </SelectTrigger>
                      <SelectContent>
                        {categoriesResponse?.data?.map((category) => (
                          <SelectItem key={category.id} value={category.name}>{category.name}</SelectItem>
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
                <div className="grid grid-cols-2 gap-4">
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
                  <SelectValue placeholder={isLoadingBOMs ? "Loading BOMs..." : "Select a Bill of Materials"} />
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