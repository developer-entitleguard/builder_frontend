import { getApiBaseUrl } from '@/lib/config';

export const viewPhotoUrl = (fileId: string): string => {
  if (!fileId) return '';
  const base = getApiBaseUrl();
  if (import.meta.env.DEV && !base) {
    return `/unsecure/view/${fileId}`;
  }
  return base ? `${base}/unsecure/view/${fileId}` : `/unsecure/view/${fileId}`;
};
