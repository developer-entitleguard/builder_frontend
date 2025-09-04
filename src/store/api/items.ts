/* eslint-disable @typescript-eslint/no-explicit-any */
import { api } from './apiSlice';
import type { 
  BuilderItem, 
  CreateBuilderItemRequest, 
  UpdateBuilderItemRequest,
  PaginatedResponse,
  PaginationParams,
  SearchParams
} from '@/lib/api/types';

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
        url: '/items',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Item'],
    }),

    // Update item
    updateItem: build.mutation<BuilderItem, { id: string; data: UpdateBuilderItemRequest }>({
      query: ({ id, data }) => ({
        url: `/items/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Item', id },
        'Item'
      ],
    }),

    // Delete item
    deleteItem: build.mutation<void, string>({
      query: (id) => ({
        url: `/items/${id}`,
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
  useLazySearchItemsQuery,
  useGetCategoriesQuery,
  useBulkUpdateItemsMutation,
  useImportItemsMutation,
} = itemsApi;
