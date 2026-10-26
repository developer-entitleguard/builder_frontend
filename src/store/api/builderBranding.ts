import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { api } from './apiSlice';
import type { BuilderBranding, HandoverEmailPreview, HandoverEmailSegment } from '@/lib/api/types';
import { getApiBaseUrl } from '@/lib/config';

/**
 * EngineeringPlan_Builder_Branding_And_Handover_Email §5.1. Builder org
 * branding: logo + handover-email message. The org is taken from the JWT on
 * the server, so no id is passed.
 */

const authHeader = (): Record<string, string> => {
  try {
    const raw = localStorage.getItem('userData');
    const jwt = raw ? (JSON.parse(raw)?.jwt as string | undefined) : undefined;
    return jwt ? { Authorization: `Bearer ${jwt}` } : {};
  } catch {
    return {};
  }
};

export type LogoPreviewKind = 'QUOTE' | 'SWMS';

/**
 * Templates PRD BR5. Server-rendered document-header PNG for `kind`, using
 * `file` when given (an unsaved pick) or the saved logo otherwise. Plain fetch,
 * not RTK Query: the result is a Blob, which does not belong in the store.
 * Throws an Error carrying the server's message on failure.
 */
export async function fetchLogoPreview(kind: LogoPreviewKind, file?: File | null): Promise<Blob> {
  const fd = new FormData();
  if (file) fd.append('file', file, file.name);
  // kind goes on the query string only: sending it as a form field as well
  // would bind as "QUOTE,QUOTE" on the server.
  const res = await fetch(`${getApiBaseUrl()}/api/builder/branding/logo/preview?kind=${kind}`, {
    method: 'POST',
    headers: authHeader(),
    body: fd,
  });
  if (!res.ok) {
    let message = `Preview failed (HTTP ${res.status}).`;
    try {
      const data = (await res.json()) as { message?: string; error?: string };
      message = data?.message || data?.error || message;
    } catch {
      /* non-JSON error body */
    }
    throw new Error(message);
  }
  return res.blob();
}

export const builderBrandingApi = api.injectEndpoints({
  endpoints: (build) => ({
    getBuilderBranding: build.query<BuilderBranding, void>({
      query: () => ({ url: '/api/builder/branding', method: 'GET' }),
      providesTags: ['BuilderBranding'],
    }),
    uploadBuilderLogo: build.mutation<BuilderBranding, File>({
      // Multipart via raw fetch (repo convention — see orgTerms.ts / itemMap.ts):
      // never set Content-Type so the browser adds the multipart boundary.
      queryFn: async (file): Promise<{ data: BuilderBranding } | { error: FetchBaseQueryError }> => {
        try {
          const fd = new FormData();
          fd.append('file', file, file.name);
          const res = await fetch(`${getApiBaseUrl()}/api/builder/branding/logo`, {
            method: 'POST',
            headers: authHeader(),
            body: fd,
          });
          if (!res.ok) {
            let data: unknown;
            try {
              data = await res.json();
            } catch {
              data = await res.text().catch(() => `HTTP ${res.status}`);
            }
            return { error: { status: res.status, data } };
          }
          return { data: (await res.json()) as BuilderBranding };
        } catch (e) {
          return { error: { status: 'FETCH_ERROR', error: String(e) } };
        }
      },
      invalidatesTags: ['BuilderBranding', 'BuilderOrganization'],
    }),
    removeBuilderLogo: build.mutation<BuilderBranding, void>({
      query: () => ({ url: '/api/builder/branding/logo', method: 'DELETE' }),
      invalidatesTags: ['BuilderBranding', 'BuilderOrganization'],
    }),
    // segment omitted = RESIDENTIAL (back-compatible with the pre-segment API).
    updateHandoverMessage: build.mutation<BuilderBranding, { html: string; segment?: HandoverEmailSegment }>({
      query: (body) => ({ url: '/api/builder/branding/handover-message', method: 'PUT', body }),
      invalidatesTags: ['BuilderBranding'],
    }),
    previewHandoverEmail: build.mutation<HandoverEmailPreview, { html?: string | null; segment?: HandoverEmailSegment }>({
      query: (body) => ({ url: '/api/builder/branding/handover-email/preview', method: 'POST', body }),
    }),
  }),
});

export const {
  useGetBuilderBrandingQuery,
  useUploadBuilderLogoMutation,
  useRemoveBuilderLogoMutation,
  useUpdateHandoverMessageMutation,
  usePreviewHandoverEmailMutation,
} = builderBrandingApi;
