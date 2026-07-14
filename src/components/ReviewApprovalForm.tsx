import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { User, Home, FileText, Building, CheckCircle, MessageSquare, Loader2, Lock, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "@/hooks/useOrganization";
import { useCreateBuilderCustomerMutation, useGetCustomerDetailsQuery, useSendConsentMailMutation, useGetStatusesByTypeQuery } from "@/store/api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type ReviewCustomerData = Record<string, unknown>;

type ReviewItem = {
  id?: string;
  name?: string | null;
  category?: string | null;
  brand?: string | null;
  model?: string | null;
  documentCount?: number | null;
};

type ReviewFormData = {
  customer?: ReviewCustomerData;
  items?: { selected_items?: unknown };
  documents?: Record<string, unknown>;
};

interface ReviewApprovalFormProps {
  onNext: () => void;
  formData?: ReviewFormData;
  registrationId?: string | null;
  /** When true, form calls POST /api/create/customerentitlement/:builderCustomerId when Send to Homeowner is clicked */
  useBuilderEntitlementApi?: boolean;
  /** When true, form is read-only (view mode only). */
  readOnly?: boolean;
}

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

const ReviewApprovalForm = ({
  onNext,
  formData,
  registrationId,
  useBuilderEntitlementApi,
  readOnly,
}: ReviewApprovalFormProps) => {
  const { toast } = useToast();
  const { organization } = useOrganization();
  const builderId = organization?.id ?? getBuilderId();
  const { data: customerDetailsResponse } = useGetCustomerDetailsQuery(
    { builderId: builderId ?? "", customerId: registrationId ?? "" },
    { skip: !registrationId || !builderId }
  );
  const apiData = customerDetailsResponse?.data;
  const totalItemsFromApi = apiData?.totalItems ?? null;
  const totalDocumentsFromApi = apiData?.totalDocuments ?? null;

  const [createBuilderCustomer] = useCreateBuilderCustomerMutation();
  const [sendingEntitlement, setSendingEntitlement] = useState(false);
  const [approved, setApproved] = useState(false);
  const [selectedItems, setSelectedItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);

  const { data: builderStatuses } = useGetStatusesByTypeQuery(
    { type: "BUILDER" },
    { skip: !builderId }
  );

  const fetchSelectedItems = useCallback(async (itemIds: string[]) => {
    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      setLoading(false);
      return;
    }

    // Only fetch real builder_items UUIDs (skip custom items / invalid values)
    const uuidIds = itemIds.filter((id) =>
      typeof id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
    );

    if (uuidIds.length === 0) {
      setSelectedItems([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('builder_items')
        .select('*')
        .in('id', uuidIds);

      if (error) throw error;
      setSelectedItems((data as unknown as ReviewItem[]) || []);
    } catch (error: unknown) {
      toast({
        title: "Error fetching selected items",
        description: error instanceof Error ? error.message : "Failed to fetch selected items",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    const items = formData?.items?.selected_items;
    console.log('ReviewApprovalForm - items from formData:', items);

    if (Array.isArray(items) && items.length > 0) {
      // selected_items can be either an array of UUIDs OR an array of item objects
      const firstItem = items[0];
      if (typeof firstItem === "string") {
        console.log('ReviewApprovalForm - items are UUIDs, fetching from DB');
        fetchSelectedItems(items as string[]);
      } else if (typeof firstItem === "object" && firstItem !== null) {
        console.log('ReviewApprovalForm - items are objects, using directly:', items.length, 'items');
        setSelectedItems(
          (items as unknown[]).map((it) => {
            const obj = it as Record<string, unknown>;
            return {
              id: typeof obj.id === "string" ? obj.id : undefined,
              name: typeof obj.name === "string" ? obj.name : (obj.name == null ? null : String(obj.name)),
              category:
                typeof obj.category === "string"
                  ? obj.category
                  : obj.category == null
                    ? null
                    : String(obj.category),
              brand:
                typeof obj.brand === "string"
                  ? obj.brand
                  : obj.brand == null
                    ? null
                    : String(obj.brand),
              model:
                typeof obj.model === "string"
                  ? obj.model
                  : obj.model == null
                    ? null
                    : String(obj.model),
              documentCount:
                typeof obj.documentCount === "number" && Number.isFinite(obj.documentCount)
                  ? obj.documentCount
                  : null,
            } satisfies ReviewItem;
          })
        );
        setLoading(false);
      } else {
        console.log('ReviewApprovalForm - unknown item type:', typeof firstItem);
        setLoading(false);
      }
    } else {
      console.log('ReviewApprovalForm - no items found in formData');
      setLoading(false);
    }
  }, [formData, registrationId, fetchSelectedItems]);

  const handleSendToHomeowner = async () => {
    if (readOnly) {
      onNext();
      return;
    }

    if (!builderId || !registrationId || !apiData?.customer) {
      onNext();
      return;
    }

    const customer = apiData.customer as unknown as {
      id?: string;
      firstName?: string;
      lastName?: string | null;
      email?: string;
      contact?: string;
      address?: string;
      city?: string;
      state?: string;
      zip?: string;
      project?: { id?: string; name?: string } | null;
      projectName?: string | null;
      settlementDate?: string | null;
      notes?: string | null;
      numBedrooms?: number | null;
      numRooms?: number | null;
      price?: number | null;
      totalBuiltUpArea?: number | null;
      builderOrganization?: { id?: string } | null;
    };

    setSendingEntitlement(true);
    try {
      const sentStatusId =
        builderStatuses?.data?.find(
          (s) => s.module === "BUILDER" && s.name?.toUpperCase() === "SENT"
        )?.id;

      await createBuilderCustomer({
        id: customer.id ?? registrationId ?? undefined,
        firstName: customer.firstName ?? "",
        lastName: (customer.lastName as string | null) ?? "",
        email: customer.email ?? "",
        contact: customer.contact ?? "",
        address: customer.address ?? "",
        city: customer.city ?? "",
        state: customer.state ?? "",
        zip: customer.zip ?? "",
        country: "Australia",
        projectId: customer.project?.id ?? undefined,
        projectName: customer.projectName ?? customer.project?.name ?? undefined,
        settlementDate: customer.settlementDate ?? undefined,
        notes: customer.notes ?? undefined,
        numBedrooms: customer.numBedrooms ?? undefined,
        numRooms: customer.numRooms ?? undefined,
        price: customer.price ?? undefined,
        totalBuiltUpArea: customer.totalBuiltUpArea ?? undefined,
        consentMethod: "form",
        consentReceived: true,
        consentReceivedAt: new Date().toISOString(),
        consentToken: undefined,
        builderOrganizationId: customer.builderOrganization?.id ?? builderId,
        ...(sentStatusId ? { statusId: sentStatusId } : {}),
      }).unwrap();

      toast({
        title: "Details confirmed",
        description: "Choose the handover date to complete the handover.",
      });

      onNext();
    } catch (error: unknown) {
      const description =
        error && typeof error === "object" && "data" in error
          ? String((error as { data?: unknown }).data ?? "Failed to save details")
          : error instanceof Error
            ? error.message
            : "Failed to save details";
      toast({
        title: "Error saving details",
        description,
        variant: "destructive",
      });
    } finally {
      setSendingEntitlement(false);
    }
  };

  const customerData: ReviewCustomerData = formData?.customer || {};
  const uploadedDocs: Record<string, unknown> = formData?.documents || {};

  const readString = (obj: Record<string, unknown>, ...keys: string[]): string | undefined => {
    for (const key of keys) {
      const v = obj[key];
      if (typeof v === 'string' && v.trim() !== '') return v;
      if (typeof v === 'number' && Number.isFinite(v)) return String(v);
    }
    return undefined;
  };

  const firstName = readString(customerData, 'firstName', 'first_name');
  const lastName = readString(customerData, 'lastName', 'last_name');
  const customerName =
    readString(customerData, 'customer_name') ??
    (firstName && lastName ? `${firstName} ${lastName}` : undefined);
  const customerEmail = readString(customerData, 'customer_email', 'email');
  const customerPhone = readString(customerData, 'customer_phone', 'phone', 'contact');
  const settlementDate = readString(customerData, 'settlement_date', 'settlementDate');

  const propertyAddress = readString(customerData, 'property_address', 'propertyAddress', 'address');
  const propertyCity = readString(customerData, 'property_city', 'city');
  const propertyState = readString(customerData, 'property_state', 'state');
  const propertyZip = readString(customerData, 'property_zip', 'zipCode', 'zip');
  const propertyFull =
    propertyAddress && propertyCity && propertyState
      ? `${propertyAddress}, ${propertyCity}, ${propertyState} ${propertyZip ?? ''}`.trim()
      : undefined;

  // Count total uploaded documents
  const getTotalDocuments = (): number => {
    return Object.values(uploadedDocs).reduce<number>(
      (total, docs) => total + (Array.isArray(docs) ? docs.length : 0),
      0
    );
  };

  const getReadyToSendSummary = () => {
    const items = totalItemsFromApi ?? selectedItems.length;
    const docs = totalDocumentsFromApi ?? getTotalDocuments();
    return (
      <>{items} item{items !== 1 ? 's' : ''} • {docs} document{docs !== 1 ? 's' : ''} • Ready to hand over</>
    );
  };

  const groupedItems = selectedItems.reduce((acc: Record<string, ReviewItem[]>, item) => {
    const category = item.category ?? 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {});

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

  const canSubmit = readOnly ? true : approved;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Review & Approve</h2>
        <p className="text-muted-foreground">Review all details before handing over to the homeowner</p>
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
              <p className="text-muted-foreground">{customerName ?? 'Not provided'}</p>
            </div>
            <div>
              <p className="font-medium">Email</p>
              <p className="text-muted-foreground">{customerEmail ?? 'Not provided'}</p>
            </div>
            <div>
              <p className="font-medium">Phone</p>
              <p className="text-muted-foreground">{customerPhone ?? 'Not provided'}</p>
            </div>
            <div>
              <p className="font-medium">Settlement Date</p>
              <p className="text-muted-foreground">{settlementDate ?? 'Not provided'}</p>
            </div>
          </div>
          <div>
            <p className="font-medium">Property Address</p>
            <p className="text-muted-foreground">
              {propertyFull ?? 'Not provided'}
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
                      const itemName = item.name ?? 'Item';
                      const itemKey = `${category}-${itemName}`;
                      const docsValue = uploadedDocs[itemKey];
                      const itemDocs = Array.isArray(docsValue) ? docsValue : [];
                      const hasDocuments = itemDocs.length > 0;
                      
                      return (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{itemName}</p>
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
                            <Badge
                              className={
                                typeof item.documentCount === "number" && item.documentCount > 0
                                  ? "bg-green-100 text-green-800"
                                  : "text-yellow-600 border-yellow-600"
                              }
                              variant={
                                typeof item.documentCount === "number" && item.documentCount > 0
                                  ? "default"
                                  : "outline"
                              }
                            >
                              Documents ({typeof item.documentCount === "number" ? item.documentCount : 0})
                            </Badge>
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
          {(getTotalDocuments() as number) > 0 ? (
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
            {getTotalDocuments() as number} document{(getTotalDocuments() as number) !== 1 ? 's' : ''} ready for delivery
          </p>
        </CardContent>
      </Card> */}

      {/* Builder confirmation */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <Checkbox 
              id="approve" 
              checked={approved}
              onCheckedChange={(checked) => !readOnly && setApproved(checked as boolean)}
              disabled={readOnly}
            />
            <div className="space-y-1">
              <label htmlFor="approve" className={`font-medium ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}>
                I confirm this handover pack is complete and correct.
              </label>
              <p className="text-sm text-muted-foreground">
                By checking this box, you confirm the details and documents are accurate before handover.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between items-center pt-6 border-t">
        <p className="text-sm text-muted-foreground">
          {getReadyToSendSummary()}
        </p>
        <Button 
          onClick={handleSendToHomeowner}
          disabled={readOnly ? false : (!canSubmit || sendingEntitlement)}
          className="min-w-[160px]"
        >
          {readOnly ? "Next" : sendingEntitlement ? "Working..." : "Hand Over to Homeowner"}
        </Button>
      </div>

    </div>
  );
};

export default ReviewApprovalForm;
