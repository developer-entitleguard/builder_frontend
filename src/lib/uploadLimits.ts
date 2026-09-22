/**
 * Client-side guard for document/design-file uploads. Mirrors the backend limit
 * in ComplianceAttachmentService.MAX_FILE_SIZE_BYTES — keep the two in sync.
 * Checking before the request starts means a 30+ MB file fails instantly with a
 * clear message instead of a slow upload ending in a server error.
 */
export const MAX_UPLOAD_BYTES = 30 * 1024 * 1024;

export const MAX_UPLOAD_LABEL = "30 MB";

const formatMb = (bytes: number): string => `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

export const isOversizeUpload = (file: File): boolean => file.size > MAX_UPLOAD_BYTES;

/** Message for a single rejected file, e.g. from a one-file picker. */
export const oversizeUploadMessage = (file: File): string =>
  `"${file.name}" is ${formatMb(file.size)}. Files can't be over ${MAX_UPLOAD_LABEL} in size.`;

/**
 * Split a multi-file selection (e.g. a folder upload) into files that can be
 * sent and the ones that exceed the limit, with a ready-made message for the
 * rejected ones (null when everything fits).
 */
export const partitionBySize = (
  files: File[],
): { accepted: File[]; rejected: File[]; rejectedMessage: string | null } => {
  const accepted = files.filter((f) => !isOversizeUpload(f));
  const rejected = files.filter(isOversizeUpload);
  let rejectedMessage: string | null = null;
  if (rejected.length === 1) {
    rejectedMessage = oversizeUploadMessage(rejected[0]);
  } else if (rejected.length > 1) {
    const names = rejected.map((f) => `"${f.name}"`).join(", ");
    rejectedMessage = `${rejected.length} files are over the ${MAX_UPLOAD_LABEL} limit and were skipped: ${names}.`;
  }
  return { accepted, rejected, rejectedMessage };
};
