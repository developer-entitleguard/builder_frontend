// Configuration for API base URL
export const getApiBaseUrl = (): string => {
  if (import.meta.env.DEV) {
    // Same-origin; Vite proxy forwards /api, /unsecure, etc. -> http://localhost:8080
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

/**
 * The owner-facing consumer web app, where public Proof Pages live
 * ({consumerWebUrl}/p/{slug}). Mirrors the backend's app.consumer.web-url.
 * VITE_CONSUMER_WEB_URL overrides; otherwise staging hosts use the staging
 * consumer site and everything else production.
 */
export const getConsumerWebUrl = (): string => {
  const envUrl = (import.meta.env.VITE_CONSUMER_WEB_URL as string | undefined)?.trim();
  if (envUrl) return envUrl.replace(/\/+$/, '');
  const isStagingHost = typeof window !== 'undefined' && window.location?.hostname?.includes('staging');
  return isStagingHost ? 'https://consumers-staging.entitleguard.com' : 'https://consumers.entitleguard.com';
};
