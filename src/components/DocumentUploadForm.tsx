import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DocumentUploadFormProps {
  onNext: () => void;
}

const DocumentUploadForm = ({ onNext }: DocumentUploadFormProps) => {
  const { toast } = useToast();
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, string[]>>({});

  // Mock selected items - in real app this would come from state management
  const selectedItems = {
    "Appliances": ["Refrigerator", "Dishwasher", "HVAC System"],
    "Fittings & Fixtures": ["Light Fixtures", "Faucets"],
    "Additional Items": ["Solar Panels"],
    "Structural Components": ["Roof", "Windows"]
  };

  const handleFileUpload = (category: string, item: string) => {
    // Mock file upload
    const key = `${category}-${item}`;
    setUploadedDocs(prev => ({
      ...prev,
      [key]: [...(prev[key] || []), `${item}_warranty.pdf`, `${item}_manual.pdf`]
    }));
    
    toast({
      title: "Documents uploaded",
      description: `Warranty and manual uploaded for ${item}`,
    });
  };

  const getDocumentCount = () => {
    return Object.values(uploadedDocs).reduce((total, docs) => total + docs.length, 0);
  };

  const getTotalItems = () => {
    return Object.values(selectedItems).reduce((total, items) => total + items.length, 0);
  };

  const isComplete = getDocumentCount() > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Upload Documents</h2>
          <p className="text-muted-foreground">Upload warranties, manuals, and certificates for selected items</p>
        </div>
        <Badge variant="secondary" className="text-sm">
          {getDocumentCount()} documents uploaded
        </Badge>
      </div>

      <div className="grid gap-6">
        {Object.entries(selectedItems).map(([category, items]) => (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="text-lg">{category}</CardTitle>
              <CardDescription>
                Upload documentation for each selected item
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {items.map((item) => {
                  const key = `${category}-${item}`;
                  const docs = uploadedDocs[key] || [];
                  const hasUploads = docs.length > 0;

                  return (
                    <div key={item} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          hasUploads ? 'bg-green-100 text-green-600' : 'bg-muted text-muted-foreground'
                        }`}>
                          {hasUploads ? <Check className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                        </div>
                        <div>
                          <h4 className="font-medium">{item}</h4>
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
                        onClick={() => handleFileUpload(category, item)}
                        className="flex items-center space-x-2"
                      >
                        <Upload className="w-4 h-4" />
                        <span>{hasUploads ? "Add More" : "Upload"}</span>
                      </Button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-between items-center pt-6 border-t">
        <p className="text-sm text-muted-foreground">
          Upload documentation for {getTotalItems()} selected items
        </p>
        <Button 
          onClick={onNext}
          disabled={!isComplete}
          className="min-w-[120px]"
        >
          Continue
        </Button>
      </div>
    </div>
  );
};

export default DocumentUploadForm;