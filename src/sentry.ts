import * as Sentry from '@sentry/react';

/**
 * Initialise Sentry for the Builder Frontend.
 *
 * No-op when VITE_SENTRY_DSN is unset (dev / preview / un-configured builds).
 *
 * Wire VITE_SENTRY_DSN into the deploy pipeline (Lovable / Docker build args)
 * to enable error reporting in staging / prod.
 */
export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!dsn) return;

  const environment =
    (import.meta.env.VITE_ENVIRONMENT as string | undefined) ||
    (import.meta.env.MODE === 'production' ? 'production' : 'development');

  Sentry.init({
    dsn,
    environment,
    release: import.meta.env.VITE_APP_VERSION as string | undefined,
    integrations: [
      Sentry.browserTracingIntegration(),
    ],
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
    sendDefaultPii: false,
    beforeSend(event) {
      if (event.request?.headers) {
        delete event.request.headers['Authorization'];
        delete event.request.headers['authorization'];
        delete event.request.headers['Cookie'];
        delete event.request.headers['cookie'];
      }
      return event;
    },
  });
}
