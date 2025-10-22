import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Mail, Download, Eye, ArrowLeft } from "lucide-react";
import type { CustomerDetailsResponse } from "@/lib/api/types";

interface SendConfirmationFormProps {
  onNext?: () => void;
  customerDetailsData: CustomerDetailsResponse | null;
  isLoading?: boolean;
  error?: unknown;
}

const SendConfirmationForm = ({ onNext, customerDetailsData, isLoading = false, error }: SendConfirmationFormProps) => {
  const [status, setStatus] = useState<'sending' | 'sent' | 'delivered'>('sending');

  useEffect(() => {
    // Simulate sending process
    const timer1 = setTimeout(() => setStatus('sent'), 2000);
    const timer2 = setTimeout(() => setStatus('delivered'), 4000);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  const customerData = customerDetailsData?.data?.customer ? {
    name: `${customerDetailsData.data.customer.firstName} ${customerDetailsData.data.customer.lastName}`,
    email: customerDetailsData.data.customer.email,
    propertyAddress: `${customerDetailsData.data.customer.address}, ${customerDetailsData.data.customer.city}, ${customerDetailsData.data.customer.state} ${customerDetailsData.data.customer.zip}`
  } : {
    name: "Loading...",
    email: "Loading...",
    propertyAddress: "Loading..."
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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Loading...</h2>
          <p className="text-muted-foreground">Fetching customer details</p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center space-x-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-muted-foreground">Loading customer data...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Error</h2>
          <p className="text-muted-foreground">Failed to load customer details</p>
        </div>
        <Card className="border-red-200">
          <CardContent className="pt-6">
            <div className="text-center text-red-600">
              <p>Unable to fetch customer data. Please try again.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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

      {/* Delivery Details */}
      <Card>
        <CardHeader>
          <CardTitle>Delivery Details</CardTitle>
          <CardDescription>Package sent to homeowner</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
        </CardContent>
      </Card>

      {/* Package Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Package Contents</CardTitle>
          <CardDescription>Documentation included in this delivery</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-4 border rounded-lg">
              <p className="text-2xl font-bold text-primary">
                {isLoading ? "..." : customerDetailsData?.data?.totalItems || 0}
              </p>
              <p className="text-sm text-muted-foreground">Items</p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-2xl font-bold text-primary">
                {isLoading ? "..." : customerDetailsData?.data?.totalDocuments || 0}
              </p>
              <p className="text-sm text-muted-foreground">Documents</p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-2xl font-bold text-primary">
                {isLoading ? "..." : customerDetailsData?.data?.totalCategories || 0}
              </p>
              <p className="text-sm text-muted-foreground">Categories</p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-2xl font-bold text-primary">
                {isLoading ? "..." : `${customerDetailsData?.data?.completionPercent || 0}%`}
              </p>
              <p className="text-sm text-muted-foreground">Complete</p>
            </div>
          </div>
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
          onClick={() => window.location.reload()}
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