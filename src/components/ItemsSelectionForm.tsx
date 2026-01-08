import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useCheckExistingCustomerItemMapQuery, useGetBillOfMaterialsQuery, useLazyGetBuilderItemsByBOMQuery } from "@/store/api/items";
import { useGetCustomerDetailsQuery, useLazyGetCustomerDetailsQuery } from "@/lib/api/services/customerDetails";
import { skipToken } from "@reduxjs/toolkit/query";
import { getApiBaseUrl } from "@/lib/config";
import { useUpdateBuilderCustomerMapMutation } from "@/lib/api/services/builderCustomer";
import { 
  Home, 
  Lightbulb, 
  Wrench, 
  Building,
  ChevronRight,
  Trash2,
  Plus,
  Edit2,
  Save,
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
  builderItemId?: string;
  seller?: string;
  warranty_documents?: Array<{
    id?: string;
    name: string;
    url: string;
    path: string;
  }>;
  manual_documents?: Array<{
    id?: string;
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

type CustomerItemMapEntry = {
  id: string;
  billOfMaterials?: { id: string; bomName?: string; projectName?: string };
  builderItem?: {
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
    isActive: boolean;
    status: string;
    purchaser?: string | null;
    billOfMaterials?: { id: string; bomName?: string; projectName?: string };
  };
  seller: string | null;
  serialNumber: string | null;
  make: string | null;
  model: string | null;
  brand: string | null;
  color: string | null;
  notes: string | null;
  files: unknown;
  builderCustomerItemFiles?: Array<{
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
};

interface ItemsSelectionFormProps {
  onNext: (data: FormData) => void;
  initialData?: {
    selected_items?: RegistrationItem[];
    [key: string]: unknown;
  };
  registrationId?: string;
  billMaterialId?: string;
}

const ItemsSelectionForm = ({ onNext, initialData, registrationId, billMaterialId }: ItemsSelectionFormProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [updateBuilderCustomerMap] = useUpdateBuilderCustomerMapMutation();
  // Initialize selectedBomId from billMaterialId prop if available
  const [selectedBomId, setSelectedBomId] = useState<string>(billMaterialId || "");
  const [selectedItems, setSelectedItems] = useState<RegistrationItem[]>(
    Array.isArray(initialData?.selected_items) ? initialData.selected_items : []
  );

  // Restore selectedBomId from billMaterialId prop or initialData when component mounts or props change
  useEffect(() => {
    // Priority: billMaterialId prop > initialData items
    if (billMaterialId) {
      setSelectedBomId(billMaterialId);
    } else if (initialData?.selected_items && Array.isArray(initialData.selected_items) && initialData.selected_items.length > 0) {
      // Get bom_id from the first item (all items should have the same bom_id)
      const firstItem = initialData.selected_items[0] as RegistrationItem;
      if (firstItem?.bom_id) {
        setSelectedBomId(firstItem.bom_id);
      }
    }
  }, [initialData, billMaterialId]);
  const [saving, setSaving] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [showCustomItemModal, setShowCustomItemModal] = useState(false);
  const [showMappedWarning, setShowMappedWarning] = useState(false);
  const [pendingBomId, setPendingBomId] = useState<string | null>(null);
  const [warningLoading, setWarningLoading] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, boolean>>({});
  const [pendingFiles, setPendingFiles] = useState<Record<string, { warranty: File[]; manual: File[] }>>({});
  const fileInputRefs = useRef<Record<string, { warranty: HTMLInputElement | null; manual: HTMLInputElement | null }>>({});
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
    builderItemId: '',
    warranty_documents: [],
    manual_documents: []
  });

  // Fetch BOMs from API
  const { 
    data: bomsData, 
    isLoading: loading, 
    error: bomsError 
  } = useGetBillOfMaterialsQuery(undefined, {
    refetchOnMountOrArgChange: true
  });

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

  const { 
    data: existingItemsData, 
    isLoading: isLoadingItems,
    error: existingItemsError,
    refetch: refetchItems
  } = useCheckExistingCustomerItemMapQuery(registrationId || '', {
    skip: !registrationId
  });
  const [triggerGetBuilderItems, { isFetching: isFetchingBomItems }] = useLazyGetBuilderItemsByBOMQuery();
  const [triggerGetCustomerDetails] = useLazyGetCustomerDetailsQuery();
  const { data: customerDetailsData } = useGetCustomerDetailsQuery(
    user?.id && registrationId
      ? { builderId: user.id as string, customerId: registrationId }
      : skipToken
  );

  useEffect(() => {
    if (selectedBomId || !customerDetailsData?.data?.customer?.billOfMaterials?.id) return;
    setSelectedBomId(customerDetailsData.data.customer.billOfMaterials.id);
  }, [selectedBomId, customerDetailsData]);

  useEffect(() => {
    if (selectedBomId || !registrationId) return;
    const mappedBomId =
      existingItemsData?.data?.find(
        (item: CustomerItemMapEntry) => item.billOfMaterials?.id || item.builderItem?.billOfMaterials?.id
      )?.billOfMaterials?.id ??
      existingItemsData?.data?.find(
        (item: CustomerItemMapEntry) => item.builderItem?.billOfMaterials?.id
      )?.builderItem?.billOfMaterials?.id;

    if (mappedBomId) {
      setSelectedBomId(mappedBomId);
    }
  }, [selectedBomId, registrationId, existingItemsData]);


  useEffect(() => {
    if (existingItemsData && registrationId) {
      try {
        const items = existingItemsData.data || [];

        if (items.length === 0) {
          setSelectedItems([]);
          return;
        }

        const transformedItems: RegistrationItem[] = items
          .filter((item) => item && item.id)
          .map((item: CustomerItemMapEntry) => {
            const builderItem = item.builderItem;

            const warranty_documents =
              item.builderCustomerItemFiles
                ?.filter((f) => f.type === 'warranty' && f.files)
                .map((f) => ({
                  id: f.id,
                  name: f.files.name,
                  url: f.files.filePath,
                  path: f.files.filePath,
                })) || [];

            const manual_documents =
              item.builderCustomerItemFiles
                ?.filter((f) => f.type === 'Manual' && f.files)
                .map((f) => ({
                  id: f.id,
                  name: f.files.name,
                  url: f.files.filePath,
                  path: f.files.filePath,
                })) || [];

            if (builderItem) {
              return {
                id: item.id,
                name: builderItem.name,
                category: builderItem.category,
                brand: item.brand || builderItem.brand || null,
                model: item.model || builderItem.model || null,
                make: item.make || builderItem.make || null,
                description: builderItem.text || null,
                price: builderItem.price ? parseFloat(builderItem.price) : null,
                bom_id: selectedBomId || item.billOfMaterials?.id || builderItem.billOfMaterials?.id || null,
                color: item.color || null,
                custom_notes: item.notes || null,
                serial_number: item.serialNumber || null,
                builderItemId: builderItem.id,
                seller: item.seller || null,
                warranty_documents,
                manual_documents,
                is_custom: false
              } as RegistrationItem;
            }
            const nameParts = [item.brand, item.model, item.make].filter(Boolean);
            const displayName = nameParts.length > 0 
              ? nameParts.join(' ') 
              : (item.serialNumber ? `Item ${item.serialNumber}` : 'Custom Item');

            return {
              id: item.id,
              name: displayName,
              category: 'Other',
              brand: item.brand || null,
              model: item.model || null,
              make: item.make || null,
              description: null,
              price: null,
              bom_id: selectedBomId || item.billOfMaterials?.id || null,
              color: item.color || null,
              custom_notes: item.notes || null,
              serial_number: item.serialNumber || null,
              builderItemId: null,
              seller: item.seller || null,
              warranty_documents,
              manual_documents,
              is_custom: true
            } as RegistrationItem;
          });

        setSelectedItems(transformedItems);
      } catch (error) {
        console.error('Error processing existing items data:', error);
        toast({
          title: "Error processing items",
          description: "Failed to process items from existing map. Please try again.",
          variant: "destructive"
        });
        setSelectedItems([]);
      }
    } else if (existingItemsData && existingItemsData.data && existingItemsData.data.length === 0) {
      setSelectedItems([]);
    }
  }, [existingItemsData, selectedBomId, registrationId, toast]);

  // Show error toast if items API call fails
  useEffect(() => {
    if (existingItemsError) {
      const message =
        existingItemsError && typeof existingItemsError === 'object' && 'data' in existingItemsError
          ? String((existingItemsError as { data?: { message?: string } }).data?.message || 'Failed to load items')
          : 'Failed to load items';
      toast({
        title: "Error loading items",
        description: message,
        variant: "destructive"
      });
    }
  }, [existingItemsError, toast]);

  const handleBOMSelect = async (bomId: string) => {
    if (!registrationId) {
      toast({
        title: "Registration ID required",
        description: "Please complete the customer details step first.",
        variant: "destructive"
      });
      return;
    }
    if (existingItemsData?.data && existingItemsData.data.length > 0) {
      setPendingBomId(bomId);
      setShowMappedWarning(true);
      return;
    }

    try {
      await triggerGetBuilderItems(
        { billMaterialId: bomId, customerId: registrationId },
        true
      ).unwrap();
      await refetchItems();
      setSelectedBomId(bomId);
      toast({
        title: "BOM selected",
        description: "Items have been loaded from the selected BOM."
      });
    } catch (error) {
      const message =
        error && typeof error === 'object' && 'data' in error
          ? String((error as { data?: { message?: string } }).data?.message || 'Failed to load BOM items')
          : 'Failed to load BOM items';
      toast({
        title: "Unable to load BOM items",
        description: message,
        variant: "destructive"
      });
    }
  };

  const handleRemoveItem = (itemId: string) => {
    setSelectedItems(prev => prev.filter(item => item.id !== itemId));
  };

  const handleConfirmBomChange = async () => {
    if (!pendingBomId || !registrationId) {
      setShowMappedWarning(false);
      setPendingBomId(null);
      return;
    }
    setWarningLoading(true);
    try {
      await triggerGetBuilderItems({
        billMaterialId: pendingBomId,
        customerId: registrationId
      }, true).unwrap();

      await refetchItems();

      if (user?.id) {
        await triggerGetCustomerDetails({
          builderId: user.id as string,
          customerId: registrationId
        }, true).unwrap();
      }

      setSelectedBomId(pendingBomId);
      toast({
        title: "BOM updated",
        description: "Items have been refreshed for the selected BOM."
      });
    } catch (error) {
      const message =
        error && typeof error === 'object' && 'data' in error
          ? String((error as { data?: { message?: string } }).data?.message || 'Failed to load BOM items')
          : 'Failed to load BOM items';
      toast({
        title: "Unable to switch BOM",
        description: message,
        variant: "destructive"
      });
    } finally {
      setWarningLoading(false);
      setShowMappedWarning(false);
      setPendingBomId(null);
    }
  };

  const handleUpdateItem = (itemId: string, field: string, value: string) => {
    setSelectedItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, [field]: value } : item
    ));
  };

  const handleFileSelect = (itemId: string, files: FileList | null, documentType: 'warranty' | 'manual', inputElement: HTMLInputElement | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    setPendingFiles(prev => ({
      ...prev,
      [itemId]: {
        warranty: documentType === 'warranty' 
          ? [...(prev[itemId]?.warranty || []), ...fileArray]
          : (prev[itemId]?.warranty || []),
        manual: documentType === 'manual'
          ? [...(prev[itemId]?.manual || []), ...fileArray]
          : (prev[itemId]?.manual || [])
      }
    }));

    // Clear the input value so it doesn't show file count
    if (inputElement) {
      inputElement.value = '';
    }

    toast({
      title: `${fileArray.length} file${fileArray.length > 1 ? 's' : ''} selected`,
      description: `${documentType === 'warranty' ? 'Warranty' : 'Manual'} file${fileArray.length > 1 ? 's' : ''} will be uploaded when you save`,
    });
  };

  const handleRemovePendingFile = (itemId: string, fileIndex: number, documentType: 'warranty' | 'manual') => {
    setPendingFiles(prev => {
      const itemFiles = prev[itemId];
      if (!itemFiles) return prev;

      const newFiles = {
        ...prev,
        [itemId]: {
          warranty: documentType === 'warranty' 
            ? itemFiles.warranty.filter((_, idx) => idx !== fileIndex)
            : itemFiles.warranty,
          manual: documentType === 'manual'
            ? itemFiles.manual.filter((_, idx) => idx !== fileIndex)
            : itemFiles.manual
        }
      };

      // Remove item entry if both arrays are empty
      if (newFiles[itemId].warranty.length === 0 && newFiles[itemId].manual.length === 0) {
        delete newFiles[itemId];
      }

      return newFiles;
    });

    // Clear the input value when all files are removed
    const inputRef = fileInputRefs.current[itemId]?.[documentType];
    if (inputRef) {
      inputRef.value = '';
    }
  };

  const handleFileUpload = async (itemId: string, file: File, documentType: 'warranty' | 'manual') => {
    if (!user || !registrationId) return;

    const uploadKey = `${itemId}_${documentType}`;
    setUploadingFiles(prev => ({ ...prev, [uploadKey]: true }));

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

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('itemId', itemId);
      formData.append('registrationId', registrationId);
      formData.append('documentType', documentType);

      // Get API base URL
      const apiBaseUrl = getApiBaseUrl();
      const url = import.meta.env.DEV
        ? `/api/upload/item-document`
        : `${apiBaseUrl}/api/upload/item-document`;

      // Upload file to API
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: authToken ? `Bearer ${authToken}` : '',
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to upload document: ${response.statusText}`);
      }

      const result = await response.json();
      const fileUrl = result.url || result.data?.url || '';
      const filePath = result.path || result.data?.path || '';

      setSelectedItems(prev => prev.map(item => {
        if (item.id === itemId) {
          if (documentType === 'warranty') {
            const warranty_documents = item.warranty_documents || [];
            return {
              ...item,
              warranty_documents: [...warranty_documents, {
                name: file.name,
                url: fileUrl,
                path: filePath
              }]
            };
          } else {
            const manual_documents = item.manual_documents || [];
            return {
              ...item,
              manual_documents: [...manual_documents, {
                name: file.name,
                url: fileUrl,
                path: filePath
              }]
            };
          }
        }
        return item;
      }));

      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to upload document" };
    } finally {
      setUploadingFiles(prev => ({ ...prev, [uploadKey]: false }));
    }
  };

  const uploadPendingFiles = async (itemId: string) => {
    const itemPendingFiles = pendingFiles[itemId];
    if (!itemPendingFiles) return;

    const allFiles = [
      ...itemPendingFiles.warranty.map(f => ({ file: f, type: 'warranty' as const })),
      ...itemPendingFiles.manual.map(f => ({ file: f, type: 'manual' as const }))
    ];

    if (allFiles.length === 0) return;

    const uploadKey = `${itemId}_upload`;
    setUploadingFiles(prev => ({ ...prev, [uploadKey]: true }));

    try {
      const uploadPromises = allFiles.map(({ file, type }) => 
        handleFileUpload(itemId, file, type)
      );

      const results = await Promise.all(uploadPromises);
      const failed = results.filter(r => !r.success);

      if (failed.length > 0) {
        toast({
          title: "Some uploads failed",
          description: `${failed.length} of ${allFiles.length} file${allFiles.length > 1 ? 's' : ''} failed to upload`,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Files uploaded",
          description: `All ${allFiles.length} file${allFiles.length > 1 ? 's' : ''} uploaded successfully`,
        });
      }

      // Clear pending files for this item
      setPendingFiles(prev => {
        const newFiles = { ...prev };
        delete newFiles[itemId];
        return newFiles;
      });

      // Clear file inputs after upload
      if (fileInputRefs.current[itemId]) {
        if (fileInputRefs.current[itemId].warranty) {
          fileInputRefs.current[itemId].warranty.value = '';
        }
        if (fileInputRefs.current[itemId].manual) {
          fileInputRefs.current[itemId].manual.value = '';
        }
      }
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload files",
        variant: "destructive"
      });
    } finally {
      setUploadingFiles(prev => ({ ...prev, [uploadKey]: false }));
    }
  };

  const handleRemoveDocument = async (itemId: string, documentId: string, documentType: 'warranty' | 'manual') => {
    // Remove from local state immediately (optimistic update)
    setSelectedItems(prev => prev.map(item => {
      if (item.id === itemId) {
        if (documentType === 'warranty') {
          const filtered = (item.warranty_documents || []).filter(doc => {
            // Remove document if id, path, url, or name matches
            return doc.id !== documentId &&
                   doc.path !== documentId && 
                   doc.url !== documentId && 
                   doc.name !== documentId;
          });
          return {
            ...item,
            warranty_documents: filtered
          };
        } else {
          const filtered = (item.manual_documents || []).filter(doc => {
            // Remove document if id, path, url, or name matches
            return doc.id !== documentId &&
                   doc.path !== documentId && 
                   doc.url !== documentId && 
                   doc.name !== documentId;
          });
          return {
            ...item,
            manual_documents: filtered
          };
        }
      }
      return item;
    }));

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
        ? `/api/itemfile/${documentId}`
        : `${apiBaseUrl}/api/itemfile/${documentId}`;

      // Remove file via API
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          Authorization: authToken ? `Bearer ${authToken}` : '',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        // If API call fails, we've already removed it from UI, so just show a warning
        toast({
          title: "Document removed from list",
          description: "Note: File may still exist on server",
          variant: "default"
        });
      } else {
        toast({
          title: "Document removed",
          description: "The document has been removed successfully",
        });
      }
    } catch (error) {
      // Already removed from UI, just show info
      toast({
        title: "Document removed from list",
        description: "The document has been removed from the list",
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

  const handleSaveCustomItem = async () => {
    if (!newCustomItem.name.trim()) {
      toast({
        title: "Missing item name",
        description: "Please provide a name for the custom item",
        variant: "destructive"
      });
      return;
    }

    if (!registrationId || !selectedBomId) {
      toast({
        title: "Missing required information",
        description: "Please select a BOM and ensure registration ID is available",
        variant: "destructive"
      });
      return;
    }

    try {
      // Call the API without id field (for creating new custom item)
      const result = await updateBuilderCustomerMap({
        builderCustomerId: registrationId,
        builderItemId: newCustomItem.builderItemId || '',
        billMaterialId: selectedBomId,
        seller: newCustomItem.seller,
        serialNumber: newCustomItem.serial_number,
        notes: newCustomItem.custom_notes,
        color: newCustomItem.color,
        model: newCustomItem.model || undefined,
        brand: newCustomItem.brand || undefined,
        make: newCustomItem.make || undefined,
        builderItemFilesDtos: undefined, // No files for new custom item
      }).unwrap();

      // Close modal first
      setShowCustomItemModal(false);
      
      // Reset custom item form
      setNewCustomItem({
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
        builderItemId: '',
        warranty_documents: [],
        manual_documents: []
      });
      
      // Refetch items to get the updated list with the new item from API
      await refetchItems();

      toast({
        title: "Custom item added",
        description: result.message || "The custom item has been added successfully",
      });
    } catch (error) {
      toast({
        title: "Failed to add custom item",
        description: error && typeof error === 'object' && 'data' in error 
          ? String((error.data as { message?: string })?.message || "Failed to add custom item")
          : "Failed to add custom item",
        variant: "destructive"
      });
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
    // Navigate to next page directly without calling Supabase
    onNext({ selected_items: selectedItems });
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

          {selectedBomId && !registrationId && (
            <Card>
              <CardContent className="py-8">
                <p className="text-center text-muted-foreground">
                  Please complete the customer details step first to load items from BOM.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Show message when no BOM is mapped for customer */}
          {!isLoadingItems && 
           existingItemsData?.success && 
           existingItemsData?.message === "No Bom is mapped for customer" && 
           (!existingItemsData?.data || existingItemsData.data === null || existingItemsData.data.length === 0) && (
            <Card>
              <CardContent className="py-8">
                <div className="text-center space-y-2">
                  <p className="text-muted-foreground">
                    {existingItemsData.message || "No BOM is mapped for this customer."}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Please select a Bill of Materials above to get started.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {(isLoadingItems || isFetchingBomItems) && selectedBomId && registrationId && (
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
                                        onClick={async () => {
                                          if (isEditing) {
                                            // Save: call API to update builder customer map
                                            if (!registrationId || !selectedBomId) {
                                              toast({
                                                title: "Missing required information",
                                                description: "Registration ID and BOM ID are required to save changes",
                                                variant: "destructive"
                                              });
                                              return;
                                            }

                                            try {
                                              const itemPendingFiles = pendingFiles[item.id];
                                              const warrantyFiles = itemPendingFiles?.warranty || [];
                                              const manualFiles = itemPendingFiles?.manual || [];
                                              
                                              // Prepare files array
                                              const builderItemFilesDtos = [
                                                ...warrantyFiles.map(file => ({ type: 'warranty' as const, file })),
                                                ...manualFiles.map(file => ({ type: 'Manual' as const, file }))
                                              ];

                                              // For custom items, builderItemId might be null/empty, use empty string
                                              // For regular items, use the builderItemId
                                              const builderItemId = item.is_custom 
                                                ? (item.builderItemId || '') 
                                                : (item.builderItemId || '');

                                              // Call the API to update the item
                                              await updateBuilderCustomerMap({
                                                id: item.id,
                                                builderCustomerId: registrationId,
                                                builderItemId: builderItemId,
                                                billMaterialId: selectedBomId,
                                                seller: item.seller || undefined,
                                                serialNumber: item.serial_number || undefined,
                                                notes: item.custom_notes || undefined,
                                                color: item.color || undefined,
                                                model: item.model || undefined,
                                                brand: item.brand || undefined,
                                                make: item.make || undefined,
                                                builderItemFilesDtos: builderItemFilesDtos.length > 0 ? builderItemFilesDtos : undefined,
                                              }).unwrap();

                                              // Clear pending files after successful API call
                                              setPendingFiles(prev => {
                                                const newFiles = { ...prev };
                                                delete newFiles[item.id];
                                                return newFiles;
                                              });

                                              // Refresh items from server
                                              await refetchItems();

                                              toast({
                                                title: "Item updated",
                                                description: "Item details and files have been saved successfully",
                                              });

                                              setEditingItemId(null);
                                            } catch (error) {
                                              console.error('Error updating item:', error);
                                              toast({
                                                title: "Update failed",
                                                description: error && typeof error === 'object' && 'data' in error 
                                                  ? String((error.data as { message?: string })?.message || "Failed to update item")
                                                  : "Failed to update item",
                                                variant: "destructive"
                                              });
                                            }
                                          } else {
                                            // Enter edit mode
                                            setEditingItemId(item.id);
                                          }
                                        }}
                                      >
                                        {isEditing ? <Save className="h-4 w-4" /> : <Edit2 className="h-4 w-4" />}
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
                                            multiple
                                            accept="image/*,.pdf"
                                            ref={(el) => {
                                              if (!fileInputRefs.current[item.id]) {
                                                fileInputRefs.current[item.id] = { warranty: null, manual: null };
                                              }
                                              fileInputRefs.current[item.id].warranty = el;
                                            }}
                                            onChange={(e) => handleFileSelect(item.id, e.target.files, 'warranty', e.target)}
                                            className="flex-1"
                                          />
                                        </div>
                                        {pendingFiles[item.id]?.warranty && pendingFiles[item.id].warranty.length > 0 && (
                                          <div className="mt-2 space-y-1">
                                            <p className="text-xs text-muted-foreground mb-1">Pending upload:</p>
                                            {pendingFiles[item.id].warranty.map((file, idx) => (
                                              <div key={idx} className="flex items-center gap-2 text-sm">
                                                <FileText className="h-4 w-4" />
                                                <span className="flex-1 min-w-0 truncate break-all">{file.name}</span>
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={() => handleRemovePendingFile(item.id, idx, 'warranty')}
                                                >
                                                  <X className="h-3 w-3" />
                                                </Button>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                        {item.warranty_documents && item.warranty_documents.length > 0 && (
                                          <div className="mt-2 space-y-1">
                                            {pendingFiles[item.id]?.warranty && pendingFiles[item.id].warranty.length > 0 && (
                                              <p className="text-xs text-muted-foreground mb-1">Uploaded:</p>
                                            )}
                                            {item.warranty_documents.map((doc) => {
                                              const docIdentifier = doc.id || doc.path || doc.url || doc.name;
                                              return (
                                                <div key={docIdentifier} className="flex items-center gap-2 text-sm">
                                                  <FileText className="h-4 w-4" />
                                                  <span className="flex-1 min-w-0 truncate break-all">{doc.name}</span>
                                                  <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleRemoveDocument(item.id, docIdentifier, 'warranty')}
                                                  >
                                                    <X className="h-3 w-3" />
                                                  </Button>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        )}
                                        {(!pendingFiles[item.id]?.warranty || pendingFiles[item.id].warranty.length === 0) &&
                                         (!item.warranty_documents || item.warranty_documents.length === 0) && (
                                          <p className="mt-2 text-xs text-muted-foreground">No files selected</p>
                                        )}
                                      </div>
                                      <div>
                                        <Label htmlFor={`manual-${item.id}`}>Upload Manual</Label>
                                        <div className="flex items-center gap-2">
                                          <Input
                                            id={`manual-${item.id}`}
                                            type="file"
                                            multiple
                                            accept="image/*,.pdf"
                                            ref={(el) => {
                                              if (!fileInputRefs.current[item.id]) {
                                                fileInputRefs.current[item.id] = { warranty: null, manual: null };
                                              }
                                              fileInputRefs.current[item.id].manual = el;
                                            }}
                                            onChange={(e) => handleFileSelect(item.id, e.target.files, 'manual', e.target)}
                                            className="flex-1"
                                          />
                                        </div>
                                        {pendingFiles[item.id]?.manual && pendingFiles[item.id].manual.length > 0 && (
                                          <div className="mt-2 space-y-1">
                                            <p className="text-xs text-muted-foreground mb-1">Pending upload:</p>
                                            {pendingFiles[item.id].manual.map((file, idx) => (
                                              <div key={idx} className="flex items-center gap-2 text-sm">
                                                <FileText className="h-4 w-4" />
                                                <span className="flex-1 min-w-0 truncate break-all">{file.name}</span>
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={() => handleRemovePendingFile(item.id, idx, 'manual')}
                                                >
                                                  <X className="h-3 w-3" />
                                                </Button>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                        {item.manual_documents && item.manual_documents.length > 0 && (
                                          <div className="mt-2 space-y-1">
                                            {pendingFiles[item.id]?.manual && pendingFiles[item.id].manual.length > 0 && (
                                              <p className="text-xs text-muted-foreground mb-1">Uploaded:</p>
                                            )}
                                            {item.manual_documents.map((doc) => {
                                              const docIdentifier = doc.id || doc.path || doc.url || doc.name;
                                              return (
                                                <div key={docIdentifier} className="flex items-center gap-2 text-sm">
                                                  <FileText className="h-4 w-4" />
                                                  <span className="flex-1 min-w-0 truncate break-all">{doc.name}</span>
                                                  <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleRemoveDocument(item.id, docIdentifier, 'manual')}
                                                  >
                                                    <X className="h-3 w-3" />
                                                  </Button>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        )}
                                        {(!pendingFiles[item.id]?.manual || pendingFiles[item.id].manual.length === 0) &&
                                         (!item.manual_documents || item.manual_documents.length === 0) && (
                                          <p className="mt-2 text-xs text-muted-foreground">No files selected</p>
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

      {/* Warning modal when BOM is already mapped */}
      <Dialog open={showMappedWarning} onOpenChange={setShowMappedWarning}>
        <DialogContent className="sm:max-w-[420px] bg-background">
          <DialogHeader>
            <DialogTitle>Existing BOM Mapping</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {existingItemsData?.message || "BOM is already mapped for this customer. Do you want to replace it?"}
            </p>
            <p className="text-sm text-muted-foreground">
              Selecting "Yes" will reload items from the chosen Bill of Materials.
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowMappedWarning(false)} disabled={warningLoading}>
              No
            </Button>
            <Button onClick={handleConfirmBomChange} disabled={warningLoading}>
              {warningLoading ? "Loading..." : "Yes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ItemsSelectionForm;
