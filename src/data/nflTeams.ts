import { Team, TeamId } from '../state/types';

export const NFL_TEAMS: Team[] = [
  // AFC East
  { id: 'BUF' as TeamId, name: 'Bills', city: 'Buffalo', conference: 'AFC', division: 'East' },
  { id: 'MIA' as TeamId, name: 'Dolphins', city: 'Miami', conference: 'AFC', division: 'East' },
  { id: 'NE' as TeamId, name: 'Patriots', city: 'New England', conference: 'AFC', division: 'East' },
  { id: 'NYJ' as TeamId, name: 'Jets', city: 'New York', conference: 'AFC', division: 'East' },
  
  // AFC North
  { id: 'BAL' as TeamId, name: 'Ravens', city: 'Baltimore', conference: 'AFC', division: 'North' },
  { id: 'CIN' as TeamId, name: 'Bengals', city: 'Cincinnati', conference: 'AFC', division: 'North' },
  { id: 'CLE' as TeamId, name: 'Browns', city: 'Cleveland', conference: 'AFC', division: 'North' },
  { id: 'PIT' as TeamId, name: 'Steelers', city: 'Pittsburgh', conference: 'AFC', division: 'North' },
  
  // AFC South
  { id: 'HOU' as TeamId, name: 'Texans', city: 'Houston', conference: 'AFC', division: 'South' },
  { id: 'IND' as TeamId, name: 'Colts', city: 'Indianapolis', conference: 'AFC', division: 'South' },
  { id: 'JAX' as TeamId, name: 'Jaguars', city: 'Jacksonville', conference: 'AFC', division: 'South' },
  { id: 'TEN' as TeamId, name: 'Titans', city: 'Tennessee', conference: 'AFC', division: 'South' },
  
  // AFC West
  { id: 'DEN' as TeamId, name: 'Broncos', city: 'Denver', conference: 'AFC', division: 'West' },
  { id: 'KC' as TeamId, name: 'Chiefs', city: 'Kansas City', conference: 'AFC', division: 'West' },
  { id: 'LV' as TeamId, name: 'Raiders', city: 'Las Vegas', conference: 'AFC', division: 'West' },
  { id: 'LAC' as TeamId, name: 'Chargers', city: 'Los Angeles', conference: 'AFC', division: 'West' },
  
  // NFC East
  { id: 'DAL' as TeamId, name: 'Cowboys', city: 'Dallas', conference: 'NFC', division: 'East' },
  { id: 'NYG' as TeamId, name: 'Giants', city: 'New York', conference: 'NFC', division: 'East' },
  { id: 'PHI' as TeamId, name: 'Eagles', city: 'Philadelphia', conference: 'NFC', division: 'East' },
  { id: 'WAS' as TeamId, name: 'Commanders', city: 'Washington', conference: 'NFC', division: 'East' },
  
  // NFC North
  { id: 'CHI' as TeamId, name: 'Bears', city: 'Chicago', conference: 'NFC', division: 'North' },
  { id: 'DET' as TeamId, name: 'Lions', city: 'Detroit', conference: 'NFC', division: 'North' },
  { id: 'GB' as TeamId, name: 'Packers', city: 'Green Bay', conference: 'NFC', division: 'North' },
  { id: 'MIN' as TeamId, name: 'Vikings', city: 'Minnesota', conference: 'NFC', division: 'North' },
  
  // NFC South
  { id: 'ATL' as TeamId, name: 'Falcons', city: 'Atlanta', conference: 'NFC', division: 'South' },
  { id: 'CAR' as TeamId, name: 'Panthers', city: 'Carolina', conference: 'NFC', division: 'South' },
  { id: 'NO' as TeamId, name: 'Saints', city: 'New Orleans', conference: 'NFC', division: 'South' },
  { id: 'TB' as TeamId, name: 'Buccaneers', city: 'Tampa Bay', conference: 'NFC', division: 'South' },
  
  // NFC West
  { id: 'ARI' as TeamId, name: 'Cardinals', city: 'Arizona', conference: 'NFC', division: 'West' },
  { id: 'LAR' as TeamId, name: 'Rams', city: 'Los Angeles', conference: 'NFC', division: 'West' },
  { id: 'SF' as TeamId, name: '49ers', city: 'San Francisco', conference: 'NFC', division: 'West' },
  { id: 'SEA' as TeamId, name: 'Seahawks', city: 'Seattle', conference: 'NFC', division: 'West' },
];

export const NFL_TEAM_MAP = NFL_TEAMS.reduce<Record<TeamId, Team>>((acc, team) => {
  acc[team.id] = team;
  return acc;
}, {} as Record<TeamId, Team>);
