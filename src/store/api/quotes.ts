import { api } from "./apiSlice";
import type { SpringPage } from "./types";

/**
 * Builder Sales — quote endpoints. Mirrors the merchant/trade quote API but
 * hits the builder org prefix (/api/b/v1). The backend QuoteService is
 * org-type-agnostic; builders were enabled via the SALES module + the
 * builder API prefix on QuoteController.
 */
export interface QuoteLineDto {
  id?: string;
  lineNumber: number;
  merchantItemId?: string | null;
  nameSnapshot: string;
  skuSnapshot?: string | null;
  brandSnapshot?: string | null;
  qty: number;
  unitPriceExTax: number;
  discountPercent?: number | null;
  taxRate: number;
  taxAmount?: number | null;
  lineTotal?: number | null;
  warrantyMonthsOverride?: number | null;
}

export interface QuoteDto {
  id?: string;
  quoteNumber?: string;
  status?: string;
  customerId?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  customerName?: string | null;
  subtotal?: number;
  discount?: number;
  tax?: number;
  total?: number;
  currency?: string;
  expiresAt?: string | null;
  notes?: string | null;
  lines: QuoteLineDto[];
  /** Set when a proforma already exists for this quote. */
  linkedProformaId?: string | null;
  /** Set when an invoice has been issued directly from this quote. */
  linkedInvoiceId?: string | null;
  /** Org T&C version applied to this quote (null falls back to org default). */
  termsVersionId?: string | null;
}

export interface QuoteSendResponse {
  quote: QuoteDto;
  publicUrl: string;
}

const BASE = "/api/b/v1/quote";

export const quotesApi = api.injectEndpoints({
  endpoints: (build) => ({
    getQuotes: build.query<SpringPage<QuoteDto>, { page?: number; size?: number; status?: string }>({
      query: ({ page = 0, size = 50, status } = {}) => ({
        url: BASE,
        method: "GET",
        params: { page, size, ...(status ? { status } : {}) },
      }),
      providesTags: ["Quote"],
    }),
    getQuote: build.query<QuoteDto, string>({
      query: (id) => ({ url: `${BASE}/${id}`, method: "GET" }),
      providesTags: (_r, _e, id) => [{ type: "Quote", id }],
    }),
    upsertQuote: build.mutation<QuoteDto, QuoteDto>({
      query: (body) => ({ url: BASE, method: "POST", body }),
      invalidatesTags: ["Quote"],
    }),
    sendQuote: build.mutation<QuoteSendResponse, string>({
      query: (id) => ({ url: `${BASE}/${id}/send`, method: "POST" }),
      invalidatesTags: ["Quote"],
    }),
    acceptQuote: build.mutation<QuoteDto, string>({
      query: (id) => ({ url: `${BASE}/${id}/accept`, method: "POST" }),
      invalidatesTags: ["Quote"],
    }),
    rejectQuote: build.mutation<QuoteDto, { id: string; reason?: string }>({
      query: ({ id, reason }) => ({
        url: `${BASE}/${id}/reject`,
        method: "POST",
        params: reason ? { reason } : undefined,
      }),
      invalidatesTags: ["Quote"],
    }),
  }),
});

export const {
  useGetQuotesQuery,
  useGetQuoteQuery,
  useUpsertQuoteMutation,
  useSendQuoteMutation,
  useAcceptQuoteMutation,
  useRejectQuoteMutation,
} = quotesApi;
