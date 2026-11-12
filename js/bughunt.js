/* Pylon's bug hunt: the part that changes one small thing in a working solution.
   Pure text work, with no DOM and no interpreter, so the same code runs in the game and in tools/check_bughunt.js.
   The caller runs each candidate against the level's tests and keeps one that breaks them (see judge). */
(function (root) {
'use strict';
// The slips a tired programmer really makes: an off-by-one, a comparison the wrong way round, the wrong one of a pair.
const SWAPS = {
  '<=': '<', '>=': '>', '<': '<=', '>': '>=', '==': '!=', '!=': '==', '+=': '-=', '-=': '+=', '^=': '|=',
  ' + ': ' - ', ' - ': ' + ', ' * ': ' + ', ' % ': ' // ', '//': '%', '** ': '* ',
  and: 'or', or: 'and', True: 'False', False: 'True', 'is not': 'is', is: 'is not', 'not in': 'in', 'not ': '',
  'min(': 'max(', 'max(': 'min(', 'ceil(': 'floor(', 'floor(': 'ceil(', 'fullmatch(': 'match(',
  '.popleft()': '.pop()', '.pop()': '.pop(0)', '.left': '.right', '.right': '.left',
  '[0]': '[1]', '[-1]': '[0]', '[::-1]': '[:]', '= 0': '= 1', '= 1': '= 0',
};
// Longer operators come first, so "->", "**" and ">>" are recognised and left alone instead of being read as "<" or ">".
const FIND = new RegExp([
  '->', '\\*\\* ', '\\*\\*=?', '<<=?', '>>=?', '//=?', '<=', '>=', '==', '!=', '\\+=', '-=', '\\^=', '<', '>',
  '\\bis not\\b', '\\bnot in\\b', '\\bis\\b', '\\bnot ', '\\b(?:and|or|True|False)\\b',
  '\\b(?:min|max|ceil|floor|fullmatch)\\(', '\\.popleft\\(\\)', '\\.pop\\(\\)', '\\.(?:left|right)\\b',
  '\\[::-1\\]', '\\[0\\]', '\\[-1\\]', ' [-+*%] ', '= [01](?=[ \\t]*(?:#|$))',
].join('|'), 'gm');
// Slips that need a piece of the original: a range one short, a count that starts at 1, a forgotten sort, a lost minus sign.
const SHAPES = [
  [/\brange\(len\((\w+)\)\)/g, 'range(len($1) - 1)'],
  [/\brange\((\w+)\)/g, 'range($1 - 1)'],
  [/\brange\(1, /g, 'range(0, '],
  [/\benumerate\((\w+)\)/g, 'enumerate($1, 1)'],
  [/\bsorted\((\w+)\)/g, '$1'],
  [/\[-(\w+):\]/g, '[$1:]'],
  [/\[:-(\w+)\]/g, '[:$1]'],
];

// Marks the text that is not logic, where a change would not be a bug: 1 inside a string, 2 inside a comment, 0 elsewhere.
function mask(code) {
  const out = new Uint8Array(code.length);
  let i = 0;
  while (i < code.length) {
    const c = code[i];
    if (c === '#') { while (i < code.length && code[i] !== '\n') out[i++] = 2; continue; }
    if (c === '"' || c === "'") {
      const q = code.startsWith(c + c + c, i) ? c + c + c : c;
      let j = i + q.length;
      while (j < code.length && !code.startsWith(q, j) && !(q.length === 1 && code[j] === '\n')) j += code[j] === '\\' ? 2 : 1;
      j = Math.min(code.length, j + q.length);
      out.fill(1, i, j);
      i = j;
      continue;
    }
    i++;
  }
  return out;
}
// One line without its comment and its indentation, for showing a change on its own.
function bare(line) {
  const kind = mask(line);
  let end = 0;
  while (end < line.length && kind[end] !== 2) end++;
  return line.slice(0, end).trim();
}
// Every place where a slip could be made: { at, len, to }, in the order they appear.
function spots(code) {
  const inText = mask(code), out = [];
  const lineOf = at => { const from = code.lastIndexOf('\n', at - 1) + 1, end = code.indexOf('\n', at); return code.slice(from, end < 0 ? code.length : end); };
  const add = (at, len, to) => {
    for (let i = at; i < at + len; i++) if (inText[i]) return;
    if (/^\s*(?:def |class |import |from |assert |@)/.test(lineOf(at))) return;      // the bug goes in the logic, not in a signature
    out.push({ at, len, to });
  };
  FIND.lastIndex = 0;
  for (let m = FIND.exec(code); m; m = FIND.exec(code)) if (Object.prototype.hasOwnProperty.call(SWAPS, m[0])) add(m.index, m[0].length, SWAPS[m[0]]);
  for (const shape of SHAPES) {
    shape[0].lastIndex = 0;
    for (let m = shape[0].exec(code); m; m = shape[0].exec(code)) add(m.index, m[0].length, shape[1].replace('$1', m[1]));
  }
  return out.sort((a, b) => a.at - b.at);
}
// The code with one slip made, the line it is on, and that line before and after.
function apply(code, spot) {
  const changed = code.slice(0, spot.at) + spot.to + code.slice(spot.at + spot.len), line = code.slice(0, spot.at).split('\n').length;
  return { code: changed, line, bad: changed.split('\n')[line - 1], good: code.split('\n')[line - 1] };
}
// What a run of the level's tests says about a candidate: 'good' when some tests still pass and none hangs, 'weak' when
// every test fails, 'hang' when one runs out of steps, and null when the change did not matter or the code no longer starts.
function judge(res) {
  if (!res || res.error || res.ok || !res.tests || !res.tests.length) return null;
  if (res.tests.some(t => t.slow)) return 'hang';
  return res.tests.some(t => t.ok) ? 'good' : 'weak';
}
// A small repeatable random source: the same text always gives the same sequence.
function seeded(text) {
  let a = 2166136261;
  for (let i = 0; i < text.length; i++) a = Math.imul(a ^ text.charCodeAt(i), 16777619);
  return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function shuffled(list, rnd) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)), x = a[i]; a[i] = a[j]; a[j] = x; }
  return a;
}

root.PylonBugs = { SWAPS, SHAPES, mask, bare, spots, apply, judge, seeded, shuffled };
if (typeof module !== 'undefined' && module.exports) module.exports = root.PylonBugs;
})(typeof window !== 'undefined' ? window : globalThis);
