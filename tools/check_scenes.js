// Checks the scenes of the code levels (js/scenes.js), with no graphics involved.
//   node tools/check_scenes.js [-v]
//
//   1. Every code level has a scene, and two levels in a row never use the same kind.
//   2. The scene a level opens with is of its own kind, not the fallback, and every test builds some scene.
//   3. A stage is well formed: known pieces, unique names, everything on the deck.
//   4. The model solution's real results play to a happy end, and every beat names a piece that exists.
//   5. Wrong results (the starting code, planted bugs, and plain nonsense) play to an unhappy end and never crash.
const fs = require('fs');
const path = require('path');
require('./minipy.js');
const Runner = require('../js/runner.js');
const Bugs = require('../js/bughunt.js');
const Scenes = require('../js/scenes.js');

const rootDir = path.join(__dirname, '..');
Runner.setPrelude(fs.readFileSync(path.join(rootDir, 'tools', 'prelude.py'), 'utf8'));
const verbose = process.argv.includes('-v');
globalThis.window = globalThis;
globalThis.PYLON_LEVELS = [];
for (const f of fs.readdirSync(path.join(rootDir, 'js')).filter(f => /^levels-z\d+\.js$/.test(f)).sort()) require(path.join(rootDir, 'js', f));
if (fs.existsSync(path.join(rootDir, 'js', 'toolcards.js'))) require(path.join(rootDir, 'js', 'toolcards.js'));
const Curriculum = require('../js/curriculum.js');
const levels = Curriculum.arrange(globalThis.PYLON_LEVELS).levels.filter(l => l.kind === 'code');

const KINDS = ['crate', 'cell', 'bar', 'tile', 'node', 'sign', 'screen', 'gate', 'bridge', 'tube', 'link', 'slot', 'pad', 'lamp', 'flag'];
const BEATS = ['go', 'hop', 'zap', 'mark', 'new', 'txt', 'type', 'hl', 'open', 'jam', 'extend', 'snap', 'fill', 'ring', 'spin', 'pip', 'note', 'wait', 'all', 'seq', 'end'];
const STATES = /^(ok|bad|pick|on|dim|off|c[0-5])$/;
const errors = [], warnings = [], used = {};
let scenes = 0, plays = 0, wrongPlays = 0, fallbacks = 0;
const num = v => typeof v === 'number' && isFinite(v);

