import { api } from './apiSlice';

/**
 * Covered or Quoted decision queue (Revenue Capabilities Track F, CQ9/CQ10).
 * COVERED_OR_QUOTED module, COVER_DECLINE_CONFIRM permission (Administrator
 * and Customer Support). Mirrors CoverDecisionController on the backend
 * (/api/builder/cover-checks). Errors carry a `message`.
 *
 * Copy rule: an owner only sees a decline once a named person confirms it
 * here. Nothing in this module is shown to owners.
 */

/** CoverQueueService.Row */
export interface CoverQueueRow {
  checkId: string;
  queryId: string;
  queryTitle: string | null;
  responsibleParty: string | null;
  aiCategory: string | null;
  confidence: number | null;
  createdAt: string | null;
  /** Set once the check has waited more than 3 business days. */
  escalatedAt: string | null;
}

export interface CoverPhoto {
  fileId: string;
  name: string | null;
  type: string | null;
}

export interface CoverHistoryEntry {
  at: string | null;
  action: string | null;
  reason: string | null;
}

export interface CoverReasonOption {
  code: string;
  label: string;
}

/** CoverQueueService.Detail */
export interface CoverCheckDetail {
  checkId: string;
  queryId: string;
  queryTitle: string | null;
  queryDescription: string | null;
  outcome: string | null;
  status: string | null;
  responsibleParty: string | null;
  aiCategory: string | null;
  confidence: number | null;
  /** Suggested reasoning, plain text. */
  reasons: string | null;
  /** JSON text: `{ basis, references }`. */
  sourcesJson: string | null;
  photos: CoverPhoto[];
  history: CoverHistoryEntry[];
  reasonOptions: CoverReasonOption[];
  /** Always null: no reason is preselected (CQ10). */
  selectedReason: string | null;
}

export interface CoverDecisionResult {
  checkId: string;
  status: string;
}

export interface ConfirmDeclineBody {
  id: string;
  reasonCode: string;
  note: string;
}

export interface ConfirmCoveredBody {
  id: string;
  note?: string;
}

export interface CoverSources {
  basis: string | null;
  references: string[];
}

/** Parse `sourcesJson` defensively; references may be strings or objects. */
export const parseCoverSources = (raw: string | null | undefined): CoverSources | null => {
  if (!raw || !raw.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as { basis?: unknown; references?: unknown };
    if (!parsed || typeof parsed !== 'object') return null;
    const basis = typeof parsed.basis === 'string' && parsed.basis.trim() ? parsed.basis : null;
    const refs = Array.isArray(parsed.references) ? parsed.references : [];
    const references = refs
      .map((r) => {
        if (typeof r === 'string') return r;
        if (r && typeof r === 'object') {
          const o = r as Record<string, unknown>;
          const parts = [o.title, o.name, o.label, o.section, o.text, o.url].filter(
            (v): v is string => typeof v === 'string' && !!v.trim(),
          );
          return parts.length ? parts.join(' · ') : JSON.stringify(r);
        }
        return r == null ? '' : String(r);
      })
      .filter((s) => !!s.trim());
    if (!basis && references.length === 0) return null;
    return { basis, references };
  } catch {
    return { basis: raw, references: [] };
  }
};

/** "OWNER_DAMAGE" -> "Owner damage". */
export const humanizeCode = (code: string | null | undefined): string =>
  code ? code.replace(/_/g, ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase()) : '';

const BASE = '/api/builder/cover-checks';

export const coverDecisionsApi = api.injectEndpoints({
  endpoints: (build) => ({
    getCoverQueue: build.query<CoverQueueRow[], void>({
      query: () => ({ url: BASE, method: 'GET' }),
      providesTags: [{ type: 'CoverDecisions', id: 'LIST' }],
    }),
    getCoverCheck: build.query<CoverCheckDetail, string>({
      query: (id) => ({ url: `${BASE}/${id}`, method: 'GET' }),
      providesTags: (_r, _e, id) => [{ type: 'CoverDecisions', id }],
    }),
    confirmCoverDecline: build.mutation<CoverDecisionResult, ConfirmDeclineBody>({
      query: ({ id, reasonCode, note }) => ({
        url: `${BASE}/${id}/confirm-decline`,
        method: 'POST',
        body: { reasonCode, note },
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: 'CoverDecisions', id: 'LIST' },
        { type: 'CoverDecisions', id },
      ],
    }),
    confirmCoverCovered: build.mutation<CoverDecisionResult, ConfirmCoveredBody>({
      query: ({ id, note }) => ({
        url: `${BASE}/${id}/confirm-covered`,
        method: 'POST',
        body: note && note.trim() ? { note: note.trim() } : {},
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: 'CoverDecisions', id: 'LIST' },
        { type: 'CoverDecisions', id },
      ],
    }),
  }),
});

export const coverErrorStatus = (err: unknown): number | undefined => {
  const s = (err as { status?: unknown } | undefined)?.status;
  return typeof s === 'number' ? s : undefined;
};

export const coverDecisionsErrorMessage = (err: unknown, fallback = 'Something went wrong'): string => {
  const e = err as { status?: unknown; data?: unknown; error?: string } | undefined;
  if (!e) return fallback;
  if (e.status === 409) return 'Someone else has already decided this one.';
  if (e.data && typeof e.data === 'object' && 'message' in e.data) {
    const m = (e.data as { message?: unknown }).message;
    if (typeof m === 'string' && m.trim()) return m;
  }
  if (typeof e.data === 'string' && e.data.trim()) return e.data;
  if (e.status === 403) return 'Cover decisions are not enabled for this business, or your role does not include them.';
  return e.error ?? fallback;
};

export const {
  useGetCoverQueueQuery,
  useGetCoverCheckQuery,
  useConfirmCoverDeclineMutation,
  useConfirmCoverCoveredMutation,
} = coverDecisionsApi;
