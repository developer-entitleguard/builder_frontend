# Supabase → Backend Migration Plan (builder frontend)

**Goal:** the builder frontend should talk **only** to the EntitleGuard backend. Remove all runtime Supabase dependencies and the Supabase client/provider infrastructure.

**Status:** audit complete, no teardown code written yet. This document sequences the work. Draft 2026-07-13.

---

## 1. Executive summary

The app's **authentication and the large majority of data access already go through the backend** (JWT in `localStorage.userData`, RTK Query slices under `src/store/api/*`). The Supabase auth provider (`useAuth`) still mounts but its `user` is **always null** because nobody logs into Supabase — which renders ~20 files' Supabase branches dead.

However, **7 code paths still hit Supabase directly at runtime** with the anon key. They fall into three categories:

- **Load-bearing public flows (3)** — no backend equivalent exists; these features *depend* on Supabase today and cannot simply be deleted.
- **Leaking builder-screen paths (4)** — the Supabase call still fires but on the builder path targets rows that don't exist in Supabase, so it silently no-ops. One of these (**project pricing**) is a **confirmed data-persistence bug**.
- **Client/provider infrastructure** — the singleton client, `useAuth`, and the root `supabase/` directory (49 migrations + 6 edge functions).

Removing Supabase fully therefore requires **building 3–4 backend endpoints first**, then rerouting the frontend, then deleting the infrastructure. It is a migration, not a one-shot delete.

---

## 2. Confirmed bug — project pricing does not persist on the builder path

**Severity: high (silent data loss on a core feature).** Verified 2026-07-13. `isBuilder = hasBuilderAuth()` is true for every logged-in builder, so this affects all real users on the pricing tab (`ProjectDetail.tsx` → `ProjectPricing.tsx` → `useProjectPricing`).

| Operation | Hook fn | What happens today | Backend endpoint |
|---|---|---|---|
| Edit a cost item's value | `updateCostItem` (`useProjectPricing.tsx:498`) | Item value **does** save (PUT cost-item). But the follow-up `recalculateTotals()` writes the rolled-up totals **only to Supabase** → project total/buffer/margin/final price **not persisted**; revert to stale on reload. | Exists — `PUT /api/builder/projects/{projectId}/pricing/{id}` (`updateProjectPricing`) |
| Delete a cost item | `deleteCostItem` (`useProjectPricing.tsx:596`) | **No builder branch.** Deletes from Supabase `project_cost_items` (0 rows matched, silent success). Item **not deleted from backend → reappears on reload.** | **Missing** — no delete-cost-item endpoint in `PricingController` |
| Change buffer / margin | `updateBufferMargin` (`useProjectPricing.tsx:723`) | **No builder branch.** Writes `project_pricing` **only to Supabase** → **not persisted to backend.** | Exists — `PUT /api/builder/projects/{projectId}/pricing/{id}` |
| Recalculate totals | `recalculateTotals` (`useProjectPricing.tsx:684`) | **No builder branch.** Writes `project_pricing` **only to Supabase.** | Exists — same PUT as above |

**Fix:**
1. Frontend-only for buffer/margin/totals: import `useUpdateProjectPricingMutation`, add an `isBuilder` branch to `recalculateTotals` and `updateBufferMargin` that calls `PUT /api/builder/projects/{projectId}/pricing/{id}` with the computed totals, and only fall back to Supabase on the (dead) non-builder path.
2. Backend + frontend for delete: add `DELETE /api/builder/pricing/{pricingId}/cost-items/{id}` (controller + `projectService` + repository already has `findByIdAndPricingId`), add a `deletePricingCostItem` RTK mutation, and branch `deleteCostItem` on `isBuilder`.

Recommend fixing this **before** the broader teardown, since it is a live correctness issue independent of the Supabase cleanup.

---

## 3. Full inventory

### 3a. LIVE — load-bearing public flows (need backend endpoints before removal)

These have **no backend/RTK alternative** in-file. Removing Supabase breaks the feature until an endpoint exists.

| Flow | File:line | Supabase surface | Backend work needed |
|---|---|---|---|
| Public approval response (`/approval-response?token=`) | `pages/ApprovalResponse.tsx:47` (read), `:101` (update) | `approval_requests` (embeds `project_activities`, `homeowner_registrations`) by `approval_token` | Tokenized GET + POST to fetch/answer an approval by token (unauthenticated) |
| Public invitation acceptance (`/accept-invitation?token=`) | `pages/AcceptInvitation.tsx:69` (read), `:126`/`:201` (edge fn), `:176` (`auth.signUp`), `:191` (`profiles`) | `invitations` table, edge fn `accept-invitation`, Supabase Auth signup, `profiles` | Tokenized invitation fetch + accept endpoint that creates the backend user (ties into existing signup) |
| Public consent confirmation (`/consent?token=`) | `pages/ConsentConfirmation.tsx:27` | edge fn `consent-management` | Tokenized consent-record endpoint |

### 3b. LIVE — leaking builder-screen paths (reroute to existing/near-existing backend)

