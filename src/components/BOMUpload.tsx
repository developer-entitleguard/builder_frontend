import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUploadTemplateMutation } from "@/lib/api/services/bomUpload";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Upload, Download } from "lucide-react";
import { getApiBaseUrl } from "@/lib/config";

interface BOMUploadProps {
  onSuccess: () => void;
}

interface CSVItem {
  name?: string;
  category?: string;
  make?: string;
  brand?: string;
  model?: string;
  description?: string;
  price?: number | null;
  documentation_url?: string;
  notes?: string;
  purchaser?: string;
}

export const BOMUpload = ({ onSuccess }: BOMUploadProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [uploadTemplate, { isLoading: isUploading }] =
    useUploadTemplateMutation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    projectName: "",
    file: null as File | null,
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const fileName = file.name.toLowerCase();
      const isValidCsv =
        fileName.endsWith(".csv") ||
        file.type === "text/csv" ||
        file.type === "application/csv";

      if (!isValidCsv) {
        toast({
          title: "Invalid file type",
          description: "Please upload a CSV (.csv) file",
          variant: "destructive",
        });
        return;
      }
    }
    setFormData({ ...formData, file });
  };

  const handleDownloadTemplate = async () => {
    try {
      // Get JWT token from localStorage
      const userData = localStorage.getItem("userData");
      let authToken = "";

      if (userData) {
        try {
          const parsedData = JSON.parse(userData);
          if (parsedData.jwt) {
            authToken = parsedData.jwt;
          }
        } catch (error) {
          console.warn("Failed to parse userData:", error);
        }
      }

      // Get API base URL
      const apiBaseUrl = getApiBaseUrl();
      // Add cache-busting query parameter to prevent 304 responses
      const timestamp = Date.now();
      const url = import.meta.env.DEV
        ? `/auth/download-template`
        // ?t=${timestamp}
        : `${apiBaseUrl}/auth/download-template`;

      // Fetch the file with cache-busting headers
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: authToken ? `Bearer ${authToken}` : "",
          Accept: "text/csv, application/octet-stream, */*",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
        },
        cache: "no-store", // Force fresh request
      });

      if (!response.ok) {
        throw new Error(`Failed to download template: ${response.statusText}`);
      }

      // Get the blob from response
      const blob = await response.blob();

      // Verify blob is valid (not empty and has correct type)
      if (blob.size === 0) {
        throw new Error("Downloaded file is empty. Please try again.");
      }

      // Verify content type if available
      const contentType = response.headers.get("content-type");
      if (
        contentType &&
        !contentType.includes("csv") &&
        !contentType.includes("octet-stream")
      ) {
        console.warn("Unexpected content type:", contentType);
      }

      // Create a download link with proper MIME type
      const downloadUrl = window.URL.createObjectURL(
        new Blob([blob], {
          type: "text/csv",
        })
      );
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = "builder_template.csv";
      document.body.appendChild(link);
      link.click();

      // Clean up
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      toast({
        title: "Template downloaded",
        description: "BOM template CSV file has been downloaded",
      });
    } catch (error) {
      console.error("Error downloading template:", error);
      toast({
        title: "Error downloading template",
        description:
          error instanceof Error
            ? error.message
            : "Failed to download template",
        variant: "destructive",
      });
    }
  };

  const parseCSV = (text: string): CSVItem[] => {
    const lines = text.split("\n").filter((line) => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const items: CSVItem[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",");
      const item: CSVItem = {};

      headers.forEach((header, index) => {
        const value = values[index]?.trim() || null;

        // Map CSV columns to database columns
        if (header === "name" || header === "item name") {
          item.name = value;
        } else if (header === "category") {
          item.category = value;
        } else if (header === "make") {
          item.make = value;
        } else if (header === "brand") {
          item.brand = value;
        } else if (header === "model") {
          item.model = value;
        } else if (header === "description") {
          item.description = value;
        } else if (header === "price") {
          item.price = value ? parseFloat(value) : null;
        } else if (
          header === "documentation_url" ||
          header === "documentation url"
        ) {
          item.documentation_url = value;
        } else if (header === "notes") {
          item.notes = value;
        } else if (header === "purchaser") {
          item.purchaser = value;
        }
      });

      if (item.name && item.category) {
        items.push(item);
      }
    }

    return items;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !formData.file || !formData.name) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // Get builderOrganizationId from user
    const builderOrganizationId =
      user && "builderOrganization" in user && user.builderOrganization
        ? user.builderOrganization.id
        : user && "id" in user
        ? user.id
        : null;

    if (!builderOrganizationId) {
      toast({
        title: "Error",
        description: "Organization ID is missing. Please log in again.",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await uploadTemplate({
        file: formData.file,
        bomName: formData.name,
        projectName: formData.projectName || undefined,
        builderOrganizationId: builderOrganizationId,
      }).unwrap();

      toast({
        title: "Bill of Materials uploaded successfully",
        description: result.message || "BOM has been uploaded successfully",
      });

      setDialogOpen(false);
      setFormData({ name: "", projectName: "", file: null });
      onSuccess();
    } catch (error) {
      console.error("Error uploading BOM:", error);
      const errorMessage =
        error && typeof error === "object" && "data" in error
          ? String(
              (error.data as { message?: string })?.message ||
                "Failed to upload Bill of Materials"
            )
          : error instanceof Error
          ? error.message
          : "Failed to upload Bill of Materials";
      toast({
        title: "Error uploading Bill of Materials",
        description: errorMessage,
        variant: "destructive",
      });
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
            Upload a CSV (.csv) file with your items. Required columns: name,
            category. Optional: make, brand, model, description, price,
            documentation_url, notes, purchaser.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="bomName">BOM Name *</Label>
            <Input
              id="bomName"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
              placeholder="e.g., Master BOM 2024"
            />
          </div>
          <div>
            <Label htmlFor="projectName">Project Name (Optional)</Label>
            <Input
              id="projectName"
              value={formData.projectName}
              onChange={(e) =>
                setFormData({ ...formData, projectName: e.target.value })
              }
              placeholder="e.g., Riverside Development"
            />
          </div>
          <div>
            <Label htmlFor="csvFile">CSV File (.csv) *</Label>
            <Input
              id="csvFile"
              type="file"
              accept=".csv,text/csv,application/csv"
              onChange={handleFileChange}
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Upload a CSV (.csv) file with item data
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleDownloadTemplate}
            >
              <Download className="w-4 h-4 mr-2" />
              Download Template
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isUploading}>
              {isUploading ? "Uploading..." : "Upload"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
