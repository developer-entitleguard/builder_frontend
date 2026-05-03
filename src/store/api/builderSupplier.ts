import { api } from './apiSlice';

/**
 * Per PRD §6.4 / §9.2. Backend exposes the same surface under both
 * /api/builder/supplier and /api/merchant/supplier; this slice targets the
 * builder mount. The org context is determined by the JWT (org_type=BUILDER
 * implied by the path prefix), so we don't pass builderId — Spring reads it
 * from OrgSession.
 */
export interface SupplierResponseItem {
  id: string;
  name: string;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  abn?: string | null;
  supplierType: string;          // WHOLESALER | DISTRIBUTOR | MANUFACTURER | IMPORTER | OTHER
  paymentTerms?: string | null;  // NET_7 | NET_14 | NET_30 | NET_60
  addressId?: string | null;
  notes?: string | null;
  isActive?: boolean | null;
}

export interface SupplierPage {
  content: SupplierResponseItem[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export type SupplierUpsertRequest = Omit<SupplierResponseItem, 'id'> & { id?: string };

export const builderSupplierApi = api.injectEndpoints({
  endpoints: (build) => ({
    getBuilderSuppliers: build.query<SupplierPage, { page?: number; size?: number }>({
      query: ({ page = 0, size = 50 }) => ({
        url: '/api/builder/supplier',
        method: 'GET',
        params: { page, size },
      }),
      providesTags: ['Supplier'],
    }),
    createOrUpdateBuilderSupplier: build.mutation<SupplierResponseItem, SupplierUpsertRequest>({
      query: (data) => ({
        url: '/api/builder/supplier',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Supplier'],
    }),
    deleteBuilderSupplier: build.mutation<void, string>({
      query: (id) => ({
        url: `/api/builder/supplier/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Supplier'],
    }),
  }),
});

export const {
  useGetBuilderSuppliersQuery,
  useCreateOrUpdateBuilderSupplierMutation,
  useDeleteBuilderSupplierMutation,
} = builderSupplierApi;
