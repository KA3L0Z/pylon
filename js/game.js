/* Pylon game logic: progress, the tower hub, the level panel, running code, the step-by-step tracer and its picture of
   the data, live error checks, the scratchpad, daily reviews, the bug hunt, mock interviews, the AI mentor, the tour,
   comfort settings, the save code, sound, badges, saving. */
(function () {
'use strict';
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const clip = (s, n) => s.length > n ? s.slice(0, n) + '\n… (cut)' : s;
const num = n => Number(n).toLocaleString('en-US');
const coarse = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
const Runner = window.PylonRunner, RealWorld = window.PylonWorld || { ok: false };
// Every call to the 3D world goes through this, so the game still works where WebGL does not.
const World = new Proxy({}, { get: (_, k) => (RealWorld.ok && typeof RealWorld[k] === 'function') ? RealWorld[k] : (/^play/.test(k) ? () => Promise.resolve(true) : () => undefined) });

// The floors and the order of the levels come from js/curriculum.js; the level files only describe the levels.
const Curriculum = window.PylonCurriculum, Craft = window.PylonCraft || null, Scenes = window.PylonScenes || null, Terminal = window.PylonTerminal || null;
const ZONES = Curriculum.FLOORS.map((f, k) => ({ n: k + 1, name: f.name, color: f.color, title: f.title, blurb: f.blurb }));
const LAB = { n: 0, name: 'Scratchpad', color: '#2ee6c8' };
const RANKS = ['Amateur'].concat(ZONES.map(z => z.title));
const LEVELS = Curriculum.arrange(window.PYLON_LEVELS || []).levels;
const INDEX = {};
LEVELS.forEach((l, i) => { INDEX[l.id] = i; });
// Every reference card, in the order the player meets them.
const ALL_CARDS = [];
LEVELS.forEach((l, i) => { l._cards = []; (l.tools || []).forEach(card => { l._cards.push(ALL_CARDS.length); ALL_CARDS.push({ card, at: i, lv: l }); }); });
const zoneOf = lv => lv.zone ? ZONES[lv.zone - 1] : LAB;
const zoneLevels = n => LEVELS.filter(l => l.zone === n);
const CLASSICS = LEVELS.filter(l => l.classic).length;
// The scratchpad is a level with no tests: write anything, run it, step through it.
const SANDBOX = { id: 'sandbox', zone: 0, order: 0, kind: 'sandbox', title: 'Scratchpad', concept: 'nothing here is graded', difficulty: 'Easy', boss: false,
  lesson: '<p>This is your lab bench. Write any Python, run it, and see what it prints. Nothing here is graded and nothing can break.</p>' +
    '<p>Good uses for it:</p><ul><li>Try a line from a lesson with your own values.</li><li>Check what a method really returns before you rely on it.</li>' +
    '<li>Paste a function from a level and call it with inputs of your own.</li></ul>' +
    '<p><b>Step through</b> runs your code one line at a time and draws your lists and dictionaries as they change. When a result surprises you, that is the fastest way to find out why.</p>' +
    '<p>The helpers from the tower work here too: <code>linked([1, 2, 3])</code> builds a linked list and <code>tree([1, 2, 3])</code> builds a binary tree.</p>',
  task: '<p>Write any Python and press <b>Run</b>. Use <code>print(...)</code> to see values.</p>',
  starter: '# Try anything here. Nothing is graded.\nnames = ["Ada", "Grace", "Linus"]\nfor i, name in enumerate(names, start=1):\n    print(i, name.upper())\n\nsquares = [n * n for n in range(6)]\nprint(squares, sum(squares))\n',
  tests: [], hints: [], solution: '', explain: '' };

// ---------------------------------------------------------------- state and saving
const SAVE_KEY = 'pylon.save.v1';
let S = { v: 1, levels: {}, sound: true, music: true, musicVol: 0.45, sfxVol: 0.8, unlockAll: false, intro: false, last: null, open: null, speed: 1,
  board: false, days: [], badges: {}, counters: {}, bonus: 0, rvDay: null, iv: null, ivLog: [], ac: true, gfx: 'auto', t: 0 };
function tidy() {
  if (!Array.isArray(S.days)) S.days = [];
  if (!Array.isArray(S.ivLog)) S.ivLog = [];
  if (!S.badges || typeof S.badges !== 'object') S.badges = {};
  if (!S.counters || typeof S.counters !== 'object') S.counters = {};
  if (typeof S.bonus !== 'number') S.bonus = 0;
  if (['auto', 'high', 'medium', 'low'].indexOf(S.gfx) < 0) S.gfx = 'auto';
}
function loadLocal() {
  try { const raw = localStorage.getItem(SAVE_KEY); if (raw) { const d = JSON.parse(raw); if (d && d.v === 1) S = Object.assign(S, d); } }
  catch (e) { /* storage blocked: play without saving */ }
  tidy();
  migrate();
}
function save() {
  S.t = Date.now();
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* ignore */ }
  Cloud.push();
}
function st(id) { return S.levels[id] || (S.levels[id] = { solved: false, stars: 0, xp: 0, code: null, hints: 0, saw: false, tries: 0, read: false, t: 0 }); }
const bump = (name, by) => { S.counters[name] = (S.counters[name] || 0) + (by || 1); };
const isSolved = i => !!(LEVELS[i] && S.levels[LEVELS[i].id] && S.levels[LEVELS[i].id].solved);
const isUnlocked = i => i === 0 || S.unlockAll || isSolved(i) || isSolved(i - 1);          // a solved level stays open when new levels appear before it
const floorDone = n => { const ls = zoneLevels(n); return ls.length > 0 && ls.every(l => isSolved(INDEX[l.id])); };
function totals() {
  let xp = S.bonus || 0, stars = 0, solved = 0;
  for (const l of LEVELS) { const s = S.levels[l.id]; if (s && s.solved) { xp += s.xp + (s.cx || 0); stars += s.stars; solved++; } }
  return { xp, stars, solved };
}
function rankIndex() {
  let r = 0;
  for (const z of ZONES) { if (floorDone(z.n)) r++; else break; }
  return Math.max(r, S.rank0 || 0);                // a rank earned before the tower grew is kept
}
// The tower has grown twice, and a save from an earlier tower keeps its rank under the title it had.
//   6 floors, 48 levels (a save with no cv): the floors were the id groups z1- to z6-.
//   8 floors, 71 levels (cv 2): today's floors without the Signal Archive and without the z9- levels.
const RANK_FROM_6 = [0, 1, 2, 4, 6, 7, 8], RANK_FROM_8 = [0, 1, 2, 3, 4, 6, 7, 8, 9];
function rankIn6() {
  let r = 0;
  for (const prefix of ['z1-', 'z2-', 'z3-', 'z4-', 'z5-', 'z6-']) {
    const ls = LEVELS.filter(l => l.id.indexOf(prefix) === 0);
    if (ls.length && ls.every(l => isSolved(INDEX[l.id]))) r++; else break;
  }
  return r;
}
function rankIn8() {
  let r = 0;
  for (const z of ZONES) {
    const ls = zoneLevels(z.n).filter(l => l.id.indexOf('z9-') !== 0);
    if (!ls.length) continue;                      // a floor that did not exist yet
    if (ls.every(l => isSolved(INDEX[l.id]))) r++; else break;
  }
  return r;
}
// The rank a save had earned in the tower it was made in, as an index into today's ranks.
const rankFrom = (cv, rank0) => (cv === 3 ? rank0 || 0 : cv === 2 ? Math.max(RANK_FROM_8[rank0 || 0] || 0, RANK_FROM_8[rankIn8()]) : RANK_FROM_6[rankIn6()]);
function migrate() {
  if (S.cv === 3) return;
  const had = LEVELS.some((l, i) => isSolved(i));
  S.rank0 = rankFrom(S.cv, S.rank0);
  if (had) S.grew = S.cv === 2 ? 2 : 1;
  S.cv = 3;
}
function nextIndex() { for (let i = 0; i < LEVELS.length; i++) if (!isSolved(i)) return i; return -1; }
function xpFor(lv, stars) {
  const base = lv.kind === 'robot' ? 60 : lv.difficulty === 'Hard' ? 300 : lv.difficulty === 'Medium' ? 180 : 100;
  return Math.round(base * (lv.boss ? 1.5 : 1) * [0, 0.4, 0.75, 1][stars]);
}
const dayKey = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const today = () => dayKey(new Date());
const dayPlus = (n, from) => { const d = from ? new Date(from) : new Date(); d.setDate(d.getDate() + n); return dayKey(d); };
function markDay() { const t = today(); if (S.days.indexOf(t) < 0) { S.days.push(t); S.days = S.days.sort().slice(-400); } }
function streak() {
  const have = new Set(S.days), d = new Date();
  if (!have.has(dayKey(d))) d.setDate(d.getDate() - 1);          // today not played yet: the streak still stands
  let n = 0;
  while (have.has(dayKey(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
function mergeRemote(remote) {
  if (!remote || remote.v !== 1) return;
  for (const id in remote.levels || {}) {
    const r = remote.levels[id], l = st(id);
    if ((r.t || 0) > (l.t || 0)) { if (r.code != null) l.code = r.code; if (r.rv) l.rv = r.rv; }
    else if (r.rv && !l.rv) l.rv = r.rv;
    l.solved = l.solved || !!r.solved; l.stars = Math.max(l.stars, r.stars || 0); l.xp = Math.max(l.xp, r.xp || 0);
    l.hints = Math.max(l.hints, r.hints || 0); l.saw = l.saw || !!r.saw; l.read = l.read || !!r.read; l.mentor = l.mentor || !!r.mentor;
    l.lean = l.lean || !!r.lean; l.pred = (l.pred || 0) | (r.pred || 0); l.craft = (l.craft || 0) | (r.craft || 0); l.cx = Math.max(l.cx || 0, r.cx || 0); l.brief = l.brief || !!r.brief; l.tries = Math.max(l.tries, r.tries || 0); l.t = Math.max(l.t || 0, r.t || 0);
  }
  if ((remote.t || 0) > (S.t || 0)) {
    S.sound = remote.sound !== false; S.music = remote.music !== false; S.unlockAll = !!remote.unlockAll; S.speed = remote.speed || 1; S.board = !!remote.board;
    S.ac = remote.ac !== false;
    if (typeof remote.musicVol === 'number') S.musicVol = remote.musicVol;
    if (typeof remote.sfxVol === 'number') S.sfxVol = remote.sfxVol;
    if (remote.last) S.last = remote.last;
    if (remote.rvDay) S.rvDay = remote.rvDay;
  }
  S.intro = S.intro || !!remote.intro;
  S.rank0 = Math.max(S.rank0 || 0, rankFrom(remote.cv, remote.rank0));
  S.bonus = Math.max(S.bonus || 0, remote.bonus || 0);
  S.days = Array.from(new Set(S.days.concat(Array.isArray(remote.days) ? remote.days : []))).sort().slice(-400);
  if (Array.isArray(remote.ivLog) && remote.ivLog.length > S.ivLog.length) S.ivLog = remote.ivLog;
  for (const k in remote.badges || {}) if (!S.badges[k]) S.badges[k] = remote.badges[k];
  for (const k in remote.counters || {}) S.counters[k] = Math.max(S.counters[k] || 0, remote.counters[k] || 0);
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* ignore */ }
}

// Cloud save and the opt-in leaderboard. Only active when the page runs inside claude.ai for a signed-in viewer.
const Cloud = (() => {
  let db = null, user = null, uid = null, saveRef = null, ready = false, dead = false, dirty = false, writing = false, timer = 0, lastScore = '';
  async function init() {
    if (!window.claude || typeof window.claude.use !== 'function') return false;
    try {
      const got = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
      db = got[0]; user = got[1];
      if (!db || !user) return false;
      uid = await user.id();
      if (!uid) return false;
      saveRef = db.doc('data/users/' + uid + '/save');
      const snap = await saveRef.get();
      const had = snap.exists && snap.data() && snap.data().state;
      if (had) mergeRemote(snap.data().state);
      ready = true;
      if (dirty || !had) push();
      return !!had;
    } catch (e) { dead = true; return false; }
  }
  function push() { dirty = true; if (!ready || dead) return; clearTimeout(timer); timer = setTimeout(flush, 2500); }
  async function flush() {
    if (writing || !dirty || dead) return;
    writing = true; dirty = false;
    try {
      await saveRef.set({ state: JSON.parse(JSON.stringify(S)), t: Date.now() });
      if (S.board) {
        const t = totals(), key = t.xp + ':' + t.stars + ':' + t.solved;
        if (key !== lastScore) { await db.doc('scores/' + uid).set({ xp: t.xp, stars: t.stars, solved: t.solved, rank: rankIndex(), t: Date.now() }); lastScore = key; }
      }
    } catch (e) {
      const code = e && e.code;
      if (code === 'unavailable' || code === 'resource_exhausted') dirty = true; else dead = true;
    }
    writing = false;
    if (dirty && !dead) push();
  }
  async function board() {
    if (!ready || dead) return null;
    const snap = await db.collection('scores').orderBy('xp', 'desc').limit(25).get();
    const rows = snap.docs.map(d => Object.assign({ id: d.id }, d.data()));
    let names = {};
    try { names = await user.profiles(rows.map(r => r.id)); } catch (e) { names = {}; }
    return rows.map(r => Object.assign(r, { name: (names[r.id] && names[r.id].name) || '', me: r.id === uid }));
  }
  async function leave() { lastScore = ''; try { await db.doc('scores/' + uid).delete(); } catch (e) { /* ignore */ } }
  return { init, push, board, leave, flushNow: () => { clearTimeout(timer); return flush(); }, get ready() { return ready && !dead; } };
})();
const online = () => !!(window.claude && typeof window.claude.use === 'function');

// ---------------------------------------------------------------- sound effects and music
const Sfx = (() => {
  let ctx = null, master = null, key = 1, shift = 1;
  // The effects that are little tunes. They are written in C and moved into the key of the music that is playing.
  const TUNED = { select: 1, collect: 1, hint: 1, mentor: 1, pass: 1, star: 1, badge: 1, boss: 1, rank: 1 };
  function ensure() {
    if (ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try { ctx = new AC(); master = ctx.createGain(); master.connect(ctx.destination); } catch (e) { return false; }
    return true;
  }
  function tone(freq, start, dur, type, vol, slide) {
    const o = ctx.createOscillator(), g = ctx.createGain(), t0 = ctx.currentTime + start;
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq * shift, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide * shift, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.5, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(master);
    o.start(t0); o.stop(t0 + dur + 0.03);
  }
  // a short burst of filtered noise: whooshes, thuds and sparkles
  function noise(start, dur, vol, from, to) {
    const n = Math.max(1, Math.floor(ctx.sampleRate * dur)), buf = ctx.createBuffer(1, n, ctx.sampleRate), data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(), t0 = ctx.currentTime + start;
    src.buffer = buf; f.type = 'bandpass'; f.Q.value = 1.2;
    f.frequency.setValueAtTime(from, t0); f.frequency.exponentialRampToValueAtTime(to, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + dur * 0.25); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t0); src.stop(t0 + dur + 0.02);
  }
  const seq = (notes, gap, dur, type, vol) => notes.forEach((f, i) => tone(f, i * gap, dur, type, vol));
  const bank = {
    click: () => tone(660, 0, 0.05, 'triangle', 0.3),
    select: () => { tone(520, 0, 0.06, 'triangle', 0.28); tone(780, 0.05, 0.08, 'sine', 0.22); },
    open: () => { noise(0, 0.28, 0.2, 300, 2400); tone(330, 0.02, 0.2, 'sine', 0.28, 660); },
    back: () => { noise(0, 0.22, 0.16, 2000, 300); tone(520, 0, 0.16, 'sine', 0.22, 260); },
    modal: () => tone(440, 0, 0.09, 'sine', 0.2, 660),
    step: () => { tone(240, 0, 0.07, 'triangle', 0.32, 300); noise(0, 0.05, 0.05, 900, 500); },
    turn: () => tone(420, 0, 0.05, 'sine', 0.2, 520),
    collect: () => { tone(880, 0, 0.09, 'sine', 0.5); tone(1320, 0.07, 0.14, 'sine', 0.45); tone(1760, 0.14, 0.18, 'sine', 0.25); },
    tick: () => tone(740, 0, 0.07, 'sine', 0.4, 990),
    trace: () => tone(600, 0, 0.035, 'triangle', 0.18),
    pick: () => tone(980, 0, 0.03, 'triangle', 0.14),
    buzz: () => tone(150, 0, 0.16, 'sawtooth', 0.3, 110),
    crash: () => { tone(180, 0, 0.22, 'sawtooth', 0.45, 60); tone(90, 0.02, 0.25, 'square', 0.25, 50); noise(0, 0.25, 0.35, 1800, 200); },
    // what a scene of a code level sounds like: a crate set down, a tube filling, letters on the wall, the gate, the bridge
    place: () => { tone(210, 0, 0.06, 'triangle', 0.24, 150); noise(0, 0.04, 0.05, 1400, 600); },
    pour: () => { tone(240, 0, 0.62, 'sine', 0.2, 640); noise(0, 0.6, 0.06, 500, 1900); },
    type: () => { for (let k = 0; k < 6; k++) tone(1150 + (k % 3) * 90, k * 0.045, 0.022, 'square', 0.05); },
    gate: () => { noise(0, 0.42, 0.2, 200, 1700); tone(196, 0, 0.32, 'sine', 0.28, 392); },
    jam: () => { tone(120, 0, 0.12, 'square', 0.26, 92); tone(120, 0.15, 0.15, 'square', 0.26, 80); },
    plank: () => seq([330, 370, 415, 466], 0.05, 0.06, 'triangle', 0.15),
    fall: () => tone(880, 0, 0.5, 'sine', 0.2, 130),
    fail: () => { tone(300, 0, 0.14, 'triangle', 0.4, 220); tone(220, 0.13, 0.22, 'triangle', 0.4, 160); },
    hint: () => { tone(587, 0, 0.1, 'sine', 0.3); tone(880, 0.09, 0.16, 'sine', 0.22); },
    mentor: () => seq([523, 659, 880], 0.08, 0.16, 'sine', 0.22),
    pass: () => seq([523, 659, 784, 1047], 0.07, 0.22, 'triangle', 0.45),
    star: () => { tone(1175, 0, 0.12, 'sine', 0.4); tone(1568, 0.05, 0.2, 'sine', 0.25); noise(0, 0.12, 0.06, 5000, 9000); },
    badge: () => { seq([784, 988, 1175, 1568], 0.06, 0.2, 'sine', 0.3); noise(0.1, 0.3, 0.06, 6000, 10000); },
    boss: () => { seq([392, 523, 659, 784, 1047, 1319], 0.09, 0.3, 'square', 0.2); noise(0, 0.5, 0.25, 200, 3000); },
    rank: () => { seq([523, 659, 784, 1047, 784, 1047, 1319], 0.11, 0.32, 'triangle', 0.45); seq([262, 330, 392], 0.22, 0.5, 'sine', 0.25); },
    clock: () => { tone(880, 0, 0.08, 'square', 0.12); tone(880, 0.2, 0.08, 'square', 0.12); },
  };
  return {
    play(name) {
      if (!S.sound || !bank[name] || !ensure()) return;
      if (ctx.state === 'suspended') ctx.resume();
      master.gain.value = 0.2 * Math.max(0, Math.min(1, S.sfxVol));
      shift = TUNED[name] ? key : 1;
      try { bank[name](); } catch (e) { /* ignore */ }
    },
    context() { return ensure() ? ctx : null; },            // the music plays through the same audio context
    tune(semitones) { key = Math.pow(2, (semitones || 0) / 12); },
  };
})();
// A phone can answer with a short buzz as well as a sound.
const haptic = pattern => { if (coarse && S.sound && navigator.vibrate) { try { navigator.vibrate(pattern); } catch (e) { /* not allowed here */ } } };
// Background music. The default is the score: music that is written while it plays and follows the game (js/score.js).
// The original recording, one looping track, can be chosen in the Menu. Browsers only let either of them start after
// the first click or key press.
const Music = (() => {
  const SRC = 'audio/pythonic-ambiance.mp3', Score = window.PylonScore || null, SCORE_GAIN = 1.25;
  let armed = false;
  const useScore = () => !!Score && S.track !== 'classic';
  const target = () => S.music ? Math.max(0, Math.min(1, S.musicVol)) * (mode === 'level' ? 0.6 : 1) : 0;
  const tell = text => { document.documentElement.dataset.music = text; };       // what is playing, readable from outside

  // ---- the score
  let score = null, pumping = 0, scoreOn = false;
  // What the score follows: the floor in view and whether it is online, where the player is, and how much of the tower is back.
  function scoreState() {
    const inLevel = mode === 'level' && !!cur, lv = inLevel ? cur : LEVELS[hubSel] || LEVELS[0], floor = lv.zone || 0;
    return { floor, lit: !floor || floorDone(floor), scene: !inLevel ? 'hub' : play.mode === 'interview' ? 'clock' : play.mode === 'bug' ? 'hunt' : 'level',
      solved: totals().solved, online: ZONES.filter(z => floorDone(z.n)).length, tense: inLevel && play.mode === 'interview' && ivWarned };
  }
  function scoreStart() {
    const ctx = Sfx.context();
    if (!ctx) return;
    try {
      // the sound effects move into the key of the theme that is playing
      if (!score) score = Score.create(ctx, ctx.destination, { seed: (Date.now() & 0xffffff) || 1, lite: coarse, onTheme: th => { Sfx.tune(th.key); tell('score: ' + th.name); } });
      if (ctx.state === 'suspended') ctx.resume();
      score.set(scoreState());
      score.start();
      score.volume(target() * SCORE_GAIN, null, 1.5);
      clearInterval(pumping);
      pumping = setInterval(() => score.pump(ctx.currentTime + 0.6), 100);
      score.pump(ctx.currentTime + 0.6);
      scoreOn = true;
    } catch (e) { score = null; scoreOn = false; }
  }
  function scoreStop() {
    if (!scoreOn) return;
    scoreOn = false;
    clearInterval(pumping);
    score.volume(0, null, 0.6);
    score.stop();
    Sfx.tune(0);
  }

  // ---- the original track
  let el = null, started = false, failed = false, fade = 0, planB = false, ready = false;
  const play = () => { const p = el.play(); if (p && p.catch) p.catch(() => { started = false; }); };
  function fadeTo(v, done) {
    clearInterval(fade);
    const from = el.volume, t0 = performance.now();
    fade = setInterval(() => {
      const k = Math.min(1, (performance.now() - t0) / 900);
      try { el.volume = Math.max(0, Math.min(1, from + (v - from) * k)); } catch (e) { /* some phones fix the volume */ }
      if (k >= 1) { clearInterval(fade); if (done) done(); }
    }, 40);
  }
  function giveUp() { failed = true; started = false; clearInterval(fade); toast('The music track could not be loaded.'); }
  // Plan B, for a viewer that will not let an <audio> element load the file: fetch it and loop it through Web Audio.
  function viaBuffer() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (planB || !AC || !window.fetch) { giveUp(); return; }
    planB = true; started = false;
    clearInterval(fade);
    let ctx = null;
    fetch(SRC).then(r => { if (!r.ok) throw new Error('missing'); return r.arrayBuffer(); })
      .then(data => { ctx = new AC(); return new Promise((res, rej) => ctx.decodeAudioData(data, res, rej)); })
      .then(buf => {
        const gain = ctx.createGain(), src = ctx.createBufferSource();
        gain.gain.value = 0; gain.connect(ctx.destination);
        src.buffer = buf; src.loop = true; src.connect(gain); src.start();
        // the same four members the rest of this code uses on an <audio> element
        el = { get volume() { return gain.gain.value; }, set volume(v) { gain.gain.value = v; }, get paused() { return ctx.state !== 'running'; }, play: () => ctx.resume(), pause: () => { ctx.suspend(); } };
        ready = started = true;
        if (S.music && !useScore() && !document.hidden) { play(); fadeTo(target()); } else el.pause();
      })
      .catch(giveUp);
  }
  function trackStart() {
    if (failed) return;
    if (started) { if (el.paused && !document.hidden) { play(); fadeTo(target()); } return; }
    if (planB && !ready) return;            // still fetching the file
    if (!el) {
      el = new Audio(SRC);
      el.loop = true; el.preload = 'auto'; el.volume = 0;
      el.addEventListener('error', viaBuffer);
    }
    started = true;
    play();
    fadeTo(target());
  }
  function trackApply() {
    if (failed) return;
    if (!el || !started) { if (S.music) trackStart(); return; }
    if (!S.music) { fadeTo(0, () => el.pause()); return; }
    if (el.paused && !document.hidden) play();
    fadeTo(target());
  }
  function trackStop() { if (el && started && !failed && !el.paused) fadeTo(0, () => el.pause()); }

  // ---- both
  // Called from every click and key press: the first one is what lets the browser play sound at all.
  function start() {
    armed = true;
    if (!S.music || document.hidden) return;
    if (useScore()) { trackStop(); if (!scoreOn) scoreStart(); }
    else { scoreStop(); trackStart(); }
  }
  // Called whenever the volume, the scene, the floor or the progress may have changed.
  function apply() {
    if (!armed) return;
    if (!S.music) { scoreStop(); if (el && started) trackApply(); tell('off'); return; }
    if (useScore()) {
      trackStop();
      if (!scoreOn) scoreStart();
      else { score.set(scoreState()); score.volume(target() * SCORE_GAIN, null, 0.9); }
    } else { scoreStop(); trackApply(); tell('track'); }
  }
  // A moment the score answers: 'pass', 'fail', 'rank' (a floor comes online), 'ending'.
  function cue(name) { if (scoreOn) { try { score.cue(name); } catch (e) { /* the music goes on without it */ } } }
  document.addEventListener('visibilitychange', () => {
    if (!armed || !S.music) return;
    if (document.hidden) { scoreStop(); if (el && started && !failed) el.pause(); }
    else start();
  });
  return { start, apply, cue, get failed() { return failed; } };
})();

// ---------------------------------------------------------------- small UI pieces
let modalClose = null;
function modal(html, opts) {
  opts = opts || {};
  $('modal-body').innerHTML = html;
  $('modal').hidden = false;
  $('modal').className = opts.wide ? 'wide' : '';
  $('modal-body').scrollTop = 0;          // a dialog always opens at its top
  modalClose = opts.onClose || null;
  const f = $('modal-body').querySelector('[data-focus]') || $('modal-body').querySelector('button');
  if (f && !coarse) f.focus({ preventScroll: true });
}
function closeModal() { if ($('modal').hidden) return; $('modal').hidden = true; $('modal-body').innerHTML = ''; const f = modalClose; modalClose = null; if (f) f(); }
function toast(text, kind) {
  const t = document.createElement('div');
  t.className = 'toast' + (kind ? ' ' + kind : '');
  t.textContent = text;
  $('toasts').appendChild(t);
  setTimeout(() => { t.classList.add('gone'); setTimeout(() => t.remove(), 400); }, kind === 'badge' ? 4200 : 2800);
}
const starsHtml = n => '<span class="stars" aria-label="' + n + ' of 3 stars">' + [0, 1, 2].map(i => '<i class="' + (i < n ? 'on' : '') + '">★</i>').join('') + '</span>';
function chips(lv) {
  let h = '<span class="chip">' + (lv.kind === 'robot' ? 'Drone puzzle' : lv.kind === 'sandbox' ? 'Free play' : esc(lv.difficulty)) + '</span>';
  if (lv.classic) h += '<span class="chip classic">' + esc(lv.classic) + '</span>';
  if (lv.boss) h += '<span class="chip boss">Floor boss</span>';
  return h;
}
const plain = html => { const d = document.createElement('div'); d.innerHTML = html; return d.textContent.replace(/\s+\n/g, '\n').trim(); };
const clock = ms => { const s = Math.max(0, Math.round(ms / 1000)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
// The interface takes the colour of the floor in view.
const setAccent = color => document.documentElement.style.setProperty('--accent', color);

// ---------------------------------------------------------------- badges
const BADGES = [
  { id: 'first', name: 'First Contact', desc: 'Solve your first level.', test: c => c.solved >= 1 },
  { id: 'boot', name: 'Boot Sequence', desc: 'Bring Floor 1 back online.', test: c => c.rank >= 1 },
  { id: 'xray', name: 'X-Ray Vision', desc: 'Step through a run line by line.', test: c => c.n('traces') >= 1 },
  { id: 'lab', name: 'Lab Rat', desc: 'Run five experiments in the Scratchpad.', test: c => c.n('lab') >= 5 },
  { id: 'oracle', name: 'Oracle', desc: 'Predict the output of 10 lesson examples.', test: c => c.n('predict') >= 10 },
  { id: 'persist', name: 'Bug Squasher', desc: 'Solve a level after five or more failed runs.', test: c => c.n('persist') >= 1 },
  { id: 'speed', name: 'Speed of Light', desc: 'Pass a speed test.', test: c => c.n('speed') >= 1 },
  { id: 'clean', name: 'Clean Hands', desc: 'Earn three stars on 10 levels.', test: c => c.three >= 10 },
  { id: 'lean', name: 'Lean Machine', desc: 'Match the model solution for efficiency on five levels.', test: c => c.lean >= 5 },
  { id: 'memory', name: 'Long Memory', desc: 'Pass 10 reviews.', test: c => c.n('reviews') >= 10 },
  { id: 'streak3', name: 'On a Roll', desc: 'Solve levels three days in a row.', test: c => c.streak >= 3 },
  { id: 'streak7', name: 'Unstoppable', desc: 'Solve levels seven days in a row.', test: c => c.streak >= 7 },
  { id: 'boss', name: 'Boss Breaker', desc: 'Clear three floor bosses.', test: c => c.bosses >= 3 },
  { id: 'classic10', name: 'Classic Collector', desc: 'Solve 10 classic interview problems.', test: c => c.classics >= 10 },
  { id: 'offer', name: 'Offer Letter', desc: 'Solve every problem of an on-site interview round.', test: c => c.n('ivOnsite') >= 1 },
  { id: 'loop', name: 'Senior Loop', desc: 'Solve every problem of the senior interview loop.', test: c => c.n('ivSenior') >= 1 },
  { id: 'classicAll', name: 'The Whole Shelf', desc: 'Solve every classic interview problem in the tower.', test: c => CLASSICS > 0 && c.classics >= CLASSICS },
  { id: 'briefs', name: 'Well Briefed', desc: 'Read 20 briefings for the level ahead.', test: c => c.n('briefs') >= 20 },
  { id: 'craft1', name: 'Clean Code', desc: 'Earn all four craft marks on one level.', test: c => c.craft4 >= 1 },
  { id: 'craft10', name: 'Craftsman', desc: 'Earn all four craft marks on 10 levels.', test: c => c.craft4 >= 10 },
  { id: 'bugs', name: 'Exterminator', desc: 'Repair 10 planted bugs in the bug hunt.', test: c => c.n('bugs') >= 10 },
  { id: 'senior', name: 'Senior Engineer', desc: 'Bring Floor 7 back online.', test: c => c.rank >= 7 },
  { id: 'summit', name: 'Top of the Pylon', desc: 'Solve every level in the tower.', test: c => c.solved >= LEVELS.length },
];
function checkBadges(silent) {
  const done = LEVELS.filter((l, i) => isSolved(i));
  const c = { solved: done.length, rank: rankIndex(), streak: streak(), three: done.filter(l => S.levels[l.id].stars === 3).length, lean: done.filter(l => S.levels[l.id].lean).length, craft4: done.filter(l => S.levels[l.id].craft === 15).length,
    bosses: done.filter(l => l.boss).length, classics: done.filter(l => l.classic).length, n: k => S.counters[k] || 0 };
  let fresh = 0;
  for (const b of BADGES) {
    if (S.badges[b.id] || !b.test(c)) continue;
    S.badges[b.id] = Date.now();
    fresh++;
    if (!silent) setTimeout(() => { toast('Badge earned: ' + b.name, 'badge'); Sfx.play('badge'); }, 900 + fresh * 700);
  }
  if (fresh) { save(); renderHud(); }
}

// ---------------------------------------------------------------- daily review (spaced repetition)
// A solved code level comes back after 1 day, then 3, 7, 14, 30 and 60. Each time it has to be written again from the
// starting code. Getting it right moves it one step along; "I forgot" sends it back to the start. Three a day at most.
const RV_GAPS = [1, 3, 7, 14, 30, 60], RV_PER_DAY = 3;
function reviewQueue() {
  const t = today(), out = [];
  LEVELS.forEach((l, i) => { const s = S.levels[l.id]; if (l.kind === 'code' && s && s.solved && s.rv && s.rv.due <= t) out.push(i); });
  return out.sort((a, b) => (S.levels[LEVELS[a].id].rv.due < S.levels[LEVELS[b].id].rv.due ? -1 : 1));
}
const reviewsDone = () => (S.rvDay && S.rvDay.d === today() ? S.rvDay.n : 0);
const reviewsLeft = () => Math.max(0, Math.min(reviewQueue().length, RV_PER_DAY - reviewsDone()));
function seedReviews() {                          // levels solved before reviews existed join the queue
  let any = false;
  for (const l of LEVELS) { const s = S.levels[l.id]; if (l.kind === 'code' && s && s.solved && !s.rv) { s.rv = { box: 0, due: dayPlus(1, s.t || Date.now()) }; any = true; } }
  return any;
}
function countReview() { const t = today(); S.rvDay = { d: t, n: (S.rvDay && S.rvDay.d === t ? S.rvDay.n : 0) + 1 }; }
function startReview() {
  if (!reviewsLeft()) {
    const waiting = LEVELS.filter(l => S.levels[l.id] && S.levels[l.id].rv).length;
    Sfx.play('modal');
    modal('<div class="eyebrow">Daily review</div><h2>Nothing is due</h2><p>' + (reviewsDone() >= RV_PER_DAY ? 'You have done today’s three reviews. More will be waiting tomorrow.'
      : waiting ? 'Every level you solved is resting. The next one comes back when its date arrives.' : 'Solve a code level and it will come back here tomorrow, to be written again from memory.') + '</p>' +
      '<p class="mute">Each solved level returns after 1 day, then 3, 7, 14, 30 and 60. Writing it again from the starting code, without the lesson, is what moves it into long-term memory.</p>' +
      '<div class="done-actions"><button type="button" class="btn" data-focus id="menu-close">Close</button></div>');
    return;
  }
  enter(LEVELS[reviewQueue()[0]], { mode: 'review' });
}
function reviewDone(lv, ok, res) {
  const s = st(lv.id), box = ok ? Math.min(RV_GAPS.length - 1, (s.rv ? s.rv.box : 0) + 1) : 0;
  s.rv = { box, due: dayPlus(ok ? RV_GAPS[box] : 1) };
  countReview();
  if (ok) { S.bonus += 15; bump('reviews'); markDay(); }
  save();
  checkBadges();
  const left = reviewsLeft(), z = zoneOf(lv);
  let h = '<div class="done"><div class="eyebrow">Review · Floor ' + z.n + '</div><h2>' + esc(lv.title) + '</h2>';
  if (ok) {
    Sfx.play('star'); haptic([20, 40, 20]);
    h += '<p class="done-why">Written again from memory. <b>+15 XP</b></p><p class="eff"><span>Next review</span> in ' + RV_GAPS[box] + (RV_GAPS[box] === 1 ? ' day' : ' days') + '.</p>';
    if (res && res.refSteps > 0 && res.steps > 0) { const e = res.steps / res.refSteps; h += '<p class="eff"><span>Efficiency</span> ' + (e <= 1.3 ? 'As lean as the model solution.' : 'About ' + (e < 10 ? e.toFixed(1) : Math.round(e)) + ' times the steps of the model solution.') + '</p>'; }
  } else {
    h += '<p>No harm done. Read it once more, then it comes back tomorrow.</p><pre class="code">' + window.PylonHighlight(lv.solution.replace(/\n+$/, '')) + '</pre><div class="prose">' + lv.explain + '</div>';
  }
  h += '<div class="done-actions">' + (left ? '<button type="button" class="btn primary" data-focus id="rv-next">Next review (' + left + ' left)</button>' : '') +
    '<button type="button" class="btn' + (left ? ' ghost' : ' primary') + '" id="done-tower"' + (left ? '' : ' data-focus') + '>Back to the tower</button></div></div>';
  modal(h, { wide: !ok });
}

// ---------------------------------------------------------------- mock interviews
// A timed set of classic problems drawn from the floors the player has reached: no lesson, no hints, no solution.
const IV_SETS = [
  { id: 'screen', name: 'Phone screen', mins: 20, pick: ['Easy', 'Easy'], blurb: 'Two easy problems. A warm-up before the real thing.' },
  { id: 'onsite', name: 'On-site round', mins: 40, pick: ['Easy', 'Medium', 'Medium'], blurb: 'One easy and two medium problems, the shape of a real coding round.' },
  { id: 'senior', name: 'Senior loop', mins: 60, pick: ['Medium', 'Medium', 'Hard'], blurb: 'Two medium problems and a hard one. The bar for the top floors.' },
];
const IV_XP = { Easy: 30, Medium: 60, Hard: 120 };
let ivTimer = 0, ivWarned = false;
const ivPool = diff => LEVELS.filter((l, i) => l.classic && l.kind === 'code' && l.difficulty === diff && isUnlocked(i));
function ivNeeds(set) {                           // null when the set can start, otherwise what is still missing
  const need = {};
  for (const d of set.pick) need[d] = (need[d] || 0) + 1;
  for (const d in need) { const have = ivPool(d).length; if (have < need[d]) return 'Opens when you have reached ' + need[d] + ' ' + d.toLowerCase() + ' classic' + (need[d] > 1 ? 's' : '') + ' in the tower. You have reached ' + have + '.'; }
  return null;
}
function showInterviews() {
  Sfx.play('modal');
  const last = S.ivLog.slice(-3).reverse(), pool = bugPool().length, paid = bugPaid(), fixed = !paid && S.bug.ok;
  modal('<div class="eyebrow">Challenges</div><h2>Prove it</h2>' +
    '<h3>Daily bug hunt</h3><button type="button" class="ivset" id="bug-start"' + (pool ? '' : ' disabled') + '><strong>Find the bug</strong><em>' + (paid ? '+' + BUG_XP + ' XP' : 'Practice') + '</em><span>' +
    (!pool ? 'Opens when you have solved your first code level.' : paid ? 'One small thing has been changed in the answer to a level you have solved: your own answer where it still passes. Read it, find the line and repair it.'
      : (fixed ? 'Repaired today. ' : 'Today’s hunt is over. ') + 'A new bug arrives tomorrow. Until then, more of them for practice.') + '</span></button>' +
    '<h3>Mock interview</h3><p>A timed set of classic problems from the floors you have reached. There is no lesson, no hint and no solution: only the task, the editor, and Step through. The clock does not stop.</p>' +
    '<div class="rows" style="gap:6px">' + IV_SETS.map(s => { const miss = ivNeeds(s); return '<button type="button" class="ivset" data-iv="' + s.id + '"' + (miss ? ' disabled' : '') + '><strong>' + esc(s.name) + '</strong><em>' + s.mins + ' min · ' + s.pick.length + ' problems</em><span>' + esc(miss || s.blurb) + '</span></button>'; }).join('') + '</div>' +
    (last.length ? '<h3>Your last rounds</h3><ul class="ivlist">' + last.map(r => { const set = IV_SETS.find(s => s.id === r.set) || IV_SETS[0]; return '<li class="' + (r.solved === r.n ? 'ok' : 'bad') + '"><span class="t-mark">' + (r.solved === r.n ? '✓' : '·') + '</span><span>' + esc(set.name) + ' <small>' + r.solved + ' of ' + r.n + ' solved</small></span><small>' + esc(r.v) + '</small></li>'; }).join('') + '</ul>' : '') +
    '<div class="done-actions"><button type="button" class="btn ghost" data-focus id="menu-close">Not now</button></div>', { wide: true });
}
function startInterview(id) {
  const set = IV_SETS.find(s => s.id === id);
  if (!set || ivNeeds(set)) return;
  const used = new Set(), ids = [];
  for (const d of set.pick) { const pool = ivPool(d).filter(l => !used.has(l.id)), l = pool[Math.floor(Math.random() * pool.length)]; used.add(l.id); ids.push(l.id); }
  S.iv = { set: set.id, ids, codes: {}, res: {}, t0: Date.now(), limit: set.mins * 60000, at: 0 };
  save();
  enterInterview(0);
}
function enterInterview(k) {
  const iv = S.iv;
  if (!iv) return;
  keepCode();
  iv.at = Math.max(0, Math.min(iv.ids.length - 1, k));
  enter(LEVELS[INDEX[iv.ids[iv.at]]], { mode: 'interview' });
  clearInterval(ivTimer);
  ivWarned = false;
  ivTimer = setInterval(tickInterview, 500);
  tickInterview();
}
function renderIvBar() {
  const iv = S.iv, bar = $('iv-bar');
  bar.hidden = !(iv && play.mode === 'interview');
  if (bar.hidden) return;
  bar.innerHTML = '<span class="iv-clock" id="iv-clock" role="timer"></span><span class="iv-pills">' + iv.ids.map((id, k) => { const ok = iv.res[id] && iv.res[id].ok; return '<button type="button" class="iv-pill' + (k === iv.at ? ' on' : '') + (ok ? ' ok' : '') + '" data-ivgo="' + k + '" aria-label="Problem ' + (k + 1) + (ok ? ', solved' : '') + '">' + (ok ? '✓ ' : '') + (k + 1) + '</button>'; }).join('') +
    '</span><button type="button" class="btn ghost" id="iv-finish">Finish</button>';
}
function tickInterview() {
  const iv = S.iv;
  if (!iv || play.mode !== 'interview') { clearInterval(ivTimer); return; }
  const left = iv.t0 + iv.limit - Date.now(), c = $('iv-clock');
  if (c) { c.textContent = clock(left); c.classList.toggle('low', left < 120000); }
  if (left < 120000 && !ivWarned) { ivWarned = true; Sfx.play('clock'); toast('Two minutes left.'); Music.apply(); }
  if (left <= 0) finishInterview(true);
}
function ivAfterRun(lv, res) {
  const iv = S.iv;
  if (!iv) return;
  const r = iv.res[lv.id] || (iv.res[lv.id] = { ok: false, tries: 0 });
  r.tries++;
  if (res.ok && !r.ok) { r.ok = true; r.at = Date.now() - iv.t0; r.eff = res.refSteps > 0 ? res.steps / res.refSteps : null; haptic([20, 40, 20]); }
  save();
  renderIvBar(); tickInterview();
  if (!res.ok) { haptic(60); return; }
  const next = iv.ids.findIndex(id => !(iv.res[id] && iv.res[id].ok));
  if (next < 0) { setTimeout(() => { if (S.iv === iv) finishInterview(false); }, 1100); return; }
  toast('Problem ' + (iv.at + 1) + ' solved. On to problem ' + (next + 1) + '.');
  setTimeout(() => { if (S.iv === iv && play.mode === 'interview' && cur === lv) enterInterview(next); }, 1500);
}
function finishInterview(timeUp) {
  const iv = S.iv;
  if (!iv) return;
  clearInterval(ivTimer);
  keepCode();
  const set = IV_SETS.find(s => s.id === iv.set) || IV_SETS[0], n = iv.ids.length;
  const rows = iv.ids.map(id => ({ lv: LEVELS[INDEX[id]], r: iv.res[id] || { ok: false, tries: 0 } }));
  const solved = rows.filter(x => x.r.ok).length, tries = rows.reduce((a, x) => a + x.r.tries, 0);
  const v = solved === n ? (tries <= n + 2 ? ['Strong hire', 'good'] : ['Hire', 'good']) : solved >= n - 1 && solved > 0 ? ['Leaning hire', 'mid'] : ['No hire yet', 'bad'];
  const xp = Math.round(rows.reduce((a, x) => a + (x.r.ok ? IV_XP[x.lv.difficulty] || 30 : 0), 0) * (solved === n ? 1.5 : 1));
  S.bonus += xp;
  S.ivLog.push({ set: set.id, solved, n, v: v[0], t: Date.now() });
  S.ivLog = S.ivLog.slice(-12);
  if (solved === n) { bump(set.id === 'senior' ? 'ivSenior' : set.id === 'onsite' ? 'ivOnsite' : 'ivScreen'); markDay(); }
  S.iv = null;
  save();
  Sfx.play(solved === n ? 'rank' : solved ? 'star' : 'fail');
  const miss = rows.find(x => !x.r.ok);
  modal('<div class="eyebrow">' + esc(set.name) + (timeUp ? ' · time is up' : '') + '</div><div class="verdict-big ' + v[1] + '">' + v[0] + '</div>' +
    '<p>' + solved + ' of ' + n + ' problems solved' + (xp ? '. <b style="color:var(--amber)">+' + xp + ' XP</b>' : '.') + '</p><ul class="ivlist">' + rows.map(x =>
      '<li class="' + (x.r.ok ? 'ok' : 'bad') + '"><span class="t-mark">' + (x.r.ok ? '✓' : '✗') + '</span><span>' + esc(x.lv.title) + ' <small>' + esc(x.lv.classic) + ' · ' + esc(x.lv.difficulty) + '</small></span><small>' +
      (x.r.ok ? 'at ' + clock(x.r.at) + ' · ' + x.r.tries + (x.r.tries === 1 ? ' run' : ' runs') + (x.r.eff ? ' · ' + (x.r.eff <= 1.3 ? 'lean' : (x.r.eff < 10 ? x.r.eff.toFixed(1) : Math.round(x.r.eff)) + '× steps') : '') : x.r.tries ? x.r.tries + (x.r.tries === 1 ? ' run' : ' runs') : 'not attempted') + '</small></li>').join('') + '</ul>' +
    (miss ? '<p class="mute">The lessons for the problems you missed are in the tower. Study one, then try another round.</p>' : '<p class="mute">Every problem solved under the clock, with no help. That is the real skill.</p>') +
    '<div class="done-actions"><button type="button" class="btn primary" data-focus id="iv-close">Back to the tower</button>' + (miss ? '<button type="button" class="btn" data-go="' + INDEX[miss.lv.id] + '">Study “' + esc(miss.lv.title) + '”</button>' : '') + '</div>',
  { wide: true, onClose: () => { if (mode === 'level' && play.mode === 'interview') closeLevel(); checkBadges(); } });
}

// ---------------------------------------------------------------- daily bug hunt
// One small thing is changed in the model solution of a level the player has already solved (js/bughunt.js finds the
// places). The player reads the code, finds the line and repairs it. The first hunt of a day pays XP; after that it is practice.
const Bugs = window.PylonBugs || null;
const BUG_XP = 25, BUG_XP_CLEAN = 10;
let bugRound = 0;
const bugPool = () => (Bugs ? LEVELS.filter((l, i) => l.kind === 'code' && isSolved(i) && l.solution) : []);
const bugPaid = () => !(S.bug && S.bug.d === today());
// Try changes until one breaks a test. The best bug still passes some tests and hangs none of them.
async function plantBug(pool, seedText) {
  const rnd = Bugs.seeded(seedText), t0 = Date.now();
  let spare = null;
  for (const lv of Bugs.shuffled(pool, rnd).slice(0, 6)) {
    // The player's own answer is the better place for a bug, when it is still there and still passes.
    const own = S.levels[lv.id] && typeof S.levels[lv.id].code === 'string' ? S.levels[lv.id].code : '';
    let mine = false;
    if (own.trim() && !sameCode(own, lv.solution)) { try { mine = Runner.run(lv, own, { quick: true }).ok; } catch (e) { mine = false; } }
    const code = (mine ? own : lv.solution).replace(/\s+$/, '') + '\n';
    for (const spot of Bugs.shuffled(Bugs.spots(code), rnd).slice(0, 8)) {
      const made = Bugs.apply(code, spot);
      let res = null;
      try { res = Runner.run(lv, made.code, { quick: true }); } catch (e) { res = null; }
      const verdict = Bugs.judge(res);
      made.lv = lv; made.mine = mine;
      if (verdict === 'good') return made;
      if (verdict === 'weak' && !spare) spare = made;
      if (Date.now() - t0 > 2500) return spare;
      await nextPaint();
    }
  }
  return spare;
}
async function startBug() {
  const pool = bugPool();
  if (!pool.length || busy) return;
  const paid = bugPaid();
  if (!paid) bugRound++;
  modal('<div class="eyebrow">Bug hunt</div><h2>Planting a bug…</h2><p class="mute">Taking the answer to a level you have solved and changing one small thing in it.</p>');
  await nextPaint();
  const made = await plantBug(pool, today() + ':' + (paid ? 0 : bugRound));
  if ($('modal').hidden) return;                   // closed while the bug was being made
  if (!made) {
    modal('<div class="eyebrow">Bug hunt</div><h2>No bug this time</h2><p>None of the changes tried on your solved levels broke a test. Solve another level and try again.</p>' +
      '<div class="done-actions"><button type="button" class="btn" data-focus id="menu-close">Close</button></div>');
    return;
  }
  enter(made.lv, { mode: 'bug', bug: Object.assign(made, { paid, runs: 0, closed: false }) });
}
function bugAfterRun(lv, res) {
  const b = play.bug;
  if (!b) return;
  b.runs++;
  if (res.ok) bugDone(lv, true);
  else { haptic(60); say(pickLine(Story.LINES.bug, b.runs)); }
}
function bugDone(lv, ok) {
  const b = play.bug;
  if (!b) return;
  const z = zoneOf(lv), first = !b.closed, clean = ok && b.runs === 1;
  let xp = 0;
  if (first) {
    b.closed = true;
    if (ok) { bump('bugs'); if (b.paid) { xp = BUG_XP + (clean ? BUG_XP_CLEAN : 0); S.bonus += xp; markDay(); } }
    if (b.paid) S.bug = { d: today(), ok: !!ok };
    save();
    checkBadges();
  }
  if (ok) { Sfx.play('star'); haptic([20, 40, 20]); } else Sfx.play('modal');
  const why = ok ? 'Every test passes again.' + (xp ? ' <b>+' + BUG_XP + ' XP</b>' + (clean ? ' and <b>+' + BUG_XP_CLEAN + '</b> for repairing it on the first run.' : '') : first && !b.paid ? ' A practice round: the XP goes to the first hunt of the day.' : '')
    : 'One small change was enough to break it. A new bug arrives tomorrow.';
  modal('<div class="done"><div class="eyebrow">Bug hunt · Floor ' + z.n + ' · ' + esc(lv.title) + '</div><h2>' + (ok ? 'Bug fixed' : 'Here is the bug') + '</h2><p class="done-why">' + why + '</p>' +
    '<div class="bugdiff"><span>Line ' + b.line + ', with the bug</span><pre class="code">' + window.PylonHighlight(Bugs.bare(b.bad)) + '</pre><span>As it was written</span><pre class="code">' + window.PylonHighlight(Bugs.bare(b.good)) + '</pre></div>' +
    (ok ? pipLine(pickLine(Story.LINES.bugok, b.line + b.runs)) : '') +
    '<div class="done-actions"><button type="button" class="btn primary" data-focus id="bug-again">Another bug (practice)</button><button type="button" class="btn ghost" id="done-tower">Back to the tower</button></div></div>');
}

// ---------------------------------------------------------------- hub
let mode = 'hub', hubSel = 0, cur = null, editor = null, busy = false, animating = false, lastRes = null;
// What the level panel is being used for: a normal level, a spaced review of a solved one, or a timed interview.
let play = { mode: 'normal' };
const progressList = () => LEVELS.map((l, i) => ({ state: isSolved(i) ? 'solved' : isUnlocked(i) ? 'open' : 'locked', stars: (S.levels[l.id] && S.levels[l.id].stars) || 0 }));
function refreshProgress() {
  World.setProgress(progressList(), nextIndex());
  Music.apply();
  renderHud(); renderFloors(); renderCard();
}
function renderHud() {
  const t = totals(), sk = streak(), earned = Object.keys(S.badges).length, due = reviewsLeft();
  $('rank').textContent = RANKS[rankIndex()];
  $('stat-signal').textContent = Math.round(100 * t.solved / Math.max(1, LEVELS.length)) + '%';
  $('signal-bars').innerHTML = ZONES.map(z => '<u class="' + (floorDone(z.n) ? 'on' : '') + '" style="--zc:' + z.color + '"></u>').join('');
  $('stat-stars').textContent = t.stars + ' / ' + LEVELS.length * 3;
  $('stat-xp').textContent = num(t.xp);
  $('streak-box').hidden = sk < 1;
  $('stat-streak').textContent = sk + (sk === 1 ? ' day' : ' days');
  $('btn-review').innerHTML = due ? 'Review <b>' + due + '</b>' : 'Review';
  $('btn-badges').textContent = 'Badges ' + earned + '/' + BADGES.length;
  $('btn-music').setAttribute('aria-pressed', S.music ? 'true' : 'false');
}
function renderFloors() {
  const curZone = LEVELS[hubSel] ? LEVELS[hubSel].zone : 1;
  $('floors').innerHTML = ZONES.slice().reverse().map(z => {
    const ls = zoneLevels(z.n);
    if (!ls.length) return '';
    const open = isUnlocked(INDEX[ls[0].id]);
    return '<button type="button" class="floor' + (z.n === curZone ? ' on' : '') + (open ? '' : ' locked') + '" data-zone="' + z.n + '" style="--zc:' + z.color + '" aria-label="Floor ' + z.n + ', ' + esc(z.name) + '">' +
      '<span class="f-n">' + z.n + '</span><span class="f-name">' + esc(z.name) + ' <small>' + ls.filter(l => isSolved(INDEX[l.id])).length + '/' + ls.length + '</small></span><span class="f-dots" aria-hidden="true">' +
      ls.map(l => '<i class="' + (isSolved(INDEX[l.id]) ? 'd' : '') + '"></i>').join('') + '</span></button>';
  }).join('');
}
function renderCard() {
  const lv = LEVELS[hubSel];
  if (!lv) { $('card').innerHTML = ''; return; }
  const z = zoneOf(lv), s = S.levels[lv.id], solved = isSolved(hubSel), open = isUnlocked(hubSel);
  let action;
  if (!open) action = '<p class="locked">Locked. Finish “' + esc(LEVELS[hubSel - 1].title) + '” first.</p>';
  else action = '<button type="button" class="btn primary" id="card-enter">' + (solved ? 'Play again' : s && s.tries ? 'Continue' : 'Enter level') + '</button>' + (solved ? starsHtml(s.stars) + (lv.kind === 'code' ? craftPips(s.craft || 0) : '') + '<span class="chip xp">' + (s.xp + (s.cx || 0)) + ' XP</span>' : '');
  $('card').innerHTML =
    '<button type="button" class="nav" id="card-prev" aria-label="Previous level"' + (hubSel === 0 ? ' disabled' : '') + '>‹</button>' +
    '<div class="card-main"><div class="eyebrow">Floor ' + z.n + ' · ' + esc(z.name) + ' · Level ' + lv.order + ' of ' + zoneLevels(z.n).length + '</div>' +
    '<h2>' + esc(lv.title) + '</h2><p class="concept">' + esc(lv.concept) + '</p><div class="chips">' + chips(lv) + '</div><div class="card-foot">' + action + '</div></div>' +
    '<button type="button" class="nav" id="card-next" aria-label="Next level"' + (hubSel >= LEVELS.length - 1 ? ' disabled' : '') + '>›</button>';
}
function selectLevel(i, instant) {
  if (i < 0 || i >= LEVELS.length) return;
  hubSel = i;
  S.last = LEVELS[i].id;
  if (mode === 'hub') { setAccent(zoneOf(LEVELS[i]).color); Music.apply(); }       // the score takes the theme of the floor in view
  World.select(i, !!instant);
  renderFloors(); renderCard();
}

// ---------------------------------------------------------------- level view
function setMode(m) {
  mode = m;
  $('app').className = 'mode-' + m + ($('app').classList.contains('kb') ? ' kb' : '');
  $('panel').hidden = m !== 'level';
  $('hud').hidden = $('dock').hidden = m !== 'hub';
  World.resize();
  requestAnimationFrame(() => World.resize());
  Music.apply();
}
// Colour the Python inside lesson and task text, remembering the plain source for the examples.
function hl(el) { el.querySelectorAll('pre code').forEach(c => { c.parentNode.dataset.src = c.textContent; c.innerHTML = window.PylonHighlight(c.textContent); }); }
const sameText = (a, b) => { const n = t => t.replace(/\r/g, '').split('\n').map(l => l.replace(/\s+$/, '')).join('\n').trim(); return n(a) === n(b); };
// A lesson example that prints something becomes a small exercise: say what it prints, then check.
function addExamples(root, lv) {
  let k = 0;
  root.querySelectorAll('pre').forEach(pre => {
    const code = pre.dataset.src;
    if (!code || code.indexOf('print(') < 0) return;
    let probe;
    try { probe = Runner.runFree(code, 300000, { stdin: '', files: lv.lessonFiles || {} }); } catch (e) { return; }
    const want = probe.ok ? probe.output.replace(/\s+$/, '') : '', lines = want.split('\n').length;
    if (!want || lines > 6) return;
    const idx = k++, s = st(lv.id), bit = 1 << idx, box = document.createElement('div'), id = 'pd-' + idx;
    box.className = 'predict';
    box.innerHTML = '<label for="' + id + '">What will this print?</label>' +
      (lines > 1 ? '<textarea id="' + id + '" rows="' + lines + '" spellcheck="false" autocapitalize="off" autocomplete="off"></textarea>' : '<input id="' + id + '" type="text" spellcheck="false" autocapitalize="off" autocomplete="off">') +
      '<button type="button" class="btn" data-pd="check">Check</button><button type="button" class="btn ghost" data-pd="show">Show</button><div class="verdict" hidden></div><pre hidden></pre>';
    const field = box.querySelector('#' + id), verdict = box.querySelector('.verdict'), outEl = box.querySelector('pre');
    const reveal = (text, cls) => { verdict.hidden = false; verdict.className = 'verdict ' + cls; verdict.textContent = text; outEl.hidden = false; outEl.textContent = want; field.disabled = true; box.querySelectorAll('button').forEach(b => { b.disabled = true; }); };
    const check = () => {
      if (!field.value.trim()) { field.focus(); return; }
      if (sameText(field.value, want)) {
        const first = !((s.pred || 0) & bit);
        if (first) { s.pred = (s.pred || 0) | bit; S.bonus += 5; bump('predict'); save(); renderHud(); checkBadges(); }
        Sfx.play('tick');
        reveal('Correct.' + (first ? ' +5 XP' : ''), 'ok');
      } else { Sfx.play('buzz'); verdict.hidden = false; verdict.className = 'verdict bad'; verdict.textContent = 'Not that. Trace the code line by line, or press Show.'; }
    };
    box.addEventListener('click', e => { const b = e.target.closest('[data-pd]'); if (!b) return; if (b.dataset.pd === 'check') check(); else reveal('This is what it prints.', 'mute'); });
    if (lines === 1) field.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); check(); } });
    if ((s.pred || 0) & bit) reveal('You predicted this one.', 'ok');
    pre.after(box);
  });
}
// The terminal under the Run bar: the last run written down as Python's prompt would show it, and a prompt of its own.
const Term = (() => {
  let live = null, liveCode = null, liveLv = null, buffer = [], past = [], at = 0;
  const PS = { sh: '$', in: '>>>', more: '...' };
  const row = l => '<div class="tl tl-' + l.k + (l.ok === true ? ' ok' : l.ok === false ? ' bad' : '') + '">' + (PS[l.k] ? '<i>' + PS[l.k] + '</i>' : '') + '<span>' + (esc(l.t) || ' ') + '</span></div>';
  const box = () => $('term-out');
  function add(lines, fresh) {
    const el = box();
    if (fresh) el.innerHTML = '';
    el.insertAdjacentHTML('beforeend', lines.map(row).join(''));
    while (el.childElementCount > 400) el.firstElementChild.remove();
  }
  const bottom = () => { const el = box(); el.scrollTop = el.scrollHeight; };
  const prompt = () => { $('term-ps').textContent = buffer.length ? '...' : '>>>'; };
  return {
    // A level opens: an empty terminal that says what it is for.
    reset(lv) {
      live = null; buffer = []; prompt();
      $('term').hidden = !Terminal || !lv;
      if (!Terminal || !lv) return;
      $('term-row').hidden = lv.kind === 'robot';
      $('term').open = window.innerWidth > 900;          // on a small screen the task comes first: the terminal opens with the first run
      add([{ k: 'note', t: lv.kind === 'robot' ? '# Run your program: what it prints and any error show up here.' : '# Run your code: what it prints and what each call returns show up here. Then try lines of your own below.' }], true);
    },
    // A run has finished: write it down, and bring the first thing that went wrong into view.
    show(lv, res, code) {
      if (!Terminal) return;
      live = null; buffer = []; prompt();
      $('term').open = true;
      add(Terminal.transcript(lv, res, code), true);
      const el = box(), bad = el.querySelector('.tl.bad, .tl-err');
      if (bad) el.scrollTop = Math.max(0, bad.offsetTop - el.offsetTop - 4); else bottom();
    },
    // A line typed at the prompt. The session is made from the code as it is in the editor now.
    enter(text) {
      if (!Terminal || !cur || cur.kind === 'robot') return;
      if (!buffer.length && text.trim() === 'clear') { add([], true); return; }
      if (!buffer.length && !text.trim()) { add([{ k: 'in', t: '' }]); bottom(); return; }
      add([{ k: buffer.length ? 'more' : 'in', t: text }]);
      buffer.push(text);
      if (text.trim()) { past = past.filter(p => p !== text).concat([text]).slice(-50); at = past.length; }
      if (Terminal.pending(buffer)) { prompt(); bottom(); return; }
      const src = buffer.join('\n').replace(/\s+$/, ''), code = editor.value;
      buffer = []; prompt();
      if (!live || liveCode !== code || liveLv !== cur) {
        const again = !!live;
        try { live = Runner.repl(cur, code, cur.kind === 'sandbox' ? labIo() : undefined); } catch (e) { live = null; add([{ k: 'err', t: 'The terminal could not start: ' + ((e && e.message) || e) }]); bottom(); return; }
        liveCode = code; liveLv = cur;
        if (again) add([{ k: 'note', t: '# your code changed: main.py was loaded again' }]);
        if (live.error) { add(Terminal.reply({ output: live.output, error: live.error }, code)); add([{ k: 'note', t: '# main.py stopped with this error, so its names may be missing' }]); }
      }
      let r;
      try { r = live.line(src); } catch (e) { r = { error: { internal: true, message: String((e && e.message) || e) } }; }
      add(Terminal.reply(r, code));
      bottom();
      bump('term');
    },
    key(e) {
      const inp = $('term-in');
      if (e.key === 'Enter') { e.preventDefault(); const text = inp.value; inp.value = ''; Term.enter(text); }
      else if (e.key === 'ArrowUp' && past.length) { e.preventDefault(); at = Math.max(0, at - 1); inp.value = past[at]; }
      else if (e.key === 'ArrowDown' && past.length) { e.preventDefault(); at = Math.min(past.length, at + 1); inp.value = past[at] || ''; }
      else if (e.key === 'Escape') { buffer = []; prompt(); inp.value = ''; }
      e.stopPropagation();
    },
  };
})();
$('term-in').addEventListener('keydown', Term.key);
let shownMap = 0, staged = null;                     // staged: the scene a code level is showing (js/scenes.js), or null
const sceneMeta = lv => { const z = zoneOf(lv); return { color: z.color, floor: z.n, boss: !!lv.boss, tests: lv.tests.length, perf: lv.tests.map(t => !!t.perf) }; };
// The caption under a scene: the call that is on stage, and a line about what is happening there.
function caption(text, kind) {
  const el = $('scene-note'), tag = $('stage-note');
  $('scene-text').textContent = text || '';
  el.className = kind || '';
  el.hidden = !staged;
  World.setInsets(tag.offsetHeight ? tag.offsetHeight + 24 : 8, el.hidden ? 20 : el.offsetHeight + 18);       // the scene is framed clear of both labels
}
// Puts test i of a code level on stage. keep: the level is already showing, so the camera stays where it is.
function stageScene(lv, i, keep) {
  staged = Scenes && RealWorld.ok && lv.kind === 'code' ? Scenes.plan(lv, i) : null;
  $('app').classList.toggle('scene', !!staged);
  if (!staged) return null;
  const t = lv.tests[i], n = lv.tests.length;
  $('stage-note').hidden = n < 2;
  $('stage-note').textContent = 'Test ' + (i + 1) + ' of ' + n;
  $('scene-call').textContent = t.stdout !== undefined ? (t.stdin ? 'typed in: ' + String(t.stdin).replace(/\n$/, '').split('\n').join(' ⏎ ') : 'your whole program') : String(t.show || t.call || '');
  caption(staged.stage.note, '');
  World.showScene(staged.stage, Object.assign(sceneMeta(lv), { keep: !!keep }));
  return staged;
}
function buildArena() {
  const z = zoneOf(cur);
  shownMap = 0;
  if (cur.kind === 'code' && stageScene(cur, Scenes ? Scenes.choose(cur, null) : 0)) return;
  staged = null;
  $('app').classList.remove('scene');
  $('scene-note').hidden = true;
  World.setInsets(50, 20);
  if (cur.kind === 'robot') World.showRobot(Runner.parseMap(cur.maps[0]), z.color);
  else World.showTests(cur.tests.length, cur.tests.map(t => !!t.perf), z.color, !!cur.boss, z.n);
}
function openLevel(i) {
  if (!LEVELS[i]) return;
  if (!isUnlocked(i)) { selectLevel(i); toast('That level is still locked.'); return; }
  hubSel = i;
  enter(LEVELS[i]);
}
// The names a level adds to the completion list.
const NODE_WORDS = [{ label: 'ListNode', insert: 'ListNode(|)', kind: 'class', sig: 'ListNode(val, next=None)', doc: 'One node of a linked list' }, { label: 'TreeNode', insert: 'TreeNode(|)', kind: 'class', sig: 'TreeNode(val, left=None, right=None)', doc: 'One node of a binary tree' }];
const LAB_WORDS = NODE_WORDS.concat([{ label: 'linked', insert: 'linked(|)', kind: 'fn', sig: 'linked([1, 2, 3])', doc: 'Builds a linked list from a list' }, { label: 'tree', insert: 'tree(|)', kind: 'fn', sig: 'tree([1, 2, 3])', doc: 'Builds a binary tree, level by level' }]);
function keepCode() {                             // put what is in the editor where this kind of play keeps it
  if (!cur || !editor) return;
  if (play.mode === 'normal') { const s = st(cur.id); s.code = editor.value; s.t = Date.now(); }
  else if (play.mode === 'interview' && S.iv) S.iv.codes[cur.id] = editor.value;
}
function enter(lv, opts) {
  opts = opts || {};
  closeModal(); closeTrace(); Mentor.stop(); clearNote(); Tour.end();
  cur = lv;
  lastRes = null;
  play = { mode: opts.mode || 'normal', bug: opts.bug || null };
  const s = st(cur.id), z = zoneOf(cur), lab = cur.kind === 'sandbox', normal = play.mode === 'normal', iv = play.mode === 'interview' ? S.iv : null, hunt = play.mode === 'bug' ? play.bug : null;
  if (normal) { S.open = cur.id; if (!lab) S.last = cur.id; } else S.open = null;
  Sfx.play('open');
  setAccent(z.color);
  setMode('level');
  $('p-eyebrow').textContent = lab ? 'Scratchpad · ' + cur.concept : hunt ? 'Bug hunt · Floor ' + z.n + ' · ' + cur.concept : play.mode === 'review' ? 'Review · Floor ' + z.n + ' · ' + cur.concept
    : iv ? 'Interview · problem ' + (iv.at + 1) + ' of ' + iv.ids.length + ' · ' + cur.difficulty : 'Floor ' + z.n + ' · Level ' + cur.order + ' · ' + cur.concept;
  $('p-name').textContent = cur.title;
  $('btn-back').textContent = iv ? 'End' : '‹ Tower';
  document.querySelector('.tabs').hidden = !normal;
  $('tab-btn-lesson').textContent = lab ? 'About' : cur.kind === 'code' ? 'Briefing' : 'Lesson';
  $('tab-btn-solution').hidden = lab;
  toolsFor = null;
  $('tab-tools').innerHTML = '';
  if (normal) renderLesson(); else $('tab-lesson').innerHTML = '';
  { const nx = lab ? null : nextOf(cur); $('tab-btn-lesson').classList.toggle('dot', normal && !!nx && nx.kind === 'code' && s.solved && !s.brief); }
  $('task-body').innerHTML = (hunt ? '<p class="bugnote"><b>Bug hunt.</b> This is ' + (hunt.mine ? 'your own answer' : 'the model solution') + ' with one small thing changed. Find the line and repair it. <b>Run</b> shows which tests fail now. <b>Step through</b> shows where a value goes wrong.</p>' : '') +
    cur.task + (iv && cur.classic ? '<p class="mute">Known as: ' + esc(cur.classic) + '</p>' : '');
  hl($('task-body'));
  $('taskbox').open = true;
  $('taskbox').hidden = lab;
  const cmds = $('cmds');
  cmds.hidden = cur.kind !== 'robot';
  cmds.innerHTML = cur.kind === 'robot' ? '<span class="cmds-label">PIP understands</span>' + cur.commands.map(c => '<button type="button" class="cmd" data-cmd="' + esc(c) + '">' + esc(c) + '</button>').join('') : '';
  $('robot-ctl').hidden = cur.kind !== 'robot';
  $('iobox').hidden = !lab;
  if (lab) { $('lab-input').value = S.labIn || ''; $('iobox').open = !!S.labIn; }
  $('btn-trace').hidden = cur.kind === 'robot';
  $('btn-hint').hidden = lab || !normal;
  $('btn-mentor').hidden = !Mentor.ready || !normal;
  $('btn-forgot').hidden = play.mode !== 'review' && !hunt;
  $('btn-forgot').textContent = hunt ? 'Show the bug' : 'I forgot';
  editor.set(normal ? (s.code != null ? s.code : cur.starter) : hunt ? hunt.code : iv && iv.codes[cur.id] != null ? iv.codes[cur.id] : cur.starter);
  editor.setWords(cur.kind === 'robot' ? window.PylonComplete.robotWords(cur.commands) : lab ? LAB_WORDS : cur.zone >= 7 ? NODE_WORDS : []);
  $('results').innerHTML = '';
  $('mentor').hidden = true;
  $('stage-note').hidden = true;
  setStatus('');
  renderIvBar();
  renderHints(); renderSolution(); renderPanelStars(); updateLineCount();
  showTab(!normal || lab || cur.kind === 'code' || s.read || s.solved || s.tries ? 'code' : 'lesson');
  buildArena();
  Term.reset(cur);
  hush();
  greet(cur);
  Tour.maybe(cur);
  save();
}
function closeLevel(celebrate) {
  World.stop();
  Mentor.stop();
  closeTrace();
  clearNote();
  hush();
  Tour.end();
  clearInterval(ivTimer);
  keepCode();
  busy = animating = false;
  S.open = null;
  cur = null;
  play = { mode: 'normal' };
  $('robot-ctl').hidden = true;
  $('stage-note').hidden = true;
  $('scene-note').hidden = true;
  staged = null;
  $('iv-bar').hidden = true;
  $('app').classList.remove('watch');
  if (editor) editor.closeComplete();
  Sfx.play('back');
  setMode('hub');
  setAccent(zoneOf(LEVELS[hubSel] || LEVELS[0]).color);
  World.showHub(celebrate);
  World.select(hubSel, true);
  refreshProgress();
  save();
  // A save from the smaller tower that reopened straight into a level hears about the new floors on the way out.
  if (S.grew) setTimeout(() => { if (S.grew && mode === 'hub' && $('modal').hidden) showGrew(); }, 900);
}
function showTab(name) {
  for (const t of ['lesson', 'code', 'tools', 'solution']) {
    $('tab-' + t).hidden = t !== name;
    $('tab-btn-' + t).setAttribute('aria-selected', t === name ? 'true' : 'false');
  }
  const normal = !!cur && play.mode === 'normal';
  if (name === 'code' && normal) { const s = st(cur.id); if (!s.read) { s.read = true; save(); } }
  if (name === 'tools' && cur && toolsFor !== cur.id) { renderTools(); toolsFor = cur.id; }
  if (name === 'lesson' && normal && cur.kind !== 'sandbox') {
    const s = st(cur.id), next = nextOf(cur);
    // On a drone level the briefing sits below the level's own lesson, so opening the tab is not yet reading it.
    if (next && next.kind === 'code' && !s.brief && (cur.kind === 'code' || s.solved)) { s.brief = true; bump('briefs'); save(); checkBadges(); $('tab-btn-lesson').classList.remove('dot'); }
    else if (cur.kind === 'code' || s.brief) $('tab-btn-lesson').classList.remove('dot');
  }
  if (name === 'solution' && cur && cur.kind !== 'sandbox' && play.mode === 'normal') {
    const s = st(cur.id);
    if (s.solved && s.stars < 3 && !s.saw) { s.saw = true; save(); renderHints(); }     // reading it ends a clean attempt
    renderSolution();
  }
}
function renderPanelStars() { const s = cur && play.mode === 'normal' && S.levels[cur.id]; $('p-stars').innerHTML = s && s.solved ? starsHtml(s.stars) : ''; }
function setStatus(text, kind) { const e = $('run-status'); e.textContent = text; e.className = 'status' + (kind ? ' ' + kind : ''); }
function updateLineCount() {
  if (!cur || !cur.maxLines) { $('linecount').hidden = true; return; }
  const n = Runner.countLines(editor.value);
  $('linecount').hidden = false;
  $('linecount').textContent = n + ' / ' + cur.maxLines + ' lines';
  $('linecount').className = 'linecount' + (n > cur.maxLines ? ' over' : '');
}
// The line under the editor: a syntax problem found while typing, or a reminder of what a completed name does.
let noteTimer = 0, lintTimer = 0;
function clearNote() { clearTimeout(noteTimer); clearTimeout(lintTimer); const n = $('ed-note'); n.hidden = true; n.className = 'ed-note'; if (editor) editor.markWarn(null); }
function note(kind, label, html, ms) {
  clearTimeout(noteTimer);
  const n = $('ed-note');
  n.className = 'ed-note ' + kind;
  n.innerHTML = '<b>' + esc(label) + '</b><span>' + html + '</span>';
  n.hidden = false;
  if (ms) noteTimer = setTimeout(() => { if (n.classList.contains(kind)) n.hidden = true; }, ms);
}
function lintSoon() {
  clearTimeout(lintTimer);
  if ($('ed-note').classList.contains('warn')) { $('ed-note').hidden = true; $('ed-note').className = 'ed-note'; }
  lintTimer = setTimeout(() => {
    if (!cur || busy || trace || editor.completing) return;
    let e = null;
    try { e = Runner.syntaxError(editor.value); } catch (x) { e = null; }
    if (!e || !e.line) return;
    editor.markWarn(e.line);
    note('warn', 'Line ' + e.line, esc(e.message));
  }, 700);
}
function onPick(it) {                               // a completion was accepted: say what the thing does
  Sfx.play('pick');
  if (it.doc && (it.kind === 'fn' || it.kind === 'method' || it.kind === 'cmd' || it.kind === 'snip' || it.kind === 'value')) note('info', it.kindText || 'Help', (it.sig ? '<code>' + esc(it.sig) + '</code> ' : '') + esc(it.doc), 7000);
}
let codeTimer = 0;
function onCodeChange() {
  if (!cur) return;
  updateLineCount();
  if (trace) closeTrace();
  lintSoon();
  clearTimeout(codeTimer);
  codeTimer = setTimeout(() => { if (cur) { keepCode(); save(); } }, 700);
}
// ---------------------------------------------------------------- briefings, the Toolbox and craft marks
// A lesson is shown one level BEFORE the level it prepares, as a briefing. A level explains nothing about itself:
// the player already has the tools and has to choose among them.
const nextOf = lv => { const i = INDEX[lv.id]; return i === undefined ? null : LEVELS[i + 1] || null; };
const bitCount = n => { let c = 0; for (; n; n >>= 1) c += n & 1; return c; };
const noteHtml = text => esc(text).replace(/`([^`]+)`/g, '<code>$1</code>');
const sameCode = (a, b) => { const n = t => t.split('\n').map(l => l.replace(/\s+#.*$/, '').replace(/\s+$/, '')).filter(l => l.trim() && l.trim()[0] !== '#').join('\n'); return n(a) === n(b); };
const cardOut = new Map();
function cardBody(card) {
  if (!card.code) return '';
  if (!cardOut.has(card)) {
    let r = null;
    try { r = Runner.runFree(card.code, 300000, { stdin: card.stdin || '', files: card.files || {} }); } catch (e) { r = null; }
    cardOut.set(card, r && r.ok ? r.output.replace(/\s+$/, '') : '');
  }
  const out = cardOut.get(card);
  // what the example is given: the files that exist for it, and the lines its input() calls read
  const given = Object.keys(card.files || {}).map(name => '<div class="tc-out tc-in"><span>' + esc(name) + '</span><pre>' + esc(card.files[name].replace(/\n$/, '')) + '</pre></div>').join('') +
    (card.stdin ? '<div class="tc-out tc-in"><span>Input</span><pre>' + esc(card.stdin.replace(/\n$/, '')) + '</pre></div>' : '');
  return given + '<pre class="code">' + window.PylonHighlight(card.code) + '</pre>' + (out ? '<div class="tc-out"><span>Prints</span><pre>' + esc(out) + '</pre></div>' : '');
}
// One reference card. Closed, it shows the call and what it does; open, the example and what the example prints.
function cardHtml(n, open) {
  const card = ALL_CARDS[n].card, find = (card.name + ' ' + plain(card.what) + ' ' + (card.key || '') + ' ' + (card.also || []).join(' ')).toLowerCase();
  const head = '<code>' + esc(card.name) + '</code><span class="tc-what">' + card.what + '</span>';
  return '<div class="tcard' + (open ? ' open' : '') + (card.code ? '' : ' plain') + '" data-find="' + esc(find) + '">' +
    (card.code ? '<button type="button" class="tc-head" data-card="' + n + '" aria-expanded="' + (open ? 'true' : 'false') + '">' + head + '</button>' : '<div class="tc-head">' + head + '</div>') +
    '<div class="tc-body"' + (open && card.code ? '' : ' hidden') + '>' + (open ? cardBody(card) : '') + '</div></div>';
}
const cardsHtml = (lv, open, title) => (lv._cards && lv._cards.length ? '<h4 class="tools-h">' + title + '</h4><div class="tcards">' + lv._cards.map(n => cardHtml(n, open)).join('') + '</div>' : '');
function toggleCard(head) {
  const box = head.closest('.tcard'), body = box.querySelector('.tc-body'), open = body.hidden;
  if (open && !body.innerHTML) body.innerHTML = cardBody(ALL_CARDS[+head.dataset.card].card);
  body.hidden = !open;
  box.classList.toggle('open', open);
  head.setAttribute('aria-expanded', open ? 'true' : 'false');
}
function renderLesson() {
  const el = $('tab-lesson'), lab = cur.kind === 'sandbox', i = INDEX[cur.id], next = lab ? null : nextOf(cur), s = st(cur.id), teach = !!next && next.kind === 'code';
  let h = '<div class="chips">' + chips(cur) + '</div>';
  if (lab || cur.kind === 'robot') {
    h += cur.lesson + (lab ? '' : '<div class="taskcard"><h3>Your task</h3>' + cur.task + '</div>') + '<button type="button" class="btn primary" id="go-code">Open the editor</button>';
  } else {
    h += '<div class="now"><p><b>This level explains nothing about itself.</b> You were briefed for it one level ago, and every tool you have been shown is in <b>Tools</b>. Which of them the task needs is for you to work out.</p>' +
      '<div class="now-actions"><button type="button" class="btn primary" id="go-code">Open the editor</button><button type="button" class="btn" id="go-tools">Open Tools</button></div>' +
      '<details class="recap"><summary>Read the briefing for this level again</summary><div id="recap-body"></div></details></div>';
  }
  if (teach) {
    h += '<section class="brief" id="brief"><div class="eyebrow">Briefing for the next level</div><h3>' + esc(next.concept) + '</h3>' +
      '<p class="brief-why">Read this before you move on. “' + esc(next.title) + '” will need what is on this page, and it will not say which part.</p>' +
      '<div id="brief-body">' + next.lesson + '</div>' + cardsHtml(next, true, 'New in your Toolbox') +
      '<div class="now-actions"><button type="button" class="btn' + (s.solved ? ' primary' : '') + '" id="brief-next"' + (isUnlocked(i + 1) ? '' : ' disabled') + '>' + (isUnlocked(i + 1) ? 'Go to “' + esc(next.title) + '”' : 'Solve this level first') + '</button></div></section>';
  } else if (!lab && !next) h += '<section class="brief"><div class="eyebrow">Top of the tower</div><p>There is no next briefing. Everything this level needs, you have.</p></section>';
  el.innerHTML = h;
  hl(el);
  if (teach) addExamples($('brief-body'), next);
  const recap = el.querySelector('.recap');
  if (recap) recap.addEventListener('toggle', () => {
    if (!recap.open || recap.dataset.done) return;
    recap.dataset.done = '1';
    $('recap-body').innerHTML = cur.lesson + cardsHtml(cur, false, 'Its tools');
    hl($('recap-body'));
  });
}
// The last level whose cards the player has been shown: one past the level they are working on.
function reachIndex() {
  if (S.unlockAll) return LEVELS.length - 1;
  let far = -1;
  LEVELS.forEach((l, i) => { if (isSolved(i)) far = i; });
  const here = cur && INDEX[cur.id] !== undefined ? INDEX[cur.id] : 0;
  return Math.min(LEVELS.length - 1, Math.max(far + 1, here) + 1);
}
let toolsFor = null;
function renderTools() {
  const reach = reachIndex(), seen = new Set(), show = [];
  ALL_CARDS.forEach((entry, n) => {
    if (entry.at > reach) return;
    const key = entry.card.key;
    if (key) { if (seen.has(key)) return; seen.add(key); }
    show.push(n);
  });
  let groups = '';
  for (const z of ZONES.slice().reverse()) {
    const mine = show.filter(n => ALL_CARDS[n].lv.zone === z.n);
    if (mine.length) groups += '<section class="tools-floor"><h3 style="color:' + z.color + '">Floor ' + z.n + ' · ' + esc(z.name) + '<small>' + mine.length + '</small></h3><div class="tcards">' + mine.map(n => cardHtml(n, false)).join('') + '</div></section>';
  }
  $('tab-tools').innerHTML = '<div class="tools-top"><input type="search" id="tools-find" placeholder="Search: strip, sorted, slice, dict…" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Search your tools">' +
    '<span class="mute" id="tools-count">' + show.length + (show.length === 1 ? ' tool' : ' tools') + '</span></div>' +
    (show.length ? '<p class="mute tools-lead">Everything you have been briefed on so far, newest floor first. A level never says which of these it needs. Open a card for an example.</p>' + groups
      : '<p class="mute tools-lead">No cards yet. On this floor PIP understands the commands listed above the editor. Your first reference cards come with the briefing at the end of the Boot Deck.</p>') +
    '<p class="mute tools-none" hidden>Nothing matches. Try a shorter word.</p>';
}
function filterTools(query) {
  const q = query.trim().toLowerCase(), box = $('tab-tools');
  let shown = 0;
  box.querySelectorAll('.tcard').forEach(c => { const hit = !q || c.dataset.find.indexOf(q) >= 0; c.hidden = !hit; if (hit) shown++; });
  box.querySelectorAll('.tools-floor').forEach(sec => { sec.hidden = !sec.querySelector('.tcard:not([hidden])'); });
  const none = box.querySelector('.tools-none');
  if (none) none.hidden = shown > 0;
  if ($('tools-count')) $('tools-count').textContent = shown + (shown === 1 ? ' tool' : ' tools');
}
// Craft marks: a passing answer is also read for how it is written. Each mark is worth XP the first time a level earns it.
function reviewCraft(lv, code, res, how) {
  if (!Craft || lv.kind !== 'code' || !res.ok || res.error || how === 'interview' || how === 'bug') return;
  const r = Craft.review(code, lv);
  if (!r.ok) return;
  res.craft = r;
  res.craftOwn = !sameCode(code, lv.solution);
  if (how !== 'normal' || !res.craftOwn) return;
  const s = st(lv.id), had = s.craft || 0, now = had | r.bits;
  res.craftGain = bitCount(now & ~had) * Craft.XP_PER_MARK;
  s.craft = now;
  s.cx = (s.cx || 0) + res.craftGain;
}
const craftPips = bits => '<span class="pips" role="img" aria-label="' + bitCount(bits) + ' of 4 craft marks" title="Craft marks: ' + (Craft ? Craft.MARKS.map((m, k) => m.name + (bits & (1 << k) ? ' ✓' : ' –')).join(', ') : '') + '">' +
  [0, 1, 2, 3].map(k => '<i class="' + (bits & (1 << k) ? 'on' : '') + '"></i>').join('') + '</span>';
function craftHtml(res) {
  const r = res.craft;
  let h = '<div class="craft"><div class="craft-top"><span class="craft-t">Craft</span><span class="craft-n">' + r.earned + ' of ' + r.marks.length + ' marks</span>' + (res.craftGain ? '<b class="craft-xp">+' + res.craftGain + ' XP</b>' : '') + '</div><div class="craft-marks">' +
    r.marks.map(m => '<span class="mark' + (m.ok ? ' on' : '') + '" title="' + esc(m.tip) + '"><i aria-hidden="true">' + (m.ok ? '✓' : '○') + '</i>' + esc(m.name) + (m.id === 'concise' ? '<small>' + r.lines + ' lines, limit ' + r.budget + '</small>' : '') + '</span>').join('') + '</div>';
  const todo = r.marks.filter(m => !m.ok);
  if (!res.craftOwn) h += '<p class="mute">This is the model solution. Craft marks are for code you wrote yourself.</p>';
  else if (todo.length) {
    h += '<ul class="craft-notes">' + todo.map(m => m.notes.slice(0, 3).map(n => '<li><button type="button" class="linkbtn" data-craftline="' + n.line + '"' + (n.line ? '' : ' disabled') + '>' + esc(m.name) + (n.line ? ', line ' + n.line : '') + '</button><span>' + noteHtml(n.text) + '</span></li>').join('') +
      (m.notes.length > 3 ? '<li class="mute">and ' + (m.notes.length - 3) + ' more for ' + esc(m.name) + '</li>' : '')).join('') + '</ul><p class="mute">Polish it and run again. Each mark is worth ' + Craft.XP_PER_MARK + ' XP.</p>';
  } else h += '<p class="mute">All four marks. This is code you can hand to someone else.</p>';
  return h + CRAFT_HELP + '</div>';
}
const CRAFT_HELP = '<details class="craft-help"><summary>What the marks mean</summary><ul>' +
  '<li><b>Concise</b> No more lines than the model solution plus a small margin, and one statement per line. Comments and blank lines are free.</li>' +
  '<li><b>Clear names</b> Names say what they hold. One letter is fine only for counters, sizes and coordinates (<code>i j k n m x y z r c a b</code>). No placeholders such as <code>tmp</code>, no name that hides a built-in such as <code>sum</code> or <code>list</code>, and <code>lower_case_with_underscores</code>.</li>' +
  '<li><b>Pythonic</b> Python\'s own way of saying it: <code>if items:</code> instead of <code>len(items) == 0</code>, <code>is None</code>, <code>total += 1</code>, returning a condition directly, looping over items instead of positions, no bare <code>except:</code>, nothing set and never used.</li>' +
  '<li><b>Tidy</b> Four spaces per level, a space around <code>=</code> and comparisons and after commas, no brackets around conditions, and no leftover <code>print()</code>, <code>pass</code> or commented-out code.</li></ul></details>';
// Shown once to a player whose save is from a smaller tower: S.grew is 1 for the first tower (6 floors), 2 for the second (8).
function showGrew() {
  const again = S.grew === 2, added = LEVELS.filter(l => (again ? /^z9-/ : /^z[789]-/).test(l.id)).length;
  const archive = ZONES.find(z => z.name === 'Signal Archive'), where = archive ? 'floor ' + archive.n + ', the Signal Archive' : 'a new floor';
  modal('<div class="intro"><div class="eyebrow">The tower has grown' + (again ? ' again' : '') + '</div><h2>' + ZONES.length + ' floors, ' + LEVELS.length + ' levels</h2>' +
    (again
      ? '<p>Everything you solved is still solved, and your rank is kept. There are ' + added + ' new levels: one about <code>input()</code> on floor 2, and ' + where + ', about files and regular expressions. The floors above it moved up by one number.</p>' +
        '<p>The Scratchpad now has an <b>Input</b> box for programs that call <code>input()</code>, and your programs can read and write files.</p>'
      : '<p>Everything you solved is still solved, and your rank is kept. ' + added + ' new levels now stand among the ones you know: input, text tools, modules, error handling, debugging, files, regular expressions, recursion, inheritance, bit tricks, tries and more.</p>' +
        '<p><b>Lessons come one level early.</b> Each level now ends with the briefing for the next one, and a level no longer says which tools it needs. Everything you have been shown is in the new <b>Tools</b> tab.</p>' +
        '<p><b>Craft marks.</b> A passing answer can earn four more marks: concise, clear names, Pythonic and tidy. Each one is worth extra XP.</p>') +
    '<div class="done-actions"><button type="button" class="btn primary" data-focus id="grew-go">Show me the first new level</button><button type="button" class="btn ghost" id="grew-close">Later</button></div></div>',
  { onClose: () => { if (S.grew) { S.grew = false; save(); } } });
}

function renderHints() {
  if (!cur || play.mode !== 'normal') { $('hints').innerHTML = ''; return; }
  const s = st(cur.id), total = cur.hints.length, left = total - s.hints;
  const costs = left > 0 && !s.hints && !s.mentor && !s.saw && !s.solved;          // the first help on a level is what costs the third star
  $('btn-hint').textContent = left > 0 ? (costs ? 'Hint (−1 ★)' : 'Hint (' + left + ' left)') : 'No hints left';
  $('btn-hint').title = costs ? 'Solving with a hint earns two stars. A clean attempt later can still earn the third.' : '';
  $('btn-hint').disabled = left <= 0;
  let h = '';
  // Solved with help: a clean attempt is the way to the third star.
  if (s.solved && s.stars < 3 && (s.hints > 0 || s.saw || s.mentor)) h += '<div class="hint retry">You solved this one with help. <button type="button" class="linkbtn" id="retry-clean">Start a clean attempt for 3 stars</button></div>';
  for (let i = 0; i < s.hints && i < total; i++) h += '<div class="hint"><span class="hint-n">Hint ' + (i + 1) + '</span>' + cur.hints[i] + '</div>';
  $('hints').innerHTML = h;
}
// Back to the starting code with every kind of help switched off again.
function cleanAttempt() {
  if (!cur || cur.kind === 'sandbox' || play.mode !== 'normal') return;
  const s = st(cur.id);
  s.hints = 0; s.saw = false; s.mentor = false; s.fails = 0;
  closeTrace();
  editor.set(cur.starter);
  onCodeChange();
  $('results').innerHTML = ''; $('mentor').hidden = true;
  setStatus(''); lastRes = null;
  renderHints(); showTab('code'); buildArena(); save();
  toast('Clean attempt started. No hints, no mentor, no Solution tab.');
}
function renderSolution() {
  if (!cur || cur.kind === 'sandbox' || play.mode !== 'normal') return;
  const s = st(cur.id);
  if (s.solved || s.saw) {
    $('tab-solution').innerHTML = '<h3>Model solution</h3><pre class="code">' + window.PylonHighlight(cur.solution.replace(/\n+$/, '')) + '</pre>' + cur.explain +
      '<button type="button" class="btn" id="sol-load">Load it into the editor</button>';
  } else {
    $('tab-solution').innerHTML = '<h3>Solution locked</h3><p>Solve the level and the model solution opens here, with an explanation of why it works.</p>' +
      '<p>If you are stuck for good, you can reveal it now. The level will then award 1 star instead of 3.</p><button type="button" class="btn" id="sol-reveal">Reveal the solution</button>';
  }
  hl($('tab-solution'));
}

// ---------------------------------------------------------------- running code
const HELP = {
  SyntaxError: 'Python could not read this line. Look for a missing colon, bracket or quote on it, or on the line just above.',
  IndentationError: 'The spaces at the start of this line are not what Python expects. Lines inside a block need four more spaces than the line that opens the block.',
  TabError: 'This file mixes tabs and spaces. Use four spaces for every level of indentation.',
  NameError: 'Python does not know this name. Check the spelling, and make sure it is defined before this line runs.',
  UnboundLocalError: 'This variable is assigned somewhere inside the function, so Python treats it as local, but this line reads it before it has a value.',
  TypeError: 'A value has the wrong type for what this line does with it.',
  IndexError: 'The code asked for a position that does not exist. Positions start at 0 and the last one is len(...) - 1.',
  KeyError: 'That key is not in the dictionary. Test with "in" first, or use .get() with a default.',
  ValueError: 'The type is right, but this particular value is not acceptable here.',
  AttributeError: 'This object has no method or field with that name. Check the spelling and what kind of object it really is.',
  ZeroDivisionError: 'The code divided by zero. Check the divisor before dividing.',
  RecursionError: 'The function kept calling itself. Make sure every path reaches a base case that returns without another call.',
  StepLimit: 'The code ran for too long. A loop probably never ends: check that its condition can become False.',
  StopIteration: 'next() was called on an iterator that has no items left.',
  ModuleNotFoundError: 'That module is not part of Pylon.',
  AssertionError: 'An assert statement found its condition to be False.',
  InternalError: 'This is a bug in Pylon itself, not in your code. Try writing the line a different way.',
};
function errorCard(error, line, lead) {
  const where = line ? ' <span class="err-line">line ' + line + '</span>' : '';
  let help = error.hint || HELP[error.type] || '', src = '';
  // A syntax error is about one line of text: show that line, and name the slip when it is a common one.
  if (line && (error.type === 'SyntaxError' || error.type === 'IndentationError') && editor) {
    const text = (editor.value.split('\n')[line - 1] || '').replace(/\s+$/, '');
    if (text.trim()) src = '<pre class="err-src">' + esc(clip(text, 200)) + '</pre>';
    if (/\)\s*[A-Za-z_]\w*\s*\(/.test(text.replace(/#.*$/, '')) && !/\b(and|or|not|in|is|if|else|for)\b/.test(text)) help = 'Two commands are on this one line. Give each command a line of its own.';
  }
  return '<div class="errcard">' + (lead ? '<p class="err-lead">' + esc(lead) + '</p>' : '') + '<div class="err-title">' + esc(error.type === 'StepLimit' ? 'Ran too long' : error.type) + where + '</div>' +
    (error.type === 'StepLimit' ? '' : '<div class="err-msg">' + esc(error.message) + '</div>') + src + (help ? '<div class="err-help">' + esc(help) + '</div>' : '') + '</div>';
}
function testRow(t, brief, helped) {
  if (t.stdout) {
    const given = t.stdin ? '<span>Input</span><pre>' + esc(clip(t.stdin.replace(/\n$/, ''), 400)) + '</pre>' : '', step = t.stdin ? ' <button type="button" class="linkbtn" data-trace="' + t.index + '">Step through this run</button>' : '';
    if (t.ok) return '<li class="ok"><span class="t-mark">✓</span><div>The printed text matches exactly.' + (given ? '<div class="t-detail">' + given + '</div>' : '') + '</div></li>';
    if (t.error) return '<li class="bad"><span class="t-mark">✗</span><div>The program stopped with an error.<div class="t-detail">' + given + '<b>' + esc(t.error.type) + (t.errorLine ? ' on line ' + t.errorLine : '') + ':</b> ' + esc(t.error.message) + (t.error.hint ? ' <i>' + esc(t.error.hint) + '</i>' : '') + step + '</div></div></li>';
    return '<li class="bad"><span class="t-mark">✗</span><div>The printed text does not match.<div class="t-detail">' + given + '<span>Expected</span><pre>' + esc(t.expect) + '</pre><span>Your program printed</span><pre>' + (t.got ? esc(clip(t.got, 1200)) : '(nothing)') + '</pre>' + step + '</div></div></li>';
  }
  let meta = '', detail = '';
  if (t.perf && t.ok) meta = '<span class="t-meta">speed test · ' + num(t.steps) + ' of ' + num(t.budget) + ' steps</span>';
  else if (t.perf) meta = '<span class="t-meta">speed test</span>';
  if (!t.ok && !brief) {
    const firstOfKind = t.error && helped && !helped[t.error.type];
    if (t.error && helped) helped[t.error.type] = true;
    if (t.slow && t.perf) detail = 'Too slow. It was stopped after ' + num(t.budget) + ' steps. A fast solution needs about ' + num(t.refSteps) + '.';
    else if (t.slow) detail = 'It ran for too long and was stopped. A loop probably never ends.';
    else if (t.error && t.error.type === 'NameError' && !t.errorLine) detail = esc(t.error.message) + '. Your code has to define it with exactly that name.';
    else if (t.error) detail = '<b>' + esc(t.error.type) + (t.errorLine ? ' on line ' + t.errorLine : '') + ':</b> ' + esc(t.error.message) + (!firstOfKind ? '' : t.error.hint ? ' <i>' + esc(t.error.hint) + '</i>' : HELP[t.error.type] ? ' <i>' + esc(HELP[t.error.type]) + '</i>' : '');
    else detail = 'Expected <code>' + esc(t.expect) + '</code><br>Your code returned <code>' + esc(t.got) + '</code>';
  }
  // a test that hands the program files shows them when it fails, so the player can see what was read
  if (!t.ok && !brief && t.files) detail += Object.keys(t.files).slice(0, 3).map(name => '<details class="t-file"><summary>' + esc(name) + '</summary><pre>' + (t.files[name] ? esc(clip(t.files[name].replace(/\n$/, ''), 900)) : '(empty)') + '</pre></details>').join('');
  const stepBtn = !t.ok && !t.perf ? ' <button type="button" class="linkbtn" data-trace="' + t.index + '">Step through this test</button>' : '';
  return '<li class="' + (t.ok ? 'ok' : t.slow ? 'slow' : 'bad') + '"><span class="t-mark">' + (t.ok ? '✓' : t.slow ? '◷' : '✗') + '</span><div><code class="t-call">' + esc(t.show) + '</code>' + meta + (detail ? '<div class="t-detail">' + detail + stepBtn + '</div>' : '') + '</div></li>';
}
function outputBlock(text, always) {
  if (!(text && text.trim())) return always ? '<p class="mute">Nothing was printed. Use <code>print(...)</code> to see a value.</p>' : '';
  return '<details class="out" open><summary>Printed output</summary><pre>' + esc(clip(text, 5000)) + '</pre></details>';
}
function renderCodeResults(res) {
  let h = '', out = res.output || '';
  if (res.error) h += errorCard(res.error, res.errorLine, 'Your code stopped before the tests could run.');
  else {
    const n = res.tests.length, pass = res.tests.filter(t => t.ok).length, e0 = n > 1 && res.tests[0].error, helped = {};
    // When every test dies the same way, say it once instead of n times.
    const same = !!e0 && !res.tests[0].slow && res.tests.every(t => t.error && t.error.type === e0.type && t.error.message === e0.message && t.errorLine === res.tests[0].errorLine);
    h += '<div class="sum ' + (res.ok ? 'ok' : 'bad') + '">' + (res.ok ? (n === 1 ? 'Test passed' : 'All ' + n + ' tests passed') : pass + ' of ' + n + ' tests passed') + '</div>';
    if (same) h += e0.type === 'NameError' && !res.tests[0].errorLine ? '<div class="errcard"><div class="err-title">Function not found</div><div class="err-msg">' + esc(e0.message) + '</div><div class="err-help">The tests call it by exactly that name, so your code has to define it with the same spelling.</div></div>'
      : errorCard(e0, res.tests[0].errorLine, 'Every test stopped with the same error.');
    h += '<ol class="tests">' + res.tests.map(t => testRow(t, same, helped)).join('') + '</ol>';
    if (res.ok && res.craft) h += craftHtml(res);
    if (res.ok && res.refSteps > 0) h += '<p class="mute work">Work done: ' + num(res.steps) + ' steps. The model solution takes ' + num(res.refSteps) + '. <span title="A step is one small action of the interpreter: reading a variable, comparing two values, calling a function. Fewer steps means less work for the same answer.">A step is one small action, such as a comparison or a call.</span></p>';
    for (const t of res.tests) out += t.output || '';
  }
  $('results').innerHTML = h + (Terminal || res.tests.some(t => t.stdout) ? '' : outputBlock(out));          // the terminal shows what was printed
}
function renderRobotResults(res) {
  let h = '';
  const n = cur.maps.length, r = res.runs[res.runs.length - 1];
  if (res.tooLong) h = '<div class="sum bad">Too many lines</div><p>Your program has ' + res.lines + ' lines of code and this deck allows ' + cur.maxLines + '. Look for steps that repeat and put them in a loop.</p>';
  else if (res.ok) h = '<div class="sum ok">' + (n > 1 ? 'It works on all ' + n + ' decks' : cur.goal === 'shards' ? 'All shards collected' : 'Beacon reached') + '</div>';
  else if (r && r.error) h = errorCard(r.error, r.errorLine, n > 1 ? 'Deck ' + (r.map + 1) + ' of ' + n + '.' : '');
  else if (r) h = '<div class="sum bad">' + (r.crashed ? 'PIP stopped' : 'Not there yet') + '</div><p>' + esc(r.reason) + (r.errorLine ? ' Look at line ' + r.errorLine + '.' : '') + (n > 1 ? ' <span class="mute">Deck ' + (r.map + 1) + ' of ' + n + '.</span>' : '') + '</p>';
  $('results').innerHTML = h + (Terminal ? '' : outputBlock(res.output));
}
// What the Scratchpad hands a program: the lines typed into its Input box. Echo makes the output read like a terminal.
const labIo = () => ({ stdin: $('lab-input').value, files: {}, echo: true });
function renderLabResults(res) {
  const starved = res.error && res.error.type === 'EOFError';
  let h = (res.error ? errorCard(res.error, res.errorLine) : '<div class="sum ok">Ran in ' + num(res.steps) + ' steps</div>');
  if (starved) { $('iobox').open = true; h += '<p class="mute">Type the lines your program should read into the <b>Input</b> box under the editor, one line for each <code>input()</code> call, and run again.</p>'; }
  if (!Terminal) h += outputBlock(res.output, !res.error);
  else if (!res.error && !(res.output && res.output.trim())) h += '<p class="mute">Nothing was printed. Use <code>print(...)</code> to see a value, or type a name at the <code>&gt;&gt;&gt;</code> prompt.</p>';
  for (const pair of (res.files || []).slice(0, 4)) h += '<details class="out" open><summary>File · ' + esc(pair[0]) + '</summary><pre>' + (pair[1] ? esc(clip(pair[1], 3000)) : '(empty)') + '</pre></details>';
  $('results').innerHTML = h;
}
const nextPaint = () => new Promise(r => { let done = false; const go = () => { if (!done) { done = true; r(); } }; requestAnimationFrame(() => setTimeout(go, 0)); setTimeout(go, 120); });
async function run() {
  if (!cur) return;
  if (busy) { if (animating) { replaying = false; skipShow = true; World.stop(); } return; }
  skipShow = false;
  busy = true;
  closeTrace();
  clearNote();
  editor.closeComplete();
  const lv = cur, code = editor.value, s = st(lv.id), how = play.mode;
  keepCode();
  if (how === 'normal') s.tries++;
  editor.markError(null); editor.markActive(null);
  if (coarse && document.activeElement === editor.el) editor.el.blur();          // put the phone keyboard away so the result is visible
  showTab('code');
  $('taskbox').open = false;          // make room for the results; the task is one click away
  $('btn-run').classList.add('busy');
  setStatus('Running…');
  $('results').innerHTML = '';          // the last run's verdict must not sit there while this one plays
  await nextPaint();
  let res;
  if (lv.kind === 'sandbox') { S.labIn = $('lab-input').value; if (/\binput\s*\(/.test(code)) $('iobox').open = true; }
  try { res = Runner.run(lv, code, lv.kind === 'sandbox' ? { io: labIo() } : undefined); }
  catch (e) { res = { kind: lv.kind, ok: false, error: { type: 'InternalError', message: String((e && e.message) || e), trace: [] }, errorLine: null, tests: [], runs: [], output: '' }; }
  if (cur !== lv) { busy = false; return; }
  lastRes = res;
  animating = true;
  $('btn-run').firstChild.textContent = 'Skip ';
  if (lv.kind === 'robot') {
    $('app').classList.add('watch');
    if (!res.tooLong && res.runs) {
      for (const r of res.runs) {
        if (cur !== lv) break;
        if (lv.maps.length > 1) { $('stage-note').hidden = false; $('stage-note').textContent = 'Deck ' + (r.map + 1) + ' of ' + lv.maps.length; }
        if (shownMap !== r.map) { World.showRobot(r.world, zoneOf(lv).color); shownMap = r.map; }
        if (r.error && !r.actions.length) break;
        const done = await World.playRobot(r, { speed: S.speed, onLine: l => editor.markActive(l && l < Runner.FILE ? l : null) });
        if (!done) break;
      }
    }
    $('app').classList.remove('watch');
  } else if (lv.kind === 'sandbox') {
    await replayRun(lv, code);
    World.mood(res.ok ? 'happy' : 'sad');
    Sfx.play(res.ok ? 'tick' : 'fail');
    bump('lab');
  } else if (staged) {
    // The scene acts out one test: the first that fails, or the one that was standing there. Then the footlights give
    // the verdict on all of them.
    const states = res.error ? [] : res.tests.map(t => t.ok ? 'pass' : t.slow ? 'slow' : 'fail');
    const i = states.length ? Scenes.choose(lv, res.tests) : staged.test, result = states.length ? res.tests[i] : { ok: false, error: res.error, errorLine: res.errorLine };
    let told = null;
    const note = (t, s) => { told = s; caption(t, s); };
    const beats = Scenes.act(stageScene(lv, i, true), result);
    let shown = false;
    if (S.replay !== false && how !== 'interview') shown = await World.playScene(beats, { speed: Math.min(2, S.speed || 1), note });
    if (cur === lv && !shown) { stageScene(lv, i, true); told = null; await World.playScene(beats, { instant: true, note }); }       // skipped, or switched off: how it ends, without the play
    if (cur === lv) {
      if (states.length) await World.lightTests(states, !shown);
      const n = states.length;
      if (res.ok) { if (told !== 'ok') caption(n === 1 ? 'That is right.' : 'That is right, and so are the other ' + (n - 1) + ' tests.', 'ok'); }
      else if (result.ok) { World.mood('sad'); caption(states.indexOf('slow') >= 0 ? 'The answers are right, but the code is too slow for the speed test.' : 'This test passes. Another one does not: the list under the editor shows which.', 'bad'); }
      else if (told !== 'bad') caption(n ? 'Test ' + (i + 1) + ' does not pass. The list under the editor shows what came back.' : 'Your code stopped before the tests could run.', 'bad');
    }
  } else {
    const states = res.error ? [] : res.tests.map(t => t.ok ? 'pass' : t.slow ? 'slow' : 'fail');
    if (states.length) await replayRun(lv, code);
    if (states.length && cur === lv) {
      const shown = await World.playTests(states, { instant: skipShow });
      if (!shown && cur === lv) World.playTests(states, { instant: true });      // skipped in the middle of the show: the crystals still give the verdict
    } else { World.resetTests(); World.mood('sad'); Sfx.play('fail'); }
  }
  animating = false;
  $('btn-run').firstChild.textContent = 'Run ';
  $('btn-run').classList.remove('busy');
  if (cur !== lv) { busy = false; return; }
  editor.markActive(null);
  reviewCraft(lv, code, res, how);
  if (lv.kind === 'robot') renderRobotResults(res); else if (lv.kind === 'sandbox') renderLabResults(res); else renderCodeResults(res);
  Term.show(lv, res, code);
  const errLine = lv.kind === 'robot' ? (res.runs.length && !res.ok ? res.runs[res.runs.length - 1].errorLine : null) : (res.errorLine || ((res.tests.find(t => !t.ok && t.errorLine) || {}).errorLine) || null);
  if (errLine) editor.markError(errLine);
  busy = false;
  if (lv.kind === 'sandbox') { setStatus(res.ok ? 'Done' : 'Error', res.ok ? 'ok' : 'bad'); save(); checkBadges(); return; }
  setStatus(res.ok ? 'Solved' : 'Not yet', res.ok ? 'ok' : 'bad');
  Music.cue(res.ok ? 'pass' : 'fail');
  if (how === 'interview') { ivAfterRun(lv, res); return; }
  if (how === 'bug') { bugAfterRun(lv, res); return; }
  if (how === 'review') { if (res.ok) reviewDone(lv, true, res); else haptic(60); return; }
  if (!res.ok) {
    s.fails = (s.fails || 0) + 1;
    haptic(60);
    consol(lv, res, s.fails);
    // The first time a test fails, point at the tool that explains why.
    if (lv.kind === 'code' && !res.error && !S.tipTrace && !S.counters.traces) { S.tipTrace = true; setTimeout(() => toast('Tip: “Step through” replays a test one line at a time and draws your data.'), 600); }
    save();
    return;
  }
  if (res.tests && res.tests.some(t => t.perf && t.ok)) bump('speed');
  if ((s.fails || 0) >= 5 && !s.solved) bump('persist');
  solved(lv, res);
}
function solved(lv, res) {
  const litBefore = floorDone(zoneOf(lv).n);
  hush();
  const s = st(lv.id), stars = s.saw ? 1 : (s.hints > 0 || s.mentor) ? 2 : 3, xp = xpFor(lv, stars), before = rankIndex(), first = !s.solved;
  const gain = Math.max(0, xp - (s.solved ? s.xp : 0)), best = Math.max(s.stars, stars);
  // Efficiency: interpreter steps over all tests, next to the model solution's.
  let eff = null;
  if (lv.kind === 'code' && res.refSteps > 0 && res.steps > 0) { eff = res.steps / res.refSteps; if (eff <= 1.3) s.lean = true; }
  s.solved = true; s.stars = best; s.xp = Math.max(s.xp, xp); s.t = Date.now();
  if (lv.kind === 'code' && !s.rv) s.rv = { box: 0, due: dayPlus(1) };              // it comes back tomorrow for its first review
  markDay();
  save();
  haptic([20, 40, 20]);
  renderPanelStars(); renderSolution(); renderHints();
  toolsFor = null;
  if (play.mode === 'normal' && cur === lv) { const nx = nextOf(lv); renderLesson(); $('tab-btn-lesson').classList.toggle('dot', !!nx && nx.kind === 'code' && !s.brief); }
  const after = rankIndex(), i = INDEX[lv.id];
  if (after > before) applyPaint();                // a paint that was waiting for this rank goes on now
  World.setProgress(progressList(), nextIndex());
  Music.apply();                                   // a solved level can bring a new layer of the score in
  if (!litBefore && floorDone(zoneOf(lv).n)) Music.cue('rank');
  checkBadges();
  setTimeout(() => {
    if (cur !== lv) return;
    const promoted = after > before, last = i === LEVELS.length - 1, z = zoneOf(lv);
    const done = floorDone(z.n);
    Sfx.play(promoted ? 'rank' : 'star');
    let h = '<div class="done"><div class="eyebrow">' + (done && first ? 'Floor ' + z.n + ' is back online' : lv.boss ? 'Floor boss cleared' : 'Level complete') + '</div><h2>' + esc(lv.title) + '</h2>' +
      '<div class="done-stars">' + starsHtml(stars) + '</div><p class="done-why">' + (stars === 3 ? 'Solved without help.' : stars === 2 ? 'Solved with a hint. A clean attempt with no help earns the third star.' : 'Solved after seeing the solution. A clean attempt with no help earns all three stars.') +
      (gain ? ' <b>+' + gain + ' XP</b>' : '') + '</p>';
    if (eff !== null) {
      h += '<p class="eff"><span>Efficiency</span> ' + (eff < 0.9 ? 'Your code does less work than the model solution.' : eff <= 1.3 ? 'Your code does about as much work as the model solution.' :
        'Your code takes about ' + (eff < 10 ? eff.toFixed(1) : Math.round(eff)) + ' times the steps of the model solution.' + (eff > 4 ? ' The Solution tab shows a leaner way.' : '')) + '</p>';
    }
    if (res.craft) h += '<p class="eff"><span>Craft</span> ' + (res.craftOwn ? res.craft.earned + ' of 4 marks' + (res.craftGain ? ' <b>+' + res.craftGain + ' XP</b>' : '') + '. ' +
      (res.craft.earned < 4 ? 'Still open: ' + res.craft.marks.filter(m => !m.ok).map(m => m.name).join(', ') + '. The notes under your tests say what to change.' : 'This is code you can hand to someone else.') : 'Craft marks are for code you wrote yourself.') + '</p>';
    if (first && lv.kind === 'code') h += '<p class="eff"><span>Review</span> This level comes back tomorrow, to be written again from memory.</p>';
    const sk = streak();
    if (sk >= 2) h += '<p class="eff"><span>Streak</span> ' + sk + ' days in a row.</p>';
    const justLit = done && !litBefore, summit = justLit && ZONES.every(f => floorDone(f.n));
    if (justLit) h += logHtml(z.n - 1, z.color);
    else h += pipLine(pickLine(stars < 3 ? Story.LINES.help : res.craft && res.craftOwn && res.craft.earned === 4 ? Story.LINES.clean : Story.LINES.pass, i + (s.tries || 0)));
    if (promoted) h += '<div class="promo" style="--zc:' + z.color + '"><span>Promotion</span><strong>' + esc(RANKS[after]) + '</strong>' + (ZONES[after] && zoneLevels(ZONES[after].n).length ? '<em>Floor ' + ZONES[after].n + ', ' + esc(ZONES[after].name) + ', is now open.</em>' : '<em>The whole Pylon is online. There is nothing left to fix here.</em>') + '</div>';
    const nx = nextOf(lv), briefFirst = !!nx && nx.kind === 'code' && !s.brief;
    h += '<div class="done-actions">' + (summit ? '<button type="button" class="btn primary" data-focus id="done-ending">Light the beacon</button>' : briefFirst ? '<button type="button" class="btn primary" data-focus id="done-brief">Briefing for the next level</button>' : '') +
      (last ? '' : '<button type="button" class="btn' + (briefFirst ? '"' : ' primary" data-focus') + ' id="done-next">Next level</button>') +
      '<button type="button" class="btn" id="done-solution">Read the model solution</button>' + (best < 3 ? '<button type="button" class="btn" id="done-retry">Clean attempt for 3 stars</button>' : '') +
      '<button type="button" class="btn ghost" id="done-tower">Back to the tower</button></div></div>';
    modal(h);
  }, 700);
}

// What the 3D arena shows for one step of a run: the same reading of the data as the panel under the editor, as plain rows
// of cells. Three rows at most: the ones that just changed, then the ones something points into.
function worldRows(s, prev, rel) {
  const viz = s.viz || [], old = prev && prev.fn === s.fn && prev.depth === s.depth ? new Map((prev.viz || []).map(v => [v.n, v])) : null;
  const nums = viz.filter(v => v.k === 'num'), numOf = n => { const x = nums.find(v => v.n === n); return x ? x.v : null; };
  const rows = [];
  for (const v of viz) {
    const o = old && old.get(v.n), was = o && o.k === v.k ? o : null;
    if (v.k === 'seq') {
      const ptr = nums.filter(p => rel.rel.has(p.n + '>' + v.n) && p.v >= 0 && p.v <= v.len);
      if (v.t === 'str' && !ptr.length) continue;
      if (!v.len) { rows.push({ name: v.n, kind: 'seq', cells: [{ t: 'empty', ghost: true, at: [] }], more: 0 }); continue; }
      const shown = v.items.slice(0, 12), cells = shown.map((t, i) => ({ t, i: String(i), at: ptr.filter(p => p.v === i).map(p => p.n), chg: !!was && (i >= was.items.length || was.items[i] !== t) }));
      const end = v.len <= 12 ? ptr.filter(p => p.v === v.len).map(p => p.n) : [];
      if (end.length) cells.push({ t: '', i: String(v.len), at: end, ghost: true });
      rows.push({ name: v.n, kind: 'seq', cells, more: Math.max(0, v.len - shown.length) });
    } else if (v.k === 'grid') {
      if (v.h > 7 || v.w > 11) continue;
      const hits = rel.grid.filter(x => x.g === v.n).map(x => [numOf(x.r), numOf(x.c)]), cells = [];
      v.rows.forEach((line, i) => line.forEach((t, j) => cells.push({ t, at: hits.some(p => p[0] === i && p[1] === j) ? ['here'] : [], chg: !!was && !!was.rows[i] && was.rows[i][j] !== undefined && was.rows[i][j] !== t })));
      rows.push({ name: v.n, kind: 'grid', w: v.w, cells, more: 0 });
    } else if (v.k === 'map') {
      const before = was ? new Map(was.entries) : null, shown = v.entries.slice(0, 9);
      rows.push({ name: v.n, kind: 'map', cells: shown.length ? shown.map(e => ({ k: e[0], t: e[1], at: [], chg: !!before && before.get(e[0]) !== e[1] })) : [{ t: 'empty', ghost: true, at: [] }], more: Math.max(0, v.len - shown.length) });
    } else if (v.k === 'set') {
      const before = was ? new Set(was.items) : null, shown = v.items.slice(0, 10);
      rows.push({ name: v.n, kind: 'set', cells: shown.length ? shown.map(t => ({ t, at: [], chg: !!before && !before.has(t) })) : [{ t: 'empty', ghost: true, at: [] }], more: Math.max(0, v.len - shown.length) });
    }
  }
  // linked lists: every chain a variable can reach, with the variables hovering over the node they hold
  const held = viz.filter(v => v.k === 'node'), N = s.nodes || {}, ids = Object.keys(N).map(Number);
  if (held.length && ids.length) {
    const pointed = new Set(ids.map(id => N[id].next).filter(x => x !== null)), done = new Set(), was = prev && prev.nodes ? prev.nodes : null;
    let first = true;
    for (const start of ids.filter(id => !pointed.has(id)).concat(ids)) {
      if (done.has(start)) continue;
      const cells = [];
      let id = start;
      while (id !== null && N[id] && !done.has(id) && cells.length < 8) {
        done.add(id);
        const o = was && was[id];
        cells.push({ t: N[id].v, at: held.filter(v => v.id === id).map(v => v.n), chg: !!o && (o.next !== N[id].next || o.v !== N[id].v) });
        id = N[id].next;
      }
      if (cells.length) rows.push({ name: first ? 'nodes' : '', kind: 'chain', cells, tail: id === null ? 'None' : '…', more: 0 });
      first = false;
    }
  }
  if (rows.length <= 3) return rows;
  const score = r => (r.cells.some(c => c.chg) ? 2 : 0) + (r.cells.some(c => c.at && c.at.length) ? 1 : 0);
  const keep = new Set(rows.map((r, k) => [score(r), -k, r]).sort((a, b) => b[0] - a[0] || b[1] - a[1]).slice(0, 3).map(x => x[2]));
  return rows.filter(r => keep.has(r));
}
// Before the verdict, the first test is played back in the arena, so that a run is something to watch.
let replaying = false, skipShow = false;
async function replayRun(lv, code) {
  if (S.replay === false || !RealWorld.ok || play.mode === 'interview') return;
  const lab = lv.kind === 'sandbox', pick = lab ? 0 : Math.max(0, lv.tests.findIndex(t => !t.perf));
  let t;
  try { t = Runner.traceRun(lv, code, pick, lab ? labIo() : undefined); } catch (e) { return; }
  const steps = t.steps.slice(t.start || 0), rel = relations(code), frames = [];
  let lastKey = '';
  steps.forEach((s, k) => {
    const rows = worldRows(s, k ? steps[k - 1] : null, rel);
    if (!rows.length) return;
    const key = JSON.stringify(rows.map(r => [r.name, r.cells.map(c => [c.t, c.k, c.at])]));
    if (key !== lastKey) { frames.push({ line: s.end ? null : s.line, rows }); lastKey = key; }
  });
  if (frames.length < 2) return;
  const stride = Math.ceil(frames.length / 36), shown = Math.ceil(frames.length / stride), ms = Math.max(45, Math.min(110, 1800 / shown));
  $('stage-note').hidden = false;
  $('stage-note').textContent = lab ? 'Replay' : 'Replay · test ' + (pick + 1);
  replaying = true;
  for (let k = 0; k < frames.length && replaying && cur === lv; k += stride) {
    World.showData(frames[k].rows);
    editor.markActive(frames[k].line);
    await new Promise(r => setTimeout(r, ms));
  }
  if (cur === lv) {
    if (replaying) { World.showData(frames[frames.length - 1].rows); await new Promise(r => setTimeout(r, 300)); }       // a last look at where the data ended up
    if (cur === lv) { World.clearData(); editor.markActive(null); $('stage-note').hidden = true; }
  }
  replaying = false;
}

// ---------------------------------------------------------------- step-by-step tracer
let trace = null, traceI = 0, tracePlay = 0, traceTest = 0, traceRel = { rel: new Set(), grid: [] };
function closeTrace() {
  clearInterval(tracePlay); tracePlay = 0;
  if (!trace) return;
  trace = null;
  World.clearData();
  $('trace').hidden = true; $('trace').innerHTML = '';
  $('tab-code').classList.remove('tracing');
  $('btn-trace').setAttribute('aria-pressed', 'false');
  $('results').hidden = false; $('hints').hidden = false;
  if (editor) editor.markActive(null);
}
// Which whole-number variables are positions in which sequences? Read it off the code: nums[i] makes i a pointer into nums.
function relations(code) {
  const src = code.replace(/#[^\n]*/g, ''), rel = new Set(), grid = [];
  let m;
  const one = /([A-Za-z_][\w.]*)\s*\[([^\[\]]*)\]/g, two = /([A-Za-z_][\w.]*)\s*\[\s*([A-Za-z_]\w*)[^\[\]]*\]\s*\[\s*([A-Za-z_]\w*)[^\[\]]*\]/g;
  const en = /for\s+([A-Za-z_]\w*)\s*,[^:\n]*?\sin\s+enumerate\(\s*([A-Za-z_][\w.]*)/g, rg = /for\s+([A-Za-z_]\w*)\s+in\s+range\(\s*(?:[^,()\n]*,\s*)?len\(\s*([A-Za-z_][\w.]*)\s*\)/g;
  while ((m = one.exec(src))) for (const id of (m[2].match(/[A-Za-z_]\w*/g) || [])) rel.add(id + '>' + m[1]);
  while ((m = two.exec(src))) grid.push({ g: m[1], r: m[2], c: m[3] });
  while ((m = en.exec(src))) rel.add(m[1] + '>' + m[2]);
  while ((m = rg.exec(src))) rel.add(m[1] + '>' + m[2]);
  return { rel, grid };
}
function startTrace(testIndex) {
  if (!cur || cur.kind === 'robot' || busy) return;
  clearInterval(tracePlay); tracePlay = 0;
  clearNote();
  editor.closeComplete();
  if (testIndex !== undefined) traceTest = testIndex;
  else if (lastRes && lastRes.tests) { const f = lastRes.tests.find(t => !t.ok && !t.perf); traceTest = f ? f.index : 0; }
  else traceTest = 0;
  editor.markError(null);
  if (coarse && document.activeElement === editor.el) editor.el.blur();
  let t;
  try { t = Runner.traceRun(cur, editor.value, traceTest, cur.kind === 'sandbox' ? labIo() : undefined); }
  catch (e) { t = { ok: false, steps: [], start: 0, truncated: false, label: '', result: null, expect: null, output: '', errorLine: null, error: { type: 'InternalError', message: String((e && e.message) || e) } }; }
  trace = t; traceI = t.start < t.steps.length ? t.start || 0 : 0;
  traceRel = relations(editor.value);
  bump('traces');
  showTab('code');
  $('taskbox').open = false;
  $('results').hidden = true; $('hints').hidden = true; $('mentor').hidden = true;
  const tests = cur.kind === 'code' && cur.tests.length > 1 && cur.tests[0].stdout === undefined ? cur.tests : null;
  const pick = tests ? '<label class="tr-pick">Test <select id="tr-test">' + tests.map((x, i) => '<option value="' + i + '"' + (i === traceTest ? ' selected' : '') + '>' + (i + 1) + (x.perf ? ' (speed)' : '') + '</option>').join('') + '</select></label>' : '';
  $('trace').hidden = false;
  $('trace').innerHTML = '<div class="tr-head"><strong>Step through</strong>' + pick + '<code class="tr-label">' + esc(t.label) + '</code><button type="button" class="btn ghost" id="tr-close">Close</button></div>' +
    (t.steps.length ? '<div class="tr-ctl"><button type="button" class="btn" id="tr-first" aria-label="First step">⏮</button><button type="button" class="btn" id="tr-prev" aria-label="Previous step">◀</button>' +
      '<button type="button" class="btn primary" id="tr-play">Play</button><button type="button" class="btn" id="tr-next" aria-label="Next step">▶</button><button type="button" class="btn" id="tr-last" aria-label="Last step">⏭</button>' +
      '<input type="range" id="tr-slider" min="0" max="' + (t.steps.length - 1) + '" value="0" aria-label="Step"><span id="tr-pos"></span></div>' : '') +
    '<div id="tr-where"></div><div class="tr-stack" id="tr-stack" hidden></div><div id="tr-viz"></div><div id="tr-vars"></div><div id="tr-end"></div><pre id="tr-out" hidden></pre>' +
    (t.truncated ? '<p class="mute">Only the first ' + t.steps.length + ' steps are recorded.</p>' : '');
  $('tab-code').classList.add('tracing');
  $('btn-trace').setAttribute('aria-pressed', 'true');
  renderTraceStep();
  save();
  checkBadges();
}
// The picture of one step: lists as rows of cells with the variables that point into them, dictionaries as pairs,
// linked lists as chains of nodes. Whatever changed since the step before is lit. Returns [html, names that were drawn].
function vizHtml(s, prev) {
  const viz = s.viz || [], drawn = new Set(), old = prev && prev.fn === s.fn && prev.depth === s.depth ? new Map((prev.viz || []).map(v => [v.n, v])) : null;
  const nums = viz.filter(v => v.k === 'num'), numOf = n => { const x = nums.find(v => v.n === n); return x ? x.v : null; };
  const row = (name, body, kind) => '<div class="vz"><span class="vz-name">' + esc(name) + (kind ? '<small>' + kind + '</small>' : '') + '</span>' + body + '</div>';
  const tags = list => list.map(p => '<u>' + esc(p.n) + '</u>').join('');
  let h = '';
  for (const v of viz) {
    const o = old && old.get(v.n), was = o && o.k === v.k ? o : null;
    if (v.k === 'seq') {
      const ptr = nums.filter(p => traceRel.rel.has(p.n + '>' + v.n) && p.v >= 0 && p.v <= v.len);
      if (v.t === 'str' && !ptr.length) continue;              // plain text stays in the table unless something points into it
      drawn.add(v.n);
      if (!v.len) { h += row(v.n, '<span class="vz-more">empty</span>', v.t === 'list' ? '' : v.t); continue; }
      let cells = '';
      v.items.forEach((t, i) => {
        const at = ptr.filter(p => p.v === i), chg = was && (i >= was.items.length || was.items[i] !== t);
        cells += '<div class="vz-cell' + (at.length ? ' at' : '') + (chg ? ' chg' : '') + '"><b>' + esc(t) + '</b><i>' + i + '</i>' + tags(at) + '</div>';
      });
      const end = v.len === v.items.length ? ptr.filter(p => p.v === v.len) : [];
      if (end.length) cells += '<div class="vz-cell"><b class="ghost"></b><i>' + v.len + '</i>' + tags(end) + '</div>';
      if (v.len > v.items.length) cells += '<span class="vz-more">… ' + (v.len - v.items.length) + ' more</span>';
      h += row(v.n, '<div class="vz-cells">' + cells + '</div>', v.t === 'list' ? '' : v.t);
    } else if (v.k === 'grid') {
      drawn.add(v.n);
      const hits = traceRel.grid.filter(x => x.g === v.n).map(x => [numOf(x.r), numOf(x.c)]);
      h += row(v.n, '<div class="vz-grid" style="grid-template-columns:repeat(' + v.w + ',max-content)">' + v.rows.map((r, i) => r.map((t, j) => {
        const at = hits.some(p => p[0] === i && p[1] === j), chg = was && was.rows[i] && was.rows[i][j] !== undefined && was.rows[i][j] !== t;
        return '<div class="vz-cell' + (at ? ' at' : '') + (chg ? ' chg' : '') + '"><b>' + esc(t) + '</b></div>';
      }).join('')).join('') + '</div>', v.h + ' × ' + v.w);
    } else if (v.k === 'map') {
      drawn.add(v.n);
      const before = was ? new Map(was.entries) : null;
      h += row(v.n, v.len ? '<div class="vz-pairs">' + v.entries.map(e => '<span class="vz-pair' + (before && before.get(e[0]) !== e[1] ? ' chg' : '') + '"><span>' + esc(e[0]) + '</span><em>' + esc(e[1]) + '</em></span>').join('') +
        (v.len > v.entries.length ? '<span class="vz-more">… ' + (v.len - v.entries.length) + ' more</span>' : '') + '</div>' : '<span class="vz-more">empty</span>', 'dict');
    } else if (v.k === 'set') {
      drawn.add(v.n);
      const before = was ? new Set(was.items) : null;
      h += row(v.n, v.len ? '<div class="vz-pairs">' + v.items.map(t => '<span class="vz-pair' + (before && !before.has(t) ? ' chg' : '') + '"><em>' + esc(t) + '</em></span>').join('') +
        (v.len > v.items.length ? '<span class="vz-more">… ' + (v.len - v.items.length) + ' more</span>' : '') + '</div>' : '<span class="vz-more">empty</span>', 'set');
    }
  }
  // linked lists: every chain that some variable can reach, with the variables written above the node they hold
  const held = viz.filter(v => v.k === 'node'), N = s.nodes || {}, ids = Object.keys(N).map(Number);
  if (held.length && ids.length) {
    const pointed = new Set(ids.map(id => N[id].next).filter(x => x !== null)), done = new Set(), was = prev && prev.nodes ? prev.nodes : null;
    let first = true;
    for (const start of ids.filter(id => !pointed.has(id)).concat(ids)) {
      if (done.has(start)) continue;
      let id = start, body = '', n = 0;
      while (id !== null && N[id] && !done.has(id) && n++ < 16) {
        done.add(id);
        const names = held.filter(v => v.id === id), o = was && was[id], chg = o && (o.next !== N[id].next || o.v !== N[id].v);
        body += '<div class="vz-node' + (names.length ? ' at' : '') + (chg ? ' chg' : '') + '"><u>' + esc(names.map(v => v.n).join(', ')) + '</u><b>' + esc(N[id].v) + '</b></div><span class="vz-arrow">→</span>';
        id = N[id].next;
      }
      body += '<span class="vz-arrow">' + (id === null ? 'None' : N[id] ? 'back to ' + esc(N[id].v) : '…') + '</span>';
      h += row(first ? 'nodes' : '', '<div class="vz-chain">' + body + '</div>');
      first = false;
    }
    held.forEach(v => drawn.add(v.n));
  }
  return [h, drawn];
}
function renderTraceStep() {
  if (!trace) return;
  const steps = trace.steps, n = steps.length;
  if (!n) {
    $('tr-where').textContent = 'No line of your code ran.';
    $('tr-end').innerHTML = trace.error ? errorCard(trace.error, trace.errorLine) : '';
    return;
  }
  traceI = Math.max(0, Math.min(n - 1, traceI));
  const s = steps[traceI], prev = traceI > 0 ? steps[traceI - 1] : null, atEnd = traceI === n - 1;
  $('tr-slider').value = traceI;
  $('tr-pos').textContent = (traceI + 1) + ' / ' + n;
  $('tr-where').innerHTML = s.end ? '<b>The program finished.</b> These are the final values.'
    : '<b>Line ' + s.line + '</b> in ' + esc(s.fn) + (s.ret !== null ? ' · returns <code>' + esc(s.ret) + '</code>' : ' · about to run');
  // who called whom: worth showing once a function has called another, or itself
  const stack = s.stack || [];
  $('tr-stack').hidden = stack.length < 2;
  if (stack.length >= 2) $('tr-stack').innerHTML = 'Call stack, ' + stack.length + ' deep: ' + (stack.length > 5 ? '… › ' : '') + stack.slice(-5).map(f => '<b>' + esc(f) + '</b>').join(' › ');
  const pic = vizHtml(s, prev), old = prev && prev.fn === s.fn && prev.depth === s.depth ? new Map(prev.vars) : null;
  $('tr-viz').innerHTML = pic[0];
  $('tr-viz').hidden = !pic[0];
  const rest = s.vars.filter(v => !pic[1].has(v[0]));
  $('tr-vars').innerHTML = rest.length ? '<table><tbody>' + rest.map(v => {
    const changed = old && (!old.has(v[0]) || old.get(v[0]) !== v[1]);
    return '<tr class="' + (changed ? 'chg' : '') + '"><th>' + esc(v[0]) + '</th><td>' + esc(v[1]) + '</td></tr>';
  }).join('') + '</tbody></table>' : s.vars.length ? '' : '<p class="mute">No variables yet.</p>';
  let end = '';
  if (atEnd) {
    if (trace.error) end = errorCard(trace.error, trace.errorLine, trace.truncated ? 'The recording ends here. The run went on and later stopped with this error.' : 'The run stops here.');
    else if (trace.result !== null) end = '<div class="tr-result">Returned <code>' + esc(trace.result) + '</code>' + (trace.expect ? ' · expected <code>' + esc(trace.expect) + '</code>' : '') + '</div>';
  }
  $('tr-end').innerHTML = end;
  const outText = trace.output.slice(0, atEnd ? trace.output.length : s.out);
  $('tr-out').hidden = !outText;
  $('tr-out').textContent = outText;
  editor.markActive(s.end ? null : s.line);
  World.showData(worldRows(s, prev, traceRel));
  if (atEnd && tracePlay) { clearInterval(tracePlay); tracePlay = 0; $('tr-play').textContent = 'Play'; }
}
function traceGo(d) { if (!trace) return; traceI += d; Sfx.play('trace'); renderTraceStep(); }

// ---------------------------------------------------------------- AI mentor (only where the viewer's Claude is available)
const Mentor = (() => {
  let ask = null, ctl = null, seq = 0;
  const COPY = { rate_limited: 'The mentor is busy right now. Try again in a little while.', session_expired: 'Sign in to Claude again to use the mentor.',
    refused: 'The mentor could not answer that.', empty_completion: 'The mentor had nothing to say this time. Try again after your next run.', upstream_error: 'The mentor could not be reached. Try again in a moment.' };
  const GONE = ['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed'];
  async function init() {
    if (!online()) return;
    try { ask = await window.claude.use('sample'); } catch (e) { ask = null; }
    if (ask && cur && play.mode === 'normal') $('btn-mentor').hidden = false;
  }
  function describeRun() {
    const r = lastRes;
    if (!r) return 'They have not run this version of the code yet.';
    if (r.kind === 'robot') {
      if (r.tooLong) return 'The program is too long: it has ' + r.lines + ' lines of code and the level allows ' + cur.maxLines + '.';
      if (r.ok) return 'It solved the level.';
      const run = r.runs[r.runs.length - 1];
      if (!run) return 'It did not run.';
      return run.error ? run.error.type + ': ' + run.error.message + (run.errorLine ? ' (line ' + run.errorLine + ')' : '') : run.reason + (run.errorLine ? ' (line ' + run.errorLine + ')' : '');
    }
    if (r.error) return r.error.type + ': ' + r.error.message + (r.errorLine ? ' (line ' + r.errorLine + ')' : '');
    if (r.kind === 'sandbox') return 'It ran without an error and printed:\n' + (r.output || '(nothing)').slice(0, 600);
    if (r.ok) return 'All tests pass.';
    const bad = r.tests.filter(t => !t.ok).slice(0, 3).map(t => t.stdout ? 'Printed text differs. Expected:\n' + t.expect + '\nGot:\n' + (t.got || '(nothing)')
      : 'Test ' + t.show + ': ' + (t.slow ? 'too slow, stopped by the step limit' : t.error ? t.error.type + ': ' + t.error.message + (t.errorLine ? ' (line ' + t.errorLine + ')' : '') : 'expected ' + t.expect + ', got ' + t.got));
    return r.tests.filter(t => t.ok).length + ' of ' + r.tests.length + ' tests pass. Failing:\n' + bad.join('\n');
  }
  function prompt() {
    const lab = cur.kind === 'sandbox';
    return 'You are the mentor inside Pylon, a game that teaches Python. A player is working on ' + (lab ? 'free experiments in the scratchpad' : 'a level') + ' and asked for help.\n\n' +
      'Rules for your reply:\n- Plain text only, at most 110 words. No Markdown, no code blocks.\n' +
      (lab ? '- Explain what their code does or why it fails, and suggest one thing to try next.\n'
        : '- Do not write the corrected code and do not give the full solution. You may quote one short line of their code and name the Python feature to look at.\n- Say briefly what their code does right now, then give one concrete nudge toward the fix.\n- If their code already passes, suggest one improvement in clarity or speed instead.\n') +
      '- Reply in English, unless the comments in their code are in another language: then use that language.\n\n' +
      (lab ? '' : 'Level: ' + cur.title + ' (teaches: ' + cur.concept + ')\nTask given to the player:\n' + plain(cur.task).slice(0, 1500) + '\n\n' +
        (cur.kind === 'robot' ? 'This is a drone puzzle. Commands available: ' + cur.commands.join(', ') + '.\n\n' : '')) +
      'The player\'s code:\n' + editor.value.slice(0, 6000) + '\n\nWhat happened on their last run:\n' + describeRun();
  }
  async function go() {
    if (!ask || !cur || play.mode !== 'normal') return;
    stop();
    const lv = cur, box = $('mentor'), my = ++seq;
    closeTrace();
    box.hidden = false;
    box.innerHTML = '<span class="hint-n">Mentor</span><p id="mentor-text" class="mute">Thinking…</p><button type="button" class="linkbtn" id="mentor-stop">Stop</button>';
    box.scrollIntoView({ block: 'nearest' });
    Sfx.play('mentor');
    const mine = ctl = new AbortController();
    // A newer question, or leaving the level, makes this answer stale: it must not touch the page any more.
    const live = () => my === seq && cur === lv;
    const write = text => { const el = $('mentor-text'); if (el && live() && text) { el.className = ''; el.textContent = text; } };
    try {
      const out = await ask(prompt(), { signal: mine.signal, onText: u => write(u.text) });
      if (live()) {
        write(out.text);
        if (lv.kind !== 'sandbox') { const s = st(lv.id); if (!s.solved && !s.mentor) { s.mentor = true; save(); renderHints(); } }
      }
    } catch (e) {
      const code = e && e.code, el = $('mentor-text');
      if (GONE.indexOf(code) >= 0) { ask = null; $('btn-mentor').hidden = true; if (my === seq) box.hidden = true; }
      else if (live() && el) {
        if (mine.signal.aborted) { if (el.className === 'mute') box.hidden = true; }      // stopped by the player: keep what was written so far
        else { el.className = 'mute'; el.textContent = COPY[code] || COPY.upstream_error; }
      }
    }
    if (my === seq) { if (ctl === mine) ctl = null; const b = $('mentor-stop'); if (b) b.remove(); }
  }
  function stop() { if (ctl) { try { ctl.abort(); } catch (e) { /* ignore */ } ctl = null; } }
  return { init, go, stop, get ready() { return !!ask; } };
})();

// ---------------------------------------------------------------- dialogs
// ---------------------------------------------------------------- story, PIP's voice and PIP's paint
const Story = window.PYLON_STORY || { LOGS: [], AUTHOR: '', EPILOGUE: [], LINES: { floor: [], enter: [], boss: [], fail: {}, pass: [], clean: [], help: [], back: [] } };
const pickLine = (list, n) => (list && list.length ? list[Math.abs(Math.floor(n)) % list.length] : '');
let sayTimer = 0;
function say(text, ms) {
  if (!text || S.pipTalk === false || mode !== 'level') return;
  const el = $('pip-say');
  el.textContent = text;
  el.hidden = false;
  el.classList.remove('in'); void el.offsetWidth; el.classList.add('in');
  clearTimeout(sayTimer);
  sayTimer = setTimeout(() => { el.hidden = true; }, ms || 5600);
}
function hush() { clearTimeout(sayTimer); const el = $('pip-say'); if (el) el.hidden = true; }
// What PIP says when a level opens for the first time ...
function greet(lv) {
  if (lv.kind === 'sandbox' || play.mode !== 'normal') return;
  const s = st(lv.id);
  if (s.hello || s.solved || s.tries) return;
  s.hello = true;
  const L = Story.LINES, n = INDEX[lv.id];
  const line = lv.order === 1 ? L.floor[lv.zone - 1] : lv.boss ? pickLine(L.boss, lv.zone) : n % 3 === 0 ? pickLine(L.enter, n / 3) : '';
  if (line) setTimeout(() => { if (cur === lv) say(line, staged && window.innerWidth <= 900 ? 3200 : 0); }, 1100);
}
// ... and when a run fails: it names the kind of trouble, and after a few tries it points at Step through.
function consol(lv, res, fails) {
  const L = Story.LINES.fail, slow = (res.tests || []).some(t => t.slow), err = res.error || ((res.tests || []).find(t => t.error) || {}).error;
  const key = fails >= 3 && fails % 3 === 0 ? 'again' : slow ? 'slow' : err ? (L[err.type] ? err.type : 'any') : 'wrong';
  say(pickLine(L[key], fails + lv.order), staged && window.innerWidth <= 900 ? 3200 : 0);       // on a small screen PIP's words lie over the scene, so they do not stay long
}
const pipLine = text => (text ? '<p class="pip-line"><b>PIP</b> ' + esc(text) + '</p>' : '');
function logHtml(k, color) {
  const log = Story.LOGS[k];
  return log ? '<div class="tlog" style="--zc:' + color + '"><span>Tower log ' + (k + 1) + ' of ' + Story.LOGS.length + ' · ' + esc(log.title) + '</span><p>' + esc(log.text) + '</p><em>' + esc(Story.AUTHOR) + '</em>' + pipLine(log.pip) + '</div>' : '';
}
function showLogbook() {
  let h = '<h2>Tower log</h2><p class="mute">The last chief engineer left one entry on every floor. An entry is recovered when its floor comes back online.</p>';
  ZONES.forEach((z, k) => {
    h += floorDone(z.n) ? logHtml(k, z.color) : '<div class="tlog locked" style="--zc:' + z.color + '"><span>Tower log ' + (k + 1) + ' of ' + Story.LOGS.length + '</span><p>Bring Floor ' + z.n + ', ' + esc(z.name) + ', back online to recover this entry.</p></div>';
  });
  if (ZONES.every(z => floorDone(z.n))) h += '<div class="done-actions"><button type="button" class="btn primary" id="ending-again">Watch the ending again</button></div>';
  modal(h, { wide: true });
}
function showEnding() {
  closeModal();
  if (mode === 'level') closeLevel(true); else World.showHub(true);
  S.ended = true;
  save();
  Music.cue('ending');
  setTimeout(() => {
    Sfx.play('rank');
    modal('<div class="ending"><div class="eyebrow">The Pylon is online</div><h2>Signal restored</h2>' + Story.EPILOGUE.map((p, k) => '<p' + (k === 2 ? ' class="radio"' : '') + '>' + esc(p) + '</p>').join('') +
      '<p class="mute">' + LEVELS.length + ' levels, ' + ZONES.length + ' floors, one drone. Thank you for playing. The daily reviews, the interviews and the craft marks are still here, and so is every level you might want to write better.</p>' +
      '<div class="done-actions"><button type="button" class="btn primary" data-focus id="ending-close">Back to the tower</button><button type="button" class="btn" id="ending-log">Read the tower log</button></div></div>', { wide: true });
  }, 1500);
}
// PIP's paint. Every rank unlocks one more.
const PAINTS = [
  { id: 'white', name: 'Factory white', color: 0x8f97b3 }, { id: 'teal', name: 'Boot teal', color: 0x1f9d90 }, { id: 'amber', name: 'Garden amber', color: 0xc07f2c },
  { id: 'green', name: 'Cipher green', color: 0x55a23f }, { id: 'violet', name: 'Vault violet', color: 0x7462c9 }, { id: 'ice', name: 'Archive ice', color: 0x3fa3c6 },
  { id: 'rose', name: 'Forge rose', color: 0xbd4d7d }, { id: 'blue', name: 'Works blue', color: 0x3b78c9 }, { id: 'orange', name: 'Reactor orange', color: 0xc5633c },
  { id: 'gold', name: 'Summit gold', color: 0xbb9930 },
];
const paintOpen = k => k <= rankIndex() || S.unlockAll;
function applyPaint() { const k = Math.max(0, PAINTS.findIndex(p => p.id === S.paint)); World.setPaint(PAINTS[paintOpen(k) ? k : 0].color); }
const paintHex = c => '#' + ('000000' + c.toString(16)).slice(-6);
const paintsHtml = () => PAINTS.map((p, k) => '<button type="button" class="swatch' + ((S.paint || 'white') === p.id ? ' on' : '') + '" data-paint="' + p.id + '"' + (paintOpen(k) ? '' : ' disabled') + ' style="--sw:' + paintHex(p.color) + '" title="' + esc(p.name) + (paintOpen(k) ? '' : ': reach the rank of ' + esc(RANKS[k])) + '" aria-label="' + esc(p.name) + (paintOpen(k) ? '' : ', locked') + '"></button>').join('');

// ---------------------------------------------------------------- comfort, the save code, installing
// Text size, motion and contrast are classes on the page's root element, so the stylesheet does the work.
const sysCalm = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
const isCalm = () => (typeof S.calm === 'boolean' ? S.calm : sysCalm);
function applyComfort() {
  const r = document.documentElement.classList, ts = S.ts === 1 || S.ts === 2 ? S.ts : 0, quiet = isCalm();
  r.toggle('ts-1', ts === 1); r.toggle('ts-2', ts === 2);
  r.toggle('hc', !!S.hc);
  r.toggle('calm', quiet); r.toggle('motion', !quiet);
  World.setCalm(quiet);
  try { window.dispatchEvent(new Event('resize')); } catch (e) { /* a resize makes the editor measure its letters again */ }
}
function toggleFull() {
  const d = document, no = () => toast('Full screen is not available here.');
  try {
    const p = d.fullscreenElement ? d.exitFullscreen() : d.documentElement.requestFullscreen();
    if (p && p.catch) p.catch(no);
  } catch (e) { no(); }
}

// The save code: the whole save as text, to keep as a backup or to carry to another browser.
const B64 = {
  enc(bytes) { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s); },
  dec(text) { const s = atob(text), out = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i); return out; },
};
// Push bytes through a compression stream and collect what comes out, giving up past a size limit.
async function pump(bytes, stream, cap) {
  const w = stream.writable.getWriter();
  w.write(bytes).catch(() => {});
  w.close().catch(() => {});
  const r = stream.readable.getReader(), parts = [];
  let n = 0;
  for (;;) {
    const got = await r.read();
    if (got.done) break;
    n += got.value.length;
    if (n > cap) { r.cancel().catch(() => {}); throw new Error('too large'); }
    parts.push(got.value);
  }
  const out = new Uint8Array(n);
  let at = 0;
  for (const p of parts) { out.set(p, at); at += p.length; }
  return out;
}
async function saveCode() {
  const raw = new TextEncoder().encode(JSON.stringify(S));
  if (window.CompressionStream) { try { return 'PYLON2.' + B64.enc(await pump(raw, new CompressionStream('gzip'), 4e6)); } catch (e) { /* the plain form below */ } }
  return 'PYLON1.' + B64.enc(raw);
}
async function readSaveCode(text) {
  const m = /^\s*PYLON([12])\.([A-Za-z0-9+/=\s]+)$/.exec(String(text || '').slice(0, 600000));
  if (!m) return null;
  try {
    let bytes = B64.dec(m[2].replace(/\s+/g, ''));
    if (m[1] === '2') { if (!window.DecompressionStream) return null; bytes = await pump(bytes, new DecompressionStream('gzip'), 4e6); }
    return cleanSave(JSON.parse(new TextDecoder().decode(bytes)));
  } catch (e) { return null; }
}
// A save code can come from anywhere, so nothing in it is trusted: every field is read as the type it should have,
// numbers are kept inside their range, and anything unknown is dropped.
const IV_VERDICTS = ['Strong hire', 'Hire', 'Leaning hire', 'No hire yet'];
function cleanSave(d) {
  if (!d || typeof d !== 'object' || d.v !== 1 || !d.levels || typeof d.levels !== 'object') return null;
  const int = (x, max) => (typeof x === 'number' && isFinite(x) ? Math.max(0, Math.min(max, Math.round(x))) : 0);
  const day = x => (typeof x === 'string' && /^\d{4}-\d\d-\d\d$/.test(x) ? x : null);
  const out = { v: 1, levels: {} }, mark = Craft ? Craft.XP_PER_MARK : 10;
  for (const l of LEVELS) {
    const r = d.levels[l.id];
    if (!r || typeof r !== 'object') continue;
    const s = out.levels[l.id] = { solved: !!r.solved, stars: int(r.stars, 3), xp: Math.min(int(r.xp, 9999), xpFor(l, 3)), code: typeof r.code === 'string' ? r.code.slice(0, 20000) : null,
      hints: int(r.hints, 9), saw: !!r.saw, tries: int(r.tries, 99999), read: !!r.read, t: int(r.t, 1e14) };
    if (!s.solved) { s.stars = 0; s.xp = 0; }
    for (const k of ['mentor', 'lean', 'brief', 'hello']) if (r[k]) s[k] = true;
    if (r.pred) s.pred = int(r.pred, 0x7fffffff);
    if (r.craft) { s.craft = int(r.craft, 15); s.cx = Math.min(int(r.cx, 999), bitCount(s.craft) * mark); }
    if (r.fails) s.fails = int(r.fails, 99999);
    if (r.rv && typeof r.rv === 'object' && day(r.rv.due)) s.rv = { box: int(r.rv.box, RV_GAPS.length - 1), due: r.rv.due };
  }
  for (const k of ['sound', 'music', 'unlockAll', 'ac', 'replay', 'pipTalk', 'ended', 'tipTrace', 'hc', 'calm']) if (typeof d[k] === 'boolean') out[k] = d[k];
  for (const k of ['musicVol', 'sfxVol']) if (typeof d[k] === 'number' && d[k] >= 0 && d[k] <= 1) out[k] = d[k];
  if (typeof d.last === 'string' && INDEX[d.last] !== undefined) out.last = d.last;
  if ([1, 2, 4].indexOf(d.speed) >= 0) out.speed = d.speed;
  if (['auto', 'high', 'medium', 'low'].indexOf(d.gfx) >= 0) out.gfx = d.gfx;
  if (d.ts === 1 || d.ts === 2) out.ts = d.ts;
  if (d.track === 'score' || d.track === 'classic') out.track = d.track;
  if (PAINTS.some(p => p.id === d.paint)) out.paint = d.paint;
  out.days = Array.isArray(d.days) ? Array.from(new Set(d.days.filter(day))).sort().slice(-400) : [];
  out.badges = {};
  for (const b of BADGES) if (d.badges && typeof d.badges === 'object' && d.badges[b.id]) out.badges[b.id] = int(d.badges[b.id], 1e14) || 1;
  out.counters = {};
  if (d.counters && typeof d.counters === 'object') for (const k of Object.keys(d.counters)) if (/^[A-Za-z][A-Za-z0-9]{0,23}$/.test(k)) out.counters[k] = int(d.counters[k], 1e9);
  out.bonus = int(d.bonus, 1e7);
  if (d.rvDay && typeof d.rvDay === 'object' && day(d.rvDay.d)) out.rvDay = { d: d.rvDay.d, n: int(d.rvDay.n, 99) };
  out.ivLog = Array.isArray(d.ivLog) ? d.ivLog.filter(r => r && typeof r === 'object' && IV_SETS.some(s => s.id === r.set)).slice(-12)
    .map(r => ({ set: r.set, solved: int(r.solved, 9), n: int(r.n, 9), v: IV_VERDICTS.indexOf(r.v) >= 0 ? r.v : 'No hire yet', t: int(r.t, 1e14) })) : [];
  if (d.cv === 2 || d.cv === 3) out.cv = d.cv;
  out.rank0 = int(d.rank0, RANKS.length - 1);
  if (typeof d.labIn === 'string') out.labIn = d.labIn.slice(0, 4000);
  if (d.bug && typeof d.bug === 'object' && day(d.bug.d)) out.bug = { d: d.bug.d, ok: !!d.bug.ok };
  out.tour = int(d.tour, 3);
  out.t = int(d.t, 1e14);
  return out;
}
// Replace the progress in this browser with a save that has been read and cleaned.
function adoptSave(d) {
  clearInterval(ivTimer);
  if (mode === 'level') closeLevel();
  // What belongs to this device and this person stays, unless the save says otherwise: sound, graphics, comfort.
  const here = { sound: S.sound, music: S.music, musicVol: S.musicVol, sfxVol: S.sfxVol, ac: S.ac, gfx: S.gfx, ts: S.ts, calm: S.calm, hc: S.hc, track: S.track }, board = S.board;
  S = Object.assign({ v: 1, levels: {}, unlockAll: false, last: null, speed: 1, days: [], badges: {}, counters: {}, bonus: 0, rvDay: null, ivLog: [], t: 0 }, here, d, { board, intro: true, open: null, iv: null });
  tidy(); migrate(); seedReviews();
  save();
  checkBadges(true);
  editor.setComplete(S.ac);
  World.setQuality(S.gfx);
  applyComfort(); applyPaint(); Music.apply();
  closeModal();
  selectLevel(S.last && INDEX[S.last] !== undefined ? INDEX[S.last] : Math.max(0, nextIndex()), true);
  refreshProgress();
  toast('Save loaded: ' + totals().solved + ' of ' + LEVELS.length + ' levels solved.');
}
async function showSaveBox() {
  if (mode === 'level') keepCode();
  modal('<div class="eyebrow">Your progress</div><h2>Save code</h2>' +
    '<p>This code is your whole save as text: solved levels, stars, badges, review dates and the code you wrote. Keep it somewhere as a backup, or paste it into Pylon in another browser to carry on there.</p>' +
    '<h3>Your save code</h3><textarea class="savebox" id="save-out" readonly rows="4" spellcheck="false" aria-label="Your save code">Preparing…</textarea>' +
    '<div class="done-actions" style="margin-top:10px"><button type="button" class="btn primary" id="save-copy" disabled>Copy the code</button></div>' +
    '<h3>Load a save code</h3><textarea class="savebox" id="save-in" rows="3" spellcheck="false" autocapitalize="off" autocomplete="off" placeholder="Paste a save code here" aria-label="A save code to load"></textarea>' +
    '<p class="mute" id="save-msg" aria-live="polite"></p>' +
    '<div class="done-actions" style="margin-top:10px"><button type="button" class="btn" id="save-load">Load this save</button><button type="button" class="btn ghost" data-focus id="menu-close">Close</button></div>', { wide: true });
  const code = await saveCode(), out = $('save-out');
  if (!out) return;
  out.value = code;
  $('save-copy').disabled = false;
}
function copySaveCode() {
  const out = $('save-out');
  if (!out) return;
  const done = () => toast('Save code copied.'), pick = () => { out.focus(); out.select(); toast('The code is selected. Copy it from here.'); };
  try { navigator.clipboard.writeText(out.value).then(done, pick); } catch (e) { pick(); }
}
async function loadSaveCode() {
  const field = $('save-in');
  if (!field) return;
  const d = await readSaveCode(field.value), msg = $('save-msg');
  if (!msg) return;
  if (!d) { msg.className = 'bad'; msg.textContent = field.value.trim() ? 'That is not a Pylon save code. Copy the whole code, from PYLON to its last character.' : 'Paste a save code into the box first.'; return; }
  const theirs = LEVELS.filter(l => d.levels[l.id] && d.levels[l.id].solved).length, mine = totals().solved;
  confirmBox('Load this save?', 'The save has ' + theirs + (theirs === 1 ? ' solved level' : ' solved levels') + '. This browser has ' + mine + '. Loading it replaces the progress in this browser' +
    (Cloud.ready ? ', and the progress in your Claude account is then merged into it.' : '.'), 'Load the save', () => adoptSave(d));
}

// Installing: the standalone site can be added to a phone or a desktop like an app, and then starts without a connection.
let installEvt = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; });
window.addEventListener('appinstalled', () => { installEvt = null; });
const isInstalled = () => !!((window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || navigator.standalone);
const worksOffline = () => { try { return !!(navigator.serviceWorker && navigator.serviceWorker.controller); } catch (e) { return false; } };
function installRow() {
  if (!document.querySelector('link[rel="manifest"]') || isInstalled()) return '';
  if (installEvt) return '<div class="row"><span>Install Pylon<small>Adds it to this device like an app. It then starts without a connection.</small></span><button type="button" class="btn" id="opt-install">Install</button></div>';
  if (/iPhone|iPad|iPod/.test(navigator.userAgent)) return '<div class="row"><span>Install Pylon<small>In Safari, press Share and then “Add to Home Screen”. It then starts without a connection.</small></span></div>';
  return '';
}

// ---------------------------------------------------------------- the first-time tour
// A few notes that point at parts of the screen, once on the first drone level and once on the first code level.
const TOURS = {
  1: [
    { at: 'stage', text: 'This is PIP, the maintenance drone, on a deck of the tower. PIP does exactly what your Python says, no more and no less.' },
    { at: 'editor', tab: 'code', text: 'You write your program here. The task is in the box just above it.' },
    { at: 'cmds', tab: 'code', text: 'These are the commands PIP understands on this deck. Press one to drop it into your code.' },
    { at: 'btn-run', tab: 'code', text: 'Run plays your program on the deck. If PIP ends up in the wrong place, change the code and run again. Nothing here can break.' },
    { at: 'btn-hint', tab: 'code', text: 'Stuck? Hints go from a nudge to nearly the answer. Using them costs a star, never the level.' },
    { at: 'tab-btn-lesson', tab: 'lesson', text: 'Start here. Every level opens with a short lesson on the one new idea it needs. Read it, then open Code.' },
  ],
  2: [
    { at: 'stage', text: 'From here on every level has a scene of its own, built from one of its tests. When you run your code, PIP acts out what it returned: a right answer opens the gate or holds the bridge, a wrong one goes visibly wrong.' },
    { at: 'tab-btn-lesson', text: 'You now write real Python, and the lesson comes one level early: this tab holds the briefing for the next level.' },
    { at: 'tab-btn-tools', text: 'Tools holds every function and method you have been shown so far, as cards you can search. A level never says which ones it needs.' },
    { at: 'editor', tab: 'code', text: 'Write your answer here. Suggestions appear as you type, each with a reminder of what it does.' },
    { at: 'btn-trace', tab: 'code', text: 'Step through runs your code one line at a time and draws your lists and dictionaries in the arena. It is the fastest way to find a bug.' },
    { at: 'term', tab: 'code', text: 'The terminal writes down what your code did, the way Python itself would: what it printed, what each call returned, and the full error when one is raised. Type a line of your own after >>> to try your functions with any input.' },
    { at: 'btn-run', tab: 'code', text: 'Run checks your code against every test and plays one of them in the scene. A passing answer can also earn four craft marks for being short, clear and tidy.' },
  ],
};
let tourForce = false;
const Tour = (() => {
  let steps = null, k = 0, lv = null, timer = 0;
  function place() {
    if (!steps) return;
    const el = $(steps[k].at), box = $('coach'), ring = $('coach-ring'), r0 = el && !el.hidden ? el.getBoundingClientRect() : null;
    if (!r0 || r0.width < 2 || r0.height < 2) { next(); return; }                  // nothing to point at here: move on
    const vw = window.innerWidth, vh = window.innerHeight, pad = 8;
    const r = { left: Math.max(pad, r0.left - 4), top: Math.max(pad, r0.top - 4), right: Math.min(vw - pad, r0.right + 4), bottom: Math.min(vh - pad, r0.bottom + 4) };
    ring.hidden = false;
    ring.style.left = r.left + 'px'; ring.style.top = r.top + 'px'; ring.style.width = (r.right - r.left) + 'px'; ring.style.height = (r.bottom - r.top) + 'px';
    box.hidden = false;
    const bw = box.offsetWidth, bh = box.offsetHeight, x = Math.min(vw - bw - pad, Math.max(pad, (r.left + r.right) / 2 - bw / 2));
    let y;
    if (r.bottom - r.top > vh * 0.45) y = r.bottom - bh - 76;                       // a large target: sit inside it, clear of the controls along its lower edge
    else if (r.bottom + 10 + bh <= vh - pad) y = r.bottom + 10;
    else y = r.top - 10 - bh;
    box.style.left = x + 'px';
    box.style.top = Math.min(vh - bh - pad, Math.max(pad, y)) + 'px';
  }
  function show() {
    const s = steps[k];
    if (s.tab && cur === lv) showTab(s.tab);
    $('coach-text').textContent = s.text;
    $('coach-n').textContent = (k + 1) + ' / ' + steps.length;
    $('coach-next').textContent = k === steps.length - 1 ? 'Got it' : 'Next';
    place();
  }
  function next() {
    if (!steps) return;
    if (++k >= steps.length) { end(); return; }
    show();
  }
  function end() {
    clearTimeout(timer);
    if (!steps) return;
    steps = null;
    $('coach').hidden = true; $('coach-ring').hidden = true;
  }
  function start(n, level) {
    end();
    lv = level; k = 0; steps = TOURS[n];
    S.tour = (S.tour || 0) | n;
    save();
    show();
  }
  // Only for someone who has not solved a level of this kind yet, and only once.
  function maybe(level) {
    if (level.kind === 'sandbox' || play.mode !== 'normal') return;
    const n = level.kind === 'robot' ? 1 : 2, seen = (S.tour || 0) & n, old = LEVELS.some((l, i) => l.kind === level.kind && isSolved(i));
    if (!tourForce && (seen || old)) return;
    tourForce = false;
    clearTimeout(timer);
    timer = setTimeout(() => { if (cur === level && mode === 'level' && $('modal').hidden && !busy) start(n, level); }, 900);
  }
  window.addEventListener('resize', () => { if (steps) place(); });
  return { start, next, end, maybe, get on() { return !!steps; } };
})();

function showIntro() {
  modal('<div class="intro"><div class="eyebrow">Signal tower · nine floors · one drone</div><h2>The Pylon has been dark for years.</h2>' +
    '<p>You are the new engineer. PIP, the maintenance drone, does exactly what your Python tells it to do, no more and no less.</p>' +
    '<p>Each platform on the tower is a problem to solve with real code, from <code>move()</code> on the Boot Deck to the classic interview problems near the top. Bring a whole floor back online and you are promoted. Floor 7 makes you a Senior Engineer.</p>' +
    '<p>Nobody knows why the tower went dark. The last chief engineer left nine log entries behind, one on every floor.</p>' +
    '<div class="done-actions"><button type="button" class="btn primary" data-focus id="intro-start">Start on the Boot Deck</button><button type="button" class="btn ghost" id="intro-skip">I already know some Python</button></div></div>',
  { onClose: () => { if (!S.intro) { S.intro = true; save(); } } });
}
const seg = (attr, value, label, on) => '<button type="button" class="seg' + (on ? ' on' : '') + '" data-' + attr + '="' + value + '">' + label + '</button>';
function showMenu() {
  const q = World.getQuality() || { now: '' }, due = reviewsLeft(), canFull = !!document.documentElement.requestFullscreen;
  Sfx.play('modal');
  modal('<h2>Menu</h2>' +
    (mode === 'hub' ? '<div class="goto"><button type="button" class="btn" id="btn-review2">Review' + (due ? ' <b>' + due + '</b>' : '') + '</button><button type="button" class="btn" id="btn-interview2">Challenges</button><button type="button" class="btn" id="btn-lab2">Scratchpad</button>' +
      '<button type="button" class="btn" id="btn-codex2">Codex</button><button type="button" class="btn" id="btn-log2">Tower log</button><button type="button" class="btn" id="btn-badges2">Badges</button>' + (online() ? '<button type="button" class="btn" id="btn-board2">Leaderboard</button>' : '') + '</div>' : '') +
    '<h3>Sound</h3><div class="rows">' +
    '<div class="row"><label for="opt-music">Music</label><span class="vol"><input type="range" id="opt-music-vol" min="0" max="100" value="' + Math.round(S.musicVol * 100) + '" aria-label="Music volume"><input type="checkbox" id="opt-music"' + (S.music ? ' checked' : '') + '></span></div>' +
    (window.PylonScore ? '<div class="row"><span>Soundtrack<small>The tower score is written while you play. It follows the floor you are on, and it grows as the tower comes back online.</small></span><span class="segs">' +
      seg('trk', 'score', 'Tower score', S.track !== 'classic') + seg('trk', 'classic', 'Original track', S.track === 'classic') + '</span></div>' : '') +
    '<div class="row"><label for="opt-sound">Sound effects</label><span class="vol"><input type="range" id="opt-sfx-vol" min="0" max="100" value="' + Math.round(S.sfxVol * 100) + '" aria-label="Sound effects volume"><input type="checkbox" id="opt-sound"' + (S.sound ? ' checked' : '') + '></span></div></div>' +
    '<h3>Play</h3><div class="rows">' +
    '<div class="row"><span>Graphics<small>Auto picks for your device and steps down if the picture stutters' + (q.now ? '. Now: ' + q.now : '') + '.</small></span><span class="segs">' + ['auto', 'high', 'medium', 'low'].map(v => seg('gfx', v, v[0].toUpperCase() + v.slice(1), S.gfx === v)).join('') + '</span></div>' +
    '<label class="row" for="opt-ac"><span>Suggestions while typing<small>Names, methods and whole lines, each with a reminder of what it does.</small></span><input type="checkbox" id="opt-ac"' + (S.ac ? ' checked' : '') + '></label>' +
    '<label class="row" for="opt-replay"><span>Play each run in the arena<small>When you press Run, PIP acts out what your code returned on one of the tests. Switched off, the arena shows how it ended straight away.</small></span><input type="checkbox" id="opt-replay"' + (S.replay !== false ? ' checked' : '') + '></label>' +
    '<div class="row"><span>Drone replay speed</span><span class="segs">' + [1, 2, 4].map(v => seg('speed', v, v + '×', S.speed === v)).join('') + '</span></div>' +
    '<label class="row" for="opt-unlock"><span>Unlock every level<small>For people who already know the basics and want to jump ahead.</small></span><input type="checkbox" id="opt-unlock"' + (S.unlockAll ? ' checked' : '') + '></label>' +
    '<label class="row" for="opt-pip"><span>PIP talks<small>A line from the drone when a level opens and when a run fails.</small></span><input type="checkbox" id="opt-pip"' + (S.pipTalk !== false ? ' checked' : '') + '></label>' +
    '<div class="row"><span>PIP\'s paint<small>Every rank unlocks one more.</small></span><span class="swatches" id="swatches">' + paintsHtml() + '</span></div>' +
    '</div><h3>Comfort</h3><div class="rows">' +
    '<div class="row"><span>Text size<small>Lessons, tasks, hints, results and the editor.</small></span><span class="segs">' + ['Normal', 'Large', 'Larger'].map((label, v) => seg('ts', v, label, (S.ts || 0) === v)).join('') + '</span></div>' +
    '<label class="row" for="opt-calm"><span>Reduce motion<small>Stills the camera, the floating pieces and the animations on screen.</small></span><input type="checkbox" id="opt-calm"' + (isCalm() ? ' checked' : '') + '></label>' +
    '<label class="row" for="opt-hc"><span>High contrast<small>Brighter small text and stronger outlines.</small></span><input type="checkbox" id="opt-hc"' + (S.hc ? ' checked' : '') + '></label>' +
    (canFull ? '<div class="row"><span>Full screen</span><button type="button" class="btn" id="opt-full">' + (document.fullscreenElement ? 'Leave' : 'Enter') + ' full screen</button></div>' : '') +
    installRow() +
    '<div class="row"><span>The tour<small>The walk around the screen for new players.</small></span><button type="button" class="btn" id="btn-tour">Show it again</button></div>' +
    '</div><h3>Keys</h3><p class="mute"><kbd>Ctrl</kbd> <kbd>Enter</kbd> run · <kbd>Tab</kbd> take a suggestion, or indent · <kbd>Ctrl</kbd> <kbd>Space</kbd> ask for suggestions · <kbd>Ctrl</kbd> <kbd>/</kbd> comment · <kbd>Esc</kbd> leave the editor · arrow keys move along the tower, and step through a trace</p>' +
    '<h3>About the Python here</h3><p class="mute">Your code runs inside this page on a small Python interpreter written for Pylon. It covers the language and the standard modules these levels use (math, re, collections, heapq, itertools, functools, bisect and a few more). Files live in memory, and input() reads the lines a test or the Scratchpad\'s Input box gives it. Async code and third-party packages are not included.</p>' +
    '<p class="mute">Music: the tower score is generated in your browser as you play. The original track is “Pythonic Ambiance”.' + (worksOffline() ? ' This copy of Pylon also starts without a connection.' : '') + '</p>' +
    '<h3>Your progress</h3><p class="mute">' + (Cloud.ready ? 'Saved to your Claude account and in this browser.' : 'Saved in this browser, on this device.') + ' A save code holds all of it as text: keep one as a backup, or use it to carry your progress to another browser.</p>' +
    '<div class="done-actions" style="margin-top:10px"><button type="button" class="btn" id="btn-savebox">Save code</button><button type="button" class="btn danger" id="menu-reset">Erase all progress</button></div>' +
    '<div class="done-actions"><button type="button" class="btn" data-focus id="menu-close">Close</button></div>', { wide: true });
}
function showBadges() {
  Sfx.play('modal');
  modal('<h2>Badges</h2><p class="mute">' + Object.keys(S.badges).length + ' of ' + BADGES.length + ' earned.</p><ul class="badges">' + BADGES.map(b =>
    '<li class="' + (S.badges[b.id] ? 'got' : '') + '"><span class="b-mark" aria-hidden="true">' + (S.badges[b.id] ? '★' : '·') + '</span><div><strong>' + esc(b.name) + '</strong><small>' + esc(b.desc) + '</small></div></li>').join('') +
    '</ul><div class="done-actions"><button type="button" class="btn" data-focus id="menu-close">Close</button></div>', { wide: true });
}
function showCodex(openId) {
  if (openId) {
    const i = INDEX[openId], lv = LEVELS[i];
    modal('<button type="button" class="btn ghost" id="codex-back">‹ All levels</button><div class="eyebrow" style="margin-top:14px">Floor ' + lv.zone + ' · ' + esc(lv.concept) + '</div><h2>' + esc(lv.title) + '</h2><div class="prose">' + lv.lesson + cardsHtml(lv, false, 'Its tools') + '</div>' +
      (isUnlocked(i) ? '<div class="done-actions"><button type="button" class="btn primary" data-go="' + i + '">Go to this level</button></div>' : '<p class="mute">This is the briefing for a level you have not reached yet.</p>'), { wide: true });
    hl($('modal-body'));
    return;
  }
  let h = '<h2>Codex</h2><p class="mute">Every briefing you have reached, with its reference cards. Open one to read it again.</p>';
  for (const z of ZONES) {
    const ls = zoneLevels(z.n);
    if (!ls.length) continue;
    h += '<h3 style="color:' + z.color + '">Floor ' + z.n + ' · ' + esc(z.name) + '</h3><p class="mute">' + esc(z.blurb) + '</p><ol class="codex">' + ls.map(l => {
      const i = INDEX[l.id], open = isUnlocked(i), ahead = !open && i > 0 && isUnlocked(i - 1), can = open || ahead;
      return '<li><button type="button" class="codex-row' + (can ? '' : ' locked') + '"' + (can ? ' data-codex="' + l.id + '"' : ' disabled') + '><span class="c-n">' + l.order + '</span><span class="c-t">' + esc(l.title) + '<small>' + esc(l.concept) + (l.classic ? ' · ' + esc(l.classic) : '') + '</small></span>' +
        (isSolved(i) ? starsHtml(S.levels[l.id].stars) : open ? '<span class="chip">open</span>' : ahead ? '<span class="chip">briefing</span>' : '<span class="chip">locked</span>') + '</button></li>';
    }).join('') + '</ol>';
  }
  modal(h, { wide: true });
}
async function showBoard() {
  modal('<h2>Leaderboard</h2><p class="mute" id="board-note">Loading…</p><div id="board-body"></div><div class="done-actions"><button type="button" class="btn" data-focus id="menu-close">Close</button></div>', { wide: true });
  if (!Cloud.ready) { $('board-note').textContent = 'The leaderboard is available when this page is opened from claude.ai by someone who is signed in. Your progress is still saved on this device.'; return; }
  let rows = null;
  try { rows = await Cloud.board(); } catch (e) { rows = null; }
  if (!$('board-note')) return;
  if (!rows) { $('board-note').textContent = 'The leaderboard could not be reached just now.'; return; }
  $('board-note').textContent = S.board ? 'Your XP is shown to everyone who can open this page.' : 'Only people who join are listed. Joining shows your name, rank and XP to everyone who can open this page.';
  const body = $('board-body');
  body.innerHTML = '<button type="button" class="btn' + (S.board ? '' : ' primary') + '" id="board-toggle">' + (S.board ? 'Leave the leaderboard' : 'Join the leaderboard') + '</button>' +
    (rows.length ? '<ol class="board" style="margin-top:12px"></ol>' : '<p class="mute" style="margin-top:12px">Nobody has joined yet.</p>');
  const ol = body.querySelector('.board');
  if (ol) rows.forEach((r, i) => {
    const li = document.createElement('li');
    if (r.me) li.className = 'me';
    li.innerHTML = '<span class="b-n">' + (i + 1) + '</span><span class="b-name"></span><span class="b-rank"></span><span class="b-xp"></span>';
    li.querySelector('.b-name').textContent = (r.name || 'Engineer') + (r.me ? ' (you)' : '');
    li.querySelector('.b-rank').textContent = RANKS[Math.max(0, Math.min(RANKS.length - 1, r.rank | 0))];
    li.querySelector('.b-xp').textContent = num(r.xp | 0) + ' XP · ★ ' + (r.stars | 0);
    ol.appendChild(li);
  });
}
function confirmBox(title, text, yes, fn) {
  modal('<h2>' + esc(title) + '</h2><p>' + esc(text) + '</p><div class="done-actions"><button type="button" class="btn primary" id="confirm-yes">' + esc(yes) + '</button><button type="button" class="btn ghost" data-focus id="menu-close">Cancel</button></div>');
  $('confirm-yes').onclick = () => { closeModal(); fn(); };
}

// ---------------------------------------------------------------- events
// A command button writes its line the way a person would: on a line of its own, indented like the block it lands in.
function insertLine(text) {
  const ta = editor.el, v = ta.value, at = ta.selectionEnd, a = v.lastIndexOf('\n', at - 1) + 1;
  let b = v.indexOf('\n', at);
  if (b < 0) b = v.length;
  const line = v.slice(a, b), indent = /^ */.exec(line)[0];
  if (!line.trim()) { ta.setSelectionRange(a, b); editor.insert(indent + text); return; }
  ta.setSelectionRange(b, b);
  editor.insert('\n' + indent + (line.replace(/#.*$/, '').trimEnd().endsWith(':') ? '    ' : '') + text);
}
const CMD_TEXT = { 'for i in range(n):': 'for i in range(3):', 'while condition:': 'while front_is_clear():', 'if condition:': 'if on_shard():', 'if / elif / else': 'if front_is_clear():', 'def name():': 'def my_trick():' };
function back() {
  if (play.mode === 'interview' && S.iv) {
    const iv = S.iv, open = iv.ids.filter(id => !(iv.res[id] && iv.res[id].ok)).length;
    if (open) confirmBox('End the interview?', open + (open === 1 ? ' problem is' : ' problems are') + ' still unsolved and will count as missed. The clock keeps running while you decide.', 'End it', () => finishInterview(false));
    else finishInterview(false);
  } else closeLevel();
}
function bind() {
  document.addEventListener('input', e => { if (e.target && e.target.id === 'tools-find') filterTools(e.target.value); });
  document.addEventListener('click', e => {
    const t = e.target.closest('button, [data-zone]');
    if (!t) { if (e.target.id === 'modal') closeModal(); return; }
    const id = t.id;
    if (t.dataset.zone) { const ls = zoneLevels(+t.dataset.zone); const firstOpen = ls.find(l => !isSolved(INDEX[l.id])) || ls[0]; Sfx.play('select'); selectLevel(INDEX[firstOpen.id]); return; }
    if (t.dataset.tab) { Sfx.play('click'); showTab(t.dataset.tab); return; }
    if (t.dataset.cmd) { insertLine(CMD_TEXT[t.dataset.cmd] || t.dataset.cmd); return; }
    if (t.dataset.ins !== undefined) { editor.insert(t.dataset.ins); return; }
    if (t.dataset.move) { editor.move(+t.dataset.move); return; }
    if (t.dataset.speed) { S.speed = +t.dataset.speed; save(); document.querySelectorAll('[data-speed]').forEach(b => b.classList.toggle('on', +b.dataset.speed === S.speed)); return; }
    if (t.dataset.gfx) { S.gfx = t.dataset.gfx; save(); World.setQuality(S.gfx); document.querySelectorAll('[data-gfx]').forEach(b => b.classList.toggle('on', b.dataset.gfx === S.gfx)); return; }
    if (t.dataset.trk) { S.track = t.dataset.trk; save(); Music.apply(); document.querySelectorAll('[data-trk]').forEach(b => b.classList.toggle('on', b.dataset.trk === (S.track === 'classic' ? 'classic' : 'score'))); return; }
    if (t.dataset.ts !== undefined) { S.ts = +t.dataset.ts || 0; save(); applyComfort(); document.querySelectorAll('[data-ts]').forEach(b => b.classList.toggle('on', +b.dataset.ts === S.ts)); return; }
    if (t.dataset.codex) { showCodex(t.dataset.codex); return; }
    if (t.dataset.trace !== undefined) { startTrace(+t.dataset.trace); return; }
    if (t.dataset.iv) { closeModal(); startInterview(t.dataset.iv); return; }
    if (t.dataset.ivgo !== undefined) { if (+t.dataset.ivgo !== (S.iv && S.iv.at)) enterInterview(+t.dataset.ivgo); return; }
    if (t.dataset.card !== undefined) { toggleCard(t); return; }
    if (t.dataset.paint) { S.paint = t.dataset.paint; save(); applyPaint(); Sfx.play('select'); const box = $('swatches'); if (box) box.innerHTML = paintsHtml(); return; }
    if (t.dataset.craftline !== undefined) { const line = +t.dataset.craftline; if (line && editor) { showTab('code'); editor.markWarn(line); } return; }
    if (t.dataset.go) { const i = +t.dataset.go; closeModal(); if (mode === 'level') closeLevel(); selectLevel(i); return; }
    switch (id) {
      case 'card-prev': Sfx.play('select'); selectLevel(hubSel - 1); break;
      case 'card-next': Sfx.play('select'); selectLevel(hubSel + 1); break;
      case 'card-enter': openLevel(hubSel); break;
      case 'btn-back': back(); break;
      case 'go-code': showTab('code'); if (!coarse) editor.focus(); break;
      case 'go-tools': showTab('tools'); break;
      case 'brief-next': { const i = INDEX[cur.id] + 1; if (isUnlocked(i)) { keepCode(); openLevel(i); } break; }
      case 'done-brief': { closeModal(); showTab('lesson'); const b = $('brief'); if (b) b.scrollIntoView({ block: 'start' }); break; }
      case 'grew-go': { closeModal(); const i = nextIndex(); if (i >= 0) selectLevel(i); break; }
      case 'grew-close': closeModal(); break;
      case 'btn-log2': showLogbook(); break;
      case 'done-ending': case 'ending-again': showEnding(); break;
      case 'ending-close': closeModal(); break;
      case 'ending-log': showLogbook(); break;
      case 'btn-run': run(); break;
      case 'btn-trace': if (trace) closeTrace(); else startTrace(); break;
      case 'tr-close': closeTrace(); break;
      case 'tr-first': traceI = 0; renderTraceStep(); break;
      case 'tr-last': if (trace) { traceI = trace.steps.length - 1; renderTraceStep(); } break;
      case 'tr-prev': traceGo(-1); break;
      case 'tr-next': traceGo(1); break;
      case 'tr-play':
        if (tracePlay) { clearInterval(tracePlay); tracePlay = 0; t.textContent = 'Play'; }
        else if (trace) { if (traceI >= trace.steps.length - 1) traceI = 0; t.textContent = 'Pause'; renderTraceStep(); tracePlay = setInterval(() => traceGo(1), 520); }
        break;
      case 'btn-mentor': Mentor.go(); break;
      case 'mentor-stop': Mentor.stop(); break;
      case 'btn-hint': { const s = st(cur.id); if (s.hints < cur.hints.length) { s.hints++; Sfx.play('hint'); save(); closeTrace(); renderHints(); $('hints').lastElementChild.scrollIntoView({ block: 'nearest' }); } break; }
      case 'btn-forgot':
        if (play.mode === 'bug') confirmBox('Show the bug?', 'You will see the line that was changed.' + (play.bug && play.bug.paid && !play.bug.closed ? ' Today’s hunt then ends without XP.' : ''), 'Show it', () => { if (cur && play.mode === 'bug') bugDone(cur, false); });
        else confirmBox('Show the solution?', 'That is fine: forgetting is part of learning. You will see the model solution, and this level comes back tomorrow.', 'Show it', () => { if (cur && play.mode === 'review') reviewDone(cur, false); });
        break;
      case 'btn-reset': {
        const hunt = play.mode === 'bug' ? play.bug : null;
        confirmBox('Reset your code?', hunt ? 'The editor goes back to the code with the bug in it.' : 'The editor goes back to the starting code for this level.' + (play.mode === 'normal' ? ' Your stars are kept.' : ''), 'Reset the code',
          () => { editor.set(hunt ? hunt.code : cur.starter); onCodeChange(); $('results').innerHTML = ''; setStatus(''); lastRes = null; buildArena(); });
        break;
      }
      case 'btn-replay': if (cur && cur.kind === 'robot' && !busy) { World.resetRobot(); editor.markActive(null); } break;
      case 'sol-reveal': confirmBox('Reveal the solution?', 'You will see a full working answer. This level will then award 1 star instead of 3.', 'Reveal it', () => { st(cur.id).saw = true; save(); renderSolution(); }); break;
      case 'sol-load': editor.set(cur.solution); onCodeChange(); showTab('code'); break;
      case 'btn-music': S.music = !S.music; save(); renderHud(); Music.apply(); Sfx.play('click'); break;
      case 'btn-menu': case 'btn-menu2': showMenu(); break;
      case 'btn-codex': case 'btn-codex2': Sfx.play('modal'); showCodex(); break;
      case 'codex-back': showCodex(); break;
      case 'btn-badges': case 'btn-badges2': showBadges(); break;
      case 'btn-lab': case 'btn-lab2': enter(SANDBOX); break;
      case 'btn-review': case 'btn-review2': closeModal(); startReview(); break;
      case 'rv-next': closeModal(); startReview(); break;
      case 'btn-interview': case 'btn-interview2': showInterviews(); break;
      case 'iv-finish': back(); break;
      case 'iv-close': closeModal(); break;
      case 'btn-board': case 'btn-board2': Sfx.play('modal'); showBoard(); break;
      case 'board-toggle': S.board = !S.board; save(); if (S.board) Cloud.flushNow().then(showBoard); else Cloud.leave().then(showBoard); break;
      case 'menu-close': closeModal(); break;
      case 'opt-full': toggleFull(); break;
      case 'opt-install': if (installEvt) { const ev = installEvt; installEvt = null; closeModal(); try { ev.prompt(); } catch (err) { /* the browser declined */ } } break;
      case 'btn-tour':
        S.tour = 0; save(); closeModal();
        if (mode === 'level' && cur && cur.kind !== 'sandbox' && play.mode === 'normal') Tour.start(cur.kind === 'robot' ? 1 : 2, cur);
        else { tourForce = true; toast('The tour starts with the next level you open.'); }
        break;
      case 'btn-savebox': showSaveBox(); break;
      case 'save-copy': copySaveCode(); break;
      case 'save-load': loadSaveCode(); break;
      case 'bug-start': case 'bug-again': startBug(); break;
      case 'coach-next': Tour.next(); break;
      case 'coach-skip': Tour.end(); break;
      case 'menu-reset': confirmBox('Erase all progress?', 'Every solved level, star, badge, review date and saved piece of code will be removed. This cannot be undone.', 'Erase everything', () => {
        const keep = { sound: S.sound, music: S.music, musicVol: S.musicVol, sfxVol: S.sfxVol, board: S.board, ac: S.ac, gfx: S.gfx, ts: S.ts, calm: S.calm, hc: S.hc, track: S.track };
        clearInterval(ivTimer);
        S = Object.assign({ v: 1, cv: 3, levels: {}, unlockAll: false, intro: true, last: null, open: null, speed: 1, days: [], badges: {}, counters: {}, bonus: 0, rvDay: null, iv: null, ivLog: [], t: 0 }, keep);
        save(); if (mode === 'level') closeLevel(); selectLevel(0, true); refreshProgress(); toast('Progress erased.');
      }); break;
      case 'intro-start': closeModal(); selectLevel(0); break;
      case 'intro-skip': S.unlockAll = true; S.intro = true; save(); closeModal(); refreshProgress(); toast('Every level is unlocked. Pick any platform.'); break;
      case 'done-next': { const i = INDEX[cur.id] + 1; closeModal(); if (isUnlocked(i)) openLevel(i); else closeLevel(i - 1); break; }
      case 'done-solution': closeModal(); showTab('solution'); break;
      case 'done-retry': closeModal(); cleanAttempt(); break;
      case 'retry-clean': confirmBox('Start a clean attempt?', 'The editor goes back to the starting code and the hints are hidden again. Solve the level without hints, the mentor or the Solution tab to earn the third star.', 'Start clean', cleanAttempt); break;
      case 'done-tower': { const i = cur && play.mode === 'normal' && INDEX[cur.id] !== undefined ? INDEX[cur.id] : -1; closeModal(); closeLevel(i >= 0 ? i : undefined); if (i >= 0 && i + 1 < LEVELS.length) setTimeout(() => selectLevel(i + 1), 500); break; }
    }
  });
  document.addEventListener('change', e => {
    const id = e.target.id;
    if (id === 'opt-sound') { S.sound = e.target.checked; save(); Sfx.play('click'); }
    else if (id === 'opt-music') { S.music = e.target.checked; save(); renderHud(); Music.apply(); }
    else if (id === 'opt-unlock') { S.unlockAll = e.target.checked; save(); refreshProgress(); }
    else if (id === 'opt-ac') { S.ac = e.target.checked; save(); editor.setComplete(S.ac); }
    else if (id === 'opt-replay') { S.replay = e.target.checked; save(); }
    else if (id === 'opt-pip') { S.pipTalk = e.target.checked; save(); if (!S.pipTalk) hush(); }
    else if (id === 'opt-calm') { S.calm = e.target.checked; save(); applyComfort(); }
    else if (id === 'opt-hc') { S.hc = e.target.checked; save(); applyComfort(); }
    else if (id === 'opt-sfx-vol') Sfx.play('pass');           // let them hear the new level
    else if (id === 'tr-test') startTrace(+e.target.value);
  });
  document.addEventListener('input', e => {
    const id = e.target.id;
    if (id === 'opt-music-vol') { S.musicVol = e.target.value / 100; if (!S.music && S.musicVol > 0) { S.music = true; if ($('opt-music')) $('opt-music').checked = true; renderHud(); } save(); Music.apply(); }
    else if (id === 'opt-sfx-vol') { S.sfxVol = e.target.value / 100; save(); }
    else if (id === 'tr-slider') { traceI = +e.target.value; renderTraceStep(); }
  });
  $('keys').addEventListener('pointerdown', e => { if (e.target.closest('button')) e.preventDefault(); });    // keep the keyboard open on phones
  document.addEventListener('keydown', e => {
    Music.start();
    if (!$('modal').hidden) { if (e.key === 'Escape') closeModal(); return; }
    if (e.key === 'Escape' && Tour.on) { e.preventDefault(); Tour.end(); return; }
    const a = document.activeElement, typing = a && /^(TEXTAREA|INPUT|SELECT)$/.test(a.tagName) && a.type !== 'range', onButton = a && a.tagName === 'BUTTON';
    if (mode === 'hub' && !typing) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); selectLevel(hubSel + 1); }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); selectLevel(hubSel - 1); }
      else if (e.key === 'Enter' && !onButton) openLevel(hubSel);
    } else if (mode === 'level') {
      if (trace && !typing && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) { e.preventDefault(); traceGo(e.key === 'ArrowRight' ? 1 : -1); }
      else if (e.key === 'Escape' && !typing) { if (trace) closeTrace(); else back(); }
      else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !typing) { e.preventDefault(); run(); }
    }
  });
  for (const ev of ['pointerdown', 'pointerup', 'click', 'touchend']) document.addEventListener(ev, () => Music.start(), true);
  window.addEventListener('pagehide', () => { if (cur) { keepCode(); save(); } });
  document.addEventListener('fullscreenchange', () => { const b = $('opt-full'); if (b) b.textContent = (document.fullscreenElement ? 'Leave' : 'Enter') + ' full screen'; World.resize(); });
}
// On a phone the keyboard covers half the screen. When it opens, the page shrinks to the part that is still visible
// and folds the 3D view away, so the editor, the suggestions and the Run button all stay in reach.
function watchViewport() {
  const vv = window.visualViewport, app = $('app');
  if (!vv || !coarse) return;
  let tall = vv.height, wide = vv.width, was = false;
  const fit = () => {
    if (Math.abs(vv.width - wide) > 40) { wide = vv.width; tall = vv.height; }       // the phone was turned
    tall = Math.max(tall, vv.height);
    const a = document.activeElement, typing = !!a && /^(TEXTAREA|INPUT)$/.test(a.tagName), kb = typing && tall - vv.height > 130;
    if (kb) { app.style.height = vv.height + 'px'; app.style.transform = vv.offsetTop ? 'translateY(' + vv.offsetTop + 'px)' : ''; }
    else if (was) { app.style.height = ''; app.style.transform = ''; }
    if (kb !== was) { was = kb; app.classList.toggle('kb', kb); World.resize(); }
  };
  vv.addEventListener('resize', fit);
  vv.addEventListener('scroll', fit);
  document.addEventListener('focusout', () => setTimeout(fit, 60));
}

// ---------------------------------------------------------------- boot
function boot() {
  loadLocal();
  applyComfort();
  if (!LEVELS.length) { document.body.textContent = 'Pylon could not load its levels.'; return; }
  editor = window.PylonEditor($('editor'), { onRun: run, onChange: onCodeChange, strip: $('ac-strip'), complete: S.ac, onPick });
  bind();
  watchViewport();
  // The leaderboard, cloud saves and the mentor need the claude.ai viewer. Anywhere else the game runs on its own and saves in the browser.
  $('btn-board').hidden = !online();
  World.setQuality(S.gfx);
  setMode('hub');
  if (seedReviews()) save();
  checkBadges(true);
  renderHud(); renderFloors();
  const start = () => {
    $('stage').classList.add('ready');
    applyPaint();
    refreshProgress();
    const i = S.last && INDEX[S.last] !== undefined ? INDEX[S.last] : Math.max(0, nextIndex());
    selectLevel(i, true);
    if (S.iv && S.iv.ids && S.iv.ids.every(id => INDEX[id] !== undefined)) {
      if (S.iv.t0 + S.iv.limit > Date.now()) enterInterview(S.iv.at || 0);            // an interview was in progress: the clock kept running
      else { play = { mode: 'interview' }; finishInterview(true); play = { mode: 'normal' }; }
    } else if (S.open === 'sandbox') enter(SANDBOX);
    else if (S.open && INDEX[S.open] !== undefined && isUnlocked(INDEX[S.open])) openLevel(INDEX[S.open]);
    else if (!S.intro) showIntro();
    else if (S.grew) showGrew();
  };
  const ready = RealWorld.ok ? RealWorld.init($('stage'), $('gl'), { levels: LEVELS, zones: ZONES }, { onSelect: i => { Sfx.play('select'); selectLevel(i); }, onOpen: openLevel, sfx: Sfx.play }) : Promise.resolve(false);
  ready.then(ok => { if (!ok) { RealWorld.ok = false; $('nogl').hidden = false; } start(); }).catch(() => { RealWorld.ok = false; $('nogl').hidden = false; start(); });
  // Progress saved from another device arrives a moment after the page starts. Fold it in without disturbing a level in play.
  Cloud.init().then(merged => {
    if (!merged) return;
    tidy(); seedReviews();
    checkBadges(true);
    editor.setComplete(S.ac);
    if (mode !== 'hub') { renderPanelStars(); renderHints(); renderSolution(); return; }
    if (S.intro && $('modal-body').querySelector('.intro')) closeModal();
    selectLevel(S.last && INDEX[S.last] !== undefined ? INDEX[S.last] : Math.max(0, nextIndex()), true);
    refreshProgress();
    Music.apply();
  });
  Mentor.init();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
