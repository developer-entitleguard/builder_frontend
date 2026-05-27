import { api } from './apiSlice';

// Server response envelope (matches DefaultListResponse / ApiResponse on the backend).
interface DefaultListResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

interface ApiResponseDto {
  success: boolean;
  message: string;
}

/**
 * Per-row outcome surfaced both in the preview response and in the post-commit
 * status report. Mirrors {@code BuilderOnboardingRowDto} on the backend.
 *
 * Status values:
 *   - "OK"        → row will create (preview) or did create (commit) a new BuilderCustomer.
 *   - "DUPLICATE" → row's email already exists for this builder; row is skipped, not errored.
 *   - "ERROR"     → row failed validation (missing required field, bad date, etc.).
 */
export interface OnboardingRow {
  rowNumber: number;
  projectName?: string;
  projectAddress?: string;
  projectCity?: string;
  projectState?: string;
  projectPostcode?: string;
  propertyType?: string;
  handoverDate?: string | null;
  customerFirstName?: string;
  customerLastName?: string;
  customerEmail?: string;
  customerContact?: string;
  unitNumber?: string;
  customerAddress?: string;
  numBedrooms?: number | null;
  numRooms?: number | null;
  totalBuiltUpArea?: number | null;
  price?: number | null;
  settlementDate?: string | null;
  status?: 'OK' | 'DUPLICATE' | 'ERROR' | null;
  error?: string | null;
}

export interface OnboardingPreview {
  totalRows: number;
  projectCount: number;
  newRegistrationCount: number;
  duplicateCount: number;
  errorCount: number;
  rows: OnboardingRow[];
}

export interface OnboardingBatchStatus {
  batchId: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'ROLLED_BACK';
  processedCount: number | null;
  errorCount: number | null;
  errorReport: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  filePath?: string | null;
}

export interface OnboardingImportListEntry {
  batchId: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'ROLLED_BACK';
  processedCount: number | null;
  errorCount: number | null;
  filePath?: string | null;
  createdAt: string | null;
  createdBy?: string | null;
}

/**
 * Reads the builder JWT out of localStorage. The shared {@code apiSlice}
 * baseQuery already does this for JSON endpoints, but multipart uploads use
 * native {@code fetch} so we need to set the header ourselves.
 */
const readJwt = (): string | undefined => {
  try {
    const raw = localStorage.getItem('userData');
    if (!raw) return undefined;
    return JSON.parse(raw)?.jwt;
  } catch {
    return undefined;
  }
};

export const builderOnboardingApi = api.injectEndpoints({
  endpoints: (build) => ({
    /**
     * Multipart parse-only preview. The backend does not persist anything;
     * it returns counts + per-row outcomes so the operator can confirm
     * before triggering the commit + email blast.
     */
    previewBuilderOnboarding: build.mutation<
      DefaultListResponse<OnboardingPreview>,
      { file: File }
    >({
      queryFn: async ({ file }) => {
        try {
          const form = new FormData();
          form.append('file', file);
          const jwt = readJwt();
          const res = await fetch('/api/builder/onboarding/preview', {
            method: 'POST',
            headers: jwt ? { Authorization: `Bearer ${jwt}` } : undefined,
            body: form,
          });
          if (!res.ok) {
            const text = await res.text();
            return { error: { status: res.status, data: text } } as never;
          }
          const data = (await res.json()) as DefaultListResponse<OnboardingPreview>;
          return { data };
        } catch (e) {
          return {
            error: {
              status: 'CUSTOM_ERROR',
              error: e instanceof Error ? e.message : 'Unknown',
            },
          } as never;
        }
      },
    }),

    /**
     * Persist parsed rows + send onboarding invitation emails to every newly
     * created BuilderCustomer. Returns the batch id; the page polls
     * {@link useGetBuilderOnboardingStatusQuery} until terminal status.
     */
    commitBuilderOnboarding: build.mutation<
      DefaultListResponse<{ batchId: string; status: string }>,
      { file: File }
    >({
      queryFn: async ({ file }) => {
        try {
          const form = new FormData();
          form.append('file', file);
          const jwt = readJwt();
          const res = await fetch('/api/builder/onboarding/commit', {
            method: 'POST',
            headers: jwt ? { Authorization: `Bearer ${jwt}` } : undefined,
            body: form,
          });
          if (!res.ok) {
            const text = await res.text();
            return { error: { status: res.status, data: text } } as never;
          }
          const data = (await res.json()) as DefaultListResponse<{
            batchId: string;
            status: string;
          }>;
          return { data };
        } catch (e) {
          return {
            error: {
              status: 'CUSTOM_ERROR',
              error: e instanceof Error ? e.message : 'Unknown',
            },
          } as never;
        }
      },
      // After a commit, projects + registrations + the imports list all
      // need refreshing — invalidate the relevant tags here so the rest of
      // the app re-fetches automatically.
      invalidatesTags: ['Projects', 'Registration', 'ProjectImport', 'BuilderCustomer'],
    }),

    getBuilderOnboardingStatus: build.query<
      DefaultListResponse<OnboardingBatchStatus>,
      { batchId: string }
    >({
      query: ({ batchId }) => ({
        url: `/api/builder/onboarding/imports/${batchId}`,
        method: 'GET',
      }),
      providesTags: (_r, _e, arg) => [{ type: 'ProjectImport', id: arg.batchId }],
    }),

    listBuilderOnboardingImports: build.query<
      DefaultListResponse<OnboardingImportListEntry[]>,
      void
    >({
      query: () => ({
        url: '/api/builder/onboarding/imports',
        method: 'GET',
      }),
      providesTags: ['ProjectImport'],
    }),

    rollbackBuilderOnboarding: build.mutation<ApiResponseDto, { batchId: string }>({
      query: ({ batchId }) => ({
        url: `/api/builder/onboarding/imports/${batchId}/rollback`,
        method: 'POST',
      }),
      invalidatesTags: (_r, _e, arg) => [
        { type: 'ProjectImport', id: arg.batchId },
        'ProjectImport',
        'Projects',
        'Registration',
        'BuilderCustomer',
      ],
    }),
  }),
});

/**
 * Downloads the onboarding template in the requested format. Returned as a
 * hook so the page can show a loading state on the button.
 */
export const downloadOnboardingTemplate = async (
  format: 'csv' | 'xlsx' = 'csv',
): Promise<void> => {
  const jwt = readJwt();
  const res = await fetch(`/api/builder/onboarding/template?format=${format}`, {
    method: 'GET',
    headers: jwt ? { Authorization: `Bearer ${jwt}` } : undefined,
  });
  if (!res.ok) {
    throw new Error(`Failed to download template: ${res.status} ${res.statusText}`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `builder-onboarding-template.${format}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const {
  usePreviewBuilderOnboardingMutation,
  useCommitBuilderOnboardingMutation,
  useGetBuilderOnboardingStatusQuery,
  useListBuilderOnboardingImportsQuery,
  useRollbackBuilderOnboardingMutation,
} = builderOnboardingApi;
