const fs = require('fs');
const path = require('path');

const TEAMS = [
  'ARI','ATL','BAL','BUF','CAR','CHI','CIN','CLE',
  'DAL','DEN','DET','GB','HOU','IND','JAX','KC',
  'LV','LAC','LAR','MIA','MIN','NE','NO','NYG',
  'NYJ','PHI','PIT','SEA','SF','TB','TEN','WAS',
];

const TILE_WIDTH = 180;
const TILE_HEIGHT = 126;
const GAP = 16;
const PADDING_X = 32;
const PADDING_Y = 32;
const COLUMNS = 8;

const totalWidth = PADDING_X * 2 + (TILE_WIDTH * COLUMNS) + GAP * (COLUMNS - 1);
const ROWS = Math.ceil(TEAMS.length / COLUMNS);
const totalHeight = PADDING_Y * 2 + (TILE_HEIGHT * ROWS) + GAP * (ROWS - 1) + 60;

const style = `  <style>
    .tile { fill: #1b1d24; stroke: #242833; stroke-width: 2; rx: 18; ry: 18; }
    .logo-bg { fill: rgba(9, 11, 18, 0.55); rx: 12; ry: 12; }
    .abbr { font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; font-size: 26px; font-weight: 700; fill: #f5f7ff; }
    .owner { font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; font-size: 18px; font-weight: 500; fill: #c9cfe3; }
  </style>`;

function tileGroup(team, index) {
  const row = Math.floor(index / COLUMNS);
  const col = index % COLUMNS;
  const x = PADDING_X + col * (TILE_WIDTH + GAP);
  const y = PADDING_Y + row * (TILE_HEIGHT + GAP);
  const logoX = x + 16;
  const logoY = y + 22;
  const logoSize = 48;
  const textX = x + 16 + logoSize + 16;
  const abbrY = y + 48;
  const ownerY = y + 82;

  return `    <g id="${team}" class="region" transform="translate(${x} ${y})">
      <rect class="tile" width="${TILE_WIDTH}" height="${TILE_HEIGHT}" />
      <rect id="${team}-logo" class="logo-bg" x="16" y="22" width="${logoSize}" height="${logoSize}" />
      <image id="${team}-logo-img" x="16" y="22" width="${logoSize}" height="${logoSize}" href="" />
      <text class="abbr" id="${team}-abbr" x="${textX - x}" y="${abbrY - y}" dominant-baseline="middle">${team}</text>
      <text class="owner" id="${team}-owner" x="${textX - x}" y="${ownerY - y}" dominant-baseline="middle">Volné</text>
    </g>`;
}

const gridGroups = TEAMS.map(tileGroup).join('\n');

const svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${totalHeight}" viewBox="0 0 ${totalWidth} ${totalHeight}" role="img" aria-label="NFL Team Grid">\n${style}\n${gridGroups}\n  <text x="${totalWidth / 2}" y="${totalHeight - 24}" text-anchor="middle" font-family="'Inter', ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial" font-size="20" fill="#8b93a7">Tip: otevři soubor \`nfl_team_grid.svg\` pro přesnou editaci barev nebo tisk draft boardu.</text>\n</svg>\n`;

const output = path.join(__dirname, '..', 'src', 'assets', 'nfl_team_grid.svg');
fs.writeFileSync(output, svg, 'utf8');
console.log(`Generated grid SVG at ${output}`);
