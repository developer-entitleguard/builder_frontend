import { getApiBaseUrl } from "@/lib/config";

export const viewPhotoUrl = (fileId: string): string => {
  if (!fileId) return "";

  // Use /api/files/view (NOT /unsecure/view): in production the SPA hosts only
  // route /api/* to the backend, so /unsecure/* would resolve to the static SPA
  // and the <img> would load HTML. In dev the Vite proxy forwards /api too.
  if (import.meta.env.DEV) {
    return `/api/files/view/${fileId}`;
  }

  const apiBaseUrl = getApiBaseUrl();
  return apiBaseUrl ? `${apiBaseUrl}/api/files/view/${fileId}` : `/api/files/view/${fileId}`;
};

