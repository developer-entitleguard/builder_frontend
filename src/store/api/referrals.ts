import { api } from './apiSlice';

/**
 * Verified Referrals (Revenue Capabilities Track D, VR1 to VR14). REFERRALS
 * module. Mirrors ReferralsOrgController on the backend
 * (/api/builder/referrals). Proof Page and terms: Administrator. Queue: also
 * Customer Support. Responses are plain JSON; errors carry a `message`.
 *
 * There is deliberately no endpoint to send review requests: they go out on
 * events alone. Do not add one here.
 */

// ---- Proof Page (ProofPageService.OrgView, ProofMeasuresService.Measures) ----

export interface ProofMeasure {
  key: string;
  label: string;
  /** Null when the measure is not shown (fewer than 10 homes behind it). */
  value: string | null;
  homes: number;
  from: string | null;
  to: string | null;
  shown: boolean;
  note: string | null;
}

export interface ProofMeasures {
  homesOnRecord: number;
  publishable: boolean;
  measures: ProofMeasure[];
  method: string | null;
  computedAt: string | null;
}

export interface ProofPageState {
  slug: string;
  published: boolean;
  publishedAt: string | null;
  unpublishedAt: string | null;
  unpublishReason: string | null;
}

export interface ProofPageView {
  page: ProofPageState | null;
  measures: ProofMeasures;
  /** Relative, e.g. "/p/acme-homes". Prefix with the consumer web URL. */
  publicPath: string | null;
}

// ---- terms (ReferralProgramme) ----

export type RewardRecipient = 'NONE' | 'OWNER' | 'FRIEND' | 'BOTH';
export type RewardTrigger = 'CONTRACT_SIGNED' | 'HANDOVER';

export interface ReferralTerms {
  version: number;
  recipient: RewardRecipient;
  rewardDescription: string | null;
  rewardAmount: number | null;
  triggerStage: RewardTrigger | null;
  eligibilityText: string | null;
  createdAt: string | null;
}

export interface ReferralTermsInput {
  recipient: RewardRecipient;
  rewardDescription?: string | null;
  rewardAmount?: number | null;
  triggerStage?: RewardTrigger | null;
  eligibilityText?: string | null;
}

// ---- queue (ReferralService.QueueRow) ----

export type ReferralStatus =
  | 'NEW'
  | 'CONTACTED'
  | 'CONTRACT_SIGNED'
  | 'REWARD_DUE'
  | 'REWARD_PAID'
  | 'CLOSED';

/** The statuses staff may set (Referral.STAFF_STATUSES). */
export type ReferralStaffStatus = Exclude<ReferralStatus, 'NEW'>;

export interface ReferralQueueRow {
  id: string;
  status: ReferralStatus;
  submittedAt: string | null;
  /** Friend fields are null after redaction. */
  friendName: string | null;
  friendEmail: string | null;
  friendPhone: string | null;
  friendNote: string | null;
  referredRegistrationId: string | null;
  termsVersion: number | null;
  /** False when shared under no-reward terms: REWARD_* statuses answer 409. */
  rewardTerms: boolean;
}

// ---- review links (OrgReviewLink) ----

export interface ReviewLinks {
  googleUrl: string | null;
  productReviewUrl: string | null;
}

const BASE = '/api/builder/referrals';

export const referralsApi = api.injectEndpoints({
  endpoints: (build) => ({
    getProofPage: build.query<ProofPageView, void>({
      query: () => ({ url: `${BASE}/proof-page`, method: 'GET' }),
      providesTags: [{ type: 'Referrals', id: 'PROOF' }],
    }),
    publishProofPage: build.mutation<ProofPageView, void>({
      query: () => ({ url: `${BASE}/proof-page/publish`, method: 'POST' }),
      invalidatesTags: [{ type: 'Referrals', id: 'PROOF' }],
    }),
    unpublishProofPage: build.mutation<ProofPageView, void>({
      query: () => ({ url: `${BASE}/proof-page/unpublish`, method: 'POST' }),
      invalidatesTags: [{ type: 'Referrals', id: 'PROOF' }],
    }),

    getReferralTerms: build.query<ReferralTerms | null, void>({
      query: () => ({ url: `${BASE}/terms`, method: 'GET' }),
      // The backend answers an empty body when no terms are set yet.
      transformResponse: (r: ReferralTerms | null | '') => (r ? r : null),
      providesTags: [{ type: 'Referrals', id: 'TERMS' }],
    }),
    setReferralTerms: build.mutation<ReferralTerms, ReferralTermsInput>({
      query: (body) => ({ url: `${BASE}/terms`, method: 'PUT', body }),
      invalidatesTags: [{ type: 'Referrals', id: 'TERMS' }],
    }),

    getReferralQueue: build.query<ReferralQueueRow[], void>({
      query: () => ({ url: `${BASE}/queue`, method: 'GET' }),
      providesTags: [{ type: 'Referrals', id: 'QUEUE' }],
    }),
    setReferralStatus: build.mutation<ReferralQueueRow, { id: string; status: ReferralStaffStatus }>({
      query: ({ id, status }) => ({ url: `${BASE}/queue/${id}/status`, method: 'PUT', body: { status } }),
      invalidatesTags: [{ type: 'Referrals', id: 'QUEUE' }],
    }),
    linkReferralToHome: build.mutation<ReferralQueueRow, { id: string; registrationId: string }>({
      query: ({ id, registrationId }) => ({
        url: `${BASE}/queue/${id}/link`,
        method: 'POST',
        body: { registrationId },
      }),
      invalidatesTags: [{ type: 'Referrals', id: 'QUEUE' }],
    }),

    getReviewLinks: build.query<ReviewLinks | null, void>({
      query: () => ({ url: `${BASE}/review-links`, method: 'GET' }),
      transformResponse: (r: ReviewLinks | null | '') => (r ? r : null),
      providesTags: [{ type: 'Referrals', id: 'REVIEW_LINKS' }],
    }),
    setReviewLinks: build.mutation<ReviewLinks, ReviewLinks>({
      query: (body) => ({ url: `${BASE}/review-links`, method: 'PUT', body }),
      invalidatesTags: [{ type: 'Referrals', id: 'REVIEW_LINKS' }],
    }),
  }),
});

/** Pulls the backend's `message` out of an RTK Query error. */
export const referralsErrorMessage = (err: unknown, fallback = 'Something went wrong'): string => {
  const e = err as { status?: unknown; data?: unknown; error?: string } | undefined;
  if (!e) return fallback;
  if (e.data && typeof e.data === 'object' && 'message' in e.data) {
    const m = (e.data as { message?: unknown }).message;
    if (typeof m === 'string' && m.trim()) return m;
  }
  if (typeof e.data === 'string' && e.data.trim()) return e.data;
  if (e.status === 403) return 'Verified Referrals is not enabled for this business, or your role does not include it.';
  return e.error ?? fallback;
};

export const {
  useGetProofPageQuery,
  usePublishProofPageMutation,
  useUnpublishProofPageMutation,
  useGetReferralTermsQuery,
  useSetReferralTermsMutation,
  useGetReferralQueueQuery,
  useSetReferralStatusMutation,
  useLinkReferralToHomeMutation,
  useGetReviewLinksQuery,
  useSetReviewLinksMutation,
} = referralsApi;
