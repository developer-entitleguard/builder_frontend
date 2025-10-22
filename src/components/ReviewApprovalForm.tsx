import { useState, useEffect } from "react";
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
  documents: Record<string, string[]>;
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
      refetchOnMountOrArgChange: true
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
  const uploadedDocs = formData?.documents || {};

  // Count total uploaded documents
  const getTotalDocuments = () => {
    return Object.values(uploadedDocs).reduce((total: number, docs: string[]) => total + docs.length, 0);
  };

  const selectedItemIds = formData?.items?.selected_items || [];
  const groupedItems = customerDetails?.data?.dtos?.reduce((acc, categoryGroup) => {
    const selectedCategoryItems = categoryGroup.items.filter(item => 
      selectedItemIds.includes(item.id)
    );
    
    if (selectedCategoryItems.length > 0) {
      acc[categoryGroup.category] = selectedCategoryItems;
    }
    
    return acc;
  }, {} as Record<string, BuilderItem[]>) || {};

  const selectedItems = Object.values(groupedItems).flat();

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

      {selectedItems.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Building className="w-5 h-5" />
              <span>Selected Items</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">No items selected</p>
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
                      const itemKey = `${category}-${item.name}`;
                      const itemDocs = uploadedDocs[itemKey] || [];
                      const hasDocuments = itemDocs.length > 0;
                      
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
                              {hasDocuments && (
                                <p className="text-xs text-green-600">
                                  {itemDocs.length} document{itemDocs.length !== 1 ? 's' : ''} uploaded
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