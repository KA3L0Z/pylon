// Checks the course as a whole, in the order the player meets it (js/curriculum.js).
//   node tools/check_curriculum.js [-v] [--todo] [--solutions] [--no-py]
//
//   1. Every level is placed on a floor, once.
//   2. Teach-ahead: every function, method, module member and piece of syntax a model solution uses has a
//      reference card on that level or an earlier one. (A level's cards are shown to the player one level early.)
//   3. Every card example runs in MiniPy and prints something, and CPython prints the same. So do the lesson examples.
//   4. A lesson does not hand over its own level: few lines of the model solution appear in it word for word.
//   5. Craft: every model solution earns all four craft marks, and known bad snippets lose the right ones.
const fs = require('fs');
const path = require('path');
const os = require('os');
const cp = require('child_process');

const rootDir = path.join(__dirname, '..');
const args = process.argv.slice(2), verbose = args.includes('-v'), todo = args.includes('--todo'), dump = args.includes('--solutions'), noPy = args.includes('--no-py');
const MP = require('./minipy.js');
const Runner = require('../js/runner.js');
const prelude = fs.readFileSync(path.join(rootDir, 'tools', 'prelude.py'), 'utf8');
Runner.setPrelude(prelude);
globalThis.window = globalThis;
globalThis.PYLON_LEVELS = [];
for (const f of fs.readdirSync(path.join(rootDir, 'js')).filter(f => /^levels-z\d+\.js$/.test(f)).sort()) require(path.join(rootDir, 'js', f));
if (fs.existsSync(path.join(rootDir, 'js', 'toolcards.js'))) require(path.join(rootDir, 'js', 'toolcards.js'));
const Complete = require('../js/complete.js');
const Craft = require('../js/craft.js');
const Curriculum = require('../js/curriculum.js');

const errors = [], warnings = [];
const placed = Curriculum.arrange(globalThis.PYLON_LEVELS);
const levels = placed.levels;
for (const id of placed.missing) errors.push('curriculum names a level that does not exist: ' + id);
for (const id of placed.unplaced) errors.push('level is not placed on any floor: ' + id);
for (const what of placed.unused) errors.push('toolcards.js entry that matches nothing: ' + what);
{
  const seen = new Set();
  for (const lv of levels) { if (seen.has(lv.id)) errors.push('level is placed twice: ' + lv.id); seen.add(lv.id); }
}

// ---- what a piece of Python uses -------------------------------------------------------------------------------
const BUILTIN = new Set(Complete.BUILTINS.map(b => b.label).concat(['id', 'input', 'open', 'object']));
const METHOD = new Set();
for (const type in Complete.METHODS) for (const m of Complete.METHODS[type]) METHOD.add(m.label);
const PRELUDE = new Set(['ListNode', 'TreeNode', 'linked', 'unlinked', 'tree', 'untree']);
const isName = (node, id) => !!node && node.t === 'Name' && (id === undefined || node.id === id);