function checkStage(tag, st) {
  if (!st || !num(st.w) || !num(st.d) || !Array.isArray(st.props) || !Array.isArray(st.pip)) { errors.push(tag + ': the stage is not well formed'); return null; }
  if (st.w > 15.5 || st.d > 8) errors.push(tag + ': the deck is ' + st.w.toFixed(1) + ' by ' + st.d.toFixed(1) + ', too large to read');
  if (!st.note) warnings.push(tag + ': no opening note');
  const ids = new Set();
  for (const p of st.props) checkProp(tag, st, p, ids);
  if (!st.verdict || !ids.has(st.verdict)) errors.push(tag + ': the stage names no piece that gives its verdict');
  if (st.el !== undefined && !(st.el > 0.3 && st.el < 1.2)) errors.push(tag + ': an odd camera angle');
  return ids;
}
function checkProp(tag, st, p, ids) {
  if (!p || !p.id || KINDS.indexOf(p.k) < 0) { errors.push(tag + ': unknown piece ' + JSON.stringify(p).slice(0, 80)); return; }
  if (ids.has(p.id)) errors.push(tag + ': two pieces are called ' + p.id);
  ids.add(p.id);
  if (p.k === 'link') { if (!Array.isArray(p.a) || !Array.isArray(p.b) || !p.a.concat(p.b).every(num)) errors.push(tag + ': link ' + p.id + ' has no ends'); else if (p.a[1] < 0.3 || p.b[1] < 0.3) errors.push(tag + ': link ' + p.id + ' runs under the deck'); return; }
  if (!num(p.x) || !num(p.z)) { errors.push(tag + ': ' + p.id + ' has no place'); return; }
  if (p.y !== undefined && !(p.y >= 0 && p.y < 5)) errors.push(tag + ': ' + p.id + ' stands at height ' + p.y + ', off the stage');
  if (Math.abs(p.x) > st.w / 2 + 0.3 || Math.abs(p.z) > st.d / 2 + 0.3) errors.push(tag + ': ' + p.id + ' stands off the deck at ' + p.x.toFixed(2) + ', ' + p.z.toFixed(2) + ' (deck ' + st.w.toFixed(1) + ' by ' + st.d.toFixed(1) + ')');
  if (p.k === 'bar' && !num(p.h)) errors.push(tag + ': bar ' + p.id + ' has no height');
  if (p.k === 'screen' && (!Array.isArray(p.rows) || !p.rows.length)) errors.push(tag + ': the wall has no rows');
}
// Walk the beats the way the world would, and return how the play ends.
function checkBeats(tag, st, ids0, beats) {
  const ids = new Set(ids0);
  let end = null, count = 0, told = false;
  const walk = list => {
    for (const b of list) {
      count++;
      if (!b || BEATS.indexOf(b.a) < 0) { errors.push(tag + ': unknown beat ' + JSON.stringify(b).slice(0, 80)); continue; }
      if (b.a === 'all' || b.a === 'seq') { walk(b.b); continue; }
      if (b.a === 'mark' && !STATES.test(b.s)) errors.push(tag + ': unknown state ' + b.s);
      if ([].concat(b.id).indexOf(st.verdict) >= 0 && (b.a === 'jam' || (b.a === 'mark' && b.s === 'bad') || (b.a === 'txt' && b.tone === 'bad'))) told = true;
      if (b.a === 'new') { checkProp(tag, st, b.p, ids); continue; }
      if (b.a === 'end') { end = b.ok; continue; }
      const names = b.a === 'mark' ? [].concat(b.id) : b.id !== undefined ? [b.id] : (b.a === 'go' || b.a === 'hop') && typeof b.to === 'string' ? [b.to] : [];
      for (const id of names) if (!ids.has(id)) errors.push(tag + ': beat ' + b.a + ' names ' + id + ', which is not on the stage');
      if ((b.a === 'go' || b.a === 'hop') && Array.isArray(b.to) && !b.to.every(num)) errors.push(tag + ': beat ' + b.a + ' goes nowhere');
      if (b.a === 'type' || b.a === 'hl') { const wall = st.props.find(p => p.id === b.id); if (!wall || !wall.rows.some(r => r.id === b.row)) errors.push(tag + ': the wall has no row ' + b.row); }
      if ((b.a === 'fill' || b.a === 'ring') && !(b[b.a === 'fill' ? 'to' : 'at'] >= 0 && b[b.a === 'fill' ? 'to' : 'at'] <= 1)) errors.push(tag + ': ' + b.a + ' is outside the tube');
    }
  };
  walk(beats);
  if (end === null) errors.push(tag + ': the play has no end');
  if (end === false && !told) errors.push(tag + ': the play ends badly, but the piece that gives the verdict does not show it');
  if (end === true && told) errors.push(tag + ': the play ends well, but the piece that gives the verdict shows a failure');
  if (count > 90) errors.push(tag + ': ' + count + ' beats is too long a play');
  return end;
}

