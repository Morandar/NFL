import { NFL_TEAMS } from '../data/nflTeams';
import type { GameState, TeamId } from '../state/types';

export function createTestState(): GameState {
  const ownership = Object.fromEntries(NFL_TEAMS.map((team) => [team.id, null])) as Record<TeamId, string | null>;
  return {
    phase: 'season',
    players: [
      { id: 'p1', name: 'Alice', color: '#ff0000', teamsOwned: ['BUF'], homeTeamId: 'BUF', userId: 'u1' },
      { id: 'p2', name: 'Bob', color: '#0000ff', teamsOwned: ['MIA'], homeTeamId: 'MIA', userId: 'u2' },
    ],
    draftOrder: ['p1', 'p2'],
    currentPickIndex: 2,
    snakeForward: true,
    ownership: { ...ownership, BUF: 'p1', MIA: 'p2' },
    week: 1,
    settings: {
      picksPerPlayer: 1,
      useMarginRules: false,
      playoffBoost: false,
      superBowlSweep: false,
      lockDivisionRule: false,
    },
    log: [],
    hostId: 'Alice',
    connectedUsers: ['Alice', 'Bob'],
    messages: [],
    appliedResults: [],
  };
}
