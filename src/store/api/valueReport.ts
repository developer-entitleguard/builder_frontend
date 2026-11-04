import { api } from './apiSlice';

/**
 * Value report (Revenue Capabilities F5). Administrator (ORG_MANAGE); a 403
 * hides the entry. Mirrors RevenueReportsController#builderReport
 * (/api/builder/value-report) and ValueReportService.Report.
 *
 * Copy rule (B4): measured results only. No estimates, projections, savings,
 * ROI, or any Entitle Guard fee or price.
 */

/** ValueReportService.Measure */
export interface ValueMeasure {
  key: string;
  label: string;
  count: number;
  /** Measured dollars, or null when the measure is a count only. */
  amount: number | null;
}

/** ValueReportService.Report */
export interface ValueReport {
  from: string;
  to: string;
  measures: ValueMeasure[];
  note: string | null;
}

export const VALUE_REPORT_PERIODS = [3, 6, 12, 24] as const;
export type ValueReportPeriod = (typeof VALUE_REPORT_PERIODS)[number];

export const valueReportApi = api.injectEndpoints({
  endpoints: (build) => ({
    getValueReport: build.query<ValueReport, ValueReportPeriod>({
      query: (months) => ({ url: '/api/builder/value-report', method: 'GET', params: { months } }),
      providesTags: (_r, _e, months) => [{ type: 'ValueReport', id: months }],
    }),
  }),
});

export const valueReportErrorStatus = (err: unknown): number | undefined => {
  const s = (err as { status?: unknown } | undefined)?.status;
  return typeof s === 'number' ? s : undefined;
};

export const valueReportErrorMessage = (err: unknown, fallback = 'Something went wrong'): string => {
  const e = err as { status?: unknown; data?: unknown; error?: string } | undefined;
  if (!e) return fallback;
  if (e.data && typeof e.data === 'object' && 'message' in e.data) {
    const m = (e.data as { message?: unknown }).message;
    if (typeof m === 'string' && m.trim()) return m;
  }
  if (e.status === 403) return 'Your role does not include the value report.';
  return e.error ?? fallback;
};

export const { useGetValueReportQuery } = valueReportApi;
