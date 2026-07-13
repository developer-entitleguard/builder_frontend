/* eslint-disable @typescript-eslint/no-explicit-any */
import { api } from './apiSlice';
import type {
  BuilderItem,
  CreateBuilderItemRequest,
  UpdateBuilderItemRequest,
  PaginatedResponse,
  PaginationParams,
  SearchParams,
} from '@/lib/api/types.ts';
import { getApiBaseUrl } from '@/lib/config';
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';

type BuilderItemFileDtoLocal = {
  type: 'warranty' | 'Manual';
  file: File;
  id?: string;
};

type CreateItemWithFilesRequest = CreateBuilderItemRequest & {
  builderItemFilesDtos?: BuilderItemFileDtoLocal[];
};

type UpdateItemWithFilesRequest = UpdateBuilderItemRequest & {
  builderItemFilesDtos?: BuilderItemFileDtoLocal[];
};

export const itemsApi = api.injectEndpoints({
  endpoints: (build) => ({
    // Get all items with pagination
    getItems: build.query<PaginatedResponse<BuilderItem>, PaginationParams & SearchParams>({
      query: (params) => ({
        url: '/items',
        method: 'GET',
        params,
      }),
      providesTags: ['Item'],
    }),

    // Get item by ID
    getItem: build.query<BuilderItem, string>({
      query: (id) => ({
        url: `/items/${id}`,
        method: 'GET',
      }),
      providesTags: (result, error, id) => [{ type: 'Item', id }],
    }),

    // Create item (multipart/form-data, matches OLD /api/builder/item payload, extended with optional files)
    createItem: build.mutation<BuilderItem, CreateItemWithFilesRequest>({
      queryFn: async (data) => {
        try {
          const formData = new FormData();
          formData.append('name', data.name);
          formData.append('category', data.category);
          if (data.make) formData.append('make', data.make);
          if (data.brand) formData.append('brand', data.brand);
          if (data.model) formData.append('model', data.model);
          if (data.text) formData.append('text', data.text);
          formData.append('note', data.note ?? '');
          formData.append('price', data.price != null ? String(data.price) : '');
          if (data.documentationUrl) formData.append('documentationUrl', data.documentationUrl);
          if (data.purchaser) formData.append('purchaser', data.purchaser);
          if (data.supplierId) formData.append('supplierId', data.supplierId);
          if (data.warranty != null) {
            formData.append('warranty', String(data.warranty));
          }
          if (data.builderOrganizationId) {
            formData.append('builderOrganizationId', data.builderOrganizationId);
          }
          if (data.billMaterialId) {
            formData.append('billMaterialId', data.billMaterialId);
          }

          // Optional attached files: builderItemFilesDtos[0].type, builderItemFilesDtos[0].file
          if (data.builderItemFilesDtos?.length) {
            data.builderItemFilesDtos.forEach((fileDto, index) => {
              formData.append(`builderItemFilesDtos[${index}].type`, fileDto.type);
              formData.append(`builderItemFilesDtos[${index}].file`, fileDto.file);
              if (fileDto.id) {
                formData.append(`builderItemFilesDtos[${index}].id`, fileDto.id);
              }
            });
          }

          // JWT from localStorage
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

          const base = getApiBaseUrl();
          const url = base ? `${base}/api/builder/item` : '/api/builder/item';

          const response = await fetch(url, {
            method: 'POST',
            headers: {
              Authorization: authToken ? `Bearer ${authToken}` : '',
              // Do NOT set Content-Type; browser will set multipart boundary
            },
            body: formData,
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return {
              error: {
                status: response.status,
                data:
                  (errorData as { message?: string })?.message ||
                  `Failed to save item: ${response.statusText}`,
              } as FetchBaseQueryError,
            };
          }

          const result = await response.json();
          return { data: result as BuilderItem };
        } catch (error) {
          return {
            error: {
              status: 'FETCH_ERROR',
              error: String(error),
            } as FetchBaseQueryError,
          };
        }
      },
      invalidatesTags: ['Item'],
    }),

    // Update item (multipart/form-data, same endpoint as create)
    updateItem: build.mutation<
      BuilderItem,
      { id: string; data: UpdateItemWithFilesRequest & { builderOrganizationId?: string; billMaterialId?: string } }
    >({
      queryFn: async ({ id, data }) => {
        try {
          const formData = new FormData();
          formData.append('id', id);
          if (data.name) formData.append('name', data.name);
          if (data.category) formData.append('category', data.category);
          if (data.make) formData.append('make', data.make);
          if (data.brand) formData.append('brand', data.brand);
          if (data.model) formData.append('model', data.model);
          if (data.text || data.description) {
            formData.append('text', data.text ?? data.description ?? '');
          }
          if (data.note !== undefined) formData.append('note', data.note ?? '');
          if (data.price != null) formData.append('price', String(data.price));
          if (data.documentationUrl) formData.append('documentationUrl', data.documentationUrl);
          if (data.purchaser) formData.append('purchaser', data.purchaser);
          if (data.supplierId) formData.append('supplierId', data.supplierId);
          if (data.warranty != null) {
            formData.append('warranty', String(data.warranty));
          }
          if (data.builderOrganizationId) {
            formData.append('builderOrganizationId', data.builderOrganizationId);
          }
          if (data.billMaterialId) {
            formData.append('billMaterialId', data.billMaterialId);
          }

          // Optional attached files: builderItemFilesDtos[0].type, builderItemFilesDtos[0].file
          if (data.builderItemFilesDtos?.length) {
            data.builderItemFilesDtos.forEach((fileDto, index) => {
              formData.append(`builderItemFilesDtos[${index}].type`, fileDto.type);
              formData.append(`builderItemFilesDtos[${index}].file`, fileDto.file);
              if (fileDto.id) {
                formData.append(`builderItemFilesDtos[${index}].id`, fileDto.id);
              }
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

          const base = getApiBaseUrl();
          const url = base ? `${base}/api/builder/item` : '/api/builder/item';

          const response = await fetch(url, {
            method: 'POST',
            headers: {
              Authorization: authToken ? `Bearer ${authToken}` : '',
            },
            body: formData,
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return {
              error: {
                status: response.status,
                data:
                  (errorData as { message?: string })?.message ||
                  `Failed to update item: ${response.statusText}`,
              } as FetchBaseQueryError,
            };
          }

          const result = await response.json();
          return { data: result as BuilderItem };
        } catch (error) {
          return {
            error: {
              status: 'FETCH_ERROR',
              error: String(error),
            } as FetchBaseQueryError,
          };
        }
      },
      invalidatesTags: (result, error, { id }) => [{ type: 'Item', id }, 'Item'],
    }),

    // Delete item
    deleteItem: build.mutation<void, string>({
      query: (id) => ({
        url: `/api/builder/item/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Item'],
    }),

    // Toggle item status
    toggleItemStatus: build.mutation<BuilderItem, { id: string; isActive: boolean }>({
      query: ({ id, isActive }) => ({
        url: `/items/${id}/status`,
        method: 'PATCH',
        body: { is_active: isActive },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Item', id },
        'Item'
      ],
    }),

    // Get items by category
    getItemsByCategory: build.query<PaginatedResponse<BuilderItem>, { category: string } & PaginationParams>({
      query: ({ category, ...params }) => ({
        url: `/items/category/${category}`,
        method: 'GET',
        params,
      }),
      providesTags: ['Item'],
    }),

    // Get items by organization
    getItemsByOrganization: build.query<PaginatedResponse<BuilderItem>, { organizationId: string } & PaginationParams>({
      query: ({ organizationId, ...params }) => ({
        url: `/items/organization/${organizationId}`,
        method: 'GET',
        params,
      }),
      providesTags: ['Item'],
    }),

    getItemsByBuilder: build.query<{ success: boolean; message: string; data: Array<{ category: string; items: BuilderItem[] }> }, string>({
      query: (builderId) => ({
        url: `/api/builder/item`,
        method: 'GET',
        params: { builderId },
      }),
      providesTags: ['Item'],
    }),

    // Search items
    searchItems: build.query<PaginatedResponse<BuilderItem>, { query: string } & PaginationParams>({
      query: ({ query, ...params }) => ({
        url: '/items/search',
        method: 'GET',
        params: { ...params, q: query },
      }),
      providesTags: ['Item'],
    }),

    // Get categories
    getCategories: build.query<string[], void>({
      query: () => ({
        url: '/items/categories',
        method: 'GET',
      }),
      providesTags: ['Item'],
    }),

    // Get categories from API
    getCategorys: build.query<{ success: boolean; message: string; data: Array<{ id: string; name: string }> }, void>({
      query: () => ({
        url: '/api/getcategorys',
        method: 'GET',
      }),
      providesTags: ['Item'],
    }),

    // Get Bill of Materials from API (scoped by builderId)
    getBillOfMaterials: build.query<{
      success: boolean;
      message: string;
      data: Array<{ id: string; bomName: string; projectName: string }>;
    }, { builderId: string }>({
      query: ({ builderId }) => ({
        url: '/api/getbillofmaterials',
        method: 'GET',
        params: { builderId },
      }),
      providesTags: ['Item'],
    }),

    // Get Bill Materials (items) by billId
    getBillMaterials: build.query<{
      success: boolean;
      message: string;
      data: Array<{
        id: string;
        builderOrganization: {
          id: string;
          name: string;
          address: string;
          contact: string;
          email: string;
          abn: string | null;
          description: string;
          isActive: boolean;
        };
        billOfMaterials: {
          id: string;
          bomName: string;
          projectName: string;
        };
        name: string;
        category: string;
        make: string | null;
        brand: string | null;
        model: string | null;
        text: string | null;
        note: string | null;
        price: string | null;
        documentationUrl: string | null;
        isActive: boolean;
        status: string;
        purchaser: string | null;
      }>;
    }, string>({
      query: (billId) => ({
        url: '/api/getbillmaterials',
        method: 'GET',
        params: { billId },
      }),
      providesTags: ['Item'],
    }),

    // Get builder items by BOM and customer ID
    getBuilderItemsByBOM: build.query<{
      success: boolean;
      message: string;
      data: Array<{
        id: string;
        builderItem: {
          id: string;
          name: string;
          category: string;
          make: string | null;
          brand: string | null;
          model: string | null;
          text: string | null;
          note: string | null;
          price: string | null;
          documentationUrl: string | null;
          isActive: boolean;
          status: string;
        };
        seller: string | null;
        serialNumber: string | null;
        make: string | null;
        model: string | null;
        brand: string | null;
        color: string | null;
        notes: string | null;
        files: unknown;
        builderCustomerItemFiles?: Array<{
          id: string; // id used for delete (/api/itemfile/{id})
          type: 'warranty' | 'Manual' | string;
          files: {
            id: string;
            name: string;
            type: string;
            fileType: string;
            filePath: string;
          };
        }>;
      }>;
    }, { billMaterialId: string; customerId: string }>({
      query: (params) => ({
        url: '/api/getbuilderitems/bybom',
        method: 'GET',
        params,
      }),
      providesTags: ['Item'],
    }),

    // Bulk update items
    bulkUpdateItems: build.mutation<BuilderItem[], { updates: Array<{ id: string; data: UpdateBuilderItemRequest }> }>({
      query: (data) => ({
        url: '/items/bulk',
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Item'],
    }),

    // Import items
    importItems: build.mutation<{ message: string; imported_count: number; errors: any[] }, File>({
      query: (file) => {
        const formData = new FormData();
        formData.append('file', file);
        
        return {
          url: '/items/import',
          method: 'POST',
          body: formData,
        };
      },
      invalidatesTags: ['Item'],
    }),

    // Assign BOM to customers
    // Check BOM restrictions for customers
    checkBOMRestrictions: build.query<{
      success: boolean;
      message: string;
      data: Array<{ customerId: string; customerName: string }>;
    }, { customerIds: string[] }>({
      query: ({ customerIds }) => {
        const params = new URLSearchParams();
        customerIds.forEach(id => {
          params.append('customerId', id);
        });
        return {
          url: `/api/checking/bomrestrict?${params.toString()}`,
          method: 'GET',
        };
      },
    }),

    assignBOM: build.mutation<{ success: boolean; message?: string }, { billOfMaterialId: string; customerIds: string[] }>({
      query: (data) => ({
        url: '/api/add/assignbom',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Item', 'Registration', 'Dashboard'],
    }),

    deleteBuilderItemFiles: build.mutation<{ success: boolean; message?: string }, string>({
      query: (id) => ({
        url: `/api/delete/builderitem/files/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Item'],
    }),
    // DELETE /api/itemfile/{id} - delete a single item file by id
    deleteItemFile: build.mutation<{ success: boolean; message?: string }, string>({
      query: (id) => ({
        url: `/api/itemfile/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Item', 'CustomerDetails'],
    }),
    checkExistingCustomerItemMap: build.query<{
      success: boolean;
      message: string;
      data: Array<{
        id: string;
        billOfMaterials?: { id: string; bomName?: string; projectName?: string };
        builderItem: null;
        name: string | null;
        category: string | null;
        seller: string | null;
        serialNumber: string | null;
        make: string | null;
        model: string | null;
        brand: string | null;
        color: string | null;
        notes: string | null;
        files: unknown;
        builderCustomerItemFiles?: Array<{
          id: string;
          type: string;
          files: {
            id: string;
            name: string;
            type: string;
            fileType: string;
            filePath: string;
          };
        }>;
      }>;
    }, string>({
      query: (customerId) => ({
        url: '/api/check/customeritemmap/existing',
        method: 'GET',
        params: { customerId },
      }),
    }),
  }),
});

export const {
  useGetItemsQuery,
  useGetItemQuery,
  useCreateItemMutation,
  useUpdateItemMutation,
  useDeleteItemMutation,
  useToggleItemStatusMutation,
  useGetItemsByCategoryQuery,
  useGetItemsByOrganizationQuery,
  useGetItemsByBuilderQuery,
  useLazySearchItemsQuery,
  useGetCategoriesQuery,
  useGetCategorysQuery,
  useGetBillOfMaterialsQuery,
  useGetBillMaterialsQuery,
  useGetBuilderItemsByBOMQuery,
  useLazyGetBuilderItemsByBOMQuery,
  useBulkUpdateItemsMutation,
  useImportItemsMutation,
  useCheckBOMRestrictionsQuery,
  useLazyCheckBOMRestrictionsQuery,
  useAssignBOMMutation,
  useCheckExistingCustomerItemMapQuery,
  useLazyCheckExistingCustomerItemMapQuery,
  useDeleteBuilderItemFilesMutation,
  useDeleteItemFileMutation,
} = itemsApi;
