import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { User, Home, FileText, Building, CheckCircle } from "lucide-react";

interface ReviewApprovalFormProps {
  onNext: () => void;
}

const ReviewApprovalForm = ({ onNext }: ReviewApprovalFormProps) => {
  const [approved, setApproved] = useState(false);

  // Mock data - in real app this would come from state management
  const customerData = {
    name: "John & Sarah Johnson",
    email: "john.johnson@email.com",
    phone: "(555) 123-4567",
    propertyAddress: "123 Oak Street, Austin, TX 78701",
    closingDate: "March 15, 2024"
  };

  const selectedItems = [
    { category: "Appliances", name: "Refrigerator", brand: "Samsung", warranty: "2 years", coveredBy: "Manufacturer" },
    { category: "Appliances", name: "Dishwasher", brand: "Bosch", warranty: "2 years", coveredBy: "Manufacturer" },
    { category: "Appliances", name: "HVAC System", brand: "Carrier", warranty: "10 years", coveredBy: "Builder" },
    { category: "Fittings & Fixtures", name: "Light Fixtures", brand: "Kichler", warranty: "5 years", coveredBy: "Builder" },
    { category: "Fittings & Fixtures", name: "Faucets", brand: "Kohler", warranty: "Lifetime", coveredBy: "Manufacturer" },
    { category: "Additional Items", name: "Solar Panels", brand: "Tesla", warranty: "25 years", coveredBy: "Manufacturer" },
    { category: "Structural Components", name: "Roof", brand: "GAF", warranty: "30 years", coveredBy: "Builder" },
    { category: "Structural Components", name: "Windows", brand: "Andersen", warranty: "20 years", coveredBy: "Manufacturer" }
  ];

  const getWarrantyBadgeColor = (coveredBy: string) => {
    switch (coveredBy) {
      case "Manufacturer": return "bg-blue-100 text-blue-800";
      case "Builder": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const groupedItems = selectedItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, typeof selectedItems>);

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
              <p className="text-muted-foreground">{customerData.name}</p>
            </div>
            <div>
              <p className="font-medium">Email</p>
              <p className="text-muted-foreground">{customerData.email}</p>
            </div>
            <div>
              <p className="font-medium">Phone</p>
              <p className="text-muted-foreground">{customerData.phone}</p>
            </div>
            <div>
              <p className="font-medium">Closing Date</p>
              <p className="text-muted-foreground">{customerData.closingDate}</p>
            </div>
          </div>
          <div>
            <p className="font-medium">Property Address</p>
            <p className="text-muted-foreground">{customerData.propertyAddress}</p>
          </div>
        </CardContent>
      </Card>

      {/* Selected Items */}
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
                  {items.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-muted-foreground">Brand: {item.brand}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">{item.warranty}</Badge>
                        <Badge className={getWarrantyBadgeColor(item.coveredBy)}>
                          {item.coveredBy}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
                {Object.keys(groupedItems).indexOf(category) < Object.keys(groupedItems).length - 1 && (
                  <Separator className="mt-4" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Documentation Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="w-5 h-5" />
            <span>Documentation Status</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 text-green-600">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">All required documents uploaded</span>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            16 documents ready for delivery
          </p>
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
          {selectedItems.length} items • 16 documents • Ready to send
        </p>
        <Button 
          onClick={onNext}
          disabled={!approved}
          className="min-w-[120px]"
        >
          Send to Homeowner
        </Button>
      </div>
    </div>
  );
};

export default ReviewApprovalForm;