import { api } from './apiSlice';
import { getApiBaseUrl } from '@/lib/config';

/**
 * Past Homes (Revenue Capabilities Track B, PH1 to PH12). Builder Admin only,
 * PAST_HOMES module. Mirrors PastHomesController / PastHomeImportService on the
 * backend. Responses are plain JSON (no DefaultListResponse envelope); errors
 * carry a `message` (server.error.include-message=always).
 */

export type PastHomeRowStatus = 'PROPOSED' | 'CONFIRMED' | 'MERGED' | 'SKIPPED' | 'ERROR';

export type PastHomeActivationState =
  | 'NOT_INVITED'
  | 'NO_CONTACT'
  | 'INVITED'
  | 'REMINDED'
  | 'ACTIVATED'
  | 'NOT_OWNER'
  | 'OWNER_CHANGED'
  | 'ALREADY_ON_RECORD';

export type CoverPositionValue = 'IN_STATUTORY' | 'IN_OUTER_LIMIT_ONLY' | 'PAST_BOTH' | 'UNCLEAR';

export type PastHomeFileStatus = 'STORED' | 'PROPOSED' | 'NO_PROPOSAL';

export interface PastHomeBatch {
  id: string;
  fileName: string | null;
  status: 'OPEN' | 'ROLLED_BACK' | string;
  contactConfirmedAt: string | null;
  contactConfirmedBy: string | null;
  contactBasis: string | null;
  /** JSON string: {"PROPOSED": n, "activation:INVITED": n, ...}. */
  countsJson: string | null;
  createdAt: string | null;
  updatedAt?: string | null;
}

/** claimTokenHash is also sent by the backend; it is deliberately not typed and never shown. */
export interface PastHomeRow {
  id: string;
  batchId: string;
  rowNumber: number;
  status: PastHomeRowStatus;
  error: string | null;
  registrationId: string | null;
  duplicateOfRegistrationId: string | null;
  address: string | null;
  unitNumber: string | null;
  suburb: string | null;
  state: string | null;
  postcode: string | null;
  propertyType: string | null;
  completionDate: string | null;
  contractDate: string | null;
  ocDate: string | null;
  planName: string | null;
  projectReference: string | null;
  ownerFirstName: string | null;
  ownerLastName: string | null;
  ownerEmail: string | null;
  ownerPhone: string | null;
  ownerChanged: boolean | null;
  activationState: PastHomeActivationState | null;
  invitedAt: string | null;
  remindedAt: string | null;
  activatedAt: string | null;
  notOwnerAt: string | null;
  confirmedJson: string | null;
}

export interface ClassPosition {
  defectClass: string;
  position: CoverPositionValue;
  periodEnds: string | null;
  outerLimitEnds: string | null;
  citation: string | null;
}

export interface PastHomeFile {
  id: string;
  batchId?: string;
  rowId: string | null;
  fileId: string;
  fileName: string | null;
  route: 'TEXT_PDF' | 'IMAGE_PDF' | 'OTHER' | string | null;
  documentClass: string | null;
  classConfidence: number | null;
  /** JSON string, see {@link Proposals}. */
  proposalsJson: string | null;
  status: PastHomeFileStatus;
  createdAt?: string | null;
}

export interface RowView {
  row: PastHomeRow;
  coverPosition: ClassPosition[];
  files: PastHomeFile[];
}

export interface BatchView {
  batch: PastHomeBatch;
  rows: RowView[];
  unassignedFiles: PastHomeFile[];
}

export interface ProposalField {
  name: string;
  value: string | number | null;
  confidence: number | null;
  source_page: number | null;
}

export interface Proposals {
  home: ProposalField[];
  items: { fields: ProposalField[] }[];
}

export interface Source {
  fileId: string;
  page: number | null;
}

export interface ConfirmItem {
  product: string | null;
  brand: string | null;
  model: string | null;
  serial: string | null;
  tradeName: string | null;
  licenceNumber: string | null;
  source: Source | null;
}

