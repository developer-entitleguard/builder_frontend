import { api } from './apiSlice';

/**
 * Completion Gate (Revenue Capabilities Track C, CG1 to CG19). COMPLETION_GATE
 * module. Mirrors CompletionController and the records in CompletionService on
 * the backend. Responses are plain JSON (no DefaultListResponse envelope);
 * errors carry a `message`.
 *
 * Roles (section 12): view for Administrator, Project Manager, Customer
 * Support; accept/send back, chase and chase wording for Administrator and
 * Project Manager; override and waive for Administrator only. The backend
 * nulls `finalClaimAmount` and `amountWaiting` for anyone but an Administrator.
 */

export type LineType = 'PROJECT' | 'REGISTRATION';
export type Readiness = 'NOT_READY' | 'READY_TO_ISSUE' | 'ISSUED' | 'PAID';
export type CheckResult = 'PASS' | 'FAIL' | 'NOT_CHECKED';

export interface ExceptionView {
  id: string;
  type: 'OVERRIDE' | 'WAIVER';
  reason: string;
  createdAt: string;
}

export interface ItemView {
  lineType: LineType;
  lineId: string;
  documentName: string;
  status: string;
  responsibleParty: string | null;
  assignee: string | null;
  daysOutstanding: number | null;
  /** True when this item stops handover. */
  blocks: boolean;
  legallyRequired: boolean;
  finalClaimPrecondition: boolean;
  exception: ExceptionView | null;
  latestCheck: CheckResult | null;
  chaseCount: number | null;
  escalated: boolean;
  /** The item's current document; all three are null when there is none. */
  attachmentId: string | null;
  attachmentReviewStatus: string | null;
  referenceNumber: string | null;
}

export interface HomeView {
  registrationId: string;
  label: string;
  projectId: string | null;
  projectName: string | null;
  state: string | null;
  handedOver: boolean;
  gated: boolean;
  targetPcDate: string | null;
  pcDate: string | null;
  certificateDate: string | null;
  claimIssuedAt: string | null;
  claimPaidAt: string | null;
  readiness: Readiness;
  preconditionSource: 'RULEBOOK' | 'BUILDER_TEMPLATE' | 'ALL_REQUIRED';
  /** Administrator only; null for everyone else. */
  finalClaimAmount: number | null;
  openItems: number;
  nextAction: string | null;
  items: ItemView[];
}

export interface CompletionOverview {
  homes: number;
  homesWithOpenItems: number;
  openItems: number;
  /** Administrator only; null for everyone else. */
  amountWaiting: number | null;
  homesNeedingAction: HomeView[];
}

export type ClearableField = 'targetPcDate' | 'certificateDate' | 'claimIssuedAt' | 'claimPaidAt' | 'finalClaimAmount';

export interface StatePatch {
  targetPcDate?: string | null;
  certificateDate?: string | null;
  /** Administrator only. */
  finalClaimAmount?: number | null;
  claimIssuedAt?: string | null;
  claimPaidAt?: string | null;
  /** Fields to empty (null values are ignored). finalClaimAmount is Administrator only. */
  clear?: ClearableField[];
}

export interface ItemReason {
  lineType: LineType;
  lineId: string;
  reason: string;
}

export interface GateException {
  id: string;
  registrationId: string;
  lineType: LineType;
  lineId: string;
  documentName: string | null;
  type: 'OVERRIDE' | 'WAIVER';
  legallyRequired: boolean | null;
  reason: string;
  createdAt: string;
  revokedAt: string | null;
}

export interface DocumentCheck {
  id: string;
  attachmentId: string;
  result: CheckResult;
  /** JSON string, see {@link CheckEntry}. */
  checksJson: string | null;
  acceptedAt: string | null;
  sentBackAt: string | null;
  createdAt: string | null;
}

export interface CheckEntry {
  check: 'type' | 'address' | 'licence' | 'signature' | 'date' | 'expiry' | string;
  result: CheckResult | string;
  reason: string | null;
  source_page?: number | null;
}

export interface FirstAgmResult {
  projectId: string;
  plannedAgmDate: string;
  itemsDue: string | null;
  rulebookVersion: number;
  added: string[];
  alreadyPresent: string[];
}

const BASE = '/api/builder/completion';

const homeTags = (registrationId: string) => [
  { type: 'Completion' as const, id: registrationId },
  { type: 'Completion' as const, id: 'LIST' },
];