| Flow | File:line | Supabase surface | Backend status |
|---|---|---|---|
| Project pricing (see §2) | `useProjectPricing.tsx:598,702,748` | `project_pricing`, `project_cost_items` | PUT pricing exists; **delete cost-item missing** |
| Onboarding "Review" step | `components/ReviewApprovalForm.tsx:102,154,240` | `homeowner_registrations` (consent read/write), `builder_items` (read) | Confirm builder endpoints for registration consent + item fetch; reroute |
| Activity updates panel | `hooks/useActivities.tsx:515` (`fetchUpdates`) | `activity_updates` (read) | Confirm/aadd builder endpoint for activity updates; the rest of `useActivities` already has an `isBuilder` RTK branch |
| Legacy item-document removal | `components/ItemsSelectionForm.tsx:494` | Storage bucket `item-documents` (`.remove`) | Backend file storage/S3 already exists; the `if (!fileId)` legacy branch should be dropped |

### 3c. DEAD — safe to delete (gated on always-null `user`, or superseded by `isBuilder` RTK branch, or unreferenced)

- `hooks/useOrganization.tsx` — `rpc('ensure_user_profile')`, `user_roles`, `builder_organizations` inside `fetchUserOrganizations()` (only runs `if (user)`).
- `hooks/useApprovals.tsx` — all `approval_requests`/`activity_updates`/edge-fn paths gated `if (!user)` or reached only from dead callers.
- `hooks/useActivities.tsx` — all CRUD paths behind `if (isBuilder) {…RTK; return}` then `if (!user)`. (Only `fetchUpdates` is live — §3b.)
- `hooks/useProjectPricing.tsx` — `fetchPricing`/`generatePricing`/`addCostItem` legacy Supabase branches (behind `isBuilder`→RTK or `if (!user)`).
- `hooks/useRegistrations.tsx` — **dead module, zero importers.**
- `components/DocumentUploadForm.tsx` — **dead module, no renderers** (`builder_items` select on mount).
- `pages/Onboarding.tsx` — Supabase registration writes are in non-builder `else` branches or an unwired handler.
- `pages/RegistrationDetail.tsx`, `pages/ApprovalDetail.tsx` — Supabase calls in non-builder `else` branches / dead effects.
- `components/ItemsSelectionForm.tsx:413,419` — storage upload guarded by `if (!user) return`.

### 3d. Trivial — unused imports / type-only

- `hooks/useProjects.tsx:2`, `pages/ItemsManagement.tsx:12` — import `supabase`, never call it. Remove import.
- `integrations/supabase/types.ts` — generated `Database` types only.
- `hooks/useOrgVendors.tsx` — no import, only a doc-comment reference.
- `hooks/useAuth.tsx:2` — `User`/`Session` type import (plus the real auth wrapper — see §3e).

### 3e. Client / provider infrastructure (remove last)

- `integrations/supabase/client.ts` — singleton `createClient(url, anonKey, …)`.
- `hooks/useAuth.tsx` — Supabase auth provider (`getSession`, `onAuthStateChange`, `signUp/signIn/signOut`, `resetPasswordForEmail`, `updateUser`). Root-mounted (`App.tsx:154`) but session always null. **Note:** `Auth.tsx` still calls `updatePassword` (Supabase) for the reset-password redirect — needs a backend reset flow before this is removed.
- Root `supabase/` dir — `config.toml`, 49 migrations, 6 edge functions (`accept-invitation`, `approval-notification`, `consent-management`, `generate-project-pricing`, `get-user-emails`, `send-invitation`). `send-invitation` and `get-user-emails` are **not invoked from the frontend at all**.

---

## 4. Phased plan

**Phase 0 — Fix the pricing bug (independent, do first).** §2. Small backend addition (delete cost-item) + frontend rerouting of pricing writes. Ship and verify persistence across reload.

**Phase 1 — Delete the dead weight (frontend-only, low risk).** Remove §3c dead modules/branches and §3d unused imports. No behaviour change; shrinks the Supabase surface to just the live paths. Typecheck + smoke test.

**Phase 2 — Reroute the leaking builder screens (§3b).** Onboarding review consent/items, activity updates, item-doc removal. Confirm each backend endpoint exists (add if not), branch on `isBuilder`, then delete the Supabase branch entirely once the non-builder path is gone.

**Phase 3 — Build backend endpoints for the public flows (§3a).** The real work: tokenized approval-response, invitation-accept, consent. These likely reuse existing patterns (e.g. the tokenized links the backend already issues for vendors/EXTERNAL flows). Migrate `ApprovalResponse.tsx`, `AcceptInvitation.tsx`, `ConsentConfirmation.tsx`.

**Phase 4 — Backend password reset.** Replace `Auth.tsx`'s Supabase `updatePassword`/`resetPasswordForEmail` with the backend reset flow (a `sendVerifyMail` mutation already exists for the request side).

**Phase 5 — Teardown.** Delete `useAuth`'s Supabase provider (or reduce to a no-op/backend-backed shim), `integrations/supabase/client.ts`, `integrations/supabase/types.ts`, `@supabase/supabase-js` from `package.json`, and the root `supabase/` directory. Remove the `AuthProvider` mount if nothing consumes it. Final typecheck + full smoke test of every migrated flow.

---

## 5. Open questions

1. **Public flows data** — do live approvals/invitations/consents currently exist in Supabase that must be migrated to the backend DB, or is this greenfield (no real data to move)?
2. **Approval/invitation/consent** — should these reuse the backend's existing tokenized-link mechanism (as used for EXTERNAL vendors), or get new endpoints?
3. **Password reset** — is there already a backend reset-confirm endpoint, or does that need building too?
4. **`send-invitation` / `get-user-emails` edge functions** — invoked from anywhere else (other frontends)? If builder-only, they die with this migration.
5. Should the root `supabase/` migrations be preserved for history or deleted outright?
