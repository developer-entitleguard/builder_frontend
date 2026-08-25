import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';
import type { QueryReturnValue } from '@reduxjs/toolkit/query/react';
import { api } from './apiSlice';

/** One row the importer refused, with the reason. */
export interface DirectoryImportError {
  line: number;
  subject: string | null;
  error: string;
}

/** One row that imported but is worth a look. */
export interface DirectoryImportWarning {
  line: number;
  subject: string | null;
  warning: string;
}

/**
 * Result of a vendor or supplier CSV import. `dryRun` responses carry the same
 * counts a real run would produce but write nothing and have no `batchId` —
 * there is no batch to roll back because nothing was created.
 */
export interface DirectoryImportResult {
  batchId: string | null;
  dryRun: boolean;
  processedCount: number;
  errorCount: number;
  errors: DirectoryImportError[];
  warnings: DirectoryImportWarning[];
  /** Vendor imports only. */
  vendorsMatched?: number;
  vendorsCreated?: number;
  internalLoginsProvisioned?: number;
  /** Supplier imports only. */
  suppliersMatched?: number;
  suppliersCreated?: number;
  /** Both: rows where the type column was blank and defaulted. */
  typeDefaulted?: number;
}

interface DefaultListResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

interface ApiResponseDto {
  success: boolean;
  message: string;
}

const authHeader = (): Record<string, string> => {
  try {
    const userData = localStorage.getItem('userData');
    const jwt = userData ? JSON.parse(userData)?.jwt : undefined;
    return jwt ? { Authorization: `Bearer ${jwt}` } : {};
  } catch {
    return {};
  }
};

/**
 * Multipart upload can't go through the standard RTK Query `query` builder
 * without it setting a JSON content-type, so these use `queryFn` with fetch —
 * the same approach as the project import.
 */
type UploadReturn = QueryReturnValue<
  DefaultListResponse<DirectoryImportResult>,
  FetchBaseQueryError
>;

const uploadCsv = async (
  path: string,
  file: File,
  dryRun: boolean
): Promise<UploadReturn> => {
  try {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${path}?dryRun=${dryRun ? 'true' : 'false'}`, {
      method: 'POST',
      headers: authHeader(),
      body: form,
    });
    if (!res.ok) {
      return { error: { status: res.status, data: await res.text() } as FetchBaseQueryError };
    }
    return { data: (await res.json()) as DefaultListResponse<DirectoryImportResult> };
  } catch (e) {
    return {
      error: {
        status: 'CUSTOM_ERROR',
        error: e instanceof Error ? e.message : 'Unknown error',
      } as FetchBaseQueryError,
    };
  }
};

export const directoryImportApi = api.injectEndpoints({
  endpoints: (build) => ({
    uploadVendorsCsv: build.mutation<
      DefaultListResponse<DirectoryImportResult>,
      { file: File; dryRun: boolean }
    >({
      queryFn: ({ file, dryRun }) => uploadCsv('/api/builder/upload/vendors', file, dryRun),
      // A dry run changes nothing, so only a committed import invalidates.
      invalidatesTags: (_r, _e, { dryRun }) => (dryRun ? [] : ['Vendor']),
    }),

    rollbackVendorImport: build.mutation<ApiResponseDto, { batchId: string }>({
      query: ({ batchId }) => ({
        url: `/api/builder/upload/vendors/${batchId}/rollback`,
        method: 'POST',
      }),
      invalidatesTags: ['Vendor'],
    }),

    uploadSuppliersCsv: build.mutation<
      DefaultListResponse<DirectoryImportResult>,
      { file: File; dryRun: boolean }
    >({
      queryFn: ({ file, dryRun }) => uploadCsv('/api/builder/upload/suppliers', file, dryRun),
      invalidatesTags: (_r, _e, { dryRun }) => (dryRun ? [] : ['Supplier']),
    }),

    rollbackSupplierImport: build.mutation<ApiResponseDto, { batchId: string }>({
      query: ({ batchId }) => ({
        url: `/api/builder/upload/suppliers/${batchId}/rollback`,
        method: 'POST',
      }),
      invalidatesTags: ['Supplier'],
    }),

    /**
     * Send the set-password invite to an imported internal vendor. The import
     * provisions the login but mails nobody, so this is how they get access.
     */
    sendVendorInvite: build.mutation<ApiResponseDto, { vendorId: string }>({
      query: ({ vendorId }) => ({
        url: `/api/builder/vendor/${vendorId}/invite`,
        method: 'POST',
      }),
    }),
  }),
});

export const {
  useUploadVendorsCsvMutation,
  useRollbackVendorImportMutation,
  useUploadSuppliersCsvMutation,
  useRollbackSupplierImportMutation,
  useSendVendorInviteMutation,
} = directoryImportApi;
