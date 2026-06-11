import { adminFetch, useAdminMutation, useAdminQuery } from './adminClient';
import type { AdminOrg } from './types';

export const useGetAdminOrgsQuery = (orgType: string) =>
  useAdminQuery<AdminOrg[]>(`/api/admin/orgs/${orgType}`);

export const useGetAdminOrgQuery = ({ orgType, id }: { orgType: string; id: string }) =>
  useAdminQuery<AdminOrg>(`/api/admin/orgs/${orgType}/${id}`);

export const useCreateAdminOrgMutation = () =>
  useAdminMutation<{ orgType: string; body: AdminOrg }, AdminOrg>(({ orgType, body }) =>
    adminFetch<AdminOrg>(`/api/admin/orgs/${orgType}`, { method: 'POST', body: JSON.stringify(body) }),
  );

export const useUpdateAdminOrgMutation = () =>
  useAdminMutation<{ orgType: string; id: string; body: AdminOrg }, AdminOrg>(({ orgType, id, body }) =>
    adminFetch<AdminOrg>(`/api/admin/orgs/${orgType}/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  );
