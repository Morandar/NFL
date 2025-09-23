export type TeamId =
  | 'ARI' | 'ATL' | 'BAL' | 'BUF' | 'CAR' | 'CHI' | 'CIN' | 'CLE'
  | 'DAL' | 'DEN' | 'DET' | 'GB' | 'HOU' | 'IND' | 'JAX' | 'KC'
  | 'LV' | 'LAC' | 'LAR' | 'MIA' | 'MIN' | 'NE' | 'NO' | 'NYG'
  | 'NYJ' | 'PHI' | 'PIT' | 'SEA' | 'SF' | 'TB' | 'TEN' | 'WAS';

export type Team = {
  id: TeamId;
  name: string;
  city: string;
  conference: 'AFC' | 'NFC';
  division: 'East' | 'North' | 'South' | 'West';
};

export type Player = {
  id: string;
  name: string;
  color: string;
  teamsOwned: TeamId[];
  homeTeamId?: TeamId | null;
  userId?: string | null;
};

export type Settings = {
  picksPerPlayer: 1 | 2 | 3;
  useMarginRules: boolean;
  playoffBoost: boolean;
  superBowlSweep: boolean;
  lockDivisionRule: boolean;
};

export type GameState = {
  phase: 'setup' | 'draft' | 'season';
  players: Player[];
  draftOrder: string[];
  currentPickIndex: number;
  snakeForward: boolean;
  ownership: Record<TeamId, string | null>;
  week: number;
  settings: Settings;
  log: string[];
  hostId: string | null;
  connectedUsers: string[];
};

export type ResultRow = {
  week: number;
  winner: TeamId;
  loser: TeamId;
  margin?: number;
  isPlayoff?: boolean;
  isSuperBowl?: boolean;
};
