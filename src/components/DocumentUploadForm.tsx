import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileText, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useGetCustomerDetailsQuery } from "@/lib/api/services/customerDetails";
import { useUpdateItemMapMutation } from "@/lib/api/services/itemMap";

interface BuilderItem {
  id: string;
  name: string;
  category: string | null;
  brand: string | null;
  model: string | null;
  make: string | null;
  note: string | null;
  price: string | null;
  text: string | null;
  documentationUrl: string | null;
  status: string;
  purchaser: string | null;
  mapped: boolean;
}

interface FormData {
  documents: Record<string, string[]>;
  itemDetails: Record<string, { seller: string; serialNumber: string }>;
}

interface DocumentUploadFormProps {
  onNext: (data: FormData) => void;
  initialData?: FormData & { customerId?: string; builderId?: string; selected_items?: string[] };
  selectedItems?: string[];
}

const DocumentUploadForm = ({ onNext, initialData, selectedItems: selectedItemIds }: DocumentUploadFormProps) => {
  const { toast } = useToast();
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, string[]>>(initialData?.documents || {});
  const [itemDetails, setItemDetails] = useState<Record<string, { seller: string; serialNumber: string }>>(initialData?.itemDetails || {});
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, File[]>>({});
  const [updateItemMap, { isLoading: isUpdating }] = useUpdateItemMapMutation();

  const selectedIds = initialData?.selected_items || selectedItemIds || [];

  const { 
    data: customerDetails, 
    isLoading: loading, 
    error 
  } = useGetCustomerDetailsQuery(
    { 
      builderId: initialData?.builderId || '', 
      customerId: initialData?.customerId || '' 
    },
    { 
      skip: !initialData?.builderId || !initialData?.customerId 
    }
  );

  useEffect(() => {
    if (error) {
      console.error('DocumentUploadForm - API error:', error);
      toast({
        title: "Error fetching items",
        description: "Failed to load items from server",
        variant: "destructive"
      });
    }
  }, [error, toast]);

  const groupedItems = customerDetails?.data?.dtos?.reduce((acc, categoryGroup) => {
    const selectedCategoryItems = categoryGroup.items.filter(item => 
      selectedIds.includes(item.id)
    );
    if (selectedCategoryItems.length > 0) {
      acc[categoryGroup.category] = selectedCategoryItems;
    }
    
    return acc;
  }, {} as Record<string, BuilderItem[]>) || {};

  const handleDetailChange = (itemId: string, field: 'seller' | 'serialNumber', value: string) => {
    setItemDetails(prev => ({
      ...prev,
      [itemId]: {
        seller: '',
        serialNumber: '',
        ...prev[itemId],
        [field]: value
      }
    }));
  };

  const handleFileUpload = (itemId: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '.pdf,.doc,.docx,.jpg,.jpeg,.png';
    
    input.onchange = (e: Event) => {
      const target = e.target as HTMLInputElement;
      const files = Array.from(target.files || []);
      
      if (files.length > 0) {
        setUploadedFiles(prev => ({
          ...prev,
          [itemId]: [...(prev[itemId] || []), ...files]
        }));
        
        const fileNames = files.map(f => f.name);
        setUploadedDocs(prev => ({
          ...prev,
          [itemId]: [...(prev[itemId] || []), ...fileNames]
        }));
        
        toast({
          title: "Files selected",
          description: `${files.length} file(s) selected for upload`,
        });
      }
    };
    
    input.click();
  };

  const getDocumentCount = () => {
    return Object.values(uploadedDocs).reduce((total, docs) => total + docs.length, 0);
  };

  const getTotalItems = () => {
    return Object.values(groupedItems).reduce((total, items) => total + items.length, 0);
  };

  const getDetailsCount = () => {
    return Object.values(itemDetails).filter(detail => 
      detail.seller.trim() !== '' || detail.serialNumber.trim() !== ''
    ).length;
  };

  const isComplete = getDocumentCount() > 0 || getDetailsCount() > 0;

  const handleContinue = async () => {
    try {
      const formData = new FormData();
      
      const itemsToUpdate = Object.entries(groupedItems).flatMap(([category, items]) => 
        items.filter(item => itemDetails[item.id] || uploadedFiles[item.id])
      );

      itemsToUpdate.forEach((item, index) => {
        const details = itemDetails[item.id] || { seller: '', serialNumber: '' };
        const files = uploadedFiles[item.id] || [];

        formData.append(`builderMap[${index}].id`, item.id);
        formData.append(`builderMap[${index}].seller`, details.seller);
        formData.append(`builderMap[${index}].serialNumber`, details.serialNumber);
        
        files.forEach((file) => {
          formData.append(`builderMap[${index}].files`, file);
        });
      });

      console.log('Calling itemmap update API with data for', itemsToUpdate.length, 'items');
      
      await updateItemMap(formData).unwrap();
      
      toast({
        title: "Item details saved",
        description: "Moving to review"
      });
      
      onNext({ documents: uploadedDocs, itemDetails });
    } catch (error: unknown) {
      toast({
        title: "Error saving item details",
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground">Loading Documents...</h2>
          <p className="text-muted-foreground mt-1">Fetching selected items for document upload</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Provide details</h2>
          <p className="text-muted-foreground">Provide seller information, serial numbers, and upload documentation for selected items</p>
        </div>
        <Badge variant="secondary" className="text-sm">
          {getDocumentCount()} documents uploaded
        </Badge>
      </div>

      {Object.keys(groupedItems).length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No items selected. Please go back and select items first.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {Object.entries(groupedItems).map(([category, items]: [string, BuilderItem[]]) => (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="text-lg">{category}</CardTitle>
              <CardDescription>
                Provide details and upload documentation for each selected item
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6">
                {items.map((item: BuilderItem) => {
                  const docs = uploadedDocs[item.id] || [];
                  const hasUploads = docs.length > 0;
                  const details = itemDetails[item.id] || { seller: '', serialNumber: '' };

                  return (
                    <div key={item.id} className="border rounded-lg p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            hasUploads ? 'bg-green-100 text-green-600' : 'bg-muted text-muted-foreground'
                          }`}>
                            {hasUploads ? <Check className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                          </div>
                          <div>
                            <h4 className="font-medium">{item.name}</h4>
                            {(item.brand || item.model) && (
                              <p className="text-xs text-muted-foreground">
                                {[item.brand, item.model].filter(Boolean).join(' - ')}
                              </p>
                            )}
                            {hasUploads && (
                              <p className="text-sm text-muted-foreground">
                                {docs.length} document{docs.length !== 1 ? 's' : ''} uploaded
                              </p>
                            )}
                          </div>
                        </div>
                        <Button
                          variant={hasUploads ? "outline" : "default"}
                          size="sm"
                          onClick={() => handleFileUpload(item.id)}
                          className="flex items-center space-x-2"
                        >
                          <Upload className="w-4 h-4" />
                          <span>{hasUploads ? "Add More" : "Upload"}</span>
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor={`seller-${item.id}`}>Seller</Label>
                          <Input
                            id={`seller-${item.id}`}
                            placeholder="Enter seller name"
                            value={details.seller}
                            onChange={(e) => handleDetailChange(item.id, 'seller', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`serial-${item.id}`}>Serial Number</Label>
                          <Input
                            id={`serial-${item.id}`}
                            placeholder="Enter serial number"
                            value={details.serialNumber}
                            onChange={(e) => handleDetailChange(item.id, 'serialNumber', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
          ))}
        </div>
      )}

      <div className="flex justify-between items-center pt-6 border-t">
        <p className="text-sm text-muted-foreground">
          Provide details and upload documentation for {getTotalItems()} selected items
        </p>
        <Button 
          onClick={handleContinue}
          disabled={!isComplete || isUpdating}
          className="min-w-[120px]"
        >
          {isUpdating ? 'Saving...' : 'Continue'}
        </Button>
      </div>
    </div>
  );
};

export default DocumentUploadForm;