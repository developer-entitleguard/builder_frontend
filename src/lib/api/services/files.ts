import { getApiBaseUrl } from "@/lib/config";

export const viewPhotoUrl = (fileId: string): string => {
  if (!fileId) return "";

  if (import.meta.env.DEV) {
    return `/unsecure/view/${fileId}`;
  }

  const apiBaseUrl = getApiBaseUrl();
  return apiBaseUrl ? `${apiBaseUrl}/unsecure/view/${fileId}` : `/unsecure/view/${fileId}`;
};

