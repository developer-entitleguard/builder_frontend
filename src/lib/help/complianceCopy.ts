// Single source of truth for the "what / how / why" compliance explanation, so
// the Welcome dialog, the Help center and the embeddable ComplianceExplainer all
// read identically.

export interface CompliancePoint {
  key: "what" | "how" | "why";
  label: string;
  heading: string;
  body: string;
}

export const COMPLIANCE_POINTS: CompliancePoint[] = [
  {
    key: "what",
    label: "What",
    heading: "What compliance means",
    body: "A checklist of documents a home must have to be legally and safely handed over — certificates, warranties, approvals. EG BuildOS tracks it per registration.",
  },
  {
    key: "how",
    label: "How",
    heading: "How you run it",
    body: "Open a registration's compliance tab. We generate the checklist for its jurisdiction; you upload each document, and items tick off as they're satisfied.",
  },
  {
    key: "why",
    label: "Why",
    heading: "Why you upload",
    body: "Handover stays locked until the checklist is complete. Uploading gives the homeowner a verifiable record — and protects you if anything is disputed later.",
  },
];
