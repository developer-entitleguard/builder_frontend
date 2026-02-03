import { api } from '@/store/api/apiSlice';
import { getApiBaseUrl } from '@/lib/config';
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';

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

export interface QueryComment {
  id: string;
  commentedBy: string;
  comment: string;
  createdAt: string;
  isActive: boolean;
}

export interface QueryHistoryEntry {
  id: string;
  status: QueryStatus;
  changedAt: string;
  customer: unknown | null;
  userInfo: unknown | null;
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
    contact?: string;
    type?: string;
  } | null;
  dueDate: string;
  status: QueryStatus;
  createdAt?: string;
  updatedAt: string | null;
  queryFileMaps: QueryFile[];
  queryComments?: QueryComment[];
  queryhistory?: QueryHistoryEntry[];
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

export interface QueryFileMapDto {
  type: string;
  files: File;
}

export interface UpdateQueryRequest {
  id: string;
  statusId?: string;
  vendorId?: string;
  vendorNumber?: string;
  priorityLevel?: string;
  dueDate?: string;
  userId?: string;
  queryFileMapDto?: QueryFileMapDto[];
}

export interface UpdateQueryResponse {
  success: boolean;
  message: string;
  data?: BuilderQuery;
}

export interface AddCommentRequest {
  comment: string;
  commentedBy: string;
  id: string;
  queryId: string;
}

export interface AddCommentResponse {
  success: boolean;
  message: string;
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
      queryFn: async (data, _queryApi, _extraOptions, baseQuery) => {
        try {
          const formData = new FormData();
          
          // Add required fields: id, statusId, vendorId, priorityLevel, dueDate, userId
          formData.append('id', data.id);
          
          if (data.statusId) {
            formData.append('statusId', data.statusId);
          }
          if (data.vendorId) {
            formData.append('vendorId', data.vendorId);
          }
          if (data.vendorNumber) {
            formData.append('vendorNumber', data.vendorNumber);
          }
          if (data.priorityLevel) {
            formData.append('priorityLevel', data.priorityLevel);
          }
          if (data.dueDate) {
            formData.append('dueDate', data.dueDate);
          }
          // Always append userId if provided (even if empty string to ensure it's sent)
          if (data.userId !== undefined && data.userId !== null) {
            const userIdValue = String(data.userId);
            formData.append('userId', userIdValue);
            console.log('Appending userId to FormData:', userIdValue);
          } else {
            console.warn('userId is undefined or null, not appending to FormData. Data received:', { 
              id: data.id, 
              statusId: data.statusId, 
              vendorId: data.vendorId,
              priorityLevel: data.priorityLevel,
              dueDate: data.dueDate,
              userId: data.userId 
            });
          }
          
          // Add file data in the format queryFileMapDto[0].type and queryFileMapDto[0].files
          if (data.queryFileMapDto && data.queryFileMapDto.length > 0) {
            data.queryFileMapDto.forEach((fileDto, index) => {
              formData.append(`queryFileMapDto[${index}].type`, fileDto.type);
              formData.append(`queryFileMapDto[${index}].files`, fileDto.files);
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

          const apiBaseUrl = getApiBaseUrl();
          const url = import.meta.env.DEV
            ? '/api/query'
            : `${apiBaseUrl}/api/query`;

          // Make the request with FormData
          const result = await fetch(url, {
            method: 'POST',
            headers: {
              'Authorization': authToken ? `Bearer ${authToken}` : '',
              // Don't set Content-Type - let browser set it with boundary for FormData
            },
            body: formData,
          });

          if (!result.ok) {
            const errorData = await result.json().catch(() => ({}));
            return {
              error: {
                status: result.status,
                data: errorData.message || `Failed to update query: ${result.statusText}`,
              } as FetchBaseQueryError,
            };
          }

          const response = await result.json();
          return { data: response };
        } catch (error) {
          return {
            error: {
              status: 'FETCH_ERROR',
              data: error instanceof Error ? error.message : 'An unknown error occurred',
            } as FetchBaseQueryError,
          };
        }
      },
      invalidatesTags: ['Query'],
    }),
    // Add comment to query
    addQueryComment: build.mutation<
      AddCommentResponse,
      AddCommentRequest
    >({
      query: (data) => {
        const formData = new FormData();
        formData.append('comment', data.comment);
        formData.append('commentedBy', data.commentedBy);
        formData.append('id', data.id);
        formData.append('queryId', data.queryId);
        
        return {
          url: '/api/querycomment',
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
  useAddQueryCommentMutation,
} = queryApi;

