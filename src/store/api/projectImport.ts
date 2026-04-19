import { api } from './apiSlice';

interface DefaultListResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

interface ApiResponseDto {
  success: boolean;
  message: string;
}

export interface ProjectImportStatus {
  batchId: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'ROLLED_BACK';
  processedCount: number | null;
  errorCount: number | null;
  errorReport: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export const projectImportApi = api.injectEndpoints({
  endpoints: (build) => ({
    uploadProjects: build.mutation<
      DefaultListResponse<{ batchId: string; status: string }>,
      { builderId: string; file: File }
    >({
      queryFn: async ({ builderId, file }) => {
        try {
          const form = new FormData();
          form.append('file', file);
          form.append('builderId', builderId);
          const userData = localStorage.getItem('userData');
          let jwt: string | undefined;
          try {
            jwt = userData ? JSON.parse(userData)?.jwt : undefined;
          } catch {
            jwt = undefined;
          }
          const res = await fetch(`/api/upload/projects?builderId=${encodeURIComponent(builderId)}`, {
            method: 'POST',
            headers: jwt ? { Authorization: `Bearer ${jwt}` } : undefined,
            body: form,
          });
          if (!res.ok) {
            const text = await res.text();
            return {
              error: { status: res.status, data: text },
            } as { error: { status: number; data: string } };
          }
          const data = (await res.json()) as DefaultListResponse<{ batchId: string; status: string }>;
          return { data };
        } catch (e) {
          return {
            error: { status: 'CUSTOM_ERROR', error: e instanceof Error ? e.message : 'Unknown' },
          } as { error: { status: 'CUSTOM_ERROR'; error: string } };
        }
      },
      invalidatesTags: ['ProjectImport', 'Projects'],
    }),

    getProjectImportStatus: build.query<DefaultListResponse<ProjectImportStatus>, { batchId: string }>({
      query: ({ batchId }) => ({
        url: `/api/upload/projects/${batchId}`,
        method: 'GET',
      }),
      providesTags: (_r, _e, arg) => [{ type: 'ProjectImport', id: arg.batchId }],
    }),

    rollbackProjectImport: build.mutation<ApiResponseDto, { batchId: string }>({
      query: ({ batchId }) => ({
        url: `/api/upload/projects/${batchId}/rollback`,
        method: 'POST',
      }),
      invalidatesTags: (_r, _e, arg) => [
        { type: 'ProjectImport', id: arg.batchId },
        'Projects',
      ],
    }),
  }),
});

export const {
  useUploadProjectsMutation,
  useGetProjectImportStatusQuery,
  useRollbackProjectImportMutation,
} = projectImportApi;
