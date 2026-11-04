import { api } from './apiSlice';

/**
 * Service Due nominated trades (Revenue Capabilities SD13). SERVICE_DUE
 * module, Administrator only (ORG_MANAGE). Mirrors NominatedTradeController
 * on the backend (/api/builder/nominated-trades). Errors carry a `message`.
 *
 * Each row carries the trade's name (`tradeName`).
 */

export const ITEM_CLASSES = [
  'SPLIT_SYSTEM_AC',
  'DUCTED_AC',
  'EVAPORATIVE_COOLER',
  'HOT_WATER_ELECTRIC',
  'HOT_WATER_GAS',
  'HOT_WATER_HEAT_PUMP',
  'HOT_WATER_SOLAR',
  'SOLAR_PV_INVERTER',
  'SOLAR_PV_PANELS',
  'BATTERY',
  'SWITCHBOARD',
  'SMOKE_ALARM',
  'TERMITE_SYSTEM',
  'GAS_APPLIANCE',
  'ROOF_WORK',
  'WATERPROOFING',
  'PLUMBING_FIXTURE',
  'ELECTRICAL_GENERAL',
] as const;

export type ItemClass = (typeof ITEM_CLASSES)[number];

export const ITEM_CLASS_LABEL: Record<ItemClass, string> = {
  SPLIT_SYSTEM_AC: 'Split system air conditioner',
  DUCTED_AC: 'Ducted air conditioning',
  EVAPORATIVE_COOLER: 'Evaporative cooler',
  HOT_WATER_ELECTRIC: 'Electric hot water',
  HOT_WATER_GAS: 'Gas hot water',
  HOT_WATER_HEAT_PUMP: 'Heat pump hot water',
  HOT_WATER_SOLAR: 'Solar hot water',
  SOLAR_PV_INVERTER: 'Solar inverter',
  SOLAR_PV_PANELS: 'Solar panels',
  BATTERY: 'Home battery',
  SWITCHBOARD: 'Switchboard',
  SMOKE_ALARM: 'Smoke alarms',
  TERMITE_SYSTEM: 'Termite protection',
  GAS_APPLIANCE: 'Gas appliances',
  ROOF_WORK: 'Roofing',
  WATERPROOFING: 'Waterproofing',
  PLUMBING_FIXTURE: 'Plumbing fixtures',
  ELECTRICAL_GENERAL: 'General electrical',
};

export const itemClassLabel = (cls: string): string =>
  ITEM_CLASS_LABEL[cls as ItemClass] ?? cls.replace(/_/g, ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase());

export interface NominatedTrade {
  id: string;
  tradeOrgId: string;
  tradeName: string | null;
  itemClass: string;
  createdAt?: string | null;
}

export interface NominateTradeBody {
  tradeOrgId: string;
  itemClass: ItemClass;
}

const BASE = '/api/builder/nominated-trades';

export const nominatedTradesApi = api.injectEndpoints({
  endpoints: (build) => ({
    getNominatedTrades: build.query<NominatedTrade[], void>({
      query: () => ({ url: BASE, method: 'GET' }),
      providesTags: [{ type: 'NominatedTrades', id: 'LIST' }],
    }),
    addNominatedTrade: build.mutation<NominatedTrade, NominateTradeBody>({
      query: (body) => ({ url: BASE, method: 'POST', body }),
      invalidatesTags: [{ type: 'NominatedTrades', id: 'LIST' }],
    }),
    removeNominatedTrade: build.mutation<void, string>({
      query: (id) => ({ url: `${BASE}/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'NominatedTrades', id: 'LIST' }],
    }),
  }),
});

export const nominatedTradesErrorMessage = (err: unknown, fallback = 'Something went wrong'): string => {
  const e = err as { status?: unknown; data?: unknown; error?: string } | undefined;
  if (!e) return fallback;
  if (e.data && typeof e.data === 'object' && 'message' in e.data) {
    const m = (e.data as { message?: unknown }).message;
    if (typeof m === 'string' && m.trim()) return m;
  }
  if (typeof e.data === 'string' && e.data.trim()) return e.data;
  if (e.status === 403) return 'Service Due is not enabled for this business, or your role does not include it.';
  return e.error ?? fallback;
};

export const {
  useGetNominatedTradesQuery,
  useAddNominatedTradeMutation,
  useRemoveNominatedTradeMutation,
} = nominatedTradesApi;
