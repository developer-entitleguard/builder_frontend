import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { User, Home, FileText, Building, CheckCircle, MessageSquare, Loader2, Lock, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCreateCustomerEntitlementMutation } from "@/store/api";
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
}

const ReviewApprovalForm = ({ onNext, formData, registrationId, useBuilderEntitlementApi }: ReviewApprovalFormProps) => {
  const { toast } = useToast();
  const [createCustomerEntitlement] = useCreateCustomerEntitlementMutation();
  const [sendingEntitlement, setSendingEntitlement] = useState(false);
  const [approved, setApproved] = useState(false);
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const [consentLocked, setConsentLocked] = useState(false);
  const [selectedItems, setSelectedItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestingConsent, setRequestingConsent] = useState(false);
  const [consentDialogOpen, setConsentDialogOpen] = useState(false);
  const [consentUrl, setConsentUrl] = useState<string | null>(null);

  const checkExistingConsent = useCallback(async () => {
    if (!registrationId) return;

    try {
      const { data, error } = await supabase
        .from('homeowner_registrations')
        .select('consent_received, consent_method')
        .eq('id', registrationId)
        .single();

      if (error) throw error;

      if (data?.consent_received) {
        setConsentConfirmed(true);
        // Lock the checkbox if consent was received via customer link
        if (data.consent_method === 'customer_link') {
          setConsentLocked(true);
        }
      }
    } catch (error: unknown) {
      console.error('Error checking consent:', error);
    }
  }, [registrationId]);

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

    // Check if consent was already received via customer link
    if (registrationId) {
      checkExistingConsent();
    }
  }, [formData, registrationId, checkExistingConsent, fetchSelectedItems]);

  const handleConsentChange = async (checked: boolean) => {
    if (consentLocked) return;
    
    setConsentConfirmed(checked);
    
    if (checked && registrationId) {
      // Update database with builder-confirmed consent
      try {
        await supabase
          .from('homeowner_registrations')
          .update({
            consent_received: true,
            consent_received_at: new Date().toISOString(),
            consent_method: 'builder_confirmed',
          })
          .eq('id', registrationId);
      } catch (error: unknown) {
        console.error('Error saving consent:', error);
      }
    }
  };

  const handleRequestConsent = async () => {
    if (!registrationId) {
      toast({
        title: "Error",
        description: "Registration ID not found. Please save the registration first.",
        variant: "destructive"
      });
      return;
    }

    setRequestingConsent(true);
    try {
      const { data, error } = await supabase.functions.invoke('consent-management', {
        body: {
          action: 'request_consent',
          registration_id: registrationId,
        },
      });

      if (error) throw error;

      setConsentUrl(data.consentUrl);
      setConsentDialogOpen(true);

      if (data.emailSent) {
        toast({
          title: "Consent request sent",
          description: `Email sent to ${data.customerEmail}`,
        });
      } else {
        toast({
          title: "Consent link generated",
          description: data.emailError ? `Email failed: ${data.emailError}. Please share the link manually.` : `Share the link with ${data.customerEmail}`,
          variant: data.emailError ? "destructive" : "default"
        });
      }
    } catch (error: unknown) {
      toast({
        title: "Error requesting consent",
        description: error instanceof Error ? error.message : "Failed to request consent",
        variant: "destructive"
      });
    } finally {
      setRequestingConsent(false);
    }
  };

  const copyConsentUrl = () => {
    if (consentUrl) {
      navigator.clipboard.writeText(consentUrl);
      toast({
        title: "Link copied",
        description: "Consent link copied to clipboard. Share it with the customer.",
      });
    }
  };

  const handleSendToHomeowner = async () => {
    if (useBuilderEntitlementApi && registrationId) {
      setSendingEntitlement(true);
      try {
        await createCustomerEntitlement({ builderCustomerId: registrationId }).unwrap();
        toast({
          title: "Entitlement sent!",
          description: "The warranty entitlement has been sent to the homeowner.",
        });
        onNext();
      } catch (error: unknown) {
        const description =
          error && typeof error === "object" && "data" in error
            ? String((error as { data?: unknown }).data ?? "Failed to send entitlement")
            : error instanceof Error
              ? error.message
              : "Failed to send entitlement";
        toast({
          title: "Error sending entitlement",
          description,
          variant: "destructive",
        });
      } finally {
        setSendingEntitlement(false);
      }
    } else {
      onNext();
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
  const getTotalDocuments = () => {
    return Object.values(uploadedDocs).reduce(
      (total: number, docs: unknown) => total + (Array.isArray(docs) ? docs.length : 0),
      0
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

  const canSubmit = approved && consentConfirmed;

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
      <Card>
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
      </Card>

      {/* Consent Confirmation */}
      <Card className="border-primary/50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageSquare className="w-5 h-5" />
            <span>Customer Consent</span>
          </CardTitle>
          <CardDescription>
            Confirm that you have the customer's permission to send them the warranty documentation digitally
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start space-x-3">
            <Checkbox 
              id="consent" 
              checked={consentConfirmed}
              onCheckedChange={handleConsentChange}
              disabled={consentLocked}
            />
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2">
                <label htmlFor="consent" className={`font-medium ${consentLocked ? 'cursor-default' : 'cursor-pointer'}`}>
                  I confirm that I have the customer's permission to send them this documentation package via email
                </label>
                {consentLocked && (
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    <Lock className="w-3 h-3 mr-1" />
                    Verified by Customer
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {consentLocked 
                  ? "The customer has verified their consent via the consent link."
                  : "By checking this box, you acknowledge that you have obtained verbal or written consent from the homeowner."}
              </p>
            </div>
          </div>

          {!consentConfirmed && !consentLocked && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4">
              <p className="text-sm text-amber-800 mb-3">
                <strong>Don't have consent yet?</strong> Send a consent request to the customer. They will receive a link to provide their consent digitally.
              </p>
              <Button
                variant="outline"
                onClick={handleRequestConsent}
                disabled={requestingConsent}
                className="border-amber-300 hover:bg-amber-100"
              >
                {requestingConsent ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Preparing...
                  </>
                ) : (
                  <>
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Get Customer Consent
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

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
          disabled={!canSubmit || sendingEntitlement}
          className="min-w-[160px]"
        >
          {sendingEntitlement ? "Sending..." : !consentConfirmed ? "Get Customer Consent" : "Send to Homeowner"}
        </Button>
      </div>

      {/* Consent URL Dialog */}
      <AlertDialog open={consentDialogOpen} onOpenChange={setConsentDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Consent Link Generated</AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>
                A consent request email has been sent to the customer. You can also share this link directly if needed:
              </p>
              <div className="bg-muted p-3 rounded-lg break-all text-sm font-mono">
                {consentUrl}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
            <AlertDialogAction onClick={copyConsentUrl}>
              <Copy className="w-4 h-4 mr-2" />
              Copy Link
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ReviewApprovalForm;