function tokens(code) {
  const out = new Set();
  let tree;
  try { tree = MP.parse(code); } catch (e) { return out; }
  const add = t => out.add(t);
  const modules = new Map(), imported = new Map(), notValues = new Set();
  Craft.walk(tree, node => {
    if (node.t === 'Import') node.names.forEach(n => modules.set(n.asname || n.name, n.name));
    if (node.t === 'ImportFrom') node.names.forEach(n => imported.set(n.asname || n.name, node.module + '.' + n.name));
  });
  const visit = (node, stack) => {
    switch (node.t) {
      case 'While': add('kw:while'); if (node.orelse.length) add('kw:loop-else'); break;
      case 'For':
        add('kw:for');
        if (node.target.t !== 'Name') { add('kw:unpack'); notValues.add(node.target); }
        if (node.orelse.length) add('kw:loop-else');
        break;
      case 'If': add('kw:if'); if (node.orelse.length) add(node.orelse.length === 1 && node.orelse[0].t === 'If' ? 'kw:elif' : 'kw:else'); break;
      case 'FunctionDef': {
        const top = stack[stack.length - 1];
        add(top && top.kind === 'def' ? 'kw:nested-def' : 'kw:def');
        if (node.decorators.length) add('kw:decorator');
        const a = node.args;
        if (a.args.some(x => x.default) || a.kwonly.some(x => x.default)) add('kw:default-arg');
        if (a.vararg || a.kwarg) add('kw:*args');
        if (top && top.kind === 'class') { if (node.name === '__init__') add('kw:__init__'); else if (/^__\w+__$/.test(node.name)) add('kw:dunder'); }
        break;
      }
      case 'Lambda': add('kw:lambda'); break;
      case 'Return': add('kw:return'); break;
      case 'ClassDef': add('kw:class'); if (node.bases.length) add('kw:inherit'); break;
      case 'Try': add('kw:try/except'); break;
      case 'Raise': add('kw:raise'); break;
      case 'Yield': case 'YieldFrom': add('kw:yield'); break;
      case 'With': add('kw:with'); break;
      case 'ListComp': case 'SetComp': case 'GeneratorExp': case 'DictComp':
        add(node.t === 'DictComp' ? 'kw:dict-comprehension' : 'kw:comprehension');
        for (const gen of node.generators) if (gen.target.t !== 'Name') { add('kw:unpack'); notValues.add(gen.target); }
        break;
      case 'Subscript': {
        const s = node.slice;
        if (s && s.t === 'Slice') add('kw:slice'); else add('kw:index');
        if (s && s.t === 'UnaryOp' && s.op === '-' && s.operand.t === 'Num') add('kw:negative-index');
        if (s && s.t !== 'Slice' && node.value.t === 'Subscript' && node.value.slice && node.value.slice.t !== 'Slice') add('kw:grid');
        break;
      }
      case 'FStr': add('kw:f-string'); if (node.parts.some(p => p && typeof p === 'object' && p.spec)) add('kw:format-spec'); break;
      case 'Compare':
        for (const op of node.ops) {
          if (op === 'in' || op === 'not in') add('kw:in-test');
          if (op === 'is' || op === 'is not') add('kw:is None');
        }
        if (node.ops.length > 1) add('kw:chained-compare');
        break;
      case 'Assign':
        for (const t of node.targets) if (t.t === 'Tuple' || t.t === 'List') { add('kw:unpack'); notValues.add(t); if (node.value.t === 'Tuple') notValues.add(node.value); }
        break;
      case 'AugAssign':
        add('kw:aug-assign');
        if (node.op === '&' || node.op === '|' || node.op === '^') add('kw:bits');
        if (node.op === '^') add('kw:xor');
        if (node.op === '<<' || node.op === '>>') add('kw:shift');
        if (node.op === '//') add('kw://');
        if (node.op === '%') add('kw:%');
        break;
      case 'Starred': add('kw:*args'); break;
      case 'IfExp': add('kw:ternary'); break;
      case 'BinOp':
        if (node.op === '//') add('kw://');
        else if (node.op === '%') add('kw:%');
        else if (node.op === '**') add('kw:**');
        else if (node.op === '/') add('kw:/');
        else if (node.op === '&' || node.op === '|') add('kw:bits');
        else if (node.op === '^') { add('kw:bits'); add('kw:xor'); }
        else if (node.op === '<<' || node.op === '>>') add('kw:shift');
        else if (node.op === '*' && (node.left.t === 'List' || node.right.t === 'List')) add('kw:list-repeat');
        break;
      case 'BoolOp': add('kw:and/or/not'); break;
      case 'UnaryOp': if (node.op === 'not') add('kw:and/or/not'); break;
      case 'Break': add('kw:break'); break;
      case 'Continue': add('kw:continue'); break;
      case 'Global': case 'Nonlocal': add('kw:nonlocal'); break;
      case 'Assert': add('kw:assert'); break;
      case 'Delete': add('kw:del'); break;
      case 'Import': add('kw:import'); break;
      case 'ImportFrom': add('kw:import'); node.names.forEach(n => add(node.module + '.' + n.name)); break;
      case 'Dict': add('kw:dict-literal'); break;
      case 'Set': add('kw:set-literal'); break;
      case 'Tuple': if (!notValues.has(node)) add('kw:tuple'); break;
      case 'Name':
        if (node.id === 'self') add('kw:self');
        else if (imported.has(node.id)) add(imported.get(node.id));
        else if (BUILTIN.has(node.id)) add(node.id);
        else if (PRELUDE.has(node.id)) add(node.id);
        break;
      case 'Attribute':
        if (isName(node.value) && modules.has(node.value.id)) add(modules.get(node.value.id) + '.' + node.attr);
        else if (node.attr === 'next') add('ListNode');
        else if (node.attr === 'left' || node.attr === 'right') add('TreeNode');
        break;
      case 'Call': {
        const f = node.func;
        if (f.t === 'Attribute' && !(isName(f.value) && modules.has(f.value.id)) && METHOD.has(f.attr)) add('.' + f.attr);
        for (const kw of node.keywords) add(kw.arg === 'key' ? 'kw:key=' : kw.arg === 'reverse' ? 'kw:reverse=' : kw.arg ? 'kw:keyword-arg' : 'kw:*args');
        if (isName(f, 'range') && node.args.length === 3) add('kw:range-step');
        if (isName(f, 'float') && node.args.length === 1 && node.args[0].t === 'Str' && /inf/.test(node.args[0].v)) add('kw:infinity');
        if (f.t === 'Name' && stack.some(s => s.kind === 'def' && s.name === f.id)) add('kw:recursion');
        if (f.t === 'Attribute' && isName(f.value, 'self') && stack.some(s => s.kind === 'def' && s.name === f.attr)) add('kw:recursion');
        break;
      }
      default: break;
    }
    const inner = node.t === 'FunctionDef' || node.t === 'ClassDef' ? stack.concat([{ kind: node.t === 'ClassDef' ? 'class' : 'def', name: node.name }]) : stack;
    for (const child of Craft.children(node)) visit(child, inner);
  };
  visit(tree, []);
  return out;
}

