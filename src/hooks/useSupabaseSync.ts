import { type Dispatch, type SetStateAction, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../lib/supabaseClient';
import type { OnlineGameSession } from '../multiplayer/session';
import type { GameState } from '../state/types';
import { normalizeGameState } from '../state/schema';

export type MultiplayerStatus = 'disabled' | 'connecting' | 'ready' | 'error';

type GameRow = { id: string; state: GameState; version: number; updated_at: string };

export function useSupabaseSync(
  gameState: GameState,
  setGameState: Dispatch<SetStateAction<GameState>>,
  session: OnlineGameSession | null,
): { sessionId: string | null; status: MultiplayerStatus; error: string | null; isEnabled: boolean } {
  const client = getSupabaseClient();
  const [status, setStatus] = useState<MultiplayerStatus>(session ? 'connecting' : 'disabled');
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const versionRef = useRef(session?.initialVersion ?? 0);
  const skipPersistRef = useRef(true);

  useEffect(() => {
    versionRef.current = session?.initialVersion ?? 0;
    skipPersistRef.current = true;
    setStatus(session ? 'connecting' : 'disabled');
    setError(null);
  }, [session]);

  useEffect(() => {
    if (!client || !session) return;
    let mounted = true;

    const syncActiveMembers = async () => {
      const names = await fetchActiveMembers(client, session.gameId);
      if (!mounted) return;
      setGameState((current) => {
        if (current.connectedUsers.join('\u0000') === names.join('\u0000')) return current;
        return { ...current, connectedUsers: names };
      });
    };

    const channel = subscribeToGame(client, session.gameId, (row) => {
      if (!mounted || row.version <= versionRef.current) return;
      const normalized = normalizeGameState(row.state);
      if (!normalized) {
        setStatus('error');
        setError('Server vrátil neplatný stav hry.');
        return;
      }
      versionRef.current = row.version;
      skipPersistRef.current = true;
      setGameState(normalized);
    }, () => void syncActiveMembers());
    channelRef.current = channel;
    channel.subscribe((event) => {
      if (!mounted) return;
      if (event === 'SUBSCRIBED') {
        setStatus('ready');
        void syncActiveMembers();
      }
      if (event === 'CHANNEL_ERROR' || event === 'TIMED_OUT') {
        setStatus('error');
        setError('Realtime připojení bylo přerušeno.');
      }
    });

    const presenceTimer = window.setInterval(() => {
      void client.rpc('touch_game_member', { target_game_id: session.gameId }).then(() => syncActiveMembers());
    }, 30_000);

    return () => {
      mounted = false;
      window.clearInterval(presenceTimer);
      if (channelRef.current) void client.removeChannel(channelRef.current);
      channelRef.current = null;
    };
  }, [client, session, setGameState]);

  useEffect(() => {
    if (!client || !session || status !== 'ready') return;
    if (skipPersistRef.current) {
      skipPersistRef.current = false;
      return;
    }

    const timeout = window.setTimeout(async () => {
      const expectedVersion = versionRef.current;
      const { data, error: updateError } = await client.rpc('update_game_state', {
        target_game_id: session.gameId,
        next_state: gameState,
        expected_version: expectedVersion,
      });
      if (!updateError) {
        const row = (data as unknown as Array<{ game_version: number }> | null)?.[0];
        if (row) versionRef.current = row.game_version;
        return;
      }

      if (updateError.code === '40001') {
        const latest = await fetchLatestGame(client, session.gameId);
        if (latest) {
          const normalized = normalizeGameState(latest.state);
          if (!normalized) throw new Error('Server vrátil neplatný stav hry.');
          versionRef.current = latest.version;
          skipPersistRef.current = true;
          setGameState(normalized);
          setError('Hra se změnila na jiném zařízení; načetl se nejnovější stav.');
        }
        return;
      }
      setStatus('error');
      setError(updateError.message);
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [client, gameState, session, setGameState, status]);

  return { sessionId: session?.gameId ?? null, status, error, isEnabled: Boolean(session) };
}

function subscribeToGame(
  client: SupabaseClient,
  gameId: string,
  onChange: (row: GameRow) => void,
  onMembersChange: () => void,
): RealtimeChannel {
  return client
    .channel(`game:${gameId}`)
    .on('postgres_changes', {
      event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${gameId}`,
    }, (payload) => onChange(payload.new as GameRow))
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'game_members', filter: `game_id=eq.${gameId}`,
    }, onMembersChange);
}

async function fetchLatestGame(client: SupabaseClient, gameId: string): Promise<GameRow | null> {
  const { data, error } = await client
    .from('games')
    .select('id,state,version,updated_at')
    .eq('id', gameId)
    .maybeSingle();
  if (error) throw error;
  return data as GameRow | null;
}

async function fetchActiveMembers(client: SupabaseClient, gameId: string): Promise<string[]> {
  const activeSince = new Date(Date.now() - 90_000).toISOString();
  const { data, error } = await client
    .from('game_members')
    .select('display_name,last_seen_at')
    .eq('game_id', gameId)
    .gte('last_seen_at', activeSince)
    .order('joined_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((member) => String(member.display_name));
}
