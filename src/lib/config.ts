// Configuration for API base URL
export const getApiBaseUrl = (): string => {
  if (import.meta.env.DEV) {
    return '';
  }
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
};

export const getApiBaseUrlWithPrefix = (): string => {
  if (import.meta.env.DEV) {
    return '/api';
  }
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
};
