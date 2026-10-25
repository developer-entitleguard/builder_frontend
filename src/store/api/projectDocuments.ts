import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { getApiBaseUrl } from "@/lib/config";
import { api } from "./apiSlice";
import type {
  ComplianceCompleteness,
  ComplianceDocumentApi,
} from "./complianceDocuments";

/**
 * Project + Compliance (Lite) — the simplified "Documents" surface for
 * self-sufficient builder/developer orgs. Thin RTK Query slice over the
 * backend's project-tier compliance primitives (see ProjectDocumentsController):
 *   GET  /api/builder/projects/:projectId/documents
 *   POST /api/builder/projects/:projectId/documents/folder   (multipart)
 *   GET  /api/builder/projects/:projectId/documents/check
 *   POST /api/builder/projects/:projectId/boms/manuals-folder (multipart)
 */

interface DefaultListResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

/** Where a routed folder-upload file landed. */
export type FolderUploadLevel = "PROJECT" | "UNIT" | "COMMERCIAL";

/** One filed document from a folder upload. */
export interface FolderUploadEntry {
  fileName: string;
  documentId: string;
  documentName: string;
  /** Residential project / unit entries: matched an empty slot, added a new line, or a new version. */
  disposition?: "matched" | "added" | "updated";
  level?: FolderUploadLevel;
}

/** A file the router couldn't place, e.g. a `Unit 9/` folder when there's no unit 9. */
export interface FolderUploadUnrouted {
  fileName: string;
  relativePath: string | null;
  reason: string;
}

/**
 * Folder-upload result grouped by destination. Subfolders route files:
 * `Project/` or root → project, `Unit 3/` / `3/` → that unit; commercial and
 * mixed-use projects add `Commercial/` and `Residential/…` (see the commercial
 * checklist folder endpoint, which returns the same shape).
 */
export interface GroupedFolderUploadResult {
  project?: FolderUploadEntry[];
  /** Keyed by unit number. */
  units?: Record<string, FolderUploadEntry[]>;
  commercial?: FolderUploadEntry[];
  unrouted?: FolderUploadUnrouted[];
  /** Files that couldn't be stored, as "name (reason)". */
  failed?: string[];
}

export interface FolderUploadResult extends GroupedFolderUploadResult {
  /** Legacy: every filed entry, across all levels. */
  matched: FolderUploadEntry[];
  /** Legacy: same as `failed`. */
  unmatched: string[];
  documents: ComplianceDocumentApi[];
  completeness: ComplianceCompleteness;
}

/** Advisory compliance check — computed on demand, nothing is stored. */
export interface ComplianceCheckResult {
  rulebookCovered: boolean;
  uploadedCount: number;
  required: Array<{ documentName: string; present: boolean }>;
  missing: Array<{ documentName: string; present: boolean }>;
  readyForHandover: boolean;
}

export interface ManualsUploadResult {
  registrationId: string;
  created: Array<{ fileName: string; itemMapId: string; productName: string }>;
  skipped: string[];
}

const jwtFromStorage = (): string | undefined => {
  try {
    const userData = localStorage.getItem("userData");
    return userData ? JSON.parse(userData)?.jwt : undefined;
  } catch {
    return undefined;
  }
};

/**
 * POST a folder of files as multipart. Uses a raw fetch inside queryFn (the
 * repo convention for uploads) so the browser sets the multipart boundary and
 * the JWT is attached manually. `files[i]` is paired with `relativePaths[i]`
 * (the webkitRelativePath of each picked file) so nested folder names help the
 * backend's classify-and-match.
 */
