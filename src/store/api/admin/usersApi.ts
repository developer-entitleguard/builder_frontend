import { adminFetch, useAdminMutation, useAdminQuery } from './adminClient';
import type { AdminUser } from './types';

export const useGetAdminOrgUsersQuery = ({ orgType, orgId }: { orgType: string; orgId: string }) =>
  useAdminQuery<AdminUser[]>(`/api/admin/orgs/${orgType}/${orgId}/users`);

export const useUpsertAdminOrgUserMutation = () =>
  useAdminMutation<{ orgType: string; orgId: string; body: AdminUser }, AdminUser>(({ orgType, orgId, body }) =>
    adminFetch<AdminUser>(`/api/admin/orgs/${orgType}/${orgId}/users`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  );

export const useResetAdminOrgUserPasswordMutation = () =>
  useAdminMutation<{ orgType: string; orgId: string; id: string; password: string }, void>(
    ({ orgType, orgId, id, password }) =>
      adminFetch<void>(`/api/admin/orgs/${orgType}/${orgId}/users/${id}/password`, {
        method: 'POST',
        body: JSON.stringify({ password }),
      }),
  );

export const useDeleteAdminOrgUserMutation = () =>
  useAdminMutation<{ orgType: string; orgId: string; id: string }, void>(({ orgType, orgId, id }) =>
    adminFetch<void>(`/api/admin/orgs/${orgType}/${orgId}/users/${id}`, { method: 'DELETE' }),
  );
