// Supabase has been removed — the builder frontend talks only to the EntitleGuard
// backend now. This file is an inert stub kept so any residual legacy call site
// degrades to a harmless no-op instead of hitting Supabase (no network, no anon
// key, no dependency). Remaining `supabase.*` references are dead branches slated
// for cleanup; none run on the live builder-JWT path.

type SbResult = { data: null; error: null };
const SB_RESULT: SbResult = { data: null, error: null };

// A chainable, awaitable no-op query builder: every method (.select/.eq/.update/
// .single/…) returns the same object, and awaiting it resolves to {data:null,error:null}.
const makeChain = (): unknown => {
  const chain: unknown = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === "then") {
          return (resolve: (v: SbResult) => unknown) =>
            Promise.resolve(SB_RESULT).then(resolve);
        }
        return () => chain;
      },
    },
  );
  return chain;
};

/* eslint-disable @typescript-eslint/no-explicit-any */
export const supabase: any = {
  auth: {
    getSession: async () => ({ data: { session: null } }),
    getUser: async () => ({ data: { user: null } }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signInWithPassword: async () => ({ data: { session: null, user: null }, error: new Error("Supabase has been removed") }),
    signUp: async () => ({ data: { session: null, user: null }, error: new Error("Supabase has been removed") }),
    signOut: async () => ({ error: null }),
    resetPasswordForEmail: async () => ({ error: new Error("Supabase has been removed") }),
    updateUser: async () => ({ data: { user: null }, error: new Error("Supabase has been removed") }),
  },
  from: () => makeChain(),
  rpc: async () => SB_RESULT,
  functions: { invoke: async () => SB_RESULT },
  storage: {
    from: () => ({
      upload: async () => SB_RESULT,
      remove: async () => SB_RESULT,
      getPublicUrl: () => ({ data: { publicUrl: "" } }),
    }),
  },
};
