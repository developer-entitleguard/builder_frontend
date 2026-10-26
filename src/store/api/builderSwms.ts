import { api } from './apiSlice';
import { getApiBaseUrl } from '@/lib/config';

/**
 * Templates/SWMS PRD SW10, SW12–SW14 (EG_Templates_SWMS_API.md "Builder").
 * The builder's SWMS register per project and the actions on a received SWMS.
 * Record fields are camelCase; the SWMS `content` itself is snake_case.
 */

export type SwmsDocumentStatus =
  | 'DRAFT'
  | 'ISSUED'
  | 'CHANGES_REQUESTED'
  | 'ACCEPTED'
  | 'UNDER_REVIEW'
  | 'CLOSED';

export type SwmsRegisterStatus = 'NOT_SUPPLIED' | 'REQUESTED' | Exclude<SwmsDocumentStatus, 'DRAFT'>;

export interface SwmsRegisterDocument {
  id: string;
  number: string;
  title: string;
  status: SwmsDocumentStatus;
  version: number;
  issuedVersion: number | null;
  issuedAt: string | null;
  workersSigned: number;
  libraryReference: string | null;
}

export interface SwmsRequestRecord {
  id: string;
  builderOrgId: string;
  projectId: string;
  tradeOrgId: string | null;
  tradeName: string | null;
  recipientEmail: string | null;
  note: string | null;
  status: 'OPEN' | 'FULFILLED' | 'CANCELLED';
  documentId: string | null;
  requestedBy: string | null;
  createdAt: string | null;
}

export interface SwmsRegisterRow {
  tradeOrgId: string | null;
  tradeName: string;
  jobTitles: string[];
  status: SwmsRegisterStatus;
  /** Issued documents only, newest first. */
  documents: SwmsRegisterDocument[];
  openRequest: SwmsRequestRecord | null;
}

export interface SwmsRegister {
  projectId: string;
  projectName: string;
  rows: SwmsRegisterRow[];
}

export interface CreateSwmsRequestBody {
  tradeOrgId?: string;
  email?: string;
  tradeName?: string;
  note?: string;
}

// ---- SWMS content (snake_case, see API doc "SWMS content") ----------------

export type RiskBand = 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';

export interface SwmsRating {
  likelihood: number;
  consequence: number;
  score?: number;
  band?: RiskBand;
}

export interface SwmsControl {
  id?: string;
  level: 'ELIMINATE' | 'SUBSTITUTE' | 'ISOLATE' | 'ENGINEERING' | 'ADMINISTRATIVE' | 'PPE';
  text: string;
}

export interface SwmsHazard {
  id?: string;
  description: string;
  initial?: SwmsRating;
  controls?: SwmsControl[];
  residual?: SwmsRating;
  responsible?: string;
}

export interface SwmsStep {
  id?: string;
  order?: number;
  task: string;
  tags?: string[];
  hazards?: SwmsHazard[];
}

export interface SwmsContact {
  name?: string;
  address?: string;
  phone?: string;
  distance_km?: number;
}

export interface SwmsContent {
  activity?: string;
  applies_to?: string;
  hrcw?: string[];
  plant?: string[];
  ppe?: string[];
  competencies?: string[];
  steps?: SwmsStep[];
  parties?: Record<string, string | null | undefined>;
  site_conditions?: {
    access_egress?: string;
    overhead_powerlines?: boolean;
    powerline_clearance_m?: number;
    underground_services?: string;
    ground_conditions?: string;
    other_trades?: string;
    public_traffic_interface?: string;
    building_year?: number;
    asbestos_flag?: boolean;
    asbestos_note?: string;
    weather?: string;
  };
  byda?: { enquiry_no?: string; date?: string; hand_located?: boolean };
  crew?: { crew_member_id?: string; name?: string; role?: string; phone?: string; tickets?: { type?: string; number?: string; expires_on?: string }[] }[];
  emergency?: {
    hospital?: SwmsContact;
    distributor?: SwmsContact;
    gas?: SwmsContact;
    water?: SwmsContact;
    regulator?: SwmsContact;
    emergency_number?: string;
    first_aider?: string;
    first_aider_phone?: string;
    assembly_point?: string;
  };
  hazard_check_only?: boolean;
}

export interface SwmsSignature {
  name: string;
  role: 'PREPARER' | 'AUTHORISER' | 'BUILDER' | 'WORKER';
  channel: 'APP' | 'SMS' | 'EMAIL';
  signedAt: string;
  version: number;
}

export interface SwmsVersion {
  version: number;
  id: string;
  issuedAt: string;
  reason: string | null;
  pdfFileId: string | null;
  signatures: SwmsSignature[];
}

