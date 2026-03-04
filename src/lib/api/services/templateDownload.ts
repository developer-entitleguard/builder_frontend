import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { getApiBaseUrl } from "@/lib/config";

const getAuthToken = (): string => {
  try {
    const userData = localStorage.getItem("userData");
    if (!userData) return "";
    const parsedData = JSON.parse(userData);
    return parsedData.jwt || "";
  } catch (error) {
    console.warn("Failed to parse userData:", error);
    return "";
  }
};

const createDownload = async (url: string, filename: string, authToken: string) => {
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

  const blob = await response.blob();

  if (blob.size === 0) {
    throw new Error("Downloaded file is empty. Please try again.");
  }

  const contentType = response.headers.get("content-type");
  if (
    contentType &&
    !contentType.includes("csv") &&
    !contentType.includes("octet-stream")
  ) {
    console.warn("Unexpected content type for template download:", contentType);
  }

  const downloadUrl = window.URL.createObjectURL(
    new Blob([blob], {
      type: "text/csv",
    })
  );
  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();

  document.body.removeChild(link);
  window.URL.revokeObjectURL(downloadUrl);
};

export const useRegTempDownload = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const download = useCallback(async () => {
    setIsLoading(true);
    try {
      const authToken = getAuthToken();
      const apiBaseUrl = getApiBaseUrl();
      const url = import.meta.env.DEV
        ? `/api/download/registration-template`
        : `${apiBaseUrl}/api/download/registration-template`;

      await createDownload(url, "registration-template.csv", authToken);

      toast({
        title: "Template downloaded",
        description: "Registration template CSV file has been downloaded",
      });
    } catch (error) {
      console.error("Error downloading registration template:", error);
      toast({
        title: "Error downloading template",
        description:
          error instanceof Error
            ? error.message
            : "Failed to download template",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  return { download, isLoading };
};

export const useDownTemp = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const download = useCallback(async () => {
    setIsLoading(true);
    try {
      const authToken = getAuthToken();
      const apiBaseUrl = getApiBaseUrl();
      const url = import.meta.env.DEV
        ? `/api/download-template`
        : `${apiBaseUrl}/api/download-template`;

      await createDownload(url, "builder_template.csv", authToken);

      toast({
        title: "Template downloaded",
        description: "BOM template CSV file has been downloaded",
      });
    } catch (error) {
      console.error("Error downloading BOM template:", error);
      toast({
        title: "Error downloading template",
        description:
          error instanceof Error
            ? error.message
            : "Failed to download template",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  return { download, isLoading };
};

export const useGetDownloadActivityTemplate = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const download = useCallback(async () => {
    setIsLoading(true);
    try {
      const authToken = getAuthToken();
      const apiBaseUrl = getApiBaseUrl();
      const url = import.meta.env.DEV
        ? `/api/builder/download/activity-template`
        : `${apiBaseUrl}/api/builder/download/activity-template`;

      await createDownload(url, "activity_template.csv", authToken);

      toast({
        title: "Template downloaded",
        description: "Activity template CSV file has been downloaded",
      });
    } catch (error) {
      console.error("Error downloading activity template:", error);
      toast({
        title: "Error downloading template",
        description:
          error instanceof Error
            ? error.message
            : "Failed to download activity template",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  return { download, isLoading };
};


