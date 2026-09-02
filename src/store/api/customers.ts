import { api } from "./apiSlice";

/**
 * Builder Sales — org-scoped customer directory. Backed by the shared
 * TradeCustomer API on the builder org prefix (/api/b/v1/customer). Reads are
 * gated by JOB_VIEW, writes by JOB_MANAGE on the backend (builder
 * ADMINISTRATOR / PROJECT_MANAGER carry both).
 */
export type SalesCustomerType = "INDIVIDUAL" | "BUSINESS";

export interface SalesCustomerDto {
  id: string;
  orgType: string;
  orgId: string;
  customerType: SalesCustomerType;
  name: string;
  abn?: string | null;
  linkedCustomerId?: string | null;
  linkedOrgType?: string | null;
  linkedOrgId?: string | null;
  email?: string | null;
  phone?: string | null;
  addressLine?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  notes?: string | null;
  createdAt?: string;
}

export interface SalesCustomerWriteRequest {
  customerType?: SalesCustomerType;
  name: string;
  abn?: string;
  email?: string;
  phone?: string;
  addressLine?: string;
  city?: string;
  state?: string;
  zip?: string;
  notes?: string;
}

const BASE = "/api/b/v1/customer";

export const customersApi = api.injectEndpoints({
  endpoints: (build) => ({
    getCustomers: build.query<SalesCustomerDto[], { q?: string } | void>({
      query: (arg) => {
        const q = (arg as { q?: string } | undefined)?.q;
        return {
          url: BASE,
          method: "GET",
          params: q ? { q } : undefined,
        };
      },
      providesTags: ["Customer"],
    }),
    getCustomer: build.query<SalesCustomerDto, string>({
      query: (id) => ({ url: `${BASE}/${id}`, method: "GET" }),
      providesTags: (_r, _e, id) => [{ type: "Customer", id }],
    }),
    createCustomer: build.mutation<SalesCustomerDto, SalesCustomerWriteRequest>({
      query: (body) => ({ url: BASE, method: "POST", body }),
      invalidatesTags: ["Customer"],
    }),
    updateCustomer: build.mutation<SalesCustomerDto, { id: string; body: SalesCustomerWriteRequest }>({
      query: ({ id, body }) => ({ url: `${BASE}/${id}`, method: "PUT", body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "Customer", id }, "Customer"],
    }),
    deleteCustomer: build.mutation<void, string>({
      query: (id) => ({ url: `${BASE}/${id}`, method: "DELETE" }),
      invalidatesTags: ["Customer"],
    }),
  }),
});

export const {
  useGetCustomersQuery,
  useGetCustomerQuery,
  useCreateCustomerMutation,
  useUpdateCustomerMutation,
  useDeleteCustomerMutation,
} = customersApi;
