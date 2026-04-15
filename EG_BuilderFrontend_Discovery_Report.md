# EG Builder Frontend -- Codebase Discovery Report

## 1. Overview

The EG Builder Frontend is the current production SaaS platform used by residential builders in Australia to manage homeowner handovers, warranties, defects (called "queries"), project construction activities, and team/vendor administration. It is a single-page React application that communicates with the EG Backend (a Java/Spring Boot REST API) and uses Supabase as a supplementary data layer for real-time features.

The application is live at `https://builders.entitleguard.com` (production) and `https://builders-staging.entitleguard.com` (staging). It was scaffolded with Lovable (AI code generation platform) and built on Vite + React 18 + TypeScript + Tailwind CSS + shadcn/ui.

The platform serves three user roles:
- **Builder users** -- manage projects, homeowner registrations, items, warranties, and defects
- **Admin users** -- manage the organisation, team members, and vendors
- **Super Admin** -- platform-level operations: manage all organisations, impersonate builders

---

## 2. Technology Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | React | 18.3.1 |
| Language | TypeScript | 5.5.3 |
| Build tool | Vite (SWC plugin) | 5.4.1 |
| UI framework | shadcn/ui (Radix UI + Tailwind CSS) | Multiple @radix-ui packages |
| CSS | Tailwind CSS | 3.4.11 |
| State management (server) | Redux Toolkit (RTK Query) | 2.11.2 |
| State management (async) | TanStack React Query | 5.56.2 |
| Routing | React Router DOM | 6.26.2 |
| Forms | React Hook Form + Zod | 7.53.0 / 3.23.8 |
| Auth (supplementary) | Supabase JS | 2.53.0 |
| Charts | Recharts | 2.12.7 |
| Date handling | date-fns | 3.6.0 |
| Icons | Lucide React | 0.462.0 |
| Toasts | Sonner + custom use-toast | 1.5.0 |
| Package manager | npm (bun.lockb also present) | -- |

---

## 3. Project Structure

```
builder_frontend/
  .env                    # Supabase credentials
  .env.development        # API base URL (localhost:8080)
  .env.production         # API base URL (builders.entitleguard.com)
  vite.config.ts          # Dev proxy, chunk splitting, path aliases
  tailwind.config.ts      # Theme customisation
  index.html              # SPA entry point
  supabase/               # Supabase config, migrations, edge functions
  public/                 # Static assets (favicon, images, uploads)
  src/
    main.tsx              # Redux Provider + App mount
    App.tsx               # Route definitions, AuthProvider, OrganizationProvider
    App.css / index.css   # Global styles
    pages/                # 21 route-level page components
    components/
      ui/                 # 49 shadcn/ui primitives (button, dialog, table, form, etc.)
      projects/           # 11 project-specific components
      admin/              # 3 admin components (org, users, vendors)
      superadmin/         # 2 super-admin components
      *.tsx               # 13 shared feature components
    hooks/                # 10 custom hooks (auth, org, projects, activities, etc.)
    store/
      index.ts            # Redux store configuration
      api/                # 23 RTK Query API slice modules
        apiSlice.ts       # Base query, JWT injection, 401 handling
        auth.ts           # Authentication endpoints
        dashboard.ts      # Dashboard/stats endpoints
        items.ts          # Item CRUD, BOM, file uploads
        projects.ts       # Project CRUD
        activities.ts     # Activity management
        pricing.ts        # AI-generated pricing
        approvals.ts      # Approval workflow
        ...               # 15 more domain-specific API modules
    lib/
      config.ts           # API base URL resolution (dev/staging/prod)
      utils.ts            # Tailwind class merge utility
      api/
        types.ts          # All TypeScript interfaces for API contracts
        files.ts          # File URL helper
        services/         # 13 service modules (fetch-based, parallel to RTK Query)
    integrations/
      supabase/           # Supabase client and auto-generated types
    utils/
      validation.ts       # Australian phone, postcode, email, ABN validation
```

### Architectural Patterns

- **Dual data layer**: The app uses BOTH RTK Query (Redux Toolkit Query) for the builder backend API AND direct Supabase client calls. Many hooks support both paths, with the builder API being the primary production path.
- **JWT authentication**: Builder login returns a JWT stored in `localStorage` as `userData.jwt`. All API requests attach this as a `Bearer` token via RTK Query's `prepareHeaders`.
- **Supabase as supplementary**: Supabase handles supplementary auth (password reset, email verification), real-time activity updates, and edge functions (invitation emails). The Supabase session is a secondary auth path.
- **Path alias**: `@/` maps to `src/` via Vite config.
- **Dev proxy**: Vite proxies `/api`, `/unsecure`, `/profile`, `/signup`, `/signout`, `/update-password`, `/verify-email`, `/resend-verification` to `localhost:8080`.

---

