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
  file: File,
  saveDuplicate: boolean,
  dryRun = false
): Promise<unknown> => {
  const authToken = getAuthToken();
  const apiBaseUrl = getApiBaseUrl();
  const path = `/api/builder/projects/${projectId}/upload/activities`;
  const urlBase = import.meta.env.DEV ? path : `${apiBaseUrl}${path}`;
  const url =
    `${urlBase}?saveDuplicate=${saveDuplicate ? "true" : "false"}` +
    `&dryRun=${dryRun ? "true" : "false"}`;

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

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return await response.json();
  }
  // Some backends return empty body on success.
  return { success: true };
};

export const useUploadActivitiesCsv = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const upload = useCallback(
    async (projectId: string, file: File, saveDuplicate: boolean, dryRun = false) => {
      setIsLoading(true);
      try {
        const result = await uploadActivitiesCsv(projectId, file, saveDuplicate, dryRun);
        return result;
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
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [toast]
  );

  return { upload, isLoading };
};
