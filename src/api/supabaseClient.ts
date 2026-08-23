import { createClient } from '@supabase/supabase-js';

const rawUrl = (import.meta.env.VITE_SUPABASE_URL ?? '').trim();
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();

/**
 * Accepts the value people actually paste and returns the API origin.
 *
 * The dashboard URL (`https://supabase.com/dashboard/project/<ref>`) is the one
 * shown while you're clicking around, so it gets copied into `.env` constantly —
 * but requests to it 404. Recover the project ref and rebuild the API origin
 * instead of failing, and strip any trailing path/slash supabase-js won't expect.
 */
function normalizeSupabaseUrl(value: string): string {
  if (!value) return '';

  const dashboard = value.match(/supabase\.(?:com|co)\/dashboard\/project\/([a-z0-9]{20})/i);
  if (dashboard) return `https://${dashboard[1].toLowerCase()}.supabase.co`;

  try {
    return new URL(value).origin;
  } catch {
    return value.replace(/\/+$/, '');
  }
}

const url = normalizeSupabaseUrl(rawUrl);

function detectConfigError(): string | null {
  if (!rawUrl || !anonKey) {
    return 'Supabase is not configured: copy `.env.example` to `.env`, set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then restart the dev server.';
  }
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.(co|in|red)$/i.test(url)) {
    return `VITE_SUPABASE_URL is not a Supabase API URL (got "${rawUrl}"). Use the "Project URL" from Project Settings → API, e.g. https://your-project-ref.supabase.co`;
  }
  // Legacy anon keys are JWTs; newer projects issue `sb_publishable_…` keys.
  if (!anonKey.startsWith('sb_publishable_') && anonKey.split('.').length !== 3) {
    return 'VITE_SUPABASE_ANON_KEY does not look like a valid key. Copy the "anon public" key from Project Settings → API.';
  }
  return null;
}

/**
 * Non-null when the backend credentials are missing or malformed.
 *
 * The UI reads this to explain the problem up front. Without it a bad `.env`
 * surfaced only as an opaque failed request to a placeholder host, which reads
 * like "wrong password" and sends you hunting in the wrong place.
 */
export const supabaseConfigError = detectConfigError();

if (supabaseConfigError) {
  // eslint-disable-next-line no-console
  console.error(`[supabase] ${supabaseConfigError}`);
} else if (url !== rawUrl.replace(/\/+$/, '')) {
  // eslint-disable-next-line no-console
  console.warn(`[supabase] VITE_SUPABASE_URL normalized to ${url}`);
}

/**
 * Singleton Supabase client used across the whole app.
 *
 * The client is intentionally untyped at this layer; type-safety is enforced
 * in the service layer (`src/services/*`), where every query result is mapped
 * to a concrete domain model from `src/types/models.ts`. This keeps write
 * payloads ergonomic while queries still return strongly-typed data to the UI.
 */
// supabase-js throws on an empty URL, so keep a syntactically valid stand-in to
// let the app boot as far as the login screen, where `supabaseConfigError`
// explains what to fix. No request is attempted while that error is set.
export const supabase = createClient(
  supabaseConfigError ? 'https://unconfigured.supabase.co' : url,
  supabaseConfigError ? 'unconfigured' : anonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'lbh-auth',
    },
  },
);
