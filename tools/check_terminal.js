// Checks the terminal (js/terminal.js and the live session in js/runner.js), with no page involved.
//   node tools/check_terminal.js
//
//   1. Every level's model solution gives a transcript with one prompt line per test, a value where one is returned,
//      and no error lines. The starting code gives a transcript too, without crashing.
//   2. Lines typed at the prompt answer as Python's own prompt does: the cases below were taken from CPython 3.10.
//      Where MiniPy words a message differently from CPython, the case says so instead of pretending.
//   3. A block is finished by an empty line and an open bracket is not finished at all.
const fs = require('fs');
const path = require('path');
require('./minipy.js');
const Runner = require('../js/runner.js');
const Terminal = require('../js/terminal.js');
const rootDir = path.join(__dirname, '..');
Runner.setPrelude(fs.readFileSync(path.join(rootDir, 'tools', 'prelude.py'), 'utf8'));
globalThis.window = globalThis;
globalThis.PYLON_LEVELS = [];
for (const f of fs.readdirSync(path.join(rootDir, 'js')).filter(f => /^levels-z\d+\.js$/.test(f)).sort()) require(path.join(rootDir, 'js', f));
if (fs.existsSync(path.join(rootDir, 'js', 'toolcards.js'))) require(path.join(rootDir, 'js', 'toolcards.js'));
const levels = require('../js/curriculum.js').arrange(globalThis.PYLON_LEVELS).levels;
const errors = [];
let lines = 0;

for (const lv of levels) {
  const good = Runner.run(lv, lv.solution), t = Terminal.transcript(lv, good, lv.solution);
  lines += t.length;
  if (!t.length || t[0].k !== 'sh') errors.push(lv.id + ': the transcript does not start with a command');
  if (t.some(l => l.k === 'err')) errors.push(lv.id + ': the model solution shows an error: ' + t.find(l => l.k === 'err').t);
  if (t.some(l => typeof l.t !== 'string')) errors.push(lv.id + ': a line that is not text');
  if (lv.kind === 'code') {
    const asked = t.filter(l => (l.k === 'in' || l.k === 'sh') && l.ok !== undefined);
    if (asked.length !== lv.tests.length) errors.push(lv.id + ': ' + asked.length + ' tests in the transcript, ' + lv.tests.length + ' in the level');
    if (asked.some(l => l.ok !== true)) errors.push(lv.id + ': a test of the model solution is marked wrong');
  }
  let start;
  try { start = Terminal.transcript(lv, Runner.run(lv, lv.starter), lv.starter); } catch (e) { errors.push(lv.id + ': the starting code crashed the transcript: ' + e.message); continue; }
  if (lv.kind === 'code' && !start.some(l => l.ok === false || l.k === 'err')) errors.push(lv.id + ': the starting code shows nothing wrong');
}

// Typed at the prompt, against this file. [what is typed, what CPython 3.10 prints]
const FILE = 'def half(n):\n    return 10 // n\n\ndef pick(items):\n    return half(items[3])\n';
const CASES = [
  ['1 + 1', '2'],
  ['x = 5', ''],
  ['x', '5'],
  ['x * 2.5', '12.5'],
  ["print('hi', x)", 'hi 5'],
  ['None', ''],
  ['"it\'s"', '"it\'s"'],
  ["[1, 2.0, 'a', None, True]", "[1, 2.0, 'a', None, True]"],
  ['(1,)', '(1,)'],
  ["{'a': 1}", "{'a': 1}"],
  ['half(4)', '2'],
  ['_', '2'],
  ['def twice(v):\n    return v * 2', ''],
  ['twice("ab")', "'abab'"],
  ['for k in range(2):\n    print(k)', '0\n1'],
  ['missing', 'Traceback (most recent call last):\n  File "<stdin>", line 1, in <module>\nNameError: name \'missing\' is not defined'],
  ['half(0)', 'Traceback (most recent call last):\n  File "<stdin>", line 1, in <module>\n  File "main.py", line 2, in half\n    return 10 // n\nZeroDivisionError: integer division or modulo by zero'],
  ['pick([1, 2])', 'Traceback (most recent call last):\n  File "<stdin>", line 1, in <module>\n  File "main.py", line 5, in pick\n    return half(items[3])\nIndexError: list index out of range'],
  ['pick([1, 2, 3, 0])', 'Traceback (most recent call last):\n  File "<stdin>", line 1, in <module>\n  File "main.py", line 5, in pick\n    return half(items[3])\n  File "main.py", line 2, in half\n    return 10 // n\nZeroDivisionError: integer division or modulo by zero'],
  ["{'a': 1}['b']", 'Traceback (most recent call last):\n  File "<stdin>", line 1, in <module>\nKeyError: \'b\''],
  ['x = = 2', '  File "<stdin>", line 1\n    x = = 2\nSyntaxError: invalid syntax'],          // CPython adds a caret line under the code; MiniPy has no columns
  ['while True:\n    pass', 'Stopped: the code ran for too long. A loop probably never ends.'],      // CPython would run until Ctrl+C
  ['x', '5'],                                                                                        // and the session is still alive afterwards
];
const session = Runner.repl({ kind: 'code', tests: [] }, FILE);
if (session.error) errors.push('the file for the prompt cases did not load');
for (const [typed, want] of CASES) {
  const got = Terminal.reply(session.line(typed), FILE).map(l => l.t).join('\n');
  if (got !== want) errors.push('typed ' + JSON.stringify(typed) + '\n     want ' + JSON.stringify(want) + '\n     got  ' + JSON.stringify(got));
}
const P = [[['def f(n):'], true], [['def f(n):', '    return 1'], true], [['def f(n):', '    return 1', ''], false], [['x = (1 +'], true], [['x = (1 +', '2)'], false], [['x = 1'], false],
  [['d = {1: 2}'], false], [['s = "a # b ("'], false], [['if x:  # why'], true], [['print("""a'], true]];
for (const [typed, want] of P) if (Terminal.pending(typed) !== want) errors.push('pending(' + JSON.stringify(typed) + ') should be ' + want);

console.log(levels.length + ' levels written down (' + lines + ' lines), ' + CASES.length + ' lines typed at the prompt, ' + P.length + ' unfinished-input cases');
for (const e of errors.slice(0, 40)) console.log('ERROR: ' + e);
console.log(errors.length + ' errors');
process.exit(errors.length ? 1 : 0);
