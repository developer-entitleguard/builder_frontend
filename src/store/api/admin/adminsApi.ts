import { adminFetch, useAdminMutation, useAdminQuery } from './adminClient';
import type { PlatformAdmin } from './types';

export const useGetPlatformAdminsQuery = () => useAdminQuery<PlatformAdmin[]>('/api/admin/admins');

export const useCreatePlatformAdminMutation = () =>
  useAdminMutation<PlatformAdmin, PlatformAdmin>((body) =>
    adminFetch<PlatformAdmin>('/api/admin/admins', { method: 'POST', body: JSON.stringify(body) }),
  );

export const useUpdatePlatformAdminMutation = () =>
  useAdminMutation<{ id: string; body: PlatformAdmin }, PlatformAdmin>(({ id, body }) =>
    adminFetch<PlatformAdmin>(`/api/admin/admins/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  );

export const useDeletePlatformAdminMutation = () =>
  useAdminMutation<string, void>((id) => adminFetch<void>(`/api/admin/admins/${id}`, { method: 'DELETE' }));
