const fs = require('fs');
const path = require('path');

const logosDir = path.join(__dirname, '..', 'src', 'assets', 'team-logos');
const outputPath = path.join(__dirname, '..', 'src', 'data', 'teamLogosJson.json');

const entries = fs.readdirSync(logosDir)
  .filter((file) => file.endsWith('.svg'))
  .map((file) => {
    const id = path.basename(file, '.svg');
    const content = fs.readFileSync(path.join(logosDir, file), 'utf8');
    const cleaned = content
      .replaceAll('\n', '')
      .replace(/\s+/g, ' ')
      .trim()
      .replace('<?xml version="1.0" encoding="UTF-8"?>', '');
    return { id, svg: cleaned };
  });

const map = entries.reduce((acc, entry) => {
  acc[entry.id] = entry.svg;
  return acc;
}, {});

fs.writeFileSync(outputPath, JSON.stringify(map, null, 2));
console.log(`Saved inline logo assets to ${outputPath}`);