let before = null;
for (const lv of levels) {
  const tag = 'z' + lv.zone + '.' + lv.order + ' ' + lv.id, conf = Scenes.MAP[lv.id];
  if (!conf) { errors.push(tag + ': no scene'); continue; }
  if (before && before === conf[0]) errors.push(tag + ': the same kind of scene (' + conf[0] + ') as the level before it');
  before = conf[0];
  used[conf[0]] = (used[conf[0]] || 0) + 1;
  // every test builds a scene
  let fit = 0;
  lv.tests.forEach((t, i) => {
    if (t.perf) return;
    const p = Scenes.plan(lv, i);
    if (!p) { errors.push(tag + ' test ' + (i + 1) + ': no scene could be built'); return; }
    scenes++;
    if (p.type === conf[0]) fit++; else fallbacks++;
    checkStage(tag + ' test ' + (i + 1), p.stage);
  });
  const opens = Scenes.plan(lv, Scenes.choose(lv, null));
  if (!opens || opens.type !== conf[0]) errors.push(tag + ': the level opens on the fallback scene, not on its own (' + conf[0] + ')');
  // the model solution plays to a happy end
  const good = Runner.run(lv, lv.solution);
  lv.tests.forEach((t, i) => {
    if (t.perf) return;
    const p = Scenes.plan(lv, i), ids = checkStage(tag, p.stage), end = checkBeats(tag + ' test ' + (i + 1) + ' (model solution)', p.stage, ids || [], Scenes.act(p, good.tests[i]));
    plays++;
    if (end !== true) errors.push(tag + ' test ' + (i + 1) + ': the model solution does not play to a happy end');
  });
  // wrong answers play to an unhappy end
  const wrongs = [];
  try { wrongs.push(['the starting code', Runner.run(lv, lv.starter)]); } catch (e) { /* skip */ }
  const code = lv.solution.replace(/\s+$/, '') + '\n';
  for (const spot of Bugs.shuffled(Bugs.spots(code), Bugs.seeded(lv.id)).slice(0, 6)) {
    let res = null;
    try { res = Runner.run(lv, Bugs.apply(code, spot).code, { quick: true }); } catch (e) { res = null; }
    if (res && !res.ok) wrongs.push(['a planted bug', res]);
  }
  for (const [what, res] of wrongs) {
    const i = Scenes.choose(lv, res.tests), p = Scenes.plan(lv, i);
    const result = res.error && !res.tests.length ? { error: res.error, errorLine: res.errorLine, ok: false } : res.tests[i];
    if (!result || result.ok) continue;
    wrongPlays++;
    if (checkBeats(tag + ' test ' + (i + 1) + ' (' + what + ')', p.stage, checkStage(tag, p.stage) || [], Scenes.act(p, result)) !== false) errors.push(tag + ' test ' + (i + 1) + ': ' + what + ' plays to a happy end');
  }
  // nonsense in place of an answer: the play must still end, unhappily, without crashing
  const p0 = Scenes.plan(lv, Scenes.choose(lv, null));
  for (const junk of ['None', '42', '-1', '"text"', '[]', '[1, 2, 3]', '[[1], [2]]', 'True', '(1, "a", None)', '{"a": 1}', '3.75', '<object at 0x1>', '[None, None]', '""', '[0, 99]', '[-5, 0]', '99999999']) {
    const result = lv.tests[p0.test].stdout !== undefined ? { ok: false, stdout: true, got: junk } : { ok: false, got: junk, full: junk };
    wrongPlays++;
    if (checkBeats(tag + ' (returns ' + junk + ')', p0.stage, checkStage(tag, p0.stage) || [], Scenes.act(p0, result)) !== false) errors.push(tag + ': returning ' + junk + ' plays to a happy end');
  }
  if (verbose) console.log('ok   ' + tag + '   ' + conf[0] + (opens && opens.type === conf[0] ? '' : ' (FALLBACK)') + ', ' + fit + ' of ' + lv.tests.filter(t => !t.perf).length + ' tests fit, ' + wrongs.length + ' wrong runs');
}
console.log(levels.length + ' code levels, ' + scenes + ' scenes built (' + fallbacks + ' on the fallback wall), ' + plays + ' right answers and ' + wrongPlays + ' wrong ones played');
console.log('kinds of scene: ' + Object.keys(used).sort((a, b) => used[b] - used[a]).map(k => k + ' ' + used[k]).join(', '));
for (const w of warnings.slice(0, 20)) console.log('WARNING: ' + w);
for (const e of errors.slice(0, 60)) console.log('ERROR: ' + e);
if (errors.length > 60) console.log('…and ' + (errors.length - 60) + ' more errors');
console.log(errors.length + ' errors');
process.exit(errors.length ? 1 : 0);
