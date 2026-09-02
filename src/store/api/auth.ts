import { api } from './apiSlice';
import type { 
  SignUpRequest, 
  SignInRequest, 
  AuthResponse, 
  ResetPasswordRequest, 
  UpdatePasswordRequest,
  ResetPasswordWithTokenRequest,
  SendVerifyMailRequest,
  SetPasswordForUserRequest
} from '@/lib/api/types.ts';
import type { PortalKey, SessionEnvelope } from '@/lib/auth/portalSession';

export interface UnifiedSignInRequest {
  email: string;
  password: string;
  portal: PortalKey;
}

export interface VerifyLoginOtpRequest {
  email: string;
  otp: string;
  portal: PortalKey;
}

export const authApi = api.injectEndpoints({
  endpoints: (build) => ({
    // Get current user profile
    getProfile: build.query<AuthResponse['data']['userInfo'], void>({
      query: () => ({
        url: '/profile',
        method: 'GET',
      }),
      providesTags: ['Auth'],
    }),

    // Sign up
    signUp: build.mutation<AuthResponse, SignUpRequest>({
      query: (data) => ({
        url: '/signup',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Auth'],
    }),

    // Sign in — legacy builder-only endpoint. Kept for VITE_UNIFIED_AUTH="false"
    // (one release of rollback safety); the unified path below is the default.
    signIn: build.mutation<AuthResponse, SignInRequest>({
      query: (data) => ({
        url: '/unsecure/builderlogin',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Auth'],
    }),

    // Unified sign-in (one set of credentials across portals). The response
    // `data` is today's AuthTokenResponse plus additive `seat`, `org`, `seats`.
    // 403 with `code: "NO_SEAT_FOR_PORTAL"` when the person is genuine but has
    // no BUILDER seat.
    unifiedSignIn: build.mutation<SessionEnvelope, UnifiedSignInRequest>({
      query: (data) => ({
        url: '/unsecure/auth/login',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Auth'],
    }),

    // "Email me a code instead" — step 1: request a one-time code.
    requestLoginOtp: build.mutation<{ success: boolean; message: string }, { email: string }>({
      query: (data) => ({
        url: '/unsecure/auth/otp',
        method: 'POST',
        body: data,
      }),
    }),

    // "Email me a code instead" — step 2: exchange the code for a session.
    verifyLoginOtp: build.mutation<SessionEnvelope, VerifyLoginOtpRequest>({
      query: (data) => ({
        url: '/unsecure/auth/verify',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Auth'],
    }),

    // Sign out
    signOut: build.mutation<void, void>({
      query: () => ({
        url: '/signout',
        method: 'POST',
      }),
      invalidatesTags: ['Auth'],
    }),

    validateToken: build.query<{ success: boolean; message: string; data?: { expired?: boolean } }, { token: string }>({
      query: ({ token }) => ({
        url: '/unsecure/validtoken',
        method: 'GET',
        params: { token },
      }),
      providesTags: ['Auth'],
    }),

    // Reset password with token
    resetPasswordWithToken: build.mutation<{ message: string }, ResetPasswordWithTokenRequest>({
      query: (data) => ({
        url: '/unsecure/resetpassword',
        method: 'POST',
        body: data,
      }),
    }),

    // Update password
    updatePassword: build.mutation<{ message: string }, UpdatePasswordRequest>({
      query: (data) => ({
        url: '/update-password',
        method: 'PATCH',
        body: data,
      }),
    }),

    // Verify email
    verifyEmail: build.mutation<{ message: string }, { token: string }>({
      query: (data) => ({
        url: '/verify-email',
        method: 'POST',
        body: data,
      }),
    }),

    // Resend verification
    resendVerification: build.mutation<{ message: string }, { email: string }>({
      query: (data) => ({
        url: '/resend-verification',
        method: 'POST',
        body: data,
      }),
    }),

    // Send verify mail
    sendVerifyMail: build.mutation<{ message: string }, SendVerifyMailRequest>({
      query: (data) => ({
        url: '/unsecure/verify/mail',
        method: 'GET',
        params: { email: data.email },
      }),
    }),

    // Set password for user
    setPasswordForUser: build.mutation<{ message: string }, SetPasswordForUserRequest>({
      query: (data) => ({
        url: '/unsecure/user/setpwd',
        method: 'POST',
        body: data,
      }),
    }),

    // Update profile
    updateProfile: build.mutation<AuthResponse['data']['userInfo'], Partial<AuthResponse['data']['userInfo']>>({
      query: (data) => ({
        url: '/profile',
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
  useUnifiedSignInMutation,
  useRequestLoginOtpMutation,
  useVerifyLoginOtpMutation,
  useSignOutMutation,
  useResetPasswordWithTokenMutation,
  useUpdatePasswordMutation,
  useVerifyEmailMutation,
  useResendVerificationMutation,
  useSendVerifyMailMutation,
  useSetPasswordForUserMutation,
  useUpdateProfileMutation,
  useValidateTokenQuery,
} = authApi;
