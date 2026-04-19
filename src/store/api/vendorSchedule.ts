import { api } from './apiSlice';

export interface VendorScheduleSlot {
  id: string;
  vendorId: string;
  vendorName: string | null;
  vendorSpecializations: string | null;
  date: string;            // ISO yyyy-MM-dd
  startTime: string | null; // HH:mm:ss
  endTime: string | null;
  status: 'AVAILABLE' | 'BOOKED' | 'UNAVAILABLE';
  notes: string | null;
  queryId: string | null;
}

export interface VendorAvailabilityRow {
  vendorId: string;
  vendorName: string | null;
  vendorType: 'INTERNAL' | 'EXTERNAL' | null;
  specializations: string | null;
  slots: VendorScheduleSlot[];
}

interface DefaultListResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

interface ApiResponseDto {
  success: boolean;
  message: string;
}

export interface CreateSlotsBody {
  slots: Array<{
    date: string;
    startTime: string;
    endTime: string;
    status?: 'AVAILABLE' | 'BOOKED' | 'UNAVAILABLE';
    notes?: string;
  }>;
}

export interface UpdateSlotBody {
  status?: 'AVAILABLE' | 'BOOKED' | 'UNAVAILABLE';
  notes?: string;
}

export interface AssignQueryBody {
  vendorId: string;
  slotId?: string;
  notes?: string;
}

export interface MyVendorProfile {
  id: string;
  name: string;
  email: string;
  contact: string;
  vendorType: 'INTERNAL' | 'EXTERNAL' | null;
  specializations: string | null;
}

export interface MyAssignedQuery {
  id: string;
  title: string;
  description: string;
  priorityLevel: string | null;
  dueDate: string | null;
  customerName: string | null;
  customerAddress: string | null;
  customerCity: string | null;
  customerState: string | null;
  customerZip: string | null;
  customerContact: string | null;
  customerEmail: string | null;
  status: { id: string; name: string } | null;
}

export const vendorScheduleApi = api.injectEndpoints({
  endpoints: (build) => ({
    getMyVendorProfile: build.query<DefaultListResponse<MyVendorProfile | null>, void>({
      query: () => ({ url: `/api/vendor/me`, method: 'GET' }),
      providesTags: ['Vendor'],
    }),
    getMyAssignedQueries: build.query<DefaultListResponse<MyAssignedQuery[]>, void>({
      query: () => ({ url: `/api/vendor/me/queries`, method: 'GET' }),
      providesTags: ['Query'],
    }),
    getVendorSchedule: build.query<
      DefaultListResponse<VendorScheduleSlot[]>,
      { vendorId: string; from?: string; to?: string }
    >({
      query: ({ vendorId, from, to }) => ({
        url: `/api/vendor/${vendorId}/schedule`,
        method: 'GET',
        params: { from, to },
      }),
      providesTags: (_result, _error, arg) => [
        { type: 'VendorSchedule', id: arg.vendorId },
      ],
    }),

    createVendorSlots: build.mutation<
      DefaultListResponse<VendorScheduleSlot[]>,
      { vendorId: string; body: CreateSlotsBody }
    >({
      query: ({ vendorId, body }) => ({
        url: `/api/vendor/${vendorId}/schedule`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: 'VendorSchedule', id: arg.vendorId },
        'VendorAvailability',
      ],
    }),

    updateVendorSlot: build.mutation<
      ApiResponseDto,
      { slotId: string; vendorId: string; body: UpdateSlotBody }
    >({
      query: ({ slotId, body }) => ({
        url: `/api/vendor/schedule/${slotId}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: 'VendorSchedule', id: arg.vendorId },
        'VendorAvailability',
      ],
    }),

    getVendorAvailability: build.query<
      DefaultListResponse<VendorAvailabilityRow[]>,
      { builderId: string; date?: string; specialization?: string }
    >({
      query: ({ builderId, date, specialization }) => ({
        url: `/api/vendor/availability`,
        method: 'GET',
        params: { builderId, date, specialization },
      }),
      providesTags: ['VendorAvailability'],
    }),

    assignQueryToVendor: build.mutation<
      ApiResponseDto,
      { queryId: string; body: AssignQueryBody }
    >({
      query: ({ queryId, body }) => ({
        url: `/api/query/${queryId}/assign`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Query', 'VendorAvailability', 'VendorSchedule'],
    }),
  }),
});

export const {
  useGetMyVendorProfileQuery,
  useGetMyAssignedQueriesQuery,
  useGetVendorScheduleQuery,
  useCreateVendorSlotsMutation,
  useUpdateVendorSlotMutation,
  useGetVendorAvailabilityQuery,
  useAssignQueryToVendorMutation,
} = vendorScheduleApi;
