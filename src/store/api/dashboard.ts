/* eslint-disable @typescript-eslint/no-explicit-any */
import { api } from './apiSlice';
import type { 
  DashboardStats, 
  RecentActivity, 
  FilterOptions,
  DashboardCountResponse,
  CustomerListResponse
} from '@/lib/api/types.ts';

export const dashboardApi = api.injectEndpoints({
  endpoints: (build) => ({
    // Get dashboard statistics
    getDashboardStats: build.query<DashboardStats, { organizationId?: string }>({
      query: (params) => ({
        url: '/dashboard/stats',
        method: 'GET',
        params,
      }),
      providesTags: ['Dashboard'],
    }),

    // Get dashboard counts
    getDashboardCount: build.query<DashboardCountResponse, { builderId: string }>({
      query: (params) => ({
        url: '/api/dashboard/count',
        method: 'GET',
        params,
      }),
      providesTags: ['Dashboard'],
    }),

    // Get customer list for dashboard
    getCustomerList: build.query<CustomerListResponse, { builderId: string }>({
      query: (params) => ({
        url: '/api/dashboard/customerlist',
        method: 'GET',
        params,
      }),
      providesTags: ['Dashboard'],
    }),

    // Get recent activities
    getRecentActivities: build.query<RecentActivity[], { limit?: number; organizationId?: string }>({
      query: (params) => ({
        url: '/dashboard/activities',
        method: 'GET',
        params,
      }),
      providesTags: ['Dashboard'],
    }),

    // Get filter options
    getFilterOptions: build.query<FilterOptions, void>({
      query: () => ({
        url: '/dashboard/filters',
        method: 'GET',
      }),
      providesTags: ['Dashboard'],
    }),

    // Get registration trends
    getRegistrationTrends: build.query<any, { period: 'week' | 'month' | 'year'; organizationId?: string }>({
      query: (params) => ({
        url: '/dashboard/trends/registrations',
        method: 'GET',
        params,
      }),
      providesTags: ['Dashboard'],
    }),

    // Get query trends
    getQueryTrends: build.query<any, { period: 'week' | 'month' | 'year'; organizationId?: string }>({
      query: (params) => ({
        url: '/dashboard/trends/queries',
        method: 'GET',
        params,
      }),
      providesTags: ['Dashboard'],
    }),

    // Get performance metrics
    getPerformanceMetrics: build.query<any, { organizationId?: string }>({
      query: (params) => ({
        url: '/dashboard/performance',
        method: 'GET',
        params,
      }),
      providesTags: ['Dashboard'],
    }),

    // Get alerts
    getAlerts: build.query<any[], { organizationId?: string }>({
      query: (params) => ({
        url: '/dashboard/alerts',
        method: 'GET',
        params,
      }),
      providesTags: ['Dashboard'],
    }),

    // Mark alert as read
    markAlertAsRead: build.mutation<void, string>({
      query: (alertId) => ({
        url: `/dashboard/alerts/${alertId}/read`,
        method: 'PATCH',
      }),
      invalidatesTags: ['Dashboard'],
    }),

    // Get widgets configuration
    getWidgetsConfig: build.query<any, void>({
      query: () => ({
        url: '/dashboard/widgets',
        method: 'GET',
      }),
      providesTags: ['Dashboard'],
    }),

    // Update widgets configuration
    updateWidgetsConfig: build.mutation<any, any>({
      query: (config) => ({
        url: '/dashboard/widgets',
        method: 'PATCH',
        body: config,
      }),
      invalidatesTags: ['Dashboard'],
    }),
    getRegistrations: build.query<any, { builderId: string; type: 'owner' | 'project' }>({
      query: (params) => ({
        url: '/api/dashboard/getregistrations',
        method: 'GET',
        params,
      }),
      providesTags: ['Dashboard', 'Registration'],
    }),

    // Get statuses by type
    getStatusesByType: build.query<{ success: boolean; message: string; data: Array<{ id: string; name: string; module: string }> }, { type: string }>({
      query: (params) => ({
        url: '/api/getstatus/bytype',
        method: 'GET',
        params,
      }),
      providesTags: ['Dashboard'],
    }),

    // Get statuses by module (e.g., QUERY)
    getStatus: build.query<{ success: boolean; message: string; data: Array<{ id: string; name: string; module: string }> }, { module: string }>({
      query: (params) => ({
        url: '/api/status/bymodule',
        method: 'GET',
        params,
      }),
      providesTags: ['Dashboard'],
    }),

    // Get builder queries by builder and optional status
    getBuilderQueries: build.query<
      { success: boolean; message: string; data: any[] },
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
  useGetDashboardStatsQuery,
  useGetDashboardCountQuery,
  useGetCustomerListQuery,
  useGetRecentActivitiesQuery,
  useGetFilterOptionsQuery,
  useGetRegistrationTrendsQuery,
  useGetQueryTrendsQuery,
  useGetPerformanceMetricsQuery,
  useGetAlertsQuery,
  useMarkAlertAsReadMutation,
  useGetWidgetsConfigQuery,
  useUpdateWidgetsConfigMutation,
  useGetRegistrationsQuery,
  useGetStatusesByTypeQuery,
  useGetStatusQuery,
  useGetBuilderQueriesQuery,
} = dashboardApi;
