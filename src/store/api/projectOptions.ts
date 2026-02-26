import { api } from './apiSlice';

export interface TopographyType {
  id: string;
  topographyTypeText: string;
  multiplier: number;
  createdAt: string;
  updatedAt: string | null;
}

export interface TopographyTypesResponse {
  success: boolean;
  message: string;
  data: TopographyType[];
}

export interface BalRating {
  id: string;
  balRatingText: string;
  multiplier: number;
  createdAt: string;
  updatedAt: string | null;
}

export interface BalRatingsResponse {
  success: boolean;
  message: string;
  data: BalRating[];
}

export const projectOptionsApi = api.injectEndpoints({
  endpoints: (build) => ({
    getTopographyTypes: build.query<TopographyTypesResponse, void>({
      query: () => ({
        url: '/api/builder/topography_types',
        method: 'GET',
      }),
    }),
    getBalRatings: build.query<BalRatingsResponse, void>({
      query: () => ({
        url: '/api/builder/bal_ratings',
        method: 'GET',
      }),
    }),
  }),
});

export const {
  useGetTopographyTypesQuery,
  useGetBalRatingsQuery,
} = projectOptionsApi;
