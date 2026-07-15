import { getSupabaseClient } from '../lib/supabaseClient';

export type LeagueContext = {
  leagueId: string;
  leagueName: string;
  inviteCode: string;
  seasonId: string;
  seasonName: string;
  seasonYear: number;
  role: 'owner' | 'admin' | 'member';
  games: LeagueGame[];
};

export type LeagueGame = {
  id: string;
  code: string;
  status: 'setup' | 'active' | 'completed' | 'archived';
  updatedAt: string;
};

type MembershipRow = {
  role: LeagueContext['role'];
  leagues: {
    id: string;
    name: string;
    invite_code: string;
    seasons: Array<{
      id: string;
      name: string;
      year: number;
      status: string;
      games: Array<{ id: string; code: string; status: LeagueGame['status']; updated_at: string }>;
    }>;
  } | null;
};

export async function listMyLeagues(): Promise<LeagueContext[]> {
  const client = getSupabaseClient();
  if (!client) return [];
  const { data, error } = await client
    .from('league_members')
    .select('role, leagues(id,name,invite_code,seasons(id,name,year,status,games(id,code,status,updated_at)))')
    .order('joined_at', { ascending: false });
  if (error) throw error;
  return ((data as unknown as MembershipRow[] | null) ?? []).flatMap((membership) => {
    const league = membership.leagues;
    if (!league) return [];
    const season = [...league.seasons]
      .filter((item) => item.status === 'active')
      .sort((a, b) => b.year - a.year)[0] ?? [...league.seasons].sort((a, b) => b.year - a.year)[0];
    if (!season) return [];
    return [{
      leagueId: league.id,
      leagueName: league.name,
      inviteCode: league.invite_code,
      seasonId: season.id,
      seasonName: season.name,
      seasonYear: season.year,
      role: membership.role,
      games: [...season.games]
        .filter((game) => game.status !== 'archived')
        .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at))
        .map((game) => ({ id: game.id, code: game.code, status: game.status, updatedAt: game.updated_at })),
    }];
  });
}

export async function createLeague(name: string, year: number): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase není nakonfigurováno.');
  const { error } = await client.rpc('create_league', {
    league_name: name.trim(),
    season_name: `NFL ${year}`,
    season_year: year,
  });
  if (error) throw error;
}

export async function joinLeague(code: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase není nakonfigurováno.');
  const { error } = await client.rpc('join_league', { code: code.toUpperCase().trim() });
  if (error) throw error;
}
