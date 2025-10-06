// Basic API types for RTK Query
export interface SignUpRequest {
  email: string;
  password: string;
  company_name: string;
  contact_person: string;
  phone: string;
}

export interface SignInRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    jwt: string;
    customer: unknown;
    userInfo: {
      id: string;
      firstName: string;
      lastName: string | null;
      email: string;
      contact: string;
      role: string;
      builderOrganization: {
        id: string;
        name: string;
        address: string;
        contact: string;
        email: string;
        abn: string | null;
        description: string;
        isActive: boolean;
      };
    };
    type: unknown;
    logged: string;
    createdAt: string;
    loggedOutTime: string | null;
  };
}

export interface ResetPasswordRequest {
  email: string;
}

export interface SendVerifyMailRequest {
  email: string;
}

export interface SetPasswordForUserRequest {
  contact: string;
  email: string;
  loginType: string;
  otp: string;
  password: string;
  token: string;
}

export interface UpdatePasswordRequest {
  current_password: string;
  new_password: string;
}

export interface ResetPasswordWithTokenRequest {
  password: string;
}

export interface DashboardStats {
  total_registrations: number;
  pending_registrations: number;
  approved_registrations: number;
  rejected_registrations: number;
  total_queries: number;
  open_queries: number;
  resolved_queries: number;
  total_items: number;
  active_items: number;
}

export interface RecentActivity {
  id: string;
  type: 'registration' | 'query' | 'approval' | 'document';
  description: string;
  created_at: string;
  user_name?: string;
  registration_id?: string;
}

export interface FilterOptions {
  statuses: string[];
  categories: string[];
  organizations: unknown[];
  date_ranges: {
    label: string;
    value: string;
  }[];
}

export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

export interface SearchParams {
  query?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
  organization_id?: string;
}

export interface BuilderItem extends BaseEntity {
  id: string;
  sourceId: string | null;
  name: string;
  category: string | null;
  make: string | null;
  brand: string | null;
  model: string | null;
  text: string | null;
  documentationUrl: string | null;
  status: string;
  purchaser: string | null;
  description?: string;
  price?: number;
  note?: string | null;
  unit?: string;
  is_active?: boolean;
  organization_id?: string;
}

export interface CreateBuilderItemRequest {
  id?: string; // Optional ID for updates
  name: string;
  category: string;
  brand?: string;
  make?: string;
  model?: string;
  documentationUrl?: string;
  purchaser?: string;
  sourceId?: string;
  status?: string;
  text?: string;
  note?: string | null;
  price?: number | null;
}

export interface UpdateBuilderItemRequest {
  name?: string;
  description?: string;
  category?: string;
  price?: number;
  unit?: string;
  is_active?: boolean;
}

export interface HomeownerRegistration extends BaseEntity {
  homeowner_name: string;
  homeowner_email: string;
  homeowner_phone: string;
  property_address: string;
  property_type: string;
  registration_number: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  organization_id: string;
  selected_items?: unknown;
  documents?: unknown;
  notes?: string;
  approved_by?: string;
  approved_at?: string;
  entitlement_sent_at?: string;
}

export interface CreateRegistrationRequest {
  homeowner_name: string;
  homeowner_email: string;
  homeowner_phone: string;
  property_address: string;
  property_type: string;
  organization_id: string;
  selected_items?: unknown;
  documents?: unknown;
  notes?: string;
}

export interface UpdateRegistrationRequest {
  homeowner_name?: string;
  homeowner_email?: string;
  homeowner_phone?: string;
  property_address?: string;
  property_type?: string;
  status?: 'pending' | 'approved' | 'rejected' | 'completed';
  selected_items?: unknown;
  documents?: unknown;
  notes?: string;
  approved_by?: string;
  approved_at?: string;
  entitlement_sent_at?: string;
}

export interface User extends BaseEntity {
  email: string;
  company_name: string;
  contact_person: string;
  phone: string;
  is_active: boolean;
  last_login_at?: string;
}

export interface UpdateUserRequest {
  company_name?: string;
  contact_person?: string;
  phone?: string;
}

export interface BuilderUser {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string;
  contact: string;
  role: string;
  builderOrganization: {
    id: string;
    name: string;
    address: string;
    contact: string;
    email: string;
    abn: string | null;
    description: string;
    isActive: boolean;
  };
}

export interface CreateBuilderUserRequest {
  email: string;
  firstName: string;
  lastName?: string;
  contact?: string;
  role: string;
  sourceId: string;
}

export interface BuilderOrganization {
  id: string;
  name: string;
  address: string;
  contact: string;
  email: string;
  abn: string | null;
  description: string;
  isActive: boolean;
}

export interface UpdateBuilderOrganizationRequest {
  id: string;
  name: string;
  address: string;
  contact: string;
  email: string;
  abn?: string | null;
  description?: string | null;
}

export interface BuilderOrganizationResponse {
  success: boolean;
  message: string;
  data?: BuilderOrganization;
}

export interface UpdateBuilderUserRequest {
  id: string;
  email: string;
  firstName: string;
  lastName?: string;
  contact?: string;
  role: string;
  sourceId: string;
}

export interface BuilderUserResponse {
  success: boolean;
  message: string;
  data: BuilderUser[];
}
