import type { User } from '@supabase/supabase-js';
import { getSupabaseClient } from '../lib/supabaseClient';
import type { GameState } from '../state/types';
import { normalizeGameState } from '../state/schema';

export type OnlineGameSession = {
  gameId: string;
  code: string;
  userId: string;
  hostUserId: string;
  initialVersion: number;
};

type CreateGameRow = {
  game_id: string;
  game_code: string;
  game_state: GameState;
  game_version: number;
};

type JoinGameRow = {
  game_id: string;
  normalized_code: string;
  game_state: GameState;
  game_version: number;
  host_user_id: string;
};

async function requireAuthenticatedUser(): Promise<User> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase není nakonfigurováno.');

  const { data: sessionData } = await client.auth.getSession();
  if (sessionData.session?.user) return sessionData.session.user;

  throw new Error('Pro online hru se nejdřív přihlas přes Google, Apple nebo e-mail.');
}

export async function createOnlineGame(
  displayName: string,
  initialState: GameState,
  leagueId: string,
  seasonId: string,
): Promise<{ session: OnlineGameSession; state: GameState }> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase není nakonfigurováno.');
  const user = await requireAuthenticatedUser();
  const { data, error } = await client.rpc('create_game', {
    target_league_id: leagueId,
    target_season_id: seasonId,
    initial_state: initialState,
    display_name: displayName,
  });
  if (error) throw error;
  const row = (data as unknown as CreateGameRow[] | null)?.[0];
  if (!row) throw new Error('Supabase nevrátilo vytvořenou hru.');
  const state = normalizeGameState(row.game_state);
  if (!state) throw new Error('Supabase vrátilo neplatný stav hry.');
  return {
    session: {
      gameId: row.game_id,
      code: row.game_code,
      userId: user.id,
      hostUserId: user.id,
      initialVersion: row.game_version,
    },
    state,
  };
}

export async function joinOnlineGame(
  displayName: string,
  code: string,
): Promise<{ session: OnlineGameSession; state: GameState }> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase není nakonfigurováno.');
  const user = await requireAuthenticatedUser();
  const { data, error } = await client.rpc('join_game', {
    game_code: code.toUpperCase().trim(),
    display_name: displayName,
  });
  if (error) throw error;
  const row = (data as unknown as JoinGameRow[] | null)?.[0];
  if (!row) throw new Error('Hra s tímto kódem nebyla nalezena.');
  const state = normalizeGameState(row.game_state);
  if (!state) throw new Error('Uložený stav hry je neplatný.');
  return {
    session: {
      gameId: row.game_id,
      code: row.normalized_code,
      userId: user.id,
      hostUserId: row.host_user_id,
      initialVersion: row.game_version,
    },
    state,
  };
}

export async function leaveOnlineIdentity(): Promise<void> {
  const client = getSupabaseClient();
  if (client) await client.auth.signOut();
}
