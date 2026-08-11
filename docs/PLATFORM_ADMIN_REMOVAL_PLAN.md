# Platform-Admin Removal Plan (finish the extraction)

**Status:** the platform super-admin portal has been extracted into a standalone
repo + hosts and is **live in production**. This document is the remaining work
to finish the migration — chiefly removing the now-duplicated `/platform-admin/*`
code from `builder_frontend`.

_Written 2026-08-09. Do the builder removal (Part A) only after a real
super-admin login is confirmed on the live site._

---

## Where things stand (already done)

- **New repo:** `Entitle-Guard/platform-admin-frontend` — standalone SPA, routes
  rebased to root (`/login`, `/orgs`, …), runtime config via
  `window.__EG_CONFIG__` (`/config.js` from the container entrypoint).
- **Live hosts (ECS Fargate, shared ALBs, acct 533267169706 / ap-southeast-2):**
  - Prod: https://platform-admin.entitleguard.com — service `eg-platform-admin-fe-prod`
  - Staging: https://platform-admin-staging.entitleguard.com — service `eg-platform-admin-fe-staging`
  - Both on image `7b0c8945`, targets healthy, HTTPS 200 via the `*.entitleguard.com` cert.
- **CI/CD:** push to `main` → staging auto-deploy; `deploy-prod` is manual. Both proven green.
- **Backend CORS:** committed on backend branch `initial_dev` (commit `9ae4b79`,
  `SecurityConfig.java` + `WebConfig.java`). **Prod backend redeployed and verified**
  (adminlogin round-trips with the right CORS headers). **Staging backend NOT yet
  redeployed** — see Part B.

---

## Precondition before Part A

✅ Confirm a real credentialed super-admin login works on
**https://platform-admin.entitleguard.com** (org list / records / analytics load).
Do not delete anything from builder until this is verified — builder is the
working fallback until then.

---

## Part A — Remove `/platform-admin/*` from `builder_frontend`

The footprint is **self-contained**. A grep for every admin-portal symbol
(`admin-portal`, `adminApiSlice`, `useAdminAuth`, `store/api/admin`) shows the
**only** references outside the footprint are the imports + route block in
`src/App.tsx`. Everything else is internal to the footprint. So this is a clean
delete + one file edit.

### ⚠️ Do NOT touch the other, unrelated "admin" feature

Builder has a **separate** builder-org admin at route `/admin`:
- `src/pages/Admin.tsx`
- `src/components/admin/*` (`OrganizationDetails`, `UserManagement`,
  `VendorManagement`, `SupplierManagement`, `OrgTermsManagement`)

These are **builder-scoped** (not the platform super-admin portal) and **must stay**.
Only remove the `admin-portal` / `store/api/admin` items listed below.

### A1. Delete these paths

```
src/pages/admin-portal/            (whole dir: AdminLogin, AdminOrgList/Create/Detail,
                                    AdminAdmins, AdminRecords, AdminAnalytics,
                                    AdminAnnouncements, AdminAnnouncementForm,
                                    AdminPortalShell, announcementHelpers.ts)
src/components/admin-portal/        (whole dir: AdminProtectedRoute, OrgForm, OrgUsers,
                                    OrgCapabilities, AnnouncementTargetEditor)
src/store/api/admin/               (whole dir: adminClient + api modules + types + index)
src/store/api/adminApiSlice.ts
src/hooks/useAdminAuth.tsx
```

### A2. Edit `src/App.tsx`

1. Remove the 10 admin-portal imports (the block starting
   `import AdminProtectedRoute from "@/components/admin-portal/AdminProtectedRoute";`
   through `import AdminAnnouncementForm from "./pages/admin-portal/AdminAnnouncementForm";`).
2. Remove the platform-admin route block — from the comment
   `{/* Platform super-admin portal … */}` through the last
   `/platform-admin/announcements/:id` route (the contiguous block of
   `<Route path="/platform-admin…">` entries).
