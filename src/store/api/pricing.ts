import { api } from "./apiSlice";

/** Single pricing entry from GET /api/builder/projects/:projectId/pricing (data array element) */
export interface BuilderPricingEntry {
  id?: string;
  projectId?: string;
  totalEstimatedCost?: number;
  bufferPercentage?: number;
  bufferAmount?: number;
  marginPercentage?: number;
  marginAmount?: number;
  finalPrice?: number;
  createdAt?: string;
  updatedAt?: string;
  costItems?: Array<{
    id?: string;
    pricingId?: string;
    category?: string;
    name?: string;
    description?: string | null;
    unitRate?: number | null;
    quantity?: number;
    totalCost?: number;
    linkedActivityId?: string | null;
    isAiGenerated?: boolean;
    isModified?: boolean;
    aiAssumptions?: string | null;
    fromBom?: boolean;
    createdAt?: string;
    updatedAt?: string;
  }>;
}

export interface BuilderPricingResponse {
  success: boolean;
  message: string;
  data: BuilderPricingEntry[];
}

export const pricingApi = api.injectEndpoints({
  endpoints: (build) => ({
    // GET /api/builder/projects/:projectId/pricing
    getProjectPricing: build.query<
      BuilderPricingResponse,
      { projectId: string }
    >({
      query: ({ projectId }) => ({
        url: `/api/builder/projects/${projectId}/pricing`,
        method: "GET",
      }),
      providesTags: (_result, _error, { projectId }) => [
        { type: "ProjectPricing", id: projectId },
      ],
    }),
  }),
});

export const {
  useGetProjectPricingQuery,
  useLazyGetProjectPricingQuery,
} = pricingApi;
