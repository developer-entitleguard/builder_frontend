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
        };
        source?: {
          name: string;
          email: string;
        };
      };
      property?: string;
      createdAt?: string;
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
  }),
});

export const {
  useGetBuilderQueriesQuery,
} = queryApi;

