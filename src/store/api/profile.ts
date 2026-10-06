import { api } from './apiSlice';
import type { SessionEnvelope } from '@/lib/auth/portalSession';

/**
 * The signed-in person's own profile — shared across every business portal
 * (`/api/me/*` on the backend). Email is read-only: it's the sign-in identity.
 */
export interface MyProfile {
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  /** Mobile, E.164 (e.g. +61412345678). */
  contact: string | null;
  /** False for people who have only ever signed in with an emailed code. */
  hasPassword: boolean;
  passwordUpdatedAt: string | null;
}

export interface UpdateMyProfileRequest {
  firstName: string;
  lastName: string;
  contact: string;
}

export interface SetMyPasswordRequest {
  /** Required when a password already exists, unless `code` is given. */
  currentPassword?: string;
  /** Emailed code from `sendPasswordCode`, instead of the current password. */
  code?: string;
  newPassword: string;
}

export const profileApi = api.injectEndpoints({
  endpoints: (build) => ({
    getMyProfile: build.query<MyProfile, void>({
      query: () => ({ url: '/api/me/profile', method: 'GET' }),
      providesTags: ['Profile'],
    }),

    updateMyProfile: build.mutation<MyProfile, UpdateMyProfileRequest>({
      query: (body) => ({ url: '/api/me/profile', method: 'PUT', body }),
      invalidatesTags: ['Profile'],
    }),

    sendPasswordCode: build.mutation<{ success: boolean; message: string }, void>({
      query: () => ({ url: '/api/me/password/code', method: 'POST' }),
    }),

    // Signs out every other device; `data` is a fresh session for this tab.
    setMyPassword: build.mutation<SessionEnvelope, SetMyPasswordRequest>({
      query: (body) => ({ url: '/api/me/password', method: 'POST', body }),
      invalidatesTags: ['Profile'],
    }),
  }),
});

export const {
  useGetMyProfileQuery,
  useUpdateMyProfileMutation,
  useSendPasswordCodeMutation,
  useSetMyPasswordMutation,
} = profileApi;
