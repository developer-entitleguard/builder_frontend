import { api } from './apiSlice';

/**
 * Defect Recovery (Revenue Capabilities Track G, DR1 to DR16). DEFECT_RECOVERY
 * module. Mirrors BuilderRecoveryController on the backend
 * (/api/builder/recovery). Shapes come from RecoveryViews,
 * RecoveryResponseService.TargetView and RecoveryEvidence.Record. Errors carry
 * a `message`.
 *
 * Permissions: RECOVERY_RAISE (Administrator, Customer Support) raises and
 * works a case; RECOVERY_SEND (Administrator) sends and closes;
 * RECOVERY_CONFIRM_MONEY (Administrator) records cost and money; ORG_MANAGE
 * (Administrator) edits Defects terms and Trade scope; RECOVERY_RESPOND
 * (Administrator) answers notices this builder received.
 *
 * Copy rule: Entitle Guard records; it never judges. A target's outcomes are
 * private: nothing here counts or ranks across targets.
 */

// ---------------------------------------------------------------- shapes

/** RecoveryViews.Summary */
export interface RecoveryCaseSummary {
  id: string;
  title: string | null;
  status: string;
  statusLabel: string;
  targetType: string | null;
  targetName: string | null;
  costAmount: number | null;
  recoveredTotal: number | null;
  responseDueOn: string | null;
  periodEndsOn: string | null;
  createdAt: string | null;
}

/** AttributionChainBuilder.Link */
export interface ChainLink {
  id: string;
  kind: string | null;
  label: string | null;
  source: string | null;
  orgType: string | null;
  orgId: string | null;
  on: string | null;
}

/** AttributionChainBuilder.Candidate */
export interface ChainCandidate {
  key: string;
  targetType: string;
  orgType: string | null;
  orgId: string | null;
  supplierId: string | null;
  name: string | null;
  email: string | null;
  onPlatform: boolean;
  workDate: string | null;
  linkIds: string[];
  strength: number;
}

export interface Chain {
  links: ChainLink[];
  gaps: string[];
  candidates: ChainCandidate[];
}

/** RecoveryViews.EventView */
export interface RecoveryEventView {
  id: string;
  kind: string;
  side: string | null;
  fromStatus: string | null;
  toStatus: string | null;
  note: string | null;
  fileId: string | null;
  amount: number | null;
  method: string | null;
  at: string | null;
}

/** RecoveryEvidence.Fact */
export interface EvidenceFact {
  label: string;
  value: string | null;
  source: string | null;
}

/** RecoveryEvidence.OwnRecord */
export interface EvidenceOwnRecord {
  jobId: string;
  title: string | null;
  scope: string | null;
  completedOn: string | null;
  documents: EvidenceFact[];
}

/** RecoveryEvidence.Entry */
export interface EvidenceEntry {
  at: string | null;
  text: string | null;
  source: string | null;
  fileId: string | null;
}

/** RecoveryEvidence.Record */
export interface EvidenceRecord {
  caseId: string;
  builderName: string | null;
  targetName: string | null;
  title: string | null;
  facts: EvidenceFact[];
  basis: ChainLink[];
  targetOwnRecord: EvidenceOwnRecord[];
  photos: { fileId: string; name: string | null }[];
  timeline: EvidenceEntry[];
  statement: string;
}

/** NoticeWordingCheck.Finding */
export interface NoticeFinding {
  phrase: string;
  why: string;
}

/** RecoveryViews.Detail */
export interface RecoveryCaseDetail {
  summary: RecoveryCaseSummary;
  registrationId: string | null;
  queryId: string | null;
  orderItemId: string | null;
  defectDescription: string | null;
  targetOrgType: string | null;
  targetOrgId: string | null;
  targetEmail: string | null;
  targetOnPlatform: boolean;
  costBasis: string | null;
  costFileId: string | null;
  workDate: string | null;
  /** true / false / null (unknown: show nothing). */
  inPeriod: boolean | null;
  noticeSubject: string | null;
  noticeBody: string | null;
  noticeDraftedByAi: boolean;
  noticeFindings: NoticeFinding[];
  sentAt: string | null;
  paused: boolean;
  ownerDetailsShared: boolean;
  chain: Chain;
  events: RecoveryEventView[];
  evidence: EvidenceRecord;
  clause: string | null;
  nextStatuses: string[];
}

