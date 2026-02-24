import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRegistrations } from "@/hooks/useRegistrations";
import { useToast } from "@/hooks/use-toast";
import {
  useGetBillOfMaterialsQuery,
  useGetBillMaterialsQuery,
  useGetBuilderItemsByBOMQuery,
  useUpdateBuilderCustomerMapMutation,
  useLazyCheckExistingCustomerItemMapQuery,
  useGetCustomerDetailsQuery,
  useDeleteItemFileMutation,
} from "@/store/api";
import { useOrganization } from "@/hooks/useOrganization";
import { 
  Home, 
  Lightbulb, 
  Wrench, 
  Building,
  ChevronRight,
  Trash2,
  Plus,
  Edit2,
  FileText,
  X
} from "lucide-react";

interface BuilderItem {
  id: string;
  name: string;
  category: string;
  brand: string | null;
  model: string | null;
  make: string | null;
  description: string | null;
  price: number | null;
  bom_id: string | null;
  warranty_years?: number | null;
  manual_url?: string | null;
}

interface RegistrationItem extends BuilderItem {
  color?: string;
  custom_notes?: string;
  is_custom?: boolean;
  serial_number?: string;
  warranty_documents?: Array<{
    name: string;
    url: string;
    path: string;
    fileId?: string; // id for DELETE /api/itemfile/{id}
  }>;
  manual_documents?: Array<{
    name: string;
    url: string;
    path: string;
    fileId?: string;
  }>;
}

interface BillOfMaterials {
  id: string;
  name: string;
  project_name: string | null;
}

interface ItemsSelectionFormProps {
  onNext: (data: unknown) => void;
  initialData?: {
    selected_items?: RegistrationItem[];
  };
  registrationId?: string;
}

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

const getBuilderId = (): string | null => {
  try {
    const userData = localStorage.getItem("userData");
    if (!userData) return null;
    const parsed = JSON.parse(userData);
    const orgId = parsed?.userInfo?.builderOrganization?.id ?? parsed?.builderOrganization?.id ?? parsed?.builder_organization?.id;
    return orgId ?? parsed?.userInfo?.id ?? parsed?.id ?? null;
  } catch {
    return null;
  }
};

