import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Mail, Download, Eye, ArrowLeft } from "lucide-react";
import { useGetCustomerDetailsQuery } from "@/store/api";
import { useOrganization } from "@/hooks/useOrganization";

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

interface SendConfirmationFormProps {
  onNext?: () => void;
  registrationId?: string | null;
}

const SendConfirmationForm = ({ onNext, registrationId }: SendConfirmationFormProps) => {
  const navigate = useNavigate();
  const { organization } = useOrganization();
  const builderId = organization?.id ?? getBuilderId();

  const { data: customerDetailsResponse, isLoading: loadingDetails } = useGetCustomerDetailsQuery(
    { builderId: builderId ?? "", customerId: registrationId ?? "" },
    { skip: !registrationId || !builderId }
  );

  const [status, setStatus] = useState<'sending' | 'sent' | 'delivered'>('sending');

  useEffect(() => {
    const timer1 = setTimeout(() => setStatus('sent'), 2000);
    const timer2 = setTimeout(() => setStatus('delivered'), 4000);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  const apiData = customerDetailsResponse?.data;
  const customer = apiData?.customer;
  const customerData = {
    name: customer
      ? [customer.firstName, customer.lastName].filter(Boolean).join(" ") || customer.email
      : "—",
    email: customer?.email ?? "—",
    propertyAddress: customer
      ? [customer.address, customer.city, customer.state, customer.zip].filter(Boolean).join(", ") || "—"
      : "—",
  };
  const packageStats = {
    totalItems: apiData?.totalItems ?? 0,
    totalDocuments: apiData?.totalDocuments ?? 0,
    totalCategories: apiData?.totalCategories ?? 0,
    completionPercent: apiData?.completionPercent ?? 100,
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'sending':
        return {
          title: "Sending Documentation Package...",
          description: "Preparing and sending warranty documentation to homeowner",
          icon: <Mail className="w-8 h-8 text-blue-600 animate-pulse" />
        };
      case 'sent':
        return {
          title: "Documentation Package Sent",
          description: "Email sent successfully to homeowner",
          icon: <CheckCircle className="w-8 h-8 text-green-600" />
        };
      case 'delivered':
        return {
          title: "Package Delivered & Confirmed",
          description: "Homeowner has received and acknowledged the documentation",
          icon: <CheckCircle className="w-8 h-8 text-green-600" />
        };
    }
  };

  const statusInfo = getStatusMessage();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Documentation Sent</h2>
        <p className="text-muted-foreground">Warranty package delivered to homeowner</p>
      </div>

      {/* Status Card */}
      <Card className="border-l-4 border-l-green-500">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            {statusInfo.icon}
            <div className="flex-1">
              <h3 className="text-lg font-semibold">{statusInfo.title}</h3>
              <p className="text-muted-foreground">{statusInfo.description}</p>
            </div>
            {status === 'delivered' && (
              <Badge className="bg-green-100 text-green-800">
                Confirmed
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Delivery Details - from getCustomerDetails API */}
      <Card>
        <CardHeader>
          <CardTitle>Delivery Details</CardTitle>
          <CardDescription>Package sent to homeowner</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingDetails ? (
            <p className="text-muted-foreground">Loading delivery details...</p>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="font-medium">Sent to</p>
                <p className="text-muted-foreground">{customerData.name}</p>
              </div>
              <div>
                <p className="font-medium">Email</p>
                <p className="text-muted-foreground">{customerData.email}</p>
              </div>
              <div>
                <p className="font-medium">Property</p>
                <p className="text-muted-foreground">{customerData.propertyAddress}</p>
              </div>
              <div>
                <p className="font-medium">Sent at</p>
                <p className="text-muted-foreground">{new Date().toLocaleString()}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Package Summary - from getCustomerDetails API */}
      <Card>
        <CardHeader>
          <CardTitle>Package Contents</CardTitle>
          <CardDescription>Documentation included in this delivery</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingDetails ? (
            <p className="text-muted-foreground text-center py-4">Loading package details...</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="p-4 border rounded-lg">
                <p className="text-2xl font-bold text-primary">{packageStats.totalItems}</p>
                <p className="text-sm text-muted-foreground">Items</p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-2xl font-bold text-primary">{packageStats.totalDocuments}</p>
                <p className="text-sm text-muted-foreground">Documents</p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-2xl font-bold text-primary">{packageStats.totalCategories}</p>
                <p className="text-sm text-muted-foreground">Categories</p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-2xl font-bold text-primary">{packageStats.completionPercent}%</p>
                <p className="text-sm text-muted-foreground">Complete</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {status === 'delivered' && (
        <Card>
          <CardHeader>
            <CardTitle>Next Steps</CardTitle>
            <CardDescription>Additional actions available</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" className="flex items-center space-x-2">
                <Eye className="w-4 h-4" />
                <span>Preview Package</span>
              </Button>
              <Button variant="outline" className="flex items-center space-x-2">
                <Download className="w-4 h-4" />
                <span>Download Copy</span>
              </Button>
              <Button variant="outline" className="flex items-center space-x-2">
                <Mail className="w-4 h-4" />
                <span>Resend Email</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between items-center pt-6 border-t">
        <Button
          variant="outline"
          onClick={() => navigate("/onboarding")}
          className="flex items-center space-x-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Create New Package</span>
        </Button>
        {status === 'delivered' && (
          <Badge className="bg-green-100 text-green-800 px-4 py-2">
            ✓ Documentation Package Delivered Successfully
          </Badge>
        )}
      </div>
    </div>
  );
};

export default SendConfirmationForm;