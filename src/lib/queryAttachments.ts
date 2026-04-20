// Shared upload + display rules for query attachments (photos, videos, PDFs).
// Keep the five upload sites (QueryDetail, VendorQuery, MyAssignmentDetail,
// AwaitingAction, CreateQuery) consistent with the backend multipart config.

export const MAX_FILES_PER_UPLOAD = 5;

// Per-file limits. Videos are larger because a short 1080p clip is ~30-50 MB.
// Backend `max-request-size` is 275 MB in application.properties; 5 × 50 MB
// leaves headroom for form-field overhead.
export const MAX_IMAGE_OR_PDF_BYTES = 10 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

// What the native <input type="file"> will offer.
export const ATTACHMENT_ACCEPT = "image/*,video/*,.pdf";

// User-facing help text used under upload dropzones.
export const ATTACHMENT_HELP_TEXT =
  "Images or PDFs up to 10MB, videos up to 50MB. Max 5 files.";

export type AttachmentKind = "image" | "video" | "pdf" | "other";

const IMAGE_EXTS = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic", ".heif"];
const VIDEO_EXTS = [".mp4", ".mov", ".m4v", ".webm", ".ogg", ".ogv", ".3gp", ".avi", ".mkv"];

/** Classify a file (File upload) or a stored file record (by MIME + name). */
export function classifyAttachment(input: {
  mimeType?: string | null;
  name?: string | null;
}): AttachmentKind {
  const mime = (input.mimeType ?? "").toLowerCase();
  const name = (input.name ?? "").toLowerCase();
  if (mime.startsWith("video/") || VIDEO_EXTS.some((e) => name.endsWith(e))) return "video";
  if (mime.startsWith("image/") || IMAGE_EXTS.some((e) => name.endsWith(e))) return "image";
  if (mime === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  return "other";
}

/** Per-type size cap in bytes. */
export function maxBytesFor(kind: AttachmentKind): number {
  return kind === "video" ? MAX_VIDEO_BYTES : MAX_IMAGE_OR_PDF_BYTES;
}

export interface ValidationResult {
  ok: boolean;
  /** Human-readable error for toast. Undefined when ok === true. */
  error?: string;
}

/**
 * Validate a new batch of File objects against both count and per-type size
 * caps. `existingCount` is how many files are already staged for upload.
 */
export function validateAttachmentBatch(
  files: File[],
  existingCount: number,
): ValidationResult {
  if (existingCount + files.length > MAX_FILES_PER_UPLOAD) {
    return { ok: false, error: `Maximum ${MAX_FILES_PER_UPLOAD} files allowed.` };
  }
  const oversized: string[] = [];
  for (const f of files) {
    const kind = classifyAttachment({ mimeType: f.type, name: f.name });
    if (f.size > maxBytesFor(kind)) {
      const cap = kind === "video" ? "50MB" : "10MB";
      oversized.push(`${f.name} (${cap} limit)`);
    }
  }
  if (oversized.length > 0) {
    return {
      ok: false,
      error: `These files exceed the size limit: ${oversized.join(", ")}`,
    };
  }
  return { ok: true };
}