const ItemsSelectionForm = ({ onNext, initialData, registrationId }: ItemsSelectionFormProps) => {
  const { user } = useAuth();
  const { organization } = useOrganization();
  const { updateRegistration } = useRegistrations();
  const { toast } = useToast();
  const isAuthenticated = !!user || hasBuilderAuth();
  const [updateBuilderCustomerMap] = useUpdateBuilderCustomerMapMutation();
  const [deleteItemFile] = useDeleteItemFileMutation();

  const [selectedBomId, setSelectedBomId] = useState<string>("");
  const [selectedItems, setSelectedItems] = useState<RegistrationItem[]>(
    Array.isArray(initialData?.selected_items) ? initialData.selected_items : []
  );
  const [saving, setSaving] = useState(false);
  const [savingItemId, setSavingItemId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [showCustomItemModal, setShowCustomItemModal] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, boolean>>({});
  // Pending File objects to send with updateBuilderCustomerMap on Save (builder flow)
  const [pendingItemFiles, setPendingItemFiles] = useState<Record<string, { warranty?: File; manual?: File }>>({});
  const [newCustomItem, setNewCustomItem] = useState<RegistrationItem>({
    id: '',
    name: '',
    category: 'Other',
    brand: '',
    model: '',
    make: '',
    description: '',
    price: null,
    bom_id: null,
    color: '',
    custom_notes: '',
    is_custom: true,
    serial_number: '',
    warranty_documents: [],
    manual_documents: []
  });

  // BOM list from API (matches old project: /api/getbillofmaterials)
  const { data: bomsResponse, isLoading: loadingBoms } = useGetBillOfMaterialsQuery(undefined, {
    skip: !isAuthenticated,
  });
  const boms: BillOfMaterials[] = (bomsResponse?.data ?? []).map((b) => ({
    id: b.id,
    name: b.bomName,
    project_name: b.projectName ?? null,
  }));

  // Bill materials (items) for selected BOM from API (matches old project: /api/getbillmaterials)
  const { data: billMaterialsResponse } = useGetBillMaterialsQuery(selectedBomId, {
    skip: !selectedBomId,
  });
  const billMaterials = billMaterialsResponse?.data ?? [];


  const { data: builderItemsByBOMResponse } = useGetBuilderItemsByBOMQuery(
    selectedBomId && registrationId
      ? { billMaterialId: selectedBomId, customerId: registrationId }
      : // RTK Query will skip when arg is null
        (null as unknown as { billMaterialId: string; customerId: string }),
    {
      skip: !selectedBomId || !registrationId,
    }
  );

  const builderId = organization?.id ?? getBuilderId();
  // Customer details API: /api/customerdetails?builderId=...&customerId=...
  const { data: customerDetailsResponse } = useGetCustomerDetailsQuery(
    { builderId: builderId ?? '', customerId: registrationId ?? '' },
    { skip: !registrationId || !builderId }
  );
  // Existing customer item map: /api/check/customeritemmap/existing?customerId=... (trigger when registrationId is set)
  const [fetchExistingMap, { data: existingMapResponse }] = useLazyCheckExistingCustomerItemMapQuery();
  const existingMapData = useMemo(() => existingMapResponse?.data ?? [], [existingMapResponse?.data]);

  // When editing an existing customer that already has a BOM assigned in customerDetails,
  // pre-select that BOM in the dropdown so the UI reflects the actual BOM.
  useEffect(() => {
    const customerBomId =
      customerDetailsResponse?.data?.customer?.billOfMaterials?.id ??
      (customerDetailsResponse?.data?.customer as unknown as { bill_of_materials?: { id?: string } })?.bill_of_materials
        ?.id ??
      null;
    if (!selectedBomId && customerBomId) {
      setSelectedBomId(customerBomId);
    }
  }, [customerDetailsResponse, selectedBomId]);

  useEffect(() => {
    if (registrationId && registrationId.trim() !== '') {
      fetchExistingMap(registrationId);
    }
  }, [registrationId, fetchExistingMap]);

  type MapFile = { id: string; type: string; files: { id: string; name: string; filePath: string } };
  type ExistingMapEntry = {
    id: string;
    name: string | null;
    category: string | null;
    seller?: string | null;
    serialNumber?: string | null;
    make?: string | null;
    model?: string | null;
    brand?: string | null;
    color?: string | null;
    notes?: string | null;
    builderCustomerItemFiles?: MapFile[];
  };

  // When we have registrationId and existing map data from /api/check/customeritemmap/existing, show that data in the items section
  useEffect(() => {
    if (!registrationId || existingMapData.length === 0) return;
    const items: RegistrationItem[] = (existingMapData as ExistingMapEntry[]).map((m) => {
      const warranty_documents: { name: string; url: string; path: string; fileId?: string }[] = [];
      const manual_documents: { name: string; url: string; path: string; fileId?: string }[] = [];
      (m.builderCustomerItemFiles ?? []).forEach((f: MapFile) => {
        const doc = {
          name: f.files?.name ?? 'file',
          url: '',
          path: f.files?.filePath ?? f.files?.id ?? '',
          fileId: f.id,
        };
        if (f.type === 'warranty') warranty_documents.push(doc);
        else if (f.type === 'Manual') manual_documents.push(doc);
      });
      return {
        id: m.id,
        name: m.name ?? '',
        category: m.category ?? 'Other',
        brand: m.brand ?? '',
        model: m.model ?? '',
        make: m.make ?? '',
        description: '',
        price: null,
        bom_id: null,
        color: m.color ?? '',
        custom_notes: m.notes ?? '',
        is_custom: false,
        serial_number: m.serialNumber ?? '',
        warranty_documents,
        manual_documents,
      };
    });
    setSelectedItems(items);
  }, [registrationId, existingMapData]);

  // NOTE: We intentionally do NOT populate the items list from /api/getbillmaterials.
  // The items section is driven solely by /api/check/customeritemmap/existing so that
  // it always reflects the customer's mapped items, not raw BOM materials.

  const loading = loadingBoms;

  const handleBOMSelect = (bomId: string) => {
    setSelectedBomId(bomId);
  };

  // After /api/getbuilderitems/bybom has run successfully for the selected BOM,
  // fetch the existing customer item map so the mapped items are shown.
  useEffect(() => {
    if (!registrationId || !selectedBomId) return;
    if (!builderItemsByBOMResponse?.success) return;
    fetchExistingMap(registrationId);
  }, [registrationId, selectedBomId, builderItemsByBOMResponse, fetchExistingMap]);

  const handleRemoveItem = (itemId: string) => {
    setPendingItemFiles((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
    setSelectedItems((prev) => prev.filter((i) => i.id !== itemId));
    toast({ title: "Item removed", description: "The item has been removed from the list." });
  };

  const handleUpdateItem = (itemId: string, field: string, value: string) => {
    setSelectedItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, [field]: value } : item
    ));
  };

  const handleFileUpload = async (itemId: string, file: File, documentType: 'warranty' | 'manual') => {
    if (!registrationId) return;

    const uploadKey = `${itemId}_${documentType}`;
    setUploadingFiles((prev) => ({ ...prev, [uploadKey]: true }));

    const isBuilderFlow = hasBuilderAuth() && registrationId;
    if (isBuilderFlow) {
      setPendingItemFiles((prev) => ({
        ...prev,
        [itemId]: {
          ...prev[itemId],
          [documentType]: file,
        },
      }));
      setSelectedItems((prev) =>
        prev.map((item) => {
          if (item.id !== itemId) return item;
          const doc = { name: file.name, url: '', path: `pending_${file.name}` };
          if (documentType === 'warranty') {
            return { ...item, warranty_documents: [...(item.warranty_documents || []), doc] };
          }
          return { ...item, manual_documents: [...(item.manual_documents || []), doc] };
        })
      );
      setUploadingFiles((prev) => ({ ...prev, [uploadKey]: false }));
      toast({
        title: `${documentType === 'warranty' ? 'Warranty' : 'Manual'} added`,
        description: "Click Save to upload this file.",
      });
      return;
    }

    if (!user) {
      setUploadingFiles((prev) => ({ ...prev, [uploadKey]: false }));
      return;
    }

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${documentType}.${fileExt}`;
      const filePath = `${user.id}/${registrationId}/${itemId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('item-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('item-documents')
        .getPublicUrl(filePath);

      setSelectedItems((prev) =>
        prev.map((item) => {
          if (item.id !== itemId) return item;
          const doc = { name: file.name, url: publicUrl, path: filePath };
          if (documentType === 'warranty') {
            return { ...item, warranty_documents: [...(item.warranty_documents || []), doc] };
          }
          return { ...item, manual_documents: [...(item.manual_documents || []), doc] };
        })
      );

      toast({
        title: `${documentType === 'warranty' ? 'Warranty' : 'Manual'} uploaded`,
        description: "The document has been uploaded successfully",
      });
    } catch (error: unknown) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Upload failed",
        variant: "destructive",
      });
    } finally {
      setUploadingFiles((prev) => ({ ...prev, [uploadKey]: false }));
    }
  };

  const handleRemoveDocument = async (
    itemId: string,
    doc: { path: string; fileId?: string },
    documentType: 'warranty' | 'manual'
  ) => {
    const documentPath = doc.path;

    if (documentPath.startsWith('pending_')) {
      setPendingItemFiles((prev) => {
        const next = { ...prev };
        if (next[itemId]) {
          next[itemId] = { ...next[itemId], [documentType]: undefined };
          if (!next[itemId].warranty && !next[itemId].manual) delete next[itemId];
        }
        return next;
      });
      setSelectedItems((prev) =>
        prev.map((item) => {
          if (item.id !== itemId) return item;
          if (documentType === 'warranty') {
            return { ...item, warranty_documents: (item.warranty_documents || []).filter((d) => d.path !== documentPath) };
          }
          return { ...item, manual_documents: (item.manual_documents || []).filter((d) => d.path !== documentPath) };
        })
      );
      toast({ title: "Document removed", description: "The document has been removed." });
      return;
    }

    if (doc.fileId) {
      try {
        await deleteItemFile(doc.fileId).unwrap();
        if (registrationId) fetchExistingMap(registrationId);
      } catch (err: unknown) {
        const message = err && typeof err === "object" && "data" in err ? (err as { data?: string }).data : (err as Error)?.message;
        toast({
          title: "Error deleting file",
          description: String(message ?? "Failed to delete file"),
          variant: "destructive",
        });
        return;
      }
    } else {
      try {
        const { error } = await supabase.storage.from('item-documents').remove([documentPath]);
        if (error) throw error;
      } catch (error: unknown) {
        toast({
          title: "Remove failed",
          description: error instanceof Error ? error.message : "Remove failed",
          variant: "destructive",
        });
        return;
      }
    }

    setSelectedItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        if (documentType === 'warranty') {
          return { ...item, warranty_documents: (item.warranty_documents || []).filter((d) => d.path !== documentPath) };
        }
        return { ...item, manual_documents: (item.manual_documents || []).filter((d) => d.path !== documentPath) };
      })
    );
    toast({ title: "Document removed", description: "The document has been removed successfully." });
  };

  const handleOpenCustomItemModal = () => {
    setNewCustomItem({
      id: `custom_${Date.now()}`,
      name: '',
      category: 'Other',
      brand: '',
      model: '',
      make: '',
      description: '',
      price: null,
      bom_id: null,
      color: '',
      custom_notes: '',
      is_custom: true,
      serial_number: '',
      warranty_documents: [],
      manual_documents: []
    });
    setShowCustomItemModal(true);
  };

  const handleSaveCustomItem = async () => {
    if (!newCustomItem.name.trim()) {
      toast({
        title: "Missing item name",
        description: "Please provide a name for the custom item",
        variant: "destructive"
      });
      return;
    }

    if (registrationId && selectedBomId) {
      setSaving(true);
      try {
        await updateBuilderCustomerMap({
          builderCustomerId: registrationId,
          builderItemId: newCustomItem.id,
          billMaterialId: selectedBomId,
          name: newCustomItem.name.trim(),
          category: newCustomItem.category || undefined,
          make: newCustomItem.make?.trim() || undefined,
          brand: newCustomItem.brand?.trim() || undefined,
          model: newCustomItem.model?.trim() || undefined,
          color: newCustomItem.color?.trim() || undefined,
          serialNumber: newCustomItem.serial_number?.trim() || undefined,
          notes: newCustomItem.custom_notes?.trim() || undefined,
        }).unwrap();
        setSelectedItems(prev => [...prev, newCustomItem]);
        setShowCustomItemModal(false);
        toast({
          title: "Custom item added",
          description: "The item has been saved and added to the selection.",
        });
      } catch (err: unknown) {
        const message = err && typeof err === "object" && "data" in err ? (err as { data?: string }).data : (err as Error)?.message;
        toast({
          title: "Error adding item",
          description: String(message ?? "Failed to add item"),
          variant: "destructive",
        });
      } finally {
        setSaving(false);
      }
    } else {
      setSelectedItems(prev => [...prev, newCustomItem]);
      setShowCustomItemModal(false);
      toast({
        title: "Custom item added",
        description: "The custom item has been added to the selection.",
      });
    }
  };

  const handleSaveItemEdit = async (item: RegistrationItem) => {
    if (!registrationId || !selectedBomId) {
      toast({
        title: "Cannot save",
        description: "Customer and BOM must be set to save item details.",
        variant: "destructive"
      });
      return;
    }
    setSavingItemId(item.id);
    try {
      const pending = pendingItemFiles[item.id];
      const builderItemFilesDtos: Array<{ type: 'warranty' | 'Manual'; file: File }> = [];
      if (pending?.warranty) builderItemFilesDtos.push({ type: 'warranty', file: pending.warranty });
      if (pending?.manual) builderItemFilesDtos.push({ type: 'Manual', file: pending.manual });

      await updateBuilderCustomerMap({
        builderCustomerId: registrationId,
        builderItemId: item.id,
        billMaterialId: item.bom_id ?? selectedBomId,
        make: item.make || undefined,
        brand: item.brand || undefined,
        model: item.model || undefined,
        color: item.color || undefined,
        serialNumber: item.serial_number || undefined,
        notes: item.custom_notes || undefined,
        name: item.name || undefined,
        category: item.category || undefined,
        ...(builderItemFilesDtos.length > 0 && { builderItemFilesDtos }),
      }).unwrap();

      setPendingItemFiles((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
      setEditingItemId(null);
      if (registrationId) fetchExistingMap(registrationId);
      toast({
        title: "Item saved",
        description: "Item details and files have been saved successfully.",
      });
    } catch (error: unknown) {
      const err = error as { data?: string; message?: string };
      toast({
        title: "Error saving item",
        description: err?.data ?? err?.message ?? "Failed to save item",
        variant: "destructive",
      });
    } finally {
      setSavingItemId(null);
    }
  };

  const getCategoryIcon = (category: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      'Appliances': <Home className="h-5 w-5" />,
      'Kitchen': <Home className="h-5 w-5" />,
      'Bathroom': <Lightbulb className="h-5 w-5" />,
      'Electrical': <Lightbulb className="h-5 w-5" />,
      'Flooring': <Building className="h-5 w-5" />,
      'Trim': <Wrench className="h-5 w-5" />,
      'Other': <Building className="h-5 w-5" />
    };
    return iconMap[category] || <Building className="h-5 w-5" />;
  };

  const groupedItems = selectedItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, RegistrationItem[]>);

  const handleNext = async () => {
    if (!registrationId) {
      onNext({ selected_items: selectedItems });
      return;
    }

    setSaving(true);
    try {
      await updateRegistration(registrationId, {
        selected_items: selectedItems
      });
      
      toast({
        title: "Items saved",
        description: "Your item selection has been saved successfully",
      });
      
      onNext({ selected_items: selectedItems });
    } catch (error: unknown) {
      toast({
        title: "Error saving items",
        description: error instanceof Error ? error.message : "Failed to save items",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Select Warranty Items</h2>
        <p className="text-muted-foreground">
          Choose a Bill of Materials and add details for each item
        </p>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">Loading...</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Select Bill of Materials</CardTitle>
              <CardDescription>Choose a BOM to load items from</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={selectedBomId} onValueChange={handleBOMSelect}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select a Bill of Materials" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  {boms.map((bom) => (
                    <SelectItem key={bom.id} value={bom.id}>
                      {bom.name} {bom.project_name && `(${bom.project_name})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {selectedItems.length > 0 && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Items ({selectedItems.length})</span>
                    <Button onClick={handleOpenCustomItemModal} variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Custom Item
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="multiple" className="w-full">
                    {Object.entries(groupedItems).map(([category, items]) => (
                      <AccordionItem key={category} value={category}>
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center gap-2">
                            {getCategoryIcon(category)}
                            <span className="font-semibold">{category}</span>
                            <Badge variant="secondary" className="ml-2">
                              {items.length}
                            </Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-4 pt-2">
                            {items.map((item) => {
                              const isEditing = editingItemId === item.id;
                              const isUploading = uploadingFiles[item.id];
                              
                              return (
                                <div key={item.id} className="border rounded-lg p-4 space-y-3">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <h4 className="font-semibold">{item.name}</h4>
                                      {item.is_custom && (
                                        <Badge variant="outline" className="text-xs mt-1">
                                          Custom Item
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="flex gap-2">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setEditingItemId(isEditing ? null : item.id)}
                                      >
                                        <Edit2 className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleRemoveItem(item.id)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>

                                  {isEditing ? (
                                    <div className="grid grid-cols-2 gap-3">
                                      <div>
                                        <Label htmlFor={`make-${item.id}`}>Make</Label>
                                        <Input
                                          id={`make-${item.id}`}
                                          value={item.make || ''}
                                          onChange={(e) => handleUpdateItem(item.id, 'make', e.target.value)}
                                          placeholder="e.g., Samsung"
                                        />
                                      </div>
                                      <div>
                                        <Label htmlFor={`brand-${item.id}`}>Brand</Label>
                                        <Input
                                          id={`brand-${item.id}`}
                                          value={item.brand || ''}
                                          onChange={(e) => handleUpdateItem(item.id, 'brand', e.target.value)}
                                          placeholder="e.g., SmartThings"
                                        />
                                      </div>
                                      <div>
                                        <Label htmlFor={`model-${item.id}`}>Model</Label>
                                        <Input
                                          id={`model-${item.id}`}
                                          value={item.model || ''}
                                          onChange={(e) => handleUpdateItem(item.id, 'model', e.target.value)}
                                          placeholder="e.g., XYZ-123"
                                        />
                                      </div>
                                      <div>
                                        <Label htmlFor={`color-${item.id}`}>Color</Label>
                                        <Input
                                          id={`color-${item.id}`}
                                          value={item.color || ''}
                                          onChange={(e) => handleUpdateItem(item.id, 'color', e.target.value)}
                                          placeholder="e.g., White"
                                        />
                                      </div>
                                      <div>
                                        <Label htmlFor={`serial-${item.id}`}>Serial Number</Label>
                                        <Input
                                          id={`serial-${item.id}`}
                                          value={item.serial_number || ''}
                                          onChange={(e) => handleUpdateItem(item.id, 'serial_number', e.target.value)}
                                          placeholder="Enter serial number"
                                        />
                                      </div>
                                      <div>
                                        <Label htmlFor={`notes-${item.id}`}>Notes</Label>
                                        <Input
                                          id={`notes-${item.id}`}
                                          value={item.custom_notes || ''}
                                          onChange={(e) => handleUpdateItem(item.id, 'custom_notes', e.target.value)}
                                          placeholder="Additional notes"
                                        />
                                      </div>
                                      <div>
                                        <Label htmlFor={`warranty-${item.id}`}>Upload Warranty</Label>
                                        <div className="flex items-center gap-2">
                                          <Input
                                            id={`warranty-${item.id}`}
                                            type="file"
                                            onChange={(e) => {
                                              const file = e.target.files?.[0];
                                              if (file) handleFileUpload(item.id, file, 'warranty');
                                            }}
                                            disabled={uploadingFiles[`${item.id}_warranty`]}
                                            className="flex-1"
                                          />
                                          {uploadingFiles[`${item.id}_warranty`] && (
                                            <span className="text-sm text-muted-foreground">Uploading...</span>
                                          )}
                                        </div>
                                        {item.warranty_documents && item.warranty_documents.length > 0 && (
                                          <div className="mt-2 space-y-1">
                                            {item.warranty_documents.map((doc, idx) => (
                                              <div key={idx} className="flex items-center gap-2 text-sm">
                                                <FileText className="h-4 w-4" />
                                                <span className="flex-1">{doc.name}</span>
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={() => handleRemoveDocument(item.id, doc, 'warranty')}
                                                >
                                                  <X className="h-3 w-3" />
                                                </Button>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                      <div>
                                        <Label htmlFor={`manual-${item.id}`}>Upload Manual</Label>
                                        <div className="flex items-center gap-2">
                                          <Input
                                            id={`manual-${item.id}`}
                                            type="file"
                                            onChange={(e) => {
                                              const file = e.target.files?.[0];
                                              if (file) handleFileUpload(item.id, file, 'manual');
                                            }}
                                            disabled={uploadingFiles[`${item.id}_manual`]}
                                            className="flex-1"
                                          />
                                          {uploadingFiles[`${item.id}_manual`] && (
                                            <span className="text-sm text-muted-foreground">Uploading...</span>
                                          )}
                                        </div>
                                        {item.manual_documents && item.manual_documents.length > 0 && (
                                          <div className="mt-2 space-y-1">
                                            {item.manual_documents.map((doc, idx) => (
                                              <div key={idx} className="flex items-center gap-2 text-sm">
                                                <FileText className="h-4 w-4" />
                                                <span className="flex-1">{doc.name}</span>
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={() => handleRemoveDocument(item.id, doc, 'manual')}
                                                >
                                                  <X className="h-3 w-3" />
                                                </Button>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                      <div className="col-span-2 flex justify-end gap-2 pt-2">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => setEditingItemId(null)}
                                          disabled={savingItemId === item.id}
                                        >
                                          Cancel
                                        </Button>
                                        <Button
                                          size="sm"
                                          onClick={() => handleSaveItemEdit(item)}
                                          disabled={savingItemId === item.id}
                                        >
                                          {savingItemId === item.id ? "Saving..." : "Save"}
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="space-y-2">
                                      <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                                        {item.make && <span>Make: {item.make}</span>}
                                        {item.brand && <span>• Brand: {item.brand}</span>}
                                        {item.model && <span>• Model: {item.model}</span>}
                                        {item.color && <span>• Color: {item.color}</span>}
                                        {item.serial_number && <span>• Serial: {item.serial_number}</span>}
                                        {item.warranty_years && <span>• Warranty: {item.warranty_years} yr{item.warranty_years > 1 ? 's' : ''}</span>}
                                      </div>
                                      {item.manual_url && (
                                        <div className="text-xs text-muted-foreground">
                                          <a href={item.manual_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                                            <FileText className="h-3 w-3" />
                                            View BOM Manual
                                          </a>
                                        </div>
                                      )}
                                      {item.custom_notes && (
                                        <div className="text-xs text-muted-foreground">
                                          Notes: {item.custom_notes}
                                        </div>
                                      )}
                                      <div className="flex gap-3 text-xs text-muted-foreground">
                                        {item.warranty_documents && item.warranty_documents.length > 0 && (
                                          <div className="flex items-center gap-1">
                                            <FileText className="h-3 w-3" />
                                            <span>{item.warranty_documents.length} warranty doc(s)</span>
                                          </div>
                                        )}
                                        {item.manual_documents && item.manual_documents.length > 0 && (
                                          <div className="flex items-center gap-1">
                                            <FileText className="h-3 w-3" />
                                            <span>{item.manual_documents.length} manual doc(s)</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button
                  onClick={handleNext}
                  disabled={selectedItems.length === 0 || saving}
                  size="lg"
                >
                  {saving ? "Saving..." : "Continue to Review"}
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </>
      )}

      <Dialog open={showCustomItemModal} onOpenChange={setShowCustomItemModal}>
        <DialogContent className="sm:max-w-[500px] bg-background">
          <DialogHeader>
            <DialogTitle>Add Custom Item</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="custom-name">Item Name *</Label>
              <Input
                id="custom-name"
                value={newCustomItem.name}
                onChange={(e) => setNewCustomItem({ ...newCustomItem, name: e.target.value })}
                placeholder="Enter item name"
              />
            </div>
            <div>
              <Label htmlFor="custom-category">Category</Label>
              <Select 
                value={newCustomItem.category} 
                onValueChange={(value) => setNewCustomItem({ ...newCustomItem, category: value })}
              >
                <SelectTrigger id="custom-category" className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="Appliances">Appliances</SelectItem>
                  <SelectItem value="Kitchen">Kitchen</SelectItem>
                  <SelectItem value="Bathroom">Bathroom</SelectItem>
                  <SelectItem value="Electrical">Electrical</SelectItem>
                  <SelectItem value="Flooring">Flooring</SelectItem>
                  <SelectItem value="Trim">Trim</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="custom-make">Make</Label>
                <Input
                  id="custom-make"
                  value={newCustomItem.make || ''}
                  onChange={(e) => setNewCustomItem({ ...newCustomItem, make: e.target.value })}
                  placeholder="e.g., Samsung"
                />
              </div>
              <div>
                <Label htmlFor="custom-brand">Brand</Label>
                <Input
                  id="custom-brand"
                  value={newCustomItem.brand || ''}
                  onChange={(e) => setNewCustomItem({ ...newCustomItem, brand: e.target.value })}
                  placeholder="e.g., SmartThings"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="custom-model">Model</Label>
                <Input
                  id="custom-model"
                  value={newCustomItem.model || ''}
                  onChange={(e) => setNewCustomItem({ ...newCustomItem, model: e.target.value })}
                  placeholder="e.g., XYZ-123"
                />
              </div>
              <div>
                <Label htmlFor="custom-color">Color</Label>
                <Input
                  id="custom-color"
                  value={newCustomItem.color || ''}
                  onChange={(e) => setNewCustomItem({ ...newCustomItem, color: e.target.value })}
                  placeholder="e.g., White"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="custom-serial">Serial Number</Label>
              <Input
                id="custom-serial"
                value={newCustomItem.serial_number || ''}
                onChange={(e) => setNewCustomItem({ ...newCustomItem, serial_number: e.target.value })}
                placeholder="Enter serial number"
              />
            </div>
            <div>
              <Label htmlFor="custom-notes">Notes</Label>
              <Input
                id="custom-notes"
                value={newCustomItem.custom_notes || ''}
                onChange={(e) => setNewCustomItem({ ...newCustomItem, custom_notes: e.target.value })}
                placeholder="Additional notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCustomItemModal(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSaveCustomItem} disabled={saving}>
              {saving ? "Adding..." : "Add Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ItemsSelectionForm;