export interface ConfirmInput {
  address?: string | null;
  unitNumber?: string | null;
  suburb?: string | null;
  state?: string | null;
  postcode?: string | null;
  propertyType?: string | null;
  completionDate?: string | null;
  contractDate?: string | null;
  ocDate?: string | null;
  planName?: string | null;
  projectReference?: string | null;
  ownerFirstName?: string | null;
  ownerLastName?: string | null;
  ownerEmail?: string | null;
  ownerPhone?: string | null;
  ownerChanged?: boolean | null;
  items: ConfirmItem[];
  sources: Record<string, Source>;
  duplicateAction: null | 'MERGE' | 'SKIP';
}

export interface InviteResult {
  queued: number;
  noContact: number;
  ownerChanged: number;
  notReady: number;
  alreadyInvited: number;
}

const BASE = '/api/builder/onboarding/past-homes';

const batchTags = (batchId: string) => [
  { type: 'PastHomes' as const, id: batchId },
  { type: 'PastHomes' as const, id: 'LIST' },
];

export const pastHomesApi = api.injectEndpoints({
  endpoints: (build) => ({
    listPastHomeBatches: build.query<PastHomeBatch[], void>({
      query: () => ({ url: `${BASE}/batches`, method: 'GET' }),
      providesTags: [{ type: 'PastHomes', id: 'LIST' }],
    }),

    getPastHomeBatch: build.query<BatchView, { batchId: string }>({
      query: ({ batchId }) => ({ url: `${BASE}/batches/${batchId}`, method: 'GET' }),
      providesTags: (_r, _e, arg) => [{ type: 'PastHomes', id: arg.batchId }],
    }),

    importPastHomes: build.mutation<PastHomeBatch, { file: File }>({
      query: ({ file }) => {
        const form = new FormData();
        form.append('file', file);
        return { url: `${BASE}/batches`, method: 'POST', body: form };
      },
      invalidatesTags: [{ type: 'PastHomes', id: 'LIST' }],
    }),

    uploadPastHomeFiles: build.mutation<
      PastHomeFile[],
      { batchId: string; rowId?: string | null; files: File[] }
    >({
      query: ({ batchId, rowId, files }) => {
        const form = new FormData();
        files.forEach((f) => form.append('files', f));
        if (rowId) form.append('rowId', rowId);
        return { url: `${BASE}/batches/${batchId}/files`, method: 'POST', body: form };
      },
      invalidatesTags: (_r, _e, arg) => [{ type: 'PastHomes', id: arg.batchId }],
    }),

    assignPastHomeFile: build.mutation<
      PastHomeFile,
      { batchId: string; fileId: string; rowId: string | null }
    >({
      query: ({ batchId, fileId, rowId }) => ({
        url: `${BASE}/batches/${batchId}/files/${fileId}/assign`,
        method: 'POST',
        body: { rowId },
      }),
      invalidatesTags: (_r, _e, arg) => [{ type: 'PastHomes', id: arg.batchId }],
    }),

    confirmPastHomeRow: build.mutation<
      PastHomeRow,
      { batchId: string; rowId: string; input: ConfirmInput }
    >({
      query: ({ batchId, rowId, input }) => ({
        url: `${BASE}/batches/${batchId}/rows/${rowId}/confirm`,
        method: 'POST',
        body: input,
      }),
      invalidatesTags: (_r, _e, arg) => batchTags(arg.batchId),
    }),

    skipPastHomeRow: build.mutation<PastHomeRow, { batchId: string; rowId: string }>({
      query: ({ batchId, rowId }) => ({
        url: `${BASE}/batches/${batchId}/rows/${rowId}/skip`,
        method: 'POST',
      }),
      invalidatesTags: (_r, _e, arg) => batchTags(arg.batchId),
    }),

    markPastHomeOwnerChanged: build.mutation<PastHomeRow, { batchId: string; rowId: string }>({
      query: ({ batchId, rowId }) => ({
        url: `${BASE}/batches/${batchId}/rows/${rowId}/owner-changed`,
        method: 'POST',
      }),
      invalidatesTags: (_r, _e, arg) => batchTags(arg.batchId),
    }),

    rollbackPastHomeBatch: build.mutation<PastHomeBatch, { batchId: string }>({
      query: ({ batchId }) => ({ url: `${BASE}/batches/${batchId}/rollback`, method: 'POST' }),
      invalidatesTags: (_r, _e, arg) => [...batchTags(arg.batchId), 'Registration', 'BuilderCustomer'],
    }),

    confirmPastHomeContact: build.mutation<PastHomeBatch, { batchId: string; basis: string }>({
      query: ({ batchId, basis }) => ({
        url: `${BASE}/batches/${batchId}/contact-confirmation`,
        method: 'POST',
        body: { basis },
      }),
      invalidatesTags: (_r, _e, arg) => batchTags(arg.batchId),
    }),

    /**
     * Fetches a handover file's bytes through the shared base query (auth +
     * refresh) and returns a blob object URL. The caller revokes it. Returning
     * a string keeps the non-serialisable Blob out of the store.
     */
    openPastHomeFile: build.mutation<string, { batchId: string; id: string }>({
      queryFn: async ({ batchId, id }, _api, _extra, baseQuery) => {
        const res = await baseQuery({
          url: `${BASE}/batches/${batchId}/files/${id}/content`,
          method: 'GET',
          headers: { Accept: '*/*' },
          responseHandler: (r) => r.blob(),
        });
        if (res.error) return { error: res.error };
        return { data: URL.createObjectURL(res.data as Blob) };
      },
    }),

    sendPastHomeInvitations: build.mutation<InviteResult, { batchId: string }>({
      query: ({ batchId }) => ({ url: `${BASE}/batches/${batchId}/invitations`, method: 'POST' }),
      invalidatesTags: (_r, _e, arg) => batchTags(arg.batchId),
    }),
  }),
});

