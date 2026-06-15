import { api } from './apiSlice';
import type {
  BuilderCustomerResponse,
  CreateBuilderCustomerRequest,
} from '@/lib/api/types';
import { getApiBaseUrl } from '@/lib/config';
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';
import type { BulkOperationResponse } from './bulkTypes';

/** Narrow inline-edit payload for a registration's detail page. */
export interface UpdateCustomerDetailsRequest {
  id: string;
  patch: {
    firstName?: string;
    lastName?: string;
    email?: string;
    contact?: string;
    unitNumber?: string;
    totalBuiltUpArea?: number;
  };
}

export interface BuilderItemFileDto {
  type: 'warranty' | 'Manual';
  file: File;
  /** Optional existing file id when updating (Swagger: builderItemFilesDtos[i].id) */
  id?: string;
}

export interface UpdateBuilderCustomerMapRequest {
  id?: string;
  seller?: string;
  serialNumber?: string;
  notes?: string;
  color?: string;
  builderCustomerId: string;
  builderItemId: string;
  model?: string;
  billMaterialId: string;
  brand?: string;
  make?: string;
  name?: string;
  category?: string;
  builderItemFilesDtos?: BuilderItemFileDto[];
}

export interface UpdateBuilderCustomerMapResponse {
  success: boolean;
  message: string;
}

export interface SendConsentMailResponse {
  success: boolean;
  message: string;
  data?: unknown;
}

export interface BulkDeleteBuilderCustomerResponse {
  success: boolean;
  message: string;
  data?: unknown;
}

export const builderCustomerApi = api.injectEndpoints({
  endpoints: (build) => ({
    createBuilderCustomer: build.mutation<
      BuilderCustomerResponse,
      CreateBuilderCustomerRequest
    >({
      query: (data) => ({
        url: '/api/builder/customer',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['BuilderCustomer', 'CustomerDetails', 'Dashboard', 'Registration'],
    }),
    deleteBuilderCustomer: build.mutation<
      { success: boolean; message: string },
      string
    >({
      query: (id) => ({
        url: `/api/builder/customer/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['BuilderCustomer', 'CustomerDetails', 'Dashboard'],
    }),
    // Bulk delete builder customers: DELETE /api/builder/customer with body ["id1","id2",...]
    deleteBuilderCustomers: build.mutation<
      BulkDeleteBuilderCustomerResponse,
      string[]
    >({
      query: (ids) => ({
        url: '/api/builder/customer',
        method: 'DELETE',
        body: ids,
      }),
      invalidatesTags: ['BuilderCustomer', 'CustomerDetails', 'Dashboard'],
    }),
    updateBuilderCustomerMap: build.mutation<
      UpdateBuilderCustomerMapResponse,
      UpdateBuilderCustomerMapRequest
    >({
      queryFn: async (data) => {
        try {
          const formData = new FormData();
          if (data.id) formData.append('id', data.id);
          formData.append('builderCustomerId', data.builderCustomerId);
          formData.append('builderItemId', data.builderItemId);
          formData.append('billMaterialId', data.billMaterialId);
          if (data.seller) formData.append('seller', data.seller);
          if (data.serialNumber) formData.append('serialNumber', data.serialNumber);
          if (data.notes) formData.append('notes', data.notes);
          if (data.color) formData.append('color', data.color);
          if (data.model) formData.append('model', data.model);
          if (data.brand) formData.append('brand', data.brand);
          if (data.make) formData.append('make', data.make);
          if (data.name) formData.append('name', data.name);
          if (data.category) formData.append('category', data.category);
          if (data.builderItemFilesDtos?.length) {
            data.builderItemFilesDtos.forEach((fileDto, index) => {
              formData.append(`builderItemFilesDtos[${index}].type`, fileDto.type);
              formData.append(`builderItemFilesDtos[${index}].file`, fileDto.file);
              if (fileDto.id) formData.append(`builderItemFilesDtos[${index}].id`, fileDto.id);
            });
          }
          let authToken = '';
          try {
            const userData = localStorage.getItem('userData');
            if (userData) {
              const parsed = JSON.parse(userData);
              if (parsed.jwt) authToken = parsed.jwt;
            }
          } catch {
            // ignore
          }
          const response = await fetch(
            `${getApiBaseUrl()}/api/update/buildercustomermap`,
            {
              method: 'POST',
              headers: {
                Authorization: authToken ? `Bearer ${authToken}` : '',
              },
              body: formData,
            }
          );
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return {
              error: {
                status: response.status,
                data:
                  (errorData as { message?: string })?.message ||
                  `Failed to update builder customer map: ${response.statusText}`,
              } as FetchBaseQueryError,
            };
          }
          const result = await response.json();
          return { data: result };
        } catch (error) {
          return {
            error: {
              status: 'FETCH_ERROR',
              error: String(error),
            } as FetchBaseQueryError,
          };
        }
      },
      invalidatesTags: ['BuilderCustomer', 'CustomerDetails'],
    }),

    sendConsentMail: build.mutation<
      SendConsentMailResponse,
      { id: string }
    >({
      query: ({ id }) => ({
        url: `/api/builder-customer/${id}/send-consent-mail`,
        method: 'POST',
      }),
    }),

    // Project-section bulk action: flip selected (pre-handover) registrations to
    // SENT. Body is a plain array of ids, mirroring the bulk-delete endpoint.
    sendEntitlementBulk: build.mutation<BulkOperationResponse, string[]>({
      query: (ids) => ({
        url: '/api/builder/customers/send-entitlement',
        method: 'POST',
        body: ids,
      }),
      invalidatesTags: ['BuilderCustomer', 'CustomerDetails', 'Dashboard', 'Registration'],
    }),

    // Project-section bulk action: attach one item set to many registrations
    // (replace semantics; handed-over rows skipped server-side).
    bulkAttachItems: build.mutation<
      BulkOperationResponse,
      { customerIds: string[]; itemIds: string[] }
    >({
      query: (body) => ({
        url: '/api/builder/customeritem/bulk',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['BuilderCustomer', 'CustomerDetails', 'CustomerItem'],
    }),

    // Narrow inline edit (customer details / unit number / built-up area).
    // Only the provided fields are applied; locked once handed over.
    updateCustomerDetails: build.mutation<
      { success: boolean; message: string; data?: unknown },
      UpdateCustomerDetailsRequest
    >({
      query: ({ id, patch }) => ({
        url: `/api/builder/customer/${id}/details`,
        method: 'PATCH',
        body: patch,
      }),
      invalidatesTags: ['BuilderCustomer', 'CustomerDetails', 'Registration'],
    }),
  }),
});

export const {
  useCreateBuilderCustomerMutation,
  useDeleteBuilderCustomerMutation,
  useUpdateBuilderCustomerMapMutation,
  useSendConsentMailMutation,
  useDeleteBuilderCustomersMutation,
  useSendEntitlementBulkMutation,
  useBulkAttachItemsMutation,
  useUpdateCustomerDetailsMutation,
} = builderCustomerApi;
