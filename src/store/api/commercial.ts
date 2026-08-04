import { api } from './apiSlice';

/**
 * Commercial Segment PRD 1. RTK Query slice for the commercial builder flow —
 * project setup (R5), building parts (R4), registrations + business tagging
 * (R6/R9), the generated checklist and its persistence (R8), the asset register
 * (R10), and handover (R11/R12). All under /api/builder/commercial/**.
 */

export interface CommercialProjectDetail {
  projectId?: string;
  effectiveHeight?: number | null;
  grossFloorArea?: number | null;
  constructionYear?: number | null;
  isAlteration?: boolean | null;
  principalName?: string | null;
  buildingOwnerBusinessId?: string | null;
  superintendentName?: string | null;
  contractForm?: string | null;
  contractDate?: string | null;
  practicalCompletionDate?: string | null;
  dlpMonths?: number | null;
  retentionTerms?: string | null;
  coolingTowers?: boolean | null;
  registrablePlant?: boolean | null;
  gasConnected?: boolean | null;
  foodPremises?: boolean | null;
  officeAreaOver1000?: boolean | null;
  heritageListed?: boolean | null;
}

export interface BuildingPart {
  id?: string;
  nccClass: string;
  description?: string | null;
  floorArea?: number | null;
  storey?: number | null;
  storeys?: number | null;
  isResidential?: boolean | null;
  ancillaryCollapsed?: boolean | null;
  collapsedIntoClass?: string | null;
}

export interface GeneratedCommercialLine {
  ruleId: string;
  documentName: string;
  categoryCode: string;
  mandatory: string;
  tier: 'BUILDING' | 'TENANCY';
  egCreatable: boolean;
  issuer: string;
  appliesToText: string;
  governingLaw: string;
  jurisdictionCode: string;
  needsReview: boolean;
}

export interface CommercialComplianceDocument {
  id: string;
  projectId: string;
  commercialRegistrationId?: string | null;
  documentName: string;
  categoryCode?: string | null;
  mandatory?: string | null;
  tier: 'BUILDING' | 'TENANCY';
  status: string;
  egCreatable?: boolean | null;
}

export interface BusinessContact {
  id?: string;
  role: string;
  name: string;
  title?: string | null;
  email?: string | null;
  phone?: string | null;
}

export interface CommercialBusiness {
  id?: string;
  legalEntityName: string;
  tradingName?: string | null;
  abn: string;
  acn?: string | null;
  entityType: string;
  registeredStreet?: string | null;
  registeredCity?: string | null;
  registeredState?: string | null;
  registeredPostcode?: string | null;
  registeredCountry?: string | null;
  industryDivision?: string | null;
  origin?: string;
  isActive?: boolean;
  contacts?: BusinessContact[];
}

export interface CommercialRegistration {
  id?: string;
  projectId?: string;
  scope: 'BUILDING' | 'TENANCY';
  tenancyIdentifier?: string | null;
  level?: string | null;
  area?: number | null;
  buildingPartId?: string | null;
  completionDate?: string | null;
  commercialBusinessId?: string | null;
  newBusiness?: CommercialBusiness | null;
  allowDuplicateBusiness?: boolean;
  businessName?: string | null;
  status?: string;
}

export interface CommercialAsset {
  id?: string;
  commercialRegistrationId?: string;
  builderItemId?: string | null;
  name: string;
  make?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  location?: string | null;
  category?: string | null;
  commissioningDate?: string | null;
  warrantyTermMonths?: number | null;
  warrantyStartBasis?: string | null;
  registrablePlant?: boolean | null;
  plantRegistrationNumber?: string | null;
  warrantyExpiry?: string | null;
}

export interface CommercialHandoverRecord {
  id?: string;
  commercialRegistrationId?: string;
  commercialBusinessId?: string;
  projectId?: string;
  lifecycle?: string;
  practicalCompletionDate?: string | null;
  dlpEndDate?: string | null;
  buildingLabel?: string | null;
  scope?: string | null;
  tenancyIdentifier?: string | null;
  documentCount?: number | null;
  assetCount?: number | null;
  ready?: boolean;
  businessTagged?: boolean;
  hasPracticalCompletion?: boolean;
  gatingMode?: string;
  outstandingMandatory?: string[];
}

