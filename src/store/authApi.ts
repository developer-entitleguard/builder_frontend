import { api } from './apiSlice';
import type {
  SignUpRequest,
  SignInRequest,
  AuthResponse,
  ResetPasswordRequest,
  UpdatePasswordRequest,
  ResetPasswordWithTokenRequest,
  SendVerifyMailRequest,
  SetPasswordForUserRequest,
} from '@/lib/api/types';

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

    // Sign in
    signIn: build.mutation<AuthResponse, SignInRequest>({
      query: (data) => ({
        url: '/unsecure/builderlogin',
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

    // Reset password with token
    resetPasswordWithToken: build.mutation<
      { message: string },
      ResetPasswordWithTokenRequest
    >({
      query: (data) => ({
        url: '/unsecure/resetpassword',
        method: 'POST',
        body: data,
      }),
    }),

    // Update password
    updatePassword: build.mutation<
      { message: string },
      UpdatePasswordRequest
    >({
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
    resendVerification: build.mutation<
      { message: string },
      { email: string }
    >({
      query: (data) => ({
        url: '/resend-verification',
        method: 'POST',
        body: data,
      }),
    }),

    // Send verify mail
    sendVerifyMail: build.mutation<
      { message: string },
      SendVerifyMailRequest
    >({
      query: (data) => ({
        url: '/unsecure/verify/mail',
        method: 'GET',
        params: { email: data.email },
      }),
    }),

    // Set password for user
    setPasswordForUser: build.mutation<
      { message: string },
      SetPasswordForUserRequest
    >({
      query: (data) => ({
        url: '/unsecure/user/setpwd',
        method: 'POST',
        body: data,
      }),
    }),

    // Update profile
    updateProfile: build.mutation<
      AuthResponse['data']['userInfo'],
      Partial<AuthResponse['data']['userInfo']>
    >({
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
  useSignOutMutation,
  useResetPasswordWithTokenMutation,
  useUpdatePasswordMutation,
  useVerifyEmailMutation,
  useResendVerificationMutation,
  useSendVerifyMailMutation,
  useSetPasswordForUserMutation,
  useUpdateProfileMutation,
} = authApi;
