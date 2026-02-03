/* eslint-disable @typescript-eslint/no-explicit-any */
import { api } from './apiSlice';
import type { 
  BuilderItem, 
  CreateBuilderItemRequest, 
  UpdateBuilderItemRequest,
  PaginatedResponse,
  PaginationParams,
  SearchParams
} from '@/lib/api/types.ts';

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

    // Create item
    createItem: build.mutation<BuilderItem, CreateBuilderItemRequest>({
      query: (data) => ({
        url: '/api/builder/item',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Item'],
    }),

    // Update item
    updateItem: build.mutation<BuilderItem, { id: string; data: UpdateBuilderItemRequest }>({
      query: ({ id, data }) => ({
        url: '/api/builder/item',
        method: 'POST',
        body: { ...data, id },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Item', id },
        'Item'
      ],
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

    // Get Bill of Materials from API
    getBillOfMaterials: build.query<{ success: boolean; message: string; data: Array<{ id: string; bomName: string; projectName: string }> }, void>({
      query: () => ({
        url: '/api/getbillofmaterials',
        method: 'GET',
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
  useDeleteBuilderItemFilesMutation,
} = itemsApi;