export const completionApi = api.enhanceEndpoints({ addTagTypes: ['Completion'] }).injectEndpoints({
  endpoints: (build) => ({
    getCompletionOverview: build.query<CompletionOverview, void>({
      query: () => ({ url: `${BASE}/overview`, method: 'GET' }),
      providesTags: [{ type: 'Completion', id: 'LIST' }],
    }),

    getProjectCompletion: build.query<HomeView[], { projectId: string }>({
      query: ({ projectId }) => ({ url: BASE, method: 'GET', params: { projectId } }),
      providesTags: (r) => [
        { type: 'Completion', id: 'LIST' },
        ...(r ?? []).map((h) => ({ type: 'Completion' as const, id: h.registrationId })),
      ],
    }),

    updateCompletionState: build.mutation<HomeView, { registrationId: string; patch: StatePatch }>({
      query: ({ registrationId, patch }) => ({
        url: `${BASE}/registrations/${registrationId}/state`,
        method: 'PATCH',
        body: patch,
      }),
      invalidatesTags: (_r, _e, arg) => homeTags(arg.registrationId),
    }),

    overrideGate: build.mutation<GateException[], { registrationId: string; items: ItemReason[] }>({
      query: ({ registrationId, items }) => ({
        url: `${BASE}/registrations/${registrationId}/gate-override`,
        method: 'POST',
        body: { items },
      }),
      invalidatesTags: (_r, _e, arg) => homeTags(arg.registrationId),
    }),

    waiveItem: build.mutation<GateException, { registrationId: string; item: ItemReason }>({
      query: ({ registrationId, item }) => ({
        url: `${BASE}/registrations/${registrationId}/waive`,
        method: 'POST',
        body: item,
      }),
      invalidatesTags: (_r, _e, arg) => homeTags(arg.registrationId),
    }),

    revokeException: build.mutation<GateException, { registrationId: string; exceptionId: string }>({
      query: ({ registrationId, exceptionId }) => ({
        url: `${BASE}/registrations/${registrationId}/exceptions/${exceptionId}/revoke`,
        method: 'POST',
      }),
      invalidatesTags: (_r, _e, arg) => homeTags(arg.registrationId),
    }),

    chaseItemNow: build.mutation<
      { status: string },
      { registrationId: string; lineType: LineType; lineId: string }
    >({
      query: ({ registrationId, lineType, lineId }) => ({
        url: `${BASE}/registrations/${registrationId}/items/${lineType}/${lineId}/chase`,
        method: 'POST',
      }),
      invalidatesTags: (_r, _e, arg) => homeTags(arg.registrationId),
    }),

    getChaseTemplate: build.query<{ template: string }, void>({
      query: () => ({ url: `${BASE}/chase-template`, method: 'GET' }),
      providesTags: [{ type: 'Completion', id: 'CHASE_TEMPLATE' }],
    }),

    saveChaseTemplate: build.mutation<{ template: string }, { template: string }>({
      query: (body) => ({ url: `${BASE}/chase-template`, method: 'PUT', body }),
      invalidatesTags: [{ type: 'Completion', id: 'CHASE_TEMPLATE' }],
    }),

    draftChaseTemplate: build.mutation<{ template: string }, void>({
      query: () => ({ url: `${BASE}/chase-template/draft`, method: 'POST' }),
    }),

    getItemChecks: build.query<DocumentCheck[], { lineType: LineType; lineId: string }>({
      query: ({ lineType, lineId }) => ({ url: `${BASE}/items/${lineType}/${lineId}/checks`, method: 'GET' }),
      providesTags: (_r, _e, arg) => [{ type: 'Completion', id: `checks-${arg.lineType}-${arg.lineId}` }],
    }),

    acceptCheck: build.mutation<
      DocumentCheck,
      { checkId: string; registrationId: string; lineType: LineType; lineId: string }
    >({
      query: ({ checkId }) => ({ url: `${BASE}/checks/${checkId}/accept`, method: 'POST' }),
      invalidatesTags: (_r, _e, arg) => [
        ...homeTags(arg.registrationId),
        { type: 'Completion', id: `checks-${arg.lineType}-${arg.lineId}` },
        'ComplianceDocuments',
        'ComplianceAttachments',
        'HandoverReadiness',
      ],
    }),

    sendBackCheck: build.mutation<
      DocumentCheck,
      { checkId: string; reason?: string; registrationId: string; lineType: LineType; lineId: string }
    >({
      query: ({ checkId, reason }) => ({
        url: `${BASE}/checks/${checkId}/send-back`,
        method: 'POST',
        body: { reason: reason?.trim() ? reason.trim() : null },
      }),
      invalidatesTags: (_r, _e, arg) => [
        ...homeTags(arg.registrationId),
        { type: 'Completion', id: `checks-${arg.lineType}-${arg.lineId}` },
        'ComplianceDocuments',
        'ComplianceAttachments',
        'HandoverReadiness',
      ],
    }),

    setAttachmentReference: build.mutation<
      { referenceNumber: string },
      { attachmentId: string; referenceNumber: string }
    >({
      query: ({ attachmentId, referenceNumber }) => ({
        url: `${BASE}/attachments/${attachmentId}/reference-number`,
        method: 'PUT',
        body: { referenceNumber },
      }),
      invalidatesTags: ['ComplianceAttachments', { type: 'Completion', id: 'LIST' }],
    }),

    /**
     * Fetches the evidence pack ZIP through the shared base query (auth +
     * refresh) and returns a blob object URL plus the server's filename. The
     * caller revokes the URL. Returning a string keeps the Blob out of the store.
     */
    downloadEvidencePack: build.mutation<{ url: string; filename: string }, { registrationId: string }>({
      queryFn: async ({ registrationId }, _api, _extra, baseQuery) => {
        let filename = 'evidence-pack.zip';
        const res = await baseQuery({
          url: `${BASE}/registrations/${registrationId}/evidence-pack`,
          method: 'GET',
          headers: { Accept: 'application/zip, application/json' },
          responseHandler: async (r) => {
            if (!r.ok) {
              const text = await r.text();
              try {
                return JSON.parse(text);
              } catch {
                return text;
              }
            }
            const cd = r.headers.get('Content-Disposition') ?? '';
            const m = /filename="?([^";]+)"?/i.exec(cd);
            if (m?.[1]) filename = m[1];
            return r.blob();
          },
        });
        if (res.error) return { error: res.error };
        return { data: { url: URL.createObjectURL(res.data as Blob), filename } };
      },
    }),

    setUpFirstAgm: build.mutation<
      FirstAgmResult,
      { projectId: string; plannedAgmDate: string; multiStorey: boolean }
    >({
      query: ({ projectId, plannedAgmDate, multiStorey }) => ({
        url: `${BASE}/projects/${projectId}/first-agm`,
        method: 'POST',
        body: { plannedAgmDate, multiStorey },
      }),
      invalidatesTags: [{ type: 'Completion', id: 'LIST' }, 'ComplianceDocuments'],
    }),
  }),
});

