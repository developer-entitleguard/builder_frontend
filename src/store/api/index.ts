// Register all API modules (side-effect: inject endpoints into api)
import './auth';
import './dashboard';
import './items';
import './registrations';
import './users';
import './customerDetails';
import './customerEntitlement';
import './customerItem';
import './itemMap';
import './builderCustomer';
import './builderOrganization';
import './builderUsers';
import './builderVendor';
import './bomUpload';
import './query';
import './projects';
import './status';
import './activities';

// Export the main API slice
export { api } from './apiSlice';

// Auth
export * from './auth';

// Registrations, items, users
export * from './registrations';
export * from './items';
export * from './users';

// Dashboard (with aliases for conflicting hook names)
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

// Customer details, entitlement, item, item map
export * from './customerDetails';
export * from './customerEntitlement';
export * from './customerItem';
export * from './itemMap';

// Builder customer, organization, users, vendor
export * from './builderCustomer';
export * from './builderOrganization';
export * from './builderUsers';
export * from './builderVendor';

// BOM upload
export * from './bomUpload';

// Query (builder queries, update, comment)
export {
  useGetBuilderQueriesQuery,
  useLazyGetQueryByIdQuery,
  useUpdateQueryMutation,
  useAddQueryCommentMutation,
} from './query';

// Projects
export * from './projects';

// Status
export * from './status';

// Activities
export * from './activities';

// Re-export types
export type * from '@/lib/api/types';