## 4. Route and Page Inventory

### Authentication (public)

| Path | Component | Purpose | Auth Required |
|---|---|---|---|
| `/` | Index | Marketing landing page with features, benefits, CTA | No |
| `/auth` | Auth | Sign-in form with forgot password | No |
| `/auth/resetPassword` | ResetPassword | Set new password via token from email | No |
| `/consent` | ConsentConfirmation | Homeowner consent confirmation via token | No |
| `/accept-invitation` | AcceptInvitation | Accept team invitation (new or existing user) | No |
| `/approval-response` | ApprovalResponse | External approval response via token link | No |

### Dashboard and Core

| Path | Component | Purpose | Auth Required |
|---|---|---|---|
| `/dashboard` | Dashboard | Main hub: registration stats, customer list, quick actions, terms acceptance | Yes |
| `/onboarding` | Onboarding | Multi-step homeowner registration wizard (5 steps) | Yes |
| `/registration/:id` | RegistrationDetail | Individual registration detail with items, documents, actions | Yes |

### Items (Warranty Items Library)

| Path | Component | Purpose | Auth Required |
|---|---|---|---|
| `/items` | ItemsManagement | Master items library: CRUD, BOM management, category grouping | Yes |

### Queries (Defect Management)

| Path | Component | Purpose | Auth Required |
|---|---|---|---|
| `/queries` | QueriesManagement | All homeowner queries/defects list with status filtering | Yes |
| `/pendingQueries` | PendingQueries | Newly submitted queries pending review | Yes |
| `/awaitingAction` | AwaitingAction | Queries assigned to vendors awaiting completion | Yes |
| `/queriesComplete` | QueriesComplete | Completed/resolved queries | Yes |

### Projects

| Path | Component | Purpose | Auth Required |
|---|---|---|---|
| `/projects` | Projects | Project list (current + completed) | Yes |
| `/projects/new` | ProjectCreate | Multi-step project creation wizard | Yes |
| `/projects/:id` | ProjectDetail | Project detail with tabs: Activities, Registrations, Approvals, Pricing | Yes |
| `/projects/:projectId/approvals/:approvalId` | ApprovalDetail | Individual approval request detail with decision interface | Yes |

### Administration

| Path | Component | Purpose | Auth Required |
|---|---|---|---|
| `/admin` | Admin | Organisation admin: details, users, vendors (admin role required) | Yes |
| `/superadmin` | SuperAdmin | Platform admin: all organisations, impersonation (super admin role) | Yes |

### Error Handling

| Path | Component | Purpose | Auth Required |
|---|---|---|---|
| `*` | NotFound | 404 catch-all | No |

---

## 5. Feature Analysis

### 5a. Authentication and Onboarding

**Sign-in flow:**
- Builder signs in at `/auth` with email + password
- Calls `POST /unsecure/builderlogin` which returns a JWT and user info
- JWT and full user data stored in `localStorage` as `userData`
- All subsequent API calls include `Authorization: Bearer <jwt>`
- Token is validated on each protected route via `GET /unsecure/validtoken`
- On 401, user is redirected to `/auth` and localStorage is cleared

**Sign-up flow:**
- `POST /signup` with email, password, company name, contact person, phone
- Email verification via `POST /verify-email` and `POST /resend-verification`
- Password setup for invited users via `POST /unsecure/user/setpwd`

**Password reset:**
- `POST /unsecure/resetpassword` with token + new password
- Token received via email, decoded to extract email

**Session management:**
- JWT-based with no refresh token mechanism visible
- Session expiry detected via token validation endpoint
- Expired sessions show a modal prompting re-login

**Invitation acceptance:**
- External link with token and email params
- Supports both existing users (just accept) and new users (register + accept)
- Uses Supabase `createUser` for new accounts and `acceptInvitation` edge function

**Terms and conditions:**
- `GET /api/builder/terms/status` checks if terms accepted
- `GET /api/terms/latest` fetches current terms
- `POST /api/builder/terms/accept` records acceptance
- Shown as a modal on the dashboard if terms not yet accepted

---

### 5b. Project Management

**Project creation** (`/projects/new`):
Multi-step wizard with 3 steps:
1. **Basics**: Project name, address, city, state, postcode
2. **Property type**: Selection from 7 types (House, Duplex, Apartment, Townhouse, Granny Flat, Commercial, Other) with visual icons
3. **Timeline**: Start date, target end date, status (Active/On Hold/Completed/Cancelled)

Calls `POST /api/builder/projects` on submission.

**Project listing** (`/projects`):
- Separate sections for "Current Projects" and "Completed Projects"
- Each project card shows property type icon, name, address, status badge, target end date
- Empty state with CTA to create first project

**Project detail** (`/projects/:id`):
Tabbed interface with 4 sections:

