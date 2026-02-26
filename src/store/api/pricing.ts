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
  // Some backends may inline cost items on the pricing entry
  costItems?: BuilderPricingCostItem[];
}

/** Single cost item used by /api/builder/pricing/:pricingId/cost-items endpoints */
export interface BuilderPricingCostItem {
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
}

export interface BuilderPricingResponse {
  success: boolean;
  message: string;
  data: BuilderPricingEntry[];
}

export interface CreateProjectPricingResponse {
  success: boolean;
  message: string;
  data: {
    pricingId: string;
  };
}

export interface GenerateProjectPricingResponse {
  success: boolean;
  message: string;
  data?: unknown;
}

export interface BuilderPricingCostItemsResponse {
  success: boolean;
  message: string;
  data: BuilderPricingCostItem[];
}

export interface BuilderPricingCostItemResponse {
  success: boolean;
  message: string;
  data: BuilderPricingCostItem;
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

    // GET /api/builder/pricing/:pricingId/cost-items
    getPricingCostItems: build.query<
      BuilderPricingCostItemsResponse,
      { pricingId: string }
    >({
      query: ({ pricingId }) => ({
        url: `/api/builder/pricing/${pricingId}/cost-items`,
        method: "GET",
      }),
      providesTags: (_result, _error, { pricingId }) => [
        { type: "ProjectPricing", id: `cost-items-${pricingId}` },
      ],
    }),

    // GET /api/builder/pricing/:pricingId/cost-items/:id
    getPricingCostItemById: build.query<
      BuilderPricingCostItemResponse,
      { pricingId: string; id: string }
    >({
      query: ({ pricingId, id }) => ({
        url: `/api/builder/pricing/${pricingId}/cost-items/${id}`,
        method: "GET",
      }),
      providesTags: (_result, _error, { pricingId, id }) => [
        { type: "ProjectPricing", id: `cost-items-${pricingId}` },
        { type: "ProjectPricing", id: `cost-item-${id}` },
      ],
    }),

    // POST /api/builder/pricing/:pricingId/cost-items
    createPricingCostItems: build.mutation<
      BuilderPricingCostItemsResponse,
      { pricingId: string; items: BuilderPricingCostItem[] }
    >({
      query: ({ pricingId, items }) => ({
        url: `/api/builder/pricing/${pricingId}/cost-items`,
        method: "POST",
        body: items,
      }),
      invalidatesTags: (_result, _error, { pricingId }) => [
        { type: "ProjectPricing", id: `cost-items-${pricingId}` },
      ],
    }),

    // POST /api/builder/projects/:projectId/pricing
    createProjectPricing: build.mutation<
      CreateProjectPricingResponse,
      { projectId: string }
    >({
      query: ({ projectId }) => ({
        url: `/api/builder/projects/${projectId}/pricing`,
        method: "POST",
      }),
    }),

    // POST /api/builder/projects/:projectId/pricing/:pricingId/generate
    generateProjectPricing: build.mutation<
      GenerateProjectPricingResponse,
      { projectId: string; pricingId: string }
    >({
      query: ({ projectId, pricingId }) => ({
        url: `/api/builder/projects/${projectId}/pricing/${pricingId}/generate`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: "ProjectPricing", id: projectId },
      ],
    }),

    // PUT /api/builder/pricing/:pricingId/cost-items/:id
    updatePricingCostItem: build.mutation<
      BuilderPricingCostItemResponse,
      { pricingId: string; id: string; item: BuilderPricingCostItem }
    >({
      query: ({ pricingId, id, item }) => ({
        url: `/api/builder/pricing/${pricingId}/cost-items/${id}`,
        method: "PUT",
        body: item,
      }),
      invalidatesTags: (_result, _error, { pricingId, id }) => [
        { type: "ProjectPricing", id: `cost-items-${pricingId}` },
        { type: "ProjectPricing", id: `cost-item-${id}` },
      ],
    }),
  }),
});

export const {
  useGetProjectPricingQuery,
  useLazyGetProjectPricingQuery,
  useGetPricingCostItemsQuery,
  useLazyGetPricingCostItemsQuery,
  useGetPricingCostItemByIdQuery,
  useCreatePricingCostItemsMutation,
  useUpdatePricingCostItemMutation,
  useCreateProjectPricingMutation,
  useGenerateProjectPricingMutation,
} = pricingApi;
