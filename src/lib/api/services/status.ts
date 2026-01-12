import { api } from '@/store/api/apiSlice';

export interface Status {
  id: string;
  name: string;
  module: string;
}

export interface StatusResponse {
  success: boolean;
  message: string;
  data: Status[];
}

export const statusApi = api.injectEndpoints({
  endpoints: (build) => ({
    getStatusesByModule: build.query<StatusResponse, { module: string }>({
      query: ({ module }) => ({
        url: `/api/status/bymodule?module=${module}`,
        method: 'GET',
      }),
      providesTags: ['Query'],
    }),
  }),
});

export const {
  useGetStatusesByModuleQuery,
  useLazyGetStatusesByModuleQuery,
} = statusApi;
