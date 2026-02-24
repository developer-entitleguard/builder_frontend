import { api } from './apiSlice';
import { getApiBaseUrl } from '@/lib/config';
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';

export interface UploadTemplateRequest {
  file: File;
  bomName: string;
  projectName?: string;
  builderOrganizationId: string;
}

export interface UploadTemplateResponse {
  success: boolean;
  message: string;
  data?: unknown;
}

export const bomUploadApi = api.injectEndpoints({
  endpoints: (build) => ({
    uploadTemplate: build.mutation<
      UploadTemplateResponse,
      UploadTemplateRequest
    >({
      queryFn: async (data) => {
        const formData = new FormData();
        formData.append('file', data.file);
        formData.append('bomName', data.bomName);
        formData.append('projectName', data.projectName || '');
        formData.append('builderOrganizationId', data.builderOrganizationId);
        let authToken = '';
        try {
          const userData = localStorage.getItem('userData');
          if (userData) {
            const parsed = JSON.parse(userData);
            if (parsed.jwt) authToken = parsed.jwt;
          }
        } catch {
          // ignore
        }
        const base = getApiBaseUrl();
        const url = base ? `${base}/api/upload-template` : '/api/upload-template';
        const result = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: authToken ? `Bearer ${authToken}` : '',
          },
          body: formData,
        });
        if (!result.ok) {
          const errorData = await result.json().catch(() => ({}));
          return {
            error: {
              status: result.status,
              data:
                (errorData as { message?: string })?.message ||
                `Failed to upload template: ${result.statusText}`,
            } as FetchBaseQueryError,
            data: undefined as never,
          };
        }
        const response = await result.json();
        return { data: response };
      },
      invalidatesTags: ['Item'],
    }),
  }),
});

export const { useUploadTemplateMutation } = bomUploadApi;
