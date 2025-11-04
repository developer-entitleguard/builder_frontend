import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { User, Home, FileText, Building, CheckCircle } from "lucide-react";
import { useGetCustomerDetailsQuery } from "@/lib/api/services/customerDetails";
import { useCreateCustomerEntitlementMutation } from "@/lib/api/services/customerEntitlement";
import { useToast } from "@/hooks/use-toast";
import type { CustomerDetailsResponse } from "@/lib/api/types";

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
  builderCustomerMapId: string | null;
  seller: string | null;
  serialNumber: string | null;
  fileId: string | null;
  documentCount?: number | null;
  fileResponseDto?: Array<{ id: string; fileName: string; fileUrl: string }> | null;
}

interface FormData {
  customer: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    propertyAddress?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    projectName?: string;
    settlementDate?: string;
    notes?: string;
    registrationId?: string;
    customerId?: string;
    builderId?: string;
  };
  items: {
    selected_items: string[];
  };
  documents: {
    documents?: Record<string, string[]>;
    itemDetails?: Record<string, { seller: string; serialNumber: string }>;
  };
}

interface ReviewApprovalFormProps {
  onNext: () => void;
  formData?: FormData;
  onCustomerDetailsLoaded?: (data: CustomerDetailsResponse) => void;
}

const ReviewApprovalForm = ({ onNext, formData, onCustomerDetailsLoaded }: ReviewApprovalFormProps) => {
  const { toast } = useToast();
  const [approved, setApproved] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { 
    data: customerDetails, 
    isLoading: loading, 
    error,
    refetch 
  } = useGetCustomerDetailsQuery(
    { 
      builderId: formData?.customer?.builderId || '', 
      customerId: formData?.customer?.customerId || '' 
    },
    { 
      skip: !formData?.customer?.builderId || !formData?.customer?.customerId,
      refetchOnMountOrArgChange: false,
      refetchOnFocus: false,
      refetchOnReconnect: false
    }
  );

  const [createCustomerEntitlement, { 
    isLoading: isCreatingEntitlement 
  }] = useCreateCustomerEntitlementMutation();

  useEffect(() => {
    if (formData?.customer?.builderId && formData?.customer?.customerId) {
      console.log('ReviewApprovalForm - Fetching customer details:', {
        builderId: formData.customer.builderId,
        customerId: formData.customer.customerId
      });
    }
  }, [formData?.customer?.builderId, formData?.customer?.customerId]);

  useEffect(() => {
    if (error) {
      console.error('ReviewApprovalForm - API error:', error);
      toast({
        title: "Error fetching customer details",
        description: "Failed to load customer and items data",
        variant: "destructive"
      });
    }
  }, [error, toast]);

  useEffect(() => {
    if (customerDetails && onCustomerDetailsLoaded) {
      onCustomerDetailsLoaded(customerDetails);
    }
  }, [customerDetails, onCustomerDetailsLoaded]);

  const customerData = customerDetails?.data?.customer || formData?.customer || {};
  
  const uploadedDocs = useMemo(() => {
    const docs = formData?.documents as { documents?: Record<string, string[]>; itemDetails?: Record<string, { seller: string; serialNumber: string }> };
    return docs?.documents || {};
  }, [formData?.documents]);
  
  const itemDetails = useMemo(() => {
    const docs = formData?.documents as { documents?: Record<string, string[]>; itemDetails?: Record<string, { seller: string; serialNumber: string }> };
    return docs?.itemDetails || {};
  }, [formData?.documents]);
  
  const selectedItemIds = useMemo(() => {
    return formData?.items?.selected_items || [];
  }, [formData?.items?.selected_items]);

  // Count total uploaded documents
  const getTotalDocuments = () => {
    return Object.values(uploadedDocs).reduce((total: number, docs: string[]) => {
      if (Array.isArray(docs)) {
        return total + docs.length;
      }
      return total;
    }, 0);
  };

  // Show items that were selected OR have details/documentation OR are mapped in API
  const groupedItems = useMemo(() => {
    if (!customerDetails?.data?.dtos) {
      console.log('ReviewApprovalForm - No dtos in customerDetails');
      return {};
    }
    
    console.log('ReviewApprovalForm - Processing dtos:', customerDetails.data.dtos);
    console.log('ReviewApprovalForm - selectedItemIds from formData:', selectedItemIds);
    console.log('ReviewApprovalForm - itemDetails from formData:', itemDetails);
    console.log('ReviewApprovalForm - uploadedDocs from formData:', uploadedDocs);
    
    const grouped = customerDetails.data.dtos.reduce((acc, categoryGroup) => {
      // Show items that:
      // 1. Are in selectedItemIds (were selected in ItemsSelectionForm)
      // 2. Have details/documentation (seller, serialNumber, or files)
      // 3. Are marked as mapped: true in API response
      const relevantItems = categoryGroup.items.filter(item => {
        const isSelected = selectedItemIds.includes(item.id);
        const hasDetails = itemDetails[item.id] || uploadedDocs[item.id];
        const isMapped = item.mapped === true;
        
        const shouldShow = isSelected || hasDetails || isMapped;
        
        if (shouldShow) {
          console.log(`ReviewApprovalForm - Item ${item.name}: isSelected=${isSelected}, hasDetails=${!!hasDetails}, isMapped=${isMapped}`);
        }
        
        return shouldShow;
      });
      
      console.log(`ReviewApprovalForm - Category ${categoryGroup.category}: ${relevantItems.length} relevant items`);
      
      if (relevantItems.length > 0) {
        acc[categoryGroup.category] = relevantItems;
      }
      
      return acc;
    }, {} as Record<string, BuilderItem[]>);
    
    console.log('ReviewApprovalForm - Final groupedItems:', grouped);
    return grouped;
  }, [customerDetails?.data?.dtos, selectedItemIds, itemDetails, uploadedDocs]);

  const selectedItems = useMemo(() => {
    return Object.values(groupedItems).flat();
  }, [groupedItems]);

  // Debug logging
  useEffect(() => {
    if (customerDetails?.data?.dtos) {
      console.log('ReviewApprovalForm - customerDetails.dtos:', customerDetails.data.dtos);
      const allMappedItems = customerDetails.data.dtos.flatMap(cat => cat.items.filter(item => item.mapped === true));
      console.log('ReviewApprovalForm - mapped items found:', allMappedItems.length);
      console.log('ReviewApprovalForm - mapped items:', allMappedItems);
      console.log('ReviewApprovalForm - selectedItems:', selectedItems);
      console.log('ReviewApprovalForm - groupedItems:', groupedItems);
    }
  }, [customerDetails, selectedItems, groupedItems]);

  const handleSendToHomeowner = async () => {
    if (!formData?.customer?.customerId) {
      toast({
        title: "Error",
        description: "Customer ID is required to send entitlement",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const result = await createCustomerEntitlement({
        builderCustomerId: formData.customer.customerId
      }).unwrap();

      toast({
        title: "Success",
        description: "Customer entitlement created successfully",
        variant: "default"
      });

      // Call the original onNext function to proceed to next step
      onNext();
    } catch (error: unknown) {
      console.error('Error creating customer entitlement:', error);
      const errorMessage = error && typeof error === 'object' && 'data' in error && 
        error.data && typeof error.data === 'object' && 'message' in error.data
        ? (error.data as { message: string }).message
        : "Failed to create customer entitlement";
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground">Loading Review...</h2>
          <p className="text-muted-foreground mt-1">Preparing review data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Review & Approve</h2>
        <p className="text-muted-foreground">Review all details before sending to homeowner</p>
      </div>

      {/* Customer Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="w-5 h-5" />
            <span>Customer Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="font-medium">Name</p>
              <p className="text-muted-foreground">{customerData.firstName && customerData.lastName ? `${customerData.firstName} ${customerData.lastName}` : 'Not provided'}</p>
            </div>
            <div>
              <p className="font-medium">Email</p>
              <p className="text-muted-foreground">{customerData.email || 'Not provided'}</p>
            </div>
            <div>
              <p className="font-medium">Phone</p>
              <p className="text-muted-foreground">{(customerData as Record<string, string>).contact || (customerData as Record<string, string>).phone || 'Not provided'}</p>
            </div>
            <div>
              <p className="font-medium">Settlement Date</p>
              <p className="text-muted-foreground">{(customerData as Record<string, string>).settlementDate || 'Not provided'}</p>
            </div>
          </div>
          <div>
            <p className="font-medium">Property Address</p>
            <p className="text-muted-foreground">
              {((customerData as Record<string, string>).address || (customerData as Record<string, string>).propertyAddress) && (customerData as Record<string, string>).city && (customerData as Record<string, string>).state 
                ? `${(customerData as Record<string, string>).address || (customerData as Record<string, string>).propertyAddress}, ${(customerData as Record<string, string>).city}, ${(customerData as Record<string, string>).state} ${(customerData as Record<string, string>).zip || (customerData as Record<string, string>).zipCode || ''}`
                : 'Not provided'
              }
            </p>
          </div>
        </CardContent>
      </Card>

      {!customerDetails?.data?.dtos && !loading ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Building className="w-5 h-5" />
              <span>Selected Items</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">No customer details available</p>
          </CardContent>
        </Card>
      ) : selectedItems.length === 0 && !loading ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Building className="w-5 h-5" />
              <span>Selected Items</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">No mapped items found</p>
            {customerDetails?.data?.dtos && (
              <p className="text-xs text-muted-foreground mt-2">
                Total items: {customerDetails.data.dtos.reduce((sum, cat) => sum + cat.items.length, 0)} | 
                Mapped items: {customerDetails.data.dtos.reduce((sum, cat) => sum + cat.items.filter(item => item.mapped === true).length, 0)}
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Building className="w-5 h-5" />
              <span>Selected Items</span>
            </CardTitle>
            <CardDescription>
              Items included in the warranty package
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {Object.entries(groupedItems).map(([category, items]) => (
                <div key={category}>
                  <h4 className="font-semibold mb-3">{category}</h4>
                  <div className="space-y-2">
                    {items.map((item, index) => {
                      // Get details from formData (uploaded in DocumentUploadForm) or from API response
                      const formItemDetails = itemDetails[item.id] as { seller?: string; serialNumber?: string } | undefined;
                      const formDocs = uploadedDocs[item.id] || [];
                      
                      // Use API response data if available, otherwise use formData
                      const seller = item.seller || formItemDetails?.seller || '';
                      const serialNumber = item.serialNumber || formItemDetails?.serialNumber || '';
                      
                      // Check documents from API response or formData
                      const documentCount = item.documentCount ?? 0;
                      const apiFiles = item.fileResponseDto || [];
                      const formDocsCount = Array.isArray(formDocs) ? formDocs.length : 0;
                      const hasDocuments = documentCount > 0 || apiFiles.length > 0 || formDocsCount > 0;
                      const totalDocCount = documentCount || apiFiles.length || formDocsCount;
                      
                      return (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{item.name}</p>
                              {(item.brand || item.model) && (
                                <p className="text-sm text-muted-foreground">
                                  {[item.brand, item.model].filter(Boolean).join(' - ')}
                                </p>
                              )}
                              {seller && (
                                <p className="text-xs text-muted-foreground">
                                  Seller: {seller}
                                </p>
                              )}
                              {serialNumber && (
                                <p className="text-xs text-muted-foreground">
                                  Serial: {serialNumber}
                                </p>
                              )}
                              {hasDocuments && (
                                <p className="text-xs text-green-600">
                                  {totalDocCount} document{totalDocCount !== 1 ? 's' : ''} uploaded
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {hasDocuments ? (
                              <Badge className="bg-green-100 text-green-800">Documents Ready</Badge>
                            ) : (
                              <Badge variant="outline" className="text-yellow-600 border-yellow-600">No Documents</Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {Object.keys(groupedItems).indexOf(category) < Object.keys(groupedItems).length - 1 && (
                    <Separator className="mt-4" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Documentation Status */}
      {/* <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="w-5 h-5" />
            <span>Documentation Status</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {getTotalDocuments() > 0 ? (
            <div className="flex items-center space-x-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Documents uploaded</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2 text-yellow-600">
              <FileText className="w-5 h-5" />
              <span className="font-medium">No documents uploaded</span>
            </div>
          )}
          <p className="text-sm text-muted-foreground mt-2">
            {getTotalDocuments()} document{getTotalDocuments() !== 1 ? 's' : ''} ready for delivery
          </p>
        </CardContent>
      </Card> */}

      {/* Approval */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <Checkbox 
              id="approve" 
              checked={approved}
              onCheckedChange={(checked) => setApproved(checked as boolean)}
            />
            <div className="space-y-1">
              <label htmlFor="approve" className="font-medium cursor-pointer">
                I approve this warranty documentation package
              </label>
              <p className="text-sm text-muted-foreground">
                By checking this box, you confirm that all information is accurate and complete.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between items-center pt-6 border-t">
        <p className="text-sm text-muted-foreground">
          {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} • {getTotalDocuments() as number} document{(getTotalDocuments() as number) !== 1 ? 's' : ''} • Ready to send
        </p>
        <Button 
          onClick={handleSendToHomeowner}
          disabled={!approved || isSubmitting || isCreatingEntitlement}
          className="min-w-[120px]"
        >
          {isSubmitting || isCreatingEntitlement ? "Sending..." : "Send to Homeowner"}
        </Button>
      </div>
    </div>
  );
};

export default ReviewApprovalForm;