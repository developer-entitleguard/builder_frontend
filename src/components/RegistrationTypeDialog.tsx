import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { User, Users, Upload, Download } from "lucide-react";
import { getApiBaseUrl } from "@/lib/config";

interface RegistrationTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const RegistrationTypeDialog = ({
  open,
  onOpenChange,
  onSuccess,
}: RegistrationTypeDialogProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedType, setSelectedType] = useState<"single" | "bulk" | null>(
    null
  );
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleSingleRegistration = () => {
    onOpenChange(false);
    navigate("/onboarding");
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

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

    setSelectedFile(file);
  };

  const handleFileUpload = async (file?: File) => {
    const fileToUpload = file || selectedFile;
    if (!fileToUpload) {
      toast({
        title: "No file selected",
        description: "Please select a CSV (.csv) file to upload",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      // Get builderOrganizationId and JWT token from localStorage
      const userData = localStorage.getItem("userData");
      let authToken = "";
      let builderOrganizationId = "";

      if (userData) {
        try {
          const parsedData = JSON.parse(userData);
          if (parsedData.jwt) {
            authToken = parsedData.jwt;
          }
          if (parsedData.userInfo?.builderOrganization?.id) {
            builderOrganizationId = parsedData.userInfo.builderOrganization.id;
          }
        } catch (error) {
          console.warn("Failed to parse userData:", error);
        }
      }

      if (!builderOrganizationId) {
        toast({
          title: "Error",
          description: "Organization ID is missing. Please log in again.",
          variant: "destructive",
        });
        setUploading(false);
        return;
      }

      // Create FormData for file upload (file in body)
      const formData = new FormData();
      formData.append("file", fileToUpload);

      // Get API base URL
      const apiBaseUrl = getApiBaseUrl();
      // builderOrganizationId as query parameter
      const url = import.meta.env.DEV
        ? `/api/upload/registration-template?builderOrganizationId=${encodeURIComponent(
            builderOrganizationId
          )}`
        : `${apiBaseUrl}/api/upload/registration-template?builderOrganizationId=${encodeURIComponent(
            builderOrganizationId
          )}`;

      // Upload file to API
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: authToken ? `Bearer ${authToken}` : "",
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Failed to upload file: ${response.statusText}`
        );
      }

      const result = await response.json();

      toast({
        title: "Success",
        description: result.message || "Registration(s) created successfully",
      });

      onOpenChange(false);
      setSelectedType(null);
      setSelectedFile(null);
      onSuccess?.();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to process file";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
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
        ? `/api/download/registration-template`
        : `${apiBaseUrl}/api/download/registration-template`;

      // Fetch the file with cache-busting headers
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: authToken ? `Bearer ${authToken}` : "",
          Accept: "text/csv, application/octet-stream, */*",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
        },
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Failed to download template: ${response.statusText}`);
      }

      // Get the blob from response
      const blob = await response.blob();

      // Verify blob is valid (not empty)
      if (blob.size === 0) {
        throw new Error("Downloaded file is empty. Please try again.");
      }

      // Optionally check content type
      const contentType = response.headers.get("content-type");
      if (
        contentType &&
        !contentType.includes("csv") &&
        !contentType.includes("octet-stream")
      ) {
        console.warn(
          "Unexpected content type for registration template:",
          contentType
        );
      }

      // Create a download link with proper MIME type
      const downloadUrl = window.URL.createObjectURL(
        new Blob([blob], {
          type: "text/csv",
        })
      );
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = "registration-template.csv";
      document.body.appendChild(link);
      link.click();

      // Clean up
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      toast({
        title: "Template downloaded",
        description: "Registration template CSV file has been downloaded",
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

  const handleBack = () => {
    setSelectedType(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {selectedType === null && "New Registration"}
            {selectedType === "single" && "Single Registration"}
            {selectedType === "bulk" && "Bulk Registration"}
          </DialogTitle>
          <DialogDescription>
            {selectedType === null &&
              "Choose how you want to create registrations"}
            {selectedType === "single" &&
              "Create a single homeowner registration"}
            {selectedType === "bulk" &&
              "Upload a CSV file to create multiple registrations"}
          </DialogDescription>
        </DialogHeader>

        {selectedType === null && (
          <div className="grid gap-4 py-4">
            <Button
              variant="outline"
              className="h-24 flex-col gap-2"
              onClick={handleSingleRegistration}
            >
              <User className="h-8 w-8" />
              <span className="font-semibold">Single Registration</span>
              <span className="text-xs text-muted-foreground">
                Create one registration at a time
              </span>
            </Button>

            <Button
              variant="outline"
              className="h-24 flex-col gap-2"
              onClick={() => setSelectedType("bulk")}
            >
              <Users className="h-8 w-8" />
              <span className="font-semibold">Bulk Registration</span>
              <span className="text-xs text-muted-foreground">
                Upload CSV to create multiple
              </span>
            </Button>
          </div>
        )}

        {selectedType === "bulk" && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="csv-file">Select CSV File (.csv)</Label>
              <Input
                id="csv-file"
                type="file"
                accept=".csv,text/csv,application/csv"
                onChange={handleFileSelect}
                disabled={uploading}
              />
              {selectedFile && (
                <p className="text-sm text-muted-foreground">
                  Selected: {selectedFile.name}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Required columns: customer_name, customer_email,
                property_address, property_city, property_state, property_zip
              </p>
              <p className="text-xs text-muted-foreground">
                Optional columns: customer_phone, project_name, settlement_date,
                notes
              </p>
            </div>
            {/* Download and Upload buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleDownloadTemplate}
                className="flex-1"
                disabled={uploading}
              >
                <Download className="w-4 h-4 mr-2" />
                Download Template
              </Button>
              <Button
                variant="outline"
                onClick={() => handleFileUpload()}
                className="flex-1"
                disabled={uploading || !selectedFile}
              >
                <Upload className="w-4 h-4 mr-2" />
                {uploading ? "Uploading..." : "Upload"}
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleBack} className="flex-1">
                Back
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
