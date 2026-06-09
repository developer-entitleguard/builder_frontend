import { api } from '@/store/api/apiSlice';

export type BuilderNotificationType =
  | 'TICKET_CREATED'
  | 'QUERY_CREATED'
  | 'JOB_COMPLETED'
  | 'JOB_CANCELLED';

export interface BuilderNotification {
  id: string;
  userInfoId: string;
  builderOrganizationId: string | null;
  type: BuilderNotificationType | string;
  title: string | null;
  message: string | null;
  /** Relative SPA path to navigate to, e.g. "/queries/{id}". */
  link: string | null;
  isRead: boolean;
  isActive: boolean;
  createdAt: string;
}

interface ListResponse {
  success: boolean;
  message: string;
  data: BuilderNotification[];
}

interface UnreadCountResponse {
  success: boolean;
  message: string;
  data: number;
}

interface MutationResponse {
  success: boolean;
  message: string;
}

export const notificationsApi = api.injectEndpoints({
  endpoints: (build) => ({
    listNotifications: build.query<ListResponse, void>({
      query: () => ({ url: '/api/builder/notifications', method: 'GET' }),
      providesTags: ['Notification'],
    }),
    unreadNotificationCount: build.query<UnreadCountResponse, void>({
      query: () => ({ url: '/api/builder/notifications/unread-count', method: 'GET' }),
      providesTags: ['Notification'],
    }),
    markNotificationRead: build.mutation<MutationResponse, { id: string }>({
      query: ({ id }) => ({ url: `/api/builder/notifications/${id}/read`, method: 'POST' }),
      invalidatesTags: ['Notification'],
    }),
    markAllNotificationsRead: build.mutation<MutationResponse, void>({
      query: () => ({ url: '/api/builder/notifications/read-all', method: 'POST' }),
      invalidatesTags: ['Notification'],
    }),
  }),
});

export const {
  useListNotificationsQuery,
  useUnreadNotificationCountQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
} = notificationsApi;
