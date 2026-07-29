import { api } from './apiSlice';
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

export interface BuilderQuery {
  id: string;
  title: string;
  description: string;
  priorityLevel: string;
  vendor: { id: string; name: string; email?: string; contact?: string; type?: string } | null;
  dueDate: string;
  status: QueryStatus;
  customerName?: string | null;
  customerAddress?: string | null;
  customerCity?: string | null;
  customerState?: string | null;
  customerZip?: string | null;
  ownerUserId?: string | null;
  ownerName?: string | null;
  ownerInitials?: string | null;
  /** Decoupling: builder that built this query's registration (dev sees who should work it). */
  responsibleBuilderName?: string | null;
  createdAt?: string;
  updatedAt: string | null;
  queryFileMaps: QueryFile[];
  queryComments?: QueryComment[];
  orderItem?: unknown;
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

export interface CreateBuilderQueryRequest {
  builderCustomerId: string;
  builderCustomerItemMapId?: string;
  title: string;
  description: string;
  priorityLevel?: string;
  dueDate?: string;
  userId?: string;
}

export interface RegistrationItem {
  id: string;
  name: string;
  brand: string;
  make: string;
  model: string;
  category: string;
}

export interface VendorLinkData {
  link: string;
  vendorName: string;
  vendorContact: string;
}

export interface VendorLinkResponse {
  success: boolean;
  message: string;
  data: VendorLinkData;
}

export interface RegistrationItemsResponse {
  success: boolean;
  message: string;
  data: RegistrationItem[];
}

export interface UpdateQueryRequest {
  id: string;
  statusId?: string;
  vendorId?: string;
  vendorNumber?: string;
  priorityLevel?: string;
  dueDate?: string;
  userId?: string;
  ownerUserId?: string;
  queryFileMapDto?: QueryFileMapDto[];
}

export interface OwnerOption {
  id: string;
  firstName: string | null;
  lastName: string | null;
  name: string | null;
  initials: string | null;
  role: string | null;
}

export interface EligibleOwnersResponse {
  success: boolean;
  message: string;
  data: OwnerOption[];
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

export interface CreateBuilderQueryResponse {
  success: boolean;
  message: string;
  data?: { queryId: string };
}

export interface AddCommentResponse {
  success: boolean;
  message: string;
}

export const queryApi = api.injectEndpoints({
  endpoints: (build) => ({
    getBuilderQueries: build.query<
      BuilderQueriesResponse,
      { builderId: string; statusId?: string }
    >({
      query: ({ builderId, statusId }) => ({
        url: '/api/builder/query',
        method: 'GET',
        params: { builderId, ...(statusId ? { statusId } : {}) },
      }),
      providesTags: ['Query'],
    }),
    getQueryById: build.query<BuilderQueryResponse, { id: string }>({
      query: ({ id }) => ({
        url: `/api/query/id`,
        method: 'GET',
        params: { id },
      }),
      providesTags: (result, error, { id }) => [{ type: 'Query', id }],
    }),
    updateQuery: build.mutation<UpdateQueryResponse, UpdateQueryRequest>({
      queryFn: async (data) => {
        try {
          const formData = new FormData();
          formData.append('id', data.id);
          if (data.statusId) formData.append('statusId', data.statusId);
          if (data.vendorId) formData.append('vendorId', data.vendorId);
          if (data.vendorNumber) formData.append('vendorNumber', data.vendorNumber);
          if (data.priorityLevel) formData.append('priorityLevel', data.priorityLevel);
          if (data.dueDate) formData.append('dueDate', data.dueDate);
          if (data.userId !== undefined && data.userId !== null) {
            formData.append('userId', String(data.userId));
          }
          if (data.ownerUserId !== undefined && data.ownerUserId !== null) {
            formData.append('ownerUserId', String(data.ownerUserId));
          }
          if (data.queryFileMapDto?.length) {
            data.queryFileMapDto.forEach((fileDto, index) => {
              formData.append(`queryFileMapDto[${index}].type`, fileDto.type);
              formData.append(`queryFileMapDto[${index}].files`, fileDto.files);
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
          const url = base ? `${base}/api/query` : '/api/query';
          const result = await fetch(url, {
            method: 'POST',
            headers: { Authorization: authToken ? `Bearer ${authToken}` : '' },
            body: formData,
          });
          if (!result.ok) {
            const errorData = await result.json().catch(() => ({}));
            return {
              error: {
                status: result.status,
                data:
                  (errorData as { message?: string })?.message ||
                  `Failed to update query: ${result.statusText}`,
              } as FetchBaseQueryError,
              data: undefined as never,
            };
          }
          const response = await result.json();
          return { data: response };
        } catch (error) {
          return {
            error: {
              status: 'FETCH_ERROR',
              data:
                error instanceof Error ? error.message : 'An unknown error occurred',
            } as FetchBaseQueryError,
            data: undefined as never,
          };
        }
      },
      invalidatesTags: ['Query'],
    }),
    createBuilderQuery: build.mutation<CreateBuilderQueryResponse, CreateBuilderQueryRequest>({
      query: (data) => ({
        url: '/api/builder/query/create',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Query'],
    }),
    getEligibleOwners: build.query<EligibleOwnersResponse, { builderId: string }>({
      query: ({ builderId }) => ({
        url: '/api/builder/query/owners',
        method: 'GET',
        params: { builderId },
      }),
    }),
    getVendorLink: build.query<VendorLinkResponse, { queryId: string }>({
      query: ({ queryId }) => ({
        url: '/api/builder/query/vendor-link',
        method: 'GET',
        params: { queryId },
      }),
    }),
    getRegistrationItems: build.query<RegistrationItemsResponse, { builderCustomerId: string }>({
      query: ({ builderCustomerId }) => ({
        url: '/api/builder/registrations/items',
        method: 'GET',
        params: { builderCustomerId },
      }),
    }),
  }),
});

export const {
  useGetBuilderQueriesQuery,
  useLazyGetQueryByIdQuery,
  useUpdateQueryMutation,
  useCreateBuilderQueryMutation,
  useLazyGetVendorLinkQuery,
  useGetRegistrationItemsQuery,
  useLazyGetRegistrationItemsQuery,
  useGetEligibleOwnersQuery,
} = queryApi;