export interface SwmsEvent {
  id: string;
  documentId: string;
  version: number | null;
  type: string;
  actor: string | null;
  actorName: string | null;
  note: string | null;
  at: string;
}

export interface SwmsDocumentView {
  id: string;
  number: string;
  title: string;
  status: SwmsDocumentStatus;
  version: number;
  issuedVersion: number | null;
  issuedAt: string | null;
  jobId: string | null;
  libraryReference: string | null;
  reviewerName: string | null;
  reviewedOn: string | null;
  builderOrgId: string | null;
  builderName: string | null;
  builderEmail: string | null;
  state: string | null;
  retainUntil: string | null;
  notifiableIncidentAt: string | null;
  editable: boolean;
  content: SwmsContent | null;
  versions: SwmsVersion[];
  events: SwmsEvent[];
  workersSignedCurrent: number;
}

export const builderSwmsApi = api.injectEndpoints({
  endpoints: (build) => ({
    getSwmsRegister: build.query<SwmsRegister, string>({
      query: (projectId) => ({ url: `/api/builder/projects/${projectId}/swms-register`, method: 'GET' }),
      providesTags: (_r, _e, projectId) => [{ type: 'SwmsRegister', id: projectId }],
    }),
    createSwmsRequest: build.mutation<SwmsRequestRecord, { projectId: string; body: CreateSwmsRequestBody }>({
      query: ({ projectId, body }) => ({
        url: `/api/builder/projects/${projectId}/swms-requests`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_r, _e, { projectId }) => [{ type: 'SwmsRegister', id: projectId }],
    }),
    getBuilderSwms: build.query<SwmsDocumentView, string>({
      query: (id) => ({ url: `/api/builder/swms/${id}`, method: 'GET' }),
      providesTags: (_r, _e, id) => [{ type: 'Swms', id }],
    }),
    // Actions refetch the document (GET returns the builder's issued-only view)
    // and every register, since the status chip there changes too.
    acceptSwms: build.mutation<unknown, string>({
      query: (id) => ({ url: `/api/builder/swms/${id}/accept`, method: 'POST' }),
      invalidatesTags: (_r, _e, id) => [{ type: 'Swms', id }, 'SwmsRegister'],
    }),
    requestSwmsChanges: build.mutation<unknown, { id: string; note: string }>({
      query: ({ id, note }) => ({ url: `/api/builder/swms/${id}/request-changes`, method: 'POST', body: { note } }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Swms', id }, 'SwmsRegister'],
    }),
    stopSwmsWork: build.mutation<unknown, { id: string; reason: string }>({
      query: ({ id, reason }) => ({ url: `/api/builder/swms/${id}/stop-work`, method: 'POST', body: { reason } }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Swms', id }, 'SwmsRegister'],
    }),
    markSwmsIncident: build.mutation<unknown, { id: string; at?: string; note: string }>({
      query: ({ id, at, note }) => ({ url: `/api/builder/swms/${id}/incident`, method: 'POST', body: { at, note } }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Swms', id }, 'SwmsRegister'],
    }),
  }),
});

export const {
  useGetSwmsRegisterQuery,
  useCreateSwmsRequestMutation,
  useGetBuilderSwmsQuery,
  useAcceptSwmsMutation,
  useRequestSwmsChangesMutation,
  useStopSwmsWorkMutation,
  useMarkSwmsIncidentMutation,
} = builderSwmsApi;

const authHeader = (): Record<string, string> => {
  try {
    const raw = localStorage.getItem('userData');
    const jwt = raw ? (JSON.parse(raw)?.jwt as string | undefined) : undefined;
    return jwt ? { Authorization: `Bearer ${jwt}` } : {};
  } catch {
    return {};
  }
};

/** Downloads the PDF of an issued version (current issued when omitted). */
export async function downloadSwmsPdf(id: string, number: string, version?: number): Promise<void> {
  const qs = version != null ? `?version=${version}` : '';
  const res = await fetch(`${getApiBaseUrl()}/api/builder/swms/${id}/pdf${qs}`, { headers: authHeader() });
  if (!res.ok) {
    let message = `Could not download the PDF (HTTP ${res.status}).`;
    try {
      const data = (await res.json()) as { message?: string };
      if (data?.message) message = data.message;
    } catch {
      /* non-JSON body */
    }
    throw new Error(message);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${number || 'swms'}${version != null ? `-v${version}` : ''}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** `{status, message}` from ResponseStatusException, else a fallback. */
export function swmsErrorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const e = err as { data?: { message?: string; error?: string } | string; message?: string } | undefined;
  if (typeof e?.data === 'string' && e.data) return e.data;
  if (e?.data && typeof e.data === 'object') {
    if (e.data.message) return e.data.message;
    if (e.data.error) return e.data.error;
  }
  if (e?.message) return e.message;
  return fallback;
}
