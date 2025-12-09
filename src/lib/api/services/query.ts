import { api } from '@/store/api/apiSlice';

export interface QueryFile {
  id: string;
  type: string;
  files: {
    id: string;
    name: string;
    type: string;
    fileType: string;
    filePath: string;
  };
}

export interface QueryStatus {
  id: string;
  name: string;
  module: string;
}

export interface BuilderQuery {
  id: string;
  title: string;
  description: string;
  priorityLevel: string;
  vendor: {
    id: string;
    name: string;
    email?: string;
  } | null;
  dueDate: string;
  status: QueryStatus;
  updatedAt: string | null;
  queryFileMaps: QueryFile[];
  orderItem?: {
    id: string;
    order?: {
      id: string;
      customerSourceMap?: {
        customer?: {
          id: string;
          name: string;
          email: string;
          contact: string;
          address?: {
            id: string;
            apt: string | null;
            street: string | null;
            city: string | null;
            state: string | null;
            zipCode: string | null;
            country: string | null;
          };
        };
        source?: {
          name: string;
          email: string;
        };
      };
      property?: string;
      createdAt?: string;
      shipToAddress?: {
        id: string;
        apt: string | null;
        street: string | null;
        city: string | null;
        state: string | null;
        zipCode: string | null;
        country: string | null;
      };
    };
    productName?: string;
    sku?: string;
    brand?: string;
  };
}

export interface BuilderQueriesResponse {
  success: boolean;
  message: string;
  data: BuilderQuery[];
}

export interface BuilderQueryResponse {
  success: boolean;
  message: string;
  data: BuilderQuery;
}

export interface UpdateQueryRequest {
  id: string;
  statusId?: string;
  vendorId?: string;
}

export interface UpdateQueryResponse {
  success: boolean;
  message: string;
  data?: BuilderQuery;
}

export const queryApi = api.injectEndpoints({
  endpoints: (build) => ({
    // Get builder queries by builder and optional status
    getBuilderQueries: build.query<
      BuilderQueriesResponse,
      { builderId: string; statusId?: string }
    >({
      query: ({ builderId, statusId }) => ({
        url: '/api/builder/query',
        method: 'GET',
        params: {
          builderId,
          ...(statusId ? { statusId } : {}),
        },
      }),
      providesTags: ['Query'],
    }),
    // Get single query by ID
    getQueryById: build.query<
      BuilderQueryResponse,
      { id: string }
    >({
      query: ({ id }) => ({
        url: `/api/query/id?id=${id}`,
        method: 'GET',
      }),
      providesTags: (result, error, { id }) => [{ type: 'Query', id }],
    }),
    // Update/Assign query
    updateQuery: build.mutation<
      UpdateQueryResponse,
      UpdateQueryRequest
    >({
      query: (data) => {
        const formData = new FormData();
        
        // Add only required fields: id, statusId, vendorId
        formData.append('id', data.id);
        
        if (data.statusId) {
          formData.append('statusId', data.statusId);
        }
        if (data.vendorId) {
          formData.append('vendorId', data.vendorId);
        }
        
        return {
          url: '/api/query',
          method: 'POST',
          body: formData,
        };
      },
      invalidatesTags: ['Query'],
    }),
  }),
});

export const {
  useGetBuilderQueriesQuery,
  useLazyGetQueryByIdQuery,
  useUpdateQueryMutation,
} = queryApi;

