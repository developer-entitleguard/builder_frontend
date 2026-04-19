# EntitleGuard — Local Development Instructions for Claude Code

These instructions are written for Claude Code to run each of the five EntitleGuard services locally, one at a time. Each section is self-contained. You already have a local PostgreSQL instance; the instructions below tell you which database name to create for each service.

---

## Prerequisites (applies to all services)

Before starting any service, confirm the following are available in the shell:

- **Java 17** — `java -version` should show 17.x
- **Maven** (or Maven Wrapper `./mvnw`) — used by the backend
- **Node.js 18+** and **npm** — used by the builder frontend
- **Python 3.10** — used by all three Python services
- **pip** — for Python package installation
- **Flutter SDK** — only needed if running the mobile app locally (see App 3 note)
- **PostgreSQL client** (`psql`) — to create databases and enable extensions


## App 2 — Builder Frontend (React / Vite)

**Repository:** `builder_frontend`
**Default port:** `5173` (Vite dev server)
**Depends on:** App 1 (EG Backend) running on `localhost:8080`

### Step 1 — Install dependencies

```bash
cd <builder_frontend_repo_root>
npm install
```

### Step 2 — Configure environment

The repo contains `.env.development` which sets the API base URL. Verify it points to your local backend:

```
VITE_API_BASE_URL=http://localhost:8080
```

If the file doesn't exist, create it with the line above.

For Supabase (used for password reset and real-time features), the app will fall back gracefully if Supabase credentials are missing. For a fully functional local environment, set:

```bash
VITE_SUPABASE_URL=<your_supabase_project_url>
VITE_SUPABASE_ANON_KEY=<your_supabase_anon_key>
```

Leave these empty or as dummy values if Supabase features are not needed.

### Step 3 — Run the dev server

```bash
npm run dev
```

The Vite dev server proxies all `/api`, `/unsecure`, and related paths to `localhost:8080`, so the backend must be running first.

### Step 4 — Verify

Open `http://localhost:5173` in a browser. The login screen should appear. Use a builder account you've seeded into the local database.

### Notes for Claude Code

- The app has a **dual data layer** — some hooks check for a Supabase session first and fall back to the builder JWT. For local dev, the builder JWT path is the primary one and works without Supabase.
- JWT tokens are stored in `localStorage` under the key `userData`. If you see 401 errors after login, clear localStorage and try again.
- The Vite proxy config is in `vite.config.ts` and covers all the required backend routes. Do not change this file.

### Role model (post-Phase 1)

Builder users are now classified with one of five canonical roles, defined in `src/lib/roles.ts`:

- `ADMINISTRATOR` — full access; sees the Admin tab.
- `PROJECT_MANAGER` — manages projects, registrations, BOMs and bulk uploads.
- `CUSTOMER_SUPPORT` — triages tickets, assigns vendors with `AssignVendorDialog`, sees the warranty-expiring widget.
- `INTERNAL_VENDOR` — uses `/my-schedule` to manage availability and accept booked work.
- `EXTERNAL_VENDOR` — uses `/my-assignments` to update query status only.

Use `useOrganization().builderRole` for the precise role; the legacy `currentRole` / `isAdmin` flags remain for backwards-compatibility (administrator → `'admin'`, everyone else → `'user'`). New role-gated routes use `<RoleGate roles={[...]}>` from `src/components/RoleGate.tsx`.

### New routes by role

- `/dashboard` — role-routed via `pages/RoleDashboard.tsx`.
- `/projects/import` — bulk project CSV upload (Project Manager + Admin).
- `/tickets`, `/tickets/:id` — receptionist ticket triage / convert-to-query (Customer Support + Admin).
- `/my-schedule` — internal vendor self-service calendar.
- `/my-assignments` — vendor task list with status updates.

--
