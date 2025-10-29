// Configuration for API base URL
export const getApiBaseUrl = (): string => {
  if (import.meta.env.DEV) {
    return '';
  }
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL as string;
  }
  if (typeof window !== 'undefined' && window.location?.hostname?.includes('staging')) {
    return 'https://builders-staging.entitleguard.com';
  }
  return 'https://builders.entitleguard.com';
};

export const getApiBaseUrlWithPrefix = (): string => {
  if (import.meta.env.DEV) {
    return '/api';
  }
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL as string;
  }
  if (typeof window !== 'undefined' && window.location?.hostname?.includes('staging')) {
    return 'https://builders-staging.entitleguard.com';
  }
  return 'https://builders.entitleguard.com';
};
