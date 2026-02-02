// Auth API types for RTK Query

export interface UserInfo {
  id?: string;
  email?: string;
  name?: string;
  role?: string;
  organizationId?: string;
  [key: string]: unknown;
}

export interface AuthResponse {
  success?: boolean;
  message?: string;
  data: {
    userInfo: UserInfo;
    jwt?: string;
    [key: string]: unknown;
  };
}

export interface SignUpRequest {
  email: string;
  password: string;
  name?: string;
  [key: string]: unknown;
}

export interface SignInRequest {
  email: string;
  password: string;
  [key: string]: unknown;
}

export interface ResetPasswordRequest {
  email: string;
}

export interface UpdatePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

export interface ResetPasswordWithTokenRequest {
  token: string;
  newPassword: string;
}

export interface SendVerifyMailRequest {
  email: string;
}

export interface SetPasswordForUserRequest {
  token: string;
  password: string;
  [key: string]: unknown;
}
