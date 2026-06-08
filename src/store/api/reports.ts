import { api } from "./apiSlice";

// ---- Types mirroring backend ProjectReportDto ----------------------------

export interface ReportCategoryProgress {
  categoryName: string;
  total: number;
  completed: number;
  outstanding: number;
}

export interface ReportJobStatusCount {
  status: string;
  count: number;
}

export interface ReportActivityRow {
  id: string;
  name: string;
  categoryName: string | null;
  dueDate: string | null;
  daysOverdue: number | null;
  assignee: string | null;
  completed: boolean;
}

export interface ReportProgressSection {
  totalActivities: number;
  completedActivities: number;
  percentComplete: number;
  overdueCount: number;
  upcomingCount: number;
  daysToTarget: number | null;
  scheduleOverdue: boolean;
  byCategory: ReportCategoryProgress[];
  jobStatusBreakdown: ReportJobStatusCount[];
  overdueActivities: ReportActivityRow[];
  upcomingActivities: ReportActivityRow[];
  narrative: string;
}

export interface ReportCostCategory {
  category: string;
  total: number | null;
}

export interface ReportCostItemRow {
  category: string | null;
  name: string | null;
  quantity: number | null;
  unitRate: number | null;
  totalCost: number | null;
  linkedActivityName: string | null;
}

export interface ReportFinancialSection {
  hasPricing: boolean;
  finalPrice: number | null;
  totalEstimatedCost: number | null;
  baseEstimatedCost: number | null;
  marginPercentage: number | null;
  marginAmount: number | null;
  quotedSpend: number | null;
  paidSpend: number | null;
  committedSpend: number | null;
  variance: number | null;
  estimatedByCategory: ReportCostCategory[];
  costItems: ReportCostItemRow[];
  narrative: string;
}

export interface ReportCompleteness {
  total: number;
  required: number;
  requiredReceived: number;
  outstandingRequired: number;
  received: number;
  completenessPercent: number;
  readyForHandover: boolean;
}

export interface ReportOutstandingDoc {
  id: string;
  documentName: string | null;
  category: string | null;
  mandatory: string | null;
  status: string | null;
  issuer: string | null;
}

export interface ReportRegistrationComplianceRow {
  id: string;
  label: string;
  unitNumber: string | null;
  completenessPercent: number;
  outstandingRequired: number;
  required: number;
  received: number;
  state: "READY" | "ACKNOWLEDGED_GAP" | "BLOCKED";
}

export interface ReportComplianceSection {
  projectCompleteness: ReportCompleteness;
  registrationsTotal: number;
  registrationsReady: number;
  registrationsBlocked: number;
  registrationsAcknowledgedGap: number;
  outstandingRequiredDocuments: ReportOutstandingDoc[];
  registrations: ReportRegistrationComplianceRow[];
  narrative: string;
}

export interface ProjectReport {
  projectId: string;
  projectName: string;
  address: string | null;
  propertyType: string | null;
  status: string | null;
  builderOrganizationName: string | null;
  startDate: string | null;
  targetEndDate: string | null;
  actualEndDate: string | null;
  generatedAt: string;
  progress: ReportProgressSection;
  financial: ReportFinancialSection;
  compliance: ReportComplianceSection;
}

export interface ProjectReportResponse {
  success: boolean;
  message: string;
  data: ProjectReport | null;
}

// ---- Org-level report (admin only) ---------------------------------------

export interface OrgReportMonthlyPoint {
  month: string; // "2026-04"
  tickets: number;
  queries: number;
}

export interface OrgReportStatusCount {
  status: string;
  count: number;
}

export interface OrgReportTotals {
  projects: number;
  tickets: number;
  queries: number;
  openTickets: number;
}

export interface OrgReportProjectRow {
  id: string;
  name: string;
  status: string | null;
  propertyType: string | null;
  buildingClass: string | null;
  targetEndDate: string | null;
}

export interface OrgReport {
  organizationName: string | null;
  generatedAt: string;
  totals: OrgReportTotals;
  monthly: OrgReportMonthlyPoint[];
  ticketsByStatus: OrgReportStatusCount[];
  queriesByStatus: OrgReportStatusCount[];
  projects: OrgReportProjectRow[];
}

export interface OrgReportResponse {
  success: boolean;
  message: string;
  data: OrgReport | null;
}

export const reportsApi = api.injectEndpoints({
  endpoints: (build) => ({
    // GET /api/builder/projects/:projectId/report
    getProjectReport: build.query<ProjectReportResponse, { projectId: string }>({
      query: ({ projectId }) => ({
        url: `/api/builder/projects/${projectId}/report`,
        method: "GET",
      }),
      providesTags: (_result, _error, { projectId }) => [
        { type: "Projects", id: `${projectId}-report` },
      ],
    }),
    // GET /api/builder/reports/overview
    getOrgReport: build.query<OrgReportResponse, void>({
      query: () => ({
        url: `/api/builder/reports/overview`,
        method: "GET",
      }),
      providesTags: [{ type: "Projects", id: "org-report" }],
    }),
  }),
});

export const { useGetProjectReportQuery, useGetOrgReportQuery } = reportsApi;
