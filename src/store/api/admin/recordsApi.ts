import { adminFetch, useAdminMutation, useAdminQuery } from './adminClient';

export interface RegistrationRecord {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  contact: string | null;
  address: string | null;
  builderOrgId: string | null;
  builderOrgName: string | null;
  statusName: string | null;
  isActive: boolean;
  createdAt: string | null;
  installedItems: number;
}

export interface DependencyReport {
  installedItems: number;
  jobs: number;
  complianceDocs: number;
  canHardDelete: boolean;
  blockers: string[];
}

export interface SegmentStat {
  total: number;
  active: number;
}

export interface AnalyticsSummary {
  builders: SegmentStat;
  merchants: SegmentStat;
  trades: SegmentStat;
  consumers: SegmentStat;
  homesHandedOver: number;
  entitlementsIssued: number;
  queriesRaised: number;
  queriesResolved: number;
  endCustomers: {
    total: number;
    registered: number;
    ordersUploaded: number;
    propertiesAdded: number;
  };
}

export interface CustomerRecord {
  id: string;
  name: string | null;
  email: string | null;
  contact: string | null;
  propertiesAdded: number;
  ordersUploaded: number;
  isRegistered: boolean | null;
  isActive: boolean | null;
  createdAt: string | null;
}

export interface BuilderRecord {
  id: string;
  name: string | null;
  properties: number;
  registrations: number;
  handedOver: number;
  supportTickets: number;
  isActive: boolean | null;
  createdAt: string | null;
}

export interface LinkedParty {
  name: string | null;
  email: string | null;
  inEntitleguard: boolean;
  buildersLinked: number;
  firstAdded: string | null;
}

export const useCustomersRecordsQuery = (search: string) => {
  const qs = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';
  return useAdminQuery<CustomerRecord[]>(`/api/admin/records/customers${qs}`);
};

export const useBuildersRecordsQuery = () =>
  useAdminQuery<BuilderRecord[]>('/api/admin/records/builders');

export const useSuppliersRecordsQuery = () =>
  useAdminQuery<LinkedParty[]>('/api/admin/records/suppliers');

export const useVendorsRecordsQuery = () =>
  useAdminQuery<LinkedParty[]>('/api/admin/records/vendors');

export interface BuilderLeagueRow {
  builderId: string;
  builderName: string;
  homeownersSeeded: number;
  homesHandedOver: number;
  queriesPerHome: number;
}

const recordsPath = (search: string, includeInactive: boolean) => {
  const params = new URLSearchParams();
  if (search.trim()) params.set('search', search.trim());
  if (includeInactive) params.set('includeInactive', 'true');
  const qs = params.toString();
  return `/api/admin/records/registrations${qs ? `?${qs}` : ''}`;
};

export const useGetRegistrationsQuery = (search: string, includeInactive: boolean) =>
  useAdminQuery<RegistrationRecord[]>(recordsPath(search, includeInactive));

export const fetchDependencies = (id: string) =>
  adminFetch<DependencyReport>(`/api/admin/records/registrations/${id}/dependencies`);

export const useSoftDeleteRegistrationMutation = () =>
  useAdminMutation<{ id: string; reason: string }, { success: boolean; message: string }>(
    ({ id, reason }) =>
      adminFetch(`/api/admin/records/registrations/${id}/soft-delete`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
  );

export const useHardDeleteRegistrationMutation = () =>
  useAdminMutation<{ id: string; reason: string }, { success: boolean; message: string }>(
    ({ id, reason }) =>
      adminFetch(`/api/admin/records/registrations/${id}/hard-delete`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
  );

export const useAnonymiseRegistrationMutation = () =>
  useAdminMutation<{ id: string; reason: string }, { success: boolean; message: string }>(
    ({ id, reason }) =>
      adminFetch(`/api/admin/records/registrations/${id}/anonymise`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
  );

export const useBulkSoftDeleteMutation = () =>
  useAdminMutation<{ ids: string[]; reason: string }, { requested: number; deleted: number; skipped: number }>(
    ({ ids, reason }) =>
      adminFetch(`/api/admin/records/registrations/bulk-soft-delete`, {
        method: 'POST',
        body: JSON.stringify({ ids, reason }),
      }),
  );

// ---- Deactivate / delete the four top-level record types -----------------

type ActionResult = { success: boolean; message: string };

const useIdAction = (path: (id: string) => string) =>
  useAdminMutation<{ id: string; reason: string }, ActionResult>(({ id, reason }) =>
    adminFetch(path(id), { method: 'POST', body: JSON.stringify({ reason }) }),
  );

const useKeyAction = (path: string) =>
  useAdminMutation<{ email: string | null; name: string | null; reason: string }, ActionResult>(
    ({ email, name, reason }) =>
      adminFetch(path, { method: 'POST', body: JSON.stringify({ email, name, reason }) }),
  );

export const useDeactivateCustomerMutation = () =>
  useIdAction((id) => `/api/admin/records/customers/${id}/deactivate`);
export const useDeleteCustomerMutation = () =>
  useIdAction((id) => `/api/admin/records/customers/${id}/delete`);

export const useDeactivateBuilderMutation = () =>
  useIdAction((id) => `/api/admin/records/builders/${id}/deactivate`);
export const useDeleteBuilderMutation = () =>
  useIdAction((id) => `/api/admin/records/builders/${id}/delete`);

export const useDeactivateSupplierMutation = () =>
  useKeyAction('/api/admin/records/suppliers/deactivate');
export const useDeleteSupplierMutation = () =>
  useKeyAction('/api/admin/records/suppliers/delete');

export const useDeactivateVendorMutation = () =>
  useKeyAction('/api/admin/records/vendors/deactivate');
export const useDeleteVendorMutation = () =>
  useKeyAction('/api/admin/records/vendors/delete');

export const useAnalyticsSummaryQuery = () =>
  useAdminQuery<AnalyticsSummary>('/api/admin/analytics/summary');

export const useBuilderLeagueQuery = () =>
  useAdminQuery<BuilderLeagueRow[]>('/api/admin/analytics/builder-league');

export interface AdoptionRow {
  builderId: string;
  builderName: string;
  hasUsers: boolean;
  hasVendors: boolean;
  hasSuppliers: boolean;
  hasProject: boolean;
  hasHandover: boolean;
  stuckSinceSignup: boolean;
}

export const useAdoptionQuery = () =>
  useAdminQuery<AdoptionRow[]>('/api/admin/analytics/adoption');

export interface UsageStats {
  activeAccountsLast30d: number;
  eventsLast30d: number;
  registrationsCreatedLast30d: number;
  trackedActions: string[];
  note: string;
}

export const useUsageQuery = () =>
  useAdminQuery<UsageStats>('/api/admin/analytics/usage');
