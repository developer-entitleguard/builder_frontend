import { api } from './apiSlice';
import type { CoverageFields } from './coverage';

interface DefaultListResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

interface ApiResponseDto {
  success: boolean;
  message: string;
}

export interface TicketFile {
  id: string;
  type: string | null;
  files: {
    id: string;
    name: string | null;
    fileType: string | null;
    filePath: string | null;
  } | null;
}

export interface Ticket extends CoverageFields {
  id: string;
  builderOrganizationId: string;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  customerAddress: string | null;
  title: string | null;
  unitNumber: string | null;
  queryType: string | null;
  priority: string | null;
  description: string | null;
  category: string | null;
  sourceChannel: string | null;
  agentId: string | null;
  callRecordingUrl: string | null;
  sourceTimestamp: string | null;
  status: 'NEW' | 'TRIAGED' | 'CONVERTED' | 'CLOSED' | 'CANCELLED';
  closureReason: string | null;
  linkedQueryId: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export const ticketsApi = api.injectEndpoints({
  endpoints: (build) => ({
    listTickets: build.query<
      DefaultListResponse<Ticket[]>,
      { builderId: string; status?: string; priority?: string; includeClosed?: boolean }
    >({
      query: ({ builderId, status, priority, includeClosed }) => ({
        url: `/api/tickets`,
        method: 'GET',
        params: {
          builderId,
          status,
          priority,
          includeClosed: includeClosed ? 'true' : undefined,
        },
      }),
      providesTags: ['Ticket'],
    }),

    getTicket: build.query<DefaultListResponse<Ticket>, { id: string }>({
      query: ({ id }) => ({ url: `/api/tickets/${id}`, method: 'GET' }),
      providesTags: (_r, _e, arg) => [{ type: 'Ticket', id: arg.id }],
    }),

    getTicketFiles: build.query<DefaultListResponse<TicketFile[]>, { id: string }>({
      query: ({ id }) => ({ url: `/api/tickets/${id}/files`, method: 'GET' }),
      providesTags: (_r, _e, arg) => [{ type: 'Ticket', id: arg.id }],
    }),

    linkTicketToRegistration: build.mutation<
      ApiResponseDto,
      { id: string; registrationId: string }
    >({
      query: ({ id, registrationId }) => ({
        url: `/api/tickets/${id}/link-registration`,
        method: 'POST',
        body: { registrationId },
      }),
      invalidatesTags: (_r, _e, arg) => [
        { type: 'Ticket', id: arg.id },
        'Ticket',
      ],
    }),

    convertTicketToQuery: build.mutation<
      DefaultListResponse<{ ticketId: string; queryId: string }>,
      { id: string }
    >({
      query: ({ id }) => ({
        url: `/api/tickets/${id}/convert-to-query`,
        method: 'POST',
      }),
      invalidatesTags: (_r, _e, arg) => [
        { type: 'Ticket', id: arg.id },
        'Ticket',
        'Query',
      ],
    }),

    cancelTicket: build.mutation<ApiResponseDto, { id: string; reason: string }>({
      query: ({ id, reason }) => ({
        url: `/api/tickets/${id}/cancel`,
        method: 'POST',
        body: { reason },
      }),
      invalidatesTags: (_r, _e, arg) => [{ type: 'Ticket', id: arg.id }, 'Ticket'],
    }),

    closeTicket: build.mutation<ApiResponseDto, { id: string; reason: string }>({
      query: ({ id, reason }) => ({
        url: `/api/tickets/${id}/close`,
        method: 'POST',
        body: { reason },
      }),
      invalidatesTags: (_r, _e, arg) => [{ type: 'Ticket', id: arg.id }, 'Ticket'],
    }),
  }),
});

export const {
  useListTicketsQuery,
  useGetTicketQuery,
  useGetTicketFilesQuery,
  useLinkTicketToRegistrationMutation,
  useConvertTicketToQueryMutation,
  useCancelTicketMutation,
  useCloseTicketMutation,
} = ticketsApi;
