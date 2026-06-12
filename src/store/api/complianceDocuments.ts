import { getApiBaseUrl } from "@/lib/config";
import { api } from "./apiSlice";

export interface ComplianceDocumentApi {
  id: string;
  projectId?: string | null;
  registrationId?: string | null;
  category: string | null;
  /** Phase C: canonical JobCategory.code this line maps to (null when unmapped). */
  categoryCode?: string | null;
  documentName: string;
  description: string | null;
  scope: string | null;
  mandatory: string | null;
  issuer: string | null;
  appliesTo: string | null;
  status: string | null;
  source: string | null;
  /** Developer/Builder Decoupling: DEVELOPER | BUILDER | TRADE. */
  responsibleParty?: string | null;
  /** Developer/Builder Decoupling: compliance jurisdiction (NSW for now). */
  jurisdiction?: string | null;
  notes: string | null;
  orderIndex: number | null;
  isActive?: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ComplianceCompleteness {
  total: number;
  required: number;
  requiredReceived: number;
  outstandingRequired: number;
  received: number;
  completenessPercent: number;
  readyForHandover: boolean;
}

export interface ComplianceAttachmentApi {
  id: string;
  ownerType: string;
  ownerId: string;
  fileId: string | null;
  fileName: string | null;
  fileType: string | null;
  externalUrl: string | null;
  notes: string | null;
  version: number;
  isCurrent: boolean;
  uploadedBy: string | null;
  createdAt: string | null;
}

export interface RegistrationComplianceView {
  registrationId: string;
  projectId: string | null;
  projectDocuments: ComplianceDocumentApi[];
  registrationDocuments: ComplianceDocumentApi[];
  completeness: ComplianceCompleteness;
}

/**
 * Trade/auditor compliance certificate produced against a job tied to this
 * registration (PRD Phase 4 linkage). Informational — surfaced in the handover
 * pack but does NOT affect the {@link HandoverReadiness.blocked} gate.
 */
export interface TradeCertificateApi {
  id: string;
  jobId: string | null;
  jobTitle: string | null;
  name: string | null;
  certificateType: string | null;
  issuer: string | null;
  status: string | null;
  notes: string | null;
  fileId: string | null;
  externalUrl: string | null;
  downloadType: "file" | "link" | null;
  signed: boolean;
  createdAt: string | null;
  sentToCustomerAt: string | null;
}

export interface HandoverReadiness {
  registrationId: string;
  completeness: ComplianceCompleteness;
  outstandingDocuments: string[];
  acknowledged: boolean;
  blocked: boolean;
  tradeCertificates?: TradeCertificateApi[];
}

/** Lightweight dwelling picker option for the job → registration linker. */
export interface RegistrationOption {
  id: string;
  name: string;
  address: string;
}

export interface HandoverAcknowledgementApi {
  id: string;
  acknowledgedBy: string | null;
  note: string | null;
  outstandingRequired: number | null;
  createdAt: string | null;
}

export interface ComplianceDocumentBody {
  category?: string | null;
  categoryCode?: string | null;
  documentName: string;
  description?: string | null;
  scope?: string | null;
  mandatory?: string | null;
  issuer?: string | null;
  appliesTo?: string | null;
  status?: string | null;
  notes?: string | null;
  orderIndex?: number | null;
}

/**
 * Phase A assignment request. Tri-modal assignee mirroring the builder job
 * contract; in the builder UI we collect an off-platform contact (name + email)
 * which drives the viral invite loop, but the shape supports org/internal too.
 */
export interface ComplianceAssignBody {
  assigneeName?: string | null;
  assigneeEmail?: string | null;
  assigneeOrgType?: string | null;
  assigneeOrgId?: string | null;
  assigneeUserId?: string | null;
}

/** Phase C: canonical EG-curated job/trade category for the mapping pickers. */
export interface JobCategoryApi {
  id: string;
  code: string;
  label: string;
  description?: string | null;
  enabled: boolean;
  displayOrder: number;
}

interface DefaultListResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

type ListResponse<T> = DefaultListResponse<T>;

// AI generation: array on success, marker object on soft failure, null on error.
export type GenerateComplianceResponse = DefaultListResponse<
  ComplianceDocumentApi[] | { reason?: string } | null
>;

const jwtFromStorage = (): string | undefined => {
  try {
    const userData = localStorage.getItem("userData");
    return userData ? JSON.parse(userData)?.jwt : undefined;
  } catch {
    return undefined;
  }
};

export const complianceDocumentsApi = api.injectEndpoints({
  endpoints: (build) => ({
    // ----- Project-level -----

    // GET /api/builder/projects/:projectId/compliance-documents
    getProjectComplianceDocuments: build.query<
      ListResponse<ComplianceDocumentApi[]>,
      { projectId: string }
    >({
      query: ({ projectId }) => ({
        url: `/api/builder/projects/${projectId}/compliance-documents`,
        method: "GET",
      }),
      providesTags: (_r, _e, { projectId }) => [
        { type: "ComplianceDocuments", id: `project-${projectId}` },
      ],
    }),

    // GET /api/builder/projects/:projectId/compliance-documents/completeness
    getProjectComplianceCompleteness: build.query<
      ListResponse<ComplianceCompleteness>,
      { projectId: string }
    >({
      query: ({ projectId }) => ({
        url: `/api/builder/projects/${projectId}/compliance-documents/completeness`,
        method: "GET",
      }),
      providesTags: (_r, _e, { projectId }) => [
        { type: "ComplianceDocuments", id: `project-completeness-${projectId}` },
      ],
    }),

    // POST /api/builder/projects/:projectId/compliance-documents/generate
    generateProjectComplianceDocuments: build.mutation<
      GenerateComplianceResponse,
      {
        projectId: string;
        prompt?: string;
        // Feature flags that gate conditional certificates (gas, HVAC, pool, lift, strata).
        hasGas?: boolean;
        hasDuctedHvac?: boolean;
        hasPool?: boolean;
        hasLift?: boolean;
        isStrata?: boolean;
        storeys?: number;
      }
    >({
      query: ({ projectId, ...body }) => ({
        url: `/api/builder/projects/${projectId}/compliance-documents/generate`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_r, _e, { projectId }) => [
        { type: "ComplianceDocuments", id: `project-${projectId}` },
        { type: "ComplianceDocuments", id: `project-completeness-${projectId}` },
      ],
    }),

    // POST /api/builder/projects/:projectId/compliance-documents
    createProjectComplianceDocument: build.mutation<
      ListResponse<ComplianceDocumentApi>,
      { projectId: string; body: ComplianceDocumentBody }
    >({
      query: ({ projectId, body }) => ({
        url: `/api/builder/projects/${projectId}/compliance-documents`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_r, _e, { projectId }) => [
        { type: "ComplianceDocuments", id: `project-${projectId}` },
        { type: "ComplianceDocuments", id: `project-completeness-${projectId}` },
      ],
    }),

    // PUT /api/builder/projects/:projectId/compliance-documents/:id
    updateProjectComplianceDocument: build.mutation<
      ListResponse<ComplianceDocumentApi>,
      { projectId: string; id: string; body: ComplianceDocumentBody }
    >({
      query: ({ projectId, id, body }) => ({
        url: `/api/builder/projects/${projectId}/compliance-documents/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_r, _e, { projectId }) => [
        { type: "ComplianceDocuments", id: `project-${projectId}` },
        { type: "ComplianceDocuments", id: `project-completeness-${projectId}` },
      ],
    }),

    // DELETE /api/builder/projects/:projectId/compliance-documents/:id
    deleteProjectComplianceDocument: build.mutation<
      ListResponse<unknown>,
      { projectId: string; id: string }
    >({
      query: ({ projectId, id }) => ({
        url: `/api/builder/projects/${projectId}/compliance-documents/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (_r, _e, { projectId }) => [
        { type: "ComplianceDocuments", id: `project-${projectId}` },
        { type: "ComplianceDocuments", id: `project-completeness-${projectId}` },
      ],
    }),

    // POST /api/builder/projects/:projectId/compliance-documents/reset
    resetProjectComplianceDocuments: build.mutation<
      ListResponse<unknown>,
      { projectId: string }
    >({
      query: ({ projectId }) => ({
        url: `/api/builder/projects/${projectId}/compliance-documents/reset`,
        method: "POST",
      }),
      invalidatesTags: (_r, _e, { projectId }) => [
        { type: "ComplianceDocuments", id: `project-${projectId}` },
        { type: "ComplianceDocuments", id: `project-completeness-${projectId}` },
      ],
    }),

    // ----- Registration-level -----

    // GET /api/builder/registrations/:registrationId/compliance-documents (combined view)
    getRegistrationComplianceView: build.query<
      ListResponse<RegistrationComplianceView>,
      { registrationId: string }
    >({
      query: ({ registrationId }) => ({
        url: `/api/builder/registrations/${registrationId}/compliance-documents`,
        method: "GET",
      }),
      providesTags: (_r, _e, { registrationId }) => [
        { type: "ComplianceDocuments", id: `registration-${registrationId}` },
      ],
    }),

    // POST /api/builder/registrations/:registrationId/compliance-documents/generate
    generateRegistrationComplianceDocuments: build.mutation<
      GenerateComplianceResponse,
      { registrationId: string; prompt?: string }
    >({
      query: ({ registrationId, prompt }) => ({
        url: `/api/builder/registrations/${registrationId}/compliance-documents/generate`,
        method: "POST",
        body: prompt ? { prompt } : {},
      }),
      invalidatesTags: (_r, _e, { registrationId }) => [
        { type: "ComplianceDocuments", id: `registration-${registrationId}` },
        { type: "HandoverReadiness", id: registrationId },
      ],
    }),

    // POST /api/builder/registrations/:registrationId/compliance-documents
    createRegistrationComplianceDocument: build.mutation<
      ListResponse<ComplianceDocumentApi>,
      { registrationId: string; body: ComplianceDocumentBody }
    >({
      query: ({ registrationId, body }) => ({
        url: `/api/builder/registrations/${registrationId}/compliance-documents`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_r, _e, { registrationId }) => [
        { type: "ComplianceDocuments", id: `registration-${registrationId}` },
        { type: "HandoverReadiness", id: registrationId },
      ],
    }),

    // PUT /api/builder/registrations/:registrationId/compliance-documents/:id
    updateRegistrationComplianceDocument: build.mutation<
      ListResponse<ComplianceDocumentApi>,
      { registrationId: string; id: string; body: ComplianceDocumentBody }
    >({
      query: ({ registrationId, id, body }) => ({
        url: `/api/builder/registrations/${registrationId}/compliance-documents/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_r, _e, { registrationId }) => [
        { type: "ComplianceDocuments", id: `registration-${registrationId}` },
        { type: "HandoverReadiness", id: registrationId },
      ],
    }),

    // DELETE /api/builder/registrations/:registrationId/compliance-documents/:id
    deleteRegistrationComplianceDocument: build.mutation<
      ListResponse<unknown>,
      { registrationId: string; id: string }
    >({
      query: ({ registrationId, id }) => ({
        url: `/api/builder/registrations/${registrationId}/compliance-documents/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (_r, _e, { registrationId }) => [
        { type: "ComplianceDocuments", id: `registration-${registrationId}` },
        { type: "HandoverReadiness", id: registrationId },
      ],
    }),

    // POST /api/builder/projects/:projectId/compliance-documents/:id/assign
    assignProjectComplianceDocument: build.mutation<
      ListResponse<unknown>,
      { projectId: string; id: string; body: ComplianceAssignBody }
    >({
      query: ({ projectId, id, body }) => ({
        url: `/api/builder/projects/${projectId}/compliance-documents/${id}/assign`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_r, _e, { projectId }) => [
        { type: "ComplianceDocuments", id: `project-${projectId}` },
        { type: "ComplianceDocuments", id: `project-completeness-${projectId}` },
      ],
    }),

    // POST /api/builder/registrations/:registrationId/compliance-documents/:id/assign
    assignRegistrationComplianceDocument: build.mutation<
      ListResponse<unknown>,
      { registrationId: string; id: string; body: ComplianceAssignBody }
    >({
      query: ({ registrationId, id, body }) => ({
        url: `/api/builder/registrations/${registrationId}/compliance-documents/${id}/assign`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_r, _e, { registrationId }) => [
        { type: "ComplianceDocuments", id: `registration-${registrationId}` },
        { type: "HandoverReadiness", id: registrationId },
      ],
    }),

    // GET /api/builder/job-categories (canonical taxonomy for mapping pickers)
    getJobCategories: build.query<JobCategoryApi[], void>({
      query: () => ({ url: `/api/builder/job-categories`, method: "GET" }),
      providesTags: [{ type: "ComplianceDocuments", id: "job-categories" }],
    }),

    // ----- Attachments (shared shape; ownerType drives the path) -----

    // GET attachments for a project or registration document
    getComplianceAttachments: build.query<
      ListResponse<ComplianceAttachmentApi[]>,
      { ownerType: "PROJECT" | "REGISTRATION"; ownerId: string; documentId: string }
    >({
      query: ({ ownerType, ownerId, documentId }) => ({
        url:
          ownerType === "PROJECT"
            ? `/api/builder/projects/${ownerId}/compliance-documents/${documentId}/attachments`
            : `/api/builder/registrations/${ownerId}/compliance-documents/${documentId}/attachments`,
        method: "GET",
      }),
      providesTags: (_r, _e, { documentId }) => [
        { type: "ComplianceAttachments", id: documentId },
      ],
    }),

    // POST a file attachment (multipart) for a project or registration document
    uploadComplianceAttachment: build.mutation<
      ListResponse<ComplianceAttachmentApi[]>,
      {
        ownerType: "PROJECT" | "REGISTRATION";
        ownerId: string;
        documentId: string;
        file: File;
        notes?: string;
      }
    >({
      queryFn: async ({ ownerType, ownerId, documentId, file, notes }) => {
        try {
          const form = new FormData();
          form.append("file", file);
          if (notes && notes.trim()) {
            form.append("notes", notes.trim());
          }
          const jwt = jwtFromStorage();
          const path =
            ownerType === "PROJECT"
              ? `/api/builder/projects/${ownerId}/compliance-documents/${documentId}/attachments`
              : `/api/builder/registrations/${ownerId}/compliance-documents/${documentId}/attachments`;
          const res = await fetch(`${getApiBaseUrl()}${path}`, {
            method: "POST",
            headers: jwt ? { Authorization: `Bearer ${jwt}` } : undefined,
            body: form,
          });
          if (!res.ok) {
            const text = await res.text();
            return { error: { status: res.status, data: text } } as {
              error: { status: number; data: string };
            };
          }
          const data = (await res.json()) as ListResponse<ComplianceAttachmentApi[]>;
          return { data };
        } catch (e) {
          return {
            error: {
              status: "CUSTOM_ERROR",
              error: e instanceof Error ? e.message : "Unknown",
            },
          } as { error: { status: "CUSTOM_ERROR"; error: string } };
        }
      },
      invalidatesTags: (_r, _e, { ownerType, ownerId, documentId }) => [
        { type: "ComplianceAttachments", id: documentId },
        ownerType === "PROJECT"
          ? { type: "ComplianceDocuments" as const, id: `project-${ownerId}` }
          : { type: "ComplianceDocuments" as const, id: `registration-${ownerId}` },
        ...(ownerType === "REGISTRATION"
          ? [{ type: "HandoverReadiness" as const, id: ownerId }]
          : []),
      ],
    }),

    // D3: the distinct per-unit (registration-scope) document TYPES across a project.
    getProjectRegistrationDocTypes: build.query<
      {
        success: boolean;
        message: string;
        data: Array<{
          documentName: string;
          category: string | null;
          responsibleParty: string | null;
          mandatory: string | null;
          unitsTotal: number;
          unitsReceived: number;
        }>;
      },
      string
    >({
      query: (projectId) => ({
        url: `/api/builder/projects/${projectId}/compliance-documents/registration-types`,
        method: "GET",
      }),
      providesTags: (_r, _e, projectId) => [
        { type: "ComplianceDocuments" as const, id: `registration-types-${projectId}` },
      ],
    }),

    // D3: upload a per-unit document against a chosen registration (find/create by name).
    attachComplianceByName: build.mutation<
      ListResponse<ComplianceDocumentApi>,
      { registrationId: string; documentName: string; category?: string | null; file: File; projectId: string }
    >({
      queryFn: async ({ registrationId, documentName, category, file }) => {
        try {
          const form = new FormData();
          form.append("file", file);
          form.append("documentName", documentName);
          if (category) form.append("category", category);
          const jwt = jwtFromStorage();
          const path = `/api/builder/registrations/${registrationId}/compliance-documents/attach-by-name`;
          const res = await fetch(`${getApiBaseUrl()}${path}`, {
            method: "POST",
            headers: jwt ? { Authorization: `Bearer ${jwt}` } : undefined,
            body: form,
          });
          if (!res.ok) {
            const text = await res.text();
            return { error: { status: res.status, data: text } } as {
              error: { status: number; data: string };
            };
          }
          const data = (await res.json()) as ListResponse<ComplianceDocumentApi>;
          return { data };
        } catch (e) {
          return {
            error: { status: "CUSTOM_ERROR", error: e instanceof Error ? e.message : "Unknown" },
          } as { error: { status: "CUSTOM_ERROR"; error: string } };
        }
      },
      invalidatesTags: (_r, _e, { projectId }) => [
        { type: "ComplianceDocuments" as const, id: `registration-types-${projectId}` },
      ],
    }),

    // Developer/Builder Decoupling PRD (Req 11). Bulk per-unit document intake:
    // POST several files at once; each is best-effort matched to a checklist line.
    bulkAttachRegistrationFiles: build.mutation<
      ListResponse<{ matched: unknown[]; unmatched: string[] }>,
      { registrationId: string; files: File[] }
    >({
      queryFn: async ({ registrationId, files }) => {
        try {
          const form = new FormData();
          files.forEach((f) => form.append("files", f));
          const jwt = jwtFromStorage();
          const path = `/api/builder/registrations/${registrationId}/compliance-documents/bulk-attach`;
          const res = await fetch(`${getApiBaseUrl()}${path}`, {
            method: "POST",
            headers: jwt ? { Authorization: `Bearer ${jwt}` } : undefined,
            body: form,
          });
          if (!res.ok) {
            const text = await res.text();
            return { error: { status: res.status, data: text } } as {
              error: { status: number; data: string };
            };
          }
          const data = (await res.json()) as ListResponse<{ matched: unknown[]; unmatched: string[] }>;
          return { data };
        } catch (e) {
          return {
            error: {
              status: "CUSTOM_ERROR",
              error: e instanceof Error ? e.message : "Unknown",
            },
          } as { error: { status: "CUSTOM_ERROR"; error: string } };
        }
      },
      invalidatesTags: (_r, _e, { registrationId }) => [
        { type: "ComplianceDocuments" as const, id: `registration-${registrationId}` },
        { type: "HandoverReadiness" as const, id: registrationId },
      ],
    }),

    // POST a link attachment for a project or registration document
    linkComplianceAttachment: build.mutation<
      ListResponse<ComplianceAttachmentApi[]>,
      {
        ownerType: "PROJECT" | "REGISTRATION";
        ownerId: string;
        documentId: string;
        externalUrl: string;
        notes?: string;
      }
    >({
      query: ({ ownerType, ownerId, documentId, externalUrl, notes }) => ({
        url:
          ownerType === "PROJECT"
            ? `/api/builder/projects/${ownerId}/compliance-documents/${documentId}/attachments/link`
            : `/api/builder/registrations/${ownerId}/compliance-documents/${documentId}/attachments/link`,
        method: "POST",
        body: { externalUrl, notes },
      }),
      invalidatesTags: (_r, _e, { ownerType, ownerId, documentId }) => [
        { type: "ComplianceAttachments", id: documentId },
        ownerType === "PROJECT"
          ? { type: "ComplianceDocuments" as const, id: `project-${ownerId}` }
          : { type: "ComplianceDocuments" as const, id: `registration-${ownerId}` },
        ...(ownerType === "REGISTRATION"
          ? [{ type: "HandoverReadiness" as const, id: ownerId }]
          : []),
      ],
    }),

    // DELETE an attachment for a project or registration document
    deleteComplianceAttachment: build.mutation<
      ListResponse<unknown>,
      {
        ownerType: "PROJECT" | "REGISTRATION";
        ownerId: string;
        documentId: string;
        attachmentId: string;
      }
    >({
      query: ({ ownerType, ownerId, documentId, attachmentId }) => ({
        url:
          ownerType === "PROJECT"
            ? `/api/builder/projects/${ownerId}/compliance-documents/${documentId}/attachments/${attachmentId}`
            : `/api/builder/registrations/${ownerId}/compliance-documents/${documentId}/attachments/${attachmentId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_r, _e, { ownerType, ownerId, documentId }) => [
        { type: "ComplianceAttachments", id: documentId },
        ownerType === "PROJECT"
          ? { type: "ComplianceDocuments" as const, id: `project-${ownerId}` }
          : { type: "ComplianceDocuments" as const, id: `registration-${ownerId}` },
        ...(ownerType === "REGISTRATION"
          ? [{ type: "HandoverReadiness" as const, id: ownerId }]
          : []),
      ],
    }),

    // ----- Handover gating -----

    // GET /api/builder/registrations/:registrationId/handover-readiness
    getHandoverReadiness: build.query<
      ListResponse<HandoverReadiness>,
      { registrationId: string }
    >({
      query: ({ registrationId }) => ({
        url: `/api/builder/registrations/${registrationId}/handover-readiness`,
        method: "GET",
      }),
      providesTags: (_r, _e, { registrationId }) => [
        { type: "HandoverReadiness", id: registrationId },
      ],
    }),

    // POST /api/builder/registrations/:registrationId/handover-acknowledgement
    acknowledgeHandover: build.mutation<
      ListResponse<HandoverReadiness>,
      { registrationId: string; note?: string }
    >({
      query: ({ registrationId, note }) => ({
        url: `/api/builder/registrations/${registrationId}/handover-acknowledgement`,
        method: "POST",
        body: { note: note ?? null },
      }),
      invalidatesTags: (_r, _e, { registrationId }) => [
        { type: "HandoverReadiness", id: registrationId },
        { type: "ComplianceDocuments", id: `registration-${registrationId}` },
      ],
    }),

    // GET /api/builder/registrations/:registrationId/handover-acknowledgements
    listHandoverAcknowledgements: build.query<
      ListResponse<HandoverAcknowledgementApi[]>,
      { registrationId: string }
    >({
      query: ({ registrationId }) => ({
        url: `/api/builder/registrations/${registrationId}/handover-acknowledgements`,
        method: "GET",
      }),
      providesTags: (_r, _e, { registrationId }) => [
        { type: "HandoverReadiness", id: `acks-${registrationId}` },
      ],
    }),

    // ----- Trade certificate linkage (PRD Phase 4, informational) -----

    // GET /api/builder/registrations/:registrationId/trade-certificates
    getRegistrationTradeCertificates: build.query<
      ListResponse<TradeCertificateApi[]>,
      { registrationId: string }
    >({
      query: ({ registrationId }) => ({
        url: `/api/builder/registrations/${registrationId}/trade-certificates`,
        method: "GET",
      }),
      providesTags: (_r, _e, { registrationId }) => [
        { type: "HandoverReadiness", id: `trade-certs-${registrationId}` },
      ],
    }),

    // GET /api/builder/registrations/options
    listRegistrationOptions: build.query<ListResponse<RegistrationOption[]>, void>({
      query: () => ({
        url: `/api/builder/registrations/options`,
        method: "GET",
      }),
      providesTags: [{ type: "Registration", id: "options" }],
    }),
  }),
});

export const {
  useGetProjectComplianceDocumentsQuery,
  useGetProjectComplianceCompletenessQuery,
  useGenerateProjectComplianceDocumentsMutation,
  useCreateProjectComplianceDocumentMutation,
  useUpdateProjectComplianceDocumentMutation,
  useDeleteProjectComplianceDocumentMutation,
  useResetProjectComplianceDocumentsMutation,
  useGetRegistrationComplianceViewQuery,
  useGenerateRegistrationComplianceDocumentsMutation,
  useCreateRegistrationComplianceDocumentMutation,
  useUpdateRegistrationComplianceDocumentMutation,
  useDeleteRegistrationComplianceDocumentMutation,
  useGetComplianceAttachmentsQuery,
  useUploadComplianceAttachmentMutation,
  useBulkAttachRegistrationFilesMutation,
  useGetProjectRegistrationDocTypesQuery,
  useAttachComplianceByNameMutation,
  useLinkComplianceAttachmentMutation,
  useDeleteComplianceAttachmentMutation,
  useGetHandoverReadinessQuery,
  useAcknowledgeHandoverMutation,
  useListHandoverAcknowledgementsQuery,
  useGetRegistrationTradeCertificatesQuery,
  useListRegistrationOptionsQuery,
  useAssignProjectComplianceDocumentMutation,
  useAssignRegistrationComplianceDocumentMutation,
  useGetJobCategoriesQuery,
} = complianceDocumentsApi;
