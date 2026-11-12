/* Pylon craft marks: what separates a solution that passes from one you would be glad to read again.
   Pure analysis of the player's source, no DOM. It reads the code through MiniPy's parser, so it sees the program
   the way Python does and never guesses from the text alone (layout checks excepted, which are about the text).

   Four marks, each earned or not:
     concise    no longer than the model solution allows, and not by cramming statements together
     names      names that say what they hold
     pythonic   Python's own way of saying it
     tidy       layout: indentation, spacing, nothing left over

   PylonCraft.review(code, level) -> { ok, earned, bits, lines, budget, model, marks: [{ id, name, ok, notes: [{ line, text }] }] }
   Notes are plain text; a part in backticks is code. */
(function (root) {
'use strict';

const MARKS = [
  { id: 'concise', name: 'Concise', tip: 'No longer than it needs to be, one statement per line.' },
  { id: 'names', name: 'Clear names', tip: 'Names say what they hold.' },
  { id: 'pythonic', name: 'Pythonic', tip: 'Python\'s own way of saying it.' },
  { id: 'tidy', name: 'Tidy', tip: 'Clean layout, nothing left over.' },
];
const XP_PER_MARK = 10;
const MAX_LINE = 88;

// One-letter names with a meaning everybody knows: counters, sizes, coordinates, a pair, "unused".
const SHORT_OK = new Set(['i', 'j', 'k', 'n', 'm', 'x', 'y', 'z', 'r', 'c', 'a', 'b', '_']);
const VAGUE = /^(tmp|temp|foo|bar|baz|qux|var|thing|stuff|asdf|blah|variable|aa|bb|ll|xx|yy|zz|lst|arr|array|list|dict|str|string|my_[a-z]+|my(var|list|dict|str|string|num|number|set|array|func|function))_?\d*$/i;
const SHADOW = new Set(['print', 'len', 'range', 'enumerate', 'sorted', 'sum', 'min', 'max', 'int', 'str', 'list', 'dict', 'set', 'zip', 'reversed',
  'abs', 'any', 'all', 'float', 'bool', 'tuple', 'isinstance', 'type', 'map', 'filter', 'round', 'ord', 'chr', 'divmod', 'pow', 'next', 'iter',
  'super', 'repr', 'hasattr', 'getattr', 'callable', 'frozenset', 'hash', 'bin', 'hex', 'id', 'input', 'object', 'open', 'format', 'vars', 'dir',
  'bytes', 'slice', 'complex']);
const BLOCK_WORD = /^(if|elif|else|for|while|def|class|try|except|finally|with)\b/;
const OPS = ['**=', '//=', '>>=', '<<=', '==', '!=', '<=', '>=', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '@=', ':=', '->', '**', '//', '<<', '>>', '=', '<', '>'];
const COMPARE = new Set(['==', '!=', '<=', '>=', '<', '>']);
const ASSIGN = new Set(['=', '+=', '-=', '*=', '/=', '//=', '%=', '**=', '>>=', '<<=', '&=', '|=', '^=', '@=']);
const SELF_OPS = new Set(['+', '-', '*']);
const COMMENTED_CODE = /^(print\s*\(|return\b|import\s+\w|from\s+\w+\s+import\b|def\s+\w+\s*\(|class\s+\w+|for\s+.+\s+in\s+.+:\s*$|while\s+.+:\s*$|if\s+.+:\s*$|elif\s+.+:\s*$|else\s*:\s*$|[A-Za-z_][\w.\[\]]*\s*[+\-*/]?=\s*[\w\[({"'\-])/;

// ---- the syntax tree ------------------------------------------------------------------------------------------
function collect(value, out) {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) { for (const item of value) collect(item, out); return; }
  if (typeof value.t === 'string' && typeof value.line === 'number') { out.push(value); return; }
  if (value.constructor !== Object) return;                 // a number object (big integer, float), not a part of the tree
  for (const key in value) collect(value[key], out);
}
function children(node) {
  const out = [];
  for (const key in node) if (key !== 't' && key !== 'line') collect(node[key], out);
  return out;
}
function walk(node, visit, parent) {
  visit(node, parent || null);
  for (const child of children(node)) walk(child, visit, node);
}
// The lists of statements a node holds (its blocks).
function blocks(node) {
  const out = [];
  for (const key of ['body', 'orelse', 'finalbody']) if (Array.isArray(node[key])) out.push(node[key]);
  if (Array.isArray(node.handlers)) for (const handler of node.handlers) if (Array.isArray(handler.body)) out.push(handler.body);
  return out;
}
const isName = (node, id) => !!node && node.t === 'Name' && (id === undefined || node.id === id);
const isCall = (node, name) => !!node && node.t === 'Call' && isName(node.func, name);
const isLen = node => isCall(node, 'len') && node.args.length === 1;
const isNum = (node, n) => !!node && node.t === 'Num' && Number(node.v) === n;
const isBool = node => !!node && node.t === 'Const' && (node.v === true || node.v === false);
const isNone = node => !!node && node.t === 'Const' && node.v === null;

// Every place a name is given a value, and every place a name is read.
function scan(tree) {
  const bindings = [], stores = new Set(), loads = new Map(), parents = new Map();
  const bind = (name, kind, line) => { if (name) bindings.push({ name, kind, line }); };
  const target = (node, kind) => {
    if (!node) return;
    if (node.t === 'Name') { stores.add(node); bind(node.id, kind, node.line); }
    else if (node.t === 'Tuple' || node.t === 'List') node.elts.forEach(item => target(item, 'part'));   // one of several: may go unused
    else if (node.t === 'Starred') target(node.value, kind);
    else stores.add(node);                                   // items[i] = ... or thing.field = ...: a write, not a new name
  };
  const params = (args, kind, line) => {
    if (!args) return;
    for (const arg of (args.args || []).concat(args.kwonly || [])) bind(arg.name, kind, line);
    bind(args.vararg, kind, line); bind(args.kwarg, kind, line);
  };
  walk(tree, (node, parent) => {
    parents.set(node, parent);
    switch (node.t) {
      case 'Assign': node.targets.forEach(item => target(item, parent && parent.t === 'ClassDef' ? 'field' : 'var')); break;
      case 'AnnAssign': target(node.target, parent && parent.t === 'ClassDef' ? 'field' : 'var'); break;
      case 'AugAssign': stores.add(node.target); break;
      case 'NamedExpr': target(node.target, 'var'); break;
      case 'For': target(node.target, 'loop'); break;
      case 'With': target(node.target, 'with'); break;
      case 'Delete': (node.targets || []).forEach(item => stores.add(item)); break;
      case 'ListComp': case 'SetComp': case 'DictComp': case 'GeneratorExp': (node.generators || []).forEach(gen => target(gen.target, 'comp')); break;
      case 'Try': (node.handlers || []).forEach(handler => bind(handler.name, 'except', handler.line)); break;
      case 'FunctionDef': bind(node.name, parent && parent.t === 'FunctionDef' ? 'inner' : 'def', node.line); params(node.args, 'param', node.line); break;
      case 'Lambda': params(node.args, 'lambda', node.line); break;
      case 'ClassDef': bind(node.name, 'class', node.line); break;
      case 'Import': node.names.forEach(item => bind(item.asname || item.name.split('.')[0], 'import', node.line)); break;
      case 'ImportFrom': node.names.forEach(item => bind(item.asname || item.name, 'import', node.line)); break;
      default: break;
    }
  });
  walk(tree, node => { if (node.t === 'Name' && !stores.has(node)) loads.set(node.id, (loads.get(node.id) || 0) + 1); });
  return { bindings, stores, loads, parents };
}

// ---- the text -------------------------------------------------------------------------------------------------
// The same text with the inside of every string turned into filler and every comment into spaces, so that the layout
// checks never trip over an operator inside a string. Line breaks and positions stay where they were.
function blank(src) {
  let out = '', i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    if (c === '#') { while (i < n && src[i] !== '\n') { out += ' '; i++; } continue; }
    if (c === '"' || c === "'") {
      const quote = src.substr(i, 3) === c + c + c ? c + c + c : c;
      out += quote; i += quote.length;
      while (i < n) {
        if (src.startsWith(quote, i)) { out += quote; i += quote.length; break; }
        if (src[i] === '\\' && i + 1 < n) { out += src[i + 1] === '\n' ? 'a\n' : 'aa'; i += 2; continue; }
        if (src[i] === '\n') { out += '\n'; i++; if (quote.length === 1) break; continue; }
        out += 'a'; i++;
      }
      continue;
    }
    out += c; i++;
  }
  return out;
}
// One pass over the blanked text: statements joined with ";", operators and commas without their spaces,
// and how deep inside brackets each line starts.
function layout(text) {
  const semis = [], spacing = [], commas = [], depthAt = [0], inString = [];
  let depth = 0, line = 1;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '\n') { line++; depthAt[line - 1] = depth; continue; }
    if (c === '"' || c === "'") {
      const quote = text.substr(i, 3) === c + c + c ? c + c + c : c;
      let end = text.indexOf(quote, i + quote.length);
      if (end < 0) end = text.length;
      for (let j = i; j < end; j++) if (text[j] === '\n') { line++; depthAt[line - 1] = depth; inString[line - 1] = true; }
      i = end + quote.length - 1;
      continue;
    }
    if (c === '(' || c === '[' || c === '{') { depth++; continue; }
    if (c === ')' || c === ']' || c === '}') { depth = Math.max(0, depth - 1); continue; }
    if (c === ';') { semis.push(line); continue; }
    if (c === ',') {
      const next = text[i + 1];
      if (next !== undefined && next !== ' ' && next !== '\n' && next !== ')' && next !== ']' && next !== '}') commas.push(line);
      continue;
    }
    if ('=!<>+-*/%&|^@:'.indexOf(c) < 0) continue;
    const op = OPS.find(candidate => text.startsWith(candidate, i));
    if (!op) continue;
    if (COMPARE.has(op) || (ASSIGN.has(op) && depth === 0)) {
      const before = text[i - 1], after = text[i + op.length];
      const open = ch => ch === undefined || ch === ' ' || ch === '\n';
      if (!open(before) || !open(after)) spacing.push({ line, op });
    }
    i += op.length - 1;
  }
  return { semis, spacing, commas, depthAt, inString };
}
// On a line that opens a block: where the block's colon is, or -1.
function blockColon(line) {
  let depth = 0, lambdas = 0;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"' || c === "'") {
      const quote = line.substr(i, 3) === c + c + c ? c + c + c : c;
      const end = line.indexOf(quote, i + quote.length);
      if (end < 0) return -1;
      i = end + quote.length - 1;
    } else if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') depth--;
    else if (depth === 0 && line.startsWith('lambda', i) && !/\w/.test(line[i - 1] || ' ') && !/\w/.test(line[i + 6] || ' ')) { lambdas++; i += 5; }
    else if (c === ':' && depth === 0) { if (lambdas) lambdas--; else return i; }
  }
  return -1;
}

// Lines that hold code: not blank, not only a comment, not a docstring.
function codeLines(src, tree) {
  const skip = new Set();
  const docstring = body => {
    const first = Array.isArray(body) && body[0];
    if (first && first.t === 'Expr' && first.value && first.value.t === 'Str') {
      const extra = String(first.value.v).split('\n').length - 1;
      for (let k = 0; k <= extra; k++) skip.add(first.line + k);
    }
  };
  if (tree) { docstring(tree.body); walk(tree, node => { if (node.t === 'FunctionDef' || node.t === 'ClassDef') docstring(node.body); }); }
  let count = 0;
  src.split('\n').forEach((text, k) => { const t = text.trim(); if (t && t[0] !== '#' && !skip.has(k + 1)) count++; });
  return count;
}
const modelCache = new Map();
function modelLines(lv) {
  const key = (lv.id || '') + ':' + lv.solution.length;
  if (!modelCache.has(key)) {
    let tree = null;
    try { tree = root.MiniPy.parse(lv.solution); } catch (e) { tree = null; }
    modelCache.set(key, codeLines(lv.solution, tree));
  }
  return modelCache.get(key);
}
// How many lines of code a level allows for the "concise" mark.
function budgetFor(model) { return Math.max(model + 3, Math.ceil(model * 1.5)); }          // room for a readable answer, not only for the shortest one

// Names the level itself hands out (the function to write, its parameters): never the player's choice.
function givenNames(lv) {
  const given = new Set(['self', 'cls']);
  const starter = (lv && (lv.starterGiven || lv.starter)) || '';
  const found = starter.match(/[A-Za-z_]\w*/g) || [];
  for (const name of found) given.add(name);
  return given;
}

// ---- the four marks -------------------------------------------------------------------------------------------
function concise(ctx) {
  const notes = [], lv = ctx.lv;
  const mine = codeLines(ctx.src, ctx.tree), model = lv.solution ? modelLines(lv) : mine, budget = budgetFor(model);
  if (mine > budget) notes.push({ line: 0, text: 'Your answer takes ' + mine + ' lines of code. The model solution takes ' + model + ', and this mark allows ' + budget + '.' });
  if (ctx.lay.semis.length) notes.push({ line: ctx.lay.semis[0], text: 'One statement per line: no `;`.' });
  let crammed = 0;
  ctx.blankLines.forEach((text, k) => {
    if (crammed || ctx.lay.depthAt[k] || ctx.lay.inString[k]) return;
    const body = text.trim(), word = BLOCK_WORD.exec(body);
    if (!word) return;
    const at = blockColon(body);
    if (at >= 0 && body.slice(at + 1).trim()) crammed = k + 1;
  });
  if (crammed) notes.push({ line: crammed, text: 'Put what follows the `:` on its own line.' });
  return { notes, lines: mine, budget, model };
}

function names(ctx) {
  const notes = [], seen = new Set();
  const flag = (item, text) => { if (!seen.has(item.name)) { seen.add(item.name); notes.push({ line: item.line, text }); } };
  for (const item of ctx.scan.bindings) {
    const name = item.name, kind = item.kind;
    if (ctx.given.has(name) || name === '_' || /^__\w+__$/.test(name)) continue;
    if (SHADOW.has(name)) { flag(item, '`' + name + '` hides Python\'s own `' + name + '()`. Pick another name.'); continue; }
    if (name.length === 1 && !SHORT_OK.has(name) && kind !== 'comp' && kind !== 'loop' && kind !== 'lambda' && kind !== 'except' && kind !== 'with') {
      flag(item, 'The one-letter name `' + name + '` says nothing. Name it after what it holds. (Loop variables may be one letter, and so may the usual counters and coordinates: i, j, k, n, m, x, y, z, r, c, a, b.)'); continue;
    }
    if (VAGUE.test(name)) { flag(item, '`' + name + '` is a placeholder. Name it after what it holds.'); continue; }
    if (kind === 'class') { if (!/^_?[A-Z][A-Za-z0-9]*$/.test(name)) flag(item, 'Class names start with a capital: `' + name.charAt(0).toUpperCase() + name.slice(1) + '`.'); continue; }
    if (kind === 'import') continue;
    if (/[A-Z]/.test(name) && !/^_*[A-Z][A-Z0-9_]*$/.test(name)) {
      flag(item, 'Python names use lower case with underscores: `' + name.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase() + '` instead of `' + name + '`.');
    }
  }
  return { notes };
}

function pythonic(ctx) {
  const notes = [], kinds = new Set(), tree = ctx.tree, scanned = ctx.scan;
  const add = (kind, line, text) => { if (!kinds.has(kind)) { kinds.add(kind); notes.push({ line, text }); } };
  walk(tree, (node, parent) => {
    switch (node.t) {
      case 'Compare': {
        const sides = [node.left].concat(node.comparators);
        node.ops.forEach((op, k) => {
          const left = sides[k], right = sides[k + 1];
          if (op === '==' || op === '!=') {
            if (isNone(left) || isNone(right)) add('none', node.line, 'Compare with None using `is None` or `is not None`, not `' + op + '`.');
            if (isBool(left) || isBool(right)) add('bool', node.line, 'No need to compare with True or False. Write `if flag:` or `if not flag:`.');
            if ((isLen(left) && isNum(right, 0)) || (isLen(right) && isNum(left, 0))) add('len', node.line, 'An empty list, string or dict already counts as false. Write `if not items:` or `if items:`.');
            if (isCall(left, 'type') || isCall(right, 'type')) add('type', node.line, 'Test a type with `isinstance(value, kind)`.');
          }
          if ((op === '>' && isLen(left) && isNum(right, 0)) || (op === '<' && isNum(left, 0) && isLen(right)) ||
              (op === '>=' && isLen(left) && isNum(right, 1)) || (op === '<' && isLen(left) && isNum(right, 1))) {
            add('len', node.line, 'An empty list, string or dict already counts as false. Write `if items:` or `if not items:`.');
          }
          if ((op === 'in' || op === 'not in') && right.t === 'Call' && right.func.t === 'Attribute' && right.func.attr === 'keys' && !right.args.length) {
            add('keys', node.line, 'A dict is searched by its keys already. Drop `.keys()`.');
          }
        });
        break;
      }
      case 'UnaryOp':
        if (node.op === 'not' && node.operand.t === 'Compare' && node.operand.ops.length === 1) {
          const op = node.operand.ops[0];
          if (op === 'in') add('notin', node.line, 'Write `x not in items` instead of `not x in items`.');
          else if (op === 'is') add('isnot', node.line, 'Write `x is not y` instead of `not x is y`.');
          else if (op === '==') add('noteq', node.line, 'Write `a != b` instead of `not a == b`.');
        }
        if (node.op === 'not' && isLen(node.operand)) add('len', node.line, 'An empty list, string or dict already counts as false. Write `if not items:`.');
        break;
      case 'If': case 'While':
        if (isLen(node.test)) add('len', node.line, 'An empty list, string or dict already counts as false. Write `' + (node.t === 'If' ? 'if' : 'while') + ' items:`.');
        if (node.t === 'If' && node.body.length === 1 && node.orelse.length === 1 && node.body[0].t === 'Return' && node.orelse[0].t === 'Return' &&
            isBool(node.body[0].value) && isBool(node.orelse[0].value)) {
          add('retbool', node.line, 'This `if` only chooses between True and False. Return the condition itself.');
        }
        break;
      case 'IfExp':
        if (isBool(node.body) && isBool(node.orelse)) add('retbool', node.line, 'The condition is already True or False. Use it directly.');
        break;
      case 'Assign': {
        const to = node.targets.length === 1 && node.targets[0], value = node.value;
        if (to && to.t === 'Name' && value.t === 'BinOp' && SELF_OPS.has(value.op) && isName(value.left, to.id)) {
          add('aug', node.line, '`' + to.id + ' = ' + to.id + ' ' + value.op + ' ...` is shorter as `' + to.id + ' ' + value.op + '= ...`.');
        }
        if (to && to.t === 'Name' && value.t === 'Lambda') add('lambda', node.line, 'Give the function a name with `def` instead of storing a lambda in `' + to.id + '`.');
        break;
      }
      case 'Try':
        for (const handler of node.handlers || []) if (!handler.type) add('bare', handler.line, '`except:` on its own hides every mistake, typing errors included. Name the error you expect.');
        break;
      case 'FunctionDef': case 'Lambda':
        for (const arg of ((node.args && node.args.args) || []).concat((node.args && node.args.kwonly) || [])) {
          const d = arg.default;
          if (d && (d.t === 'List' || d.t === 'Dict' || d.t === 'Set' || ((isCall(d, 'list') || isCall(d, 'dict') || isCall(d, 'set')) && !d.args.length))) {
            add('default', node.line, 'A list or dict as a default value is created once and shared by every call. Use `None` and create it inside.');
          }
        }
        break;
      case 'For': {
        const it = node.iter;
        if (it.t === 'Call' && it.func.t === 'Attribute' && it.func.attr === 'keys' && !it.args.length) add('keys', node.line, 'A dict loops over its keys already. Drop `.keys()`.');
        // for i in range(len(items)) where i does nothing but look up items[i]
        const counter = node.target.t === 'Name' ? node.target.id : null;
        const sized = isCall(it, 'range') && ((it.args.length === 1 && it.args[0]) || (it.args.length === 2 && isNum(it.args[0], 0) && it.args[1]));
        if (counter && sized && isLen(sized) && sized.args[0].t === 'Name') {
          const seq = sized.args[0].id;
          let uses = 0, other = 0;
          for (const stmt of node.body) {
            walk(stmt, (inner, up) => {
              if (!isName(inner, counter)) return;
              uses++;
              const plain = up && up.t === 'Subscript' && up.slice === inner && isName(up.value, seq) && !scanned.stores.has(up);
              if (!plain || scanned.stores.has(inner)) other++;
            }, node);
          }
          if (uses && !other) add('index', node.line, '`' + counter + '` is only used to look up `' + seq + '[' + counter + ']`. Loop over the items themselves: `for item in ' + seq + ':`.');
        }
        break;
      }
      default: break;
    }
    // if cond: return True   followed directly by   return False
    for (const list of blocks(node)) {
      for (let k = 0; k + 1 < list.length; k++) {
        const first = list[k], next = list[k + 1];
        if (first.t === 'If' && !first.orelse.length && first.body.length === 1 && first.body[0].t === 'Return' && isBool(first.body[0].value) &&
            next.t === 'Return' && isBool(next.value) && next.value.v !== first.body[0].value.v) {
          add('retbool', first.line, 'This `if` only chooses between True and False. Return the condition itself.');
        }
      }
    }
    void parent;
  });
  // names that are set and never read
  const told = new Set();
  for (const item of scanned.bindings) {
    const name = item.name;
    if (scanned.loads.get(name) || told.has(name) || name[0] === '_' || ctx.given.has(name)) continue;
    if (item.kind === 'var') { told.add(name); notes.push({ line: item.line, text: '`' + name + '` is set but never used.' }); }
    else if (item.kind === 'import') { told.add(name); notes.push({ line: item.line, text: '`' + name + '` is imported but never used.' }); }
    else if (item.kind === 'loop' || item.kind === 'comp') { told.add(name); notes.push({ line: item.line, text: 'The loop never uses `' + name + '`. Call it `_` to say so.' }); }
    else if (item.kind === 'inner') { told.add(name); notes.push({ line: item.line, text: 'The inner function `' + name + '` is never called.' }); }
  }
  return { notes };
}

function tidy(ctx) {
  const notes = [], kinds = new Set(), lines = ctx.lines, lay = ctx.lay;
  const add = (kind, line, text) => { if (!kinds.has(kind)) { kinds.add(kind); notes.push({ line, text }); } };
  // indentation, on the first line of every statement
  walk(ctx.tree, node => {
    for (const list of blocks(node)) {
      for (const stmt of list) {
        const text = lines[stmt.line - 1] || '', lead = /^[ \t]*/.exec(text)[0];
        if (lead.indexOf('\t') >= 0) add('tab', stmt.line, 'Indent with spaces, not tabs.');
        else if (lead.length % 4) add('indent', stmt.line, 'Indent with 4 spaces for each level (this line has ' + lead.length + ').');
      }
      if (list.length > 1) for (const stmt of list) if (stmt.t === 'Pass') add('pass', stmt.line, 'This `pass` does nothing any more. Remove it.');
    }
    if (node.t === 'Call' && isName(node.func, 'print') && !ctx.prints) add('print', node.line, 'A `print()` left over from testing. The tests only look at what you return.');
  });
  lines.forEach((text, k) => {
    const code = (ctx.blankLines[k] || '').replace(/\s+$/, '').length;          // a comment at the end does not count
    if (code > MAX_LINE) add('long', k + 1, 'The code on this line is ' + code + ' characters long. Keep it under ' + (MAX_LINE + 1) + ' by giving a part of it a name.');
    const body = text.trim();
    if (body[0] === '#' && COMMENTED_CODE.test(body.replace(/^#+\s*/, ''))) add('dead', k + 1, 'Remove commented-out code. A comment explains; it does not store old attempts.');
  });
  for (let k = 0, run = 0; k < lines.length; k++) {
    run = lines[k].trim() ? 0 : run + 1;
    if (run === 3 && lines.slice(k + 1).some(text => text.trim())) add('gaps', k + 1, 'More than two blank lines in a row.');
  }
  if (lay.spacing.length) {
    const first = lay.spacing[0];
    add('space', first.line, 'Put a space on each side of `' + first.op + '`.');
  }
  if (lay.commas.length) add('comma', lay.commas[0], 'Put a space after each comma.');
  // if (condition):  the brackets are a habit from other languages
  ctx.blankLines.forEach((text, k) => {
    if (lay.depthAt[k] || lay.inString[k]) return;
    const body = text.trim(), head = /^(if|elif|while)\s*\(/.exec(body);
    if (!head) return;
    let depth = 0, close = -1;
    for (let i = head[0].length - 1; i < body.length; i++) {
      if (body[i] === '(') depth++;
      else if (body[i] === ')' && --depth === 0) { close = i; break; }
    }
    if (close >= 0 && /^\s*:\s*$/.test(body.slice(close + 1)) && body.slice(head[0].length, close).indexOf(',') < 0) {
      add('parens', k + 1, 'No brackets are needed around the condition: `' + head[1] + ' ...:`.');
    }
  });
  return { notes };
}

function review(code, lv) {
  const empty = { ok: false, earned: 0, bits: 0, lines: 0, budget: 0, model: 0, marks: [] };
  const MP = root.MiniPy;
  if (!MP || typeof MP.parse !== 'function') return empty;
  const src = String(code == null ? '' : code).replace(/\r\n?/g, '\n').replace(/\s+$/, '') + '\n';
  let tree;
  try { tree = MP.parse(src); } catch (e) { return empty; }
  const level = lv || {}, text = blank(src);
  const ctx = {
    src, tree, lv: level, lines: src.split('\n'), blankLines: text.split('\n'), lay: layout(text), scan: scan(tree), given: givenNames(level),
    prints: !!(level.tests || []).some(test => test && test.stdout !== undefined) || /\bprint\s*\(/.test(level.starter || ''),
  };
  const parts = [concise(ctx), names(ctx), pythonic(ctx), tidy(ctx)];
  let earned = 0, bits = 0;
  const marks = MARKS.map((mark, k) => {
    const notes = parts[k].notes.slice().sort((p, q) => p.line - q.line), ok = !notes.length;
    if (ok) { earned++; bits |= 1 << k; }
    return { id: mark.id, name: mark.name, tip: mark.tip, ok, notes };
  });
  return { ok: true, earned, bits, lines: parts[0].lines, budget: parts[0].budget, model: parts[0].model, marks };
}

root.PylonCraft = { MARKS, XP_PER_MARK, MAX_LINE, review, codeLines, budgetFor, blank, walk, children, blocks };
if (typeof module !== 'undefined' && module.exports) module.exports = root.PylonCraft;
})(typeof window !== 'undefined' ? window : globalThis);
