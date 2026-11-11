// Loads js/levels-z<zone>.js files and prints every level as JSON (used by check_levels.py).
// Usage: node tools/dump_levels.js [zone ...]
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'js');
const zones = process.argv.slice(2);
globalThis.PYLON_LEVELS = [];

const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => /^levels-z\d+\.js$/.test(f)).sort() : [];
for (const f of files) {
  const zone = f.match(/z(\d+)/)[1];
  if (zones.length && !zones.includes(zone)) continue;
  const full = path.join(dir, f);
  const src = fs.readFileSync(full, 'utf8');
  if (src.includes('${')) {
    console.error(f + ': contains "$" followed by "{". JavaScript interpolates that inside a template literal. Reword the example.');
  }
  const before = globalThis.PYLON_LEVELS.length;
  try {
    require(full);
  } catch (e) {
    console.error(f + ': failed to load: ' + e.message);
    continue;
  }
  for (let i = before; i < globalThis.PYLON_LEVELS.length; i++) globalThis.PYLON_LEVELS[i]._file = f;
}
process.stdout.write(JSON.stringify(globalThis.PYLON_LEVELS));