1. **Activities tab**: Construction activities grouped by categories. Supports:
   - Activity categories (create/edit/delete) with completion tracking
   - Individual activities with name, description, status, priority, due date
   - Activity detail sidebar with vendor assignment, pricing (quote/price paid), update feed
   - Bulk CSV import of activities with duplicate detection
   - Bulk delete of selected activities

2. **Registrations tab**: Homeowner registrations linked to this project
   - Link existing registrations (searchable dialog)
   - Create new registrations
   - Shows customer name, email, phone, address, status

3. **Approvals tab**: Approval workflow for activities
   - Create approval requests with type, title, description, linked registration, approver email, due date
   - Track approval status (pending/approved/rejected/cancelled)
   - External approval response via email link

4. **Pricing tab**: AI-generated cost estimation
   - Generate pricing from project details (property type, bedrooms, area, BAL rating, topography)
   - Cost breakdown by category: Materials, Labour, Subcontractors, Overheads
   - Buffer and margin percentage adjustments
   - Inline editing of individual cost items
   - Final price calculation

**Project configuration options:**
- BAL (Bushfire Attack Level) ratings with price multipliers
- Topography types with price multipliers
- Fetched from `/api/builder/topography_types` and `/api/builder/bal_ratings`

---

### 5c. Digital Handover

This is the core feature of the platform, implemented as the "Onboarding" flow at `/onboarding`.

**Multi-step wizard (5 steps):**

**Step 1 -- Customer Details:**
- Homebuyer: first name, last name, email, phone
- Property: address, city, state (Australian states), postcode
- Optional: project assignment, settlement date, bedrooms, rooms, built-up area
- Validation: Australian phone format, email format
- "Save & Exit" support to save progress
- Calls `POST /api/builder/customer` to create the registration

**Step 2 -- Items Selection:**
- Select from Bill of Materials (BOM) or add custom items
- BOM selection via dropdown (fetched from `/api/getbillofmaterials`)
- Items grouped by category
- Each item has: name, category, make, brand, model, documentation URL, price, warranty years
- Custom items can be added inline
- Calls `POST /api/builder/customeritem` to map items to customer

**Step 3 -- Document Upload (within Items Selection):**
- For each selected item, builder can add:
  - Seller name
  - Serial number
  - Warranty document (file upload)
  - Manual/specification document (file upload)
- File uploads via `POST /api/update/buildercustomermap` (FormData)
- Tracks document count per item
- Grouped by category with expand/collapse

**Step 4 -- Review and Approval:**
- Summary of all items grouped by category
- Document counts displayed
- Consent checkbox: confirms homeowner has consented to receive digital handover
- Approval checkbox: confirms data accuracy
- Optional: calls `POST /api/create/customerentitlement/{id}` (builder entitlement API)

**Step 5 -- Send Confirmation:**
- Shows delivery status progression: Sending -> Sent -> Delivered
- Displays package summary: total items, documents, categories, completion percentage
- Triggers entitlement delivery to homeowner

**Consent mechanism:**
- Separate consent flow via `/consent` page
- Token-based consent confirmation
- `POST /api/builder-customer/{id}/send-consent-mail` sends consent request

---

### 5d. Warranty Management

Warranties are managed through the Items system:

**Item-level warranty data:**
- Each builder item can have a `warranty` field (number, representing years)
- When items are mapped to a customer registration, warranty documents can be uploaded
- File uploads support warranty certificates and manual/specification documents

**BOM (Bill of Materials):**
- Builders create reusable BOMs containing sets of items
- BOM upload via CSV: `POST /api/upload-template` (FormData)
- CSV fields: name, category, brand, model, description, price, documentation_url, notes, purchaser, warranty_years
- BOMs can be assigned to multiple customers: `POST /api/add/assignbom`
- BOM restriction checking: `GET /api/checking/bomrestrict`

**Per-registration warranty tracking:**
- When items are mapped to a customer, sellers and serial numbers are captured
- Documents (warranty certificates, manuals) are attached per item per customer
- `documentCount` tracked per item
- Files can be deleted: `DELETE /api/delete/builderitem/files/{id}` and `DELETE /api/itemfile/{id}`

**What's NOT visible:**
- No warranty expiry date calculation or tracking in the UI
- No warranty claim management
- No notification for expiring warranties
- Warranty period is stored as a number (years) but there is no settlement-date-based expiry calculation shown to builders

---

### 5e. Defect Management (Queries)

Defects raised by homeowners are called "Queries" in this system.

**Query lifecycle:**
1. **Pending** (`/pendingQueries`): Newly submitted by homeowner, awaiting builder review
2. **Awaiting Action** (`/awaitingAction`): Assigned to a vendor, awaiting completion
3. **Complete** (`/queriesComplete`): Resolved and closed

**Query listing** (`/queries`):
- All queries listed with customer name, product name, description, status
- Filterable by status
- Click through to status-specific pages

