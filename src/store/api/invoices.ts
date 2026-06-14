import { api } from "./apiSlice";
import type { SpringPage } from "./types";
import type { QuoteLineDto } from "./quotes";
import { getApiBaseUrl } from "@/lib/config";

/**
 * Builder Sales — invoice + payment endpoints. Hits the builder org prefix
 * (/api/b/v1). Payments are recorded via the invoice mark-paid endpoint
 * (there is no separate payment list endpoint); the Payments page derives its
 * rows from PAID invoices.
 */
export interface BuilderInvoiceDto {
  id: string;
  invoiceNumber: string;
  invoiceType: string;
  /** DRAFT | UNPAID | PARTIALLY_PAID | PAID | OVERDUE | CANCELLED. */
  status: string;
  quoteId?: string | null;
  proformaId?: string | null;
  proformaNumber?: string | null;
  orderId?: string | null;
  pdfFileId?: string | null;
  paymentDueDate?: string | null;
  paymentInstructionsSnapshot?: string | null;
  issuedAt?: string;
  paidAt?: string | null;
  merchantOrgName?: string | null;
  merchantAbn?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  currency?: string | null;
  subtotal?: number | null;
  discount?: number | null;
  tax?: number | null;
  total?: number | null;
  notes?: string | null;
  lines?: QuoteLineDto[];
  xeroInvoiceId?: string | null;
  /** NONE | PENDING | SYNCED | FAILED. */
  xeroSyncStatus?: string | null;
  xeroSyncedAt?: string | null;
  xeroSyncError?: string | null;
}

/** Body for POST /invoice/{id}/mark-paid — records a payment. */
export interface BuilderPaymentDto {
  paymentDate: string;
  amount: number;
  currency?: string;
  /** BANK_TRANSFER | CARD | CASH | BPAY | OTHER. */
  method: string;
  reference?: string | null;
  notes?: string | null;
}

/** POST /invoice/{id}/resend response shape. */
export interface InvoiceResendResponse {
  emailSent: boolean;
  pushSent: boolean;
  recipient: string | null;
}

const BASE = "/api/b/v1/invoice";

export const invoicesApi = api.injectEndpoints({
  endpoints: (build) => ({
    getInvoices: build.query<SpringPage<BuilderInvoiceDto>, { page?: number; size?: number }>({
      query: ({ page = 0, size = 50 } = {}) => ({
        url: BASE,
        method: "GET",
        params: { page, size },
      }),
      providesTags: ["Invoice"],
    }),
    getInvoice: build.query<BuilderInvoiceDto, string>({
      query: (id) => ({ url: `${BASE}/${id}`, method: "GET" }),
      providesTags: (_r, _e, id) => [{ type: "Invoice", id }],
    }),
    /** Issue an UNPAID invoice directly from an ACCEPTED quote. */
    issueInvoiceFromQuote: build.mutation<
      BuilderInvoiceDto,
      { quoteId: string; paymentInstructions?: string; paymentDueDate?: string }
    >({
      query: ({ quoteId, paymentInstructions, paymentDueDate }) => ({
        url: `${BASE}/from-quote/${quoteId}`,
        method: "POST",
        params: {
          ...(paymentInstructions ? { paymentInstructions } : {}),
          ...(paymentDueDate ? { paymentDueDate } : {}),
        },
      }),
      invalidatesTags: ["Invoice", "Quote", "Dashboard"],
    }),
    /** Record a payment against an UNPAID/OVERDUE invoice and flip it to PAID. */
    markInvoicePaid: build.mutation<BuilderInvoiceDto, { id: string; payment: BuilderPaymentDto }>({
      query: ({ id, payment }) => ({
        url: `${BASE}/${id}/mark-paid`,
        method: "POST",
        body: payment,
      }),
      invalidatesTags: (_r, _e, { id }) => ["Invoice", { type: "Invoice", id }, "Dashboard"],
    }),
    /** Re-run the customer-facing side effects (PDF/email/push) for an invoice. */
    resendInvoice: build.mutation<InvoiceResendResponse, string>({
      query: (id) => ({ url: `${BASE}/${id}/resend`, method: "POST" }),
      invalidatesTags: (_r, _e, id) => [{ type: "Invoice", id }],
    }),
  }),
});

/** Direct PDF download URL — the backend streams from S3/local. */
export function invoicePdfUrl(id: string): string {
  return `${getApiBaseUrl()}${BASE}/${id}/pdf`;
}

export const {
  useGetInvoicesQuery,
  useGetInvoiceQuery,
  useIssueInvoiceFromQuoteMutation,
  useMarkInvoicePaidMutation,
  useResendInvoiceMutation,
} = invoicesApi;
