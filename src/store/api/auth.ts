import { api } from './apiSlice';
import type { 
  SignUpRequest, 
  SignInRequest, 
  AuthResponse, 
  ResetPasswordRequest, 
  UpdatePasswordRequest 
} from '@/lib/api/types';

export const authApi = api.injectEndpoints({
  endpoints: (build) => ({
    // Get current user profile
    getProfile: build.query<AuthResponse['user'], void>({
      query: () => ({
        url: '/auth/profile',
        method: 'GET',
      }),
      providesTags: ['Auth'],
    }),

    // Sign up
    signUp: build.mutation<AuthResponse, SignUpRequest>({
      query: (data) => ({
        url: '/auth/signup',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Auth'],
    }),

    // Sign in
    signIn: build.mutation<AuthResponse, SignInRequest>({
      query: (data) => ({
        url: '/auth/signin',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Auth'],
    }),

    // Sign out
    signOut: build.mutation<void, void>({
      query: () => ({
        url: '/auth/signout',
        method: 'POST',
      }),
      invalidatesTags: ['Auth'],
    }),

    // Reset password
    resetPassword: build.mutation<{ message: string }, ResetPasswordRequest>({
      query: (data) => ({
        url: '/auth/reset-password',
        method: 'POST',
        body: data,
      }),
    }),

    // Update password
    updatePassword: build.mutation<{ message: string }, UpdatePasswordRequest>({
      query: (data) => ({
        url: '/auth/update-password',
        method: 'PATCH',
        body: data,
      }),
    }),

    // Verify email
    verifyEmail: build.mutation<{ message: string }, { token: string }>({
      query: (data) => ({
        url: '/auth/verify-email',
        method: 'POST',
        body: data,
      }),
    }),

    // Resend verification
    resendVerification: build.mutation<{ message: string }, { email: string }>({
      query: (data) => ({
        url: '/auth/resend-verification',
        method: 'POST',
        body: data,
      }),
    }),

    // Update profile
    updateProfile: build.mutation<AuthResponse['user'], Partial<AuthResponse['user']>>({
      query: (data) => ({
        url: '/auth/profile',
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Auth'],
    }),
  }),
});

export const {
  useGetProfileQuery,
  useSignUpMutation,
  useSignInMutation,
  useSignOutMutation,
  useResetPasswordMutation,
  useUpdatePasswordMutation,
  useVerifyEmailMutation,
  useResendVerificationMutation,
  useUpdateProfileMutation,
} = authApi;
