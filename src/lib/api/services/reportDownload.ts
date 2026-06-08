import { useCallback, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { getApiBaseUrl } from "@/lib/config";

const getAuthToken = (): string => {
  try {
    const userData = localStorage.getItem("userData");
    if (!userData) return "";
    return JSON.parse(userData).jwt || "";
  } catch (error) {
    console.warn("Failed to parse userData:", error);
    return "";
  }
};

const parseFilename = (header: string | null, fallback: string): string => {
  if (!header) return fallback;
  const match = /filename\*?=(?:UTF-8'')?"?([^"]+)"?/i.exec(header);
  return match?.[1] ? decodeURIComponent(match[1]) : fallback;
};

/**
 * Downloads the server-rendered management report PDF for a project
 * (GET /api/builder/projects/:id/report/pdf) and triggers a browser save.
 */
export const useReportPdfDownload = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const download = useCallback(
    async (projectId: string) => {
      setIsLoading(true);
      try {
        const authToken = getAuthToken();
        const response = await fetch(
          `${getApiBaseUrl()}/api/builder/projects/${projectId}/report/pdf`,
          {
            method: "GET",
            headers: {
              Authorization: authToken ? `Bearer ${authToken}` : "",
              Accept: "application/pdf, */*",
            },
            cache: "no-store",
          },
        );

        if (!response.ok) {
          throw new Error(`Failed to download report (${response.status})`);
        }

        const blob = await response.blob();
        if (blob.size === 0) {
          throw new Error("The report PDF came back empty. Please try again.");
        }

        const filename = parseFilename(
          response.headers.get("content-disposition"),
          "project-report.pdf",
        );
        const downloadUrl = window.URL.createObjectURL(
          new Blob([blob], { type: "application/pdf" }),
        );
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
      } catch (error) {
        console.error("Report PDF download failed:", error);
        toast({
          title: "Download failed",
          description:
            error instanceof Error ? error.message : "Could not download the report PDF.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [toast],
  );

  return { download, isLoading };
};
