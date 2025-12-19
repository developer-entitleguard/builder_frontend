import { api } from '@/store/api/apiSlice';
import type { 
  BuilderCustomer,
  CreateBuilderCustomerRequest,
  BuilderCustomerResponse
} from '@/lib/api/types.ts';
import { FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { getApiBaseUrl } from '@/lib/config';

export interface BuilderItemFileDto {
  type: 'Warranty' | 'Manual';
  file: File;
}

export interface UpdateBuilderCustomerMapRequest {
  id?: string; // Optional for creating new items
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
  builderItemFilesDtos?: BuilderItemFileDto[];
}

export interface UpdateBuilderCustomerMapResponse {
  success: boolean;
  message: string;
}

export const builderCustomerApi = api.injectEndpoints({
  endpoints: (build) => ({
    createBuilderCustomer: build.mutation<BuilderCustomerResponse, CreateBuilderCustomerRequest>({
      query: (data) => ({
        url: '/api/builder/customer',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['BuilderCustomer', 'CustomerDetails', 'Dashboard', 'Registration'],
    }),
    deleteBuilderCustomer: build.mutation<{ success: boolean; message: string }, string>({
      query: (id) => ({
        url: `/api/builder/customer/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['BuilderCustomer', 'CustomerDetails', 'Dashboard'],
    }),
    updateBuilderCustomerMap: build.mutation<UpdateBuilderCustomerMapResponse, UpdateBuilderCustomerMapRequest>({
      queryFn: async (data, _queryApi, _extraOptions, baseQuery) => {
        try {
          // Create FormData
          const formData = new FormData();
          
          // Add all the basic fields
          // Only append id if it's provided (for updates, not for new items)
          if (data.id) {
            formData.append('id', data.id);
          }
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
          
          // Add files in the format builderItemFilesDtos[0].type and builderItemFilesDtos[0].file
          if (data.builderItemFilesDtos && data.builderItemFilesDtos.length > 0) {
            data.builderItemFilesDtos.forEach((fileDto, index) => {
              formData.append(`builderItemFilesDtos[${index}].type`, fileDto.type);
              formData.append(`builderItemFilesDtos[${index}].file`, fileDto.file);
            });
          }

          // Get JWT token from localStorage
          const userData = localStorage.getItem('userData');
          let authToken = '';
          if (userData) {
            try {
              const parsedData = JSON.parse(userData);
              if (parsedData.jwt) {
                authToken = parsedData.jwt;
              }
            } catch (error) {
              console.warn('Failed to parse userData:', error);
            }
          }

          // Make the request
          const response = await fetch(`${getApiBaseUrl()}/api/update/buildercustomermap`, {
            method: 'POST',
            headers: {
              'Authorization': authToken ? `Bearer ${authToken}` : '',
            },
            body: formData,
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return {
              error: {
                status: response.status,
                data: errorData.message || `Failed to update builder customer map: ${response.statusText}`,
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
