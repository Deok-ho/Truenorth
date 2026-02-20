import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@shared/constants';

let clientInstance: SupabaseClient | null = null;

/**
 * Returns a singleton Supabase client.
 * Reads URL/key from chrome.storage.local first, falling back to
 * compile-time environment variables.
 */
export async function getSupabaseClient(): Promise<SupabaseClient> {
  if (clientInstance) {
    return clientInstance;
  }

  let url = SUPABASE_URL;
  let anonKey = SUPABASE_ANON_KEY;

  try {
    const stored = await chrome?.storage?.local?.get([
      'supabaseUrl',
      'supabaseAnonKey',
    ]);
    if (stored?.supabaseUrl) url = stored.supabaseUrl;
    if (stored?.supabaseAnonKey) anonKey = stored.supabaseAnonKey;
  } catch {
    // chrome.storage not available
  }

  if (!url || !anonKey) {
    throw new Error(
      'Supabase URL 또는 Anon Key가 설정되지 않았습니다.',
    );
  }

  clientInstance = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return clientInstance;
}

/**
 * Resets the cached client (useful when credentials change).
 */
export function resetSupabaseClient(): void {
  clientInstance = null;
}
