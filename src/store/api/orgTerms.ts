import { api } from "./apiSlice";
import { getApiBaseUrl } from "@/lib/config";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";

/**
 * Per PRD_Org_Terms_And_Conditions §9.1. Builder-side admin endpoints for
 * the builder org's customer-facing T&C versions. Mirrors the merchant
 * frontend's slice (different URL prefix).
 *
 * Distinct from {@code terms.ts} which backs the platform-level builder
 * onboarding ToS — same name space, different concept.
 */
export interface OrgTermsVersionDto {
  id: string;
  orgType: string;
  orgId: string;
  title: string;
  content: string;
  contentHash: string;
  effectiveDate: string;
  notes?: string | null;
  pdfFileId?: string | null;
  isDefault: boolean;
  isArchived: boolean;
  createdByUserId: string;
  createdAt: string;
  archivedAt?: string | null;
  usageCount?: number | null;
}

export interface OrgTermsVersionCreateDto {
  title: string;
  content: string;
  effectiveDate: string;
  notes?: string | null;
}

interface ListEnvelope {
  success: boolean;
  message: string;
  data: OrgTermsVersionDto[];
}

interface DefaultEnvelope {
  success: boolean;
  message: string;
  data: OrgTermsVersionDto | null;
}

interface ApiOk {
  success: boolean;
  message: string;
}

function authHeader(): Record<string, string> {
  try {
    const userData = localStorage.getItem("userData");
    if (userData) {
      const parsed = JSON.parse(userData);
      if (parsed.jwt) {
        return { Authorization: `Bearer ${parsed.jwt}` };
      }
    }
  } catch {
    // ignore
  }
  return {};
}

export const orgTermsApi = api.injectEndpoints({
  endpoints: (build) => ({
    listOrgTermsVersions: build.query<OrgTermsVersionDto[], void>({
      query: () => ({ url: "/api/builder/terms-versions", method: "GET" }),
      transformResponse: (resp: ListEnvelope) => resp?.data ?? [],
      providesTags: ["OrgTerms"],
    }),
    getOrgTermsVersion: build.query<OrgTermsVersionDto, string>({
      query: (id) => ({ url: `/api/builder/terms-versions/${id}`, method: "GET" }),
      providesTags: (_r, _e, id) => [{ type: "OrgTerms", id }],
    }),
    getDefaultOrgTermsVersion: build.query<OrgTermsVersionDto | null, void>({
      query: () => ({ url: "/api/builder/terms-versions/default", method: "GET" }),
      transformResponse: (resp: DefaultEnvelope) => resp?.data ?? null,
      providesTags: ["OrgTerms"],
    }),
    /**
     * Multipart create. Bypasses the apiSlice's hard-coded
     * Content-Type=application/json header by going through queryFn —
     * the same pattern updateBuilderCustomerMap uses for its file upload.
     */
    createOrgTermsVersion: build.mutation<
      OrgTermsVersionDto,
      { dto: OrgTermsVersionCreateDto; pdf?: File | null }
    >({
      queryFn: async ({ dto, pdf }) => {
        const fd = new FormData();
        fd.append("dto", new Blob([JSON.stringify(dto)], { type: "application/json" }));
        if (pdf) {
          fd.append("pdf", pdf);
        }
        try {
          const resp = await fetch(`${getApiBaseUrl()}/api/builder/terms-versions`, {
            method: "POST",
            headers: authHeader(),
            body: fd,
          });
          if (!resp.ok) {
            const err = await resp.json().catch(() => ({}));
            return {
              error: {
                status: resp.status,
                data:
                  (err as { message?: string })?.message ||
                  `Create failed (${resp.status} ${resp.statusText})`,
              } as FetchBaseQueryError,
            };
          }
          return { data: (await resp.json()) as OrgTermsVersionDto };
        } catch (e) {
          return {
            error: { status: "FETCH_ERROR", error: String(e) } as FetchBaseQueryError,
          };
        }
      },
      invalidatesTags: ["OrgTerms"],
    }),
    promoteOrgTermsVersion: build.mutation<ApiOk, string>({
      query: (id) => ({
        url: `/api/builder/terms-versions/${id}/promote`,
        method: "POST",
      }),
      invalidatesTags: ["OrgTerms"],
    }),
    archiveOrgTermsVersion: build.mutation<ApiOk, string>({
      query: (id) => ({
        url: `/api/builder/terms-versions/${id}/archive`,
        method: "POST",
      }),
      invalidatesTags: ["OrgTerms"],
    }),
    /** Per PRD §FR-4.1. Assign or change T&C on a builder customer (registration). */
    updateBuilderCustomerTerms: build.mutation<
      ApiOk,
      { customerId: string; termsVersionId: string | null }
    >({
      query: ({ customerId, termsVersionId }) => ({
        url: `/api/builder/customer/${customerId}/terms-version`,
        method: "PATCH",
        body: { termsVersionId: termsVersionId ?? "" },
      }),
      invalidatesTags: ["BuilderCustomer", "CustomerDetails"],
    }),
    getBuilderCustomerTerms: build.query<
      { termsVersionId: string | null; locked: boolean },
      string
    >({
      query: (customerId) => ({
        url: `/api/builder/customer/${customerId}/terms-version`,
        method: "GET",
      }),
      transformResponse: (resp: {
        success: boolean;
        message: string;
        data: { termsVersionId: string | null; locked: boolean };
      }) => resp.data,
      providesTags: (_r, _e, id) => [{ type: "BuilderCustomer", id }],
    }),
  }),
});

export const {
  useListOrgTermsVersionsQuery,
  useGetOrgTermsVersionQuery,
  useGetDefaultOrgTermsVersionQuery,
  useCreateOrgTermsVersionMutation,
  usePromoteOrgTermsVersionMutation,
  useArchiveOrgTermsVersionMutation,
  useUpdateBuilderCustomerTermsMutation,
  useGetBuilderCustomerTermsQuery,
} = orgTermsApi;
