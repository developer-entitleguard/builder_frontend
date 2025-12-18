import { useState, useEffect, useMemo, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useGetCategorysQuery, useGetBillOfMaterialsQuery, useGetBillMaterialsQuery, useCreateItemMutation, useDeleteItemMutation, useDeleteBuilderItemFilesMutation } from "@/store/api/items";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Edit, Trash2, Upload, FileText, X, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
  builderItemFiles?: Array<{
    id: string;
    type: string;
    files: {
      id: string;
      name: string;
      type: string;
      fileType: string;
      filePath: string;
    };
  }>;
}

interface UploadedDoc {
  name: string;
  url: string;
  path: string;
  type: 'Warranty' | 'Manual';
  builderItemFileId?: string;
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
  const { data: categoriesResponse, isLoading: isLoadingCategories, isFetching: isFetchingCategories } = useGetCategorysQuery();
  const { data: bomsResponse, isLoading: isLoadingBOMs, isFetching: isFetchingBOMs } = useGetBillOfMaterialsQuery();
  const [selectedBomId, setSelectedBomId] = useState<string>("");
  const { data: billMaterialsResponse, isLoading: isLoadingBillMaterials, isFetching: isFetchingBillMaterials, refetch: refetchBillMaterials } = useGetBillMaterialsQuery(selectedBomId, {
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
  const [warrantyFiles, setWarrantyFiles] = useState<File[]>([]);
  const [uploadedWarrantyDocs, setUploadedWarrantyDocs] = useState<UploadedDoc[]>([]);
  const [uploadingWarranty, setUploadingWarranty] = useState<boolean>(false);
  const warrantyFileInputRef = useRef<HTMLInputElement>(null);

  const [manualFiles, setManualFiles] = useState<File[]>([]);
  const [uploadedManualDocs, setUploadedManualDocs] = useState<UploadedDoc[]>([]);
  const [deleteBuilderItemFiles] = useDeleteBuilderItemFilesMutation();
  const [uploadingManual, setUploadingManual] = useState<boolean>(false);
  const manualFileInputRef = useRef<HTMLInputElement>(null);

  const [isWarrantyFilesOpen, setIsWarrantyFilesOpen] = useState(false);
  const [isManualFilesOpen, setIsManualFilesOpen] = useState(false);

  // Map API BOMs response to component format
  const boms = useMemo(() => {
    return bomsResponse?.data?.map(bom => ({
      id: bom.id,
      name: bom.bomName,
      project_name: bom.projectName || null,
    })) || [];
  }, [bomsResponse?.data]);

  // Map API bill materials response to BuilderItem format
  const items = useMemo<BuilderItem[]>(() => {
    if (!billMaterialsResponse?.data) return [];
    
    // Treat raw API items as any to allow optional builderItemFiles field
    type ApiBuilderItem = {
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
      puchaser: string | null;
      billOfMaterials?: { id: string };
      builderItemFiles?: BuilderItem['builderItemFiles'];
    };

    const apiItems = billMaterialsResponse.data as ApiBuilderItem[];

    return apiItems.map((item) => ({
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
      builderItemFiles: item.builderItemFiles || [],
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
    setWarrantyFiles([]);
    setUploadedWarrantyDocs([]);
    setManualFiles([]);
    setUploadedManualDocs([]);
    setIsWarrantyFilesOpen(false);
    setIsManualFilesOpen(false);
    if (warrantyFileInputRef.current) warrantyFileInputRef.current.value = '';
    if (manualFileInputRef.current) manualFileInputRef.current.value = '';
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
      const formDataPayload = new FormData();
      formDataPayload.append('name', formData.name);
      formDataPayload.append('category', formData.category);
      if (formData.make) formDataPayload.append('make', formData.make);
      if (formData.brand) formDataPayload.append('brand', formData.brand);
      if (formData.model) formDataPayload.append('model', formData.model);
      if (formData.description) formDataPayload.append('text', formData.description);
      formDataPayload.append('note', formData.notes || '');
      formDataPayload.append('price', formData.price ? String(parseFloat(formData.price)) : '');
      if (formData.documentation_url) formDataPayload.append('documentationUrl', formData.documentation_url);
      if (formData.purchaser) formDataPayload.append('purchaser', formData.purchaser);
      formDataPayload.append('builderOrganizationId', builderOrganizationId);
      if (selectedBomId) {
        formDataPayload.append('billMaterialId', selectedBomId);
      }

      // Append files: warranty then manual
      let fileIndex = 0;
      warrantyFiles.forEach((file) => {
        formDataPayload.append(`builderItemFilesDtos[${fileIndex}].type`, 'Warranty');
        formDataPayload.append(`builderItemFilesDtos[${fileIndex}].file`, file);
        fileIndex += 1;
      });
      manualFiles.forEach((file) => {
        formDataPayload.append(`builderItemFilesDtos[${fileIndex}].type`, 'Manual');
        formDataPayload.append(`builderItemFilesDtos[${fileIndex}].file`, file);
        fileIndex += 1;
      });
      if (editingItem?.id) {
        formDataPayload.append('id', editingItem.id);
      }

      const userData = localStorage.getItem('userData');
      let authToken = '';
      if (userData) {
        try {
          const parsedData = JSON.parse(userData);
          if (parsedData.jwt) authToken = parsedData.jwt;
        } catch (err) {
          console.warn('Failed to parse userData:', err);
        }
      }

      const apiBaseUrl = getApiBaseUrl();
      const url = import.meta.env.DEV
        ? `/api/builder/item`
        : `${apiBaseUrl}/api/builder/item`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: authToken ? `Bearer ${authToken}` : '',
        },
        body: formDataPayload,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to save item');
      }

      toast({ title: editingItem ? "Item updated successfully" : "Item added successfully" });

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
    // When editing, clear any newly selected files but preload already uploaded docs from API
    setWarrantyFiles([]);
    setManualFiles([]);

    const warrantyDocsFromItem: UploadedDoc[] =
      item.builderItemFiles
        ?.filter((file) => file.type === 'Warranty' && file.files)
        .map((file) => ({
          name: file.files.name,
          url: "",
          path: file.files.filePath,
          type: 'Warranty',
          builderItemFileId: file.id,
        })) || [];

    const manualDocsFromItem: UploadedDoc[] =
      item.builderItemFiles
        ?.filter((file) => file.type === 'Manual' && file.files)
        .map((file) => ({
          name: file.files.name,
          url: "",
          path: file.files.filePath,
          type: 'Manual',
          builderItemFileId: file.id,
        })) || [];

    setUploadedWarrantyDocs(warrantyDocsFromItem);
    setUploadedManualDocs(manualDocsFromItem);

    if (warrantyFileInputRef.current) warrantyFileInputRef.current.value = '';
    if (manualFileInputRef.current) manualFileInputRef.current.value = '';
    setDialogOpen(true);
  };

  const handleWarrantyFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);
    setWarrantyFiles(prev => [...prev, ...fileArray]);
  };

  const handleManualFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);
    setManualFiles(prev => [...prev, ...fileArray]);
  };

