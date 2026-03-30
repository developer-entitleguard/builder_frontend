import { useState } from "react";
import { useOrganization } from "@/hooks/useOrganization";
import { useUploadTemplateMutation } from "@/store/api";
import { useDownTemp } from "@/lib/api/services/templateDownload";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Upload, Download } from "lucide-react";
import InfoCircleOutlined from "@ant-design/icons/es/icons/InfoCircleOutlined";

interface BOMUploadProps {
  onSuccess: () => void;
}

interface ParsedBomCsvItem {
  name?: string | null;
  category?: string | null;
  make?: string | null;
  brand?: string | null;
  model?: string | null;
  description?: string | null;
  price?: number | null;
  documentation_url?: string | null;
  notes?: string | null;
  purchaser?: string | null;
  warranty_years?: number | null;
}

export const BOMUpload = ({ onSuccess }: BOMUploadProps) => {
  const { organization } = useOrganization();
  const { toast } = useToast();
  const [uploadTemplate, { isLoading: isUploading }] = useUploadTemplateMutation();
  const { download: downloadBomTemplate, isLoading: downloadingTemplate } = useDownTemp();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    projectName: "",
    warrantyYears: "",
    file: null as File | null
  });

  const builderOrganizationId = organization?.id ?? (() => {
    try {
      const d = localStorage.getItem("userData");
      if (!d) return null;
      const p = JSON.parse(d);
      return p?.userInfo?.builderOrganization?.id ?? p?.builderOrganization?.id ?? null;
    } catch { return null; }
  })();

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

  const parseCSV = (
    text: string,
    defaultWarrantyYears: number | null
  ): ParsedBomCsvItem[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const items: ParsedBomCsvItem[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      const item: ParsedBomCsvItem = {};
      
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
    
    if (!formData.file || !formData.name) {
      toast({
        title: "Missing information",
        description: "Please fill in BOM name and select a CSV file.",
        variant: "destructive"
      });
      return;
    }

    if (!builderOrganizationId) {
      toast({
        title: "Error",
        description: "Organization ID is missing. Please log in again.",
        variant: "destructive"
      });
      return;
    }
    try {
      const parsedWarranty =
        formData.warrantyYears.trim() === ""
          ? undefined
          : Number(formData.warrantyYears);

      await uploadTemplate({
        file: formData.file,
        bomName: formData.name,
        projectName: formData.projectName || undefined,
        builderOrganizationId,
        warranty:
          typeof parsedWarranty === "number" && Number.isFinite(parsedWarranty)
            ? parsedWarranty
            : undefined,
      }).unwrap();
      toast({
        title: "Bill of Materials uploaded successfully",
        description: "BOM has been uploaded successfully."
      });
      setDialogOpen(false);
      setFormData({ name: "", projectName: "", warrantyYears: "", file: null });
      onSuccess();
    } catch (error: unknown) {
      const message = error && typeof error === "object" && "data" in error
        ? String((error as { data?: { message?: string } }).data?.message ?? "Failed to upload Bill of Materials")
        : error instanceof Error ? error.message : "Failed to upload Bill of Materials";
      toast({
        title: "Error uploading Bill of Materials",
        description: message,
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="w-4 h-4 mr-2" />
          Upload item set via CSV
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload item set via CSV</DialogTitle>
          <DialogDescription>
          Upload a CSV file to bulk-add warranty items. Required columns: name, category. Optional: make, brand, model, description, price, warranty_url, notes, installed_by, warranty_years.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="bomName">Item set name *</Label>
            <Input
              id="bomName"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="e.g., Master BOM 2024"
            />
          </div>
          <div>
            <Label htmlFor="projectName">Attach to project (Optional)</Label>
            <Input
              id="projectName"
              value={formData.projectName}
              onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
              placeholder="e.g., Riverside Development"
            />
            <p className="mt-2 flex items-start gap-2 text-sm text-blue-600">
              <InfoCircleOutlined className="mt-0.5 text-base shrink-0" />
              <span>
                If provided this item set will be pre-linked to the selected project. You can still use it on other projects.
              </span>
            </p>
          </div>
          <div>
            <Label htmlFor="warrantyYears">Default warranty period (years)</Label>
            <Input
              id="warrantyYears"
              type="number"
              min="0"
              max="99"
              value={formData.warrantyYears}
              onChange={(e) => setFormData({ ...formData, warrantyYears: e.target.value })}
              placeholder="e.g., 2"
            />
            <p className="mt-2 flex items-start gap-2 text-sm text-blue-600">
              <InfoCircleOutlined className="mt-0.5 text-base shrink-0" />
              <span>
                Applied to all items in this CSV unless a specific warranty_years value is set per row.
              </span>
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
            <Button type="button" variant="ghost" size="sm" onClick={downloadBomTemplate} disabled={downloadingTemplate}>
              <Download className="w-4 h-4 mr-2" />
              {downloadingTemplate ? "Downloading..." : "Download Template"}
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isUploading}>
                {isUploading ? "Uploading..." : "Upload"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
