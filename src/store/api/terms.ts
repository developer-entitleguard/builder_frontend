import { api } from './apiSlice';

interface TermsStatusResponse {
  success: boolean;
  message: string;
  data: {
    acceptedLatestVersion: boolean;
    lastAcceptedVersionId: string | null;
  };
}

interface TermsLatestResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    content: string;
    effectiveDate?: string;
    createdAt?: string;
    updatedAt?: string | null;
  };
}

interface AcceptTermsRequest {
  versionId: string;
}

interface AcceptTermsResponse {
  success: boolean;
  message: string;
}

export const termsApi = api.injectEndpoints({
  endpoints: (build) => ({
    getBuilderTermsStatus: build.query<TermsStatusResponse, void>({
      query: () => ({
        url: '/api/builder/terms/status',
        method: 'GET',
      }),
    }),
    getLatestTerms: build.query<TermsLatestResponse, void>({
      query: () => ({
        url: '/api/terms/latest',
        method: 'GET',
      }),
    }),
    acceptBuilderTerms: build.mutation<AcceptTermsResponse, AcceptTermsRequest>({
      query: (body) => ({
        url: '/api/builder/terms/accept',
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const {
  useGetBuilderTermsStatusQuery,
  useLazyGetBuilderTermsStatusQuery,
  useGetLatestTermsQuery,
  useLazyGetLatestTermsQuery,
  useAcceptBuilderTermsMutation,
} = termsApi;

