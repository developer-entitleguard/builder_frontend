// Export the main API slice
export { api } from './apiSlice';

// Export all API endpoints
export * from './auth';
export * from './registrations';
export * from './dashboard';
export * from './items';
export * from './users';

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

// Re-export types
export type * from '@/lib/api/types.ts';
