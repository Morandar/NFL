import { NFL_TEAMS } from '../data/nflTeams';
import type { GameState, Player, Settings, TeamId } from './types';

export const GAME_STATE_VERSION = 2;
const TEAM_IDS = new Set<string>(NFL_TEAMS.map((team) => team.id));

const DEFAULT_SETTINGS: Settings = {
  picksPerPlayer: 1,
  useMarginRules: false,
  playoffBoost: false,
  superBowlSweep: false,
  lockDivisionRule: false,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function normalizePlayer(value: unknown): Player | null {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.name !== 'string') return null;
  const teamsOwned = strings(value.teamsOwned).filter((id): id is TeamId => TEAM_IDS.has(id));
  const homeTeamId = typeof value.homeTeamId === 'string' && TEAM_IDS.has(value.homeTeamId)
    ? value.homeTeamId as TeamId
    : teamsOwned[0] ?? null;
  return {
    id: value.id,
    name: value.name.slice(0, 20),
    color: typeof value.color === 'string' ? value.color : '#4ECDC4',
    teamsOwned,
    homeTeamId,
    userId: typeof value.userId === 'string' ? value.userId : null,
  };
}

export function normalizeGameState(value: unknown): GameState | null {
  if (!isRecord(value)) return null;
  const phase = value.phase;
  if (phase !== 'setup' && phase !== 'draft' && phase !== 'season') return null;
  const players = Array.isArray(value.players)
    ? value.players.map(normalizePlayer).filter((player): player is Player => Boolean(player))
    : [];
  const playerIds = new Set(players.map((player) => player.id));
  const rawSettings = isRecord(value.settings) ? value.settings : {};
  const picks = rawSettings.picksPerPlayer;
  const settings: Settings = {
    ...DEFAULT_SETTINGS,
    picksPerPlayer: picks === 2 || picks === 3 ? picks : 1,
    useMarginRules: rawSettings.useMarginRules === true,
    playoffBoost: rawSettings.playoffBoost === true,
    superBowlSweep: rawSettings.superBowlSweep === true,
    lockDivisionRule: rawSettings.lockDivisionRule === true,
  };
  const rawOwnership = isRecord(value.ownership) ? value.ownership : {};
  const ownership = Object.fromEntries(NFL_TEAMS.map((team) => {
    const owner = rawOwnership[team.id];
    return [team.id, typeof owner === 'string' && playerIds.has(owner) ? owner : null];
  })) as Record<TeamId, string | null>;
  const messages = Array.isArray(value.messages) ? value.messages.flatMap((message) => {
    if (!isRecord(message) || typeof message.user !== 'string' || typeof message.text !== 'string') return [];
    return [{
      user: message.user.slice(0, 20),
      text: message.text.slice(0, 200),
      timestamp: typeof message.timestamp === 'string' ? message.timestamp : new Date(0).toISOString(),
    }];
  }) : [];

  return {
    phase,
    players,
    draftOrder: strings(value.draftOrder).filter((id) => playerIds.has(id)),
    currentPickIndex: typeof value.currentPickIndex === 'number' && value.currentPickIndex >= 0
      ? Math.floor(value.currentPickIndex) : 0,
    snakeForward: value.snakeForward !== false,
    ownership,
    week: typeof value.week === 'number' && value.week >= 1 ? Math.floor(value.week) : 1,
    settings,
    log: strings(value.log).slice(-500),
    hostId: typeof value.hostId === 'string' ? value.hostId : null,
    connectedUsers: strings(value.connectedUsers),
    messages: messages.slice(-100),
  };
}