/** RecoveryCaseService.NoticeDraft */
export interface NoticeDraft {
  subject: string | null;
  body: string | null;
  draftedByAi: boolean;
  findings: NoticeFinding[];
  clause: string | null;
}

export type TargetAction = 'ACCEPT' | 'DISPUTE' | 'OFFER_FIX' | 'REQUEST_INFO';

/** RecoveryResponseService.TargetView */
export interface TargetView {
  caseId: string;
  status: string;
  statusLabel: string;
  builderName: string | null;
  noticeSubject: string | null;
  noticeBody: string | null;
  replyBy: string | null;
  paused: boolean;
  clause: string | null;
  record: EvidenceRecord;
  actions: TargetAction[];
}

/** BuilderRecoveryController.TermsRow */
export interface SubcontractTerms {
  id: string;
  tradeOrgId: string | null;
  /** The trade's name; null for the default row (or a trade that no longer exists). */
  tradeName: string | null;
  defectsPeriodMonths: number;
  noticeMethod: string | null;
  backChargeClause: string | null;
  responseDays: number;
  reminderDaysBefore: number;
}

export interface SubcontractTermsInput {
  tradeOrgId?: string | null;
  defectsPeriodMonths: number;
  noticeMethod?: string | null;
  backChargeClause?: string | null;
  responseDays?: number | null;
  reminderDaysBefore?: number | null;
}

/** TradeScopeMappingService.Row */
export interface ScopeMapping {
  id: string;
  bomCategory: string;
  tradeOrgId: string | null;
  tradeName: string | null;
  complianceCategory: string | null;
  status: 'PROPOSED' | 'CONFIRMED' | 'REJECTED';
  source: 'PREFILL' | 'BUILDER';
  evidenceCount: number;
}

export interface ScopeMappingInput {
  bomCategory: string;
  tradeOrgId?: string | null;
  complianceCategory?: string | null;
}

/** BuilderRecoveryController.HomeItem: an item on one of the builder's homes. */
export interface RecoveryHomeItem {
  orderItemId: string;
  brand: string | null;
  model: string | null;
  productType: string | null;
}

export interface RaiseCaseBody {
  queryId?: string;
  registrationId?: string;
  orderItemId?: string;
  title?: string;
  description?: string;
}

export type TargetType = 'TRADE' | 'SUPPLIER' | 'MANUFACTURER' | 'BUILDER';

export type ChooseTargetBody =
  | { id: string; candidateKey: string; email?: string }
  | {
      id: string;
      targetType: TargetType;
      tradeOrgId?: string;
      builderOrgId?: string;
      name?: string;
      email?: string;
    };

export type CostBasis = 'INVOICE' | 'INTERNAL_LABOUR' | 'ESTIMATE';
export type MoneyMethod = 'PAID' | 'SET_OFF' | 'FIXED_BY_TARGET';

export interface MoneyBody {
  id: string;
  method: MoneyMethod;
  amount?: number;
  avoidedEstimate?: number;
  note?: string;
}

// ---------------------------------------------------------------- copy

export const STATEMENT_FALLBACK =
  'This is a record of events taken from Entitle Guard records, with the source of each fact. It is not a finding of liability.';

export const COST_BASIS_LABEL: Record<CostBasis, string> = {
  INVOICE: 'Invoice',
  INTERNAL_LABOUR: 'Our own labour',
  ESTIMATE: 'Estimate',
};

export const TARGET_TYPE_LABEL: Record<TargetType, string> = {
  TRADE: 'Trade',
  SUPPLIER: 'Supplier',
  MANUFACTURER: 'Manufacturer',
  BUILDER: 'Builder',
};