const readJwt = (): string | undefined => {
  try {
    const raw = localStorage.getItem('userData');
    if (!raw) return undefined;
    return JSON.parse(raw)?.jwt;
  } catch {
    return undefined;
  }
};

/** Downloads the Past Homes CSV template. */
export const downloadPastHomesTemplate = async (): Promise<void> => {
  const jwt = readJwt();
  const res = await fetch(`${getApiBaseUrl()}${BASE}/template`, {
    method: 'GET',
    headers: jwt ? { Authorization: `Bearer ${jwt}` } : undefined,
  });
  if (!res.ok) {
    throw new Error(`Could not download the template (${res.status})`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'past-homes-template.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/** Pulls the backend's `message` out of an RTK Query error. */
export const pastHomesErrorMessage = (err: unknown, fallback = 'Something went wrong'): string => {
  const e = err as { status?: unknown; data?: unknown; error?: string } | undefined;
  if (!e) return fallback;
  if (e.data && typeof e.data === 'object' && 'message' in e.data) {
    const m = (e.data as { message?: unknown }).message;
    if (typeof m === 'string' && m.trim()) return m;
  }
  if (typeof e.data === 'string' && e.data.trim()) return e.data;
  if (e.status === 403) return 'You do not have access to Past Homes. It needs the Past Homes module and the Administrator role.';
  return e.error ?? fallback;
};

export const errorStatus = (err: unknown): unknown => (err as { status?: unknown } | undefined)?.status;

export const {
  useListPastHomeBatchesQuery,
  useGetPastHomeBatchQuery,
  useImportPastHomesMutation,
  useUploadPastHomeFilesMutation,
  useAssignPastHomeFileMutation,
  useConfirmPastHomeRowMutation,
  useSkipPastHomeRowMutation,
  useMarkPastHomeOwnerChangedMutation,
  useRollbackPastHomeBatchMutation,
  useConfirmPastHomeContactMutation,
  useSendPastHomeInvitationsMutation,
  useOpenPastHomeFileMutation,
} = pastHomesApi;
