import { createClient, SupabaseClient } from '@supabase/supabase-js';

type GenericClient = SupabaseClient;

let cachedClient: GenericClient | null = null;

const RAW_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

function normalizeSupabaseUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value.trim());
    return url.origin;
  } catch {
    return undefined;
  }
}

const SUPABASE_URL = normalizeSupabaseUrl(RAW_SUPABASE_URL);

function hasValidConfig(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export function getSupabaseClient(): GenericClient | null {
  if (!hasValidConfig()) {
    return null;
  }

  if (!cachedClient) {
    const url = SUPABASE_URL;
    const anonKey = SUPABASE_ANON_KEY;
    if (!url || !anonKey) {
      return null;
    }

    cachedClient = createClient(url, anonKey, {
      auth: {
        persistSession: true,
      },
      global: {
        headers: {
          'x-client-info': 'nfl-conquest-map',
        },
      },
    });
  }

  return cachedClient;
}

export function getSupabaseConfig(): { url: string; anonKey: string } | null {
  if (!hasValidConfig()) {
    return null;
  }

  const url = SUPABASE_URL;
  const anonKey = SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  return { url, anonKey };
}

export function resetSupabaseClient(): void {
  cachedClient = null;
}

export const SUPABASE_ENABLED = hasValidConfig();
