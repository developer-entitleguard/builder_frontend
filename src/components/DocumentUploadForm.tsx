import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface DocumentUploadFormProps {
  onNext: (data: any) => void;
  initialData?: any;
  selectedItems?: string[];
}

const DocumentUploadForm = ({ onNext, initialData, selectedItems: selectedItemIds }: DocumentUploadFormProps) => {
  const { toast } = useToast();
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, string[]>>(initialData || {});
  const [availableItems, setAvailableItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (selectedItemIds?.length) {
      fetchSelectedItems();
    } else {
      setLoading(false);
    }
  }, [selectedItemIds]);

  const fetchSelectedItems = async () => {
    if (!selectedItemIds?.length) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('builder_items')
        .select('*')
        .in('id', selectedItemIds);

      if (error) throw error;
      setAvailableItems(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching selected items",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Group items by category
  const groupedItems = availableItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, any[]>);

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
    return availableItems.length;
  };

  const isComplete = getDocumentCount() > 0;

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
          <h2 className="text-2xl font-bold text-foreground">Upload Documents</h2>
          <p className="text-muted-foreground">Upload warranties, manuals, and certificates for selected items</p>
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
          {Object.entries(groupedItems).map(([category, items]: [string, any[]]) => (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="text-lg">{category}</CardTitle>
              <CardDescription>
                Upload documentation for each selected item
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {items.map((item: any) => {
                  const key = `${category}-${item.name}`;
                  const docs = uploadedDocs[key] || [];
                  const hasUploads = docs.length > 0;

                  return (
                    <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
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
                        onClick={() => handleFileUpload(category, item.name)}
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
      )}

      <div className="flex justify-between items-center pt-6 border-t">
        <p className="text-sm text-muted-foreground">
          Upload documentation for {getTotalItems()} selected items
        </p>
        <Button 
          onClick={() => onNext(uploadedDocs)}
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