import { api } from '@/store/api/apiSlice';

export interface Status {
  id: string;
  name: string;
  module: string;
}

export interface StatusByModuleResponse {
  success: boolean;
  message: string;
  data: Status[];
}

export const statusApi = api.injectEndpoints({
  endpoints: (build) => ({
    getStatusByModule: build.query<StatusByModuleResponse, { module: string }>({
      query: ({ module }) => ({
        url: `/api/status/bymodule?module=${module}`,
        method: 'GET',
      }),
      providesTags: ['Query'],
    }),
  }),
});

export const {
  useGetStatusByModuleQuery,
} = statusApi;
