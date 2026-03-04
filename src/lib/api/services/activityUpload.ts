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

export const uploadActivitiesCsv = async (
  projectId: string,
  file: File
): Promise<void> => {
  const authToken = getAuthToken();
  const apiBaseUrl = getApiBaseUrl();
  const url = import.meta.env.DEV
    ? `/api/builder/projects/${projectId}/upload/activities`
    : `${apiBaseUrl}/api/builder/projects/${projectId}/upload/activities`;

  const formData = new FormData();
  formData.append("file", file);
  // Also include projectId in the multipart body for backends that expect it
  formData.append("projectId", projectId);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: authToken ? `Bearer ${authToken}` : "",
      // Do not set Content-Type; browser sets multipart/form-data with boundary
    },
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Upload failed: ${response.statusText}`);
  }
};

export const useUploadActivitiesCsv = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const upload = useCallback(
    async (projectId: string, file: File) => {
      setIsLoading(true);
      try {
        await uploadActivitiesCsv(projectId, file);
        toast({
          title: "Activities imported",
          description: "CSV file was uploaded successfully.",
        });
        return true;
      } catch (error) {
        console.error("Error uploading activities CSV:", error);
        toast({
          title: "Error uploading file",
          description:
            error instanceof Error
              ? error.message
              : "Failed to upload activities",
          variant: "destructive",
        });
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [toast]
  );

  return { upload, isLoading };
};
