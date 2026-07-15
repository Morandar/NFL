import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { getSupabaseClient } from '../lib/supabaseClient';

export async function getCurrentUser(): Promise<User | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  const { data, error } = await client.auth.getUser();
  if (error) return null;
  if (data.user?.is_anonymous) {
    await client.auth.signOut();
    return null;
  }
  return data.user;
}

export function observeAuth(
  callback: (event: AuthChangeEvent, session: Session | null) => void,
): () => void {
  const client = getSupabaseClient();
  if (!client) return () => undefined;
  const { data } = client.auth.onAuthStateChange((event, session) => {
    callback(event, session?.user.is_anonymous ? null : session);
  });
  return () => data.subscription.unsubscribe();
}

export async function signInWithProvider(provider: 'google' | 'apple'): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase není nakonfigurováno.');
  const { error } = await client.auth.signInWithOAuth({
    provider,
    options: { redirectTo: window.location.origin },
  });
  if (error) throw error;
}

export async function sendMagicLink(email: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase není nakonfigurováno.');
  const { error } = await client.auth.signInWithOtp({
    email: email.trim(),
    options: { emailRedirectTo: window.location.origin },
  });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  const client = getSupabaseClient();
  if (client) await client.auth.signOut();
}
