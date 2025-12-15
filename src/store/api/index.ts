// Export the main API slice
export { api } from './apiSlice';

// Export all API endpoints
export * from './auth';
export * from './registrations';
export * from './items';
export * from './users';
// Dashboard exports (alias conflicting hooks)
export {
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
  useGetRegistrationsQuery as useDashboardRegistrationsQuery,
  useGetStatusesByTypeQuery,
  useGetStatusQuery,
  useGetBuilderQueriesQuery as useDashboardBuilderQueriesQuery,
} from './dashboard';

// Export API services
export * from '@/lib/api/services/customerDetails';
export * from '@/lib/api/services/customerEntitlement';
export * from '@/lib/api/services/customerItem';
export * from '@/lib/api/services/itemMap';
export * from '@/lib/api/services/builderCustomer';
export * from '@/lib/api/services/builderOrganization';
export * from '@/lib/api/services/builderUsers';
export * from '@/lib/api/services/builderVendor';
export * from '@/lib/api/services/bomUpload';
export {
  useGetBuilderQueriesQuery,
  useLazyGetQueryByIdQuery,
  useUpdateQueryMutation,
  useAddQueryCommentMutation,
} from '@/lib/api/services/query';

// Re-export types
export type * from '@/lib/api/types.ts';