const entities = { lt: '<', gt: '>', amp: '&', quot: '"', nbsp: ' ', times: '×', le: '≤', ge: '≥', rarr: '→', minus: '−' };
const unescape = s => s.replace(/&(\w+);/g, (m, name) => (name in entities ? entities[name] : m));
const examples = html => { const out = []; let m; const re = /<pre>(?:<code>)?([\s\S]*?)(?:<\/code>)?<\/pre>/g; while ((m = re.exec(html || ''))) out.push(unescape(m[1].replace(/<[^>]+>/g, ''))); return out; };
const normLines = code => code.split('\n').map(l => l.replace(/\s+#.*$/, '').trim()).filter(l => l && l[0] !== '#' && l !== 'pass');

// ---- 2. teach-ahead ---------------------------------------------------------------------------------------------
const taught = new Map();           // token -> index of the first level that has it
const index = new Map(levels.map((lv, i) => [lv.id, i]));
levels.forEach((lv, i) => {
  if (lv.kind === 'robot') {
    // The drone floor teaches in place: whatever its lessons and solutions show counts as taught there.
    const seen = tokens(lv.solution || '');
    for (const ex of examples((lv.lesson || '') + (lv.task || ''))) for (const t of tokens(ex)) seen.add(t);
    for (const t of seen) if (!taught.has(t)) taught.set(t, i);
  }
  for (const card of lv.tools || []) {
    for (const key of [card.key].concat(card.also || [])) if (key && !taught.has(key)) taught.set(key, i);
  }
});
const need = levels.map(lv => (lv.kind === 'code' ? tokens(lv.solution || '') : new Set()));
const untaught = levels.map((lv, i) => [...need[i]].filter(t => !(taught.has(t) && taught.get(t) <= i)).sort());
levels.forEach((lv, i) => {
  if (untaught[i].length) errors.push(lv.id + ': the model solution uses tools with no card on this level or before: ' + untaught[i].join('  '));
});
// a card nobody needs here or later is fine (reference); a card that arrives after its first use is caught above

// ---- 3. cards and lesson examples run, and CPython agrees -------------------------------------------------------
const TAGS_INLINE = /<\/?(b|i|code)>/g;
const snippets = [];                // { where, code, out }
levels.forEach(lv => {
  (lv.tools || []).forEach((card, k) => {
    const where = lv.id + ' card ' + (k + 1) + ' (' + (card.key || card.name) + ')';
    if (!card.name || !card.what) { errors.push(where + ': a card needs a name and a "what"'); return; }
    if (/[<>]/.test(card.what.replace(TAGS_INLINE, ''))) errors.push(where + ': "what" may only use b, i and code tags (escape < and > as entities)');
    if ((card.what + (card.code || '')).indexOf(String.fromCharCode(96)) >= 0) errors.push(where + ': no backticks');
    if (!card.code) return;                       // a card about a habit or a button has nothing to run
    let r;
    try { r = Runner.runFree(card.code, 300000); } catch (e) { r = { ok: false, output: '', error: { type: 'CRASH', message: String(e) } }; }
    if (!r.ok) { errors.push(where + ': the example fails in MiniPy: ' + (r.error ? r.error.type + ': ' + r.error.message : '?')); return; }
    if (!r.output.trim()) { errors.push(where + ': the example prints nothing'); return; }
    if (r.output.trim().split('\n').length > 8) warnings.push(where + ': the example prints ' + r.output.trim().split('\n').length + ' lines');
    snippets.push({ where, code: card.code, out: r.output });
  });
  if (lv.kind !== 'code') return;
  examples(lv.lesson).forEach((code, k) => {
    if (code.indexOf('print(') < 0) return;
    let r;
    try { r = Runner.runFree(code, 300000); } catch (e) { return; }
    if (r.ok && r.output.trim()) snippets.push({ where: lv.id + ' lesson example ' + (k + 1), code, out: r.output });
  });
});
if (!noPy && snippets.length) {
  const file = path.join(os.tmpdir(), 'pylon-cards-' + process.pid + '.json');
  fs.writeFileSync(file, JSON.stringify({ prelude, snippets: snippets.map(s => s.code) }));
  const PY = [
    'import sys, json, io, contextlib',
    'data = json.load(open(sys.argv[1], encoding="utf8"))',
    'outs = []',
    'for code in data["snippets"]:',
    '    space = {"__name__": "__main__"}',
    '    buf = io.StringIO()',
    '    try:',
    '        exec(data["prelude"], space)',
    '        with contextlib.redirect_stdout(buf):',
    '            exec(code, space)',
    '        outs.append({"ok": True, "out": buf.getvalue()})',
    '    except Exception as error:',
    '        outs.append({"ok": False, "out": buf.getvalue(), "error": type(error).__name__ + ": " + str(error)})',
    'sys.stdout.write(json.dumps(outs))',
  ].join('\n');
  const run = cp.spawnSync('python', ['-c', PY, file], { encoding: 'utf8', maxBuffer: 1 << 26 });
  try { fs.unlinkSync(file); } catch (e) { /* leave it */ }
  if (run.status !== 0 || !run.stdout) warnings.push('CPython comparison did not run: ' + String(run.stderr || run.error || 'no output').slice(0, 300));
  else {
    const real = JSON.parse(run.stdout);
    snippets.forEach((s, k) => {
      const norm = t => t.replace(/\r\n/g, '\n').replace(/\s+$/, '');
      if (!real[k].ok) errors.push(s.where + ': runs in MiniPy but fails in CPython: ' + real[k].error);
      else if (norm(real[k].out) !== norm(s.out)) errors.push(s.where + ': MiniPy and CPython print different things:\n      MiniPy:  ' + JSON.stringify(norm(s.out)) + '\n      CPython: ' + JSON.stringify(norm(real[k].out)));
    });
  }
}

// ---- 4. lessons that hand over the answer -----------------------------------------------------------------------
const giveaway = levels.map(lv => {
  if (lv.kind !== 'code') return 0;
  const sol = normLines(lv.solution || ''), shown = new Set();
  for (const ex of examples(lv.lesson)) for (const line of normLines(ex)) shown.add(line);
  for (const card of lv.tools || []) for (const line of normLines(card.code || '')) shown.add(line);
  const trivial = /^(else:|try:|return \w+|return (True|False|None)|break|continue)$/;
  const real = sol.filter(line => !trivial.test(line) && !/^(def|class) /.test(line));
  return real.length ? real.filter(line => shown.has(line)).length / real.length : 0;
});
levels.forEach((lv, i) => { if (giveaway[i] > 0.6) warnings.push(lv.id + ': ' + Math.round(giveaway[i] * 100) + '% of the model solution appears word for word in its own lesson and cards'); });

// ---- 5. craft ---------------------------------------------------------------------------------------------------
const craft = levels.map(lv => (lv.kind === 'code' ? Craft.review(lv.solution, lv) : null));
levels.forEach((lv, i) => {
  const r = craft[i];
  if (!r) return;
  if (!r.ok) { errors.push(lv.id + ': craft review could not read the model solution'); return; }
  for (const mark of r.marks) if (!mark.ok) errors.push(lv.id + ': the model solution misses the "' + mark.name + '" mark: ' + mark.notes.map(n => (n.line ? 'line ' + n.line + ': ' : '') + n.text).join(' | '));
  const st = Craft.review(lv.starter, lv);
  if (!st.ok) errors.push(lv.id + ': the starter does not parse after its comments were removed');
});
const CASES = [
  ['concise', 'def f(nums):\n    if not nums: return 0\n    return 1\n'],
  ['concise', 'def f(nums):\n    total = 0; count = 0\n    return total + count\n'],
  ['concise', 'def f(nums):\n' + '    total = 0\n    total += 1\n'.repeat(8) + '    return total\n', 'def f(nums):\n    return len(nums)\n'],
  ['names', 'def f(nums):\n    q = 0\n    for value in nums:\n        q += value\n    return q\n'],
  ['names', 'def f(nums):\n    sum = 0\n    for value in nums:\n        sum += value\n    return sum\n'],
  ['names', 'def f(nums):\n    tmp = sorted(nums)\n    return tmp[0]\n'],
  ['names', 'def f(nums):\n    bestTotal = max(nums)\n    return bestTotal\n'],
  ['names', 'class trie:\n    def size(self):\n        return 0\n'],
  ['pythonic', 'def f(nums):\n    if len(nums) == 0:\n        return 0\n    return nums[0]\n'],
  ['pythonic', 'def f(flag):\n    if flag == True:\n        return 1\n    return 2\n'],
  ['pythonic', 'def f(node):\n    if node == None:\n        return 1\n    return 2\n'],
  ['pythonic', 'def f(nums):\n    total = 0\n    for i in range(len(nums)):\n        total = total + nums[i]\n    return total\n'],
  ['pythonic', 'def f(nums):\n    total = 0\n    for i in range(len(nums)):\n        total += nums[i]\n    return total\n'],
  ['pythonic', 'def f(nums):\n    if nums:\n        return True\n    else:\n        return False\n'],
  ['pythonic', 'def f(nums):\n    if nums:\n        return True\n    return False\n'],
  ['pythonic', 'def f(text):\n    try:\n        return int(text)\n    except:\n        return 0\n'],
  ['pythonic', 'def f(seen, value):\n    return not value in seen\n'],
  ['pythonic', 'def f(nums):\n    count = len(nums)\n    return nums\n'],
  ['pythonic', 'def f(nums):\n    total = 0\n    for i in range(3):\n        total += 1\n    return total\n'],
  ['pythonic', 'def f(nums, found=[]):\n    found.append(nums)\n    return found\n'],
  ['tidy', 'def f(nums):\n  return nums\n'],
  ['tidy', 'def f(nums):\n    total=0\n    return total\n'],
  ['tidy', 'def f(nums):\n    return max(nums[0],nums[1])\n'],
  ['tidy', 'def f(nums):\n    if (nums):\n        return 1\n    return 2\n'],
  ['tidy', 'def f(nums):\n    # total = 0\n    return nums\n'],
  ['tidy', 'def f(nums):\n    print(nums)\n    return nums\n'],
  ['tidy', 'def f(nums):\n    if nums[0]<nums[1]:\n        return 1\n    return 2\n'],
];
const CLEAN = [
  'def f(nums):\n    """Sum the positive numbers."""\n    total = 0\n    for value in nums:\n        if value > 0:\n            total += value\n    return total\n',
  'def f(nums):\n    best = {"a": 1, "b": 2}\n    label = f"{len(nums)}: {best}"\n    pairs = sorted(best.items(), key=lambda pair: -pair[1])\n    return label, pairs[0], nums[1:], "a == b; c,d"\n',
  'def f(nums):\n    for i in range(len(nums)):\n        nums[i] = nums[i] * 2 + i\n    return nums if nums else None\n',
  'class Stack:\n    limit = 10\n\n    def __init__(self):\n        self.items = []\n\n    def push(self, item):\n        self.items.append(item)\n',
];
CASES.forEach(([mark, code, solution], k) => {
  const r = Craft.review(code, { id: 'case' + k, starter: 'def f(nums):\n    pass\n', solution: solution || code, tests: [{ call: 'f([])', expect: '0' }] });
  const got = r.marks.find(m => m.id === mark);
  if (!r.ok || !got || got.ok) errors.push('craft case ' + (k + 1) + ' should lose the "' + mark + '" mark but keeps it:\n' + code);
  else if (verbose) console.log('   craft case ' + (k + 1) + ' [' + mark + '] ' + got.notes[0].text);
  const others = r.marks.filter(m => m.id !== mark && !m.ok);
  if (others.length && verbose) console.log('      (also loses ' + others.map(m => m.id + ': ' + m.notes[0].text).join(' | ') + ')');
});
CLEAN.forEach((code, k) => {
  const r = Craft.review(code, { id: 'clean' + k, starter: 'def f(nums):\n    pass\n', solution: code, tests: [{ call: 'f([])', expect: '0' }] });
  for (const mark of r.marks) if (!mark.ok) errors.push('clean craft sample ' + (k + 1) + ' loses "' + mark.id + '": ' + mark.notes.map(n => 'line ' + n.line + ': ' + n.text).join(' | '));
});

// ---- report -----------------------------------------------------------------------------------------------------
if (dump) {
  levels.forEach((lv, i) => {
    if (lv.kind !== 'code') return;
    console.log('\n### ' + lv.zone + '.' + lv.order + ' ' + lv.id + '  [' + lv.difficulty + '] ' + lv.concept + (lv.classic ? '  {' + lv.classic + '}' : ''));
    console.log('NEED: ' + untaught[i].join('  '));
    console.log(lv.solution.replace(/\s+$/, ''));
  });
} else if (todo) {
  levels.forEach((lv, i) => { if (untaught[i].length) console.log(lv.zone + '.' + lv.order + ' ' + lv.id.padEnd(34) + untaught[i].join('  ')); });
} else {
  let floor = 0;
  levels.forEach((lv, i) => {
    if (lv.zone !== floor) { floor = lv.zone; const f = Curriculum.FLOORS[floor - 1]; console.log('\nFloor ' + floor + '  ' + f.name + '  (' + f.title + ', ' + f.levels.length + ' levels)'); }
    const r = craft[i];
    console.log('  ' + (lv.zone + '.' + lv.order).padEnd(5) + lv.id.padEnd(36) + (lv.kind === 'robot' ? 'drone' : lv.difficulty).padEnd(7) +
      (lv.kind === 'code' ? String((lv.tools || []).length).padStart(2) + ' cards  ' + String(r.model).padStart(2) + ' lines (budget ' + String(r.budget).padStart(2) + ')  ' + String(Math.round(giveaway[i] * 100)).padStart(2) + '% shown' : '').padEnd(46) +
      (lv.boss ? ' BOSS' : '') + (lv.classic ? '  ' + lv.classic : ''));
  });
  const code = levels.filter(lv => lv.kind === 'code');
  console.log('\n' + levels.length + ' levels on ' + Curriculum.FLOORS.length + ' floors: ' + (levels.length - code.length) + ' drone, ' + code.length + ' code (' +
    ['Easy', 'Medium', 'Hard'].map(d => code.filter(lv => lv.difficulty === d).length + ' ' + d).join(', ') + '), ' + code.filter(lv => lv.classic).length + ' classics, ' +
    levels.reduce((n, lv) => n + (lv.tools || []).length, 0) + ' cards, ' + snippets.length + ' examples compared with CPython.');
}
console.log('');
for (const w of warnings) console.log('warning: ' + w);
for (const e of errors) console.log('ERROR: ' + e);
console.log((errors.length ? errors.length + ' errors' : 'no errors') + ', ' + warnings.length + ' warnings');
process.exit(errors.length ? 1 : 0);
