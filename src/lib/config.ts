// Configuration for API base URL
export const getApiBaseUrl = (): string => {
  if (import.meta.env.DEV) {
    // Same-origin; Vite proxy forwards /unsecure, /profile, etc. -> http://localhost:8080
    return "";
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

/**
 * Google reCAPTCHA v3 site key (public). Baked in at build time from
 * VITE_RECAPTCHA_SITE_KEY. Empty/unset disables the captcha gate (the backend
 * mirrors this with recaptcha.enabled=false).
 */
export const getRecaptchaSiteKey = (): string | null => {
  const key = (import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined)?.trim();
  return key ? key : null;
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
