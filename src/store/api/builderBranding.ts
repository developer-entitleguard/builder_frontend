import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { api } from './apiSlice';
import type { BuilderBranding, HandoverEmailPreview } from '@/lib/api/types';
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
    updateHandoverMessage: build.mutation<BuilderBranding, { html: string }>({
      query: (body) => ({ url: '/api/builder/branding/handover-message', method: 'PUT', body }),
      invalidatesTags: ['BuilderBranding'],
    }),
    previewHandoverEmail: build.mutation<HandoverEmailPreview, { html?: string | null }>({
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
