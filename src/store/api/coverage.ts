/**
 * Advisory AI warranty / duty-of-care coverage fields, shared by the builder's
 * Ticket and Query read models (both serialize the raw backend entity). Mirrors
 * the columns on Query.java / Ticket.java.
 */
export type CoverageVerdict = 'LIKELY_COVERED' | 'LIKELY_NOT_COVERED' | 'UNCERTAIN';

export interface CoverageFields {
  linkedRegistrationId?: string | null;
  /** True when the linked registration was auto-created from intake (needs builder verification). */
  registrationAutoCreated?: boolean | null;

  coverageVerdict?: CoverageVerdict | string | null;
  coverageCategory?: string | null;
  coverageBuilderMessage?: string | null;
  coverageRationale?: string | null;
  coverageConfidence?: number | null;
  coverageWarrantyBasis?: string | null;
  coverageWarrantyExpiry?: string | null;
  /** Newline-joined citation URLs. */
  coverageReferences?: string | null;
  coverageAssessedAt?: string | null;
  /** ok | insufficient | pending | failed. */
  coverageStatus?: string | null;
}
