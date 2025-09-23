import { type Dispatch, type SetStateAction, useEffect, useMemo, useRef, useState } from 'react';
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient, SUPABASE_ENABLED } from '../lib/supabaseClient';
import type { GameState } from '../state/types';

export type MultiplayerStatus = 'disabled' | 'connecting' | 'ready' | 'error';

type GenericClient = SupabaseClient<any, 'public', any>;

type GameSessionRow = {
  id: string;
  state: GameState;
  updated_at: string;
};

type SessionHookResult = {
  sessionId: string | null;
  status: MultiplayerStatus;
  error: string | null;
  isEnabled: boolean;
};

const SESSION_STORAGE_KEY = 'nfl-conquest-session-id-v1';

export function useSupabaseSync(
  gameState: GameState,
  setGameState: Dispatch<SetStateAction<GameState>>,
): SessionHookResult {
  const isEnabled = SUPABASE_ENABLED;
  const client = useMemo(() => getSupabaseClient(), []);
  const sessionId = 'main';
  const [status, setStatus] = useState<MultiplayerStatus>(() =>
    isEnabled ? 'connecting' : 'disabled',
  );
  const [error, setError] = useState<string | null>(null);

  const lastSyncedAtRef = useRef<string | null>(null);
  const skipNextPersistRef = useRef(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const gameStateRef = useRef(gameState);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    if (!client || !sessionId || !isEnabled) {
      return;
    }

    let mounted = true;

    const init = async () => {
      try {
        setStatus('connecting');
        setError(null);

        const existing = await fetchSessionState(client, sessionId);

        if (!mounted) return;

        if (existing) {
          lastSyncedAtRef.current = existing.updatedAt;
          skipNextPersistRef.current = true;
          setGameState(existing.state);
        } else {
          const timestamp = new Date().toISOString();
          await upsertSessionState(client, sessionId, gameStateRef.current, timestamp);
          if (!mounted) return;
          lastSyncedAtRef.current = timestamp;
        }

        const channel = subscribeToSession(client, sessionId, (row) => {
          if (!row) return;
          if (row.updated_at === lastSyncedAtRef.current) {
            return;
          }
          lastSyncedAtRef.current = row.updated_at;
          skipNextPersistRef.current = true;
          setGameState(row.state);
        });

        channelRef.current = channel;

        channel.subscribe((event) => {
          if (event === 'SUBSCRIBED') {
            setStatus('ready');
          }
          if (event === 'CHANNEL_ERROR') {
            setStatus('error');
            setError('Realtime připojení k Supabase selhalo.');
          }
        });
      } catch (fetchError) {
        console.error('Supabase init failed', fetchError);
        if (!mounted) return;
        setStatus('error');
        setError(normalizeError(fetchError));
      }
    };

    init();

    return () => {
      mounted = false;
      if (channelRef.current) {
        void client.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [client, sessionId, isEnabled, setGameState]);

  useEffect(() => {
    if (!client || !sessionId || !isEnabled) {
      return;
    }
    if (status !== 'ready') {
      return;
    }
    if (skipNextPersistRef.current) {
      skipNextPersistRef.current = false;
      return;
    }

    const timestamp = new Date().toISOString();
    lastSyncedAtRef.current = timestamp;

    const timeout = window.setTimeout(async () => {
      try {
        await upsertSessionState(client, sessionId, gameState, timestamp);
      } catch (persistError) {
        console.error('Supabase persist failed', persistError);
        setStatus('error');
        setError(normalizeError(persistError));
      }
    }, 250);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [client, sessionId, isEnabled, status, gameState]);

  return { sessionId, status, error, isEnabled };
}

function resolveSessionId(): string {
  if (typeof window === 'undefined') {
    return crypto.randomUUID();
  }

  const url = new URL(window.location.href);
  const searchParams = url.searchParams;
  const urlSession = searchParams.get('session');
  if (urlSession) {
    persistSessionId(urlSession);
    return urlSession;
  }

  const stored = readStoredSessionId();
  if (stored) {
    ensureSessionInUrl(url, stored);
    return stored;
  }

  const newSession = createSessionId();
  persistSessionId(newSession);
  ensureSessionInUrl(url, newSession);
  return newSession;
}

function ensureSessionInUrl(url: URL, sessionId: string): void {
  url.searchParams.set('session', sessionId);
  const nextUrl = `${url.pathname}?${url.searchParams.toString()}${url.hash}`;
  window.history.replaceState(null, '', nextUrl);
}

function createSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 12);
  }
  return Math.random().toString(36).slice(2, 14);
}

function persistSessionId(sessionId: string): void {
  try {
    window.localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
  } catch (error) {
    console.warn('Failed to persist session id', error);
  }
}

function readStoredSessionId(): string | null {
  try {
    return window.localStorage.getItem(SESSION_STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to read stored session id', error);
    return null;
  }
}

async function fetchSessionState(
  client: GenericClient,
  sessionId: string,
): Promise<{ state: GameState; updatedAt: string } | null> {
  const { data, error } = await client
    .from('game_sessions')
    .select('state, updated_at')
    .eq('id', sessionId)
    .maybeSingle();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw error;
  }

  if (!data) {
    return null;
  }

  return {
    state: data.state as GameState,
    updatedAt: data.updated_at as string,
  };
}

async function upsertSessionState(
  client: GenericClient,
  sessionId: string,
  state: GameState,
  updatedAt: string,
): Promise<void> {
  const { error } = await client
    .from('game_sessions')
    .upsert(
      {
        id: sessionId,
        state,
        updated_at: updatedAt,
      },
      { onConflict: 'id' },
    );

  if (error) {
    throw error;
  }
}

function subscribeToSession(
  client: GenericClient,
  sessionId: string,
  onChange: (row: GameSessionRow | null) => void,
): RealtimeChannel {
  return client
    .channel(`game_sessions:${sessionId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'game_sessions',
        filter: `id=eq.${sessionId}`,
      },
      (payload) => {
        const row = payload.new as GameSessionRow | null;
        onChange(row ?? null);
      },
    );
}

function normalizeError(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return 'Neznámá chyba při komunikaci se Supabase.';
}
