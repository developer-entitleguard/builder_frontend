import { api } from './apiSlice';

interface DefaultListResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface ProjectManagerDashboardData {
  totalRegistrations: number;
  totalQueries: number;
  upcomingSettlements: number;
}

export interface CustomerSupportDashboardData {
  openQueries: number;
  warrantyExpiringSoon: Array<{
    registrationId: string;
    customerName: string;
    address: string | null;
    settlementDate: string;
    warrantyEndsAt: string;
    daysRemaining: number;
  }>;
  internalVendorCount: number;
  availableSlotsToday: number;
}

export interface InternalVendorDashboardData {
  vendorId: string;
  vendorName: string;
  openQueries: number;
  upcomingSlots: number;
  upcomingBooked: number;
}

export interface WarrantyEntry {
  itemMapId: string;
  name: string | null;
  category: string | null;
  warrantyMonths: number | null;
  warrantyEndsAt: string | null;
  status: 'ACTIVE' | 'EXPIRING' | 'EXPIRED' | 'UNKNOWN';
}

export interface RegistrationWarrantiesData {
  registrationId: string;
  settlementDate: string | null;
  houseWarrantyEndsAt: string | null;
  houseWarrantyStatus: WarrantyEntry['status'];
  items: WarrantyEntry[];
}

export const roleDashboardsApi = api.injectEndpoints({
  endpoints: (build) => ({
    getProjectManagerDashboard: build.query<DefaultListResponse<ProjectManagerDashboardData>, { builderId: string }>({
      query: ({ builderId }) => ({
        url: `/api/dashboard/project-manager`,
        method: 'GET',
        params: { builderId },
      }),
      providesTags: ['Dashboard'],
    }),
    getCustomerSupportDashboard: build.query<DefaultListResponse<CustomerSupportDashboardData>, { builderId: string }>({
      query: ({ builderId }) => ({
        url: `/api/dashboard/customer-support`,
        method: 'GET',
        params: { builderId },
      }),
      providesTags: ['Dashboard', 'Warranty'],
    }),
    getInternalVendorDashboard: build.query<DefaultListResponse<InternalVendorDashboardData>, void>({
      query: () => ({ url: `/api/dashboard/internal-vendor`, method: 'GET' }),
      providesTags: ['Dashboard'],
    }),
    getRegistrationWarranties: build.query<DefaultListResponse<RegistrationWarrantiesData>, { id: string }>({
      query: ({ id }) => ({ url: `/api/registrations/${id}/warranties`, method: 'GET' }),
      providesTags: (_r, _e, arg) => [{ type: 'Warranty', id: arg.id }],
    }),
  }),
});

export const {
  useGetProjectManagerDashboardQuery,
  useGetCustomerSupportDashboardQuery,
  useGetInternalVendorDashboardQuery,
  useGetRegistrationWarrantiesQuery,
} = roleDashboardsApi;