  const handleRemoveWarrantyFile = (index: number) => {
    setWarrantyFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemoveManualFile = (index: number) => {
    setManualFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemoveUploadedWarranty = async (index: number) => {
    const doc = uploadedWarrantyDocs[index];
    if (!doc) return;

    // If this doc is already stored in backend, delete via RTK Query mutation
    if (doc.builderItemFileId) {
      try {
        const result = await deleteBuilderItemFiles(doc.builderItemFileId).unwrap();
        if (!result.success) {
          toast({
            title: "Failed to delete file",
            description: result.message || "Could not delete warranty document.",
            variant: "destructive",
          });
          return;
        }
        toast({
          title: "File deleted",
          description: result.message || "Files Deleted Successfully",
        });
        await refetchBillMaterials();
      } catch (error) {
        console.error('Error deleting warranty document:', error);
        toast({
          title: "Failed to delete file",
          description: error instanceof Error ? error.message : "Could not delete warranty document.",
          variant: "destructive",
        });
        return;
      }
    }

    // Remove from UI state
    setUploadedWarrantyDocs(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemoveUploadedManual = async (index: number) => {
    const doc = uploadedManualDocs[index];
    if (!doc) return;

    if (doc.builderItemFileId) {
      try {
        const result = await deleteBuilderItemFiles(doc.builderItemFileId).unwrap();
        if (!result.success) {
          toast({
            title: "Failed to delete file",
            description: result.message || "Could not delete manual document.",
            variant: "destructive",
          });
          return;
        }
        toast({
          title: "File deleted",
          description: result.message || "Files Deleted Successfully",
        });
        await refetchBillMaterials();
      } catch (error) {
        console.error('Error deleting manual document:', error);
        toast({
          title: "Failed to delete file",
          description: error instanceof Error ? error.message : "Could not delete manual document.",
          variant: "destructive",
        });
        return;
      }
    }

    setUploadedManualDocs(prev => prev.filter((_, i) => i !== index));
  };

  const handleWarrantyUpload = async () => {
    if (warrantyFiles.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select warranty files to upload.",
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

    setUploadingWarranty(true);

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

      // Upload all warranty files
      const uploadPromises = warrantyFiles.map<Promise<UploadedDoc>>(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('documentType', 'warranty');
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
          path: result.path || result.data?.path || '',
          type: 'Warranty',
          builderItemFileId: result.builderItemFileId || result.data?.id,
        };
      });

      const uploadedDocs = await Promise.all(uploadPromises);
      setUploadedWarrantyDocs(prev => [...prev, ...uploadedDocs]);
      setWarrantyFiles([]);
      if (warrantyFileInputRef.current) warrantyFileInputRef.current.value = '';

      toast({
        title: "Warranty documents uploaded successfully",
        description: `${uploadedDocs.length} document(s) uploaded.`,
      });
    } catch (error) {
      console.error('Error uploading warranty documents:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload warranty documents",
        variant: "destructive"
      });
    } finally {
      setUploadingWarranty(false);
    }
  };

  const handleManualUpload = async () => {
    if (manualFiles.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select manual files to upload.",
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

    setUploadingManual(true);

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

      // Upload all manual files
      const uploadPromises = manualFiles.map<Promise<UploadedDoc>>(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('documentType', 'manual');
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
          path: result.path || result.data?.path || '',
          type: 'Manual',
          builderItemFileId: result.builderItemFileId || result.data?.id,
        };
      });

      const uploadedDocs = await Promise.all(uploadPromises);
      setUploadedManualDocs(prev => [...prev, ...uploadedDocs]);
      setManualFiles([]);
      if (manualFileInputRef.current) manualFileInputRef.current.value = '';

      toast({
        title: "Manual documents uploaded successfully",
        description: `${uploadedDocs.length} document(s) uploaded.`,
      });
    } catch (error) {
      console.error('Error uploading manual documents:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload manual documents",
        variant: "destructive"
      });
    } finally {
      setUploadingManual(false);
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

  // Show a simple full-page loading state only for the very first load of categories
  if (isLoadingCategories && !categoriesResponse && !user) {
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
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
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
                {/* Upload Warranty and Manual */}
                <div>
                  <Label htmlFor="warranty-upload">Upload Warranty</Label>
                  <div className="space-y-2">
                    <Input
                      id="warranty-upload"
                      type="file"
                      multiple
                      accept="image/*,.pdf"
                      ref={warrantyFileInputRef}
                      onChange={(e) => handleWarrantyFileSelect(e.target.files)}
                      className="w-full max-w-full"
                    />
                    {(warrantyFiles.length > 0 || uploadedWarrantyDocs.length > 0) && (
                      <Collapsible
                        className="space-y-1"
                        open={isWarrantyFilesOpen}
                        onOpenChange={setIsWarrantyFilesOpen}
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground">
                            Warranty files ({warrantyFiles.length + uploadedWarrantyDocs.length})
                          </p>
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm" className="flex items-center gap-1">
                              {isWarrantyFilesOpen ? (
                                <ChevronDown className="h-3 w-3" />
                              ) : (
                                <ChevronRight className="h-3 w-3" />
                              )}
                              <span className="text-xs">
                                {isWarrantyFilesOpen ? "Hide" : "Show"}
                              </span>
                            </Button>
                          </CollapsibleTrigger>
                        </div>
                        <CollapsibleContent className="space-y-1 pt-1">
                          {warrantyFiles.length > 0 && (
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground mb-1">Selected warranty files:</p>
                              {warrantyFiles.map((file, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center gap-2 text-sm bg-muted p-2 rounded w-full max-w-full overflow-hidden"
                                >
                                  <FileText className="h-4 w-4" />
                                  <span className="flex-1 min-w-0 overflow-hidden text-ellipsis break-words break-all whitespace-pre-wrap">
                                    {file.name}
                                  </span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveWarrantyFile(idx)}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                          {uploadedWarrantyDocs.length > 0 && (
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground mb-1">Uploaded warranty documents:</p>
                              {uploadedWarrantyDocs.map((doc, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center gap-2 text-sm bg-green-50 dark:bg-green-900/20 p-2 rounded w-full max-w-full overflow-hidden"
                                >
                                  <FileText className="h-4 w-4 text-green-600 dark:text-green-400" />
                                  <span className="flex-1 min-w-0 overflow-hidden text-ellipsis break-words break-all whitespace-pre-wrap">
                                    {doc.name}
                                  </span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveUploadedWarranty(idx)}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="manual-upload">Upload Manual</Label>
                  <div className="space-y-2">
                    <Input
                      id="manual-upload"
                      type="file"
                      multiple
                      accept="image/*,.pdf"
                      ref={manualFileInputRef}
                      onChange={(e) => handleManualFileSelect(e.target.files)}
                      className="w-full max-w-full"
                    />
                    {(manualFiles.length > 0 || uploadedManualDocs.length > 0) && (
                      <Collapsible
                        className="space-y-1"
                        open={isManualFilesOpen}
                        onOpenChange={setIsManualFilesOpen}
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground">
                            Manual files ({manualFiles.length + uploadedManualDocs.length})
                          </p>
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm" className="flex items-center gap-1">
                              {isManualFilesOpen ? (
                                <ChevronDown className="h-3 w-3" />
                              ) : (
                                <ChevronRight className="h-3 w-3" />
                              )}
                              <span className="text-xs">
                                {isManualFilesOpen ? "Hide" : "Show"}
                              </span>
                            </Button>
                          </CollapsibleTrigger>
                        </div>
                        <CollapsibleContent className="space-y-1 pt-1">
                          {manualFiles.length > 0 && (
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground mb-1">Selected manual files:</p>
                              {manualFiles.map((file, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center gap-2 text-sm bg-muted p-2 rounded w-full max-w-full overflow-hidden"
                                >
                                  <FileText className="h-4 w-4" />
                                  <span className="flex-1 min-w-0 overflow-hidden text-ellipsis break-words break-all whitespace-pre-wrap">
                                    {file.name}
                                  </span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveManualFile(idx)}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                          {uploadedManualDocs.length > 0 && (
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground mb-1">Uploaded manual documents:</p>
                              {uploadedManualDocs.map((doc, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center gap-2 text-sm bg-green-50 dark:bg-green-900/20 p-2 rounded w-full max-w-full overflow-hidden"
                                >
                                  <FileText className="h-4 w-4 text-green-600 dark:text-green-400" />
                                  <span className="flex-1 min-w-0 overflow-hidden text-ellipsis break-words break-all whitespace-pre-wrap">
                                    {doc.name}
                                  </span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveUploadedManual(idx)}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </CollapsibleContent>
                      </Collapsible>
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
              {(isLoadingBOMs || isFetchingBOMs) ? (
                <div className="w-full max-w-md">
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <Select 
                  value={selectedBomId} 
                  onValueChange={(value) => {
                    setSelectedBomId(value);
                  }}
                  disabled={isLoadingBOMs || isFetchingBOMs}
                >
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
              )}
            </div>

            {(isLoadingBillMaterials || isFetchingBillMaterials) ? (
              <div className="space-y-6">
                {Array.from({ length: 3 }).map((_, cardIndex) => (
                  <Card key={cardIndex}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <Skeleton className="h-5 w-40" />
                        <Skeleton className="h-5 w-20" />
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
                          {Array.from({ length: 5 }).map((_, rowIndex) => (
                            <TableRow key={rowIndex}>
                              <TableCell>
                                <Skeleton className="h-4 w-32" />
                              </TableCell>
                              <TableCell>
                                <Skeleton className="h-4 w-24" />
                              </TableCell>
                              <TableCell>
                                <Skeleton className="h-4 w-24" />
                              </TableCell>
                              <TableCell>
                                <Skeleton className="h-4 w-24" />
                              </TableCell>
                              <TableCell>
                                <Skeleton className="h-4 w-20" />
                              </TableCell>
                              <TableCell>
                                <div className="flex space-x-2">
                                  <Skeleton className="h-8 w-8" />
                                  <Skeleton className="h-8 w-8" />
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
            ) : items.length === 0 ? (
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