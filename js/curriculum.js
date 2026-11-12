/* The shape of the tower: which floors exist and which levels stand on each, in order.
   Level files describe levels; this file decides where they go, so the path can be rebalanced in one place.
   (A level's id keeps the number of the file it was written in. Its floor is whatever this table says.) */
(function (root) {
'use strict';
const FLOORS = [
  { name: 'Boot Deck', color: '#2ee6c8', title: 'Trainee', blurb: 'Wake PIP up. Calls, loops, decisions and your own functions.',
    levels: ['z1-first-steps', 'z1-turn-the-corner', 'z1-dont-repeat-yourself', 'z1-square-patrol', 'z1-until-the-wall', 'z1-fork-in-the-road', 'z1-teach-pip-a-trick', 'z1-the-maze'] },
  { name: 'Logic Gardens', color: '#ffb545', title: 'Intern', blurb: 'Values, text, decisions and loops. Your first real functions.',
    levels: ['z2-status-report', 'z2-shelf-slots', 'z2-name-plates', 'z2-relay-modes', 'z7-leap-cycle', 'z2-fizz-buzz', 'z2-running-sum', 'z2-palindrome-number', 'z2-two-sum'] },
  { name: 'Cipher Hall', color: '#8be36a', title: 'Technician', blurb: 'Slices and text tools, functions with options, modules, errors you can handle, and finding bugs.',
    levels: ['z7-tape-splice', 'z7-reverse-words', 'z7-common-prefix', 'z7-caesar', 'z7-flexible-functions', 'z8-modules', 'z7-safe-parse', 'z7-bug-hunt', 'z7-decoder'] },
  { name: 'Data Vaults', color: '#a98bff', title: 'Junior Engineer', blurb: 'Lists, dictionaries, sets and the idioms that keep Python short.',
    levels: ['z3-contains-duplicate', 'z8-pythonic-loops', 'z3-valid-anagram', 'z3-two-sum-fast', 'z3-sorted-squares', 'z3-max-profit', 'z3-rotate-array', 'z3-top-k-frequent', 'z3-group-anagrams'] },
  { name: 'Pattern Forge', color: '#ff6fa8', title: 'Engineer', blurb: 'The patterns behind most interview questions: two pointers, stacks, binary search, bits, windows and intervals.',
    levels: ['z4-valid-palindrome', 'z4-valid-parentheses', 'z4-binary-search', 'z8-single-number', 'z4-maximum-subarray', 'z4-longest-substring', 'z8-product-except-self', 'z4-merge-intervals', 'z4-three-sum'] },
  { name: 'Structure Works', color: '#58b4ff', title: 'Senior Engineer', blurb: 'Classes, inheritance, recursion, linked lists and trees.',
    levels: ['z5-min-stack', 'z8-inheritance', 'z8-recursion', 'z5-reverse-linked-list', 'z8-merge-two-lists', 'z5-max-depth', 'z5-level-order', 'z8-validate-bst', 'z5-lru-cache'] },
  { name: 'Path Reactor', color: '#ff8a5c', title: 'Staff Engineer', blurb: 'Choices that add up: grids, dynamic programming, greedy moves, graphs and backtracking.',
    levels: ['z8-matrix', 'z4-climbing-stairs', 'z8-house-robber', 'z8-unique-paths', 'z5-coin-change', 'z8-jump-game', 'z5-number-of-islands', 'z8-subsets', 'z6-course-schedule'] },
  { name: 'Summit Core', color: '#ffe37a', title: 'Principal Engineer', blurb: 'Generators, decorators, your own operators, tries, heaps and the hard classics.',
    levels: ['z6-fibonacci-generator', 'z6-memoize-decorator', 'z6-vector-class', 'z6-permutations', 'z6-longest-increasing-subsequence', 'z8-trie', 'z5-kth-largest', 'z6-trapping-rain-water', 'z6-merge-k-sorted-lists'] },
];
// How hard a level is in this game, where that differs from the label in its file. LeetCode's own label says how
// hard a problem is in any language; with Python's tools some of them are a size smaller, and one is a size bigger.
const DIFFICULTY = { 'z3-rotate-array': 'Easy', 'z5-min-stack': 'Easy', 'z4-three-sum': 'Hard', 'z5-lru-cache': 'Hard', 'z6-course-schedule': 'Hard' };

const NEWLINE = String.fromCharCode(10), BACKSLASH = String.fromCharCode(92);

// Starters used to carry comments that named the approach. The approach is now the player's to find, so the
// comments go. Only real comments: a "#" inside a string stays where it is.
function bare(code) {
  const kept = [];
  for (const line of String(code).split(NEWLINE)) {
    let cut = -1, quote = '';
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (quote) {
        if (c === BACKSLASH) i++;
        else if (line.startsWith(quote, i)) { i += quote.length - 1; quote = ''; }
      } else if (c === '"' || c === "'") {
        quote = line.substr(i, 3) === c + c + c ? c + c + c : c;
        i += quote.length - 1;
      } else if (c === '#') { cut = i; break; }
    }
    if (cut < 0) { kept.push(line); continue; }
    const before = line.slice(0, cut).replace(/[ \t]+$/, '');
    if (before.trim()) kept.push(before);            // a comment after code leaves the code; a comment line disappears
  }
  return kept.join(NEWLINE);
}

// Puts every level on its floor, numbers it, marks the floor bosses, and attaches the reference cards kept in
// js/toolcards.js. Returns what could not be placed.
function arrange(all) {
  const byId = {}, levels = [], missing = [], cards = root.PYLON_TOOLCARDS || {}, unused = [];
  for (const l of all) byId[l.id] = l;
  for (const [id, from, to] of root.PYLON_LESSON_WORDING || []) {
    const lv = byId[id];
    if (!lv || lv._placed) continue;
    if (lv.lesson.indexOf(from) < 0) unused.push(id + ': ' + from);
    else lv.lesson = lv.lesson.replace(from, to);
  }
  FLOORS.forEach((f, k) => f.levels.forEach((id, j) => {
    const lv = byId[id];
    if (!lv) { missing.push(id); return; }
    lv.zone = k + 1; lv.order = j + 1; lv.boss = j === f.levels.length - 1;
    if (DIFFICULTY[id]) lv.difficulty = DIFFICULTY[id];
    if (!lv._placed) {
      lv._placed = true;
      if (lv.kind === 'code' && !lv.keepStarter) lv.starter = bare(lv.starter);
      const extra = cards[id];
      if (extra) {
        if (extra.lesson) lv.lesson = extra.lesson;
        if (extra.tools) lv.tools = (lv.tools || []).concat(extra.tools);
      }
      lv.tools = lv.tools || [];
    }
    levels.push(lv);
  }));
  const placed = new Set(levels.map(l => l.id));
  for (const id in cards) if (!byId[id]) unused.push(id + ': cards for a level that does not exist');
  return { levels, missing, unplaced: all.filter(l => !placed.has(l.id)).map(l => l.id), unused };
}

root.PylonCurriculum = { FLOORS, DIFFICULTY, arrange, bare };
if (typeof module !== 'undefined' && module.exports) module.exports = root.PylonCurriculum;
})(typeof window !== 'undefined' ? window : globalThis);
