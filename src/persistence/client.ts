import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Persistence layer client.
 *
 * Returns null when env vars are missing (e.g. local Supabase not running yet)
 * so the UI can show a banner instead of crashing. Domain code never imports
 * this module — only `App.tsx` and the persistence helpers do.
 */

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let cached: SupabaseClient | null = null;
let bootstrapPromise: Promise<SupabaseClient | null> | null = null;

export const isPersistenceConfigured = (): boolean =>
  typeof url === 'string' && url.length > 0 && typeof anonKey === 'string' && anonKey.length > 0;

/**
 * Returns a configured client. Lazily creates one and signs the user in
 * anonymously on first call. Subsequent calls reuse the session that
 * supabase-js persists in localStorage.
 *
 * Returns null if env vars are missing.
 */
export const getClient = async (): Promise<SupabaseClient | null> => {
  if (cached) return cached;
  if (!isPersistenceConfigured()) return null;
  if (bootstrapPromise) return bootstrapPromise;

  bootstrapPromise = (async () => {
    const client = createClient(url as string, anonKey as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });

    const { data } = await client.auth.getSession();
    if (!data.session) {
      const { error } = await client.auth.signInAnonymously();
      if (error) {
        console.error('Anonymous sign-in failed:', error);
        bootstrapPromise = null;
        return null;
      }
    }

    cached = client;
    return client;
  })();

  return bootstrapPromise;
};

/** Test seam: replace the cached client. Pass null to clear. */
export const __setClientForTests = (client: SupabaseClient | null): void => {
  cached = client;
  bootstrapPromise = null;
};
