import { api } from '@/store/api/apiSlice';
import { FetchBaseQueryError } from '@reduxjs/toolkit/query';

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
    uploadTemplate: build.mutation<UploadTemplateResponse, UploadTemplateRequest>({
      queryFn: async (data, _queryApi, _extraOptions, baseQuery) => {
        // Create FormData
        const formData = new FormData();
        formData.append('file', data.file);
        formData.append('bomName', data.bomName);
        formData.append('projectName', data.projectName || '');
        formData.append('builderOrganizationId', data.builderOrganizationId);

        // Get JWT token from localStorage
        let authToken = '';
        try {
          const userData = localStorage.getItem('userData');
          if (userData) {
            const parsedData = JSON.parse(userData);
            if (parsedData.jwt) {
              authToken = parsedData.jwt;
            }
          }
        } catch (error) {
          console.warn('Failed to get JWT token for upload:', error);
        }

        // Make the request
        const result = await fetch('/api/upload-template', {
          method: 'POST',
          headers: {
            'Authorization': authToken ? `Bearer ${authToken}` : '',
          },
          body: formData,
        });

        if (!result.ok) {
          const errorData = await result.json().catch(() => ({}));
          return {
            error: {
              status: result.status,
              data: errorData.message || `Failed to upload template: ${result.statusText}`,
            } as FetchBaseQueryError,
          };
        }

        const response = await result.json();
        return { data: response };
      },
      invalidatesTags: ['Item'],
    }),
  }),
});

export const {
  useUploadTemplateMutation,
} = bomUploadApi;