export const targetTypeLabel = (t: string | null | undefined): string =>
  (t && TARGET_TYPE_LABEL[t as TargetType]) || (t ? t.charAt(0) + t.slice(1).toLowerCase() : '');

export const SIDE_LABEL: Record<string, string> = {
  RAISER: 'Your business',
  TARGET: 'Recipient',
  SYSTEM: 'Entitle Guard',
  PLATFORM: 'Entitle Guard',
};

export const fmtRecoveryDate = (iso: string | null | undefined): string => {
  if (!iso) return '';
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

export const fmtMoney = (n: number | null | undefined): string =>
  n == null ? '' : `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ---------------------------------------------------------------- endpoints

const BASE = '/api/builder/recovery';

const caseTags = (id: string) => [
  { type: 'Recovery' as const, id: 'LIST' },
  { type: 'Recovery' as const, id },
];

/** Builds multipart fields, skipping empty values. */
const form = (fields: Record<string, string | Blob | null | undefined>): FormData => {
  const f = new FormData();
  Object.entries(fields).forEach(([k, v]) => {
    if (v == null) return;
    if (typeof v === 'string' && !v.trim()) return;
    f.append(k, typeof v === 'string' ? v.trim() : v);
  });
  return f;
};

export interface DownloadedPack {
  url: string;
  filename: string;
}

const filenameFrom = (disposition: string | null, fallback: string): string => {
  const m = disposition?.match(/filename="?([^";]+)"?/i);
  return m?.[1] ?? fallback;
};

export const recoveryApi = api.injectEndpoints({
  endpoints: (build) => ({
    // ---- cases
    getRecoveryCases: build.query<RecoveryCaseSummary[], void>({
      query: () => ({ url: `${BASE}/cases`, method: 'GET' }),
      providesTags: [{ type: 'Recovery', id: 'LIST' }],
    }),
    getRecoveryCase: build.query<RecoveryCaseDetail, string>({
      query: (id) => ({ url: `${BASE}/cases/${id}`, method: 'GET' }),
      providesTags: (_r, _e, id) => [{ type: 'Recovery', id }],
    }),
    getRecoveryHomeItems: build.query<RecoveryHomeItem[], string>({
      query: (registrationId) => ({ url: `${BASE}/homes/${registrationId}/items`, method: 'GET' }),
    }),
    raiseRecoveryCase: build.mutation<RecoveryCaseDetail, RaiseCaseBody>({
      query: (body) => ({ url: `${BASE}/cases`, method: 'POST', body }),
      invalidatesTags: [{ type: 'Recovery', id: 'LIST' }],
    }),
    chooseRecoveryTarget: build.mutation<RecoveryCaseDetail, ChooseTargetBody>({
      query: ({ id, ...body }) => ({ url: `${BASE}/cases/${id}/target`, method: 'POST', body }),
      invalidatesTags: (_r, _e, { id }) => caseTags(id),
    }),
    recordRecoveryCost: build.mutation<
      RecoveryCaseDetail,
      { id: string; amount: string; basis: CostBasis; file?: File | null }
    >({
      query: ({ id, amount, basis, file }) => ({
        url: `${BASE}/cases/${id}/cost`,
        method: 'POST',
        body: form({ amount, basis, file: file ?? undefined }),
      }),
      invalidatesTags: (_r, _e, { id }) => caseTags(id),
    }),
    draftRecoveryNotice: build.mutation<NoticeDraft, string>({
      query: (id) => ({ url: `${BASE}/cases/${id}/notice/draft`, method: 'POST' }),
      invalidatesTags: (_r, _e, id) => [{ type: 'Recovery', id }],
    }),
    saveRecoveryNotice: build.mutation<NoticeDraft, { id: string; subject: string; body: string }>({
      query: ({ id, subject, body }) => ({ url: `${BASE}/cases/${id}/notice`, method: 'PUT', body: { subject, body } }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Recovery', id }],
    }),
    sendRecoveryNotice: build.mutation<RecoveryCaseDetail, string>({
      query: (id) => ({ url: `${BASE}/cases/${id}/send`, method: 'POST' }),
      invalidatesTags: (_r, _e, id) => caseTags(id),
    }),
    answerRecoveryInfo: build.mutation<RecoveryCaseDetail, { id: string; note: string; file?: File | null }>({
      query: ({ id, note, file }) => ({
        url: `${BASE}/cases/${id}/answer-info`,
        method: 'POST',
        body: form({ note, file: file ?? undefined }),
      }),
      invalidatesTags: (_r, _e, { id }) => caseTags(id),
    }),
    addRecoveryEvidence: build.mutation<RecoveryCaseDetail, { id: string; note?: string; file?: File | null }>({
      query: ({ id, note, file }) => ({
        url: `${BASE}/cases/${id}/evidence`,
        method: 'POST',
        body: form({ note, file: file ?? undefined }),
      }),
      invalidatesTags: (_r, _e, { id }) => caseTags(id),
    }),
    recordRecoveryMoney: build.mutation<RecoveryCaseDetail, MoneyBody>({
      query: ({ id, ...body }) => ({ url: `${BASE}/cases/${id}/money`, method: 'POST', body }),
      invalidatesTags: (_r, _e, { id }) => caseTags(id),
    }),
    closeRecoveryCase: build.mutation<RecoveryCaseDetail, { id: string; note?: string }>({
      query: ({ id, note }) => ({
        url: `${BASE}/cases/${id}/close`,
        method: 'POST',
        body: note && note.trim() ? { note: note.trim() } : {},
      }),
      invalidatesTags: (_r, _e, { id }) => caseTags(id),
    }),
    /** Returns a blob object URL; the caller revokes it. */
    downloadRecoveryPack: build.mutation<DownloadedPack, { path: string; fallbackName: string }>({
      queryFn: async ({ path, fallbackName }, _api, _extra, baseQuery) => {
        let filename = fallbackName;
        const res = await baseQuery({
          url: `${BASE}/${path}`,
          method: 'GET',
          headers: { Accept: '*/*' },
          responseHandler: async (r) => {
            filename = filenameFrom(r.headers.get('Content-Disposition'), fallbackName);
            return r.blob();
          },
        });
        if (res.error) return { error: res.error };
        return { data: { url: URL.createObjectURL(res.data as Blob), filename } };
      },
    }),

    // ---- subcontract terms (DR5)
    getRecoveryTerms: build.query<SubcontractTerms[], void>({
      query: () => ({ url: `${BASE}/terms`, method: 'GET' }),
      providesTags: [{ type: 'Recovery', id: 'TERMS' }],
    }),
    saveRecoveryTerms: build.mutation<SubcontractTerms, SubcontractTermsInput>({
      query: (body) => ({ url: `${BASE}/terms`, method: 'PUT', body }),
      invalidatesTags: [{ type: 'Recovery', id: 'TERMS' }],
    }),
    deleteRecoveryTerms: build.mutation<void, string>({
      query: (id) => ({ url: `${BASE}/terms/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Recovery', id: 'TERMS' }],
    }),

    // ---- trade scope (C34, P0)
    getScopeMappings: build.query<ScopeMapping[], void>({
      query: () => ({ url: `${BASE}/scope-mappings`, method: 'GET' }),
      providesTags: [{ type: 'Recovery', id: 'SCOPE' }],
    }),
    prefillScopeMappings: build.mutation<{ proposed: number }, void>({
      query: () => ({ url: `${BASE}/scope-mappings/prefill`, method: 'POST' }),
      invalidatesTags: [{ type: 'Recovery', id: 'SCOPE' }],
    }),
    createScopeMapping: build.mutation<ScopeMapping, ScopeMappingInput>({
      query: (body) => ({ url: `${BASE}/scope-mappings`, method: 'POST', body }),
      invalidatesTags: [{ type: 'Recovery', id: 'SCOPE' }],
    }),
    decideScopeMapping: build.mutation<ScopeMapping, { id: string; confirm: boolean }>({
      query: ({ id, confirm }) => ({
        url: `${BASE}/scope-mappings/${id}/${confirm ? 'confirm' : 'reject'}`,
        method: 'POST',
      }),
      invalidatesTags: [{ type: 'Recovery', id: 'SCOPE' }],
    }),

    // ---- notices received (DR3, DR9)
    getIncomingNotices: build.query<RecoveryCaseSummary[], void>({
      query: () => ({ url: `${BASE}/incoming`, method: 'GET' }),
      providesTags: [{ type: 'Recovery', id: 'INCOMING' }],
    }),
    getIncomingNotice: build.query<TargetView, string>({
      query: (id) => ({ url: `${BASE}/incoming/${id}`, method: 'GET' }),
      providesTags: (_r, _e, id) => [{ type: 'Recovery', id: `INCOMING-${id}` }],
    }),
    respondIncomingNotice: build.mutation<
      TargetView,
      { id: string; action: TargetAction; note?: string; file?: File | null }
    >({
      query: ({ id, action, note, file }) => ({
        url: `${BASE}/incoming/${id}/respond`,
        method: 'POST',
        body: form({ action, note, file: file ?? undefined }),
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: 'Recovery', id: 'INCOMING' },
        { type: 'Recovery', id: `INCOMING-${id}` },
      ],
    }),
    addIncomingEvidence: build.mutation<TargetView, { id: string; note?: string; file?: File | null }>({
      query: ({ id, note, file }) => ({
        url: `${BASE}/incoming/${id}/evidence`,
        method: 'POST',
        body: form({ note, file: file ?? undefined }),
      }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Recovery', id: `INCOMING-${id}` }],
    }),
  }),
});

