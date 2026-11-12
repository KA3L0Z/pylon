/* Pylon's scenes: what stands in the arena for a code level, and what happens there when the player's code runs.

   A drone level has a deck you can see and a goal on it. A code level used to have neither: write a function, watch the
   same crystals. Here every code level gets a scene built from one of its tests. The inputs of the test stand in the
   arena (power cells, crates, a bridge, a grid, a chain), and the value the player's function returned is acted out on
   them: PIP fetches the cells it picked, crosses the bridge it said was safe, pours the amount it counted. A wrong
   answer goes visibly wrong.

   This file is the plain logic and has no graphics in it, so tools/check_scenes.js can run all of it in Node:
     plan(level, i)        -> { type, stage, act }   stage: what to build; act(got, ok): the beats to play
   js/world.js draws a stage and plays the beats. The vocabulary of both is listed at the end of this file.

   There are ten kinds of scene, and two levels in a row never use the same one. */
(function (root) {
'use strict';

// ---------------------------------------------------------------- reading Python values
// Tests are written as Python text ("two_sum([2, 7, 11, 15], 9)", "[0, 1]") and results come back as Python text too.
// This reads the part of the language those use: numbers, strings, lists, tuples, dicts, sets, names and plain calls.
function reader(src, at) {
  let i = at || 0;
  const ws = () => { while (i < src.length && /\s/.test(src[i])) i++; };
  const bad = what => { throw new Error('cannot read ' + what + ' at ' + i); };
  function str(raw) {
    const q = src[i], end = src.startsWith(q + q + q, i) ? q + q + q : q;
    i += end.length;
    let out = '';
    while (i < src.length && !src.startsWith(end, i)) {
      if (src[i] === '\\' && !raw) {
        const n = src[i + 1];
        i += 2;
        if (n === 'n') out += '\n'; else if (n === 't') out += '\t'; else if (n === 'r') out += '\r';
        else if (n === 'x') { out += String.fromCharCode(parseInt(src.substr(i, 2), 16)); i += 2; }
        else if (n === 'u') { out += String.fromCharCode(parseInt(src.substr(i, 4), 16)); i += 4; }
        else out += n;
      } else out += src[i++];
    }
    if (i >= src.length) bad('a string');
    i += end.length;
    return out;
  }
  function list(close) {
    i++;
    const out = [];
    let comma = false;
    ws();
    while (i < src.length && src[i] !== close) {
      out.push(value());
      ws();
      if (src[i] === ',') { comma = true; i++; ws(); } else if (src[i] !== close) bad('a list');
    }
    if (src[i] !== close) bad('a list');
    i++;
    if (close === ')') { if (out.length === 1 && !comma) return out[0]; out.tuple = true; }
    return out;
  }
  function braces() {
    i++; ws();
    if (src[i] === '}') { i++; return { dict: [] }; }
    const first = value();
    ws();
    if (src[i] === ':') {
      const pairs = [];
      let key = first;
      for (;;) {
        i++;
        pairs.push([key, value()]);
        ws();
        if (src[i] !== ',') break;
        i++; ws();
        if (src[i] === '}') break;
        key = value();
        ws();
        if (src[i] !== ':') bad('a dictionary');
      }
      if (src[i] !== '}') bad('a dictionary');
      i++;
      return { dict: pairs };
    }
    const items = [first];
    while (src[i] === ',') { i++; ws(); if (src[i] === '}') break; items.push(value()); ws(); }
    if (src[i] !== '}') bad('a set');
    i++;
    return { set: items };
  }
  function word() {
    const w = /^[A-Za-z_][\w.]*/.exec(src.slice(i))[0];
    i += w.length;
    if ((src[i] === '"' || src[i] === "'") && /^[rRbBuUfF]{1,2}$/.test(w)) return str(/r/i.test(w));
    if (w === 'True') return true;
    if (w === 'False') return false;
    if (w === 'None') return null;
    if (w === 'inf') return Infinity;
    if (w === 'nan') return NaN;
    if (src[i] !== '(') return { name: w };
    i++;
    const args = [], kw = {};
    ws();
    while (i < src.length && src[i] !== ')') {
      const k = /^([A-Za-z_]\w*)\s*=(?!=)/.exec(src.slice(i));
      if (k) { i += k[0].length; kw[k[1]] = value(); } else args.push(value());
      ws();
      if (src[i] === ',') { i++; ws(); } else if (src[i] !== ')') bad('a call');
    }
    if (src[i] !== ')') bad('a call');
    i++;
    return { call: w, args, kw };
  }
  function value() {
    ws();
    const c = src[i];
    if (c === '[') return list(']');
    if (c === '(') return list(')');
    if (c === '{') return braces();
    if (c === '"' || c === "'") return str(false);
    if (src.startsWith('-inf', i)) { i += 4; return -Infinity; }
    const n = /^[-+]?(?:\d[\d_]*\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/.exec(src.slice(i));
    if (n) { i += n[0].length; return Number(n[0].replace(/_/g, '')); }
    if (c !== undefined && /[A-Za-z_]/.test(c)) return word();
    return bad('a value');
  }
  return { value, rest: () => src.slice(i) };
}
function parse(src) {
  const r = reader(String(src), 0), v = r.value();
  if (r.rest().trim()) throw new Error('more than one value');
  return v;
}
// A value that could not be read is kept as its text.
function read(src) { try { return parse(src); } catch (e) { return { raw: String(src) }; } }
// The first call to one of the named functions in a piece of test code, with its arguments read.
function findCall(text, names) {
  let best = -1;
  for (const n of names) {
    const m = new RegExp('(^|[^\\w.])' + n.replace(/[.$]/g, '\\$&') + '\\s*\\(').exec(text);
    if (m && (best < 0 || m.index + m[1].length < best)) best = m.index + m[1].length;
  }
  if (best < 0) return null;
  try { const v = reader(text, best).value(); return v && v.call ? v : null; } catch (e) { return null; }
}
// linked([1, 2]) and tree([1, 2]) are the test helpers that build a structure from a list: the scene works on the list.
function un(v) {
  if (v && v.call && /^(linked|tree|list|tuple|sorted)$/.test(v.call)) return un(v.args[0] === undefined ? [] : v.args[0]);
  if (Array.isArray(v)) { const out = v.map(un); if (v.tuple) out.tuple = true; return out; }
  return v;
}
const numText = n => (Number.isInteger(n) ? String(n) : !isFinite(n) ? (n > 0 ? 'inf' : n < 0 ? '-inf' : 'nan') : String(Math.round(n * 1000) / 1000));
// A value as Python would print it, cut to fit a label.
function show(v, cap) {
  let s;
  if (v === null || v === undefined) s = 'None';
  else if (v === true) s = 'True';
  else if (v === false) s = 'False';
  else if (typeof v === 'number') s = numText(v);
  else if (typeof v === 'string') s = '"' + v.replace(/\n/g, '\\n') + '"';
  else if (Array.isArray(v)) s = (v.tuple ? '(' : '[') + v.map(x => show(x)).join(', ') + (v.tuple && v.length === 1 ? ',' : '') + (v.tuple ? ')' : ']');
  else if (v.dict) s = '{' + v.dict.map(p => show(p[0]) + ': ' + show(p[1])).join(', ') + '}';
  else if (v.set) s = v.set.length ? '{' + v.set.map(x => show(x)).join(', ') + '}' : 'set()';
  else if (v.raw !== undefined) s = v.raw;
  else if (v.name) s = v.name;
  else if (v.call) s = v.call + '(' + v.args.map(x => show(x)).join(', ') + ')';
  else s = String(v);
  return cap && s.length > cap ? s.slice(0, Math.max(1, cap - 1)) + '…' : s;
}
const bare = (v, cap) => (typeof v === 'string' ? (cap && v.length > cap ? v.slice(0, cap - 1) + '…' : v) : show(v, cap));     // text without its quotes
function same(a, b) {
  if (typeof a === 'number' && typeof b === 'number') return a === b || Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
  if (Array.isArray(a) && Array.isArray(b)) return !!a.tuple === !!b.tuple && a.length === b.length && a.every((x, k) => same(x, b[k]));
  if (a && b && typeof a === 'object' && typeof b === 'object') return show(a) === show(b);
  return a === b;
}
const kindOf = v => (v === null || v === undefined ? 'None' : typeof v === 'boolean' ? 'True or False' : typeof v === 'number' ? 'a number' : typeof v === 'string' ? 'text' : Array.isArray(v) ? (v.tuple ? 'a tuple' : 'a list') : v.dict ? 'a dictionary' : v.set ? 'a set' : 'something else');
const uniq = list => list.filter((v, k) => list.findIndex(x => same(x, v)) === k);
const isNum = v => typeof v === 'number' && isFinite(v);
const plural = (n, word) => n + ' ' + word + (n === 1 ? '' : 's');
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
function need(ok) { if (!ok) throw new Error('this test does not fit the scene'); }

// ---------------------------------------------------------------- beats, and the pieces of a stage
const B = {
  go: (to, more) => Object.assign({ a: 'go', to }, more), hop: (to, more) => Object.assign({ a: 'hop', to }, more), zap: id => ({ a: 'zap', id }),
  mark: (id, s) => ({ a: 'mark', id, s }), add: (p, from) => ({ a: 'new', p, from: from || null }), txt: (id, t, tone) => ({ a: 'txt', id, t: String(t), tone: tone || '' }),
  note: (t, s) => ({ a: 'note', t, s: s || '' }), wait: t => ({ a: 'wait', t }), all: b => ({ a: 'all', b }), pip: what => ({ a: 'pip', do: what }), end: ok => ({ a: 'end', ok: !!ok }),
};
const fail = text => [B.note(text, 'bad'), B.pip('sad'), B.end(false)];
const rowX = (n, k, pitch) => (k - (n - 1) / 2) * pitch;
const widthFor = (labels, most) => clamp(labels.reduce((a, t) => Math.max(a, String(t).length), 1) / 4.2, 1, most || 2.7);       // a long label gets a wider crate
const capRow = (labels, max) => (labels.length > max ? labels.slice(0, max - 1).concat(['+' + (labels.length - max + 1)]) : labels);
const WALL = 36;                                     // letters to a line of the signal wall
const line = (s, max) => { s = String(s).replace(/\t/g, '  '); max = max || WALL; return s.length > max ? s.slice(0, max - 1) + '…' : s; };
const ordinal = k => k + (k % 10 === 1 && k !== 11 ? 'st' : k % 10 === 2 && k !== 12 ? 'nd' : k % 10 === 3 && k !== 13 ? 'rd' : 'th');
const textOf = v => (typeof v === 'string' ? v : show(v, 240));

// ---------------------------------------------------------------- what is really true about a test
// A scene shows why an answer is right or wrong: the two prices of the best trade, the bracket that does not close.
// These work that out. Whether the player passed never depends on them: that is always the test's own verdict.
const TRUE = {
  mirror(chars) { for (let i = 0, j = chars.length - 1; i < j; i++, j--) if (chars[i] !== chars[j]) return i; return -1; },
  brackets(s) {
    const open = [], pair = { ')': '(', ']': '[', '}': '{' };
    for (let i = 0; i < s.length; i++) { if ('([{'.indexOf(s[i]) >= 0) open.push(s[i]); else if (pair[s[i]] && open.pop() !== pair[s[i]]) return i; }
    return open.length ? s.length - 1 : -1;
  },
  jumps(nums) {                                       // where PIP lands, always taking the hop that reaches farthest
    const n = nums.length, steps = [];
    let i = 0;
    while (i < n - 1) {
      let best = -1, reach = -1;
      for (let j = i + 1; j <= Math.min(n - 1, i + nums[i]); j++) { if (j === n - 1) { best = j; break; } if (j + nums[j] > reach) { reach = j + nums[j]; best = j; } }
      if (best < 0) return { steps, stuck: i };
      steps.push(best);
      i = best;
    }
    return { steps, stuck: -1 };
  },
  window(s) { let a = 0, best = [0, 0]; const last = {}; for (let i = 0; i < s.length; i++) { if (last[s[i]] !== undefined && last[s[i]] >= a) a = last[s[i]] + 1; last[s[i]] = i; if (i + 1 - a > best[1] - best[0]) best = [a, i + 1]; } return best; },
  trade(p) { let lo = 0, best = [0, 0, 0]; for (let i = 1; i < p.length; i++) { if (p[i] < p[lo]) lo = i; if (p[i] - p[lo] > best[2]) best = [lo, i, p[i] - p[lo]]; } return best; },
  surge(a) { let best = -Infinity, from = 0, to = 0, cur = 0, start = 0; for (let i = 0; i < a.length; i++) { if (cur <= 0) { cur = a[i]; start = i; } else cur += a[i]; if (cur > best) { best = cur; from = start; to = i; } } return [from, to, best]; },
  rising(a) {
    const n = a.length, len = Array(n).fill(1), prev = Array(n).fill(-1), out = [];
    let end = 0;
    for (let i = 0; i < n; i++) { for (let j = 0; j < i; j++) if (a[j] < a[i] && len[j] + 1 > len[i]) { len[i] = len[j] + 1; prev[i] = j; } if (len[i] > len[end]) end = i; }
    for (let k = n ? end : -1; k >= 0; k = prev[k]) out.unshift(k);
    return out;
  },
  skip(a) {                                           // the cells to take when no two may be neighbours
    const n = a.length, best = Array(n + 2).fill(0), out = [];
    for (let i = n - 1; i >= 0; i--) best[i] = Math.max(best[i + 1], a[i] + best[i + 2]);
    for (let i = 0; i < n;) { if (a[i] + best[i + 2] === best[i] && a[i] > 0) { out.push(i); i += 2; } else i++; }
    return out;
  },
  coins(coins, amount) {
    if (!(amount >= 0 && amount <= 500)) return null;
    const dp = Array(amount + 1).fill(Infinity), from = Array(amount + 1).fill(0), out = [];
    dp[0] = 0;
    for (let v = 1; v <= amount; v++) for (const c of coins) if (c > 0 && c <= v && dp[v - c] + 1 < dp[v]) { dp[v] = dp[v - c] + 1; from[v] = c; }
    if (!isFinite(dp[amount])) return null;
    for (let v = amount; v > 0; v -= from[v]) out.push(from[v]);
    return out.sort((x, y) => y - x);
  },
  water(h) {
    const n = h.length, L = Array(n).fill(0), R = Array(n).fill(0);
    for (let i = 1; i < n; i++) L[i] = Math.max(L[i - 1], h[i - 1]);
    for (let i = n - 2; i >= 0; i--) R[i] = Math.max(R[i + 1], h[i + 1]);
    return h.map((x, i) => Math.max(0, Math.min(L[i], R[i]) - x));
  },
  islands(g) {
    const seen = {}, out = [];
    for (let r = 0; r < g.length; r++) for (let c = 0; c < g[r].length; c++) {
      if (String(g[r][c]) !== '1' || seen[r + ',' + c]) continue;
      const land = [], todo = [[r, c]];
      seen[r + ',' + c] = true;
      while (todo.length) {
        const [y, x] = todo.pop();
        land.push([y, x]);
        for (const [dy, dx] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ny = y + dy, nx = x + dx; if (g[ny] && String(g[ny][nx]) === '1' && !seen[ny + ',' + nx]) { seen[ny + ',' + nx] = true; todo.push([ny, nx]); } }
      }
      out.push(land);
    }
    return out;
  },
  order(n, edges) {                                   // a start-up order, or the machines stuck waiting for each other
    const waits = Array(n).fill(0), after = Array.from({ length: n }, () => []), out = [];
    for (const e of edges) { if (!(e[0] >= 0 && e[0] < n && e[1] >= 0 && e[1] < n)) continue; waits[e[0]]++; after[e[1]].push(e[0]); }
    const ready = waits.map((w, k) => (w ? -1 : k)).filter(k => k >= 0);
    while (ready.length) { const k = ready.shift(); out.push(k); for (const m of after[k]) if (--waits[m] === 0) ready.push(m); }
    return { order: out, stuck: waits.map((w, k) => (w > 0 ? k : -1)).filter(k => k >= 0) };
  },
};
// A binary tree from the list the tests use (level by level, None for a missing child, nothing listed under a None).
function treeOf(arr) {
  const nodes = [];
  if (!arr.length || arr[0] === null) return nodes;
  const make = (v, level, x, parent) => { const n = { v, level, x, parent, kids: [null, null], k: nodes.length }; nodes.push(n); return n; };
  const queue = [make(arr[0], 0, 0, null)];
  let i = 1;
  while (queue.length && i < arr.length) {
    const p = queue.shift();
    for (let side = 0; side < 2 && i < arr.length; side++, i++) {
      if (arr[i] === null || arr[i] === undefined) continue;
      const n = make(arr[i], p.level + 1, p.x + (side ? 1 : -1) / Math.pow(2, p.level + 1), p);
      p.kids[side] = n;
      queue.push(n);
    }
  }
  return nodes;
}

// ---------------------------------------------------------------- the ten kinds of scene
const TYPES = {};

// 1. The signal wall: text goes in, and the text the code produced is written under it, letter by letter.
TYPES.wall = c => {
  const o = c.o, t = c.t, rows = [], printed = t.stdout !== undefined;
  let want;
  if (printed) {
    String(t.stdin || '').split('\n').filter(s => s !== '').slice(0, 3).forEach((l, k) => rows.push({ tag: k ? '' : 'typed', text: line(l) }));
    want = String(c.want);
  } else if (o.file) {
    need(Array.isArray(c.want) && c.want.length === 2 && typeof c.want[1] === 'string');
    rows.push({ tag: 'call', text: line(c.callText) });
    want = 'returned ' + show(c.want[0]) + '\n' + c.want[1].replace(/\n$/, '');
  } else if (o.words) {
    need(Array.isArray(c.args[0]) && c.args[0].length && typeof c.want === 'string');
    c.args[0].slice(0, 4).forEach((w, k) => rows.push({ tag: k ? '' : 'in', text: line(w), id: 'in' + k }));
    want = c.want;
  } else if (o.expr || !c.fn) { rows.push({ tag: 'call', text: line(c.callText) }); want = textOf(c.want); }
  else { c.args.slice(0, 3).forEach((a, k) => rows.push({ tag: c.params[k] || 'in', text: line(textOf(a)), id: 'in' + k })); want = textOf(c.want); }
  const wl = want.replace(/\n$/, '').split('\n'), outN = clamp(wl.length, 1, 5);
  // short lines get large letters: the wall is as many letters wide as its longest line needs
  const cols = clamp(Math.max(...rows.map(r => r.text.length), ...wl.slice(0, outN).map(l => l.length)) + 3, 14, WALL);
  for (let k = 0; k < outN; k++) rows.push({ tag: k ? '' : (printed ? 'prints' : 'out'), text: '', id: 'out' + k, out: true });
  const stage = { w: 9.6, d: 3.4, el: 0.46, verdict: 'mast', props: [{ id: 'wall', k: 'screen', x: 0, z: -0.75, rows, cols }, { id: 'mast', k: 'lamp', x: 4.55, z: -0.75, y: 2.4 }], pip: [-3.6, 0.95], note: o.n || (printed ? 'What your program prints goes up on the signal wall.' : 'The answer your code returns goes up on the signal wall.') };
  const gotText = got => (printed ? textOf(got) : o.file && Array.isArray(got) && got.length === 2 && typeof got[1] === 'string' ? 'returned ' + show(got[0]) + '\n' + got[1].replace(/\n$/, '') : textOf(got));
  return { stage, act(got, ok) {
    const gl = gotText(got).replace(/\n$/, '').split('\n'), b = [B.go('wall')];
    let wrong = false;
    for (let k = 0; k < outN; k++) {
      const g = gl[k] === undefined ? '' : line(gl[k], cols), w = wl[k] === undefined ? '' : line(wl[k], cols), marks = g.split('').map((ch, j) => (ok || ch === w[j] ? 0 : 1)), short = !ok && g.length < w.length;
      if (short) marks.push(1);
      if (marks.indexOf(1) >= 0) wrong = true;
      b.push({ a: 'type', id: 'wall', row: 'out' + k, text: g + (short ? '_' : ''), marks });
    }
    if (!ok && printed && !gotText(got).trim()) b.push(B.note('Your program printed nothing.', 'bad'));
    else if (!ok && !printed && !o.file && typeof got !== typeof c.want && !(got && got.raw !== undefined)) b.push(B.note('Your code returned ' + kindOf(got) + '. This needs ' + kindOf(c.want) + '.', 'bad'));
    else if (!ok && gl.length > outN) b.push(B.note(plural(gl.length - outN, 'line') + ' more than there should be.', 'bad'));
    else if (!ok && !wrong) b.push(B.note('Close. Check the spaces, the capital letters and the line breaks.', 'bad'));
    if (o.window && typeof c.args[0] === 'string' && c.args[0].length <= WALL) {
      const span = TRUE.window(c.args[0]);
      if (span[1] - span[0] === c.want) b.push({ a: 'hl', id: 'wall', row: 'in0', from: span[0], to: span[1] }, B.note('The longest stretch with no letter twice: "' + c.args[0].slice(span[0], span[1]) + '", ' + plural(c.want, 'letter') + '.', ok ? 'ok' : 'bad'));
    }
    if (o.words && ok && c.want.length) for (let k = 0; k < Math.min(4, c.args[0].length); k++) b.push({ a: 'hl', id: 'wall', row: 'in' + k, from: 0, to: c.want.length });
    b.push(B.mark('mast', ok ? 'ok' : 'bad'), B.end(ok));
    return b;
  } };
};

// 2. The belt: what goes in stands at the back, and what the code returned comes out crate by crate, each one checked.
// A class under test gets the same treatment: every call made on it stands as a card, with what it returned in front.
TYPES.belt = c => {
  const o = c.o;
  const labels = v => (typeof v === 'string' ? (o.split === 'words' ? v.split(/\s+/).filter(Boolean) : v.split('')) : v.map(x => (o.group ? show(x, 15) : typeof x === 'string' && o.split ? x : show(x, 11))));
  const pieces = v => (typeof v === 'string' ? (o.split === 'words' ? v.split(/\s+/).filter(Boolean) : v.split('')) : v);       // the things themselves, to compare
  let ins, signs = [];
  if (o.ops) {
    need(c.via === 'ops' && Array.isArray(c.args[1]) && Array.isArray(c.args[2]));
    ins = [c.args[1].map((n, k) => { const inner = (c.args[2][k] || []).map(v => show(v, 6)).join(','); return ((k ? n : show(c.args[0])) + '(' + inner + ')').slice(0, 13); })];
  } else if (o.rows) ins = o.rows(c);
  else {
    const lists = c.args.map(un).filter(a => Array.isArray(a) || (typeof a === 'string' && o.split));
    ins = lists.slice(0, 2).map(labels);
    signs = c.args.map((a, k) => (Array.isArray(un(a)) || (typeof a === 'string' && o.split) ? null : (c.params[k] || 'with') + ' = ' + show(a, 12))).filter(Boolean).concat(Object.keys(c.kw).map(k => k + ' = ' + show(c.kw[k], 12)));
    if (!ins.length) { ins = [c.args.map(a => show(a, 11))]; signs = []; }
  }
  need(Array.isArray(ins) && ins.length && ins.every(Array.isArray));
  const wantList = o.one ? [c.want] : c.want === null ? null : typeof c.want === 'string' && o.split ? c.want : Array.isArray(c.want) ? c.want : undefined;
  need(wantList !== undefined);
  const wantLabels = wantList === null ? ['None'] : labels(wantList), wantPieces = wantList === null ? [null] : pieces(wantList);
  // how wide the crates are decides how many fit in a line
  const wdIn = widthFor(ins.reduce((a, r) => a.concat(r), [])), pitchIn = 0.8 * wdIn + 0.22, perIn = clamp(Math.floor(11.2 / pitchIn), 3, 10);
  const wdOut = o.ops ? wdIn : widthFor(wantLabels.slice(0, 15), o.group ? 3.6 : 2.7), pitchOut = o.ops ? pitchIn : 0.8 * wdOut + 0.22, perOut = o.ops ? perIn : clamp(Math.floor(11.2 / pitchOut), 3, 10);
  const inLines = o.ops ? Math.min(2, Math.ceil(ins[0].length / perIn)) : ins.length, room = o.ops ? perIn * inLines : perOut * clamp(Math.ceil(wantLabels.length / perOut), 1, 3);
  if (o.ops) ins = [capRow(ins[0], room)]; else ins = ins.map(r => capRow(r, perIn));
  const cols = o.ops ? Math.min(perIn, Math.max(3, ins[0].length)) : Math.min(perOut, Math.max(3, wantLabels.length)), outLines = o.ops ? inLines : Math.ceil(Math.min(room, Math.max(1, wantLabels.length)) / perOut);
  // Lines stand on steps, each one a little higher than the line in front of it, so that no line hides the one behind.
  const STEP = o.ops ? 0.6 : 0.32, GAP = o.ops ? 1.9 : 1.2, R = ins.length;
  const w = Math.max(cols * pitchOut, ...ins.map(r => Math.min(r.length, perIn) * pitchIn), 4) + 3.4, depth = Math.max(4.4, o.ops ? 2.9 + (inLines - 1) * GAP : 4.4 + (outLines - 1 + R - 1) * GAP);
  const zFront = depth / 2 - 1.4, lineOf = k => Math.floor(k / (o.ops ? perIn : perOut)), back = k => outLines - 1 - lineOf(k);
  const front = zFront - (outLines - 1) * GAP;                                       // where the first line of what comes out stands
  const outAt = k => [rowX(cols, k % (o.ops ? perIn : perOut), o.ops ? pitchIn : pitchOut) - 0.4, zFront - back(k) * GAP, back(k) * STEP];
  const stage = { w, d: depth, props: [], pip: [-w / 2 + 0.9, depth / 2 - 0.7], note: o.n || 'Your code returns a list. Each item comes out on the belt and is checked in its place.' };
  if (o.ops) ins[0].forEach((t, k) => stage.props.push({ id: 'i0_' + k, k: 'crate', x: outAt(k)[0], z: outAt(k)[1], y: outAt(k)[2] + 0.98, t, wd: wdIn, tone: 'card', air: true }, { id: 'q' + k, k: 'slot', x: outAt(k)[0], z: outAt(k)[1], y: outAt(k)[2], wd: wdIn }));
  else ins.forEach((r, row) => r.forEach((t, k) => stage.props.push({ id: 'i' + row + '_' + k, k: 'crate', x: rowX(Math.min(r.length, perIn), k, pitchIn) - 0.4, z: front - 1.9 - (R - 1 - row) * GAP, y: (outLines + R - 1 - row) * STEP, t, wd: wdIn, tone: 'in' })));
  signs.slice(0, 2).forEach((t, k) => stage.props.push({ id: 's' + k, k: 'sign', x: w / 2 - 1.05, z: front - 1.9 - (R - 1) * GAP, y: (outLines + R - 1) * STEP + 0.3 + k * 0.5, t, tone: 'amber', wd: 1.8 }));
  stage.props.push({ id: 'check', k: 'lamp', x: w / 2 - 0.8, z: zFront, y: 1.1 });
  stage.verdict = 'check';
  return { stage, act(got, ok) {
    const g = o.one ? [got] : got === null ? null : typeof got === 'string' && o.split ? got : Array.isArray(got) ? got : undefined;
    if (g === undefined) return fail('Your code returned ' + kindOf(got) + (o.split ? '. Text is needed here.' : '. A list is needed here.'));
    const gl = g === null ? ['None'] : labels(g), gp = g === null ? [null] : pieces(g), b = [B.go([outAt(0)[0] - 1.1, outAt(0)[1] + (outAt(0)[2] ? 0.5 : 0)], { y: outAt(0)[2] })], shown = Math.min(gl.length, room);
    if (o.pairs && Array.isArray(un(c.args[0]))) {                                  // twins cancel out: they go dark, two by two
      const vals = un(c.args[0]).slice(0, perIn), dark = [];
      vals.forEach((v, k) => { if (vals.filter(x => same(x, v)).length === 2 && k < ins[0].length) dark.push('i0_' + k); });
      if (dark.length) b.push(B.mark(dark, 'dim'), B.wait(0.25));
    }
    let wrong = -1;
    for (let k = 0; k < shown; k++) {
      const good = ok || (k < wantPieces.length && same(gp[k], wantPieces[k])), at = outAt(k);
      if (!good && wrong < 0) wrong = k;
      b.push(B.add({ id: 'o' + k, k: 'crate', x: at[0], z: at[1], y: at[2], t: gl[k], wd: wdOut, tone: 'out' }, 'pip'), B.mark('o' + k, good ? 'ok' : 'bad'));
    }
    if (gl.length > shown) b.push(B.note('…and ' + (gl.length - shown) + ' more.', ''));
    if (!ok && wrong >= 0 && wrong < wantPieces.length) b.push(B.note((o.ops ? 'Call ' + (wrong + 1) + ', ' + ins[0][wrong] + ', should return ' : o.one ? 'It should be ' : 'The ' + ordinal(wrong + 1) + ' crate should be ') + wantLabels[wrong] + ', not ' + gl[wrong] + '.', 'bad'));
    else if (!ok && gl.length < wantPieces.length) {
      const miss = wantPieces.length - gl.length;
      for (let k = shown; k < Math.min(room, shown + Math.min(miss, 3)); k++) b.push(B.add({ id: 'm' + k, k: 'slot', x: outAt(k)[0], z: outAt(k)[1], y: outAt(k)[2], wd: wdOut }), B.mark(o.ops ? ['m' + k, 'q' + k] : 'm' + k, 'bad'));
      b.push(B.note(plural(miss, 'item') + ' missing.', 'bad'));
    } else if (!ok && gl.length > wantPieces.length) b.push(B.note(plural(gl.length - wantPieces.length, 'item') + ' too many.', 'bad'));
    else if (!ok && wrong < 0) b.push(B.note('Not the same as what was asked for. Look at the test list for the difference.', 'bad'));
    b.push(B.mark('check', ok ? 'ok' : 'bad'), B.end(ok));
    return b;
  } };
};

// 3. Power cells and a gate: the code picks cells, by position or by value, and the gate opens only for the right ones.
TYPES.cells = c => {
  const o = c.o, mode = o.mode;
  let vals;
  if (o.cells === 'answers') vals = uniq(c.lv.tests.map(t => read(t.expect)).filter(v => typeof v === 'string'));
  else if (o.cells === 'words') vals = String(c.args[0]).split(/\s+/).filter(Boolean);
  else if (o.cells === 'distinct') vals = uniq(un(c.args[0]));
  else if (mode === 'mirror') { need(typeof c.args[0] === 'string'); vals = c.args[0].toLowerCase().replace(/[^a-z0-9]/g, '').split(''); }
  else vals = un(c.args[0]);
  need(Array.isArray(vals) && vals.length >= 1 && vals.length <= 13);
  need(mode === 'idx' ? Array.isArray(c.want) && c.want.every(Number.isInteger) : mode === 'probe' ? Number.isInteger(c.want) : mode === 'summary' ? Array.isArray(c.want) && c.want.length === 3 : mode === 'mirror' ? typeof c.want === 'boolean' : mode === 'robber' ? isNum(c.want) : true);
  const n = vals.length, pitch = n > 9 ? 0.78 : n > 6 ? 0.92 : 1.08, w = Math.max(7, n * pitch + 2.6), x = k => rowX(n, k, pitch);
  const needText = o.need ? String(o.need(c)) : '', stage = { w, d: 4.4, verdict: 'gate', props: [], pip: [-w / 2 + 0.9, 1.35], note: o.n || 'The gate opens for the right cells. Your code says which ones.' };
  vals.forEach((v, k) => stage.props.push({ id: 'c' + k, k: 'cell', x: x(k), z: 0.1, t: bare(v, 9), sub: mode === 'idx' || mode === 'probe' ? String(k) : '', slim: pitch < 1 }));
  stage.props.push({ id: 'gate', k: 'gate', x: 0, z: -1.6, t: needText });
  const find = (v, used) => vals.findIndex((x, k) => !used[k] && (same(x, v) || (typeof x === 'string' && typeof v === 'string' && x.indexOf(v) >= 0 && v.length > 2)));
  const pick = k => [B.go('c' + k), B.zap('c' + k), B.mark('c' + k, 'pick')];
  const verdict = (b, ok) => { b.push({ a: ok ? 'open' : 'jam', id: 'gate' }, B.end(ok)); return b; };
  return { stage, act(got, ok) {
    const b = [];
    if (mode === 'idx') {
      if (!Array.isArray(got) || !got.every(Number.isInteger)) return fail('Your code returned ' + show(got, 22) + '. A list of positions is needed.');
      const took = [];
      for (const k of got.slice(0, 4)) {
        if (k < 0 || k >= n) b.push(B.note('There is no cell at position ' + k + '.', 'bad'));
        else if (took.indexOf(k) >= 0) b.push(B.note('Position ' + k + ' twice: that is one cell, not two.', 'bad'));
        else { b.push(...pick(k)); took.push(k); }
      }
      if (took.length && took.every(k => isNum(vals[k]))) b.push(B.txt('gate', took.map(k => numText(vals[k])).join(' + ') + ' = ' + numText(took.reduce((a, k) => a + vals[k], 0)), ok ? 'ok' : 'bad'));
    } else if (mode === 'probe') {
      if (!Number.isInteger(got)) return fail('Your code returned ' + show(got, 22) + '. A position is needed, or -1.');
      if (got === -1) b.push(B.pip('no'), B.note('-1: "it is not here."', ''));
      else if (got < 0 || got >= n) b.push(B.note('There is no cell at position ' + got + '.', 'bad'));
      else b.push(...pick(got));
    } else if (mode === 'val') {
      const groups = o.triples ? (Array.isArray(got) ? got : null) : [Array.isArray(got) ? got : [got]];
      if (!groups || (o.triples && !groups.every(Array.isArray))) return fail('Your code returned ' + show(got, 22) + '. A list of triples is needed.');
      if (o.triples && !groups.length) b.push(B.pip('no'), B.note('An empty list: "no three cells balance."', ''));
      groups.slice(0, 3).forEach((group, gi) => {
        const used = {}, ids = [];
        for (const v of group.slice(0, 4)) {
          const k = find(v, used);
          if (k < 0) b.push(B.note(show(v, 12) + ' is not among the cells.', 'bad'));
          else { used[k] = true; ids.push('c' + k); b.push(...pick(k)); }
        }
        if (o.triples) {
          if (group.every(isNum)) b.push(B.txt('gate', group.map(numText).join(' + ').replace(/\+ -/g, '- ') + ' = ' + numText(group.reduce((a, v) => a + v, 0)), group.reduce((a, v) => a + v, 0) === 0 ? 'ok' : 'bad'));
          b.push(B.wait(0.35));
          if (gi < Math.min(groups.length, 3) - 1 && ids.length) b.push(B.mark(ids, 'off'));
        }
      });
      if (o.triples && groups.length > 3) b.push(B.note('…and ' + plural(groups.length - 3, 'more triple') + '.', ''));
    } else if (mode === 'summary') {
      if (!Array.isArray(got) || got.length !== 3) return fail('Your code returned ' + show(got, 22) + '. Three values are needed: lowest, highest, average.');
      const used = {};
      got.slice(0, 2).forEach((v, j) => { const k = find(v, used); if (k < 0) b.push(B.note(show(v, 10) + ' is not one of the readings.', 'bad')); else { used[k] = true; b.push(...pick(k), B.note((j ? 'highest: ' : 'lowest: ') + show(v, 10), '')); } });
      b.push(B.txt('gate', 'average ' + show(got[2], 10), ok ? 'ok' : 'bad'));
    } else if (mode === 'mirror') {
      if (typeof got !== 'boolean') return fail('Your code returned ' + show(got, 22) + '. True or False is needed.');
      b.push(B.txt('gate', got ? 'True: it mirrors' : 'False: it does not', ''));
      const at = TRUE.mirror(vals);
      if ((at < 0) === c.want) {                                                    // two scanners walk inward and compare what they stand on
        for (let i = 0, j = n - 1; i < j && i <= (at < 0 ? n : at) && i < 6; i++, j--) b.push(B.mark(['c' + i, 'c' + j], i === at ? 'bad' : 'ok'), B.wait(0.14));
        b.push(B.note(at < 0 ? 'Every pair matches, all the way in.' : '"' + vals[at] + '" and "' + vals[n - 1 - at] + '" do not match.', ''));
      }
    } else if (mode === 'robber') {
      if (!isNum(got)) return fail('Your code returned ' + show(got, 22) + '. A number is needed.');
      b.push(B.txt('gate', 'you say ' + numText(got), ''));
      const set = vals.every(isNum) ? TRUE.skip(vals) : [];
      if (set.reduce((a, k) => a + vals[k], 0) === c.want) {
        for (const k of set) b.push(...pick(k));
        b.push(B.txt('gate', (set.length ? set.map(k => numText(vals[k])).join(' + ') + ' = ' : '') + numText(c.want), ok ? 'ok' : 'bad'));
      }
    }
    return verdict(b, ok);
  } };
};

// 4. The bridge: True sends PIP across, False keeps it back. The bridge only holds when True was the right answer.
TYPES.bridge = c => {
  const o = c.o;
  need(typeof c.want === 'boolean');
  const labels = (o.planks ? o.planks(c) : ['', '', '', '', '']).map(v => bare(v, 4));
  need(labels.length >= 1 && labels.length <= 14);
  const n = labels.length, pitch = n > 9 ? 0.74 : 0.92, span = n * pitch, w = span + 6, x = k => rowX(n, k, pitch), padL = -span / 2 - 1.5, padR = span / 2 + 1.5;
  const inputs = o.show ? o.show(c) : c.args.map(a => bare(un(a), 16)).join('   '), ask = o.ask || 'is it so?';
  const stage = { w, d: 4.6, props: [
    { id: 'left', k: 'pad', x: padL, z: 0, wd: 2.4, dp: 2.4 }, { id: 'right', k: 'pad', x: padR, z: 0, wd: 2.4, dp: 2.4 },
    { id: 'br', k: 'bridge', x: x(0), z: 0, n, pitch, labels }, { id: 'ask', k: 'sign', x: padL, z: -1.5, y: 2.3, t: line(inputs).slice(0, 22), wd: 2.4 },
    { id: 'q', k: 'sign', x: padL, z: -1.5, y: 1.75, t: ask, tone: 'mute', wd: 2.4, sz: 0.72 }, { id: 'beacon', k: 'lamp', x: padR, z: -0.7, y: 1.3 },
  ], pip: [padL, 0.2], verdict: 'beacon', note: o.n || 'True sends PIP across. False keeps it here. The bridge holds only if True is right.' };
  let weak = c.want ? -1 : Math.floor(n / 2), route = null;
  try { if (!c.want && o.weak) { const k = o.weak(c); if (k >= 0 && k < n) weak = k; } if (o.route) route = o.route(c); } catch (e) { route = null; }
  if (route && (route.stuck < 0) !== c.want) route = null;                          // the scene's own idea must agree with the test
  if (route && route.stuck >= 0) weak = route.stuck;
  return { stage, act(got, ok) {
    if (typeof got !== 'boolean') return fail('Your code returned ' + show(got, 22) + '. True or False is needed.');
    const b = [B.note(got ? 'True: PIP goes across.' : 'False: PIP stays.', '')];
    if (got) {
      b.push({ a: 'extend', id: 'br' });
      const stops = route ? [0].concat(route.steps) : Array.from({ length: n }, (v, k) => k).filter(k => n <= 7 || k % 2 === 0 || k === weak || k === n - 1);
      for (const k of stops) { b.push(B.hop([x(k), 0])); if (!c.want && k >= weak) break; }
      if (c.want) b.push(B.hop([padR, 0.2]), B.mark('beacon', 'ok'));
      else b.push({ a: 'snap', id: 'br', at: weak }, B.pip('fall'), B.note(o.why ? o.why(c, weak) : 'The bridge gave way. The answer here is False.', 'bad'));
    } else if (c.want) b.push({ a: 'extend', id: 'br' }, B.mark('beacon', 'bad'), B.note('The way was open: PIP could have crossed. The answer here is True.', 'bad'));
    else b.push({ a: 'extend', id: 'br', ghost: true }, { a: 'snap', id: 'br', at: weak }, B.mark('beacon', 'ok'), B.note(o.why ? o.why(c, weak) : 'It would not have held. Staying was right.', 'ok'));
    b.push(B.end(ok));
    return b;
  } };
};

// 5. The meter: a number is poured into a tube, and a ring shows how much was needed.
TYPES.meter = c => {
  const o = c.o, pick = o.val || (v => v), want = pick(c.want);
  need(isNum(want));
  const stage = { w: 9.8, d: 3.8, verdict: 'read', props: [], pip: [-1, 1.2], note: o.n || 'The number your code returns is poured into the meter. The ring shows how much was needed.' };
  let lines = [];
  if (o.inp === 'stdin') lines = String(c.t.stdin || '').split('\n').filter(Boolean).map(s => '> ' + s);
  else if (o.inp === 'file') { const text = (c.t.files || {})[c.args[0]]; lines = text === undefined ? ['(no such file)'] : text === '' ? ['(empty file)'] : text.replace(/\n$/, '').split('\n'); }
  else if (o.inp === 'text') lines = String(c.args[0]).split('\n');
  else if (o.inp === 'list' && Array.isArray(un(c.args[0]))) capRow(un(c.args[0]).map(v => show(v, 9)), 8).forEach((t, k, all) => stage.props.push({ id: 'i' + k, k: 'crate', x: -3.9 + (k % 4) * 1.14, z: (all.length > 4 ? -1.2 : -0.5) + Math.floor(k / 4) * 1.2, y: all.length > 4 && k < 4 ? 0.32 : 0, t, wd: 1.15 }));
  else lines = c.args.map((a, k) => (c.params[k] || 'in') + ' = ' + show(un(a), 26));
  lines.slice(0, 5).forEach((t, k) => stage.props.push({ id: 'l' + k, k: 'sign', x: -2.15, z: -1.3, y: 2.7 - k * 0.52, t: line(t).slice(0, 32), wd: 4.5, sz: 0.8, tone: 'ink' }));
  if (lines.length > 5) stage.props.push({ id: 'lmore', k: 'sign', x: -2.15, z: -1.3, y: 0.14, t: '…' + (lines.length - 5) + ' more lines', wd: 2, sz: 0.7, tone: 'mute' });
  stage.props.push({ id: 'tube', k: 'tube', x: 3.2, z: -0.4 }, { id: 'read', k: 'sign', x: 3.2, z: -0.4, y: 3.25, t: '?', wd: 1.6, sz: 1.2 });
  return { stage, act(got, ok) {
    const v = pick(got);
    if (!isNum(v)) return [B.go('tube'), B.txt('read', show(got, 12), 'bad'), B.note('Your code ' + (o.val ? 'printed no number where one is needed.' : 'returned ' + kindOf(got) + '. A number is needed.'), 'bad'), B.pip('sad'), B.end(ok)];
    const scale = Math.max(Math.abs(v), Math.abs(want), 1) * 1.18, b = [B.go('tube'), B.zap('tube'), { a: 'fill', id: 'tube', to: clamp(v / scale, 0, 1) }, B.txt('read', numText(v), ''), { a: 'ring', id: 'tube', at: clamp(want / scale, 0, 1), t: 'needed ' + numText(want) }];
    if (ok) b.push({ a: 'spin', id: 'tube' }, B.txt('read', numText(v), 'ok'));
    else b.push(B.txt('read', numText(v), 'bad'), B.note(same(v, want) ? 'The number is right, but not everything else is.' : v < want ? 'Short by ' + numText(want - v) + '.' : 'Over by ' + numText(v - want) + '.', 'bad'));
    b.push(B.end(ok));
    return b;
  } };
};

// 6. The track: a row of bars. A list becomes bars to compare; a number is checked against what the bars really hold.
TYPES.track = c => {
  const o = c.o, mode = o.mode || 'num';
  if (mode === 'slots') {
    need(isNum(c.want));
    let units = null;
    try { units = o.units ? o.units(c) : null; } catch (e) { units = null; }
    if (units && units.length !== c.want) units = null;
    // the deck is as wide as the answer needs, with room for a few slots too many
    const wdU = units ? widthFor(units.map(String)) : 1, pitch = 0.8 * wdU + 0.2, room = clamp((units ? units.length : 5) + 3, 6, Math.min(12, Math.floor(12.2 / pitch))), w = room * pitch + 3.2;
    const stage = { w, d: 4.2, verdict: 'read', props: [], pip: [-w / 2 + 0.8, 1.5], note: o.n || 'Your code says how many. That many slots open up, and what is really there has to fit in them.' };
    c.args.slice(0, 2).forEach((a, k) => stage.props.push({ id: 'a' + k, k: 'sign', x: -w / 2 + 1.7 + k * 3, z: -1.6, y: 1.9, t: (c.params[k] || 'in') + ' = ' + show(un(a), 12), wd: 2.6, tone: 'amber' }));
    stage.props.push({ id: 'read', k: 'sign', x: w / 2 - 1.1, z: -1.6, y: 1.9, t: '?', sz: 1.2, wd: 1.4 });
    return { stage, act(got, ok) {
      if (!isNum(got)) return fail('Your code returned ' + show(got, 22) + '. A number is needed.');
      const b = [B.txt('read', numText(got), '')];
      if (Number.isInteger(got) && got >= 0 && got <= room && units && units.length <= room) {
        const count = Math.max(got, units.length, 1), xs = k => rowX(count, k, pitch);
        for (let k = 0; k < got; k++) b.push(B.add({ id: 's' + k, k: 'slot', x: xs(k), z: 0.4, wd: wdU }));
        units.forEach((u, k) => b.push(B.add({ id: 'u' + k, k: 'crate', x: xs(k), z: 0.4, t: String(u), wd: wdU, tone: 'out' }, 'pip'), B.mark('u' + k, k < got ? 'ok' : 'bad')));
        for (let k = units.length; k < got; k++) b.push(B.mark('s' + k, 'bad'));
        if (o.say) b.push(B.note(o.say(c, units) + (ok ? '' : ' Your code says ' + numText(got) + '.'), ok ? 'ok' : 'bad'));
        else if (got > units.length) b.push(B.note(plural(got - units.length, 'slot') + ' left empty.', 'bad'));
        else if (got < units.length) b.push(B.note(plural(units.length - got, 'thing') + ' with nowhere to go.', 'bad'));
      } else if (!ok && isNum(c.want)) b.push(B.note('Needed: ' + numText(c.want) + '.', 'bad'));
      b.push(B.txt('read', numText(got), ok ? 'ok' : 'bad'), B.end(ok));
      return b;
    } };
  }
  if (mode === 'hops') {
    const a = c.args;
    need(a.length === 5 && a.every(isNum) && isNum(c.want) && a[4] > 0);
    const dist = Math.hypot(a[2] - a[0], a[3] - a[1]), reach = a[4], stage = { w: 11, d: 4, verdict: 'read', props: [], pip: [-4.4, 0.4], note: o.n || 'Your code says how many hops. PIP makes exactly that many, each as long as its reach.' };
    stage.props.push({ id: 'd', k: 'sign', x: -2.6, z: -1.6, y: 1.9, t: 'distance ' + numText(dist), wd: 2.6, tone: 'amber' }, { id: 'r', k: 'sign', x: 0.9, z: -1.6, y: 1.9, t: 'reach ' + numText(reach), wd: 2.2, tone: 'amber' }, { id: 'read', k: 'sign', x: 4, z: -1.6, y: 1.9, t: '?', sz: 1.2, wd: 1.4 });
    const unit = hops => 8 / Math.max(dist, Math.min(hops, 14) * reach, reach), start = -4.4;
    return { stage, plan(got) { const u = unit(isNum(got) ? Math.max(0, got) : c.want); return { flag: start + dist * u, u }; }, act(got, ok) {
      if (!isNum(got)) return fail('Your code returned ' + show(got, 22) + '. A number is needed.');
      const hops = clamp(Math.round(got), 0, 14), u = unit(Math.max(hops, c.want)), flag = start + dist * u, b = [B.txt('read', numText(got), ''), B.add({ id: 'flag', k: 'flag', x: flag, z: 0.4, t: 'relay' })];
      for (let k = 1; k <= hops; k++) b.push(B.hop([Math.min(5.2, start + k * reach * u), 0.4]), B.add({ id: 'h' + k, k: 'slot', x: Math.min(5.2, start + k * reach * u), z: 0.4 }));
      const far = hops * reach;
      b.push(B.note(plural(hops, 'hop') + ' of ' + numText(reach) + ' reach ' + numText(far) + '. The relay is ' + numText(dist) + ' away' + (far + 1e-9 < dist ? ': PIP falls short.' : ok ? '.' : ': a hop too many.'), ok ? 'ok' : 'bad'));
      b.push(B.mark('flag', ok ? 'ok' : 'bad'), B.txt('read', numText(got), ok ? 'ok' : 'bad'), B.end(ok));
      return b;
    } };
  }
  const raw = o.bars ? o.bars(c) : un(c.args.find(a => Array.isArray(un(a))) || []);
  if (mode === 'list') {
    need(Array.isArray(c.want) && c.want.length <= 14);
    const inp = Array.isArray(raw) ? capRow(raw.map(v => show(v, 7)), 10) : [], n = clamp(Math.max(c.want.length, inp.length, 3), 3, 12), pitch = n > 9 ? 0.8 : 0.98, w = n * pitch + 3, x = k => rowX(n, k, pitch);
    // what goes in stands in front, low; the bars rise behind it, so neither hides the other
    const stage = { w, d: 5, top: 3.3, verdict: 'check', props: [], pip: [-w / 2 + 0.8, 1.9], note: o.n || 'Each number your code returns becomes a bar. A bar of the wrong height shows red.' };
    inp.forEach((t, k) => stage.props.push({ id: 'i' + k, k: 'crate', x: x(k), z: 1.1, t, wd: 1 }));
    stage.props.push({ id: 'check', k: 'lamp', x: x(n - 1) + 1.1, z: -0.7, y: 1.1 });
    return { stage, act(got, ok) {
      if (!Array.isArray(got)) return fail('Your code returned ' + kindOf(got) + '. A list is needed.');
      const top = Math.max(1, ...got.concat(c.want).filter(isNum).map(Math.abs)), b = [B.go([x(0) - 1.1, -0.2])], shown = Math.min(got.length, 12);
      let wrong = -1;
      for (let k = 0; k < shown; k++) {
        const good = ok || (k < c.want.length && same(got[k], c.want[k]));
        if (!good && wrong < 0) wrong = k;
        b.push(B.add({ id: 'o' + k, k: 'bar', x: x(k), z: -0.7, h: isNum(got[k]) ? Math.max(0.16, Math.abs(got[k]) / top * 2.2) * (got[k] < 0 ? -1 : 1) : 0.16, t: show(got[k], 7), slim: pitch < 0.9 }, 'pip'), B.mark('o' + k, good ? 'ok' : 'bad'));
      }
      if (!ok && wrong >= 0 && wrong < c.want.length) b.push(B.note('The ' + ordinal(wrong + 1) + ' bar should be ' + show(c.want[wrong], 12) + ', not ' + show(got[wrong], 12) + '.', 'bad'));
      else if (!ok && got.length < c.want.length) b.push(B.note(plural(c.want.length - got.length, 'bar') + ' missing.', 'bad'));
      else if (!ok && got.length > c.want.length) b.push(B.note(plural(got.length - c.want.length, 'bar') + ' too many.', 'bad'));
      else if (!ok && wrong < 0) b.push(B.note('Not the same as what was asked for. Look at the test list for the difference.', 'bad'));
      b.push(B.mark('check', ok ? 'ok' : 'bad'), B.end(ok));
      return b;
    } };
  }
  need(Array.isArray(raw) && raw.length >= 1 && raw.length <= 14 && raw.every(isNum) && isNum(c.want));
  const n = raw.length, top = Math.max(1, ...raw.map(Math.abs)), pitch = n > 9 ? 0.8 : 0.98, w = n * pitch + 4.2, x = k => rowX(n, k, pitch) - 0.7, h = v => Math.max(0.16, Math.abs(v) / top * 2.2) * (v < 0 ? -1 : 1);
  const stage = { w, d: 4.4, top: o.stairs ? 4.3 : 3.2, verdict: 'read', props: [], pip: [-w / 2 + 0.8, 1.4], note: o.n || 'Your code returns one number about these bars. The bars show whether it is the right one.' };
  raw.forEach((v, k) => stage.props.push({ id: 'b' + k, k: 'bar', x: x(k), z: -0.3, h: h(v), t: o.plain ? '' : numText(v), slim: pitch < 0.9 }));
  c.args.forEach((a, k) => { if (isNum(a) && !o.bars) stage.props.push({ id: 'a' + k, k: 'sign', x: -w / 2 + 1.4, z: -1.9, y: 2.2, t: (c.params[k] || 'with') + ' = ' + numText(a), wd: 2, tone: 'amber' }); });
  stage.props.push({ id: 'read', k: 'sign', x: x(n - 1) + 1.9, z: -0.3, y: 1.5, t: '?', sz: 1.25, wd: 1.5 });
  let truth = null;
  try { truth = o.truth ? o.truth(c, raw) : null; } catch (e) { truth = null; }
  return { stage, act(got, ok) {
    if (!isNum(got)) return fail('Your code returned ' + show(got, 22) + '. A number is needed.');
    const b = [];
    if (o.stairs) for (let k = 0; k < n; k += (k + 2 < n && k % 3 === 1 ? 2 : 1)) b.push(B.hop([x(k), -0.3], { y: Math.abs(h(raw[k])) }));
    else b.push(B.go([x(0) - 1, 0.8]));
    b.push(B.txt('read', numText(got), ''));
    if (truth && truth.water) truth.water.forEach((amount, k) => { if (amount > 0) b.push(B.add({ id: 'w' + k, k: 'bar', x: x(k), z: -0.3, y: Math.abs(h(raw[k])), h: amount / top * 2.2, t: '', tone: 'water', slim: pitch < 0.9 })); });
    if (truth && truth.marks && truth.marks.length) b.push(B.mark(truth.marks.map(k => 'b' + k), 'pick'), B.wait(0.3));
    if (truth && truth.say) b.push(B.note(truth.say + (ok ? '' : ' Your code says ' + numText(got) + '.'), ok ? 'ok' : 'bad'));
    else if (!ok) b.push(B.note(got < c.want ? 'Too low: it is ' + numText(c.want) + '.' : 'Too high: it is ' + numText(c.want) + '.', 'bad'));
    b.push(B.txt('read', numText(got), ok ? 'ok' : 'bad'), B.end(ok));
    return b;
  } };
};

// 7. The grid: tiles on the floor. A grid can be rebuilt and compared, islands counted, a route walked.
TYPES.grid = c => {
  const o = c.o, mode = o.mode;
  let g;
  if (mode === 'routes') { need(c.args.length === 2 && c.args.every(Number.isInteger) && isNum(c.want)); g = Array.from({ length: clamp(c.args[0], 1, 5) }, () => Array(clamp(c.args[1], 1, 7)).fill('')); }
  else { g = un(c.args[0]); need(Array.isArray(g) && g.length >= 1 && g.length <= 6 && g.every(r => Array.isArray(r) && r.length >= 1 && r.length <= 7)); }
  const rows = g.length, cols = Math.max(...g.map(r => r.length)), pitch = 0.96, two = mode === 'grid', outCols = two && Array.isArray(c.want) && Array.isArray(c.want[0]) ? Math.min(7, Math.max(...c.want.map(r => (Array.isArray(r) ? r.length : 1)))) : 0;
  const w = (cols + outCols) * pitch + (two ? 4.2 : 4.4), ox = two ? -w / 2 + 1.4 + (cols - 1) * pitch / 2 : -0.6, tx = (col, base) => base + (col - (cols - 1) / 2) * pitch, tz = r => (r - (rows - 1) / 2) * pitch - 0.2;
  const stage = { w, d: Math.max(4.8, rows * pitch + 2.4), el: 0.86, props: [], pip: [-w / 2 + 0.8, rows * pitch / 2 + 0.6], note: o.n || 'The grid lies on the deck. What your code returns is checked against it.' };
  g.forEach((r, y) => r.forEach((v, xk) => stage.props.push({ id: 't' + y + '_' + xk, k: 'tile', x: tx(xk, ox), z: tz(y), t: mode === 'islands' ? '' : bare(v, 4), tone: mode === 'islands' ? (String(v) === '1' ? 'land' : 'sea') : mode === 'routes' ? (y === 0 && xk === 0 ? 'start' : y === rows - 1 && xk === r.length - 1 ? 'goal' : 'plain') : 'plain' })));
  if (!two) stage.props.push({ id: 'read', k: 'sign', x: tx(cols - 1, ox) + 1.9, z: -0.2, y: 1.5, t: '?', sz: 1.25, wd: 1.5 });
  else stage.props.push({ id: 'check', k: 'lamp', x: w / 2 - 0.7, z: -0.2, y: 1.1 });
  stage.verdict = two ? 'check' : 'read';
  return { stage, act(got, ok) {
    const b = [];
    if (mode === 'grid') {
      if (!Array.isArray(got) || !got.every(Array.isArray)) return fail('Your code returned ' + show(got, 22) + '. A list of rows is needed.');
      const bx = ox + (cols - 1) * pitch / 2 + 1.6, oc = Math.max(1, ...got.map(r => r.length)), wantRows = Array.isArray(c.want) ? c.want : [];
      b.push(B.go([bx - 0.9, rows * pitch / 2 + 0.5]));
      got.slice(0, 7).forEach((r, y) => b.push(B.all(r.slice(0, 7).map((v, xk) => B.add({ id: 'o' + y + '_' + xk, k: 'tile', x: bx + xk * pitch, z: (y - (Math.min(got.length, 7) - 1) / 2) * pitch - 0.2, t: bare(v, 4), tone: ok || (wantRows[y] && same(v, wantRows[y][xk])) ? 'good' : 'wrong' }))), B.wait(0.12)));
      if (!ok && (got.length !== wantRows.length || oc !== Math.max(1, ...wantRows.map(r => (Array.isArray(r) ? r.length : 1))))) b.push(B.note('The shape is wrong: ' + got.length + ' by ' + oc + ' was returned.', 'bad'));
      b.push(B.mark('check', ok ? 'ok' : 'bad'), B.end(ok));
      return b;
    }
    if (!isNum(got)) return fail('Your code returned ' + show(got, 22) + '. A number is needed.');
    b.push(B.go([tx(0, ox) - 1, tz(rows - 1) + 0.9]), B.txt('read', numText(got), ''));
    if (mode === 'islands') {
      const found = TRUE.islands(g);
      if (found.length === c.want) {
        // PIP visits every island it was told about, and each one lights up in a colour of its own
        found.slice(0, 8).forEach((land, k) => b.push(B.hop([tx(land[0][1], ox), tz(land[0][0])]), B.mark(land.map(p => 't' + p[0] + '_' + p[1]), k < got ? 'c' + (k % 6) : 'bad'), B.wait(0.12)));
        b.push(B.note(plural(found.length, 'island') + ' on the grid. Your code counted ' + numText(got) + '.', ok ? 'ok' : 'bad'));
      }
    } else if (mode === 'routes') {
      const path = [];
      for (let y = 0, xk = 0; ;) { path.push([y, xk]); if (y === rows - 1 && xk === cols - 1) break; if (xk < cols - 1 && (y === rows - 1 || (y + xk) % 2 === 0)) xk++; else y++; }
      path.forEach(p => b.push(B.hop([tx(p[1], ox), tz(p[0])]), B.mark('t' + p[0] + '_' + p[1], 'on')));
      b.push(B.note('That is one route. There are ' + numText(c.want) + ' in all' + (ok ? '.' : ', and your code says ' + numText(got) + '.'), ok ? 'ok' : 'bad'));
    }
    b.push(B.txt('read', numText(got), ok ? 'ok' : 'bad'), B.end(ok));
    return b;
  } };
};

// 8. The chain: linked nodes go in, and the chain the code returned is laid out link by link.
TYPES.chain = c => {
  const first = c.args[0];
  let lists = Array.isArray(first) && !first.tuple && first.length && first.every(v => v && v.call) ? first.map(un) : c.args.map(un).filter(Array.isArray);
  need(lists.length >= 1 && Array.isArray(c.want));
  lists = lists.slice(0, 3).map(l => capRow(l.map(v => show(v, 4)), 7));
  const n = clamp(Math.max(c.want.length, ...lists.map(l => l.length), 3), 3, 9), pitch = n > 7 ? 0.98 : 1.14, w = n * pitch + 3, x = k => rowX(n, k, pitch);
  const stage = { w, d: 3.2 + lists.length * 1.1, verdict: 'check', props: [], pip: [-w / 2 + 0.8, 1.6], note: c.o.n || 'The chain your code returns is laid out link by link, and each node is checked.' };
  // several chains stand one behind the other, each a step higher than the one in front
  lists.forEach((l, row) => { const back = lists.length - 1 - row, z = -0.5 - back * 1.1, up = back * 0.36; l.forEach((t, k) => { stage.props.push({ id: 'n' + row + '_' + k, k: 'node', x: x(k), z, y: up, t }); if (k) stage.props.push({ id: 'k' + row + '_' + k, k: 'link', a: [x(k - 1), 0.55 + up, z], b: [x(k), 0.55 + up, z], arrow: true }); }); if (!l.length) stage.props.push({ id: 'e' + row, k: 'sign', x: x(0), z, y: 0.6 + up, t: 'None', tone: 'mute' }); });
  stage.props.push({ id: 'check', k: 'lamp', x: x(n - 1) + 1.1, z: 0.9, y: 1.1 });
  return { stage, act(got, ok) {
    if (!Array.isArray(got)) return fail('Your code returned ' + show(got, 22) + '. The head of a chain is needed.');
    const b = [B.go([x(0) - 1.1, 0.9])], shown = Math.min(got.length, 9);
    let wrong = -1;
    if (!got.length) b.push(B.add({ id: 'none', k: 'sign', x: x(0), z: 0.9, y: 0.6, t: 'None', tone: ok ? 'ok' : 'bad' }));
    for (let k = 0; k < shown; k++) {
      const good = ok || (k < c.want.length && same(got[k], c.want[k]));
      if (!good && wrong < 0) wrong = k;
      if (k) b.push(B.add({ id: 'ok' + k, k: 'link', a: [x(k - 1), 0.55, 0.9], b: [x(k), 0.55, 0.9], arrow: true }));
      b.push(B.add({ id: 'o' + k, k: 'node', x: x(k), z: 0.9, t: show(got[k], 4) }, 'pip'), B.mark('o' + k, good ? 'ok' : 'bad'));
    }
    if (got.length > 9) b.push(B.note('…and ' + (got.length - 9) + ' more nodes.', ''));
    if (!ok && wrong >= 0 && wrong < c.want.length) b.push(B.note('The ' + ordinal(wrong + 1) + ' node should be ' + show(c.want[wrong], 12) + ', not ' + show(got[wrong], 12) + '.', 'bad'));
    else if (!ok && got.length !== c.want.length) b.push(B.note(got.length < c.want.length ? plural(c.want.length - got.length, 'node') + ' missing.' : plural(got.length - c.want.length, 'node') + ' too many.', 'bad'));
    b.push(B.mark('check', ok ? 'ok' : 'bad'), B.end(ok));
    return b;
  } };
};

// 9. The tree: nodes hang level under level. Its depth is counted, or its order is checked.
TYPES.tree = c => {
  const o = c.o, arr = un(c.args[0]);
  need(Array.isArray(arr) && arr.length <= 15);
  const nodes = treeOf(arr), depth = nodes.reduce((a, n) => Math.max(a, n.level + 1), 0);
  need(depth <= 4 && (o.mode === 'depth' ? isNum(c.want) : typeof c.want === 'boolean'));
  const px = n => n.x * 5.3, py = n => 3.9 - n.level * 0.98, stage = { w: 11.4, d: 3.4, el: 0.5, verdict: 'read', props: [], pip: [-4.6, 1], note: o.n || 'The tree hangs over the deck. What your code says about it is checked node by node.' };
  nodes.forEach(n => { if (n.parent) stage.props.push({ id: 'k' + n.k, k: 'link', a: [px(n.parent), py(n.parent), -0.6], b: [px(n), py(n), -0.6] }); });
  nodes.forEach(n => stage.props.push({ id: 'n' + n.k, k: 'node', x: px(n), z: -0.6, y: py(n) - 0.55, t: show(n.v, 4), air: true, big: true }));
  if (!nodes.length) stage.props.push({ id: 'empty', k: 'sign', x: 0, z: -0.6, y: 2.4, t: 'an empty tree', tone: 'mute', wd: 2.4 });
  stage.props.push({ id: 'read', k: 'sign', x: 4.4, z: 1, y: 0.6, t: '?', sz: 1.25, wd: 1.6 });
  return { stage, act(got, ok) {
    const b = [];
    if (o.mode === 'depth') {
      if (!isNum(got)) return fail('Your code returned ' + show(got, 22) + '. A number is needed.');
      b.push(B.txt('read', numText(got), ''));
      for (let level = 0; level < Math.min(depth, 4); level++) b.push(B.mark(nodes.filter(n => n.level === level).map(n => 'n' + n.k), level < got ? 'on' : 'bad'), B.wait(0.22));
      b.push(B.note('The tree is ' + plural(depth, 'level') + ' deep. Your code says ' + numText(got) + '.', ok ? 'ok' : 'bad'));
    } else {
      if (typeof got !== 'boolean') return fail('Your code returned ' + show(got, 22) + '. True or False is needed.');
      b.push(B.txt('read', got ? 'True' : 'False', ''));
      // walk the tree left to right: in a search tree every value is larger than the one before it
      const inorder = [], walk = n => { if (!n) return; walk(n.kids[0]); inorder.push(n); walk(n.kids[1]); };
      walk(nodes[0]);
      let badAt = -1;
      for (let k = 1; k < inorder.length; k++) if (!(inorder[k].v > inorder[k - 1].v)) { badAt = k; break; }
      if ((badAt < 0) === c.want) {
        inorder.slice(0, badAt < 0 ? inorder.length : badAt + 1).forEach((n, k) => b.push(B.mark('n' + n.k, k === badAt ? 'bad' : 'on'), B.wait(0.1)));
        b.push(B.note(badAt < 0 ? 'Read left to right, the values only rise: it is a search tree.' : show(inorder[badAt].v) + ' comes after ' + show(inorder[badAt - 1].v) + ' and is not larger: not a search tree.', ok ? 'ok' : 'bad'));
      }
    }
    b.push(B.txt('read', typeof got === 'boolean' ? (got ? 'True' : 'False') : numText(got), ok ? 'ok' : 'bad'), B.end(ok));
    return b;
  } };
};

// 10. The network: machines that wait for other machines. Either they can all start in some order, or some never can.
TYPES.graph = c => {
  const count = c.args[0], edges = un(c.args[1] || []);
  need(Number.isInteger(count) && count >= 1 && count <= 9 && Array.isArray(edges) && typeof c.want === 'boolean');
  // the machines hang in a ring over the deck; two of them stand side by side
  const turn = k => (count === 2 ? Math.PI : -Math.PI / 2) + k / count * Math.PI * 2, pos = k => (count === 1 ? [0, 2.3] : [Math.cos(turn(k)) * 2.9, 2.3 - Math.sin(turn(k)) * 1.3]);
  const stage = { w: 10, d: 3.4, el: 0.5, verdict: 'read', props: [], pip: [-4, 1], note: c.o.n || 'An arrow means "this one first". True says they can all start. False says some wait for each other for ever.' };
  edges.slice(0, 14).forEach((e, k) => { if (Number.isInteger(e[0]) && Number.isInteger(e[1]) && e[0] < count && e[1] < count && e[0] >= 0 && e[1] >= 0 && e[0] !== e[1]) { const a = pos(e[1]), z = pos(e[0]); stage.props.push({ id: 'e' + k, k: 'link', a: [a[0], a[1], -0.6], b: [z[0], z[1], -0.6], arrow: true }); } });
  for (let k = 0; k < count; k++) stage.props.push({ id: 'n' + k, k: 'node', x: pos(k)[0], z: -0.6, y: pos(k)[1] - 0.55, t: String(k), air: true, big: true });
  stage.props.push({ id: 'read', k: 'sign', x: 4, z: 1, y: 0.6, t: '?', sz: 1.25, wd: 1.6 });
  return { stage, act(got, ok) {
    if (typeof got !== 'boolean') return fail('Your code returned ' + show(got, 22) + '. True or False is needed.');
    const b = [B.txt('read', got ? 'True' : 'False', '')], real = TRUE.order(count, edges);
    if ((real.stuck.length === 0) === c.want) {
      real.order.forEach(k => b.push(B.mark('n' + k, 'on'), B.wait(0.14)));
      if (real.stuck.length) b.push(B.mark(real.stuck.map(k => 'n' + k), 'bad'), B.note('Machines ' + real.stuck.join(', ') + ' wait for each other and never start.', ok ? 'ok' : 'bad'));
      else b.push(B.note('Started in the order ' + real.order.join(', ') + '. All of them are running.', ok ? 'ok' : 'bad'));
    }
    b.push(B.txt('read', got ? 'True' : 'False', ok ? 'ok' : 'bad'), B.end(ok));
    return b;
  } };
};

// ---------------------------------------------------------------- which level gets which scene
const lastNumber = v => { const m = /-?\d+(?:\.\d+)?(?!.*\d)/.exec(typeof v === 'string' ? v : ''); return m ? Number(m[0]) : null; };
const digits = c => String(c.args[0]).split('');
const MAP = {
  // Floor 2, Logic Gardens
  'z2-status-report': ['wall', { n: 'Your program prints a status report. It goes up on the signal wall, line by line.' }],
  'z9-console-input': ['meter', { val: lastNumber, inp: 'stdin', n: 'The operator types a name and a number of cells. The meter fills to the number your program prints.' }],
  'z2-shelf-slots': ['track', { mode: 'slots', n: 'Your code says how many shelf slots are needed. Full crates and loose cells then go in, one to a slot.',
    units: c => Array(Math.floor(c.args[0] / c.args[1])).fill('crate').concat(Array(c.args[0] % c.args[1]).fill('cell')),
    say: (c, u) => { const full = u.filter(x => x === 'crate').length; return plural(full, 'full crate') + ' and ' + plural(u.length - full, 'loose cell') + ': ' + plural(u.length, 'slot') + '.'; } }],
  'z2-name-plates': ['wall', { n: 'A name goes in. The tag your code makes from it is stamped on the wall.' }],
  'z2-relay-modes': ['cells', { mode: 'val', cells: 'answers', need: c => 'charge ' + show(c.args[0]) + ' · heat ' + show(c.args[1]), n: 'One cell for each relay mode. PIP switches on the one your code names.' }],
  'z7-leap-cycle': ['bridge', { ask: 'a leap year?', n: 'Is it a leap year? True sends PIP across. The bridge holds only in a leap year.' }],
  'z2-fizz-buzz': ['belt', { rows: c => [Array.from({ length: clamp(c.args[0], 0, 10) }, (v, k) => String(k + 1))], n: 'The numbers go in. Your list comes out on the belt, one crate for each number.' }],
  'z2-running-sum': ['track', { mode: 'list', n: 'The charge builds up cell by cell. Each running total your code returns becomes a bar.' }],
  'z2-palindrome-number': ['bridge', { ask: 'the same both ways?', planks: digits, weak: c => TRUE.mirror(digits(c)), why: (c, k) => { const d = digits(c); return d[0] === '-' ? 'The minus sign has no partner at the other end.' : 'From the two ends inward, "' + d[k] + '" meets "' + d[d.length - 1 - k] + '".'; }, n: 'One plank for each digit. The bridge holds only if the number reads the same both ways.' }],
  'z2-two-sum': ['cells', { mode: 'idx', need: c => 'needs ' + show(c.args[1]), n: 'Two cells must add up to the number on the gate. Your code returns their positions.' }],
  // Floor 3, Cipher Hall
  'z7-tape-splice': ['wall', { n: 'The tape is cut and joined again. What your code returns is played on the wall.' }],
  'z7-reverse-words': ['belt', { split: 'words', n: 'One crate for each word. Your sentence comes out on the belt, word by word.' }],
  'z7-common-prefix': ['wall', { words: true, n: 'Several call signs go in. The part they all start with comes out.' }],
  'z7-caesar': ['belt', { split: 'chars', n: 'One crate for each letter. The shifted message comes out letter by letter.' }],
  'z7-flexible-functions': ['cells', { mode: 'summary', need: () => 'lowest · highest · average', n: 'One cell for each reading. PIP picks out the lowest and the highest your code found.' }],
  'z8-modules': ['track', { mode: 'hops' }],
  'z7-safe-parse': ['meter', { inp: 'list', n: 'Sensor readings, some of them faulty. The meter fills with the total your code makes of them.' }],
  'z7-bug-hunt': ['track', { n: 'One bar for each reading. Your code returns the average of those above the limit.', truth: (c, bars) => { const lim = c.args[1], over = bars.map((v, k) => (v > lim ? k : -1)).filter(k => k >= 0), avg = over.length ? over.reduce((a, k) => a + bars[k], 0) / over.length : 0; return same(avg, c.want) ? { marks: over, say: over.length ? plural(over.length, 'reading') + ' above ' + numText(lim) + ', average ' + numText(avg) + '.' : 'No reading is above ' + numText(lim) + ': the answer is 0.' } : null; } }],
  'z7-decoder': ['meter', { inp: 'text', n: 'Lines of a coded message. The meter fills with the number your decoder gets out of them.' }],
  // Floor 4, Data Vaults
  'z3-contains-duplicate': ['bridge', { ask: 'any value twice?', planks: c => un(c.args[0]), weak: c => Math.floor(un(c.args[0]).length / 2), n: 'One plank for each value. True says a value appears twice.' , why: () => 'No value appears twice here.' }],
  'z8-pythonic-loops': ['belt', { split: 'chars', n: 'Two words go in. Their letters come out woven together.' }],
  'z3-valid-anagram': ['bridge', { ask: 'the same letters?', n: 'Two words. True says one is the other with its letters shuffled.', why: () => 'The two words are not made of the same letters.' }],
  'z3-two-sum-fast': ['cells', { mode: 'idx', need: c => 'needs ' + show(c.args[1]), n: 'The same gate, a longer row. Two cells must add up to the number on it.' }],
  'z3-sorted-squares': ['belt', { n: 'The numbers go in sorted. Their squares must come out sorted too.' }],
  'z3-max-profit': ['track', { n: 'One bar for each day\'s price. Your code returns the best profit from buying once and selling later.', truth: (c, p) => { const t = TRUE.trade(p); return t[2] === c.want ? { marks: t[2] ? [t[0], t[1]] : [], say: t[2] ? 'Buy at ' + numText(p[t[0]]) + ', sell at ' + numText(p[t[1]]) + ': a profit of ' + numText(t[2]) + '.' : 'The price only falls. No trade: a profit of 0.' } : null; } }],
  'z3-rotate-array': ['belt', { via: 'inplace', n: 'The ring is turned. The list your code leaves behind comes out on the belt.' }],
  'z3-top-k-frequent': ['cells', { mode: 'val', cells: 'distinct', need: c => 'the ' + show(c.args[1]) + ' busiest', n: 'One cell for each channel. PIP picks the ones your code calls the busiest.' }],
  'z3-group-anagrams': ['belt', { group: true, n: 'Shards go in. Each crate that comes out is one shelf of words made from the same letters.' }],
  // Floor 5, Signal Archive
  'z9-read-log': ['meter', { inp: 'file', n: 'The log file is on the left. The meter fills with the number of alerts your code counts.' }],
  'z9-write-report': ['wall', { file: true, n: 'Your code writes a file. Its contents go up on the wall, line by line.' }],
  'z9-pattern-scan': ['cells', { mode: 'val', cells: 'words', need: () => 'part codes', n: 'One cell for each word of the message. PIP picks the ones your pattern found.' }],
  'z9-field-extract': ['belt', { rows: c => [[bare(c.args[0], 26)]], n: 'One reading goes in. Its fields come out, each in its own crate.' }],
  'z9-incident-report': ['wall', { file: true, n: 'Your code reads a log and writes a report. The report goes up on the wall.' }],
  // Floor 6, Pattern Forge
  'z4-valid-palindrome': ['cells', { mode: 'mirror', need: () => 'a mirror?', n: 'Letters and digits only. Two scanners walk in from the ends and compare what they stand on.' }],
  'z4-valid-parentheses': ['bridge', { ask: 'every bracket closed?', planks: c => String(c.args[0]).split(''), weak: c => TRUE.brackets(String(c.args[0])), why: (c, k) => 'The bracket at position ' + k + ' is where it goes wrong.', n: 'One plank for each bracket. The bridge holds only if every bracket closes in the right order.' }],
  'z4-binary-search': ['cells', { mode: 'probe', need: c => 'find ' + show(c.args[1]), n: 'A sorted row of relays. Your code returns the position of the one on the gate, or -1.' }],
  'z8-single-number': ['belt', { one: true, pairs: true, n: 'Every part has a twin except one. The twins go dark. Your code names the one left.' }],
  'z4-maximum-subarray': ['track', { n: 'Surges up and drains down. Your code returns the largest total of any unbroken run.', truth: (c, a) => { const r = TRUE.surge(a); return r[2] === c.want ? { marks: Array.from({ length: r[1] - r[0] + 1 }, (v, k) => r[0] + k), say: 'The strongest run adds up to ' + numText(r[2]) + '.' } : null; } }],
  'z4-longest-substring': ['wall', { window: true, n: 'A signal goes in. Your code returns the length of its longest stretch with no letter twice.' }],
  'z8-product-except-self': ['track', { mode: 'list', n: 'For each position, the product of all the others. Each one becomes a bar.' }],
  'z4-merge-intervals': ['belt', { group: true, n: 'Shifts go in, some overlapping. The merged shifts come out, one crate each.' }],
  'z4-three-sum': ['cells', { mode: 'val', triples: true, need: () => 'three that add to 0', n: 'Three cells that balance to zero. PIP tries each triple your code returns.' }],
  // Floor 7, Structure Works
  'z5-min-stack': ['belt', { ops: true, via: 'ops', n: 'Every call made on your stack is a card. What the call returned comes out under it.' }],
  'z8-inheritance': ['wall', { expr: true, n: 'A call on one of your sensor classes. What it returns goes up on the wall.' }],
  'z8-recursion': ['meter', { n: 'Crates inside crates. The meter fills with the total weight your code finds.' }],
  'z5-reverse-linked-list': ['chain', { n: 'A chain goes in. The chain your code returns must be the same nodes, back to front.' }],
  'z8-merge-two-lists': ['belt', { n: 'Two sorted lines go in. One sorted line must come out.' }],
  'z5-max-depth': ['tree', { mode: 'depth', n: 'The tree hangs over the deck. Your code returns how many levels deep it goes.' }],
  'z5-level-order': ['belt', { group: true, n: 'The tree goes in as a list. It comes out floor by floor, one crate for each level.' }],
  'z8-validate-bst': ['tree', { mode: 'bst', n: 'Is it a search tree? Read left to right, every value must be larger than the one before.' }],
  'z5-lru-cache': ['belt', { ops: true, via: 'ops', n: 'Every call made on your cache is a card. What the call returned comes out under it.' }],
  // Floor 8, Path Reactor
  'z8-matrix': ['grid', { mode: 'grid', n: 'A grid goes in. The grid your code returns is laid out next to it, tile by tile.' }],
  'z4-climbing-stairs': ['track', { stairs: true, plain: true, bars: c => Array.from({ length: clamp(c.args[0], 1, 12) }, (v, k) => k + 1), n: 'PIP climbs one or two steps at a time. Your code returns how many different ways there are.', truth: c => ({ say: 'There are ' + numText(c.want) + ' ways to climb ' + plural(c.args[0], 'step') + '.' }) }],
  'z8-house-robber': ['cells', { mode: 'robber', need: () => 'no two neighbours', n: 'Take charge from the cells, but never from two next to each other. Your code returns the most you can take.' }],
  'z8-unique-paths': ['grid', { mode: 'routes', n: 'PIP may only move right or down. Your code returns how many routes lead to the far corner.' }],
  'z5-coin-change': ['track', { mode: 'slots', n: 'Your code says how few cells make the amount. That many slots open, and the cells go in.', units: c => { const got = TRUE.coins(un(c.args[0]), c.args[1]); return got ? got.map(numText) : null; }, say: (c, u) => u.join(' + ') + ' = ' + numText(c.args[1]) + ': ' + plural(u.length, 'cell') + '.' }],
  'z8-jump-game': ['bridge', { ask: 'can PIP reach the end?', planks: c => un(c.args[0]), route: c => TRUE.jumps(un(c.args[0])), why: (c, k) => 'PIP is stuck at position ' + k + ': no hop from there goes further.', n: 'Each plank says how far PIP may hop from it. True says the last plank can be reached.' }],
  'z5-number-of-islands': ['grid', { mode: 'islands', n: 'Lit tiles are powered. Tiles that touch form one island. Your code returns how many islands there are.' }],
  'z8-subsets': ['belt', { group: true, n: 'A crew goes in. Every possible team must come out, one crate for each.' }],
  'z6-course-schedule': ['graph', {}],
  // Floor 9, Summit Core
  'z6-fibonacci-generator': ['track', { mode: 'list', bars: () => [], n: 'The pulse grows. Each value your generator yields becomes a bar.' }],
  'z6-memoize-decorator': ['belt', { rows: c => [[show({ raw: c.callText }, 30)]], n: 'A list of results from the remembered function. Each one comes out and is checked.' }],
  'z6-vector-class': ['wall', { expr: true, n: 'An expression using your Vector class. Its value goes up on the wall.' }],
  'z6-permutations': ['belt', { group: true, n: 'Charges go in. Every firing order must come out, one crate for each.' }],
  'z6-longest-increasing-subsequence': ['track', { n: 'One bar for each reading. Your code returns the length of the longest rising run you can pick out.', truth: (c, a) => { const r = TRUE.rising(a); return r.length === c.want ? { marks: r, say: 'A rising run of ' + r.length + ': ' + r.map(k => numText(a[k])).join(', ') + '.' } : null; } }],
  'z8-trie': ['belt', { ops: true, via: 'ops', n: 'Every call made on your index is a card. What the call returned comes out under it.' }],
  'z5-kth-largest': ['cells', { mode: 'val', need: c => 'the ' + ordinal(c.args[1]) + ' strongest', n: 'One cell for each beacon. PIP picks the one your code calls the kth strongest.' }],
  'z6-trapping-rain-water': ['track', { n: 'Cooling fins of different heights. Your code returns how much coolant they hold between them.', truth: (c, h) => { const wtr = TRUE.water(h), sum = wtr.reduce((a, v) => a + v, 0); return sum === c.want ? { water: wtr, say: 'The fins hold ' + numText(sum) + '.' } : null; } }],
  'z6-merge-k-sorted-lists': ['chain', { n: 'Several sorted chains go in. One sorted chain must come out, and it lights the beacon.' }],
};

// ---------------------------------------------------------------- planning a scene for one test of a level
const namesOf = lv => (String(lv.solution || '').match(/^(?:def|class)\s+[A-Za-z_]\w*/gm) || []).map(s => s.replace(/^(?:def|class)\s+/, ''));
function paramsOf(lv, fn) {
  const m = new RegExp('^def\\s+' + fn + '\\s*\\(([^)]*)\\)', 'm').exec(String(lv.solution || ''));
  return m ? m[1].split(',').map(s => s.replace(/[=:].*$/, '').replace(/\*/g, '').trim()).filter(s => s && s !== 'self') : [];
}
function context(lv, i, o) {
  const t = lv.tests[i], names = namesOf(lv), code = (t.setup ? t.setup + '\n' : '') + (t.call || '');
  const c = { lv, t, i, o, fn: null, via: null, args: [], kw: {}, params: [], callText: String(t.show || t.call || ''), want: t.stdout !== undefined ? String(t.stdout) : read(t.expect) };
  let call = null;
  if (o.via) { call = findCall(code, [o.via]); if (call) c.via = o.via; }
  if (!call) call = findCall(code, names);
  if (call) {
    c.fn = call.call; c.args = call.args; c.kw = call.kw;
    if (c.via === 'inplace') { c.fn = (call.args[0] && call.args[0].name) || names[0]; c.args = call.args.slice(1); }
    c.params = paramsOf(lv, c.via === 'ops' ? '__none__' : c.fn);
    const vague = v => (Array.isArray(v) ? v.some(vague) : !!v && typeof v === 'object' && (v.name !== undefined || v.call !== undefined || v.raw !== undefined));
    c.loose = c.args.slice(c.via === 'ops' ? 1 : 0).map(un).some(vague);         // a loop variable, or a value made in the setup: the scene cannot see it
  }
  return c;
}
// The scene for test i of a level. A test that does not fit the level's own kind of scene falls back to the wall, which
// can show any call and any value.
function plan(lv, i) {
  const conf = MAP[lv.id] || ['wall', { expr: true }], t = lv.tests[i];
  if (!t) return null;
  let made = null, type = conf[0];
  try { const c = context(lv, i, conf[1]); need(!c.loose || type === 'wall'); made = TYPES[type](c); } catch (e) { made = null; }
  if (!made) { type = 'wall'; made = TYPES.wall(context(lv, i, { expr: true, n: conf[1].n })); }
  return { type, home: conf[0], test: i, stage: made.stage, act: made.act };
}
// Which test to show: the first that fails and fits the level's scene, otherwise the first that fits.
function choose(lv, results) {
  const home = (MAP[lv.id] || ['wall'])[0], usable = lv.tests.map((t, i) => i).filter(i => !lv.tests[i].perf);
  const failing = usable.filter(i => results && results[i] && !results[i].ok);
  const fits = i => { const p = plan(lv, i); return !!p && p.type === home; };
  if (failing.length) return failing.find(fits) !== undefined ? failing.find(fits) : failing[0];
  const first = usable.find(fits);
  return first !== undefined ? first : (usable.length ? usable[0] : 0);
}
// The beats for one run: what the test returned, read back from Python's text, acted out on the stage.
function act(scene, result) {
  if (!scene) return [];
  if (!result) return [B.end(false)];
  let beats = null;
  if (result.error) beats = [B.note((result.error.type === 'StepLimit' ? 'The code ran for too long and was stopped' : result.error.type + (result.errorLine ? ' on line ' + result.errorLine : '')) + '. Nothing came back.', 'bad'), B.pip('sad'), B.end(false)];
  else {
    const got = result.stdout ? String(result.got || '') : read(result.full !== undefined ? result.full : result.got);
    try { beats = scene.act(got, !!result.ok); } catch (e) { beats = null; }
    const last = beats && beats[beats.length - 1];
    // the test's verdict is the only verdict: a play that disagrees with it is replaced by a plain ending
    if (!last || last.a !== 'end' || last.ok !== !!result.ok) beats = result.ok ? [B.end(true)] : [B.note('The answer is not the one that was asked for.', 'bad'), B.pip('sad'), B.end(false)];
  }
  // Whatever went wrong, the piece that gives the scene's verdict (its gate, its lamp, its readout) shows it.
  const v = scene.stage.verdict, piece = v && scene.stage.props.find(p => p.id === v);
  if (piece && !result.ok) {
    const all = [], walk = list => { for (const b of list) { all.push(b); if (b.b) walk(b.b); } };
    walk(beats);
    const told = all.some(b => [].concat(b.id).indexOf(v) >= 0 && (b.a === 'jam' || (b.a === 'mark' && b.s === 'bad') || (b.a === 'txt' && b.tone === 'bad')));
    if (!told) beats.splice(beats.length - 1, 0, piece.k === 'gate' ? { a: 'jam', id: v } : B.mark(v, 'bad'));
  }
  return beats;
}

/* What js/world.js has to know.
   stage: { w, d, props, pip: [x, z], note, el, top }
     the deck is w wide and d deep; x runs left to right, z towards the camera. el: how steeply the camera looks down,
     when the usual angle will not do. top: how high the play will reach, when that is higher than what stands there.
   props, each with an id and a place (x, z, and y when it does not stand on the deck: it then gets a step to stand on):
     crate {t, wd, tone: in | out | card, air}    cell {t, sub, slim}     bar {h, t, tone: water, slim}    tile {t, tone}
     node {t, air}    sign {t, wd, sz, tone}    screen {rows: [{tag, text, id, out}]}    gate {t}    bridge {n, pitch, labels}
     tube {}    link {a, b, arrow}    slot {wd}    pad {wd, dp}    lamp {}    flag {t}
   beats:
     go, hop {to: id | [x, z], y}    zap {id}    mark {id | [ids], s: ok | bad | pick | on | dim | off}    new {p, from}
     txt {id, t, tone}    type {id, row, text, marks}    hl {id, row, from, to}    open, jam {id}    extend {id, ghost}
     snap {id, at}    fill {id, to}    ring {id, at, t}    spin {id}    pip {do: sad | no | fall}    note {t, s}
     wait {t}    all {b}    end {ok} */
root.PylonScenes = { plan, choose, act, parse, read, show, same, findCall, MAP, TYPES: Object.keys(TYPES), TRUE, treeOf };
if (typeof module !== 'undefined' && module.exports) module.exports = root.PylonScenes;
})(typeof window !== 'undefined' ? window : globalThis);
