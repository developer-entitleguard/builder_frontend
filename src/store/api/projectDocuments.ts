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

export interface FolderUploadResult {
  matched: Array<{ fileName: string; documentId: string; documentName: string }>;
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
): Promise<{ data: T } | { error: { status: number | string; data?: string; error?: string } }> {
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
      error: { status: "CUSTOM_ERROR", error: e instanceof Error ? e.message : "Unknown" },
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
