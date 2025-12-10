import { useState, useEffect, useMemo, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useGetCategorysQuery, useGetBillOfMaterialsQuery, useGetBillMaterialsQuery, useCreateItemMutation, useDeleteItemMutation } from "@/store/api/items";
import { CreateBuilderItemRequest } from "@/lib/api/types";
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
import { getApiBaseUrl } from "@/lib/config";

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
  const { toast } = useToast();
  const { data: categoriesResponse, isLoading: isLoadingCategories } = useGetCategorysQuery();
  const { data: bomsResponse, isLoading: isLoadingBOMs } = useGetBillOfMaterialsQuery();
  const [selectedBomId, setSelectedBomId] = useState<string>("");
  const { data: billMaterialsResponse, isLoading: isLoadingBillMaterials, refetch: refetchBillMaterials } = useGetBillMaterialsQuery(selectedBomId, {
    skip: !selectedBomId,
  });
  const [createItem, { isLoading: isCreating }] = useCreateItemMutation();
  const [deleteItem, { isLoading: isDeleting }] = useDeleteItemMutation();
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
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [uploadedImages, setUploadedImages] = useState<Array<{ name: string; url: string; path: string }>>([]);
  const [uploadingImages, setUploadingImages] = useState<boolean>(false);
  const imageFileInputRef = useRef<HTMLInputElement>(null);

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
    setImageFiles([]);
    setUploadedImages([]);
    if (imageFileInputRef.current) imageFileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.category) {
      toast({ 
        title: "Missing required fields", 
        description: "Please fill in name and category.", 
        variant: "destructive" 
      });
      return;
    }
    
    if (!user) {
      toast({ title: "Not signed in", description: "Please log in and try again.", variant: "destructive" });
      return;
    }

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

    try {
      const payload: CreateBuilderItemRequest = {
        name: formData.name,
        category: formData.category,
        make: formData.make || undefined,
        brand: formData.brand || undefined,
        model: formData.model || undefined,
        text: formData.description || undefined, // Map description to text
        note: formData.notes || null, // Map notes to note
        price: formData.price ? parseFloat(formData.price) : null,
        documentationUrl: formData.documentation_url || undefined, // Map to camelCase
        purchaser: formData.purchaser || undefined,
        builderOrganizationId: builderOrganizationId,
      };

      if (editingItem) {
        // For update, use createItem with id (API uses same endpoint for create/update)
        await createItem({
          ...payload,
          id: editingItem.id, // Include id for update
        }).unwrap();
        
        toast({ title: "Item updated successfully" });
      } else {
        // For create, use createItem mutation without id
        await createItem(payload).unwrap();
        toast({ title: "Item added successfully" });
      }

      setDialogOpen(false);
      resetForm();
      
      // Refetch items after successful create/update
      if (selectedBomId) {
        refetchBillMaterials();
      }
    } catch (error) {
      console.error('Error saving item:', error);
      const errorMessage = error && typeof error === 'object' && 'data' in error
        ? String((error.data as { message?: string })?.message || "Failed to save item")
        : error instanceof Error
        ? error.message
        : 'Failed to save item';
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
    // Reset file uploads when editing
    setImageFiles([]);
    setUploadedImages([]);
    if (imageFileInputRef.current) imageFileInputRef.current.value = '';
    setDialogOpen(true);
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);
    setImageFiles(prev => [...prev, ...fileArray]);
  };

  const handleRemoveFile = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemoveUploadedImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleFileUpload = async () => {
    if (imageFiles.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select image files to upload.",
        variant: "destructive"
      });
      return;
    }

    if (!user) {
      toast({
        title: "Not signed in",
        description: "Please log in and try again.",
        variant: "destructive"
      });
      return;
    }

    setUploadingImages(true);

    try {
      // Get JWT token from localStorage
      const userData = localStorage.getItem('userData');
      let authToken = '';
      if (userData) {
        try {
          const parsedData = JSON.parse(userData);
          if (parsedData.jwt) {
            authToken = parsedData.jwt;
          }
        } catch (error) {
          console.warn('Failed to parse userData:', error);
        }
      }

      // Get API base URL
      const apiBaseUrl = getApiBaseUrl();
      const url = import.meta.env.DEV
        ? `/api/upload/item-document`
        : `${apiBaseUrl}/api/upload/item-document`;

      // Upload all files
      const uploadPromises = imageFiles.map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('documentType', 'warranty'); // Default type
        // For master items, we might not have itemId or registrationId yet
        // This will be handled when the item is saved
        if (editingItem?.id) {
          formData.append('itemId', editingItem.id);
        }

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: authToken ? `Bearer ${authToken}` : '',
          },
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Failed to upload ${file.name}: ${response.statusText}`);
        }

        const result = await response.json();
        return {
          name: file.name,
          url: result.url || result.data?.url || '',
          path: result.path || result.data?.path || ''
        };
      });

      const uploadedDocs = await Promise.all(uploadPromises);
      setUploadedImages(prev => [...prev, ...uploadedDocs]);
      setImageFiles([]);
      if (imageFileInputRef.current) imageFileInputRef.current.value = '';

      toast({
        title: "Images uploaded successfully",
        description: `${uploadedDocs.length} image(s) uploaded.`,
      });
    } catch (error) {
      console.error('Error uploading images:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload images",
        variant: "destructive"
      });
    } finally {
      setUploadingImages(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;

    try {
      await deleteItem(id).unwrap();
      
      toast({ title: "Item deleted successfully" });
      
      // Refetch items after successful delete
      if (selectedBomId) {
        refetchBillMaterials();
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      const errorMessage = error && typeof error === 'object' && 'data' in error
        ? String((error.data as { message?: string })?.message || "Failed to delete item")
        : error instanceof Error
        ? error.message
        : 'Failed to delete item';
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

  if (isLoadingCategories || isLoadingBOMs || (selectedBomId && isLoadingBillMaterials)) {
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
                {/* Upload image */}
                <div>
                  <Label htmlFor="image-upload">Upload image</Label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        id="image-upload"
                        type="file"
                        multiple
                        accept="image/*"
                        ref={imageFileInputRef}
                        onChange={(e) => handleFileSelect(e.target.files)}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleFileUpload}
                        disabled={imageFiles.length === 0 || uploadingImages}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {uploadingImages ? 'Uploading...' : 'Upload'}
                      </Button>
                    </div>
                    {imageFiles.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground mb-1">Selected files:</p>
                        {imageFiles.map((file, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-sm bg-muted p-2 rounded">
                            <FileText className="h-4 w-4" />
                            <span className="flex-1 truncate">{file.name}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveFile(idx)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                    {uploadedImages.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground mb-1">Uploaded images:</p>
                        {uploadedImages.map((doc, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-sm bg-green-50 dark:bg-green-900/20 p-2 rounded">
                            <FileText className="h-4 w-4 text-green-600 dark:text-green-400" />
                            <span className="flex-1 truncate">{doc.name}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveUploadedImage(idx)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isCreating}>
                    {isCreating ? 'Saving...' : (editingItem ? 'Update Item' : 'Add Item')}
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