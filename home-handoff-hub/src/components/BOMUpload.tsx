import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Upload, Download } from "lucide-react";

interface BOMUploadProps {
  onSuccess: () => void;
}

export const BOMUpload = ({ onSuccess }: BOMUploadProps) => {
  const { user } = useAuth();
  const { organization } = useOrganization();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    projectName: "",
    warrantyYears: "",
    file: null as File | null
  });

  const downloadTemplate = () => {
    const headers = ["name", "category", "make", "brand", "model", "description", "price", "documentation_url", "notes", "purchaser", "warranty_years"];
    const sampleRow = ["Kitchen Faucet", "Plumbing", "Moen", "Moen", "Arbor 7594", "Pull-down kitchen faucet with MotionSense", "450", "https://www.moen.com/products/arbor", "Installed in main kitchen", "Home Depot", "5"];
    
    const csvContent = [headers.join(","), sampleRow.join(",")].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "bom_template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type !== "text/csv") {
      toast({
        title: "Invalid file type",
        description: "Please upload a CSV file",
        variant: "destructive"
      });
      return;
    }
    setFormData({ ...formData, file });
  };

  const parseCSV = (text: string, defaultWarrantyYears: number | null): any[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const items = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      const item: any = {};
      
      headers.forEach((header, index) => {
        const value = values[index]?.trim() || null;
        
        // Map CSV columns to database columns
        if (header === 'name' || header === 'item name') {
          item.name = value;
        } else if (header === 'category') {
          item.category = value;
        } else if (header === 'make') {
          item.make = value;
        } else if (header === 'brand') {
          item.brand = value;
        } else if (header === 'model') {
          item.model = value;
        } else if (header === 'description') {
          item.description = value;
        } else if (header === 'price') {
          item.price = value ? parseFloat(value) : null;
        } else if (header === 'documentation_url' || header === 'documentation url') {
          item.documentation_url = value;
        } else if (header === 'notes') {
          item.notes = value;
        } else if (header === 'purchaser') {
          item.purchaser = value;
        } else if (header === 'warranty_years' || header === 'warranty years') {
          item.warranty_years = value ? parseInt(value, 10) : null;
        }
      });
      
      // Apply default warranty years if not specified in CSV
      if (item.warranty_years === undefined || item.warranty_years === null) {
        item.warranty_years = defaultWarrantyYears;
      }
      
      if (item.name && item.category) {
        items.push(item);
      }
    }
    
    return items;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !organization || !formData.file) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);

    try {
      // Read the CSV file
      const text = await formData.file.text();
      const defaultWarrantyYears = formData.warrantyYears ? parseInt(formData.warrantyYears, 10) : null;
      const items = parseCSV(text, defaultWarrantyYears);

      if (items.length === 0) {
        throw new Error("No valid items found in CSV. Please ensure the CSV has 'name' and 'category' columns.");
      }

      // Create the BOM record
      const { data: bomData, error: bomError } = await supabase
        .from('bill_of_materials')
        .insert({
          builder_id: user.id,
          organization_id: organization.id,
          name: formData.name,
          project_name: formData.projectName || null
        })
        .select()
        .single();

      if (bomError) throw bomError;

      // Insert all items with the BOM ID
      const itemsWithBOM = items.map(item => ({
        ...item,
        builder_id: user.id,
        organization_id: organization.id,
        bom_id: bomData.id
      }));

      const { error: itemsError } = await supabase
        .from('builder_items')
        .insert(itemsWithBOM);

      if (itemsError) throw itemsError;

      toast({
        title: "Bill of Materials uploaded successfully",
        description: `${items.length} items have been added`
      });

      setDialogOpen(false);
      setFormData({ name: "", projectName: "", warrantyYears: "", file: null });
      onSuccess();
    } catch (error: any) {
      console.error('Error uploading BOM:', error);
      toast({
        title: "Error uploading Bill of Materials",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="w-4 h-4 mr-2" />
          Upload Bill of Materials
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Bill of Materials</DialogTitle>
          <DialogDescription>
            Upload a CSV file with your items. Required columns: name, category. Optional: make, brand, model, description, price, documentation_url, notes, purchaser, warranty_years.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="bomName">BOM Name *</Label>
            <Input
              id="bomName"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="e.g., Master BOM 2024"
            />
          </div>
          <div>
            <Label htmlFor="projectName">Project Name (Optional)</Label>
            <Input
              id="projectName"
              value={formData.projectName}
              onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
              placeholder="e.g., Riverside Development"
            />
          </div>
          <div>
            <Label htmlFor="warrantyYears">Default Warranty Duration (Years)</Label>
            <Input
              id="warrantyYears"
              type="number"
              min="0"
              max="99"
              value={formData.warrantyYears}
              onChange={(e) => setFormData({ ...formData, warrantyYears: e.target.value })}
              placeholder="e.g., 2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Applied to all items unless specified in CSV
            </p>
          </div>
          <div>
            <Label htmlFor="csvFile">CSV File *</Label>
            <Input
              id="csvFile"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Upload a CSV file with item data
            </p>
          </div>
          <div className="flex justify-between items-center pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={downloadTemplate}>
              <Download className="w-4 h-4 mr-2" />
              Download Template
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={uploading}>
                {uploading ? "Uploading..." : "Upload"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