**Query detail view (all status pages share similar layout):**
- Case details: query ID, customer name, email, phone, product, description
- Attached photos/images from homeowner
- Status badge (Pending, In Progress, Resolved, Closed)
- Case history/timeline showing all updates

**Builder actions on queries:**
- Assign/reassign vendor from vendor dropdown
- Set priority (low/medium/high/urgent)
- Set due date
- Add comments with optional file attachments
- Update query status
- Mark as complete with file uploads

**API calls:**
- `GET /api/builder/query?builderId=X&statusId=Y` -- list queries by status
- `GET /api/query/id?id=X` -- single query detail
- `POST /api/query` -- update query (FormData with files)
- `POST /api/querycomment` -- add comment (FormData with files)
- `GET /api/status/bymodule?module=QUERY` -- fetch available statuses

**Notable:**
- Query comments and updates support file attachments
- Vendor assignment is done from the builder's vendor list
- No SLA tracking or response time metrics visible
- No homeowner-facing query submission UI in this frontend (that would be in the mobile/homeowner app)

---

### 5f. Homeowner Communication

**Entitlement delivery:**
- After completing the handover wizard, the entitlement is "sent" to the homeowner
- `POST /api/create/customerentitlement/{builderCustomerId}` creates the entitlement record
- The actual delivery mechanism (SMS, email) is handled by the backend

**Consent emails:**
- `POST /api/builder-customer/{id}/send-consent-mail` sends a consent request to the homeowner
- Homeowner confirms via `/consent` page with token-based verification

**Invitation emails:**
- Team member invitations sent via Supabase edge function `sendInvitationEmail`
- Accepted at `/accept-invitation` with token + email params

**No direct messaging:**
- There is no in-app chat or messaging system between builder and homeowner
- Communication happens through:
  - Entitlement delivery (digital handover package)
  - Consent requests
  - Query/defect comments (indirect, via the queries system)
- No notification feed for homeowner activity

---

### 5g. Admin and Settings

**Organisation Details** (`/admin` -> Organisation Details tab):
- View/edit: name, address, contact email, phone, ABN, description
- `GET /api/builderorganization?builderId=X`
- `POST /api/builder/organization` to update

**User Management** (`/admin` -> User Management tab):
- List all team members with name, email, phone, role
- Add new users: email, first name, last name, phone, role (admin/user)
- Edit existing users
- Delete users with confirmation
- `GET /api/builder/user?builderId=X`
- `POST /api/builder/user` (create or update via query params)
- `DELETE /api/builder/user/{id}`

**Vendor Management** (`/admin` -> Vendor Management tab):
- List vendors with name, email, phone, type, description
- Vendor types: Tradesman, Plumber, Electrician, Landscaper, Sellers, Others
- Add/edit/delete vendors
- `GET /api/builder/vendor?builderId=X`
- `POST /api/builder/vendor` (create or update)
- `DELETE /api/builder/vendor/{id}`

**Super Admin** (`/superadmin`):
- **Organisations tab**: Full CRUD on all platform organisations
  - Create new organisations with name, address, contact, email, ABN, description
  - Edit/delete organisations
  - Add users to any organisation (sends invitation email via Supabase)
- **Impersonation tab**: Select any active organisation to impersonate
  - Quick access cards to Dashboard/Projects/Items when impersonating
  - Clear impersonation state

**Role-based access:**
- Admin tab requires `admin` or `superadmin` role
- Super Admin tab requires `superadmin` role
- Role is stored in `userData.userInfo.role`

**No subscription/billing:**
- No subscription management, plan selection, or billing visible in the frontend

---

## 6. API Integration Layer

### Architecture

The frontend uses **two parallel API communication patterns**:

1. **RTK Query (primary)**: 23 API slice modules in `src/store/api/` using Redux Toolkit Query. This is the primary data-fetching mechanism with automatic caching, cache invalidation via tags, and generated React hooks.

2. **Direct fetch services (legacy/parallel)**: 13 service modules in `src/lib/api/services/` using raw `fetch()` with manual JWT injection. These exist alongside RTK Query and are used in some hooks directly.

### HTTP Client

- RTK Query uses `fetchBaseQuery` from Redux Toolkit (wrapper around `fetch()`)
- Service layer uses raw `fetch()` API
- No Axios dependency

### Authentication in API Requests

```
Authorization: Bearer <jwt>
```

- JWT extracted from `localStorage.getItem('userData')` -> `parsed.jwt`
- Injected via `prepareHeaders` in the RTK Query base query
- Endpoints containing `unsecure` in their path skip auth headers
- On 401 response: localStorage cleared, redirect to `/auth`

### Base URL Configuration

| Environment | Base URL |
|---|---|
| Development | `""` (same-origin, Vite proxy to localhost:8080) |
| Staging | `https://builders-staging.entitleguard.com` |
| Production | `https://builders.entitleguard.com` |

