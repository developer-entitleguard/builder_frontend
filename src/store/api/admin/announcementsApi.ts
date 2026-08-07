import { adminFetch, useAdminMutation, useAdminQuery } from './adminClient';
import type { Announcement, RecipientSearchResult } from './types';

/** Platform Announcements — super-admin write side (/api/admin/announcements). */

export const useGetAnnouncementsQuery = () =>
  useAdminQuery<Announcement[]>('/api/admin/announcements');

export const useGetAnnouncementQuery = (id: string | null) =>
  useAdminQuery<Announcement>(id ? `/api/admin/announcements/${id}` : null);

export const useCreateAnnouncementMutation = () =>
  useAdminMutation<Announcement, Announcement>((body) =>
    adminFetch<Announcement>('/api/admin/announcements', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  );

export const useUpdateAnnouncementMutation = () =>
  useAdminMutation<{ id: string; body: Announcement }, Announcement>(({ id, body }) =>
    adminFetch<Announcement>(`/api/admin/announcements/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  );

export const useSetAnnouncementActiveMutation = () =>
  useAdminMutation<{ id: string; active: boolean }, Announcement>(({ id, active }) =>
    adminFetch<Announcement>(
      `/api/admin/announcements/${id}/${active ? 'activate' : 'deactivate'}`,
      { method: 'POST' },
    ),
  );

export const useDeleteAnnouncementMutation = () =>
  useAdminMutation<string, void>((id) =>
    adminFetch<void>(`/api/admin/announcements/${id}`, { method: 'DELETE' }),
  );

/**
 * Recipient typeahead for INDIVIDUAL targeting — imperative (not a hook) since it
 * runs on each keystroke against the chosen portal's identity table.
 */
export const searchRecipients = (portal: string, q: string) =>
  adminFetch<RecipientSearchResult[]>(
    `/api/admin/recipients/search?portal=${encodeURIComponent(portal)}&q=${encodeURIComponent(q)}`,
  );
