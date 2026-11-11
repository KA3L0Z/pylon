/* MiniPy, a Python-subset interpreter for Pylon. Part 1 of 5: values, errors, operators, formatting.
   Python values map to JS like this:
     None -> null            bool -> true/false         int -> number (safe integers) or BigInt
     float -> PyFloat        str -> string              list -> Array
     tuple -> PyTuple        dict -> PyDict             set/frozenset -> PySet
   `undefined` never escapes to Python code; it means "unbound". */
(function (root) {
'use strict';
const MP = root.MiniPy = root.MiniPy || {};
const MAXS = Number.MAX_SAFE_INTEGER;
const BMAX = BigInt(MAXS), BMIN = -BMAX;

// Runtime state. One program runs at a time, so this is a singleton.
// `trace`, when set, is called before every statement as trace(line, scope, undefined) and after a return value
// is computed as trace(line, scope, value). The game's step-by-step viewer is built on it.
const R = MP.R = { steps: 0, max: 2e6, line: 0, calls: [], maxCalls: 1200, out: [], outLen: 0, cur: null, trace: null };

// ---------------------------------------------------------------- value classes
class PyFloat { constructor(v) { this.v = v; } }
class PyTuple { constructor(a) { this.a = a; } }
class PyRange {
  constructor(start, stop, step) {
    this.start = start; this.stop = stop; this.step = step;
    this.len = step > 0 ? Math.max(0, Math.ceil((stop - start) / step)) : Math.max(0, Math.ceil((start - stop) / -step));
  }
}
class PyDict { constructor() { this.m = new Map(); } }
class PyDefaultDict extends PyDict { constructor(factory) { super(); this.factory = factory; } }
class PyCounter extends PyDict {}
class PyOrderedDict extends PyDict {}
class PySet { constructor(frozen) { this.m = new Map(); this.frozen = !!frozen; } }
class PyDeque { constructor(a, maxlen) { this.a = a; this.maxlen = maxlen; } }
class PyDictView { constructor(d, kind) { this.d = d; this.kind = kind; } }
class PySlice { constructor(lo, hi, step) { this.lo = lo; this.hi = hi; this.step = step; } }
class Scope { constructor(n, parent, fn) { this.s = new Array(n); this.parent = parent; this.fn = fn; this.ret = null; } }
class PyFunc {
  constructor(code, closure, defaults, kwdefaults) {
    this.code = code; this.closure = closure; this.defaults = defaults; this.kwdefaults = kwdefaults;
    this.name = code.name; this.owner = null; this.attrs = null;
  }
}
class PyBuiltin { constructor(name, fn) { this.name = name; this.fn = fn; this.attrs = null; this.meth = false; } }
class PyBound { constructor(self, fn, nf, name) { this.self = self; this.fn = fn; this.nf = nf; this.name = name; } }
class PyClass {
  constructor(name, bases, d) {
    this.name = name; this.bases = bases; this.d = d; this.mro = null;
    this.native = false; this.ctor = null; this.exc = false; this.mt = null; this.hasProps = false; this.mod = null;
  }
}
class PyObj { constructor(cls) { this.cls = cls; this.d = Object.create(null); } }
class PyModule { constructor(name, d) { this.name = name; this.d = d; this.fallback = null; } }
class PyIter { constructor(next, tname) { this.next = next; this.tname = tname || 'iterator'; } }
class PyProperty { constructor(fget, fset) { this.fget = fget; this.fset = fset; } }
class PyStatic { constructor(fn) { this.fn = fn; } }
class PyClassMethod { constructor(fn) { this.fn = fn; } }
class PySuper { constructor(cls, obj) { this.cls = cls; this.obj = obj; } }
class PyTyping { constructor(name) { this.name = name; } }
class CmpKey { constructor(f, v) { this.f = f; this.v = v; } }
class PyGen {
  constructor(fn, sc) { this.fn = fn; this.sc = sc; this.it = null; this.done = false; this.running = false; }
  next() { return genNext(this, undefined); }
}
const STOP = { stop: true };          // "iterator exhausted" sentinel used inside the interpreter
const NotImpl = { ni: true }, Ellipsis = { el: true };
const RET = { ret: true }, BRK = { brk: true }, CNT = { cnt: true };   // statement completion signals

// ---------------------------------------------------------------- types and exceptions
const T = MP.T = Object.create(null);
function mkType(name, base) {
  const c = new PyClass(name, base ? [base] : [], Object.create(null));
  c.native = true; c.mro = base ? [c].concat(base.mro) : [c];
  return T[name] = c;
}
mkType('object', null);
['type', 'NoneType', 'int', 'float', 'str', 'list', 'tuple', 'dict', 'set', 'frozenset', 'range', 'function',
  'builtin_function_or_method', 'method', 'generator', 'module', 'slice', 'property', 'staticmethod', 'classmethod',
  'super', 'ellipsis', 'NotImplementedType', 'dict_keys', 'dict_values', 'dict_items'].forEach(n => mkType(n, T.object));
mkType('bool', T.int);
mkType('deque', T.object).mod = 'collections';
['defaultdict', 'Counter', 'OrderedDict'].forEach(n => { mkType(n, T.dict).mod = 'collections'; });
const ITYPES = Object.create(null);
function iterType(name) { return ITYPES[name] || (ITYPES[name] = (() => { const c = new PyClass(name, [T.object], Object.create(null)); c.native = true; c.mro = [c, T.object]; return c; })()); }

const EXC = MP.EXC = Object.create(null);
function mkExcClass(name, base) {
  const c = new PyClass(name, [base], Object.create(null));
  c.native = true; c.exc = true; c.mro = [c].concat(base.mro);
  return EXC[name] = c;
}
mkExcClass('BaseException', T.object);
[['Exception', 'BaseException'], ['KeyboardInterrupt', 'BaseException'], ['SystemExit', 'BaseException'], ['GeneratorExit', 'BaseException'],
  ['ArithmeticError', 'Exception'], ['ZeroDivisionError', 'ArithmeticError'], ['OverflowError', 'ArithmeticError'],
  ['AssertionError', 'Exception'], ['AttributeError', 'Exception'], ['LookupError', 'Exception'], ['IndexError', 'LookupError'],
  ['KeyError', 'LookupError'], ['NameError', 'Exception'], ['UnboundLocalError', 'NameError'], ['RuntimeError', 'Exception'],
  ['RecursionError', 'RuntimeError'], ['NotImplementedError', 'RuntimeError'], ['TypeError', 'Exception'], ['ValueError', 'Exception'],
  ['StopIteration', 'Exception'], ['ImportError', 'Exception'], ['ModuleNotFoundError', 'ImportError'], ['SyntaxError', 'Exception'],
  ['IndentationError', 'SyntaxError'], ['TabError', 'IndentationError'], ['MemoryError', 'Exception'], ['OSError', 'Exception'],
  ['EOFError', 'Exception'], ['Warning', 'Exception']].forEach(p => mkExcClass(p[0], EXC[p[1]]));

function mkExc(cls, args) { const o = new PyObj(cls); o.d.args = new PyTuple(args); if (cls === EXC.StopIteration) o.d.value = args.length ? args[0] : null; return o; }
class PyErr { constructor(exc) { this.exc = exc; this.line = R.line; this.trace = R.calls.slice(); this.hint = null; } }
function err(name, msg) { return new PyErr(mkExc(EXC[name], msg === undefined ? [] : [msg])); }
class PyAbort { constructor(kind, msg) { this.kind = kind; this.msg = msg; this.line = R.line; } }   // not catchable by Python code
class PySyntax { constructor(msg, line, kind) { this.msg = msg; this.line = line; this.kind = kind || 'SyntaxError'; } }
function stepLimit() { throw new PyAbort('steps', 'step limit reached'); }

function typeOf(v) {
  if (v === null) return T.NoneType;
  switch (typeof v) { case 'number': case 'bigint': return T.int; case 'string': return T.str; case 'boolean': return T.bool; }
  if (Array.isArray(v)) return T.list;
  if (v instanceof PyObj) return v.cls;
  if (v instanceof PyFloat) return T.float;
  if (v instanceof PyTuple) return T.tuple;
  if (v instanceof PyDict) return v instanceof PyDefaultDict ? T.defaultdict : v instanceof PyCounter ? T.Counter : v instanceof PyOrderedDict ? T.OrderedDict : T.dict;
  if (v instanceof PySet) return v.frozen ? T.frozenset : T.set;
  if (v instanceof PyFunc) return T.function;
  if (v instanceof PyClass) return T.type;
  if (v instanceof PyRange) return T.range;
  if (v instanceof PyBuiltin) return T.builtin_function_or_method;
  if (v instanceof PyBound) return T.method;
  if (v instanceof PyGen) return T.generator;
  if (v instanceof PyIter) return iterType(v.tname);
  if (v instanceof PyModule) return T.module;
  if (v instanceof PyDeque) return T.deque;
  if (v instanceof PyDictView) return T['dict_' + v.kind];
  if (v instanceof PySlice) return T.slice;
  if (v instanceof PyProperty) return T.property;
  if (v instanceof PySuper) return T.super;
  if (v === Ellipsis) return T.ellipsis;
  if (v === NotImpl) return T.NotImplementedType;
  return T.object;
}
const tn = v => typeOf(v).name;
function isInst(v, cls) { const t = typeOf(v); return t === cls || t.mro.indexOf(cls) >= 0; }
function findAttr(cls, name) { const mro = cls.mro; for (let i = 0; i < mro.length; i++) { const v = mro[i].d[name]; if (v !== undefined) return v; } return undefined; }
// A user-defined special method (ignores the built-in defaults on object / Exception).
function userSpecial(o, name) { if (!(o instanceof PyObj)) return undefined; const f = findAttr(o.cls, name); return f === undefined || (f instanceof PyBuiltin && !f.user) ? undefined : f; }

// ---------------------------------------------------------------- numbers
const isNum = v => { const t = typeof v; return t === 'number' || t === 'boolean' || t === 'bigint' || v instanceof PyFloat; };
const isInt = v => { const t = typeof v; return t === 'number' || t === 'boolean' || t === 'bigint'; };
const big = v => typeof v === 'bigint' ? v : BigInt(typeof v === 'boolean' ? +v : v);
const norm = b => (b <= BMAX && b >= BMIN) ? Number(b) : b;
const fl = v => v instanceof PyFloat ? v.v : Number(v);
const nv = v => v instanceof PyFloat ? v.v : (typeof v === 'boolean' ? +v : v);
const F = v => new PyFloat(v);

function idx(v) {
  if (typeof v === 'number') return v;
  if (typeof v === 'boolean') return +v;
  if (typeof v === 'bigint') return Number(v);
  const f = userSpecial(v, '__index__'); if (f) return idx(call(f, [v]));
  const e = err('TypeError', "'" + tn(v) + "' object cannot be interpreted as an integer");
  if (typeof v === 'string') e.hint = 'This is text, not a number. Convert it with int(...) first.';
  else if (v instanceof PyFloat) e.hint = 'A whole number is needed here. Use // for whole-number division, or convert with int(...).';
  throw e;
}

function intPow(a, b) {
  if (b < 0) { if (a == 0) throw err('ZeroDivisionError', '0.0 cannot be raised to a negative power'); return F(Math.pow(Number(a), Number(b))); }
  if (a == 0) return b == 0 ? 1 : 0;
  if (a == 1) return 1;
  if (a == -1) return big(b) % 2n === 0n ? 1 : -1;
  if (typeof a === 'number' && typeof b === 'number' && b <= 64) {
    let r = 1, ok = true;
    for (let i = 0; i < b; i++) { r *= a; if (r > MAXS || r < -MAXS) { ok = false; break; } }
    if (ok) return r;
  }
  if (Number(b) * Math.log2(Math.abs(Number(a)) + 1) > 3e5) throw err('OverflowError', 'that number is too large for Pylon to compute');
  return norm(big(a) ** big(b));
}
function intOp(op, a, b) {
  if (typeof a === 'boolean') a = +a;
  if (typeof b === 'boolean') b = +b;
  const small = typeof a === 'number' && typeof b === 'number';
  switch (op) {
    case '+': if (small) { const r = a + b; if (r <= MAXS && r >= -MAXS) return r; } return norm(big(a) + big(b));
    case '-': if (small) { const r = a - b; if (r <= MAXS && r >= -MAXS) return r; } return norm(big(a) - big(b));
    case '*': if (small) { const r = a * b; if (r <= MAXS && r >= -MAXS) return r || 0; } return norm(big(a) * big(b));
    case '/': if (b == 0) throw err('ZeroDivisionError', 'division by zero'); return F(Number(a) / Number(b));
    case '//':
      if (b == 0) throw err('ZeroDivisionError', 'integer division or modulo by zero');
      if (small) { let r = a % b; if (r !== 0 && (r < 0) !== (b < 0)) r += b; return ((a - r) / b) || 0; }
      { const x = big(a), y = big(b); let q = x / y; if (x % y !== 0n && (x < 0n) !== (y < 0n)) q -= 1n; return norm(q); }
    case '%':
      if (b == 0) throw err('ZeroDivisionError', 'integer division or modulo by zero');
      if (small) { let r = a % b; if (r !== 0 && (r < 0) !== (b < 0)) r += b; return r || 0; }
      { const y = big(b); let r = big(a) % y; if (r !== 0n && (r < 0n) !== (y < 0n)) r += y; return norm(r); }
    case '**': return intPow(a, b);
    case '<<': if (b < 0) throw err('ValueError', 'negative shift count'); if (b > 300000) throw err('OverflowError', 'that number is too large for Pylon to compute'); return norm(big(a) << big(b));
    case '>>': if (b < 0) throw err('ValueError', 'negative shift count'); return norm(big(a) >> big(b));
    case '&': if (small && a >= -2147483648 && a <= 2147483647 && b >= -2147483648 && b <= 2147483647) return a & b; return norm(big(a) & big(b));
    case '|': if (small && a >= -2147483648 && a <= 2147483647 && b >= -2147483648 && b <= 2147483647) return a | b; return norm(big(a) | big(b));
    case '^': if (small && a >= -2147483648 && a <= 2147483647 && b >= -2147483648 && b <= 2147483647) return a ^ b; return norm(big(a) ^ big(b));
  }
  throw err('TypeError', "unsupported operand type(s) for " + op + ": 'int' and 'int'");
}
function floatOp(op, x, y, a, b) {
  switch (op) {
    case '+': return F(x + y);
    case '-': return F(x - y);
    case '*': return F(x * y);
    case '/': if (y === 0) throw err('ZeroDivisionError', 'float division by zero'); return F(x / y);
    case '//': if (y === 0) throw err('ZeroDivisionError', 'float floor division by zero'); return F(Math.floor(x / y));
    case '%': { if (y === 0) throw err('ZeroDivisionError', 'float modulo'); let r = x % y; if (r !== 0 && (r < 0) !== (y < 0)) r += y; return F(r); }
    case '**':
      if (x === 0 && y < 0) throw err('ZeroDivisionError', '0.0 cannot be raised to a negative power');
      if (x < 0 && !Number.isInteger(y)) throw err('ValueError', 'a negative number cannot be raised to a fractional power here');
      return F(Math.pow(x, y));
  }
  throw err('TypeError', "unsupported operand type(s) for " + op + ": '" + tn(a) + "' and '" + tn(b) + "'");
}
const DUNDER = { '+': ['__add__', '__radd__'], '-': ['__sub__', '__rsub__'], '*': ['__mul__', '__rmul__'], '/': ['__truediv__', '__rtruediv__'],
  '//': ['__floordiv__', '__rfloordiv__'], '%': ['__mod__', '__rmod__'], '**': ['__pow__', '__rpow__'], '&': ['__and__', '__rand__'],
  '|': ['__or__', '__ror__'], '^': ['__xor__', '__rxor__'], '<<': ['__lshift__', '__rlshift__'], '>>': ['__rshift__', '__rrshift__'], '@': ['__matmul__', '__rmatmul__'] };
const IDUNDER = { '+': '__iadd__', '-': '__isub__', '*': '__imul__', '/': '__itruediv__', '//': '__ifloordiv__', '%': '__imod__', '**': '__ipow__', '&': '__iand__', '|': '__ior__', '^': '__ixor__', '<<': '__ilshift__', '>>': '__irshift__' };

function repeat(seq, n) {
  n = idx(n);
  const len = typeof seq === 'string' ? seq.length : Array.isArray(seq) ? seq.length : seq.a.length;
  if (n < 0) n = 0;
  if (len * n > 4e6) throw err('MemoryError', 'that would create ' + (len * n) + ' items, which is more than Pylon allows');
  R.steps += (len * n) >> 2;
  if (typeof seq === 'string') return seq.repeat(n);
  const src = Array.isArray(seq) ? seq : seq.a, out = [];
  for (let k = 0; k < n; k++) for (let i = 0; i < len; i++) out.push(src[i]);
  return Array.isArray(seq) ? out : new PyTuple(out);
}
function setOp(op, a, b) {
  const r = new PySet(a.frozen);
  if (op === '|') { for (const k of a.m.values()) sadd(r, k); for (const k of b.m.values()) sadd(r, k); }
  else if (op === '&') { for (const k of a.m.values()) if (shas(b, k)) sadd(r, k); }
  else if (op === '-') { for (const k of a.m.values()) if (!shas(b, k)) sadd(r, k); }
  else { for (const k of a.m.values()) if (!shas(b, k)) sadd(r, k); for (const k of b.m.values()) if (!shas(a, k)) sadd(r, k); }
  R.steps += (a.m.size + b.m.size) >> 2;
  return r;
}
function counterOp(op, a, b) {
  const r = new PyCounter();
  const keys = new PyDict();
  for (const e of a.m.values()) dset(keys, e[0], 1);
  for (const e of b.m.values()) dset(keys, e[0], 1);
  for (const e of keys.m.values()) {
    const k = e[0], x = dget(a, k) || 0, y = dget(b, k) || 0;
    const v = op === '+' ? add(x, y) : op === '-' ? sub(x, y) : op === '&' ? (rich(x, y, 0) ? x : y) : (rich(x, y, 0) ? y : x);
    if (rich(v, 0, 2)) dset(r, k, v);
  }
  return r;
}
function arith(op, a, b) {
  if (isInt(a) && isInt(b)) {
    if (typeof a === 'boolean' && typeof b === 'boolean' && (op === '&' || op === '|' || op === '^')) return op === '&' ? a && b : op === '|' ? a || b : a !== b;
    return intOp(op, a, b);
  }
  if (isNum(a) && isNum(b)) return floatOp(op, fl(a), fl(b), a, b);
  switch (op) {
    case '+':
      if (Array.isArray(a) && Array.isArray(b)) { R.steps += (a.length + b.length) >> 2; return a.concat(b); }
      if (a instanceof PyTuple && b instanceof PyTuple) return new PyTuple(a.a.concat(b.a));
      if (a instanceof PyCounter && b instanceof PyCounter) return counterOp(op, a, b);
      if (!(b instanceof PyObj)) {
        if (typeof a === 'string') { const e = err('TypeError', 'can only concatenate str (not "' + tn(b) + '") to str'); e.hint = 'Turn the other value into text with str(...) first, or build the text with an f-string.'; throw e; }
        if (Array.isArray(a)) throw err('TypeError', 'can only concatenate list (not "' + tn(b) + '") to list');
        if (a instanceof PyTuple) throw err('TypeError', 'can only concatenate tuple (not "' + tn(b) + '") to tuple');
      }
      break;
    case '*':
      if (isInt(b) && (typeof a === 'string' || Array.isArray(a) || a instanceof PyTuple)) return repeat(a, b);
      if (isInt(a) && (typeof b === 'string' || Array.isArray(b) || b instanceof PyTuple)) return repeat(b, a);
      break;
    case '%':
      if (typeof a === 'string') return MP.percentFormat(a, b);
      break;
    case '|': case '&': case '-': case '^':
      if (a instanceof PyCounter && b instanceof PyCounter) return counterOp(op, a, b);
      if (a instanceof PySet && b instanceof PySet) return setOp(op, a, b);
      if (a instanceof PyDictView && a.kind === 'keys' && (b instanceof PySet || b instanceof PyDictView)) return setOp(op, MP.toSet(a), MP.toSet(b));
      if (op === '|' && a instanceof PyDict && b instanceof PyDict) { const r = new PyDict(); for (const e of a.m.values()) dset(r, e[0], e[1]); for (const e of b.m.values()) dset(r, e[0], e[1]); return r; }
      break;
  }
  const d = DUNDER[op];
  if (d) {
    if (a instanceof PyObj) { const f = findAttr(a.cls, d[0]); if (f !== undefined) { const r = call(f, [a, b]); if (r !== NotImpl) return r; } }
    if (b instanceof PyObj) { const f = findAttr(b.cls, d[1]); if (f !== undefined) { const r = call(f, [b, a]); if (r !== NotImpl) return r; } }
  }
  throw err('TypeError', 'unsupported operand type(s) for ' + op + ": '" + tn(a) + "' and '" + tn(b) + "'");
}
function add(a, b) {
  if (typeof a === 'number' && typeof b === 'number') { const r = a + b; return (r <= MAXS && r >= -MAXS) ? r : norm(BigInt(a) + BigInt(b)); }
  if (typeof a === 'string' && typeof b === 'string') return a + b;
  return arith('+', a, b);
}
function sub(a, b) {
  if (typeof a === 'number' && typeof b === 'number') { const r = a - b; return (r <= MAXS && r >= -MAXS) ? r : norm(BigInt(a) - BigInt(b)); }
  return arith('-', a, b);
}
function mul(a, b) {
  if (typeof a === 'number' && typeof b === 'number') { const r = a * b; return (r <= MAXS && r >= -MAXS) ? (r || 0) : norm(BigInt(a) * BigInt(b)); }
  return arith('*', a, b);
}
const BIN = { '+': add, '-': sub, '*': mul };
['/', '//', '%', '**', '<<', '>>', '&', '|', '^', '@'].forEach(op => { BIN[op] = (a, b) => arith(op, a, b); });

// In-place operators (a += b). Lists, sets and dicts change in place; everything else falls back to the plain operator.
function iop(op, a, b) {
  if (typeof a === 'number' && typeof b === 'number') return BIN[op](a, b);
  if (Array.isArray(a)) {
    if (op === '+') {
      if (Array.isArray(b)) { for (let i = 0, n = b.length; i < n; i++) a.push(b[i]); }
      else { const items = toArr(b); for (let i = 0; i < items.length; i++) a.push(items[i]); }
      return a;
    }
    if (op === '*') { const copy = repeat(a, b); a.length = 0; for (let i = 0; i < copy.length; i++) a.push(copy[i]); return a; }
  } else if (a instanceof PySet && !a.frozen && b instanceof PySet && !(a instanceof PyObj)) {
    if (op === '|') { for (const k of b.m.values()) sadd(a, k); return a; }
    if (op === '&') { for (const k of Array.from(a.m.values())) if (!shas(b, k)) sdel(a, k); return a; }
    if (op === '-') { for (const k of b.m.values()) sdel(a, k); return a; }
    if (op === '^') { for (const k of Array.from(b.m.values())) { if (shas(a, k)) sdel(a, k); else sadd(a, k); } return a; }
  } else if (a instanceof PyDict && op === '|' && b instanceof PyDict && !(a instanceof PyCounter)) {
    for (const e of b.m.values()) dset(a, e[0], e[1]);
    return a;
  } else if (a instanceof PyCounter && b instanceof PyCounter && (op === '+' || op === '-')) {
    const r = counterOp(op, a, b); a.m = r.m; return a;
  } else if (a instanceof PyDeque && op === '+') {
    const items = toArr(b); for (let i = 0; i < items.length; i++) MP.MT.deque.append(a, [items[i]]);
    return a;
  } else if (a instanceof PyObj) {
    const f = findAttr(a.cls, IDUNDER[op]);
    if (f !== undefined) { const r = call(f, [a, b]); if (r !== NotImpl) return r; }
  }
  return BIN[op](a, b);
}
function neg(a) {
  if (typeof a === 'number') return -a || 0;
  if (a instanceof PyFloat) return F(-a.v);
  if (typeof a === 'bigint') return norm(-a);
  if (typeof a === 'boolean') return -a || 0;
  const f = userSpecial(a, '__neg__'); if (f) return call(f, [a]);
  throw err('TypeError', "bad operand type for unary -: '" + tn(a) + "'");
}
function pos(a) {
  if (typeof a === 'number' || a instanceof PyFloat || typeof a === 'bigint') return a;
  if (typeof a === 'boolean') return +a;
  const f = userSpecial(a, '__pos__'); if (f) return call(f, [a]);
  throw err('TypeError', "bad operand type for unary +: '" + tn(a) + "'");
}
function invert(a) {
  if (typeof a === 'number') return -a - 1;
  if (typeof a === 'boolean') return -(+a) - 1;
  if (typeof a === 'bigint') return norm(-a - 1n);
  const f = userSpecial(a, '__invert__'); if (f) return call(f, [a]);
  throw err('TypeError', "bad operand type for unary ~: '" + tn(a) + "'");
}

// ---------------------------------------------------------------- truth, equality, ordering
function truthy(v) {
  if (v === true) return true;
  if (v === false || v === null) return false;
  switch (typeof v) { case 'number': return v !== 0; case 'string': return v.length > 0; case 'bigint': return v !== 0n; }
  if (Array.isArray(v)) return v.length > 0;
  if (v instanceof PyObj) {
    const b = userSpecial(v, '__bool__'); if (b) return truthy(call(b, [v]));
    const l = userSpecial(v, '__len__'); if (l) return call(l, [v]) !== 0;
    return true;
  }
  if (v instanceof PyFloat) return v.v !== 0;
  if (v instanceof PyTuple) return v.a.length > 0;
  if (v instanceof PyDict || v instanceof PySet) return v.m.size > 0;
  if (v instanceof PyRange) return v.len > 0;
  if (v instanceof PyDeque) return v.a.length > 0;
  if (v instanceof PyDictView) return v.d.m.size > 0;
  return true;
}
function seqEq(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) { const x = a[i], y = b[i]; if (x !== y && !pyEq(x, y)) return false; }
  return true;
}
function objEq(a, b) {
  let f = userSpecial(a, '__eq__');
  if (f) { const r = call(f, [a, b]); if (r !== NotImpl) return truthy(r); }
  f = userSpecial(b, '__eq__');
  if (f) { const r = call(f, [b, a]); if (r !== NotImpl) return truthy(r); }
  return false;
}
function pyEq(a, b) {
  if (a === b) return !(a instanceof PyFloat) || a.v === a.v;      // nan is not equal to itself
  const ta = typeof a, tb = typeof b;
  if (ta === 'number' && tb === 'number') return false;
  if (ta === 'string' || tb === 'string') return ta === tb ? false : objEq(a, b);
  if (a === null || b === null) return objEq(a, b);
  if (ta !== 'object' || a instanceof PyFloat) {
    if (tb !== 'object' || b instanceof PyFloat) return nv(a) == nv(b);
    return objEq(a, b);
  }
  if (Array.isArray(a)) return Array.isArray(b) ? seqEq(a, b) : objEq(a, b);
  if (a instanceof PyTuple) return b instanceof PyTuple ? seqEq(a.a, b.a) : objEq(a, b);
  if (a instanceof PyDict) {
    if (!(b instanceof PyDict)) return objEq(a, b);
    if (a.m.size !== b.m.size) return false;
    for (const e of a.m.values()) { const o = dget(b, e[0]); if (o === undefined || !pyEq(e[1], o)) return false; }
    return true;
  }
  if (a instanceof PySet) {
    if (!(b instanceof PySet)) return objEq(a, b);
    if (a.m.size !== b.m.size) return false;
    for (const k of a.m.values()) if (!shas(b, k)) return false;
    return true;
  }
  if (a instanceof PyDeque) return b instanceof PyDeque ? seqEq(a.a, b.a) : false;
  if (a instanceof PyRange) return b instanceof PyRange && a.len === b.len && (a.len === 0 || (a.start === b.start && (a.len === 1 || a.step === b.step)));
  if (a instanceof PyDictView && a.kind === 'keys') return (b instanceof PySet || b instanceof PyDictView) && pyEq(MP.toSet(a), MP.toSet(b));
  return objEq(a, b);
}
const OPS = ['<', '<=', '>', '>='], DUN = ['__lt__', '__le__', '__gt__', '__ge__'], RDUN = ['__gt__', '__ge__', '__lt__', '__le__'];
const cmpTest = (c, op) => op === 0 ? c < 0 : op === 1 ? c <= 0 : op === 2 ? c > 0 : c >= 0;
function seqCmp(a, b, op) {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) { const x = a[i], y = b[i]; if (x === y || pyEq(x, y)) continue; return rich(x, y, op); }
  return cmpTest(a.length - b.length, op);
}
// op: 0 '<', 1 '<=', 2 '>', 3 '>='
function rich(a, b, op) {
  const ta = typeof a, tb = typeof b;
  if ((ta === 'number' && tb === 'number') || (ta === 'string' && tb === 'string')) return op === 0 ? a < b : op === 1 ? a <= b : op === 2 ? a > b : a >= b;
  if (isNum(a) && isNum(b)) { const x = nv(a), y = nv(b); return op === 0 ? x < y : op === 1 ? x <= y : op === 2 ? x > y : x >= y; }
  if (Array.isArray(a) && Array.isArray(b)) return seqCmp(a, b, op);
  if (a instanceof PyTuple && b instanceof PyTuple) return seqCmp(a.a, b.a, op);
  if (a instanceof PySet && b instanceof PySet) {
    const sub = (x, y) => { for (const k of x.m.values()) if (!shas(y, k)) return false; return true; };
    if (op === 0) return a.m.size < b.m.size && sub(a, b);
    if (op === 1) return a.m.size <= b.m.size && sub(a, b);
    if (op === 2) return a.m.size > b.m.size && sub(b, a);
    return a.m.size >= b.m.size && sub(b, a);
  }
  if (a instanceof CmpKey && b instanceof CmpKey) return cmpTest(fl(call(a.f, [a.v, b.v])), op);
  if (a instanceof PyObj) { const f = findAttr(a.cls, DUN[op]); if (f !== undefined) { const r = call(f, [a, b]); if (r !== NotImpl) return truthy(r); } }
  if (b instanceof PyObj) { const f = findAttr(b.cls, RDUN[op]); if (f !== undefined) { const r = call(f, [b, a]); if (r !== NotImpl) return truthy(r); } }
  throw err('TypeError', "'" + OPS[op] + "' not supported between instances of '" + tn(a) + "' and '" + tn(b) + "'");
}
function cmp(a, b) {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (typeof a === 'string' && typeof b === 'string') return a < b ? -1 : a > b ? 1 : 0;
  return rich(a, b, 0) ? -1 : rich(b, a, 0) ? 1 : 0;
}

