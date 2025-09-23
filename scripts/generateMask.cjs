const fs = require('fs');
const path = require('path');

const width = 2688;
const height = 1242;

const paddingX = 260;
const paddingY = 110;

const projectWidth = width - paddingX * 2;
const projectHeight = height - paddingY * 2;

const minLon = -125;
const maxLon = -66;
const minLat = 24;
const maxLat = 49;

const baseRadius = 52;

const teamData = [
  { id: 'ARI', city: 'Arizona', lat: 33.527, lon: -112.262 },
  { id: 'ATL', city: 'Atlanta', lat: 33.755, lon: -84.39 },
  { id: 'BAL', city: 'Baltimore', lat: 39.278, lon: -76.621 },
  { id: 'BUF', city: 'Buffalo', lat: 42.773, lon: -78.774 },
  { id: 'CAR', city: 'Carolina', lat: 35.225, lon: -80.852 },
  { id: 'CHI', city: 'Chicago', lat: 41.862, lon: -87.614 },
  { id: 'CIN', city: 'Cincinnati', lat: 39.095, lon: -84.516 },
  { id: 'CLE', city: 'Cleveland', lat: 41.506, lon: -81.699 },
  { id: 'DAL', city: 'Dallas', lat: 32.747, lon: -97.094 },
  { id: 'DEN', city: 'Denver', lat: 39.743, lon: -105.02 },
  { id: 'DET', city: 'Detroit', lat: 42.34, lon: -83.045 },
  { id: 'GB', city: 'Green Bay', lat: 44.501, lon: -88.062 },
  { id: 'HOU', city: 'Houston', lat: 29.684, lon: -95.41 },
  { id: 'IND', city: 'Indianapolis', lat: 39.761, lon: -86.164 },
  { id: 'JAX', city: 'Jacksonville', lat: 30.323, lon: -81.637 },
  { id: 'KC', city: 'Kansas City', lat: 39.049, lon: -94.483 },
  { id: 'LV', city: 'Las Vegas', lat: 36.09, lon: -115.183 },
  { id: 'LAC', city: 'Los Angeles Chargers', lat: 33.993, lon: -118.288, offset: { x: -35, y: 28 }, radius: 46 },
  { id: 'LAR', city: 'Los Angeles Rams', lat: 34.043, lon: -118.267, offset: { x: 35, y: -28 }, radius: 46 },
  { id: 'MIA', city: 'Miami', lat: 25.958, lon: -80.238 },
  { id: 'MIN', city: 'Minnesota', lat: 44.974, lon: -93.258 },
  { id: 'NE', city: 'New England', lat: 42.091, lon: -71.264 },
  { id: 'NO', city: 'New Orleans', lat: 29.951, lon: -90.081 },
  { id: 'NYG', city: 'New York Giants', lat: 40.813, lon: -74.074, offset: { x: -30, y: -22 }, radius: 46 },
  { id: 'NYJ', city: 'New York Jets', lat: 40.818, lon: -74.074, offset: { x: 40, y: 25 }, radius: 46 },
  { id: 'PHI', city: 'Philadelphia', lat: 39.901, lon: -75.168 },
  { id: 'PIT', city: 'Pittsburgh', lat: 40.446, lon: -80.015 },
  { id: 'SEA', city: 'Seattle', lat: 47.595, lon: -122.331 },
  { id: 'SF', city: 'San Francisco', lat: 37.403, lon: -121.97 },
  { id: 'TB', city: 'Tampa Bay', lat: 27.975, lon: -82.503 },
  { id: 'TEN', city: 'Tennessee', lat: 36.166, lon: -86.771 },
  { id: 'WAS', city: 'Washington', lat: 38.907, lon: -76.864 },
];

function project(lon, lat) {
  const normalizedX = (lon - minLon) / (maxLon - minLon);
  const normalizedY = 1 - (lat - minLat) / (maxLat - minLat);
  const x = paddingX + normalizedX * projectWidth;
  const y = paddingY + normalizedY * projectHeight;
  return { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) };
}

const regions = teamData.map((team) => {
  const { x, y } = project(team.lon, team.lat);
  return {
    id: team.id,
    cx: Number((x + (team.offset?.x ?? 0)).toFixed(1)),
    cy: Number((y + (team.offset?.y ?? 0)).toFixed(1)),
    radius: team.radius ?? baseRadius,
  };
});

const svgHeader = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">\n  <style>\n    .region circle {\n      fill: transparent;\n      stroke: #444;\n      stroke-width: 18;\n      pointer-events: all;\n      transition: fill 0.3s ease, stroke-width 0.2s ease;\n    }\n    .region:hover circle {\n      stroke-width: 24;\n    }\n  </style>`;

const svgBody = regions
  .map((region) => {
    return `  <g id="${region.id}" class="region" aria-label="${region.id}">\n    <circle cx="${region.cx}" cy="${region.cy}" r="${region.radius}" />\n  </g>`;
  })
  .join('\n');

const svgFooter = '\n</svg>\n';

const svg = `${svgHeader}\n${svgBody}\n${svgFooter}`;

const maskPath = path.join(__dirname, '..', 'src', 'assets', 'nfl_map_mask.svg');
fs.writeFileSync(maskPath, svg, 'utf8');

const dataPath = path.join(__dirname, '..', 'src', 'data', 'defaultMapRegions.json');
fs.writeFileSync(dataPath, JSON.stringify(regions, null, 2));

console.log(`Mask saved to ${maskPath}`);
console.log(`Region data saved to ${dataPath}`);
