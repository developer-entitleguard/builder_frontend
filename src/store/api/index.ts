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
import './builderSupplier';
import './vendorSchedule';
import './roleDashboards';
import './projectImport';
import './builderOnboarding';
import './tickets';
import './bomUpload';
import './query';
import './projects';
import './projectOptions';
import './status';
import './activities';
import './pricing';
import './terms';
// PRD_Org_Terms_And_Conditions Phase 4 — builder org-scoped customer-facing T&C.
import './orgTerms';
// PRD_Compliance_Documents — project/registration compliance docs + handover gating.
import './complianceDocuments';
// Platform Synergy PRD §3.4 — effective-entitlements gate.
import './entitlements';
// Developer/Builder Decoupling PRD — scoped builder delegation per project.
import './projectShares';

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
export * from './builderSupplier';
export * from './vendorSchedule';
export * from './roleDashboards';
export * from './projectImport';
export * from './builderOnboarding';
export * from './tickets';

// BOM upload
export * from './bomUpload';

// Query (builder queries, update, comment, create)
export {
  useGetBuilderQueriesQuery,
  useLazyGetQueryByIdQuery,
  useUpdateQueryMutation,
  useCreateBuilderQueryMutation,
  useLazyGetVendorLinkQuery,
  useGetRegistrationItemsQuery,
  useLazyGetRegistrationItemsQuery,
  useAddQueryCommentMutation,
  useGetEligibleOwnersQuery,
} from './query';

// Projects
export * from './projects';
export * from './projectOptions';

// Status
export * from './status';

// Activities
export * from './activities';

// Pricing
export * from './pricing';

// Terms
export * from './terms';
export * from './orgTerms';

// Compliance documents
export * from './complianceDocuments';

// Effective entitlements (Platform Synergy §3.4)
export * from './entitlements';

// Project shares (Developer/Builder Decoupling)
export * from './projectShares';

// Re-export types
export type * from '@/lib/api/types';
