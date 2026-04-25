# Sentry — Builder Frontend

Sentry is wired into `src/main.tsx` via `src/sentry.ts`. It is a **no-op when
`VITE_SENTRY_DSN` is unset**, so dev / preview / un-configured builds are
untouched.

## One-time setup (manual)

1. **Create the project** at [sentry.io](https://sentry.io) — choose **React**
   as the platform. Name it `eg-builder-frontend`. Copy the DSN
   (`https://<key>@oXXXXX.ingest.sentry.io/XXXXX`).

2. **Wire the DSN into the build environment.** Two paths:

   - **Lovable / production deploy:** set `VITE_SENTRY_DSN` and
     `VITE_ENVIRONMENT=production` as build-time env vars in the Lovable
     dashboard (or wherever the production build runs).

   - **Docker build:** add `--build-arg VITE_SENTRY_DSN=...` and forward it
     into the build via an `ARG` in the Dockerfile (one-line change).

3. **Install the package locally** (already added to `package.json`):
   ```
   npm install
   ```

4. **Smoke test in dev (optional):**
   ```
   VITE_SENTRY_DSN=<dsn> npm run dev
   ```
   Open the app, force an exception (e.g. open the browser console and run
   `throw new Error('sentry test')`). It should appear in Sentry within ~30s.

## What's captured

- Uncaught exceptions and unhandled promise rejections (default).
- React render errors (via the `Sentry.ErrorBoundary` in `main.tsx`).
- Performance traces — sampled at **10 %** in production, **100 %** elsewhere.
- HTTP request breadcrumbs (without Authorization / Cookie headers — stripped
  in `beforeSend`).

## What's NOT captured

- Replay sessions (off — extra bandwidth, can enable later if useful).
- Session tracking (off — limits the free-tier 5k errors/mo from being
  flooded by anonymous-user noise).
- Default PII (`sendDefaultPii: false`) — IP addresses, user agents are
  scrubbed unless you explicitly attach them.

## Versioning

To tag errors with a release (recommended once stable):
- Set `VITE_APP_VERSION` at build time (e.g. from `package.json` version or
  the git SHA).
- Sentry will attach it as the `release` field on every event.