/** Pulls the backend's `message` out of an RTK Query error. */
export const completionErrorMessage = (err: unknown, fallback = 'Something went wrong'): string => {
  const e = err as { status?: unknown; data?: unknown; error?: string } | undefined;
  if (!e) return fallback;
  if (e.data && typeof e.data === 'object' && 'message' in e.data) {
    const m = (e.data as { message?: unknown }).message;
    if (typeof m === 'string' && m.trim()) return m;
  }
  if (typeof e.data === 'string' && e.data.trim()) return e.data;
  if (e.status === 403) return 'Completion Gate is not enabled, or your role does not allow this.';
  return e.error ?? fallback;
};

export const completionErrorStatus = (err: unknown): unknown => (err as { status?: unknown } | undefined)?.status;

/** Parses a check's checksJson; never throws. */
export const parseChecks = (json: string | null | undefined): CheckEntry[] => {
  if (!json) return [];
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? (v as CheckEntry[]) : [];
  } catch {
    return [];
  }
};

export const {
  useGetCompletionOverviewQuery,
  useGetProjectCompletionQuery,
  useUpdateCompletionStateMutation,
  useOverrideGateMutation,
  useWaiveItemMutation,
  useRevokeExceptionMutation,
  useChaseItemNowMutation,
  useGetChaseTemplateQuery,
  useSaveChaseTemplateMutation,
  useDraftChaseTemplateMutation,
  useGetItemChecksQuery,
  useAcceptCheckMutation,
  useSendBackCheckMutation,
  useSetAttachmentReferenceMutation,
  useDownloadEvidencePackMutation,
  useSetUpFirstAgmMutation,
} = completionApi;