export interface ComplianceAttachment {
  id: string;
  fileId?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  externalUrl?: string | null;
  notes?: string | null;
  version?: number | null;
  isCurrent?: boolean | null;
  uploadedBy?: string | null;
  reviewStatus?: string | null;
  createdAt?: string | null;
}

export interface ComplianceAssignRequest {
  assigneeUserId?: string | null;
  assigneeOrgType?: string | null;
  assigneeOrgId?: string | null;
  assigneeName?: string | null;
  assigneeEmail?: string | null;
}

/** Backend DefaultListResponse envelope. */
interface ListEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

const projectTag = (projectId: string) => ({ type: 'Commercial' as const, id: `project:${projectId}` });
const regTag = (id: string) => ({ type: 'Commercial' as const, id: `reg:${id}` });
// Per checklist-document tag — scopes the attachment list to one row.
const docTag = (id: string) => ({ type: 'Commercial' as const, id: `cdoc:${id}` });

export const commercialApi = api.injectEndpoints({
  endpoints: (build) => ({
    // --- Setup detail (R5) ---
    getCommercialDetail: build.query<CommercialProjectDetail, string>({
      query: (projectId) => ({ url: `/api/builder/commercial/projects/${projectId}/detail`, method: 'GET' }),
      providesTags: (_r, _e, projectId) => [projectTag(projectId)],
    }),
    upsertCommercialDetail: build.mutation<CommercialProjectDetail, { projectId: string; body: CommercialProjectDetail }>({
      query: ({ projectId, body }) => ({ url: `/api/builder/commercial/projects/${projectId}/detail`, method: 'PUT', body }),
      invalidatesTags: (_r, _e, { projectId }) => [projectTag(projectId)],
    }),

    // --- Building parts (R4) ---
    getBuildingParts: build.query<BuildingPart[], string>({
      query: (projectId) => ({ url: `/api/builder/commercial/projects/${projectId}/parts`, method: 'GET' }),
      providesTags: (_r, _e, projectId) => [projectTag(projectId)],
    }),
    replaceBuildingParts: build.mutation<BuildingPart[], { projectId: string; parts: BuildingPart[] }>({
      query: ({ projectId, parts }) => ({ url: `/api/builder/commercial/projects/${projectId}/parts`, method: 'PUT', body: parts }),
      invalidatesTags: (_r, _e, { projectId }) => [projectTag(projectId)],
    }),

    // --- Checklist (R8) ---
    getCommercialChecklist: build.query<GeneratedCommercialLine[], string>({
      query: (projectId) => ({ url: `/api/builder/commercial/projects/${projectId}/checklist`, method: 'GET' }),
      providesTags: (_r, _e, projectId) => [projectTag(projectId)],
    }),
    getChecklistDocuments: build.query<CommercialComplianceDocument[], string>({
      query: (projectId) => ({ url: `/api/builder/commercial/projects/${projectId}/checklist/documents`, method: 'GET' }),
      providesTags: (_r, _e, projectId) => [projectTag(projectId)],
    }),
    regenerateChecklist: build.mutation<CommercialComplianceDocument[], string>({
      query: (projectId) => ({ url: `/api/builder/commercial/projects/${projectId}/checklist/regenerate`, method: 'POST' }),
      invalidatesTags: (_r, _e, projectId) => [projectTag(projectId)],
    }),
    markChecklistStatus: build.mutation<CommercialComplianceDocument, { documentId: string; status: string; projectId: string }>({
      query: ({ documentId, status }) => ({ url: `/api/builder/commercial/checklist-documents/${documentId}/status`, method: 'PUT', body: { status } }),
      invalidatesTags: (_r, _e, { projectId }) => [projectTag(projectId)],
    }),

    // --- Activities (R7) ---
    generateCommercialActivities: build.mutation<unknown, { projectId: string; prompt?: string }>({
      query: ({ projectId, prompt }) => ({ url: `/api/builder/commercial/projects/${projectId}/activities/generate`, method: 'POST', body: { prompt } }),
      invalidatesTags: ['Activities', 'ActivityCategories'],
    }),

    // --- Registrations (R6/R9) ---
    listCommercialRegistrations: build.query<CommercialRegistration[], string>({
      query: (projectId) => ({ url: `/api/builder/commercial/projects/${projectId}/registrations`, method: 'GET' }),
      providesTags: (_r, _e, projectId) => [projectTag(projectId)],
    }),
    createCommercialRegistration: build.mutation<CommercialRegistration, { projectId: string; body: CommercialRegistration }>({
      query: ({ projectId, body }) => ({ url: `/api/builder/commercial/projects/${projectId}/registrations`, method: 'POST', body }),
      // A new registration may create a business inline (newBusiness) — refresh the business list too.
      invalidatesTags: (_r, _e, { projectId }) => [projectTag(projectId), 'CommercialBusiness'],
    }),
    getCommercialRegistration: build.query<CommercialRegistration, string>({
      query: (id) => ({ url: `/api/builder/commercial/registrations/${id}`, method: 'GET' }),
      providesTags: (_r, _e, id) => [regTag(id)],
    }),
    updateCommercialRegistration: build.mutation<CommercialRegistration, { id: string; body: CommercialRegistration }>({
      query: ({ id, body }) => ({ url: `/api/builder/commercial/registrations/${id}`, method: 'PUT', body }),
      // Also refresh the project-scoped registrations list, not just this row.
      invalidatesTags: (result, _e, { id }) =>
        result?.projectId ? [regTag(id), projectTag(result.projectId)] : [regTag(id)],
    }),
    tagRegistrationBusiness: build.mutation<CommercialRegistration, { id: string; body: CommercialRegistration }>({
      query: ({ id, body }) => ({ url: `/api/builder/commercial/registrations/${id}/business`, method: 'PUT', body }),
      // Tagging updates the list (Tagged badge) + this row's handover readiness, and
      // may have created a business inline — refresh all three.
      invalidatesTags: (result, _e, { id }) =>
        result?.projectId
          ? [regTag(id), projectTag(result.projectId), 'CommercialBusiness']
          : [regTag(id), 'CommercialBusiness'],
    }),

    // --- Assets (R10) ---
    listCommercialAssets: build.query<CommercialAsset[], string>({
      query: (registrationId) => ({ url: `/api/builder/commercial/registrations/${registrationId}/assets`, method: 'GET' }),
      providesTags: (_r, _e, registrationId) => [regTag(registrationId)],
    }),
    addCommercialAsset: build.mutation<CommercialAsset, { registrationId: string; body: CommercialAsset }>({
      query: ({ registrationId, body }) => ({ url: `/api/builder/commercial/registrations/${registrationId}/assets`, method: 'POST', body }),
      invalidatesTags: (_r, _e, { registrationId }) => [regTag(registrationId)],
    }),
    removeCommercialAsset: build.mutation<void, { registrationId: string; assetId: string }>({
      query: ({ registrationId, assetId }) => ({ url: `/api/builder/commercial/registrations/${registrationId}/assets/${assetId}`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, { registrationId }) => [regTag(registrationId)],
    }),

    // --- Businesses (R1/R9) ---
    listCommercialBusinesses: build.query<CommercialBusiness[], void>({
      query: () => ({ url: `/api/builder/commercial/businesses`, method: 'GET' }),
      providesTags: ['CommercialBusiness'],
    }),
    searchCommercialBusinesses: build.query<CommercialBusiness[], string>({
      query: (q) => ({ url: `/api/builder/commercial/businesses/search?q=${encodeURIComponent(q)}`, method: 'GET' }),
      providesTags: ['CommercialBusiness'],
    }),

    // --- Handover (R11/R12) ---
    // NOTE: must NOT be named `getHandoverReadiness` — a residential endpoint of
    // that name exists in complianceDocuments.ts, and RTK injectEndpoints keeps
    // only the first injection of a duplicate name. The collision made this hook
    // silently call the residential `/registrations/{id}/handover-readiness` with
    // the wrong (object) arg → `undefined` id → handover never became ready.
    getCommercialHandoverReadiness: build.query<CommercialHandoverRecord, string>({
      query: (registrationId) => ({ url: `/api/builder/commercial/registrations/${registrationId}/handover/readiness`, method: 'GET' }),
      // Depend on the project tag too — readiness reads the project's practical
      // completion date, so saving Setup must refresh it.
      providesTags: (result, _e, id) => result?.projectId ? [regTag(id), projectTag(result.projectId)] : [regTag(id)],
    }),
    getHandoverRecord: build.query<CommercialHandoverRecord | null, string>({
      query: (registrationId) => ({ url: `/api/builder/commercial/registrations/${registrationId}/handover`, method: 'GET' }),
      providesTags: (_r, _e, id) => [regTag(id)],
    }),
    executeHandover: build.mutation<CommercialHandoverRecord, { registrationId: string; confirmAccuracy: boolean; sendEmail?: boolean }>({
      query: ({ registrationId, ...body }) => ({ url: `/api/builder/commercial/registrations/${registrationId}/handover`, method: 'POST', body }),
      invalidatesTags: (result, _e, { registrationId }) =>
        result?.projectId ? [regTag(registrationId), projectTag(result.projectId)] : [regTag(registrationId)],
    }),

    // --- Checklist document delivery: attachments + assign-to-trade ---
    listCommercialAttachments: build.query<ComplianceAttachment[], string>({
      query: (documentId) => ({ url: `/api/builder/commercial/checklist-documents/${documentId}/attachments`, method: 'GET' }),
      transformResponse: (r: ListEnvelope<ComplianceAttachment[]>) => r?.data ?? [],
      providesTags: (_r, _e, documentId) => [docTag(documentId)],
    }),
    uploadCommercialAttachment: build.mutation<unknown, { documentId: string; projectId: string; file: File; notes?: string }>({
      query: ({ documentId, file, notes }) => {
        const form = new FormData();
        form.append('file', file);
        if (notes) form.append('notes', notes);
        return { url: `/api/builder/commercial/checklist-documents/${documentId}/attachments`, method: 'POST', body: form };
      },
      // Attaching auto-marks the row RECEIVED — refresh the checklist list too.
      invalidatesTags: (_r, _e, { documentId, projectId }) => [docTag(documentId), projectTag(projectId)],
    }),
    deleteCommercialAttachment: build.mutation<unknown, { documentId: string; projectId: string; attachmentId: string }>({
      query: ({ documentId, attachmentId }) => ({ url: `/api/builder/commercial/checklist-documents/${documentId}/attachments/${attachmentId}`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, { documentId, projectId }) => [docTag(documentId), projectTag(projectId)],
    }),
    assignCommercialDocument: build.mutation<{ success: boolean; message: string; data?: unknown }, { documentId: string; projectId: string; body: ComplianceAssignRequest }>({
      query: ({ documentId, body }) => ({ url: `/api/builder/commercial/checklist-documents/${documentId}/assign`, method: 'POST', body }),
      invalidatesTags: (_r, _e, { documentId, projectId }) => [docTag(documentId), projectTag(projectId)],
    }),
  }),
});

export const {
  useGetCommercialDetailQuery,
  useUpsertCommercialDetailMutation,
  useGetBuildingPartsQuery,
  useReplaceBuildingPartsMutation,
  useGetCommercialChecklistQuery,
  useGetChecklistDocumentsQuery,
  useRegenerateChecklistMutation,
  useMarkChecklistStatusMutation,
  useGenerateCommercialActivitiesMutation,
  useListCommercialRegistrationsQuery,
  useCreateCommercialRegistrationMutation,
  useGetCommercialRegistrationQuery,
  useUpdateCommercialRegistrationMutation,
  useTagRegistrationBusinessMutation,
  useListCommercialAssetsQuery,
  useAddCommercialAssetMutation,
  useRemoveCommercialAssetMutation,
  useListCommercialBusinessesQuery,
  useSearchCommercialBusinessesQuery,
  useGetCommercialHandoverReadinessQuery,
  useGetHandoverRecordQuery,
  useExecuteHandoverMutation,
  useListCommercialAttachmentsQuery,
  useUploadCommercialAttachmentMutation,
  useDeleteCommercialAttachmentMutation,
  useAssignCommercialDocumentMutation,
} = commercialApi;
