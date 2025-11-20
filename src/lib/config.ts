// Configuration for API base URL
export const getApiBaseUrl = (): string => {
  if (import.meta.env.DEV) {
    return '';
  }
  const envUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
  const isStagingHost = typeof window !== 'undefined' && window.location?.hostname?.includes('staging');

  if (isStagingHost) {
    if (envUrl && envUrl.includes('staging')) return envUrl;
    return 'https://builders-staging.entitleguard.com';
  }

  if (envUrl) return envUrl;
  return 'https://builders.entitleguard.com';
};

export const getApiBaseUrlWithPrefix = (): string => {
  if (import.meta.env.DEV) {
    return '/api';
  }
  const envUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
  const isStagingHost = typeof window !== 'undefined' && window.location?.hostname?.includes('staging');

  if (isStagingHost) {
    if (envUrl && envUrl.includes('staging')) return envUrl;
    return 'https://builders-staging.entitleguard.com';
  }

  if (envUrl) return envUrl;
  return 'https://builders.entitleguard.com';
};
