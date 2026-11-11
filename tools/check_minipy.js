// Validates every level against the game's own interpreter (MiniPy) and runner.
//   node tools/check_minipy.js [zone ...] [-v]
// Code levels: the solution passes, the starter fails, the naive version passes the normal tests and is
// rejected by the speed tests. Robot levels: the solution passes on every map, the starter does not.
const fs = require('fs');
const path = require('path');
require('./minipy.js');
const Runner = require('../js/runner.js');

const rootDir = path.join(__dirname, '..');
Runner.setPrelude(fs.readFileSync(path.join(rootDir, 'tools', 'prelude.py'), 'utf8'));
const args = process.argv.slice(2), verbose = args.includes('-v'), zones = args.filter(a => /^\d+$/.test(a));
globalThis.PYLON_LEVELS = [];
for (const f of fs.readdirSync(path.join(rootDir, 'js')).filter(f => /^levels-z\d+\.js$/.test(f)).sort()) {
  if (zones.length && !zones.includes(f.match(/z(\d+)/)[1])) continue;
  try { require(path.join(rootDir, 'js', f)); } catch (e) { console.log('ERROR: ' + f + ' failed to load: ' + e.message); process.exitCode = 1; }
}
const levels = globalThis.PYLON_LEVELS.slice().sort((a, b) => a.zone - b.zone || a.order - b.order);
const errors = [];
const describe = t => t.error ? t.error.type + ': ' + t.error.message + (t.errorLine ? ' (line ' + t.errorLine + ')' : '') : 'got ' + t.got + ', expected ' + t.expect;

for (const lv of levels) {
  const tag = 'z' + lv.zone + '.' + lv.order + ' ' + lv.id;
  const before = errors.length;
  let note = '';
  try {
    if (lv.kind === 'robot') {
      const sol = Runner.run(lv, lv.solution);
      if (!sol.ok) {
        const r = sol.runs[sol.runs.length - 1];
        errors.push(tag + ': SOLUTION fails on map ' + (r ? r.map + 1 : '?') + ': ' + (sol.tooLong ? 'too many lines (' + sol.lines + ' > ' + lv.maxLines + ')' : r.reason || (r.error && r.error.type + ': ' + r.error.message + ' line ' + r.errorLine)));
      }
      if (Runner.run(lv, lv.starter).ok) errors.push(tag + ': the starter already solves the level');
      note = sol.lines + ' lines, ' + sol.runs.map(r => r.actions.length).join('/') + ' actions';
    } else {
      const sol = Runner.run(lv, lv.solution);
      if (sol.error) errors.push(tag + ': SOLUTION does not load: ' + sol.error.type + ': ' + sol.error.message + ' (line ' + sol.errorLine + ')');
      for (const t of sol.tests) if (!t.ok) errors.push(tag + ': SOLUTION test ' + (t.index + 1) + ' [' + (t.show || 'stdout') + ']: ' + (t.stdout ? 'printed ' + JSON.stringify(t.got) + ', expected ' + JSON.stringify(t.expect) : describe(t)));
      const st = Runner.run(lv, lv.starter);
      if (st.ok) errors.push(tag + ': the starter already passes');
      if (lv.naive) {
        const nv = Runner.run(lv, lv.naive);
        if (nv.error) errors.push(tag + ': NAIVE does not load: ' + nv.error.type + ': ' + nv.error.message);
        const free = Runner.run(lv, lv.naive, { noLimit: true });
        for (const t of nv.tests) {
          if (!t.perf && !t.ok) errors.push(tag + ': NAIVE fails normal test ' + (t.index + 1) + ': ' + describe(t));
          if (t.perf) {
            const real = free.tests[t.index].steps, ratio = real / Math.max(1, t.refSteps);
            note += ' perf' + (t.index + 1) + ': ref ' + t.refSteps + ', limit ' + t.budget + ', naive ' + (free.tests[t.index].slow ? '>' : '') + real + ' (x' + ratio.toFixed(0) + ')';
            if (!t.slow) errors.push(tag + ': NAIVE is not rejected by speed test ' + (t.index + 1) + ' (ref ' + t.refSteps + ' steps, limit ' + t.budget + ', naive ' + real + ')');
            else if (ratio < Runner.PERF_FACTOR * 2) errors.push(tag + ': speed test ' + (t.index + 1) + ' separates too little: naive is only x' + ratio.toFixed(1) + ' the reference');
            if (t.refSteps > 150000) errors.push(tag + ': speed test ' + (t.index + 1) + ' is heavy for the reference (' + t.refSteps + ' steps)');
          }
        }
      }
    }
  } catch (e) { errors.push(tag + ': CRASH ' + (e && e.stack || e)); }
  console.log((errors.length === before ? 'ok   ' : 'FAIL ') + tag + (note && (verbose || errors.length !== before || lv.naive) ? '   ' + note.trim() : ''));
}
console.log('');
for (const e of errors) console.log('ERROR: ' + e);
console.log('\n' + levels.length + ' levels, ' + errors.length + ' errors');
process.exit(errors.length ? 1 : 0);
