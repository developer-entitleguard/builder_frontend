import { api } from './apiSlice';
import type {
  BuilderCustomerResponse,
  CreateBuilderCustomerRequest,
} from '@/lib/api/types';
import { getApiBaseUrl } from '@/lib/config';
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';

export interface BuilderItemFileDto {
  type: 'warranty' | 'Manual';
  file: File;
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
  }),
});

export const {
  useCreateBuilderCustomerMutation,
  useDeleteBuilderCustomerMutation,
  useUpdateBuilderCustomerMapMutation,
} = builderCustomerApi;
