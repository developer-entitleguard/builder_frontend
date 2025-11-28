import { useState, useEffect } from "react";
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
import { useGetBillOfMaterialsQuery, useGetBuilderItemsByBOMQuery } from "@/store/api/items";
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
  }>;
  manual_documents?: Array<{
    name: string;
    url: string;
    path: string;
  }>;
}

interface BillOfMaterials {
  id: string;
  bomName: string;
  projectName: string | null;
}

interface FormData {
  selected_items: RegistrationItem[];
}

interface ItemsSelectionFormProps {
  onNext: (data: FormData) => void;
  initialData?: {
    selected_items?: RegistrationItem[];
    [key: string]: unknown;
  };
  registrationId?: string;
}

const ItemsSelectionForm = ({ onNext, initialData, registrationId }: ItemsSelectionFormProps) => {
  const { user } = useAuth();
  const { updateRegistration } = useRegistrations();
  const { toast } = useToast();
  const [selectedBomId, setSelectedBomId] = useState<string>("");
  const [selectedItems, setSelectedItems] = useState<RegistrationItem[]>(
    Array.isArray(initialData?.selected_items) ? initialData.selected_items : []
  );
  const [saving, setSaving] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [showCustomItemModal, setShowCustomItemModal] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, boolean>>({});
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

  // Fetch BOMs from API
  const { 
    data: bomsData, 
    isLoading: loading, 
    error: bomsError 
  } = useGetBillOfMaterialsQuery(undefined);

  // Transform API response to component format
  const boms: BillOfMaterials[] = bomsData?.data || [];

  // Show error toast if BOMs API call fails
  useEffect(() => {
    if (bomsError) {
      toast({
        title: "Error fetching BOMs",
        description: "Failed to load Bill of Materials. Please try again.",
        variant: "destructive"
      });
    }
  }, [bomsError, toast]);

  // Fetch items by BOM and customer ID
  const { 
    data: itemsData, 
    isLoading: isLoadingItems,
    error: itemsError,
    refetch: refetchItems
  } = useGetBuilderItemsByBOMQuery(
    { 
      billMaterialId: selectedBomId, 
      customerId: registrationId || '' 
    },
    { 
      skip: !selectedBomId || !registrationId 
    }
  );

  // Transform API response to component format
  useEffect(() => {
    if (itemsData && selectedBomId && registrationId) {
      // Handle both success and "already mapped" cases - both return data
      const items = itemsData.data || [];
      
      if (items.length === 0) {
        // No items found or not yet mapped
        setSelectedItems([]);
        return;
      }

      const transformedItems: RegistrationItem[] = items.map((item) => {
        const builderItem = item.builderItem;
        return {
          id: item.id,
          name: builderItem.name,
          category: builderItem.category,
          brand: item.brand || builderItem.brand || '',
          model: item.model || builderItem.model || '',
          make: item.make || builderItem.make || '',
          description: builderItem.text || '',
          price: builderItem.price ? parseFloat(builderItem.price) : null,
          bom_id: selectedBomId,
          color: item.color || '',
          custom_notes: item.notes || '',
          serial_number: item.serialNumber || '',
          warranty_documents: [],
          manual_documents: [],
          is_custom: false
        };
      });
      
      setSelectedItems(transformedItems);
      
      if (transformedItems.length > 0) {
        toast({
          title: itemsData.success ? "Items loaded" : "Items already mapped",
          description: `${transformedItems.length} items loaded from BOM`,
        });
      }
    }
  }, [itemsData, selectedBomId, registrationId, toast]);

  // Show error toast if items API call fails
  useEffect(() => {
    if (itemsError && selectedBomId) {
      toast({
        title: "Error loading items",
        description: itemsError instanceof Error ? itemsError.message : "Failed to load items from BOM",
        variant: "destructive"
      });
    }
  }, [itemsError, selectedBomId, toast]);

  const handleBOMSelect = (bomId: string) => {
    setSelectedBomId(bomId);
    // Items will be loaded automatically via the query hook
  };

  const handleRemoveItem = (itemId: string) => {
    setSelectedItems(prev => prev.filter(item => item.id !== itemId));
  };

  const handleUpdateItem = (itemId: string, field: string, value: string) => {
    setSelectedItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, [field]: value } : item
    ));
  };

  const handleFileUpload = async (itemId: string, file: File, documentType: 'warranty' | 'manual') => {
    if (!user || !registrationId) return;

    const uploadKey = `${itemId}_${documentType}`;
    setUploadingFiles(prev => ({ ...prev, [uploadKey]: true }));

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

      setSelectedItems(prev => prev.map(item => {
        if (item.id === itemId) {
          if (documentType === 'warranty') {
            const warranty_documents = item.warranty_documents || [];
            return {
              ...item,
              warranty_documents: [...warranty_documents, {
                name: file.name,
                url: publicUrl,
                path: filePath
              }]
            };
          } else {
            const manual_documents = item.manual_documents || [];
            return {
              ...item,
              manual_documents: [...manual_documents, {
                name: file.name,
                url: publicUrl,
                path: filePath
              }]
            };
          }
        }
        return item;
      }));

      toast({
        title: `${documentType === 'warranty' ? 'Warranty' : 'Manual'} uploaded`,
        description: "The document has been uploaded successfully",
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload document",
        variant: "destructive"
      });
    } finally {
      setUploadingFiles(prev => ({ ...prev, [uploadKey]: false }));
    }
  };

  const handleRemoveDocument = async (itemId: string, documentPath: string, documentType: 'warranty' | 'manual') => {
    try {
      const { error } = await supabase.storage
        .from('item-documents')
        .remove([documentPath]);

      if (error) throw error;

      setSelectedItems(prev => prev.map(item => {
        if (item.id === itemId) {
          if (documentType === 'warranty') {
            return {
              ...item,
              warranty_documents: (item.warranty_documents || []).filter(doc => doc.path !== documentPath)
            };
          } else {
            return {
              ...item,
              manual_documents: (item.manual_documents || []).filter(doc => doc.path !== documentPath)
            };
          }
        }
        return item;
      }));

      toast({
        title: "Document removed",
        description: "The document has been removed successfully",
      });
    } catch (error) {
      toast({
        title: "Remove failed",
        description: error instanceof Error ? error.message : "Failed to remove document",
        variant: "destructive"
      });
    }
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

  const handleSaveCustomItem = () => {
    if (!newCustomItem.name.trim()) {
      toast({
        title: "Missing item name",
        description: "Please provide a name for the custom item",
        variant: "destructive"
      });
      return;
    }

    setSelectedItems(prev => [...prev, newCustomItem]);
    setShowCustomItemModal(false);
    toast({
      title: "Custom item added",
      description: "The custom item has been added to the selection",
    });
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
    } catch (error) {
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
                  {loading ? (
                    <SelectItem value="loading" disabled>
                      Loading BOMs...
                    </SelectItem>
                  ) : bomsError ? (
                    <SelectItem value="error" disabled>
                      Error loading BOMs
                    </SelectItem>
                  ) : boms.length === 0 ? (
                    <SelectItem value="empty" disabled>
                      No BOMs available
                    </SelectItem>
                  ) : (
                    boms.map((bom) => (
                      <SelectItem key={bom.id} value={bom.id}>
                        {bom.bomName} {bom.projectName && `(${bom.projectName})`}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {isLoadingItems && selectedBomId && registrationId && (
            <Card>
              <CardContent className="py-8">
                <p className="text-center text-muted-foreground">Loading items from BOM...</p>
              </CardContent>
            </Card>
          )}

          {!isLoadingItems && selectedItems.length > 0 && (
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
                                                  onClick={() => handleRemoveDocument(item.id, doc.path, 'warranty')}
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
                                                  onClick={() => handleRemoveDocument(item.id, doc.path, 'manual')}
                                                >
                                                  <X className="h-3 w-3" />
                                                </Button>
                                              </div>
                                            ))}
                                          </div>
                                        )}
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
                                      </div>
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
            <Button variant="outline" onClick={() => setShowCustomItemModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveCustomItem}>
              Add Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ItemsSelectionForm;