export const recoveryErrorStatus = (err: unknown): number | undefined => {
  const s = (err as { status?: unknown } | undefined)?.status;
  return typeof s === 'number' ? s : undefined;
};

export const recoveryErrorMessage = (err: unknown, fallback = 'Something went wrong'): string => {
  const e = err as { status?: unknown; data?: unknown; error?: string } | undefined;
  if (!e) return fallback;
  if (e.data && typeof e.data === 'object' && 'message' in e.data) {
    const m = (e.data as { message?: unknown }).message;
    if (typeof m === 'string' && m.trim()) return m;
  }
  if (typeof e.data === 'string' && e.data.trim()) return e.data;
  if (e.status === 403) return 'Defect Recovery is not enabled for this business, or your role does not include it.';
  return e.error ?? fallback;
};

/** Saves a downloaded pack, then revokes its object URL. */
export const savePack = (pack: DownloadedPack) => {
  const a = document.createElement('a');
  a.href = pack.url;
  a.download = pack.filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(pack.url), 1000);
};

export const {
  useGetRecoveryCasesQuery,
  useGetRecoveryCaseQuery,
  useGetRecoveryHomeItemsQuery,
  useRaiseRecoveryCaseMutation,
  useChooseRecoveryTargetMutation,
  useRecordRecoveryCostMutation,
  useDraftRecoveryNoticeMutation,
  useSaveRecoveryNoticeMutation,
  useSendRecoveryNoticeMutation,
  useAnswerRecoveryInfoMutation,
  useAddRecoveryEvidenceMutation,
  useRecordRecoveryMoneyMutation,
  useCloseRecoveryCaseMutation,
  useDownloadRecoveryPackMutation,
  useGetRecoveryTermsQuery,
  useSaveRecoveryTermsMutation,
  useDeleteRecoveryTermsMutation,
  useGetScopeMappingsQuery,
  usePrefillScopeMappingsMutation,
  useCreateScopeMappingMutation,
  useDecideScopeMappingMutation,
  useGetIncomingNoticesQuery,
  useGetIncomingNoticeQuery,
  useRespondIncomingNoticeMutation,
  useAddIncomingEvidenceMutation,
} = recoveryApi;
