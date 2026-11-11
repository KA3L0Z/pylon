/* MiniPy part 4 of 5: built-in functions, type constructors and the methods of str, list, dict, set and friends. */
(function (root) {
'use strict';
const MP = root.MiniPy;
const { R, PyFloat, PyTuple, PyRange, PyDict, PyDefaultDict, PyCounter, PyOrderedDict, PySet, PyDeque, PyDictView, PySlice, PyFunc, PyBuiltin,
  PyBound, PyClass, PyObj, PyModule, PyIter, PyProperty, PyStatic, PyClassMethod, PySuper, PyGen, PyErr, STOP, NotImpl, Ellipsis, MAXS,
  T, EXC, MT, mkExc, err, typeOf, tn, isInst, findAttr, userSpecial, isNum, isInt, big, norm, fl, F, idx, arith, add, sub, mul,
  truthy, pyEq, rich, cmp, dget, dset, ddel, dhas, sadd, shas, sdel, hashOf, oid, repr, str, fmt, iter, nextOf, toArr, arrOf,
  contains, getItem, getAttr, setAttr, delAttr, call, genNext, out } = MP;

const B = MP.builtins = Object.create(null);
const def = (name, fn) => { B[name] = new PyBuiltin(name, fn); };
const meth = (name, fn) => { const b = new PyBuiltin(name, fn); b.meth = true; return b; };
const kwget = (kw, name, dflt) => (kw !== null && kw !== undefined && kw[name] !== undefined) ? kw[name] : dflt;
function argc(name, args, min, max) {
  if (args.length >= min && args.length <= max) return;
  const want = min === max ? (min === 1 ? 'exactly one argument' : 'exactly ' + min + ' arguments') : (args.length < min ? 'at least ' + min : 'at most ' + max) + (min === 1 && args.length < min ? ' argument' : ' arguments');
  throw err('TypeError', name + '() takes ' + want + ' (' + args.length + ' given)');
}
const keyErr = k => new PyErr(mkExc(EXC.KeyError, [k]));
const isSpace = c => c === ' ' || c === '\n' || c === '\t' || c === '\r' || c === '\f' || c === '\v' || c === ' ';

// ---------------------------------------------------------------- core helpers
function pyLen(v) {
  if (typeof v === 'string' || Array.isArray(v)) return v.length;
  if (v instanceof PyDict || v instanceof PySet) return v.m.size;
  if (v instanceof PyTuple || v instanceof PyDeque) return v.a.length;
  if (v instanceof PyRange) return v.len;
  if (v instanceof PyDictView) return v.d.m.size;
  const f = userSpecial(v, '__len__');
  if (f) { const n = call(f, [v]); if (!isInt(n)) throw err('TypeError', "'" + tn(n) + "' object cannot be interpreted as an integer"); return Number(n); }
  throw err('TypeError', "object of type '" + tn(v) + "' has no len()");
}
MP.pyLen = pyLen;
MP.toSet = function (v) {
  if (v instanceof PySet) return v;
  const s = new PySet(false), it = iter(v);
  for (;;) { const x = it.next(); if (x === STOP) break; sadd(s, x); }
  R.steps += s.m.size >> 2;
  return s;
};
const toSet = MP.toSet;
function sortArr(a, key, reverse) {
  const n = a.length;
  R.steps += (n * Math.max(1, Math.ceil(Math.log2(n + 1)))) >> 2;
  if (key === null || key === undefined) { a.sort(reverse ? (x, y) => cmp(y, x) : cmp); return a; }
  const keyed = a.map(v => ({ k: call(key, [v]), v }));
  keyed.sort(reverse ? (x, y) => cmp(y.k, x.k) : (x, y) => cmp(x.k, y.k));
  for (let i = 0; i < n; i++) a[i] = keyed[i].v;
  return a;
}
function parseIntStr(s, base) {
  const bad = () => err('ValueError', 'invalid literal for int() with base ' + base + ': ' + repr(s));
  let t = s.trim().replace(/_/g, '').toLowerCase(), sign = 1;
  if (t[0] === '+' || t[0] === '-') { if (t[0] === '-') sign = -1; t = t.slice(1); }
  if (base === 0) { base = /^0x/.test(t) ? 16 : /^0o/.test(t) ? 8 : /^0b/.test(t) ? 2 : 10; }
  if ((base === 16 && /^0x/.test(t)) || (base === 8 && /^0o/.test(t)) || (base === 2 && /^0b/.test(t))) t = t.slice(2);
  if (base < 2 || base > 36) throw err('ValueError', 'int() base must be >= 2 and <= 36, or 0');
  const digits = '0123456789abcdefghijklmnopqrstuvwxyz'.slice(0, base);
  if (!t.length) throw bad();
  for (let i = 0; i < t.length; i++) if (digits.indexOf(t[i]) < 0) throw bad();
  if (base === 10 && t.length <= 15) return (sign * Number(t)) || 0;
  let r = 0n;
  const bb = BigInt(base);
  for (let i = 0; i < t.length; i++) r = r * bb + BigInt(digits.indexOf(t[i]));
  return norm(sign < 0 ? -r : r);
}
function floatFromStr(s) {
  const t = s.trim().toLowerCase().replace(/_/g, '');
  if (/^[+-]?(inf|infinity)$/.test(t)) return t[0] === '-' ? -Infinity : Infinity;
  if (/^[+-]?nan$/.test(t)) return NaN;
  if (!/^[+-]?(\d+\.?\d*(e[+-]?\d+)?|\.\d+(e[+-]?\d+)?)$/.test(t)) throw err('ValueError', 'could not convert string to float: ' + repr(s));
  return parseFloat(t);
}
function pairOf(p, i) {
  let a;
  if (Array.isArray(p)) a = p; else if (p instanceof PyTuple) a = p.a;
  else { try { a = toArr(p); } catch (e) { throw err('TypeError', 'cannot convert dictionary update sequence element #' + i + ' to a sequence'); } }
  if (a.length !== 2) throw err('ValueError', 'dictionary update sequence element #' + i + ' has length ' + a.length + '; 2 is required');
  return a;
}
function dictUpdate(d, args, kw) {
  if (args.length) {
    const src = args[0];
    if (src instanceof PyDict) { for (const e of Array.from(src.m.values())) dset(d, e[0], e[1]); }
    else { const it = iter(src); for (let i = 0; ; i++) { const p = it.next(); if (p === STOP) break; const a = pairOf(p, i); dset(d, a[0], a[1]); } }
  }
  if (kw) for (const k in kw) dset(d, k, kw[k]);
  return d;
}
function counterAdd(c, args, kw, sign) {
  const bump = (k, n) => { const cur = dget(c, k); dset(c, k, cur === undefined ? (sign > 0 ? n : MP.neg(n)) : (sign > 0 ? add(cur, n) : sub(cur, n))); };
  if (args.length && args[0] !== null) {
    const src = args[0];
    if (src instanceof PyDict) { for (const e of Array.from(src.m.values())) bump(e[0], e[1]); }
    else { const it = iter(src); for (;;) { const x = it.next(); if (x === STOP) break; R.steps++; bump(x, 1); } }
  }
  if (kw) for (const k in kw) bump(k, kw[k]);
  return c;
}
function roundNd(v, nd) {            // decimal rounding, exact ties go to the even digit like CPython
  const a = Math.abs(v);
  if (a >= 1e21 || a !== a) return v;
  const long = a.toFixed(Math.min(100, nd + 25)), dot = long.indexOf('.'), tail = long.slice(dot + 1 + nd);
  let r;
  if (/^50*$/.test(tail)) {
    const head = long.slice(0, dot + 1 + nd), lastDigit = +head.replace('.', '').slice(-1);
    r = lastDigit % 2 === 0 ? parseFloat(head) : parseFloat((parseFloat(head) + Math.pow(10, -nd)).toFixed(nd));
  } else r = parseFloat(a.toFixed(nd));
  return v < 0 ? -r : r;
}
MP.roundNd = roundNd;
function mkIter(fn, tname) { return new PyIter(fn, tname); }

// ---------------------------------------------------------------- type constructors
T.int.ctor = (args, kw) => {
  if (!args.length) return 0;
  const v = args[0];
  if (args.length > 1 || (kw && kw.base !== undefined)) {
    if (typeof v !== 'string') throw err('TypeError', "int() can't convert non-string with explicit base");
    return parseIntStr(v, idx(args.length > 1 ? args[1] : kw.base));
  }
  if (typeof v === 'number' || typeof v === 'bigint') return v;
  if (typeof v === 'boolean') return +v;
  if (v instanceof PyFloat) {
    const x = v.v;
    if (x !== x) throw err('ValueError', 'cannot convert float NaN to integer');
    if (!isFinite(x)) throw err('OverflowError', 'cannot convert float infinity to integer');
    const t = Math.trunc(x);
    return Math.abs(t) <= MAXS ? (t || 0) : BigInt(t);
  }
  if (typeof v === 'string') return parseIntStr(v, 10);
  const f = userSpecial(v, '__int__') || userSpecial(v, '__index__');
  if (f) return call(f, [v]);
  throw err('TypeError', "int() argument must be a string, a bytes-like object or a real number, not '" + tn(v) + "'");
};
T.float.ctor = args => {
  if (!args.length) return F(0);
  const v = args[0];
  if (v instanceof PyFloat) return v;
  if (isInt(v)) return F(Number(v));
  if (typeof v === 'string') return F(floatFromStr(v));
  const f = userSpecial(v, '__float__');
  if (f) return call(f, [v]);
  throw err('TypeError', "float() argument must be a string or a real number, not '" + tn(v) + "'");
};
T.str.ctor = args => args.length ? str(args[0]) : '';
T.bool.ctor = args => args.length ? truthy(args[0]) : false;
T.list.ctor = args => args.length ? toArr(args[0]) : [];
T.tuple.ctor = args => !args.length ? new PyTuple([]) : args[0] instanceof PyTuple ? args[0] : new PyTuple(toArr(args[0]));
T.dict.ctor = (args, kw) => dictUpdate(new PyDict(), args, kw);
T.set.ctor = args => { const s = new PySet(false); if (args.length) { const a = arrOf(args[0]); for (let i = 0; i < a.length; i++) sadd(s, a[i]); R.steps += a.length >> 2; } return s; };
T.frozenset.ctor = args => { const s = new PySet(true); if (args.length) { const a = arrOf(args[0]); for (let i = 0; i < a.length; i++) sadd(s, a[i]); } return s; };
T.range.ctor = args => {
  argc('range', args, 1, 3);
  const n = args.map(a => { if (a instanceof PyFloat) throw err('TypeError', "'float' object cannot be interpreted as an integer"); return idx(a); });
  if (n.length === 1) return new PyRange(0, n[0], 1);
  if (n.length === 2) return new PyRange(n[0], n[1], 1);
  if (n[2] === 0) throw err('ValueError', 'range() arg 3 must not be zero');
  return new PyRange(n[0], n[1], n[2]);
};
T.type.ctor = args => { if (args.length === 1) return typeOf(args[0]); throw err('TypeError', "type() with three arguments is not available in Pylon's Python"); };
T.slice.ctor = args => args.length === 1 ? new PySlice(null, args[0], null) : new PySlice(args[0], args.length > 1 ? args[1] : null, args.length > 2 ? args[2] : null);
T.property.ctor = (args, kw) => new PyProperty(args.length ? args[0] : kwget(kw, 'fget', null), args.length > 1 ? args[1] : kwget(kw, 'fset', null));
T.staticmethod.ctor = args => new PyStatic(args[0]);
T.classmethod.ctor = args => new PyClassMethod(args[0]);
T.super.ctor = args => { if (args.length !== 2) throw err('RuntimeError', 'super(): no arguments. It only works inside a method of a class'); return new PySuper(args[0], args[1]); };
T.deque.ctor = (args, kw) => {
  const ml = args.length > 1 ? args[1] : kwget(kw, 'maxlen', null);
  const d = new PyDeque([], ml === null ? null : idx(ml));
  if (args.length && args[0] !== null) { const a = toArr(args[0]); for (let i = 0; i < a.length; i++) MT.deque.append(d, [a[i]]); }
  return d;
};
T.defaultdict.ctor = (args, kw) => {
  const f = args.length ? args[0] : null;
  if (f !== null && !(f instanceof PyFunc || f instanceof PyBuiltin || f instanceof PyClass || f instanceof PyBound || f instanceof PyObj)) throw err('TypeError', 'first argument must be callable or None');
  return dictUpdate(new PyDefaultDict(f), args.slice(1), kw);
};
T.Counter.ctor = (args, kw) => counterAdd(new PyCounter(), args, kw, 1);
T.OrderedDict.ctor = (args, kw) => dictUpdate(new PyOrderedDict(), args, kw);
['object', 'type', 'int', 'float', 'str', 'bool', 'list', 'tuple', 'dict', 'set', 'frozenset', 'range', 'slice', 'property', 'staticmethod', 'classmethod', 'super'].forEach(n => { B[n] = T[n]; });
for (const n in EXC) B[n] = EXC[n];
B.NotImplemented = NotImpl; B.Ellipsis = Ellipsis; B.__name__ = '__main__'; B.__debug__ = true;

// methods every object has
function excStr(v) {
  const a = v.d.args ? v.d.args.a : [];
  if (a.length === 0) return '';
  if (a.length === 1) return isInst(v, EXC.KeyError) ? repr(a[0]) : str(a[0]);
  return repr(v.d.args);
}
Object.assign(T.object.d, {
  __init__: meth('__init__', (args, kw) => {
    if (args.length > 1 || (kw && Object.keys(kw).length)) { const o = args[0]; throw err('TypeError', (o instanceof PyObj ? o.cls.name : 'object') + '() takes no arguments'); }
    return null;
  }),
  __repr__: meth('__repr__', a => { const o = a[0]; return o instanceof PyObj ? '<' + (o.cls.native ? '' : '__main__.') + o.cls.name + ' object at 0x' + (0x7f3a00000000 + oid(o) * 208).toString(16) + '>' : repr(o); }),
  __str__: meth('__str__', a => repr(a[0])),
  __eq__: meth('__eq__', a => a[0] === a[1] ? true : NotImpl),
  __ne__: meth('__ne__', a => !pyEq(a[0], a[1])),
  __hash__: meth('__hash__', a => oid(a[0])),
  __setattr__: meth('__setattr__', a => { const o = a[0]; if (o instanceof PyObj) o.d[a[1]] = a[2]; else setAttr(o, a[1], a[2]); return null; }),
  __init_subclass__: meth('__init_subclass__', () => null),
});
Object.assign(EXC.BaseException.d, {
  __init__: meth('__init__', args => { args[0].d.args = new PyTuple(args.slice(1)); return null; }),
  __str__: meth('__str__', a => excStr(a[0])),
  __repr__: meth('__repr__', a => a[0].cls.name + repr(a[0].d.args || new PyTuple([])).replace(/,\)$/, ')')),
  with_traceback: meth('with_traceback', a => a[0]),
});

// ---------------------------------------------------------------- built-in functions
def('print', (args, kw) => {
  const sep = kwget(kw, 'sep', ' '), end = kwget(kw, 'end', '\n');
  let s = '';
  for (let i = 0; i < args.length; i++) s += (i ? (sep === null ? ' ' : str(sep)) : '') + str(args[i]);
  out(s + (end === null ? '\n' : str(end)));
  return null;
});
def('len', args => { argc('len', args, 1, 1); return pyLen(args[0]); });
def('repr', args => repr(args[0]));
def('ascii', args => repr(args[0]));
def('abs', args => {
  const v = args[0];
  if (typeof v === 'number') return Math.abs(v);
  if (v instanceof PyFloat) return F(Math.abs(v.v));
  if (typeof v === 'bigint') return v < 0n ? -v : v;
  if (typeof v === 'boolean') return +v;
  const f = userSpecial(v, '__abs__');
  if (f) return call(f, [v]);
  throw err('TypeError', "bad operand type for abs(): '" + tn(v) + "'");
});
function minmax(name, args, kw, op) {
  const key = kwget(kw, 'key', null);
  let items;
  if (args.length === 0) throw err('TypeError', name + ' expected at least 1 argument, got 0');
  if (args.length === 1) items = arrOf(args[0]); else items = args;
  if (!items.length) { if (kw && kw.default !== undefined) return kw.default; throw err('ValueError', name + '() arg is an empty sequence'); }
  let best = items[0], bk = key ? call(key, [best]) : best;
  for (let i = 1; i < items.length; i++) {
    const x = items[i], k = key ? call(key, [x]) : x;
    if (typeof k === 'number' && typeof bk === 'number' ? (op ? k > bk : k < bk) : rich(k, bk, op)) { best = x; bk = k; }
  }
  R.steps += items.length >> 2;
  return best;
}
def('min', (args, kw) => minmax('min', args, kw, 0));
def('max', (args, kw) => minmax('max', args, kw, 2));
def('sum', (args, kw) => {
  argc('sum', args, 1, 2);
  let total = args.length > 1 ? args[1] : kwget(kw, 'start', 0);
  if (typeof total === 'string') throw err('TypeError', "sum() can't sum strings [use ''.join(seq) instead]");
  const items = arrOf(args[0]);
  for (let i = 0; i < items.length; i++) {
    const x = items[i];
    if (typeof total === 'number' && typeof x === 'number') { const r = total + x; total = (r <= MAXS && r >= -MAXS) ? r : add(total, x); }
    else total = add(total, x);
  }
  R.steps += items.length >> 2;
  return total;
});
def('sorted', (args, kw) => { argc('sorted', args, 1, 1); return sortArr(toArr(args[0]), kwget(kw, 'key', null), truthy(kwget(kw, 'reverse', false))); });
def('reversed', args => {
  const v = args[0];
  if (Array.isArray(v) || v instanceof PyTuple || v instanceof PyDeque || typeof v === 'string') {
    const a = Array.isArray(v) || typeof v === 'string' ? v : v.a;
    let i = a.length - 1;
    return mkIter(() => { if (i >= a.length) i = a.length - 1; return i >= 0 ? a[i--] : STOP; }, 'reversed');
  }
  if (v instanceof PyRange) { let i = v.len - 1; return mkIter(() => i >= 0 ? v.start + (i--) * v.step : STOP, 'range_iterator'); }
  if (v instanceof PyDict || v instanceof PyDictView) { const a = toArr(v); let i = a.length - 1; return mkIter(() => i >= 0 ? a[i--] : STOP, 'reversed'); }
  const f = userSpecial(v, '__reversed__');
  if (f) return call(f, [v]);
  if (userSpecial(v, '__len__') && userSpecial(v, '__getitem__')) { let i = pyLen(v) - 1; return mkIter(() => i >= 0 ? getItem(v, i--) : STOP, 'reversed'); }
  throw err('TypeError', "'" + tn(v) + "' object is not reversible");
});
def('enumerate', (args, kw) => {
  const it = iter(args[0]);
  let i = args.length > 1 ? args[1] : kwget(kw, 'start', 0);
  return mkIter(() => { const x = it.next(); if (x === STOP) return STOP; const t = new PyTuple([i, x]); i = add(i, 1); return t; }, 'enumerate');
});
def('zip', args => {
  const its = args.map(iter);
  if (!its.length) return mkIter(() => STOP, 'zip');
  return mkIter(() => {
    const row = [];
    for (let i = 0; i < its.length; i++) { const x = its[i].next(); if (x === STOP) return STOP; row.push(x); }
    return new PyTuple(row);
  }, 'zip');
});
def('map', args => {
  if (args.length < 2) throw err('TypeError', 'map() must have at least two arguments.');
  const f = args[0], its = args.slice(1).map(iter);
  if (its.length === 1) { const it = its[0]; return mkIter(() => { const x = it.next(); if (x === STOP) return STOP; R.steps++; return call(f, [x]); }, 'map'); }
  return mkIter(() => { const row = []; for (const it of its) { const x = it.next(); if (x === STOP) return STOP; row.push(x); } R.steps++; return call(f, row); }, 'map');
});
def('filter', args => {
  argc('filter', args, 2, 2);
  const f = args[0], it = iter(args[1]);
  return mkIter(() => { for (;;) { const x = it.next(); if (x === STOP) return STOP; R.steps++; if (f === null ? truthy(x) : truthy(call(f, [x]))) return x; } }, 'filter');
});
def('any', args => { const it = iter(args[0]); for (;;) { const x = it.next(); if (x === STOP) return false; R.steps++; if (truthy(x)) return true; } });
def('all', args => { const it = iter(args[0]); for (;;) { const x = it.next(); if (x === STOP) return true; R.steps++; if (!truthy(x)) return false; } });
function isinstance(v, c) {
  if (c instanceof PyClass) return isInst(v, c);
  if (c instanceof PyTuple) { for (const x of c.a) if (isinstance(v, x)) return true; return false; }
  if (c instanceof MP.PyTyping) return true;
  throw err('TypeError', 'isinstance() arg 2 must be a type, a tuple of types, or a union');
}
def('isinstance', args => { argc('isinstance', args, 2, 2); return isinstance(args[0], args[1]); });
def('issubclass', args => {
  argc('issubclass', args, 2, 2);
  const [a, b] = args;
  if (!(a instanceof PyClass)) throw err('TypeError', 'issubclass() arg 1 must be a class');
  const one = c => { if (!(c instanceof PyClass)) throw err('TypeError', 'issubclass() arg 2 must be a class or a tuple of classes'); return a.mro.indexOf(c) >= 0; };
  return b instanceof PyTuple ? b.a.some(one) : one(b);
});
def('callable', args => { const f = args[0]; return f instanceof PyFunc || f instanceof PyBuiltin || f instanceof PyBound || f instanceof PyClass || (f instanceof PyObj && findAttr(f.cls, '__call__') !== undefined); });
def('getattr', args => {
  argc('getattr', args, 2, 3);
  if (typeof args[1] !== 'string') throw err('TypeError', 'attribute name must be string');
  if (args.length === 2) return getAttr(args[0], args[1]);
  try { return getAttr(args[0], args[1]); }
  catch (e) { if (e instanceof PyErr && isInst(e.exc, EXC.AttributeError)) return args[2]; throw e; }
});
def('hasattr', args => {
  argc('hasattr', args, 2, 2);
  try { getAttr(args[0], args[1]); return true; }
  catch (e) { if (e instanceof PyErr && isInst(e.exc, EXC.AttributeError)) return false; throw e; }
});
def('setattr', args => { argc('setattr', args, 3, 3); setAttr(args[0], args[1], args[2]); return null; });
def('delattr', args => { argc('delattr', args, 2, 2); delAttr(args[0], args[1]); return null; });
def('id', args => { const v = args[0]; return (v !== null && typeof v === 'object') ? 0x7f3a00000000 + oid(v) * 208 : hashOf(v === null ? 'None' : v) % 1000003 + 9000000; });
def('hash', args => hashOf(args[0]));
def('ord', args => {
  const s = args[0];
  if (typeof s !== 'string') throw err('TypeError', 'ord() expected string of length 1, but ' + tn(s) + ' found');
  if (Array.from(s).length !== 1) throw err('TypeError', 'ord() expected a character, but string of length ' + s.length + ' found');
  return s.codePointAt(0);
});
def('chr', args => { const i = idx(args[0]); if (i < 0 || i > 0x10ffff) throw err('ValueError', 'chr() arg not in range(0x110000)'); return String.fromCodePoint(i); });
const based = (v, base, prefix) => { const n = isInt(v) ? (typeof v === 'boolean' ? +v : v) : idx(v); return (n < 0 ? '-' : '') + prefix + (n < 0 ? -n : n).toString(base); };
def('bin', args => based(args[0], 2, '0b'));
def('hex', args => based(args[0], 16, '0x'));
def('oct', args => based(args[0], 8, '0o'));
def('round', (args, kw) => {
  argc('round', args, 1, 2);
  const x = args[0], ndv = args.length > 1 ? args[1] : kwget(kw, 'ndigits', null), nd = ndv === null ? null : idx(ndv);
  if (isInt(x)) {
    const v = typeof x === 'boolean' ? +x : x;
    if (nd === null || nd >= 0) return v;
    const m = 10n ** BigInt(-nd), b = big(v), q = b / m, r = b - q * m, twice = (r < 0n ? -r : r) * 2n;
    let res = q;
    if (twice > m || (twice === m && q % 2n !== 0n)) res += b < 0n ? -1n : 1n;
    return norm(res * m);
  }
  if (!(x instanceof PyFloat)) {
    const f = userSpecial(x, '__round__');
    if (f) return call(f, nd === null ? [x] : [x, nd]);
    throw err('TypeError', 'type ' + tn(x) + " doesn't define __round__ method");
  }
  const v = x.v;
  if (nd === null) {
    if (v !== v) throw err('ValueError', 'cannot convert float NaN to integer');
    if (!isFinite(v)) throw err('OverflowError', 'cannot convert float infinity to integer');
    const r = roundNd(v, 0);
    return Math.abs(r) <= MAXS ? (r || 0) : BigInt(r);
  }
  if (!isFinite(v) || nd > 300) return x;
  if (nd >= 0) return F(roundNd(v, nd));
  const p = Math.pow(10, -nd);
  return F(roundNd(v / p, 0) * p);
});
def('divmod', args => { argc('divmod', args, 2, 2); return new PyTuple([arith('//', args[0], args[1]), arith('%', args[0], args[1])]); });
def('pow', (args, kw) => {
  argc('pow', args, 2, 3);
  const m = args.length > 2 ? args[2] : kwget(kw, 'mod', null);
  if (m === null) return arith('**', args[0], args[1]);
  if (!isInt(args[0]) || !isInt(args[1]) || !isInt(m)) throw err('TypeError', 'pow() 3rd argument not allowed unless all arguments are integers');
  const mod = big(m);
  if (mod === 0n) throw err('ValueError', 'pow() 3rd argument cannot be 0');
  let e = big(args[1]);
  if (e < 0n) throw err('ValueError', "negative exponents with a modulus are not available in Pylon's Python");
  let base = ((big(args[0]) % mod) + mod) % mod, r = 1n % mod;
  while (e > 0n) { if (e & 1n) r = r * base % mod; base = base * base % mod; e >>= 1n; }
  if (r !== 0n && (r < 0n) !== (mod < 0n)) r += mod;
  return norm(r);
});
def('iter', args => {
  if (args.length === 2) { const f = args[0], stop = args[1]; return mkIter(() => { const v = call(f, []); return pyEq(v, stop) ? STOP : v; }, 'callable_iterator'); }
  const v = args[0];
  if (v instanceof PyGen || v instanceof PyIter) return v;
  if (v instanceof PyObj) { const f = findAttr(v.cls, '__iter__'); if (f !== undefined) return call(f, [v]); }
  const it = iter(v);
  const name = Array.isArray(v) ? 'list_iterator' : typeof v === 'string' ? 'str_iterator' : v instanceof PyTuple ? 'tuple_iterator' : v instanceof PyDict ? 'dict_keyiterator' : v instanceof PySet ? 'set_iterator' : v instanceof PyRange ? 'range_iterator' : 'iterator';
  return mkIter(() => it.next(), name);
});
def('next', args => {
  argc('next', args, 1, 2);
  const it = args[0];
  let v;
  if (it instanceof PyGen || it instanceof PyIter) v = it.next();
  else if (it instanceof PyObj && findAttr(it.cls, '__next__') !== undefined) {
    if (args.length === 1) return call(findAttr(it.cls, '__next__'), [it]);
    v = nextOf(it).next();
  } else throw err('TypeError', "'" + tn(it) + "' object is not an iterator");
  if (v !== STOP) return v;
  if (args.length > 1) return args[1];
  const e = new PyErr(mkExc(EXC.StopIteration, it instanceof PyGen && it.retval != null ? [it.retval] : []));
  e.hint = 'next() was called on an iterator that has no items left.';
  throw e;
});
def('format', args => fmt(args[0], args.length > 1 ? args[1] : ''));
def('vars', args => getAttr(args[0], '__dict__'));
def('dir', args => { const names = new Set(MP.attrErr ? [] : []); const o = args[0]; if (o instanceof PyObj) { for (const k in o.d) names.add(k); for (const c of o.cls.mro) for (const k in c.d) names.add(k); } else if (o instanceof PyClass) { for (const c of o.mro) for (const k in c.d) names.add(k); } else if (o instanceof PyModule) { for (const k in o.d) names.add(k); } else { const mt = MP.mtFor(o); if (mt) for (const k in mt) names.add(k); } return Array.from(names).sort(); });
const unavailable = (name, why) => def(name, () => { throw err('RuntimeError', name + '() is not available in Pylon. ' + why); });
unavailable('input', 'Your code gets its data from function arguments instead.');
unavailable('open', 'There are no files here.');
unavailable('eval', 'Write the expression directly.');
unavailable('exec', 'Write the code directly.');
unavailable('compile', 'Write the code directly.');
unavailable('globals', 'Use ordinary variables.');
unavailable('locals', 'Use ordinary variables.');
unavailable('bytes', 'Use str.');
unavailable('bytearray', 'Use a list.');
unavailable('complex', 'Complex numbers are not included.');
unavailable('memoryview', 'It is not included.');
unavailable('breakpoint', 'Use print() to inspect values.');
def('help', () => { out('Pylon tip: open the Lesson tab for this level, or use print() to inspect values.\n'); return null; });
def('exit', () => { throw new PyErr(mkExc(EXC.SystemExit, [])); });
def('quit', () => { throw new PyErr(mkExc(EXC.SystemExit, [])); });

// ---------------------------------------------------------------- str
const S = MT.str = Object.create(null);
T.str.mt = S;
function stripChars(s, chars, mode) {
  if (chars === undefined || chars === null) return mode === 3 ? s.trim() : mode === 1 ? s.trimStart() : s.trimEnd();
  if (typeof chars !== 'string') throw err('TypeError', 'strip arg must be None or str');
  let a = 0, b = s.length;
  if (mode & 1) while (a < b && chars.indexOf(s[a]) >= 0) a++;
  if (mode & 2) while (b > a && chars.indexOf(s[b - 1]) >= 0) b--;
  return s.slice(a, b);
}
function subRange(s, args, from) {
  let a = args.length > from && args[from] !== null ? idx(args[from]) : 0, b = args.length > from + 1 && args[from + 1] !== null ? idx(args[from + 1]) : s.length;
  if (a < 0) a = Math.max(0, a + s.length);
  if (b < 0) b = Math.max(0, b + s.length);
  return [a, Math.min(b, s.length)];
}
const needStr = (v, what) => { if (typeof v !== 'string') throw err('TypeError', what + ' must be str, not ' + tn(v)); return v; };
const cased = s => s.toLowerCase() !== s.toUpperCase();
function strFormat(s, args, kw) {
  let auto = 0;
  const field = (text) => {
    let conv = null, spec = '';
    let name = text;
    const ci = name.indexOf(':');
    if (ci >= 0) { spec = name.slice(ci + 1); name = name.slice(0, ci); }
    const bi = name.indexOf('!');
    if (bi >= 0) { conv = name.slice(bi + 1); name = name.slice(0, bi); }
    const m = /^([^.[]*)([\s\S]*)$/.exec(name), head = m[1];
    let v;
    if (head === '') { if (auto >= args.length) throw err('IndexError', 'Replacement index ' + auto + ' out of range for positional args tuple'); v = args[auto++]; }
    else if (/^\d+$/.test(head)) { if (+head >= args.length) throw err('IndexError', 'Replacement index ' + head + ' out of range for positional args tuple'); v = args[+head]; }
    else { if (!kw || kw[head] === undefined) throw keyErr(head); v = kw[head]; }
    const re = /\.([A-Za-z_]\w*)|\[([^\]]*)\]/g;
    let mm;
    while ((mm = re.exec(m[2]))) v = mm[1] !== undefined ? getAttr(v, mm[1]) : getItem(v, /^-?\d+$/.test(mm[2]) ? +mm[2] : mm[2]);
    if (conv === 'r' || conv === 'a') v = repr(v); else if (conv === 's') v = str(v);
    if (spec.indexOf('{') >= 0) spec = run(spec);
    return fmt(v, spec);
  };
  const run = (text) => {
    let res = '', i = 0;
    const n = text.length;
    while (i < n) {
      const c = text[i];
      if (c === '{') {
        if (text[i + 1] === '{') { res += '{'; i += 2; continue; }
        let j = i + 1, depth = 0;
        for (; j < n; j++) { if (text[j] === '{') depth++; else if (text[j] === '}') { if (depth === 0) break; depth--; } }
        if (j >= n) throw err('ValueError', "Single '{' encountered in format string");
        res += field(text.slice(i + 1, j));
        i = j + 1;
        continue;
      }
      if (c === '}') { if (text[i + 1] === '}') { res += '}'; i += 2; continue; } throw err('ValueError', "Single '}' encountered in format string"); }
      res += c; i++;
    }
    return res;
  };
  return run(s);
}
Object.assign(S, {
  upper: s => s.toUpperCase(),
  lower: s => s.toLowerCase(),
  casefold: s => s.toLowerCase(),
  strip: (s, a) => stripChars(s, a[0], 3),
  lstrip: (s, a) => stripChars(s, a[0], 1),
  rstrip: (s, a) => stripChars(s, a[0], 2),
  split: (s, a, kw) => {
    const sep = a.length > 0 ? a[0] : kwget(kw, 'sep', null), max = idx(a.length > 1 ? a[1] : kwget(kw, 'maxsplit', -1));
    R.steps += s.length >> 3;
    if (sep === null) {
      const res = [], n = s.length;
      let i = 0;
      for (;;) {
        while (i < n && isSpace(s[i])) i++;
        if (i >= n) break;
        if (max >= 0 && res.length >= max) { res.push(s.slice(i)); break; }
        let j = i;
        while (j < n && !isSpace(s[j])) j++;
        res.push(s.slice(i, j));
        i = j;
      }
      return res;
    }
    needStr(sep, 'separator');
    if (sep === '') throw err('ValueError', 'empty separator');
    if (max < 0) return s.split(sep);
    const res = [];
    let p = 0;
    while (res.length < max) { const k = s.indexOf(sep, p); if (k < 0) break; res.push(s.slice(p, k)); p = k + sep.length; }
    res.push(s.slice(p));
    return res;
  },
  rsplit: (s, a, kw) => {
    const sep = a.length > 0 ? a[0] : kwget(kw, 'sep', null), max = idx(a.length > 1 ? a[1] : kwget(kw, 'maxsplit', -1));
    if (max < 0) return S.split(s, a, kw);
    if (sep === null) {
      const res = [];
      let j = s.length;
      for (;;) {
        while (j > 0 && isSpace(s[j - 1])) j--;
        if (j <= 0) break;
        if (res.length >= max) { res.push(s.slice(0, j)); break; }
        let i = j;
        while (i > 0 && !isSpace(s[i - 1])) i--;
        res.push(s.slice(i, j));
        j = i;
      }
      return res.reverse();
    }
    const res = [];
    let p = s.length;
    while (res.length < max) { const k = s.lastIndexOf(sep, p - sep.length); if (k < 0 || p - sep.length < 0) break; res.push(s.slice(k + sep.length, p)); p = k; }
    res.push(s.slice(0, p));
    return res.reverse();
  },
  join: (s, a) => {
    argc('join', a, 1, 1);
    const items = arrOf(a[0]);
    for (let i = 0; i < items.length; i++) if (typeof items[i] !== 'string') throw err('TypeError', 'sequence item ' + i + ': expected str instance, ' + tn(items[i]) + ' found');
    R.steps += items.length >> 2;
    return items.join(s);
  },
  replace: (s, a) => {
    argc('replace', a, 2, 3);
    const old = needStr(a[0], 'replace() argument 1'), nw = needStr(a[1], 'replace() argument 2');
    let count = a.length > 2 ? idx(a[2]) : -1;
    R.steps += s.length >> 3;
    if (old === '') {
      let res = '', i = 0;
      for (; i < s.length && count !== 0; i++, count--) res += nw + s[i];
      return count !== 0 ? res + s.slice(i) + nw : res + s.slice(i);
    }
    if (count < 0) return s.split(old).join(nw);
    let res = '', p = 0;
    while (count-- > 0) { const k = s.indexOf(old, p); if (k < 0) break; res += s.slice(p, k) + nw; p = k + old.length; }
    return res + s.slice(p);
  },
  find: (s, a) => { const [x, y] = subRange(s, a, 1); const k = s.slice(0, y).indexOf(needStr(a[0], 'argument'), x); return k; },
  rfind: (s, a) => { const [x, y] = subRange(s, a, 1); const sub2 = needStr(a[0], 'argument'); const k = s.slice(0, y).lastIndexOf(sub2); return k >= x ? k : -1; },
  index: (s, a) => { const k = S.find(s, a); if (k < 0) throw err('ValueError', 'substring not found'); return k; },
  rindex: (s, a) => { const k = S.rfind(s, a); if (k < 0) throw err('ValueError', 'substring not found'); return k; },
  count: (s, a) => {
    const sub2 = needStr(a[0], 'argument'), [x, y] = subRange(s, a, 1), t = s.slice(x, y);
    R.steps += t.length >> 3;
    if (sub2 === '') return t.length + 1;
    let n = 0, p = 0;
    for (;;) { const k = t.indexOf(sub2, p); if (k < 0) return n; n++; p = k + sub2.length; }
  },
  startswith: (s, a) => {
    const [x, y] = subRange(s, a, 1), t = s.slice(x, y), p = a[0];
    if (p instanceof PyTuple) return p.a.some(q => t.startsWith(needStr(q, 'prefix')));
    if (typeof p !== 'string') throw err('TypeError', 'startswith first arg must be str or a tuple of str, not ' + tn(p));
    return t.startsWith(p);
  },
  endswith: (s, a) => {
    const [x, y] = subRange(s, a, 1), t = s.slice(x, y), p = a[0];
    if (p instanceof PyTuple) return p.a.some(q => t.endsWith(needStr(q, 'suffix')));
    if (typeof p !== 'string') throw err('TypeError', 'endswith first arg must be str or a tuple of str, not ' + tn(p));
    return t.endsWith(p);
  },
  isdigit: s => /^\p{Nd}+$/u.test(s),
  isdecimal: s => /^\p{Nd}+$/u.test(s),
  isnumeric: s => /^\p{N}+$/u.test(s),
  isalpha: s => /^\p{L}+$/u.test(s),
  isalnum: s => /^[\p{L}\p{N}]+$/u.test(s),
  isspace: s => s.length > 0 && /^\s+$/.test(s),
  isupper: s => cased(s) && s === s.toUpperCase(),
  islower: s => cased(s) && s === s.toLowerCase(),
  isascii: s => /^[\x00-\x7f]*$/.test(s),
  isidentifier: s => /^[A-Za-z_][A-Za-z0-9_]*$/.test(s),
  isprintable: s => !/[\x00-\x1f\x7f]/.test(s),
  istitle: s => { let prev = false, seen = false; for (const c of s) { const al = cased(c); if (al) { if (prev ? c !== c.toLowerCase() : c !== c.toUpperCase()) return false; seen = true; } prev = al; } return seen; },
  capitalize: s => s.length ? s[0].toUpperCase() + s.slice(1).toLowerCase() : s,
  title: s => { let res = '', prev = false; for (const c of s) { const al = cased(c) || /\p{L}/u.test(c); res += al ? (prev ? c.toLowerCase() : c.toUpperCase()) : c; prev = al; } return res; },
  swapcase: s => { let res = ''; for (const c of s) res += c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase(); return res; },
  center: (s, a) => { const w = idx(a[0]), f = a.length > 1 ? a[1] : ' ', pad = w - s.length; if (pad <= 0) return s; const l = (pad >> 1) + (pad & w & 1); return f.repeat(l) + s + f.repeat(pad - l); },
  ljust: (s, a) => { const w = idx(a[0]), f = a.length > 1 ? a[1] : ' '; return s.length >= w ? s : s + f.repeat(w - s.length); },
  rjust: (s, a) => { const w = idx(a[0]), f = a.length > 1 ? a[1] : ' '; return s.length >= w ? s : f.repeat(w - s.length) + s; },
  zfill: (s, a) => { const w = idx(a[0]); if (s.length >= w) return s; const sign = s[0] === '+' || s[0] === '-' ? s[0] : ''; return sign + '0'.repeat(w - s.length) + s.slice(sign.length); },
  format: (s, a, kw) => strFormat(s, a, kw),
  splitlines: (s, a, kw) => {
    const keep = truthy(a.length ? a[0] : kwget(kw, 'keepends', false)), res = [], re = /\r\n|\n|\r/g;
    let p = 0, m;
    while ((m = re.exec(s))) { res.push(s.slice(p, keep ? re.lastIndex : m.index)); p = re.lastIndex; }
    if (p < s.length) res.push(s.slice(p));
    return res;
  },
  partition: (s, a) => { const sep = needStr(a[0], 'separator'), k = s.indexOf(sep); return new PyTuple(k < 0 ? [s, '', ''] : [s.slice(0, k), sep, s.slice(k + sep.length)]); },
  rpartition: (s, a) => { const sep = needStr(a[0], 'separator'), k = s.lastIndexOf(sep); return new PyTuple(k < 0 ? ['', '', s] : [s.slice(0, k), sep, s.slice(k + sep.length)]); },
  removeprefix: (s, a) => a[0] !== '' && s.startsWith(a[0]) ? s.slice(a[0].length) : s,
  removesuffix: (s, a) => a[0] !== '' && s.endsWith(a[0]) ? s.slice(0, s.length - a[0].length) : s,
  encode: () => { throw err('RuntimeError', "bytes are not available in Pylon's Python, so str.encode() is not either"); },
  translate: () => { throw err('RuntimeError', "str.translate() is not available in Pylon's Python. Use replace() or a loop"); },
});
T.str.d.maketrans = new PyStatic(new PyBuiltin('maketrans', () => { throw err('RuntimeError', "str.maketrans() is not available in Pylon's Python. Use replace() or a loop"); }));

MP.percentFormat = function (f, arg) {
  const dict = arg instanceof PyDict ? arg : null, args = arg instanceof PyTuple ? arg.a : [arg];
  const re = /%(?:\(([^)]*)\))?([-+ 0#]*)(\*|\d+)?(?:\.(\*|\d+))?([sdifFeEgGxXorc%])/g;
  let ai = 0, res = '', last = 0, m, used = false;
  const take = () => { if (ai >= args.length) throw err('TypeError', 'not enough arguments for format string'); return args[ai++]; };
  while ((m = re.exec(f))) {
    res += f.slice(last, m.index);
    last = re.lastIndex;
    if (m[5] === '%') { res += '%'; continue; }
    used = true;
    const flags = m[2];
    let width = m[3], prec = m[4], v;
    if (width === '*') width = String(idx(take()));
    if (prec === '*') prec = String(idx(take()));
    v = m[1] !== undefined ? getItem(dict, m[1]) : take();
    let spec = flags.indexOf('-') >= 0 ? '<' : '';
    const t = m[5], numeric = t !== 's' && t !== 'r' && t !== 'c';
    if (!numeric && !spec && width) spec = '>';
    if (flags.indexOf('+') >= 0) spec += '+'; else if (flags.indexOf(' ') >= 0) spec += ' ';
    if (flags.indexOf('#') >= 0 && numeric) spec += '#';
    if (flags.indexOf('0') >= 0 && flags.indexOf('-') < 0 && numeric) spec += '0';
    if (width) spec += width;
    if (prec !== undefined) spec += '.' + prec;
    if (t === 's') res += fmt(str(v), spec);
    else if (t === 'r') res += fmt(repr(v), spec);
    else if (t === 'c') res += fmt(typeof v === 'string' ? v : String.fromCodePoint(idx(v)), spec);
    else {
      if (!isNum(v)) throw err('TypeError', '%' + t + ' format: a real number is required, not ' + tn(v));
      if (t === 'd' || t === 'i') res += fmt(T.int.ctor([v]), spec + 'd');
      else if (t === 'x' || t === 'X' || t === 'o') res += fmt(T.int.ctor([v]), spec + t);
      else res += fmt(F(fl(v)), spec + t);
    }
  }
  res += f.slice(last);
  if (!dict && ai < args.length && !(args.length === 1 && !used && !(arg instanceof PyTuple) && false)) throw err('TypeError', 'not all arguments converted during string formatting');
  return res;
};

// ---------------------------------------------------------------- list and tuple
const L = MT.list = Object.create(null);
T.list.mt = L;
function seqFind(a, x, start, end) {
  for (let i = start; i < end; i++) { const e = a[i]; if (e === x || pyEq(e, x)) { R.steps += (i - start) >> 2; return i; } }
  R.steps += Math.max(0, end - start) >> 2;
  return -1;
}
function seqRange(a, args) {
  let s = args.length > 1 ? idx(args[1]) : 0, e = args.length > 2 ? idx(args[2]) : a.length;
  if (s < 0) s = Math.max(0, s + a.length);
  if (e < 0) e = Math.max(0, e + a.length);
  return [s, Math.min(e, a.length)];
}
function seqCount(a, x) { let n = 0; for (let i = 0; i < a.length; i++) { const e = a[i]; if (e === x || pyEq(e, x)) n++; } R.steps += a.length >> 2; return n; }
Object.assign(L, {
  append: (a, args) => { if (args.length !== 1) argc('append', args, 1, 1); a.push(args[0]); return null; },
  extend: (a, args) => { argc('extend', args, 1, 1); const items = args[0] === a ? a.slice() : arrOf(args[0]); for (let i = 0; i < items.length; i++) a.push(items[i]); return null; },
  insert: (a, args) => {
    argc('insert', args, 2, 2);
    let i = idx(args[0]);
    if (i < 0) i = Math.max(0, i + a.length); else if (i > a.length) i = a.length;
    R.steps += (a.length - i) >> 2;
    a.splice(i, 0, args[1]);
    return null;
  },
  pop: (a, args) => {
    if (!a.length) throw err('IndexError', 'pop from empty list');
    if (!args.length) return a.pop();
    let i = idx(args[0]);
    if (i < 0) i += a.length;
    if (i < 0 || i >= a.length) throw err('IndexError', 'pop index out of range');
    R.steps += (a.length - i) >> 2;
    return a.splice(i, 1)[0];
  },
  remove: (a, args) => { argc('remove', args, 1, 1); const i = seqFind(a, args[0], 0, a.length); if (i < 0) throw err('ValueError', 'list.remove(x): x not in list'); R.steps += (a.length - i) >> 2; a.splice(i, 1); return null; },
  index: (a, args) => { const [s, e] = seqRange(a, args), i = seqFind(a, args[0], s, e); if (i < 0) throw err('ValueError', repr(args[0]) + ' is not in list'); return i; },
  count: (a, args) => seqCount(a, args[0]),
  sort: (a, args, kw) => { if (args.length) throw err('TypeError', 'sort() takes no positional arguments'); sortArr(a, kwget(kw, 'key', null), truthy(kwget(kw, 'reverse', false))); return null; },
  reverse: a => { a.reverse(); R.steps += a.length >> 2; return null; },
  copy: a => { R.steps += a.length >> 2; return a.slice(); },
  clear: a => { a.length = 0; return null; },
});
const TU = MT.tuple = Object.create(null);
T.tuple.mt = TU;
TU.count = (t, args) => seqCount(t.a, args[0]);
TU.index = (t, args) => { const [s, e] = seqRange(t.a, args), i = seqFind(t.a, args[0], s, e); if (i < 0) throw err('ValueError', 'tuple.index(x): x not in tuple'); return i; };

// ---------------------------------------------------------------- dict family
const D = MT.dict = Object.create(null);
T.dict.mt = D;
function cloneDict(d) {
  const c = d instanceof PyDefaultDict ? new PyDefaultDict(d.factory) : d instanceof PyCounter ? new PyCounter() : d instanceof PyOrderedDict ? new PyOrderedDict() : new PyDict();
  for (const e of d.m.values()) dset(c, e[0], e[1]);
  R.steps += d.m.size >> 2;
  return c;
}
Object.assign(D, {
  get: (d, args) => { argc('get', args, 1, 2); const v = dget(d, args[0]); return v !== undefined ? v : (args.length > 1 ? args[1] : null); },
  keys: d => new PyDictView(d, 'keys'),
  values: d => new PyDictView(d, 'values'),
  items: d => new PyDictView(d, 'items'),
  pop: (d, args) => {
    argc('pop', args, 1, 2);
    const v = dget(d, args[0]);
    if (v === undefined) { if (args.length > 1) return args[1]; throw keyErr(args[0]); }
    ddel(d, args[0]);
    return v;
  },
  popitem: (d, args, kw) => {
    if (!d.m.size) throw new PyErr(mkExc(EXC.KeyError, ['popitem(): dictionary is empty']));
    const first = d instanceof PyOrderedDict && !truthy(args.length ? args[0] : kwget(kw, 'last', true));
    let key, entry;
    if (first) { const it = d.m.entries().next().value; key = it[0]; entry = it[1]; }
    else for (const it of d.m) { key = it[0]; entry = it[1]; }
    d.m.delete(key);
    return new PyTuple([entry[0], entry[1]]);
  },
  setdefault: (d, args) => { argc('setdefault', args, 1, 2); const v = dget(d, args[0]); if (v !== undefined) return v; const nv = args.length > 1 ? args[1] : null; dset(d, args[0], nv); return nv; },
  update: (d, args, kw) => { dictUpdate(d, args, kw); return null; },
  clear: d => { d.m.clear(); return null; },
  copy: d => cloneDict(d),
});
const fromkeys = make => new PyStatic(new PyBuiltin('fromkeys', args => { const d = make(), v = args.length > 1 ? args[1] : null, a = arrOf(args[0]); for (let i = 0; i < a.length; i++) dset(d, a[i], v); return d; }));
T.dict.d.fromkeys = fromkeys(() => new PyDict());
T.OrderedDict.d.fromkeys = fromkeys(() => new PyOrderedDict());
const DD = MT.defaultdict = Object.create(D);
T.defaultdict.mt = DD;
DD.default_factory = { get: d => d.factory };
const CN = MT.Counter = Object.create(D);
T.Counter.mt = CN;
Object.assign(CN, {
  most_common: (c, args) => {
    const entries = Array.from(c.m.values()).map((e, i) => [e, i]).sort((x, y) => cmp(y[0][1], x[0][1]) || x[1] - y[1]).map(x => new PyTuple([x[0][0], x[0][1]]));
    R.steps += entries.length;
    return args.length && args[0] !== null ? entries.slice(0, Math.max(0, idx(args[0]))) : entries;
  },
  elements: c => { const res = []; for (const e of c.m.values()) { const n = Number(e[1]); for (let i = 0; i < n; i++) res.push(e[0]); } let i = 0; return mkIter(() => i < res.length ? res[i++] : STOP, 'chain'); },
  update: (c, args, kw) => { counterAdd(c, args, kw, 1); return null; },
  subtract: (c, args, kw) => { counterAdd(c, args, kw, -1); return null; },
  total: c => { let t = 0; for (const e of c.m.values()) t = add(t, e[1]); return t; },
});
const OD = MT.OrderedDict = Object.create(D);
T.OrderedDict.mt = OD;
OD.move_to_end = (d, args, kw) => {
  const key = args[0], last = truthy(args.length > 1 ? args[1] : kwget(kw, 'last', true)), v = dget(d, key);
  if (v === undefined) throw keyErr(key);
  ddel(d, key);
  if (last) { dset(d, key, v); return null; }
  const rest = Array.from(d.m.values());
  d.m.clear();
  dset(d, key, v);
  for (const e of rest) dset(d, e[0], e[1]);
  return null;
};
const DV = MT.dictview = Object.create(null);
DV.isdisjoint = (v, args) => { const o = toSet(args[0]); for (const k of toSet(v).m.values()) if (shas(o, k)) return false; return true; };

// ---------------------------------------------------------------- set
const SE = MT.set = Object.create(null), FS = MT.frozenset = Object.create(null);
T.set.mt = SE; T.frozenset.mt = FS;
const setFrom = (s, others, keep) => {
  const r = new PySet(s.frozen);
  for (const k of s.m.values()) if (keep(k, others)) sadd(r, k);
  R.steps += s.m.size >> 2;
  return r;
};
Object.assign(FS, {
  copy: s => { const r = new PySet(s.frozen); for (const k of s.m.values()) sadd(r, k); R.steps += s.m.size >> 2; return r; },
  union: (s, args) => { const r = FS.copy(s); for (const o of args) { const a = arrOf(o instanceof PySet || o instanceof PyDict || o instanceof PyDictView ? toArr(o) : o); for (let i = 0; i < a.length; i++) sadd(r, a[i]); } return r; },
  intersection: (s, args) => { const os = args.map(toSet); return setFrom(s, os, k => os.every(o => shas(o, k))); },
  difference: (s, args) => { const os = args.map(toSet); return setFrom(s, os, k => !os.some(o => shas(o, k))); },
  symmetric_difference: (s, args) => MP.setOp('^', s, toSet(args[0])),
  issubset: (s, args) => { const o = toSet(args[0]); for (const k of s.m.values()) if (!shas(o, k)) return false; return true; },
  issuperset: (s, args) => { const o = toSet(args[0]); for (const k of o.m.values()) if (!shas(s, k)) return false; return true; },
  isdisjoint: (s, args) => { const o = toSet(args[0]); for (const k of s.m.values()) if (shas(o, k)) return false; return true; },
});
Object.assign(SE, FS, {
  add: (s, args) => { argc('add', args, 1, 1); sadd(s, args[0]); return null; },
  remove: (s, args) => { if (!sdel(s, args[0])) throw keyErr(args[0]); return null; },
  discard: (s, args) => { sdel(s, args[0]); return null; },
  pop: s => { if (!s.m.size) throw new PyErr(mkExc(EXC.KeyError, ['pop from an empty set'])); const e = s.m.entries().next().value; s.m.delete(e[0]); return e[1]; },
  clear: s => { s.m.clear(); return null; },
  update: (s, args) => { for (const o of args) { const a = toArr(o); for (let i = 0; i < a.length; i++) sadd(s, a[i]); } return null; },
  intersection_update: (s, args) => { const r = FS.intersection(s, args); s.m = r.m; return null; },
  difference_update: (s, args) => { const r = FS.difference(s, args); s.m = r.m; return null; },
  symmetric_difference_update: (s, args) => { const r = FS.symmetric_difference(s, args); s.m = r.m; return null; },
});

// ---------------------------------------------------------------- numbers, range, deque, generators, property
const IN = MT.int = Object.create(null), FL = MT.float = Object.create(null);
T.int.mt = IN; T.float.mt = FL;
Object.assign(IN, {
  bit_length: v => { const b = big(v); return (b < 0n ? -b : b).toString(2).replace(/^0$/, '').length; },
  bit_count: v => { const b = big(v); return (b < 0n ? -b : b).toString(2).replace(/0/g, '').length; },
  conjugate: v => v,
  is_integer: () => true,
  real: { get: v => typeof v === 'boolean' ? +v : v },
  imag: { get: () => 0 },
  numerator: { get: v => typeof v === 'boolean' ? +v : v },
  denominator: { get: () => 1 },
});
Object.assign(FL, {
  is_integer: v => Number.isInteger(v.v),
  conjugate: v => v,
  real: { get: v => v },
  imag: { get: () => F(0) },
});
const RG = MT.range = Object.create(null);
T.range.mt = RG;
Object.assign(RG, {
  start: { get: r => r.start }, stop: { get: r => r.stop }, step: { get: r => r.step },
  count: (r, args) => contains(r, args[0]) ? 1 : 0,
  index: (r, args) => { if (!contains(r, args[0])) throw err('ValueError', repr(args[0]) + ' is not in range'); return (Number(args[0]) - r.start) / r.step; },
});
const DQ = MT.deque = Object.create(null);
T.deque.mt = DQ;
Object.assign(DQ, {
  append: (d, args) => { if (d.maxlen === 0) return null; if (d.maxlen !== null && d.a.length >= d.maxlen) d.a.shift(); d.a.push(args[0]); return null; },
  appendleft: (d, args) => { if (d.maxlen === 0) return null; if (d.maxlen !== null && d.a.length >= d.maxlen) d.a.pop(); d.a.unshift(args[0]); return null; },
  pop: d => { if (!d.a.length) throw err('IndexError', 'pop from an empty deque'); return d.a.pop(); },
  popleft: d => { if (!d.a.length) throw err('IndexError', 'pop from an empty deque'); return d.a.shift(); },
  extend: (d, args) => { const a = args[0] === d ? d.a.slice() : toArr(args[0]); for (let i = 0; i < a.length; i++) DQ.append(d, [a[i]]); return null; },
  extendleft: (d, args) => { const a = toArr(args[0]); for (let i = 0; i < a.length; i++) DQ.appendleft(d, [a[i]]); return null; },
  rotate: (d, args) => {
    const n = d.a.length;
    if (!n) return null;
    let k = (args.length ? idx(args[0]) : 1) % n;
    if (k < 0) k += n;
    if (k) { const tail = d.a.splice(n - k, k); for (let i = tail.length - 1; i >= 0; i--) d.a.unshift(tail[i]); }
    return null;
  },
  clear: d => { d.a.length = 0; return null; },
  count: (d, args) => seqCount(d.a, args[0]),
  index: (d, args) => { const i = seqFind(d.a, args[0], 0, d.a.length); if (i < 0) throw err('ValueError', repr(args[0]) + ' is not in deque'); return i; },
  remove: (d, args) => { const i = seqFind(d.a, args[0], 0, d.a.length); if (i < 0) throw err('ValueError', 'deque.remove(x): x not in deque'); d.a.splice(i, 1); return null; },
  insert: (d, args) => { let i = idx(args[0]); if (i < 0) i = Math.max(0, i + d.a.length); d.a.splice(Math.min(i, d.a.length), 0, args[1]); return null; },
  reverse: d => { d.a.reverse(); return null; },
  copy: d => new PyDeque(d.a.slice(), d.maxlen),
  maxlen: { get: d => d.maxlen },
});
const GN = MT.generator = Object.create(null);
T.generator.mt = GN;
function stopIter(g) { return new PyErr(mkExc(EXC.StopIteration, g && g.retval != null ? [g.retval] : [])); }
Object.assign(GN, {
  __next__: g => { const v = g.next(); if (v === STOP) throw stopIter(g); return v; },
  __iter__: g => g,
  send: (g, args) => {
    if (g.it === null && args[0] !== null) throw err('TypeError', "can't send non-None value to a just-started generator");
    const v = genNext(g, args[0]);
    if (v === STOP) throw stopIter(g);
    return v;
  },
  close: g => { if (!g.done && g.it !== null) { g.done = true; try { g.it.return(); } catch (e) { /* closing: ignore */ } } g.done = true; return null; },
  throw: (g, args) => {
    const e = args[0] instanceof PyClass ? new PyErr(call(args[0], args.slice(1))) : new PyErr(args[0]);
    if (g.done || g.it === null) { g.done = true; throw e; }
    let r;
    try { r = g.it.throw(e); } catch (x) { g.done = true; throw x; }
    if (r.done) { g.done = true; throw stopIter(); }
    return r.value;
  },
});
const IT = MT.iterator = Object.create(null);
IT.__next__ = it => { const v = it.next(); if (v === STOP) throw stopIter(); return v; };
IT.__iter__ = it => it;
const PR = MT.property = Object.create(null);
T.property.mt = PR;
PR.setter = (p, args) => new PyProperty(p.fget, args[0]);
PR.getter = (p, args) => new PyProperty(args[0], p.fset);
PR.deleter = p => p;
PR.fget = { get: p => p.fget };
PR.fset = { get: p => p.fset };

Object.assign(MP, { def, meth, kwget, argc, keyErr, sortArr, dictUpdate, counterAdd, mkIter, isinstance, excStr, stopIter, strFormat });
})(typeof window !== 'undefined' ? window : globalThis);
