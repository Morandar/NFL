const fs = require('fs');
const path = require('path');

const TEAM_COLORS = {
  ARI: '#97233F',
  ATL: '#A71930',
  BAL: '#241773',
  BUF: '#00338D',
  CAR: '#0085CA',
  CHI: '#0B162A',
  CIN: '#FB4F14',
  CLE: '#311D00',
  DAL: '#003594',
  DEN: '#FB4F14',
  DET: '#0076B6',
  GB: '#203731',
  HOU: '#03202F',
  IND: '#002C5F',
  JAX: '#006778',
  KC: '#E31837',
  LV: '#000000',
  LAC: '#0080C6',
  LAR: '#003594',
  MIA: '#008E97',
  MIN: '#4F2683',
  NE: '#002244',
  NO: '#D3BC8D',
  NYG: '#0B2265',
  NYJ: '#125740',
  PHI: '#004C54',
  PIT: '#FFB612',
  SEA: '#002244',
  SF: '#AA0000',
  TB: '#D50A0A',
  TEN: '#4B92DB',
  WAS: '#5A1414',
};

const TEAMS = Object.keys(TEAM_COLORS);

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function luminance(hex) {
  const trimmed = hex.replace('#', '');
  const r = parseInt(trimmed.slice(0, 2), 16);
  const g = parseInt(trimmed.slice(2, 4), 16);
  const b = parseInt(trimmed.slice(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

const iconsDir = path.join(__dirname, '..', 'src', 'assets', 'team-logos');
ensureDir(iconsDir);

TEAMS.forEach((id) => {
  const fill = TEAM_COLORS[id];
  const textColor = luminance(fill) > 170 ? '#0d1016' : '#f5f7fb';
  const svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">\n  <defs>\n    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">\n      <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="rgba(0,0,0,0.35)"/>\n    </filter>\n  </defs>\n  <circle cx="48" cy="48" r="43" fill="${fill}" filter="url(#shadow)"/>\n  <circle cx="48" cy="48" r="43" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="4"/>\n  <text x="48" y="53" text-anchor="middle" font-size="32" font-family="'Inter', 'Segoe UI', 'Roboto', sans-serif" font-weight="700" fill="${textColor}" letter-spacing="1">${id}</text>\n</svg>\n`;
  fs.writeFileSync(path.join(iconsDir, `${id}.svg`), svg, 'utf8');
});

const teamLogosPath = path.join(__dirname, '..', 'src', 'data', 'teamLogos.ts');
const imports = TEAMS.map((id) => `  ${id}: new URL('../assets/team-logos/${id}.svg', import.meta.url).href,`).join('\n');
const fileContent = `import { TeamId } from '../state/types';\n\nexport const TEAM_LOGOS: Record<TeamId, string> = {\n${imports}\n};\n`;
fs.writeFileSync(teamLogosPath, fileContent, 'utf8');

console.log(`Generated ${TEAMS.length} team icons and updated teamLogos.ts`);
