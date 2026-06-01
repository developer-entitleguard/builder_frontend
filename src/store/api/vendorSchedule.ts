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

export interface FreeWindow {
  startTime: string;  // HH:mm:ss
  endTime: string;
}

/**
 * Per-day availability, computed on the backend as:
 *   workingHours − UNAVAILABLE rows − BOOKED rows.
 * `workingDay` is false for weekends (unless there's an explicit AVAILABLE override).
 */
export interface VendorDayAvailability {
  date: string;
  workingDay: boolean;
  workingHoursStart: string | null;
  workingHoursEnd: string | null;
  freeWindows: FreeWindow[];
  blocks: VendorScheduleSlot[];
  bookings: VendorScheduleSlot[];
}

export interface VendorAvailabilityRow {
  vendorId: string;
  vendorName: string | null;
  vendorType: 'INTERNAL' | 'EXTERNAL' | null;
  specializations: string | null;
  workingHoursStart: string | null;
  workingHoursEnd: string | null;
  freeWindows: FreeWindow[];
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
  /** Legacy path — book an existing AVAILABLE slot. */
  slotId?: string;
  /** New path — book a fresh slot inside a computed free window. */
  date?: string;       // yyyy-MM-dd
  startTime?: string;  // HH:mm or HH:mm:ss
  endTime?: string;
  notes?: string;
}

export interface MyVendorProfile {
  id: string;
  name: string;
  email: string;
  contact: string;
  vendorType: 'INTERNAL' | 'EXTERNAL' | null;
  specializations: string | null;
  /** Per-vendor override; null means "use org default". */
  workingHoursStart: string | null;
  workingHoursEnd: string | null;
  /** Comma-separated ISO weekday numbers ("1,2,3,4,5") or null when using org default. */
  workingWeekdays: string | null;
  /** Convenience: the org the vendor belongs to (carries the org-level working hours). */
  builderOrganization?: {
    id: string;
    workingHoursStart: string | null;
    workingHoursEnd: string | null;
  } | null;
}

export interface UpdateWorkingScheduleBody {
  workingHoursStart: string | null; // HH:mm or HH:mm:ss
  workingHoursEnd: string | null;
  /** ISO weekday numbers (1=Mon … 7=Sun). Null or empty → clear override, org default applies. */
  workingWeekdays: number[] | null;
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
  /**
   * Vendor-scoped completion: true once all of THIS vendor's jobs on the query
   * are terminal (COMPLETED/CANCELLED) — independent of the parent query status.
   */
  completed: boolean;
  /** ISO timestamp of the latest completed job; used to sort the Completed tab. */
  completedAt: string | null;
}

export const vendorScheduleApi = api.injectEndpoints({
  endpoints: (build) => ({
    getMyVendorProfile: build.query<DefaultListResponse<MyVendorProfile | null>, void>({
      query: () => ({ url: `/api/vendor/me`, method: 'GET' }),
      providesTags: ['Vendor'],
    }),
    updateMyWorkingSchedule: build.mutation<ApiResponseDto, UpdateWorkingScheduleBody>({
      query: (body) => ({
        url: `/api/vendor/me/working-schedule`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['Vendor', 'VendorSchedule', 'VendorAvailability'],
    }),
    getMyAssignedQueries: build.query<DefaultListResponse<MyAssignedQuery[]>, void>({
      query: () => ({ url: `/api/vendor/me/queries`, method: 'GET' }),
      providesTags: ['Query'],
    }),
    getVendorSchedule: build.query<
      DefaultListResponse<VendorDayAvailability[]>,
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

    deleteVendorSlot: build.mutation<ApiResponseDto, { slotId: string; vendorId: string }>({
      query: ({ slotId }) => ({
        url: `/api/vendor/schedule/${slotId}`,
        method: 'DELETE',
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
  useUpdateMyWorkingScheduleMutation,
  useGetMyAssignedQueriesQuery,
  useGetVendorScheduleQuery,
  useCreateVendorSlotsMutation,
  useUpdateVendorSlotMutation,
  useDeleteVendorSlotMutation,
  useGetVendorAvailabilityQuery,
  useAssignQueryToVendorMutation,
} = vendorScheduleApi;