async function postFolder<T>(
  path: string,
  files: File[],
  relativePaths: string[],
): Promise<{ data: T } | { error: FetchBaseQueryError }> {
  try {
    const form = new FormData();
    files.forEach((file, i) => {
      form.append("files", file);
      form.append("relativePaths", relativePaths[i] ?? file.name);
    });
    const jwt = jwtFromStorage();
    const res = await fetch(`${getApiBaseUrl()}${path}`, {
      method: "POST",
      headers: jwt ? { Authorization: `Bearer ${jwt}` } : undefined,
      body: form,
    });
    if (!res.ok) {
      const text = await res.text();
      return { error: { status: res.status, data: text } };
    }
    return { data: (await res.json()) as T };
  } catch (e) {
    return {
      error: { status: "CUSTOM_ERROR", error: e instanceof Error ? e.message : "Unknown" } as FetchBaseQueryError,
    };
  }
}

export const projectDocumentsApi = api.injectEndpoints({
  endpoints: (build) => ({
    // GET /api/builder/projects/:projectId/documents
    getProjectDocuments: build.query<
      DefaultListResponse<ComplianceDocumentApi[]>,
      { projectId: string }
    >({
      query: ({ projectId }) => ({
        url: `/api/builder/projects/${projectId}/documents`,
        method: "GET",
      }),
      providesTags: (_r, _e, { projectId }) => [
        { type: "ProjectDocuments", id: `documents-${projectId}` },
      ],
    }),

    // GET /api/builder/projects/:projectId/documents/check
    getProjectDocumentsCheck: build.query<
      DefaultListResponse<ComplianceCheckResult>,
      { projectId: string }
    >({
      query: ({ projectId }) => ({
        url: `/api/builder/projects/${projectId}/documents/check`,
        method: "GET",
      }),
      providesTags: (_r, _e, { projectId }) => [
        { type: "ProjectDocuments", id: `check-${projectId}` },
      ],
    }),

    // POST /api/builder/projects/:projectId/documents/folder  (multipart)
    uploadDocumentsFolder: build.mutation<
      DefaultListResponse<FolderUploadResult>,
      { projectId: string; files: File[]; relativePaths: string[] }
    >({
      queryFn: ({ projectId, files, relativePaths }) =>
        postFolder<DefaultListResponse<FolderUploadResult>>(
          `/api/builder/projects/${projectId}/documents/folder`,
          files,
          relativePaths,
        ),
      invalidatesTags: (_r, _e, { projectId }) => [
        { type: "ProjectDocuments", id: `documents-${projectId}` },
        { type: "ProjectDocuments", id: `check-${projectId}` },
        // The compliance tab lists these same uploaded documents via the
        // ComplianceDocuments slice, so invalidate its tags too — otherwise the
        // list stays stale (docs show "outstanding") until an unrelated status
        // change happens to refetch it.
        { type: "ComplianceDocuments", id: `project-${projectId}` },
        { type: "ComplianceDocuments", id: `project-completeness-${projectId}` },
        { type: "ComplianceDocuments", id: `registration-types-${projectId}` },
        // Files in `Unit N/` subfolders land on that unit's registration checklist,
        // whose ids aren't known here — refresh every registration view.
        "ComplianceDocuments",
        "HandoverReadiness",
      ],
    }),

    // POST /api/builder/registrations/:registrationId/boms/manuals-folder  (multipart)
    // Manuals now belong to a registration's BOM, not the project Documents tab.
    uploadRegistrationManualsFolder: build.mutation<
      DefaultListResponse<ManualsUploadResult>,
      { registrationId: string; files: File[]; relativePaths: string[] }
    >({
      queryFn: ({ registrationId, files, relativePaths }) =>
        postFolder<DefaultListResponse<ManualsUploadResult>>(
          `/api/builder/registrations/${registrationId}/boms/manuals-folder`,
          files,
          relativePaths,
        ),
      invalidatesTags: ["Item", "Registration"],
    }),
  }),
});

export const {
  useGetProjectDocumentsQuery,
  useGetProjectDocumentsCheckQuery,
  useLazyGetProjectDocumentsCheckQuery,
  useUploadDocumentsFolderMutation,
  useUploadRegistrationManualsFolderMutation,
} = projectDocumentsApi;
