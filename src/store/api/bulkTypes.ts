// Shared shapes for the project-section bulk actions (attach items, send
// entitlement, handover). The backend returns a DefaultListResponse whose
// `data` is a per-row outcome list so the UI can report partial success.

export interface BulkOperationRow {
  id: string;
  success: boolean;
  message: string;
}

export interface BulkOperationResponse {
  success: boolean;
  message: string;
  data?: BulkOperationRow[];
}

/** Summarise per-row outcomes into "{ok} succeeded, {failed} skipped/blocked". */
export const summariseBulk = (
  rows: BulkOperationRow[] | undefined
): { ok: number; failed: number; failures: BulkOperationRow[] } => {
  const list = rows ?? [];
  const failures = list.filter((r) => !r.success);
  return { ok: list.length - failures.length, failed: failures.length, failures };
};