// ---------------------------------------------------------------- hashing, dict and set primitives
let OID = 0;
const oid = o => o._id || (o._id = ++OID);
const unhashable = v => err('TypeError', "unhashable type: '" + tn(v) + "'");
const enc = k => typeof k === 'number' ? 'n' + k : (k.charCodeAt(0) === 0 ? k : 's' + k.length + ':' + k);
function hkey(v) {
  switch (typeof v) {
    case 'number': case 'string': return v;
    case 'boolean': return v ? 1 : 0;
    case 'bigint': return '\0B' + v;
  }
  if (v === null) return '\0N';
  if (v instanceof PyFloat) return v.v === v.v ? v.v : '\0nan';
  if (v instanceof PyTuple) { let s = '\0T'; const a = v.a; for (let i = 0; i < a.length; i++) s += enc(hkey(a[i])) + ','; return s; }
  if (v instanceof PyObj) {
    const h = findAttr(v.cls, '__hash__');
    if (h === null) throw unhashable(v);
    if (h !== undefined && !(h instanceof PyBuiltin && !h.user)) return '\0H' + str(call(h, [v]));
    if (userSpecial(v, '__eq__')) throw unhashable(v);
    return '\0O' + oid(v);
  }
  if (Array.isArray(v) || v instanceof PyDict || v instanceof PyDeque) throw unhashable(v);
  if (v instanceof PySet) {
    if (!v.frozen) throw unhashable(v);
    const ks = []; for (const k of v.m.values()) ks.push(enc(hkey(k))); ks.sort();
    return '\0F' + ks.join(',');
  }
  return '\0O' + oid(v);
}
// Map key for `key`. Objects with a user __hash__ may collide, so those probe until an equal key or a free slot.
function hk(m, key, isSet) {
  const k = hkey(key);
  if (typeof k === 'string' && k.charCodeAt(0) === 0 && k.charCodeAt(1) === 72) {
    let kk = k, i = 0;
    for (;;) {
      const e = m.get(kk); if (e === undefined) return kk;
      const ek = isSet ? e : e[0]; if (ek === key || pyEq(ek, key)) return kk;
      kk = k + '#' + (++i);
    }
  }
  return k;
}
function dget(d, key) { const e = d.m.get(typeof key === 'string' ? key : hk(d.m, key, false)); return e === undefined ? undefined : e[1]; }
function dset(d, key, val) { const m = d.m, k = typeof key === 'string' ? key : hk(m, key, false), e = m.get(k); if (e === undefined) m.set(k, [key, val]); else e[1] = val; }
function ddel(d, key) { return d.m.delete(typeof key === 'string' ? key : hk(d.m, key, false)); }
function dhas(d, key) { return d.m.has(typeof key === 'string' ? key : hk(d.m, key, false)); }
function sadd(s, key) { const m = s.m, k = typeof key === 'string' ? key : hk(m, key, true); if (!m.has(k)) m.set(k, key); }
function shas(s, key) { return s.m.has(typeof key === 'string' ? key : hk(s.m, key, true)); }
function sdel(s, key) { return s.m.delete(typeof key === 'string' ? key : hk(s.m, key, true)); }
function hashOf(v) {
  const k = hkey(v);
  if (typeof k === 'number') return Number.isInteger(k) ? k : Math.floor(k * 2654435761) % 2147483647;
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < k.length; i++) { const c = k.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

// ---------------------------------------------------------------- repr, str, format
function floatRepr(x) {
  if (x !== x) return 'nan';
  if (x === Infinity) return 'inf';
  if (x === -Infinity) return '-inf';
  if (x === 0) return 1 / x < 0 ? '-0.0' : '0.0';
  const ax = Math.abs(x);
  if (ax >= 1e16 || ax < 1e-4) {
    const m = /^(-?[\d.]+)e([+-])(\d+)$/.exec(x.toExponential());
    return m[1] + 'e' + m[2] + (m[3].length < 2 ? '0' + m[3] : m[3]);
  }
  const s = String(x);
  return s.indexOf('.') < 0 ? s + '.0' : s;
}
function strRepr(s) {
  const q = (s.indexOf("'") >= 0 && s.indexOf('"') < 0) ? '"' : "'";
  if (!/[\\'"\x00-\x1f\x7f]/.test(s)) return q + s + q;
  let out = q;
  for (let i = 0; i < s.length; i++) {
    const c = s[i], code = s.charCodeAt(i);
    if (c === q || c === '\\') out += '\\' + c;
    else if (c === '\n') out += '\\n';
    else if (c === '\r') out += '\\r';
    else if (c === '\t') out += '\\t';
    else if (code < 32 || code === 127) out += '\\x' + code.toString(16).padStart(2, '0');
    else out += c;
  }
  return out + q;
}
const addr = o => '0x' + (0x7f3a00000000 + oid(o) * 208).toString(16);
let RDEPTH = 0;
function reprSeq(items, open, close) {
  if (RDEPTH > 40) return open + '...' + close;
  RDEPTH++;
  try { let s = open; for (let i = 0; i < items.length; i++) s += (i ? ', ' : '') + repr(items[i]); return s + close; }
  finally { RDEPTH--; }
}
function clsName(c) { return (c.native ? (c.mod ? c.mod + '.' : '') : '__main__.') + c.name; }
function repr(v) {
  if (v === null) return 'None';
  if (v === true) return 'True';
  if (v === false) return 'False';
  switch (typeof v) { case 'number': return String(v); case 'string': return strRepr(v); case 'bigint': return v.toString(); }
  if (v instanceof PyFloat) return floatRepr(v.v);
  if (Array.isArray(v)) return reprSeq(v, '[', ']');
  if (v instanceof PyTuple) return v.a.length === 1 ? '(' + repr(v.a[0]) + ',)' : reprSeq(v.a, '(', ')');
  if (v instanceof PyDict) {
    if (RDEPTH > 40) return '{...}';
    RDEPTH++;
    try {
      let entries = Array.from(v.m.values());
      if (v instanceof PyCounter) { if (!entries.length) return 'Counter()'; entries = entries.map((e, i) => [e, i]).sort((x, y) => cmp(y[0][1], x[0][1]) || x[1] - y[1]).map(x => x[0]); }
      if (v instanceof PyOrderedDict) return entries.length ? 'OrderedDict([' + entries.map(e => '(' + repr(e[0]) + ', ' + repr(e[1]) + ')').join(', ') + '])' : 'OrderedDict()';
      const body = '{' + entries.map(e => repr(e[0]) + ': ' + repr(e[1])).join(', ') + '}';
      if (v instanceof PyCounter) return 'Counter(' + body + ')';
      if (v instanceof PyDefaultDict) return 'defaultdict(' + repr(v.factory) + ', ' + body + ')';
      return body;
    } finally { RDEPTH--; }
  }
  if (v instanceof PySet) {
    if (!v.m.size) return v.frozen ? 'frozenset()' : 'set()';
    const body = reprSeq(Array.from(v.m.values()), '{', '}');
    return v.frozen ? 'frozenset(' + body + ')' : body;
  }
  if (v instanceof PyObj) {
    const f = userSpecial(v, '__repr__');
    if (f) { const r = call(f, [v]); if (typeof r !== 'string') throw err('TypeError', '__repr__ returned non-string (type ' + tn(r) + ')'); return r; }
    if (v.cls.exc) { const a = v.d.args ? v.d.args.a : []; return v.cls.name + reprSeq(a, '(', ')'); }
    if (v.cls.reprFn) return v.cls.reprFn(v);
    return '<' + clsName(v.cls) + ' object at ' + addr(v) + '>';
  }
  if (v instanceof PyRange) return v.step === 1 ? 'range(' + v.start + ', ' + v.stop + ')' : 'range(' + v.start + ', ' + v.stop + ', ' + v.step + ')';
  if (v instanceof PyFunc) return '<function ' + v.name + ' at ' + addr(v) + '>';
  if (v instanceof PyClass) return "<class '" + clsName(v) + "'>";
  if (v instanceof PyBuiltin) return '<built-in function ' + v.name + '>';
  if (v instanceof PyBound) return '<bound method ' + (v.name || (v.fn && v.fn.name) || '?') + '>';
  if (v instanceof PyModule) return "<module '" + v.name + "'>";
  if (v instanceof PyGen) return '<generator object ' + v.fn.name + ' at ' + addr(v) + '>';
  if (v instanceof PyDeque) return 'deque(' + reprSeq(v.a, '[', ']') + (v.maxlen !== null ? ', maxlen=' + v.maxlen : '') + ')';
  if (v instanceof PyDictView) return 'dict_' + v.kind + '(' + reprSeq(toArr(v), '[', ']') + ')';
  if (v === NotImpl) return 'NotImplemented';
  if (v === Ellipsis) return 'Ellipsis';
  if (v instanceof PyIter) return '<' + v.tname + ' object at ' + addr(v) + '>';
  if (v instanceof PySlice) return 'slice(' + repr(v.lo) + ', ' + repr(v.hi) + ', ' + repr(v.step) + ')';
  if (v instanceof PyTyping) return 'typing.' + v.name;
  if (v instanceof PyProperty) return '<property object at ' + addr(v) + '>';
  if (v instanceof PySuper) return '<super object>';
  return '<object>';
}
function str(v) {
  if (typeof v === 'string') return v;
  if (v instanceof PyObj) {
    const f = userSpecial(v, '__str__');
    if (f) { const r = call(f, [v]); if (typeof r !== 'string') throw err('TypeError', '__str__ returned non-string (type ' + tn(r) + ')'); return r; }
    if (v.cls.exc) {
      const a = v.d.args ? v.d.args.a : [];
      if (a.length === 0) return '';
      if (a.length === 1) return isInst(v, EXC.KeyError) ? repr(a[0]) : str(a[0]);
      return reprSeq(a, '(', ')');
    }
  }
  return repr(v);
}

function parseSpec(spec) {
  const m = /^(?:([\s\S])?([<>=^]))?([+\- ])?(z)?(#)?(0)?(\d+)?([,_])?(?:\.(\d+))?([bcdeEfFgGnosxX%])?$/.exec(spec);
  if (!m) throw err('ValueError', "Invalid format specifier '" + spec + "'");
  return { fill: m[1], align: m[2], sign: m[3], alt: !!m[5], zero: !!m[6], width: m[7] ? +m[7] : 0, group: m[8], prec: m[9] === undefined ? undefined : +m[9], type: m[10] };
}
function padTo(body, sign, sp, defAlign) {
  const len = sign.length + body.length;
  if (len >= sp.width) return sign + body;
  const fill = sp.fill !== undefined ? sp.fill : (sp.zero ? '0' : ' ');
  const align = sp.align || (sp.zero ? '=' : defAlign), n = sp.width - len;
  if (align === '<') return sign + body + fill.repeat(n);
  if (align === '>') return fill.repeat(n) + sign + body;
  if (align === '^') { const l = n >> 1; return fill.repeat(l) + sign + body + fill.repeat(n - l); }
  return sign + fill.repeat(n) + body;
}
function groupDigits(s, sep, size) {
  let out = '';
  for (let i = s.length; i > 0; i -= size) out = s.slice(Math.max(0, i - size), i) + (out ? sep + out : '');
  return out;
}
function expFmt(x, prec, upper) {
  const m = /^([\d.]+)e([+-])(\d+)$/.exec(x.toExponential(prec));
  const s = m[1] + 'e' + m[2] + (m[3].length < 2 ? '0' + m[3] : m[3]);
  return upper ? s.toUpperCase() : s;
}
function generalFmt(x, prec, alt) {
  if (x === 0) return '0';
  const p = prec === 0 ? 1 : prec;
  const e = x.toExponential(p - 1), exp = parseInt(e.split('e')[1], 10);
  if (exp < -4 || exp >= p) {
    let mant = e.split('e')[0];
    if (!alt && mant.indexOf('.') >= 0) mant = mant.replace(/\.?0+$/, '');
    const ex = Math.abs(exp);
    return mant + 'e' + (exp < 0 ? '-' : '+') + (ex < 10 ? '0' + ex : ex);
  }
  let s = x.toFixed(Math.max(0, p - 1 - exp));
  if (!alt && s.indexOf('.') >= 0) s = s.replace(/\.?0+$/, '');
  return s;
}
function fixedHE(a, prec) {            // toFixed, except exact ties round to the even digit as CPython does
  const s = a.toFixed(prec);
  if (a >= 1e21 || a !== a) return s;
  const long = a.toFixed(Math.min(100, prec + 25)), dot = long.indexOf('.'), tail = long.slice(dot + 1 + prec);
  if (!/^50*$/.test(tail)) return s;
  const head = long.slice(0, dot + 1 + prec), last = +head.replace('.', '').slice(-1);
  return last % 2 === 0 ? (prec === 0 ? head.slice(0, -1) : head) : s;
}
function fmtFloat(x, sp) {
  const neg0 = x < 0 || (x === 0 && 1 / x < 0);
  const sign = neg0 ? '-' : sp.sign === '+' ? '+' : sp.sign === ' ' ? ' ' : '';
  const ax = Math.abs(x), t = sp.type;
  let body;
  if (ax !== ax || ax === Infinity) body = ax !== ax ? 'nan' : 'inf';
  else if (t === 'f' || t === 'F') body = fixedHE(ax, sp.prec === undefined ? 6 : sp.prec);
  else if (t === 'e' || t === 'E') body = expFmt(ax, sp.prec === undefined ? 6 : sp.prec, t === 'E');
  else if (t === 'g' || t === 'G') { body = generalFmt(ax, sp.prec === undefined ? 6 : sp.prec, sp.alt); if (t === 'G') body = body.toUpperCase(); }
  else if (t === '%') body = fixedHE(ax * 100, sp.prec === undefined ? 6 : sp.prec) + '%';
  else if (sp.prec === undefined) body = floatRepr(ax);
  else { body = generalFmt(ax, sp.prec, false); if (!/[.e]/.test(body)) body += '.0'; }
  if (ax !== ax && sign === '-') return padTo(body, '', sp, '>');
  if ((t === 'F' || t === 'E' || t === 'G') && (ax !== ax || ax === Infinity)) body = body.toUpperCase();
  if (sp.group) { const i = body.search(/[.e%]/), ip = i < 0 ? body : body.slice(0, i); body = groupDigits(ip, sp.group, 3) + (i < 0 ? '' : body.slice(i)); }
  return padTo(body, sign, sp, '>');
}
function fmtInt(v, sp) {
  const t = sp.type || 'd';
  if ('eEfFgG%'.indexOf(t) >= 0) return fmtFloat(Number(v), sp);
  if (sp.prec !== undefined) throw err('ValueError', 'Precision not allowed in integer format specifier');
  if (t === 'c') return padTo(String.fromCodePoint(Number(v)), '', sp, '<');
  const negv = v < 0, a = negv ? -v : v;
  const sign = negv ? '-' : sp.sign === '+' ? '+' : sp.sign === ' ' ? ' ' : '';
  let body, prefix = '';
  if (t === 'b') { body = a.toString(2); prefix = '0b'; }
  else if (t === 'o') { body = a.toString(8); prefix = '0o'; }
  else if (t === 'x') { body = a.toString(16); prefix = '0x'; }
  else if (t === 'X') { body = a.toString(16).toUpperCase(); prefix = '0X'; }
  else body = a.toString();
  if (sp.group) body = groupDigits(body, sp.group, t === 'd' || t === 'n' ? 3 : 4);
  return padTo(body, sign + (sp.alt ? prefix : ''), sp, '>');
}
function fmt(v, spec) {
  if (spec === '') return str(v);
  const uf = userSpecial(v, '__format__');
  if (uf) return call(uf, [v, spec]);
  const sp = parseSpec(spec);
  if (typeof v === 'boolean') v = sp.type && sp.type !== 's' || !sp.type ? +v : (v ? 'True' : 'False');
  if (typeof v === 'number' || typeof v === 'bigint') {
    if (sp.type === 's') throw err('ValueError', "Unknown format code 's' for object of type 'int'");
    return fmtInt(v, sp);
  }
  if (v instanceof PyFloat) {
    if (sp.type && 'eEfFgGn%'.indexOf(sp.type) < 0) throw err('ValueError', "Unknown format code '" + sp.type + "' for object of type 'float'");
    return fmtFloat(v.v, sp);
  }
  if (typeof v === 'string') {
    if (sp.type && sp.type !== 's') throw err('ValueError', "Unknown format code '" + sp.type + "' for object of type 'str'");
    return padTo(sp.prec === undefined ? v : v.slice(0, sp.prec), '', sp, '<');
  }
  if (sp.type && sp.type !== 's') throw err('TypeError', 'unsupported format string passed to ' + tn(v) + '.__format__');
  return padTo(str(v), '', sp, '<');
}

// ---------------------------------------------------------------- iteration
function dictIter(d, kind) {
  const it = d.m.values(), size = d.m.size;
  return { next() {
    if (d.m.size !== size) throw err('RuntimeError', 'dictionary changed size during iteration');
    const r = it.next(); if (r.done) return STOP;
    const e = r.value; return kind === 0 ? e[0] : kind === 1 ? e[1] : new PyTuple([e[0], e[1]]);
  } };
}
function arrIter(a) { let i = 0; return { next() { return i < a.length ? a[i++] : STOP; } }; }
function nextOf(it) {    // adapt a Python iterator object to the internal {next()} protocol
  if (it instanceof PyGen || it instanceof PyIter) return it;
  const n = it instanceof PyObj ? findAttr(it.cls, '__next__') : undefined;
  if (n === undefined) throw err('TypeError', "iter() returned non-iterator of type '" + tn(it) + "'");
  return { next() {
    try { return call(n, [it]); }
    catch (e) { if (e instanceof PyErr && isInst(e.exc, EXC.StopIteration)) return STOP; throw e; }
  } };
}
function iter(v) {
  if (Array.isArray(v)) return arrIter(v);
  if (typeof v === 'string') return arrIter(v);
  if (v instanceof PyRange) { let x = v.start, n = v.len; const st = v.step; return { next() { if (n <= 0) return STOP; n--; const r = x; x += st; return r; } }; }
  if (v instanceof PyTuple) return arrIter(v.a);
  if (v instanceof PyDict) return dictIter(v, 0);
  if (v instanceof PyGen || v instanceof PyIter) return v;
  if (v instanceof PySet) {
    const it = v.m.values(), size = v.m.size;
    return { next() { if (v.m.size !== size) throw err('RuntimeError', 'Set changed size during iteration'); const r = it.next(); return r.done ? STOP : r.value; } };
  }
  if (v instanceof PyDictView) return dictIter(v.d, v.kind === 'keys' ? 0 : v.kind === 'values' ? 1 : 2);
  if (v instanceof PyDeque) return arrIter(v.a);
  if (v instanceof PyObj) {
    const f = findAttr(v.cls, '__iter__');
    if (f !== undefined) return nextOf(call(f, [v]));
    const g = findAttr(v.cls, '__getitem__');
    if (g !== undefined) {
      let i = 0;
      return { next() { try { return call(g, [v, i++]); } catch (e) { if (e instanceof PyErr && isInst(e.exc, EXC.IndexError)) return STOP; throw e; } } };
    }
  }
  throw err('TypeError', "'" + tn(v) + "' object is not iterable");
}
// A fresh JS array holding the items of any iterable. Charges steps for the copy.
function toArr(v) {
  if (Array.isArray(v)) { R.steps += v.length >> 2; return v.slice(); }
  if (v instanceof PyTuple) { R.steps += v.a.length >> 2; return v.a.slice(); }
  if (typeof v === 'string') { R.steps += v.length >> 2; return v.split(''); }
  const out = [], it = iter(v);
  for (;;) { const x = it.next(); if (x === STOP) break; out.push(x); if (out.length > 4e6) throw err('MemoryError', 'this sequence never seems to end'); }
  R.steps += out.length >> 2;
  return out;
}
// Like toArr but may return the live underlying array: only for read-only use.
function arrOf(v) { return Array.isArray(v) ? v : v instanceof PyTuple ? v.a : toArr(v); }

function contains(c, x) {
  if (typeof c === 'string') {
    if (typeof x !== 'string') throw err('TypeError', "'in <string>' requires string as left operand, not " + tn(x));
    R.steps += c.length >> 3;
    return c.indexOf(x) >= 0;
  }
  if (c instanceof PyDict) return dhas(c, x);
  if (c instanceof PySet) return shas(c, x);
  let a = null;
  if (Array.isArray(c)) a = c; else if (c instanceof PyTuple || c instanceof PyDeque) a = c.a;
  if (a) {
    for (let i = 0; i < a.length; i++) { const e = a[i]; if (e === x || pyEq(e, x)) { R.steps += i >> 2; return true; } }
    R.steps += a.length >> 2;
    return false;
  }
  if (c instanceof PyRange) {
    if (!isInt(x)) { if (x instanceof PyFloat && Number.isInteger(x.v)) x = x.v; else return false; }
    x = Number(x);
    if (c.step > 0 ? (x < c.start || x >= c.stop) : (x > c.start || x <= c.stop)) return false;
    return (x - c.start) % c.step === 0;
  }
  if (c instanceof PyDictView) {
    if (c.kind === 'keys') return dhas(c.d, x);
    if (c.kind === 'items') { if (!(x instanceof PyTuple) || x.a.length !== 2) return false; const v = dget(c.d, x.a[0]); return v !== undefined && pyEq(v, x.a[1]); }
  }
  const f = userSpecial(c, '__contains__');
  if (f) return truthy(call(f, [c, x]));
  const it = iter(c);
  for (;;) { const e = it.next(); if (e === STOP) return false; R.steps++; if (e === x || pyEq(e, x)) return true; }
}

// ---------------------------------------------------------------- indexing and slicing
function sliceIdx(n, lo, hi, st) {
  const step = st === null ? 1 : idx(st);
  if (step === 0) throw err('ValueError', 'slice step cannot be zero');
  const clamp = (v, a, b) => { let i = idx(v); if (i < 0) { i += n; if (i < a) i = a; } else if (i > b) i = b; return i; };
  if (step > 0) return [lo === null ? 0 : clamp(lo, 0, n), hi === null ? n : clamp(hi, 0, n), step];
  return [lo === null ? n - 1 : clamp(lo, -1, n - 1), hi === null ? -1 : clamp(hi, -1, n - 1), step];
}
function sliceArr(a, lo, hi, st) {
  const [start, stop, step] = sliceIdx(a.length, lo, hi, st);
  if (step === 1) { R.steps += Math.max(0, stop - start) >> 2; return a.slice(start, Math.max(start, stop)); }
  const out = [];
  if (step > 0) for (let i = start; i < stop; i += step) out.push(a[i]); else for (let i = start; i > stop; i += step) out.push(a[i]);
  R.steps += out.length >> 2;
  return out;
}
function sliceStr(s, lo, hi, st) {
  const [start, stop, step] = sliceIdx(s.length, lo, hi, st);
  if (step === 1) { R.steps += Math.max(0, stop - start) >> 3; return s.slice(start, Math.max(start, stop)); }
  let out = '';
  if (step > 0) for (let i = start; i < stop; i += step) out += s[i]; else for (let i = start; i > stop; i += step) out += s[i];
  R.steps += out.length >> 3;
  return out;
}
function getSlice(o, lo, hi, st) {
  if (Array.isArray(o)) return sliceArr(o, lo, hi, st);
  if (typeof o === 'string') return sliceStr(o, lo, hi, st);
  if (o instanceof PyTuple) return new PyTuple(sliceArr(o.a, lo, hi, st));
  if (o instanceof PyRange) { const [a, b, s] = sliceIdx(o.len, lo, hi, st); return new PyRange(o.start + a * o.step, o.start + b * o.step, o.step * s); }
  if (o instanceof PyObj) return getItem(o, new PySlice(lo, hi, st));
  if (o instanceof PyDeque) throw err('TypeError', "sequence index must be integer, not 'slice'");
  throw err('TypeError', "'" + tn(o) + "' object is not subscriptable");
}
function dictMissing(d, k) {
  if (d instanceof PyDefaultDict && d.factory !== null) { const v = call(d.factory, []); dset(d, k, v); return v; }
  if (d instanceof PyCounter) return 0;
  throw new PyErr(mkExc(EXC.KeyError, [k]));
}
function seqIndex(a, k, what) {
  let i = idx(k);
  if (i < 0) i += a.length;
  if (i < 0 || i >= a.length) throw err('IndexError', what + ' index out of range');
  return i;
}
function getItem(o, k) {
  if (Array.isArray(o)) {
    if (typeof k === 'number') { const n = o.length, i = k < 0 ? k + n : k; if (i >= 0 && i < n) return o[i]; throw err('IndexError', 'list index out of range'); }
    if (k instanceof PySlice) return sliceArr(o, k.lo, k.hi, k.step);
    if (!isInt(k)) throw err('TypeError', 'list indices must be integers or slices, not ' + tn(k));
    return o[seqIndex(o, k, 'list')];
  }
  if (o instanceof PyDict) { const e = o.m.get(typeof k === 'string' ? k : hk(o.m, k, false)); return e !== undefined ? e[1] : dictMissing(o, k); }
  if (typeof o === 'string') {
    if (k instanceof PySlice) return sliceStr(o, k.lo, k.hi, k.step);
    if (!isInt(k)) throw err('TypeError', 'string indices must be integers, not ' + (typeof k === 'string' ? "'str'" : tn(k)));
    return o[seqIndex(o, k, 'string')];
  }
  if (o instanceof PyTuple) {
    if (k instanceof PySlice) return new PyTuple(sliceArr(o.a, k.lo, k.hi, k.step));
    if (!isInt(k)) throw err('TypeError', 'tuple indices must be integers or slices, not ' + tn(k));
    return o.a[seqIndex(o.a, k, 'tuple')];
  }
  if (o instanceof PyObj) {
    const f = findAttr(o.cls, '__getitem__');
    if (f !== undefined) return call(f, [o, k]);
    throw err('TypeError', "'" + tn(o) + "' object is not subscriptable");
  }
  if (o instanceof PyRange) {
    if (k instanceof PySlice) return getSlice(o, k.lo, k.hi, k.step);
    let i = idx(k); if (i < 0) i += o.len;
    if (i < 0 || i >= o.len) throw err('IndexError', 'range object index out of range');
    return o.start + i * o.step;
  }
  if (o instanceof PyDeque) return o.a[seqIndex(o.a, k, 'deque')];
  if (o instanceof PyClass || o instanceof PyTyping) return o;       // list[int], Optional[str], Generic[T]
  const e = err('TypeError', "'" + tn(o) + "' object is not subscriptable");
  if (o === null) e.hint = 'The value here is None. Functions without a return, and methods such as list.sort() that change something in place, give back None.';
  else if (o instanceof PyFunc || o instanceof PyBuiltin || o instanceof PyBound) e.hint = 'This is a function. To call it use round brackets ( ), not square ones.';
  throw e;
}
function setSlice(o, lo, hi, st, v) {
  if (!Array.isArray(o)) {
    if (o instanceof PyObj) return setItem(o, new PySlice(lo, hi, st), v);
    throw err('TypeError', "'" + tn(o) + "' object does not support slice assignment");
  }
  const items = toArr(v);
  const [start, stop, step] = sliceIdx(o.length, lo, hi, st);
  if (step === 1) {
    const tail = o.slice(Math.max(start, stop));
    o.length = start;
    for (let i = 0; i < items.length; i++) o.push(items[i]);
    for (let i = 0; i < tail.length; i++) o.push(tail[i]);
    R.steps += (items.length + tail.length) >> 2;
    return;
  }
  const ix = [];
  if (step > 0) for (let i = start; i < stop; i += step) ix.push(i); else for (let i = start; i > stop; i += step) ix.push(i);
  if (ix.length !== items.length) throw err('ValueError', 'attempt to assign sequence of size ' + items.length + ' to extended slice of size ' + ix.length);
  for (let i = 0; i < ix.length; i++) o[ix[i]] = items[i];
}
function setItem(o, k, v) {
  if (Array.isArray(o)) {
    if (typeof k === 'number') { const n = o.length, i = k < 0 ? k + n : k; if (i >= 0 && i < n) { o[i] = v; return; } throw err('IndexError', 'list assignment index out of range'); }
    if (k instanceof PySlice) return setSlice(o, k.lo, k.hi, k.step, v);
    if (!isInt(k)) throw err('TypeError', 'list indices must be integers or slices, not ' + tn(k));
    let i = idx(k); if (i < 0) i += o.length;
    if (i < 0 || i >= o.length) throw err('IndexError', 'list assignment index out of range');
    o[i] = v; return;
  }
  if (o instanceof PyDict) { dset(o, k, v); return; }
  if (o instanceof PyObj) {
    const f = findAttr(o.cls, '__setitem__');
    if (f !== undefined) { call(f, [o, k, v]); return; }
  }
  if (o instanceof PyDeque) { o.a[seqIndex(o.a, k, 'deque')] = v; return; }
  throw err('TypeError', "'" + tn(o) + "' object does not support item assignment");
}
function delItem(o, k) {
  if (Array.isArray(o)) {
    if (k instanceof PySlice) return delSlice(o, k.lo, k.hi, k.step);
    if (!isInt(k)) throw err('TypeError', 'list indices must be integers or slices, not ' + tn(k));
    let i = idx(k); if (i < 0) i += o.length;
    if (i < 0 || i >= o.length) throw err('IndexError', 'list assignment index out of range');
    R.steps += (o.length - i) >> 2;
    o.splice(i, 1); return;
  }
  if (o instanceof PyDict) { if (!ddel(o, k)) throw new PyErr(mkExc(EXC.KeyError, [k])); return; }
  if (o instanceof PyObj) { const f = findAttr(o.cls, '__delitem__'); if (f !== undefined) { call(f, [o, k]); return; } }
  if (o instanceof PyDeque) { o.a.splice(seqIndex(o.a, k, 'deque'), 1); return; }
  throw err('TypeError', "'" + tn(o) + "' object doesn't support item deletion");
}
function delSlice(o, lo, hi, st) {
  if (!Array.isArray(o)) {
    if (o instanceof PyObj) return delItem(o, new PySlice(lo, hi, st));
    throw err('TypeError', "'" + tn(o) + "' object doesn't support slice deletion");
  }
  const [start, stop, step] = sliceIdx(o.length, lo, hi, st);
  if (step === 1) { if (stop > start) o.splice(start, stop - start); return; }
  const kill = new Set();
  if (step > 0) for (let i = start; i < stop; i += step) kill.add(i); else for (let i = start; i > stop; i += step) kill.add(i);
  const keep = o.filter((_, i) => !kill.has(i));
  o.length = 0; for (let i = 0; i < keep.length; i++) o.push(keep[i]);
}

// ---------------------------------------------------------------- attributes
function editDistance(a, b) {
  const m = a.length, n = b.length; let prev = [];
  for (let j = 0; j <= n; j++) prev.push(j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur.push(Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)));
    prev = cur;
  }
  return prev[n];
}
function suggest(name, candidates) {
  let best = null, bd = Math.max(1, Math.floor(name.length / 3)) + 1;
  const low = name.toLowerCase();
  for (const c of candidates) {
    if (c === name || c.startsWith('__')) continue;
    const d = c.toLowerCase() === low ? 0 : editDistance(name, c);
    if (d < bd) { bd = d; best = c; }
  }
  return best;
}
function attrNames(o) {
  const names = [];
  if (o instanceof PyObj) { for (const k in o.d) names.push(k); for (const c of o.cls.mro) for (const k in c.d) names.push(k); }
  else if (o instanceof PyClass) { for (const c of o.mro) for (const k in c.d) names.push(k); if (o.mt) for (const k in o.mt) names.push(k); }
  else if (o instanceof PyModule) { for (const k in o.d) names.push(k); }
  else { const mt = mtFor(o); if (mt) for (const k in mt) names.push(k); }
  return names;
}
function attrErr(o, name) {
  const what = o instanceof PyModule ? "module '" + o.name + "'" : o instanceof PyClass ? "type object '" + o.name + "'" : "'" + tn(o) + "' object";
  const e = err('AttributeError', what + " has no attribute '" + name + "'");
  const foreign = FOREIGN[name], builtin = !(o instanceof PyObj || o instanceof PyClass || o instanceof PyModule);
  if (o === null) e.hint = 'The value here is None. Functions without a return, and methods such as list.sort() that change something in place, give back None.';
  else if (o instanceof PyDict && dget(o, name) !== undefined) e.hint = "To read a dictionary entry use square brackets: d['" + name + "'].";
  else if (foreign && builtin && (name !== 'add' || Array.isArray(o)) && (name !== 'join' || Array.isArray(o))) e.hint = foreign;
  else { const s = suggest(name, attrNames(o)); if (s) e.hint = "Did you mean '" + s + "'?"; }
  return e;
}
// Method names people bring from JavaScript and Java, with the Python way to say the same thing.
const FOREIGN = { push: 'Python lists use .append(x).', length: 'Use len(x) to get the length.', size: 'Use len(x) to get the size.',
  toUpperCase: 'The Python method is .upper().', toLowerCase: 'The Python method is .lower().', indexOf: 'Use .index(x), or .find(x) on a string.',
  includes: "Use the 'in' operator: x in collection.", contains: "Use the 'in' operator: x in collection.", trim: 'The Python method is .strip().',
  charAt: 'Use square brackets: s[i].', substring: 'Use slicing: s[start:end].', substr: 'Use slicing: s[start:end].', slice: 'Use slicing: x[start:end].',
  concat: 'Use + to join two sequences.', forEach: 'Use a for loop.', equals: 'Use == to compare.', put: 'Assign with square brackets: d[key] = value.',
  has: "Use the 'in' operator: key in d.", containsKey: "Use the 'in' operator: key in d.", shift: 'Use .pop(0), or a deque with .popleft().',
  unshift: 'Use .insert(0, x).', add: 'Lists use .append(x). Sets are the ones with .add(x).', join: "join is a string method: ', '.join(items).",
  len: 'len is a function: write len(x).', isEmpty: 'An empty collection is falsy: write "if not x:".', toString: 'Use str(x).' };
function mtFor(o) {
  const MT = MP.MT;
  if (typeof o === 'string') return MT.str;
  if (Array.isArray(o)) return MT.list;
  if (o instanceof PyDict) return o instanceof PyCounter ? MT.Counter : o instanceof PyOrderedDict ? MT.OrderedDict : o instanceof PyDefaultDict ? MT.defaultdict : MT.dict;
  if (o instanceof PySet) return o.frozen ? MT.frozenset : MT.set;
  if (o instanceof PyTuple) return MT.tuple;
  if (typeof o === 'number' || typeof o === 'bigint' || typeof o === 'boolean') return MT.int;
  if (o instanceof PyFloat) return MT.float;
  if (o instanceof PyDeque) return MT.deque;
  if (o instanceof PyGen) return MT.generator;
  if (o instanceof PyIter) return MT.iterator;
  if (o instanceof PyRange) return MT.range;
  if (o instanceof PyDictView) return MT.dictview;
  if (o instanceof PyProperty) return MT.property;
  return null;
}
function bind(cv, o) {
  if (cv instanceof PyFunc) return new PyBound(o, cv, null, cv.name);
  if (cv instanceof PyBuiltin) return cv.meth ? new PyBound(o, cv, null, cv.name) : cv;
  if (cv instanceof PyStatic) return cv.fn;
  if (cv instanceof PyClassMethod) return new PyBound(o instanceof PyClass ? o : o.cls, cv.fn, null, cv.fn.name);
  if (cv instanceof PyProperty) { if (cv.fget === null) throw err('AttributeError', 'unreadable attribute'); return call(cv.fget, [o]); }
  return cv;
}
function classAttr(cls, name) {
  const v = findAttr(cls, name);
  if (v !== undefined) {
    if (v instanceof PyStatic) return v.fn;
    if (v instanceof PyClassMethod) return new PyBound(cls, v.fn, null, name);
    return v;
  }
  switch (name) {
    case '__name__': case '__qualname__': return cls.name;
    case '__mro__': return new PyTuple(cls.mro.slice());
    case '__bases__': return new PyTuple(cls.bases.slice());
    case '__class__': return T.type;
    case '__module__': return cls.native ? (cls.mod || 'builtins') : '__main__';
    case '__doc__': return null;
  }
  if (cls.mt) {
    const f = cls.mt[name];
    if (typeof f === 'function') {
      return new PyBuiltin(name, (args, kw) => {
        if (!args.length) throw err('TypeError', 'unbound method ' + cls.name + '.' + name + '() needs an argument');
        return f(args[0], args.slice(1), kw);
      });
    }
  }
  throw attrErr(cls, name);
}
function getAttr(o, name) {
  if (o instanceof PyObj) {
    const iv = o.d[name];
    if (iv !== undefined && !o.cls.hasProps) return iv;
    const cv = findAttr(o.cls, name);
    if (cv instanceof PyProperty) return bind(cv, o);
    if (iv !== undefined) return iv;
    if (cv !== undefined) return bind(cv, o);
    if (name === '__class__') return o.cls;
    if (name === '__dict__') { const d = new PyDict(); for (const k in o.d) dset(d, k, o.d[k]); return d; }
    const ga = findAttr(o.cls, '__getattr__');
    if (ga !== undefined) return call(ga, [o, name]);
    if (o.cls.exc && (name === '__cause__' || name === '__context__' || name === '__traceback__')) return null;
    throw attrErr(o, name);
  }
  if (o instanceof PyModule) {
    const v = o.d[name];
    if (v !== undefined) return v;
    if (o.fallback) return o.fallback(name);
    throw attrErr(o, name);
  }
  if (o instanceof PyClass) return classAttr(o, name);
  if (o instanceof PySuper) {
    const obj = o.obj, mro = (obj instanceof PyClass ? obj : typeOf(obj)).mro;
    for (let i = mro.indexOf(o.cls) + 1; i < mro.length; i++) { const v = mro[i].d[name]; if (v !== undefined) return bind(v, obj); }
    throw err('AttributeError', "'super' object has no attribute '" + name + "'");
  }
  if (o instanceof PyFunc || o instanceof PyBuiltin) {
    if (o.attrs && o.attrs[name] !== undefined) return o.attrs[name];
    if (name === '__name__' || name === '__qualname__') return o.name;
    if (name === '__doc__') return o instanceof PyFunc ? o.code.doc : null;
    if (name === '__class__') return typeOf(o);
    if (name === '__module__') return '__main__';
    throw attrErr(o, name);
  }
  if (o instanceof PyBound) {
    if (name === '__self__') return o.self;
    if (name === '__func__') return o.fn;
    if (name === '__name__') return o.name || (o.fn && o.fn.name);
    throw attrErr(o, name);
  }
  const mt = mtFor(o);
  if (mt) {
    const f = mt[name];
    if (f !== undefined) return typeof f === 'function' ? new PyBound(o, null, f, name) : f.get(o);
  }
  if (name === '__class__') return typeOf(o);
  throw attrErr(o, name);
}
function setAttr(o, name, v) {
  if (o instanceof PyObj) {
    if (o.cls.hasProps) {
      const cv = findAttr(o.cls, name);
      if (cv instanceof PyProperty) {
        if (cv.fset === null) throw err('AttributeError', "can't set attribute '" + name + "'");
        call(cv.fset, [o, v]); return;
      }
    }
    if (o.cls.frozen) throw err('AttributeError', "cannot assign to field '" + name + "'");
    o.d[name] = v; return;
  }
  if (o instanceof PyClass) {
    if (o.native) throw err('TypeError', "cannot set '" + name + "' attribute of immutable type '" + o.name + "'");
    o.d[name] = v;
    if (v instanceof PyProperty) o.hasProps = true;
    if (v instanceof PyFunc && !v.owner) v.owner = o;
    return;
  }
  if (o instanceof PyFunc || o instanceof PyBuiltin) { (o.attrs || (o.attrs = Object.create(null)))[name] = v; if (name === '__name__') o.name = v; return; }
  if (o instanceof PyModule) { o.d[name] = v; return; }
  throw err('AttributeError', "'" + tn(o) + "' object has no attribute '" + name + "'");
}
function delAttr(o, name) {
  if ((o instanceof PyObj || o instanceof PyClass || o instanceof PyModule) && o.d[name] !== undefined) { delete o.d[name]; return; }
  throw attrErr(o, name);
}

// ---------------------------------------------------------------- calling
function plural(n, word) { return n + ' ' + word + (n === 1 ? '' : 's'); }
function bindArgs(fn, s, args, kw) {
  const c = fn.code, np = c.np, na = args.length;
  if (na > np) {
    if (c.vararg < 0) {
      const nd = fn.defaults.length;
      const takes = nd ? 'from ' + (np - nd) + ' to ' + np + ' positional arguments' : plural(np, 'positional argument');
      const e = err('TypeError', (c.qualname || c.name) + '() takes ' + takes + ' but ' + na + (na === 1 ? ' was' : ' were') + ' given');
      if (fn.owner && na === np + 1 && c.pnames[0] !== 'self') e.hint = 'A method receives its object as the first argument. Add self as the first parameter of ' + c.name + '.';
      throw e;
    }
    for (let i = 0; i < np; i++) s[i] = args[i];
    s[c.vararg] = new PyTuple(args.slice(np));
  } else {
    for (let i = 0; i < na; i++) s[i] = args[i];
    if (c.vararg >= 0) s[c.vararg] = new PyTuple([]);
  }
  let kwd = null;
  if (c.kwarg >= 0) { kwd = new PyDict(); s[c.kwarg] = kwd; }
  if (kw !== null) {
    for (const k in kw) {
      const i = c.pindex[k];
      if (i === undefined) {
        if (kwd === null) throw err('TypeError', (c.qualname || c.name) +"() got an unexpected keyword argument '" + k + "'");
        dset(kwd, k, kw[k]);
      } else {
        if (s[i] !== undefined) throw err('TypeError', (c.qualname || c.name) +"() got multiple values for argument '" + k + "'");
        s[i] = kw[k];
      }
    }
  }
  const nd = fn.defaults.length, firstDef = np - nd;
  let missing = null;
  for (let i = na; i < np; i++) {
    if (s[i] === undefined) {
      if (i >= firstDef) s[i] = fn.defaults[i - firstDef];
      else (missing || (missing = [])).push("'" + c.pnames[i] + "'");
    }
  }
  if (missing) {
    const list = missing.length === 1 ? missing[0] : missing.slice(0, -1).join(', ') + ' and ' + missing[missing.length - 1];
    throw err('TypeError', (c.qualname || c.name) +'() missing ' + plural(missing.length, 'required positional argument') + ': ' + list);
  }
  for (let j = 0; j < c.kwonly.length; j++) {
    const ko = c.kwonly[j];
    if (s[ko.slot] === undefined) {
      if (fn.kwdefaults && fn.kwdefaults[ko.name] !== undefined) s[ko.slot] = fn.kwdefaults[ko.name];
      else throw err('TypeError', (c.qualname || c.name) +"() missing 1 required keyword-only argument: '" + ko.name + "'");
    }
  }
}
function invoke(fn, args, kw) {
  const c = fn.code, sc = new Scope(c.nslots, fn.closure, fn), s = sc.s;
  if (kw === null && c.simple && args.length === c.np) { for (let i = 0; i < args.length; i++) s[i] = args[i]; }
  else bindArgs(fn, s, args, kw);
  if (c.isGen) return new PyGen(fn, sc);
  const calls = R.calls;
  if (calls.length >= R.maxCalls) throw err('RecursionError', 'maximum recursion depth exceeded');
  const line = R.line;
  calls.push(line, c.name);
  if (++R.steps > R.max) stepLimit();
  const r = c.body(sc);
  calls.length -= 2;
  R.line = line;
  return r === RET ? sc.ret : null;
}
function genNext(g, sent) {
  if (g.done) return STOP;
  if (g.running) throw err('ValueError', 'generator already executing');
  if (g.it === null) g.it = g.fn.code.gbody(g.sc);
  const calls = R.calls, depth = calls.length, line = R.line;
  if (depth >= R.maxCalls) throw err('RecursionError', 'maximum recursion depth exceeded');
  calls.push(line, g.fn.name);
  g.sc.gdepth = calls.length;
  g.running = true;
  let r;
  try { r = g.it.next(sent); }
  catch (e) { g.done = true; throw e; }
  finally { g.running = false; }
  calls.length = depth;
  R.line = line;
  if (r.done) { g.done = true; g.retval = r.value === RET ? g.sc.ret : null; return STOP; }
  return r.value;
}
function instantiate(cls, args, kw) {
  if (cls.ctor) return cls.ctor(args, kw, cls);
  const o = new PyObj(cls);
  if (cls.exc) { o.d.args = new PyTuple(args.slice()); if (cls.mro.indexOf(EXC.StopIteration) >= 0) o.d.value = args.length ? args[0] : null; }
  const init = findAttr(cls, '__init__');
  if (init instanceof PyFunc) {
    const a = [o]; for (let i = 0; i < args.length; i++) a.push(args[i]);
    if (invoke(init, a, kw) !== null) throw err('TypeError', '__init__() should return None');
  } else if (init instanceof PyBuiltin) {
    const a = [o]; for (let i = 0; i < args.length; i++) a.push(args[i]);
    init.fn(a, kw);
  } else if (init !== undefined) {
    call(init, [o].concat(args), kw);
  }
  return o;
}
function call(f, args, kw) {
  if (kw === undefined) kw = null;
  if (f instanceof PyFunc) return invoke(f, args, kw);
  if (f instanceof PyBuiltin) { const r = f.fn(args, kw); return r === undefined ? null : r; }
  if (f instanceof PyBound) {
    if (f.nf !== null) { const r = f.nf(f.self, args, kw); return r === undefined ? null : r; }
    const a = [f.self]; for (let i = 0; i < args.length; i++) a.push(args[i]);
    return call(f.fn, a, kw);
  }
  if (f instanceof PyClass) return instantiate(f, args, kw);
  if (f instanceof PyObj) {
    const c = findAttr(f.cls, '__call__');
    if (c !== undefined) { const a = [f]; for (let i = 0; i < args.length; i++) a.push(args[i]); return call(c, a, kw); }
  }
  if (f instanceof PyTyping) return f;
  const e = err('TypeError', "'" + tn(f) + "' object is not callable");
  if (f === null) e.hint = 'You are calling None. Check that the function you assigned from actually returns something.';
  throw e;
}
// obj.name(args): the hot path for method calls, without allocating a bound method.
function callMethod(o, name, args, kw) {
  if (o instanceof PyObj) {
    const iv = o.d[name];
    if (iv !== undefined) return call(iv, args, kw);
    const cv = findAttr(o.cls, name);
    if (cv instanceof PyFunc) { const a = [o]; for (let i = 0; i < args.length; i++) a.push(args[i]); return invoke(cv, a, kw); }
    if (cv === undefined) return call(getAttr(o, name), args, kw);
    return call(bind(cv, o), args, kw);
  }
  const mt = mtFor(o);
  if (mt !== null) {
    const f = mt[name];
    if (typeof f === 'function') { const r = f(o, args, kw); return r === undefined ? null : r; }
  }
  return call(getAttr(o, name), args, kw);
}

function out(s) {
  if (R.outLen > 60000) { if (!R.outCut) { R.outCut = true; R.out.push('\n[output cut off: too much text]\n'); } return; }
  R.out.push(s); R.outLen += s.length;
}

Object.assign(MP, {
  PyFloat, PyTuple, PyRange, PyDict, PyDefaultDict, PyCounter, PyOrderedDict, PySet, PyDeque, PyDictView, PySlice, Scope, PyFunc,
  PyBuiltin, PyBound, PyClass, PyObj, PyModule, PyIter, PyProperty, PyStatic, PyClassMethod, PySuper, PyTyping, CmpKey, PyGen,
  PyErr, PyAbort, PySyntax, STOP, NotImpl, Ellipsis, RET, BRK, CNT, MAXS,
  mkType, mkExcClass, mkExc, err, stepLimit, typeOf, tn, isInst, findAttr, userSpecial, iterType,
  isNum, isInt, big, norm, fl, nv, F, idx, intOp, arith, add, sub, mul, BIN, iop, neg, pos, invert, repeat, setOp,
  truthy, pyEq, rich, cmp, hkey, hk, dget, dset, ddel, dhas, sadd, shas, sdel, hashOf, oid,
  floatRepr, strRepr, repr, str, fmt, parseSpec, padTo,
  iter, nextOf, toArr, arrOf, contains, sliceIdx, getSlice, getItem, setItem, setSlice, delItem, delSlice,
  suggest, attrErr, mtFor, bind, getAttr, setAttr, delAttr, invoke, genNext, instantiate, call, callMethod, out, plural,
  MT: Object.create(null),
});
})(typeof window !== 'undefined' ? window : globalThis);
