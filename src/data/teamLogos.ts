import { TeamId } from '../state/types';

const TEAM_IDS: TeamId[] = [
  'ARI','ATL','BAL','BUF','CAR','CHI','CIN','CLE','DAL','DEN','DET','GB','HOU','IND','JAX','KC',
  'LV','LAC','LAR','MIA','MIN','NE','NO','NYG','NYJ','PHI','PIT','SEA','SF','TB','TEN','WAS',
];

const logoModules = import.meta.glob<string>(
  '../assets/team-logos/**/*.{svg,png}',
  { eager: true, import: 'default' },
);

const colorMap: Partial<Record<TeamId, string>> = {};
const bwMap: Partial<Record<TeamId, string>> = {};

const resolveTeamId = (filePath: string): TeamId | null => {
  const upper = filePath.toUpperCase();
  for (const id of TEAM_IDS) {
    if (upper.includes(`/${id}.`) || upper.includes(`/${id}-`) || upper.endsWith(`/${id}`)) {
      return id;
    }
    if (upper.includes(`/${id}BW`)) {
      return id;
    }
  }
  const match = upper.match(/\/([A-Z]{2,4})BW?\.(PNG|SVG)$/);
  if (match) {
    return match[1] as TeamId;
  }
  return null;
};

Object.entries(logoModules).forEach(([path, url]) => {
  const teamId = resolveTeamId(path);
  if (!teamId) return;
  const upper = path.toUpperCase();
  if (upper.includes('BW')) {
    bwMap[teamId] = url as string;
  } else {
    colorMap[teamId] = url as string;
  }
});

TEAM_IDS.forEach((id) => {
  if (!colorMap[id] && bwMap[id]) {
    colorMap[id] = bwMap[id];
  }
});

export const TEAM_LOGOS: Record<TeamId, string | undefined> = colorMap as Record<TeamId, string | undefined>;
export const TEAM_LOGOS_BW: Record<TeamId, string | undefined> = bwMap as Record<TeamId, string | undefined>;
