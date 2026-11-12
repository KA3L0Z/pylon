/* Pylon runner: runs a player's code against a level. Pure logic (no DOM), shared by the game and the Node validators.
   - Code levels: load the code, then evaluate each test's `call` and compare with `expect`.
   - Robot levels: run the code against a simulated deck and record PIP's actions for the 3D replay. */
(function (root) {
'use strict';
const MP = root.MiniPy, FILE = MP.FILE;
// A speed test allows PERF_FACTOR times the steps of the reference solution: generous enough for any solution of the
// same complexity class (and one log factor worse), far too little for the next class down.
const PERF_FACTOR = 16, PERF_SLACK = 600, TEST_STEPS = 3000000, LOAD_STEPS = 3000000, ROBOT_STEPS = 400000, MAX_ACTIONS = 500;
let PRELUDE = root.PYLON_PRELUDE || '';

// What one run hands the program: the lines input() will read, and its files. A level can give files to all its tests.
const ioOf = (level, t) => ({ stdin: t && t.stdin !== undefined ? t.stdin : (level && level.stdin) || '', files: Object.assign({}, level && level.files, t && t.files) });
function setIo(s, io) { s.setInput(io && io.stdin !== undefined ? io.stdin : ''); s.setFiles((io && io.files) || {}); }
function session(builtins, io) {
  const s = new MP.Session({ builtins, echo: !!(io && io.echo) });
  if (PRELUDE) {
    const r = s.exec(PRELUDE, FILE);
    if (!r.ok) throw new Error('Pylon prelude failed: ' + r.error.type + ': ' + r.error.message + ' (line ' + (r.error.line % FILE) + ')');
  }
  s.output = '';
  if (io) setIo(s, io);
  return s;
}
// The line in the player's own code that an error points at (helper code is tagged with FILE offsets).
function userLine(error) {
  if (!error) return null;
  if (error.line > 0 && error.line < FILE) return error.line;
  for (let i = error.trace.length - 1; i >= 0; i--) { const l = error.trace[i].line; if (l > 0 && l < FILE) return l; }
  return null;
}
const clip = (s, n) => s.length > n ? s.slice(0, n - 1) + '…' : s;
function normOut(s) {
  const lines = String(s).replace(/\r\n/g, '\n').split('\n').map(l => l.replace(/\s+$/, ''));
  while (lines.length && lines[lines.length - 1] === '') lines.pop();
  return lines.join('\n');
}
function countLines(code) { return code.split('\n').filter(l => l.trim() && l.trim()[0] !== '#').length; }

// ---------------------------------------------------------------- code levels
const REF = Object.create(null);
// Steps the reference solution needs on each perf test. Speed limits are a multiple of this.
function refSteps(level) {
  if (REF[level.id]) return REF[level.id];
  const s = session(null, ioOf(level, null)), steps = [];
  s.exec(level.solution, FILE * 90, 5e7);
  level.tests.forEach((t, i) => {
    const base = FILE * (2 + i);
    if (t.stdout !== undefined) return;
    setIo(s, ioOf(level, t));
    if (t.setup) s.exec(t.setup, base, 5e7);
    const r = s.eval(t.call, base, 5e7);
    steps[i] = r.ok ? r.steps : 5e7;
  });
  return REF[level.id] = steps;
}
function runTests(level, code, opts) {
  opts = opts || {};
  const res = { kind: 'code', ok: false, error: null, errorLine: null, output: '', tests: [], lines: countLines(code) };
  const printed = level.tests.some(t => t.stdout !== undefined);
  // A program that is judged by what it prints runs once for every test, each time with that test's input and files.
  const s = session(null, ioOf(level, printed ? level.tests[0] : null));
  const load = s.exec(code, 0, LOAD_STEPS);
  res.output = load.output;
  if (!load.ok) { res.error = load.error; res.errorLine = userLine(load.error); return res; }
  if (printed) {
    level.tests.forEach((t, i) => {
      const r = i === 0 ? load : session(null, ioOf(level, t)).exec(code, 0, LOAD_STEPS);
      res.tests.push({ index: i, ok: r.ok && normOut(r.output) === normOut(t.stdout), stdout: true, expect: normOut(t.stdout), got: normOut(r.output), stdin: t.stdin !== undefined ? String(t.stdin) : null,
        error: r.ok ? null : r.error, errorLine: r.ok ? null : userLine(r.error), steps: r.steps });
    });
    res.ok = res.tests.every(t => t.ok);
    return res;
  }
  const ref = refSteps(level);
  level.tests.forEach((t, i) => {
    const base = FILE * (2 + i);
    const tr = { index: i, ok: false, show: t.show || t.call, expect: t.expect, got: null, error: null, errorLine: null, perf: !!t.perf, steps: 0, budget: null, slow: false, output: '' };
    res.tests.push(tr);
    if (!t.show && /^ops\(/.test(t.call.trim())) {       // design tests read better as a chain of calls
      const d = s.eval('_ops_text' + t.call.trim().slice(3), base, 200000);
      if (d.ok && typeof d.value === 'string') tr.show = d.value;
    }
    const io = ioOf(level, t);
    setIo(s, io);
    if (Object.keys(io.files).length) tr.files = io.files;
    if (t.setup) {
      const r = s.exec(t.setup, base, TEST_STEPS);
      tr.output += r.output;
      if (!r.ok) { tr.error = r.error; tr.errorLine = userLine(r.error); return; }
    }
    const budget = t.perf && !opts.noLimit ? Math.round(ref[i] * PERF_FACTOR + PERF_SLACK) : (opts.noLimit ? 6e7 : TEST_STEPS);
    if (t.perf) { tr.budget = Math.round(ref[i] * PERF_FACTOR + PERF_SLACK); tr.refSteps = ref[i]; }
    const r = s.eval(t.call, base, budget);
    tr.output += r.output; tr.steps = r.steps;
    if (!r.ok) { tr.error = r.error; tr.errorLine = userLine(r.error); tr.slow = r.error.abort === 'steps'; return; }
    const want = s.eval(t.expect, base, TEST_STEPS);
    if (!want.ok) { tr.error = want.error; return; }
    tr.got = clip(s.repr(r.value), 400);
    tr.ok = s.equal(r.value, want.value);
  });
  res.ok = res.tests.every(t => t.ok);
  // How the player's code compares with the model solution, in interpreter steps over all tests.
  res.steps = res.tests.reduce((a, t) => a + t.steps, 0);
  res.refSteps = ref.reduce((a, n) => a + (n || 0), 0);
  return res;
}
// Run code with no tests: the scratchpad and the "run this example" buttons in lessons.
function runFree(code, maxSteps, io) {
  const s = session(null, io || null), r = s.exec(code, 0, maxSteps || LOAD_STEPS);
  return { kind: 'sandbox', ok: r.ok, error: r.error, errorLine: userLine(r.error), output: r.output, steps: r.steps, tests: [], runs: [], files: s.files(), inputLeft: s.io.stdin.length - s.io.pos };
}

// ---------------------------------------------------------------- step-by-step trace
const TRACE_MAX = 500;
function safeRepr(v) { try { return MP.repr(v); } catch (e) { return '<' + MP.tn(v) + '>'; } }
// A short, readable picture of a value: long containers are cut, linked lists show their chain, trees their shape.
function brief(v, depth) {
  depth = depth || 0;
  if (v === null || typeof v !== 'object') return clip(MP.repr(v), 80);
  if (v instanceof MP.PyFloat) return MP.repr(v);
  if (Array.isArray(v) || v instanceof MP.PyTuple) {
    const list = Array.isArray(v), a = list ? v : v.a, open = list ? '[' : '(', close = list ? ']' : ')';
    if (depth > 2) return open + (a.length ? '…' : '') + close;
    const parts = [];
    for (let i = 0; i < a.length && i < 12; i++) parts.push(brief(a[i], depth + 1));
    return clip(open + parts.join(', ') + (a.length > 12 ? ', … ' + (a.length - 12) + ' more' : '') + (!list && a.length === 1 ? ',' : '') + close, 110);
  }
  if (v instanceof MP.PyDict) {
    if (depth > 2) return '{…}';
    const parts = [];
    let n = 0;
    for (const e of v.m.values()) { if (n++ >= 8) break; parts.push(brief(e[0], depth + 1) + ': ' + brief(e[1], depth + 1)); }
    return clip('{' + parts.join(', ') + (v.m.size > 8 ? ', … ' + (v.m.size - 8) + ' more' : '') + '}', 110);
  }
  if (v instanceof MP.PySet) {
    if (!v.m.size) return v.frozen ? 'frozenset()' : 'set()';
    const parts = [];
    let n = 0;
    for (const k of v.m.values()) { if (n++ >= 10) break; parts.push(brief(k, depth + 1)); }
    return clip('{' + parts.join(', ') + (v.m.size > 10 ? ', …' : '') + '}', 110);
  }
  if (v instanceof MP.PyDeque) return 'deque(' + brief(v.a, depth) + ')';
  if (v instanceof MP.PyObj) {
    const d = v.d;
    if (d.val !== undefined && d.next !== undefined && d.left === undefined) {
      const parts = [];
      let node = v, n = 0;
      while (node instanceof MP.PyObj && node.d.val !== undefined && n < 10) { parts.push(brief(node.d.val, 3)); node = node.d.next; n++; }
      return parts.join(' → ') + (node === null || node === undefined ? ' → None' : ' → …');
    }
    if (d.val !== undefined && d.left !== undefined && d.right !== undefined) {
      const tree = (nd, k) => !(nd instanceof MP.PyObj) ? '·' : k > 3 ? '…' : brief(nd.d.val, 3) + (nd.d.left === null && nd.d.right === null ? '' : '(' + tree(nd.d.left, k + 1) + ', ' + tree(nd.d.right, k + 1) + ')');
      return clip(tree(v, 0), 110);
    }
    if (v.cls.exc || MP.userSpecial(v, '__repr__')) return clip(safeRepr(v), 80);
    if (depth > 1) return v.cls.name + '(…)';
    const parts = [];
    let n = 0;
    for (const k in d) { if (n++ >= 6) { parts.push('…'); break; } parts.push(k + '=' + brief(d[k], depth + 1)); }
    return clip(v.cls.name + '(' + parts.join(', ') + ')', 110);
  }
  if (v instanceof MP.PyFunc) return '<function ' + v.name + '>';
  if (v instanceof MP.PyClass) return '<class ' + v.name + '>';
  if (v instanceof MP.PyGen) return '<generator ' + v.fn.name + '>';
  return clip(safeRepr(v), 80);
}
// Runs the code (and one test call for code levels) while recording, before every line of the player's code,
// which line is next and what every variable holds. Returns the recording for the step-by-step viewer.
function traceRun(level, code, testIndex, io) {
  const out = { ok: false, error: null, errorLine: null, steps: [], start: 0, truncated: false, label: 'your program', result: null, expect: null, output: '' };
  const first = level.kind === 'code' && level.tests.length ? (level.tests[testIndex] || level.tests[0]) : null;
  const s = session(null, io || ioOf(level, first)), R = MP.R, prelude = new Set(Object.keys(s.G));
  let busy = false, base = 0;
  const isCallable = v => v instanceof MP.PyFunc || v instanceof MP.PyClass || v instanceof MP.PyModule || v instanceof MP.PyBuiltin;
  const globalsNow = raw => { for (const k in s.G) { if (raw.length >= 16) break; const v = s.G[k]; if (!prelude.has(k) && k.slice(0, 2) !== '__' && !isCallable(v)) raw.push([k, v]); } return raw; };
  // Besides the text of every variable, each step keeps a description the viewer can draw: sequences cell by cell,
  // dictionaries pair by pair, linked nodes by identity (so two names for the same node are seen to be the same node).
  const ids = new WeakMap();
  let nextId = 1;
  const idOf = o => { let i = ids.get(o); if (!i) { i = nextId++; ids.set(o, i); } return i; };
  const isNode = v => v instanceof MP.PyObj && v.d.val !== undefined && v.d.next !== undefined && v.d.left === undefined;
  const cell = v => clip(brief(v, 2), 14);
  function shape(name, v, nodes) {
    if (typeof v === 'number') return Number.isInteger(v) ? { n: name, k: 'num', v } : null;
    if (typeof v === 'string') return v.length && v.length <= 48 ? { n: name, k: 'seq', t: 'str', len: v.length, items: Array.from(v) } : null;
    if (v === null || typeof v !== 'object') return null;
    const list = Array.isArray(v), arr = list ? v : v instanceof MP.PyTuple || v instanceof MP.PyDeque ? v.a : null;
    if (arr) {
      if (list && arr.length && arr.length <= 12 && Array.isArray(arr[0]) && arr[0].length > 0 && arr[0].length <= 14 && arr.every(r => Array.isArray(r) && r.length === arr[0].length))
        return { n: name, k: 'grid', id: idOf(v), h: arr.length, w: arr[0].length, rows: arr.map(r => r.map(cell)) };
      return { n: name, k: 'seq', t: list ? 'list' : v instanceof MP.PyTuple ? 'tuple' : 'deque', id: idOf(v), len: arr.length, items: arr.slice(0, 26).map(cell) };
    }
    if (v instanceof MP.PyDict) {
      const entries = [];
      for (const e of v.m.values()) { if (entries.length >= 10) break; entries.push([cell(e[0]), cell(e[1])]); }
      return { n: name, k: 'map', id: idOf(v), len: v.m.size, entries };
    }
    if (v instanceof MP.PySet) {
      const items = [];
      for (const x of v.m.values()) { if (items.length >= 14) break; items.push(cell(x)); }
      return { n: name, k: 'set', id: idOf(v), len: v.m.size, items };
    }
    if (isNode(v)) {
      let node = v, n = 0;
      while (isNode(node) && n++ < 16) {
        const id = idOf(node);
        if (nodes[id]) break;
        nodes[id] = { v: cell(node.d.val), next: isNode(node.d.next) ? idOf(node.d.next) : null };
        node = node.d.next;
      }
      return { n: name, k: 'node', id: idOf(v) };
    }
    return null;
  }
  // Turns [name, value] pairs into what a step stores: text for the table, shapes for the picture.
  function describe(raw, vars, viz, nodes) {
    for (const p of raw) {
      vars.push([p[0], brief(p[1], 0)]);
      if (viz.length >= 12) continue;
      const sh = shape(p[0], p[1], nodes);
      if (sh) viz.push(sh);
      else if (p[0] === 'self' && p[1] instanceof MP.PyObj) {              // the fields of the object a method works on
        for (const k in p[1].d) { const inner = shape('self.' + k, p[1].d[k], nodes); if (inner && inner.k !== 'num' && viz.length < 12) viz.push(inner); }
      }
    }
  }
  const rec = (L, sc, ret) => {
    if (busy || L >= FILE || L <= 0) return;
    if (out.steps.length >= TRACE_MAX) { out.truncated = true; R.trace = null; return; }
    busy = true;
    const steps = R.steps, line = R.line, max = R.max, depth = R.calls.length;
    R.max = steps + 20000;
    const vars = [], viz = [], nodes = {}, raw = [], stack = [];
    let fn = 'main program', retText = null;
    try {
      if (sc && sc.s && sc.fn) {
        fn = sc.fn.name;
        const names = sc.fn.code.vars || [];
        for (let i = 0; i < names.length && raw.length < 16; i++) if (sc.s[i] !== undefined) raw.push([names[i], sc.s[i]]);
      } else if (sc && sc.ns) {
        fn = 'class body';
      } else {
        globalsNow(raw);
      }
      describe(raw, vars, viz, nodes);
      if (ret !== undefined) retText = brief(ret, 0);
      for (let i = 1; i < depth; i += 2) if (!prelude.has(R.calls[i])) stack.push(String(R.calls[i]));       // who called whom, outermost first
    } catch (e) { /* a value that cannot be shown is left out */ }
    out.steps.push({ line: L, fn, depth: depth / 2, vars, viz, nodes, stack, out: base + R.outLen, ret: retText });
    R.steps = steps; R.line = line; R.max = max; R.calls.length = depth;
    busy = false;
  };
  const phase = r => { out.output += r.output; base = out.output.length; };
  const load = s.exec(code, 0, LOAD_STEPS, rec);
  phase(load);
  if (!load.ok) { out.error = load.error; out.errorLine = userLine(load.error); return out; }
  const t = level.kind === 'code' && level.tests.length && level.tests[0].stdout === undefined ? (level.tests[testIndex] || level.tests[0]) : null;
  if (!t) {
    // Every step shows a line before it runs, so a whole program gets one more picture: how things stand at the end.
    if (!out.truncated) {
      const vars = [], viz = [], nodes = {};
      R.steps = 0; R.max = 20000;
      try { describe(globalsNow([]), vars, viz, nodes); } catch (e) { /* show what could be read */ }
      out.steps.push({ line: 0, fn: 'main program', depth: 0, vars, viz, nodes, stack: [], out: out.output.length, ret: null, end: true });
    }
    out.ok = true;
    return out;
  }
  out.start = out.steps.length;          // the viewer opens on the call, past the lines that only define things
  const tb = FILE * (2 + level.tests.indexOf(t));
  out.label = t.show || t.call;
  if (!t.show && /^ops\(/.test(t.call.trim())) { const d = s.eval('_ops_text' + t.call.trim().slice(3), tb, 200000); if (d.ok && typeof d.value === 'string') out.label = d.value; }
  setIo(s, ioOf(level, t));
  if (t.setup) { const r = s.exec(t.setup, tb, TEST_STEPS); phase(r); if (!r.ok) { out.error = r.error; out.errorLine = userLine(r.error); return out; } }
  const r = s.eval(t.call, tb, TEST_STEPS, rec);
  phase(r);
  if (!r.ok) { out.error = r.error; out.errorLine = userLine(r.error); return out; }
  out.ok = true;
  out.result = clip(s.repr(r.value), 300);
  out.expect = t.expect;
  return out;
}

// ---------------------------------------------------------------- robot levels
const DIRS = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] }, ORDER = ['N', 'E', 'S', 'W'];
if (!MP.EXC.RobotCrash) MP.mkExcClass('RobotCrash', MP.EXC.BaseException);
// Map characters: '#' wall, '.' floor, 'S' start, 'E' beacon, 'o' data shard, ' ' nothing (open air).
function parseMap(m) {
  const h = m.grid.length, w = Math.max.apply(null, m.grid.map(r => r.length)), cells = [], shards = [];
  let start = null, exit = null;
  for (let y = 0; y < h; y++) {
    cells.push([]);
    for (let x = 0; x < w; x++) {
      const c = m.grid[y][x] || ' ';
      cells[y].push(c === '#' ? 'wall' : c === ' ' ? 'void' : 'floor');
      if (c === 'S') start = [x, y];
      else if (c === 'E') exit = [x, y];
      else if (c === 'o') shards.push([x, y]);
    }
  }
  return { w, h, cells, start, exit, shards, dir: m.dir || 'E' };
}
function simulate(level, map, code) {
  const w = parseMap(map), actions = [];
  const st = { x: w.start[0], y: w.start[1], dir: w.dir, left: new Set(w.shards.map(p => p[0] + ',' + p[1])) };
  const cellAt = (x, y) => (y < 0 || y >= w.h || x < 0 || x >= w.w) ? 'void' : w.cells[y][x];
  const turned = t => ORDER[(ORDER.indexOf(st.dir) + t + 4) % 4];
  const ahead = t => { const d = DIRS[turned(t)]; return [st.x + d[0], st.y + d[1]]; };
  const crash = (msg, kind, tx, ty) => {
    actions.push({ t: 'crash', kind, x: st.x, y: st.y, tx, ty, dir: st.dir, line: MP.R.line });
    throw MP.err('RobotCrash', msg);
  };
  const act = a => {
    if (actions.length >= MAX_ACTIONS) crash('PIP ran out of power after ' + MAX_ACTIONS + ' actions. A loop is probably running forever.', 'power');
    a.line = MP.R.line;
    actions.push(a);
  };
  const noArgs = (name, args) => { if (args.length) throw MP.err('TypeError', name + '() takes no arguments. To do it several times, put it in a loop.'); };
  const api = {
    move(args) {
      noArgs('move', args);
      const p = ahead(0), c = cellAt(p[0], p[1]);
      if (c === 'wall') crash('PIP bumped into a wall.', 'wall', p[0], p[1]);
      if (c === 'void') crash('PIP drove off the edge of the deck.', 'edge', p[0], p[1]);
      act({ t: 'move', x: p[0], y: p[1], dir: st.dir });
      st.x = p[0]; st.y = p[1];
      return null;
    },
    turn_left(args) { noArgs('turn_left', args); st.dir = turned(-1); act({ t: 'turn', dir: st.dir, by: -1 }); return null; },
    turn_right(args) { noArgs('turn_right', args); st.dir = turned(1); act({ t: 'turn', dir: st.dir, by: 1 }); return null; },
    collect(args) {
      noArgs('collect', args);
      const k = st.x + ',' + st.y;
      if (!st.left.has(k)) crash('There is no data shard here to collect.', 'empty');
      act({ t: 'collect', x: st.x, y: st.y });
      st.left.delete(k);
      return null;
    },
    front_is_clear() { const p = ahead(0); return cellAt(p[0], p[1]) === 'floor'; },
    left_is_clear() { const p = ahead(-1); return cellAt(p[0], p[1]) === 'floor'; },
    right_is_clear() { const p = ahead(1); return cellAt(p[0], p[1]) === 'floor'; },
    on_shard() { return st.left.has(st.x + ',' + st.y); },
    at_beacon() { return !!w.exit && st.x === w.exit[0] && st.y === w.exit[1]; },
    shards_left() { return st.left.size; },
  };
  const builtins = {};
  Object.keys(api).forEach(name => { builtins[name] = new MP.PyBuiltin(name, args => api[name](args)); });
  const s = session(builtins);
  const r = s.exec(code, 0, ROBOT_STEPS);
  const run = { ok: false, reason: null, error: null, errorLine: null, output: r.output, actions, world: w, crashed: false };
  if (!r.ok) {
    run.errorLine = userLine(r.error);
    if (r.error.type === 'RobotCrash') { run.crashed = true; run.reason = r.error.message; }
    else run.error = r.error;
    return run;
  }
  const atExit = api.at_beacon(), left = st.left.size, goal = level.goal || 'beacon';
  if ((goal === 'shards' || goal === 'both') && left) run.reason = left === 1 ? 'One data shard is still on the deck.' : left + ' data shards are still on the deck.';
  else if ((goal === 'beacon' || goal === 'both') && !atExit) run.reason = 'PIP stopped before reaching the beacon.';
  else run.ok = true;
  return run;
}
function runRobot(level, code) {
  const res = { kind: 'robot', ok: false, runs: [], lines: countLines(code), tooLong: false, output: '' };
  if (level.maxLines && res.lines > level.maxLines) res.tooLong = true;
  for (let i = 0; i < level.maps.length; i++) {
    const run = simulate(level, level.maps[i], code);
    run.map = i;
    res.runs.push(run);
    res.output += run.output;
    if (!run.ok) break;
  }
  res.ok = !res.tooLong && res.runs.length === level.maps.length && res.runs.every(r => r.ok);
  return res;
}
function run(level, code, opts) { return level.kind === 'robot' ? runRobot(level, code) : level.kind === 'sandbox' ? runFree(code, 0, opts && opts.io) : runTests(level, code, opts); }
// Quick syntax check for the editor: null when the code parses, else { line, message, type }.
function syntaxError(code) {
  try { MP.parse(code, 0); return null; }
  catch (e) { if (e instanceof MP.PySyntax) return { line: e.line, message: e.msg, type: e.kind }; return null; }
}

root.PylonRunner = { run, runTests, runRobot, runFree, traceRun, brief, simulate, parseMap, refSteps, userLine, syntaxError, countLines, normOut, session, ioOf,
  setPrelude(src) { PRELUDE = src; }, PERF_FACTOR, FILE };
if (typeof module !== 'undefined' && module.exports) module.exports = root.PylonRunner;
})(typeof window !== 'undefined' ? window : globalThis);
