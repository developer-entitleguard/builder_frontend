import { api } from "./apiSlice";

/**
 * Platform Announcements — CLIENT (read/consume) side for the builder-staff portal
 * (EG BuildOS). Builder staff hit the shared org endpoint; the backend resolves
 * portal/org/recipient from the JWT session. Banners + acknowledge modals are
 * published from /platform-admin.
 *
 * NOTE: this is the separate builder-staff consume side. The admin WRITE side
 * lives in ./admin/announcementsApi and must not be conflated with this module.
 * Its hooks are deliberately named `useGetMyAnnouncementsQuery` /
 * `useAckMyAnnouncementMutation` to avoid any clash with the admin hooks.
 */
export interface AnnouncementView {
  id: string;
  kind: "MODAL" | "BANNER";
  severity: "INFO" | "WARNING" | "CRITICAL";
  title?: string | null;
  message: string;
  linkUrl?: string | null;
  linkLabel?: string | null;
  requiresAck?: boolean | null;
  dismissible?: boolean | null;
  createdAt?: string | null;
}

interface ListResponse {
  success: boolean;
  message: string;
  data: AnnouncementView[];
}

export const clientAnnouncementsApi = api.injectEndpoints({
  endpoints: (build) => ({
    getMyAnnouncements: build.query<AnnouncementView[], void>({
      query: () => ({ url: "/api/org/announcements", method: "GET" }),
      transformResponse: (r: ListResponse) => r?.data ?? [],
      providesTags: ["Announcement"],
    }),
    ackMyAnnouncement: build.mutation<{ success: boolean; message: string }, string>({
      query: (id) => ({ url: `/api/org/announcements/${id}/ack`, method: "POST" }),
      invalidatesTags: ["Announcement"],
    }),
  }),
});

export const { useGetMyAnnouncementsQuery, useAckMyAnnouncementMutation } =
  clientAnnouncementsApi;