### Complete API Endpoint Inventory

#### Authentication (`/unsecure/*`, `/profile`, `/signup`, etc.)
| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/unsecure/builderlogin` | Sign in, returns JWT |
| POST | `/signup` | Register new builder account |
| POST | `/signout` | Sign out |
| GET | `/profile` | Get current user profile |
| PATCH | `/profile` | Update profile |
| GET | `/unsecure/validtoken?token=X` | Validate JWT token |
| POST | `/unsecure/resetpassword` | Reset password with token |
| PATCH | `/update-password` | Change password (authenticated) |
| POST | `/verify-email` | Verify email with token |
| POST | `/resend-verification` | Resend verification email |
| GET | `/unsecure/verify/mail?email=X` | Send verification mail |
| POST | `/unsecure/user/setpwd` | Set password for invited user |

#### Dashboard (`/api/dashboard/*`)
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/dashboard/count?builderId=X` | Dashboard stat counts |
| GET | `/api/dashboard/customerlist?builderId=X` | Customer list for dashboard |
| GET | `/api/dashboard/getregistrations?builderId=X&type=Y` | Registrations by type |
| GET | `/api/getstatus/bytype?type=X` | Statuses by type |
| GET | `/api/status/bymodule?module=X` | Statuses by module |

#### Builder Customers (`/api/builder/customer*`)
| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/builder/customer` | Create homeowner registration |
| DELETE | `/api/builder/customer/{id}` | Delete single registration |
| DELETE | `/api/builder/customer` | Bulk delete registrations |
| POST | `/api/update/buildercustomermap` | Update item mapping with files |
| POST | `/api/builder-customer/{id}/send-consent-mail` | Send consent email |

#### Items (`/api/builder/item*`, `/api/*`)
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/builder/item?builderId=X` | List items by builder |
| POST | `/api/builder/item` | Create or update item (FormData) |
| DELETE | `/api/builder/item/{id}` | Delete item |
| GET | `/api/getcategorys` | Get item categories |
| GET | `/api/getbillofmaterials?builderId=X` | List BOMs |
| GET | `/api/getbillmaterials?billId=X` | Get BOM items |
| GET | `/api/getbuilderitems/bybom?billMaterialId=X&customerId=Y` | Items by BOM for customer |
| POST | `/api/upload-template` | Upload BOM CSV |
| POST | `/api/builder/customeritem` | Map items to customer |
| POST | `/api/itemmap/update` | Update item map (seller, serial, files) |
| GET | `/api/checking/bomrestrict?customerIds=X` | Check BOM restrictions |
| POST | `/api/add/assignbom` | Assign BOM to customers |
| DELETE | `/api/delete/builderitem/files/{id}` | Delete builder item files |
| DELETE | `/api/itemfile/{id}` | Delete item file |
| GET | `/api/check/customeritemmap/existing?customerId=X` | Check existing mappings |
| GET | `/api/customerdetails?builderId=X&customerId=Y` | Full customer detail with items |

#### Entitlements
| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/create/customerentitlement/{builderCustomerId}` | Create and send entitlement |

#### Queries/Defects (`/api/builder/query*`, `/api/query*`)
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/builder/query?builderId=X&statusId=Y` | List queries by status |
| GET | `/api/query/id?id=X` | Get single query detail |
| POST | `/api/query` | Update query (FormData) |
| POST | `/api/querycomment` | Add comment to query (FormData) |

#### Projects (`/api/builder/projects/*`)
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/builder/projects` | List all projects |
| GET | `/api/builder/projects/{id}` | Get project detail |
| POST | `/api/builder/projects` | Create project |
| PUT | `/api/builder/projects/{id}` | Update project |
| GET | `/api/builder/projects/{projectId}/registrations` | Project registrations |
| GET | `/api/builder/registrations/nonlinked` | Unlinked registrations |
| PUT | `/api/builder/projects/{projectId}/registrations/Update` | Link registrations |

#### Activities (`/api/builder/projects/*/activities/*`)
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/builder/projects/{projectId}/activities` | List project activities |
| GET | `/api/builder/projects/{projectId}/activities/{id}` | Get activity detail |
| POST | `/api/builder/projects/{projectId}/activities` | Create activity |
| PUT | `/api/builder/projects/{projectId}/activities/{id}` | Update activity |
| DELETE | `/api/builder/projects/{projectId}/activities/{id}` | Delete activity |
| DELETE | `/api/builder/projects/{projectId}/activities` | Bulk delete activities |
| GET | `/api/builder/activity/{activityId}/activity_updates` | Activity update feed |
| POST | `/api/builder/activity/{activityId}/activity_updates` | Post activity update |

#### Activity Categories (`/api/builder/projects/*/activity_categories/*`)
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/builder/projects/{projectId}/activity_categories` | List categories |
| POST | `/api/builder/projects/{projectId}/activity_categories` | Create category |
| PUT | `/api/builder/projects/{projectId}/activity_categories/{id}` | Update category |
| DELETE | `/api/builder/projects/{projectId}/activity_categories/{id}` | Delete category |

#### Approvals (`/api/builder/projects/*/approvals/*`)
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/builder/projects/{projectId}/approvals` | List project approvals |
| POST | `/api/builder/projects/{projectId}/activities/{activityId}/approvals` | Create approval |
| PUT | `/api/builder/projects/{projectId}/activities/{activityId}/approvals/{id}` | Update approval |

#### Pricing (`/api/builder/projects/*/pricing/*`)
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/builder/projects/{projectId}/pricing` | Get project pricing |
| POST | `/api/builder/projects/{projectId}/pricing` | Create pricing record |
| POST | `/api/builder/projects/{projectId}/pricing/{pricingId}/generate` | AI-generate pricing |
| PUT | `/api/builder/projects/{projectId}/pricing/{id}` | Update pricing |
| GET | `/api/builder/pricing/{pricingId}/cost-items` | List cost items |
| GET | `/api/builder/pricing/{pricingId}/cost-items/{id}` | Get cost item |
| POST | `/api/builder/pricing/{pricingId}/cost-items` | Create cost items |
| PUT | `/api/builder/pricing/{pricingId}/cost-items/{id}` | Update cost item |

#### Project Options
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/builder/topography_types` | Topography types with multipliers |
| GET | `/api/builder/bal_ratings` | BAL ratings with multipliers |

#### Organisation (`/api/builder/organization*`, `/api/builderorganization*`)
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/builderorganization?builderId=X` | Get organisation details |
| POST | `/api/builder/organization` | Update organisation |

#### Users (`/api/builder/user*`)
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/builder/user?builderId=X` | List builder users |
| POST | `/api/builder/user` | Create or update user |
| DELETE | `/api/builder/user/{id}` | Delete user |

#### Vendors (`/api/builder/vendor*`)
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/builder/vendor?builderId=X` | List vendors |
| POST | `/api/builder/vendor` | Create or update vendor |
| DELETE | `/api/builder/vendor/{id}` | Delete vendor |

#### Terms (`/api/builder/terms/*`, `/api/terms/*`)
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/builder/terms/status` | Check terms acceptance status |
| GET | `/api/terms/latest` | Get latest terms version |
| POST | `/api/builder/terms/accept` | Accept terms |

#### File Downloads (via custom hooks)
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/download-template/registrations` | Download registration CSV template |
| GET | `/api/download-template` | Download BOM CSV template |
| GET | `/api/download-template/activities` | Download activities CSV template |

#### File Viewing
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/viewphoto/{fileId}` | View uploaded file/photo |

### Error Handling

- **401 errors**: Automatic redirect to `/auth` with localStorage cleanup (in `baseQueryWithReauth`)
- **API errors**: RTK Query surfaces errors to components via `isError` / `error` states
- **Toast notifications**: Success/error toasts shown for mutations (create, update, delete operations)
- **No global error boundary**: Individual components handle their own error states

### Caching

- **RTK Query tag-based invalidation**: 19 tag types with targeted invalidation on mutations
- **No optimistic UI**: All mutations wait for server response before updating UI
- **React Query**: `QueryClient` instantiated but minimally used alongside RTK Query

---

## 7. State Management

### Global State (Redux)

The Redux store contains a single slice: the RTK Query `api` reducer. There are no custom Redux slices for application state.

```typescript
export const store = configureStore({
  reducer: {
    [api.reducerPath]: api.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(api.middleware),
});
```

All global server state is managed through RTK Query's normalised cache.

### Context Providers

Two React Context providers wrap the application:

1. **AuthProvider** (`useAuth`): Manages Supabase auth session (user, session, loading). Provides sign-up, sign-in, sign-out, password operations. This is the SECONDARY auth path -- the primary path uses builder JWT directly.

2. **OrganizationProvider** (`useOrganization`): Manages current organisation context, user role, and super admin impersonation. Persists selected organisation in localStorage. Extracts org info from either Supabase session metadata or builder JWT userData.

### Local Component State

- Form state managed by React Hook Form (`useForm`) with Zod validation
- UI state (modals, tabs, selections) managed with `useState`
- Multi-step wizard state passed via props or managed in parent page components

### Data Fetching Patterns

- **Primary**: RTK Query hooks (`useGetXQuery`, `useXMutation`) with tag-based invalidation
- **Secondary**: Custom hooks (`useProjects`, `useActivities`, etc.) that wrap RTK Query hooks with business logic, state mapping, and toast notifications
- **Tertiary**: Direct Supabase queries in some hooks (legacy path)
- **Polling**: Some hooks use `setTimeout` polling for eventual consistency after mutations (e.g., `useProjectPricing` polls after AI generation)

### Inconsistencies

1. **Dual data layer**: RTK Query and Supabase are used in parallel. Many hooks have conditional logic choosing between builder API and Supabase paths. This creates complexity and potential data inconsistency.
2. **Duplicate service files**: The `lib/api/services/` directory contains fetch-based implementations that duplicate RTK Query endpoints (e.g., `builderCustomer.ts` exists in both `store/api/` and `lib/api/services/`).
3. **TanStack React Query**: Installed and configured but barely used -- RTK Query handles nearly all data fetching. The `QueryClientProvider` wraps the app but serves minimal purpose.
4. **Inconsistent state shape**: Some hooks map API camelCase to snake_case locally, creating unnecessary translation layers.

---

## 8. Component Library

### UI Primitives (shadcn/ui)

49 components in `src/components/ui/` -- the full shadcn/ui library installed via the CLI. These are Radix UI primitives styled with Tailwind CSS:

**Layout**: Card, Separator, Tabs, Accordion, Collapsible, Sheet, Drawer, Sidebar, Resizable, ScrollArea, AspectRatio
**Forms**: Input, Textarea, Select, Checkbox, RadioGroup, Switch, Slider, Calendar, DatePicker (via DayPicker), Form (react-hook-form integration), Label, InputOTP
**Feedback**: Toast, Toaster, Sonner, Alert, AlertDialog, Progress, Skeleton, Badge
**Navigation**: NavigationMenu, Menubar, Breadcrumb, Pagination, Command (cmdk), DropdownMenu, ContextMenu
**Overlay**: Dialog, Popover, Tooltip, HoverCard
**Data**: Table, Chart (Recharts wrapper), Carousel
**Actions**: Button, Toggle, ToggleGroup

### Shared Feature Components

| Component | Purpose |
|---|---|
| Header | Main nav bar with org selector, role badges, nav links |
| OrganizationGate | Route guard for org selection |
| OrganizationSelector | Dropdown for switching organisations |
| NoOrganizationAccess | Access denied screen |
| WorkflowSteps | 4-step progress indicator for handover wizard |
| CustomerDetailsForm | Homebuyer details form (step 1 of onboarding) |
| ItemsSelectionForm | BOM/item selection form (step 2) |
| DocumentUploadForm | Per-item document upload form (step 3) |
| ReviewApprovalForm | Review and confirm form (step 4) |
| SendConfirmationForm | Delivery status display (step 5) |
| BOMUpload | BOM CSV upload dialog |
| BulkActionsBar | Sticky bar for bulk operations |
| RegistrationTypeDialog | Single vs bulk registration choice |

### Component Consistency

- **Consistent**: All UI primitives use shadcn/ui patterns (Tailwind + Radix + CVA)
- **Consistent**: Forms use react-hook-form + zod throughout
- **Consistent**: Dialogs follow a standard pattern (trigger + content)
- **Inconsistent**: Some components are very large (500+ lines) and could be decomposed
- **No storybook or component documentation**

### Potential Consolidation

- The query pages (`PendingQueries`, `AwaitingAction`, `QueriesComplete`) share nearly identical layouts and could be refactored into a single parameterised component
- The onboarding step components (CustomerDetailsForm, ItemsSelectionForm, etc.) work well as separate components

---

## 9. Quality Observations and Gaps

### What Appears Complete and Production-Ready

- **Authentication flow**: Sign-in, token validation, session expiry handling, password reset
- **Homeowner onboarding/handover wizard**: Full 5-step flow from customer creation to entitlement delivery
- **Items management**: Full CRUD, BOM management, CSV import, file uploads
- **Query/defect management**: Full lifecycle (pending -> assigned -> complete) with vendor assignment
- **Project management**: Creation, listing, detail with activities and registrations
- **Admin panel**: Organisation details, user management, vendor management
- **Super admin**: Organisation CRUD, impersonation
- **Australian-specific validation**: Phone numbers, postcodes, ABN

### What Appears Incomplete or Partially Built

1. **Dashboard analytics**: Multiple trend/performance/alert endpoints defined in RTK Query (getRegistrationTrends, getQueryTrends, getPerformanceMetrics, getAlerts) but the Dashboard page primarily shows customer lists and stats counts. The analytics widgets appear defined but not fully rendered.

2. **Supabase data path**: Many hooks contain dual-path logic for Supabase and builder API. The Supabase path appears to be a legacy/development path that has been largely replaced by the builder API but not fully removed.

3. **Registration management (old path)**: The `registrations.ts` RTK Query module defines extensive CRUD endpoints (`/registrations/*`) that appear to be an older API pattern. The production path uses `/api/builder/customer` and `/api/dashboard/getregistrations` instead.

4. **Widget configuration**: `getWidgetsConfig` and `updateWidgetsConfig` endpoints exist but no visible widget configuration UI.

5. **Project pricing AI generation**: The polling mechanism after AI generation suggests the feature works but may have latency issues.

### Test Coverage

**Zero test files.** There are no unit tests, integration tests, or end-to-end tests anywhere in the repository.

### Hardcoded Values

- Supabase URL and anon key hardcoded in both `.env` and `integrations/supabase/client.ts`
- Property types hardcoded as string arrays in multiple components
- Vendor types hardcoded: `['Tradesman', 'Plumber', 'Electrician', 'Landscaper', 'Sellers', 'Others']`
- User roles hardcoded: `['admin', 'user']`
- Query statuses derived from API but status-specific pages have hardcoded routing logic
- Priority levels hardcoded: `['low', 'medium', 'high', 'urgent']`

### Error Handling for Users

- **Toast notifications** for success/error on mutations -- generally well-implemented
- **Loading states**: Most pages show "Loading..." text. No skeleton loading or shimmer effects used (despite Skeleton component being available).
- **Empty states**: Most list pages have empty state messages with CTAs
- **No global error boundary**: If a component crashes, the entire app fails
- **Session expiry**: Clean modal with sign-out button
- **No offline handling**: No service worker, no offline detection

### Responsiveness

- The app uses Tailwind responsive classes but is primarily designed for desktop
- A `useIsMobile()` hook exists (768px breakpoint) but is minimally used
- The sidebar and navigation are not mobile-optimised
- No evidence of tablet-specific layouts

### Accessibility

- shadcn/ui components provide baseline accessibility (Radix UI handles ARIA attributes)
- Forms use proper labels via the Form component
- No skip-to-content links
- No explicit ARIA landmarks beyond what Radix provides
- No screen reader testing evidence
- Color contrast appears adequate (standard shadcn/ui theme)

### TODO/FIXME Comments

**None found.** The codebase contains zero TODO, FIXME, HACK, or WORKAROUND comments.

### Security Observations

- JWT stored in localStorage (vulnerable to XSS, industry-standard alternative is httpOnly cookies)
- Supabase anon key exposed in client code (expected for Supabase, but should be noted)
- No CSRF protection visible (relies on JWT bearer tokens)
- Content-Type forced to `application/json` even for FormData requests (the fetch API overrides this, but it's a code smell in `prepareHeaders`)

---

## 10. Opportunities

### Priority 1 -- Fix Now (Production Quality)

1. **Add a global error boundary**: A React Error Boundary should wrap the app to prevent white-screen crashes.

2. **Improve loading states**: Replace "Loading..." text with Skeleton components (already installed but unused).

3. **Remove Supabase dual-path code**: The builder API is the production path. The Supabase conditional logic in hooks adds complexity and potential bugs. Clean up or clearly separate the paths.

4. **Remove unused dependencies**: TanStack React Query is barely used alongside RTK Query. Choose one.

5. **Add basic test coverage**: Critical flows (authentication, handover wizard, query lifecycle) should have at least integration tests.

### Priority 2 -- Improve for Current Users

6. **Warranty expiry tracking**: Calculate and display warranty expiry dates based on settlement date + warranty years. Alert builders to upcoming expirations.

7. **Responsive/tablet support**: Many builders work from tablets on-site. The UI needs mobile-responsive navigation and layouts.

8. **Query/defect SLA tracking**: Add response time metrics, overdue indicators, and SLA dashboards for defect management.

9. **Consolidate query pages**: The three query status pages share 90% of their layout. Refactor into a single parameterised component.

10. **Direct homeowner communication**: Add in-app messaging or notification system beyond entitlement delivery and consent emails.

### Priority 3 -- Inform Build OS Design

11. **The handover wizard works well**: The 5-step onboarding flow is the most polished feature. Preserve this workflow pattern in Build OS but improve the UX (better loading states, save-as-draft, progress persistence).

12. **BOM management is essential**: Builders rely heavily on Bill of Materials for standardised item sets. Build OS must include this from day one.

13. **Vendor assignment in defects**: The query-to-vendor assignment workflow is functional but basic. Build OS should add contractor management, scheduling, and SLA tracking.

14. **Project pricing is innovative**: The AI-generated pricing feature with BAL/topography multipliers is unique. Consider expanding this in Build OS with more sophisticated estimation.

15. **Activity tracking needs work**: The project activities feature has good bones but the UX for bulk management and progress tracking could be significantly improved in Build OS.

16. **Super admin impersonation is useful**: Retain this for support/operations in Build OS.

17. **No subscription/billing**: Build OS will need this if moving to a commercial SaaS model.

---

*Report generated by code analysis on 2026-03-29. This report reflects the state of the `development` branch at commit `3bbd89869`.*
