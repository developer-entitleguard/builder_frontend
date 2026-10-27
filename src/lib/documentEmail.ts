import type { DocumentEmailBatch, DocumentEmailPart } from "@/store/api/commercial";

/** Helpers for emailing Documents-tab sections (EmailSectionDocumentsDialog). */

export const formatBytes = (bytes: number): string => {
  if (bytes < 0) return "unknown size";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/** Still going out: queued or being sent. */
export const isActive = (p: DocumentEmailPart) => p.status === "QUEUED" || p.status === "SENDING";

/** The latest batch's outcome for one section: "Emailed 27 Oct to …", or a failure to retry. */
export function lastEmailedBySection(batches: DocumentEmailBatch[] | undefined): Record<string, { label: string; failed: boolean }> {
  const out: Record<string, { label: string; failed: boolean }> = {};
  for (const b of batches ?? []) { // newest first
    const sections = Array.from(new Set(b.parts.map((p) => p.section)));
    for (const section of sections) {
      if (out[section]) continue;
      const parts = b.parts.filter((p) => p.section === section);
      const date = new Date(b.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short" });
      const to = b.recipients.join(", ");
      if (parts.some((p) => p.status === "FAILED")) {
        out[section] = { label: `Emailing on ${date} to ${to} partly failed`, failed: true };
      } else if (parts.some(isActive)) {
        out[section] = { label: `Sending to ${to}…`, failed: false };
      } else {
        out[section] = { label: `Emailed ${date} to ${to}`, failed: false };
      }
    }
  }
  return out;
}
