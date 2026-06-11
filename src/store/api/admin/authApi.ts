import { adminFetch, useAdminMutation } from './adminClient';
import type { AdminLoginResponse } from './types';

export const useAdminLoginMutation = () =>
  useAdminMutation<{ email: string; password: string }, AdminLoginResponse>((body) =>
    adminFetch<AdminLoginResponse>('/unsecure/adminlogin', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  );
