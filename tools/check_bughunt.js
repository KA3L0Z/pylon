// Checks the bug hunt (js/bughunt.js) against every code level.
//   node tools/check_bughunt.js [-v]
//
//   1. Every candidate changes exactly one line, and that line really differs.
//   2. No candidate sits inside a string or a comment (the tokens of the changed line are compared, strings left out).
//   3. For most levels at least one candidate is a good bug: it breaks a test, still passes another, and hangs nothing.
//      A level with no usable candidate is listed; the game then draws another level, so that is a warning, not an error.
const fs = require('fs');
const path = require('path');
require('./minipy.js');
const Runner = require('../js/runner.js');
const Bugs = require('../js/bughunt.js');

const rootDir = path.join(__dirname, '..');
Runner.setPrelude(fs.readFileSync(path.join(rootDir, 'tools', 'prelude.py'), 'utf8'));
const verbose = process.argv.includes('-v');
globalThis.window = globalThis;
globalThis.PYLON_LEVELS = [];
for (const f of fs.readdirSync(path.join(rootDir, 'js')).filter(f => /^levels-z\d+\.js$/.test(f)).sort()) require(path.join(rootDir, 'js', f));
if (fs.existsSync(path.join(rootDir, 'js', 'toolcards.js'))) require(path.join(rootDir, 'js', 'toolcards.js'));
const Curriculum = require('../js/curriculum.js');
const levels = Curriculum.arrange(globalThis.PYLON_LEVELS).levels.filter(l => l.kind === 'code');

const PER_LEVEL = 10, errors = [], thin = [];
let total = 0, good = 0, weak = 0, hang = 0, none = 0, usable = 0;
// The words of a line with its strings and comments removed: a bug must change these.
const bare = line => { const m = Bugs.mask(line); let s = ''; for (let i = 0; i < line.length; i++) s += m[i] ? ' ' : line[i]; return s.replace(/\s+/g, ' ').trim(); };

for (const lv of levels) {
  const tag = 'z' + lv.zone + '.' + lv.order + ' ' + lv.id, code = lv.solution.replace(/\s+$/, '') + '\n', all = Bugs.spots(code);
  const tried = Bugs.shuffled(all, Bugs.seeded(lv.id)).slice(0, PER_LEVEL), tally = { good: 0, weak: 0, hang: 0, none: 0 };
  let sample = '';
  for (const spot of tried) {
    const made = Bugs.apply(code, spot), before = code.split('\n'), after = made.code.split('\n');
    const diff = before.map((l, i) => (l === after[i] ? 0 : i + 1)).filter(Boolean);
    if (before.length !== after.length || diff.length !== 1 || diff[0] !== made.line) errors.push(tag + ': a change at ' + spot.at + ' touches lines ' + diff.join(', ') + ', reported line ' + made.line);
    else if (made.good !== before[made.line - 1] || made.bad !== after[made.line - 1]) errors.push(tag + ': the before and after lines of a change at ' + spot.at + ' are wrong');
    else if (bare(made.good) === bare(made.bad)) errors.push(tag + ': line ' + made.line + ' was changed inside a string or a comment: ' + made.bad.trim());
    let res = null;
    try { res = Runner.run(lv, made.code, { quick: true }); } catch (e) { errors.push(tag + ': the runner crashed on a candidate: ' + (e && e.message)); }
    const verdict = Bugs.judge(res) || 'none';
    tally[verdict]++;
    if (verdict === 'good' && !sample) sample = 'line ' + made.line + ': ' + made.good.trim() + '   ->   ' + made.bad.trim();
  }
  total += tried.length; good += tally.good; weak += tally.weak; hang += tally.hang; none += tally.none;
  if (tally.good || tally.weak) usable++; else thin.push(tag + ' (' + all.length + ' places)');
  if (verbose) console.log((tally.good ? 'ok   ' : tally.weak ? 'weak ' : 'none ') + tag + '   places ' + all.length + ', tried ' + tried.length + ': ' + tally.good + ' good, ' + tally.weak + ' weak, ' + tally.hang + ' hang, ' + tally.none + ' no effect' + (sample ? '\n       ' + sample : ''));
}
console.log(levels.length + ' code levels, ' + total + ' candidates tried: ' + good + ' good, ' + weak + ' break every test, ' + hang + ' hang, ' + none + ' change nothing or do not start');
console.log(usable + ' of ' + levels.length + ' levels can carry a bug');
for (const t of thin) console.log('WARNING: no usable bug among the candidates tried for ' + t);
if (usable < levels.length * 0.85) errors.push('only ' + usable + ' of ' + levels.length + ' levels can carry a bug; at least 85% should');
for (const e of errors) console.log('ERROR: ' + e);
console.log(errors.length + ' errors');
process.exit(errors.length ? 1 : 0);
