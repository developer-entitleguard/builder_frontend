import { api } from './apiSlice';

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
    getStatusesByModule: build.query<
      StatusResponse,
      { module: string }
    >({
      query: ({ module }) => ({
        url: `/api/status/bymodule`,
        method: 'GET',
        params: { module },
      }),
      providesTags: ['Query'],
    }),
  }),
});

export const {
  useGetStatusesByModuleQuery,
  useLazyGetStatusesByModuleQuery,
} = statusApi;