3. **Keep** the `Navigate` import — it's used elsewhere in App.tsx (5 usages).

### A3. (Optional) Redirect old paths to the new host

So any bookmarked `builders.entitleguard.com/platform-admin/*` link still lands
somewhere useful, add a catch-all that redirects to the new domain, e.g. a tiny
component on `path="/platform-admin/*"` doing
`window.location.replace("https://platform-admin.entitleguard.com")`.
Otherwise those paths fall through to the builder `NotFound`. (Nice-to-have, not required.)

### A4. Dependency prune (verify, don't assume)

- **Keep `recharts`** — builder still uses it outside the portal
  (`components/ui/chart.tsx`, `components/reports/*`, `pages/OrgReport.tsx`).
- After deletion, check whether any other dep became orphaned before removing it.
  Safe default: leave `package.json` untouched.

### A5. Verify builder still builds green

```bash
cd builder_frontend
npm run typecheck
npm run lint
npm run build
```

Then smoke the app: routes still work, `/admin` (the builder-org admin) still
loads, and `/platform-admin/*` now 404s (or redirects, if A3 done).

### A6. Land it

Branch off `main` (or the active branch), commit the deletion + App.tsx edit,
open a PR. Suggested message: `chore: remove platform-admin portal (extracted to platform-admin-frontend)`.

---

## Part B — Fix the staging backend CORS

The **staging** backend (`app2-staging.entitleguard.com`) still returns **403**
on the adminlogin preflight from `https://platform-admin-staging.entitleguard.com`
— it wasn't redeployed with the CORS change. Prod is fine.

- The CORS change is backend commit **`9ae4b79`** on branch **`initial_dev`**
  (adds both `platform-admin[-staging].entitleguard.com` origins to
  `SecurityConfig.corsConfigurationSource()` and `WebConfig.addCorsMappings()`).
- Find which branch/pipeline the **staging** backend deploys from and get that
  commit onto it, then redeploy staging. Verify:

```bash
curl -s -o /dev/null -D - -X OPTIONS \
  https://app2-staging.entitleguard.com/unsecure/adminlogin \
  -H "Origin: https://platform-admin-staging.entitleguard.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type" | grep -i "http/\|allow-origin"
# expect: HTTP 200 + Access-Control-Allow-Origin: https://platform-admin-staging.entitleguard.com
```

---

## Part C — Housekeeping (optional)

- **GitHub Environments** in `platform-admin-frontend` settings: create `staging`
  (auto on push) and `production` (add required reviewers) so `deploy-prod` gets
  an approval gate. Right now there are no protection rules → `deploy-prod` runs
  immediately.
- **Sentry:** the `eg/platform-admin-fe/{staging,prod}/sentry-dsn` secrets hold a
  placeholder (`"unset"`); the app disables Sentry for non-URL DSNs. Set real
  DSNs when wanted (no redeploy of infra needed — just update the secret and the
  next task pulls it).

---

## Rollback

If anything regresses after Part A, the removed code is recoverable from git
history (and lives, rebased-to-root, in the `platform-admin-frontend` repo). The
live portal is independent of builder, so reverting the builder PR has no effect
on the running portal.

---

## Quick reference

| Thing | Value |
|---|---|
| New repo | `Entitle-Guard/platform-admin-frontend` |
| Prod / staging URLs | `platform-admin.entitleguard.com` / `platform-admin-staging.entitleguard.com` |
| ECS services | `eg-platform-admin-fe-{prod,staging}` on `eg-shared-{prod,staging}-cluster` |
| ECR | `entitleguard/platform-admin-frontend` (current image `7b0c8945`) |
| ALB rule priority | 140 on both shared ALB 443 listeners |
| Backend CORS commit | `9ae4b79` on backend branch `initial_dev` |
| AWS | acct 533267169706, ap-southeast-2, SSO profile `eg-admin` |
