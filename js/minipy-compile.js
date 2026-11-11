/* MiniPy part 3 of 5: compiles the AST into nested JS closures (no eval, so it runs under a strict CSP).
   Every statement closure takes the current runtime scope and returns undefined, BRK, CNT or RET.
   Runtime scopes: null at module level, a Scope for functions and comprehensions, { ns, outer } for class bodies. */
(function (root) {
'use strict';
const MP = root.MiniPy;
const { R, Scope, PyFunc, PyTuple, PyDict, PySet, PyClass, PyObj, PyErr, PyAbort, PySyntax, PyIter, PySuper, PySlice, PyGen, PyRange,
  PyProperty, PyBound, STOP, RET, BRK, CNT, T, err, stepLimit, truthy, pyEq, rich, contains, BIN, iop, neg, pos, invert,
  getItem, setItem, delItem, getSlice, setSlice, delSlice, getAttr, setAttr, delAttr, call, callMethod, iter, toArr, arrOf,
  dset, sadd, str, repr, fmt, isInst, tn, findAttr, bind, mtFor, suggest, genNext } = MP;

const tick = (L, sc) => { if (++R.steps > R.max) stepLimit(); R.line = L; if (R.trace !== null) R.trace(L, sc, undefined); };

// ---------------------------------------------------------------- compile-time scopes
class CScope {
  constructor(kind, parent) { this.kind = kind; this.parent = parent; this.slots = new Map(); this.n = 0; this.globals = new Set(); this.nonlocals = new Set(); }
  slot(name) { let i = this.slots.get(name); if (i === undefined) { i = this.n++; this.slots.set(name, i); } return i; }
  declare(name) { if ((this.kind === 'function' || this.kind === 'comp') && !this.globals.has(name) && !this.nonlocals.has(name)) this.slot(name); }
  fnParent() { let p = this.parent; while (p && p.kind === 'class') p = p.parent; return p; }
}
const GLOBAL = { k: 'global' }, CLASS = { k: 'class' };
function resolve(cs, name) {
  if (cs.kind === 'module') return GLOBAL;
  if (cs.kind === 'class') return CLASS;
  if (cs.globals.has(name)) return GLOBAL;
  if (!cs.nonlocals.has(name)) { const i = cs.slots.get(name); if (i !== undefined) return { k: 'local', i }; }
  let d = 0, p = cs.fnParent();
  while (p && p.kind !== 'module') {
    d++;
    if (!p.globals.has(name) && !p.nonlocals.has(name)) { const i = p.slots.get(name); if (i !== undefined) return { k: 'free', d, i }; }
    p = p.fnParent();
  }
  return GLOBAL;
}
const SPELLING = { true: 'True', false: 'False', null: 'None', none: 'None', nil: 'None', undefined: 'None', elseif: 'elif', println: 'print', printf: 'print', length: 'len', size: 'len', string: 'str', integer: 'int' };
function nameErr(name, env) {
  const e = err('NameError', "name '" + name + "' is not defined");
  const sp = SPELLING[name] || SPELLING[name.toLowerCase()];
  if (sp && sp !== name) e.hint = "Python spells it '" + sp + "'.";
  else {
    const s = suggest(name, Object.keys(env.G).concat(Object.keys(env.B)));
    if (s) e.hint = "Did you mean '" + s + "'?";
  }
  return e;
}
const unbound = name => err('UnboundLocalError', "cannot access local variable '" + name + "' where it is not associated with a value");
function mkLoad(cs, name, env) {
  const r = resolve(cs, name);
  if (r.k === 'local') { const i = r.i; return sc => { const v = sc.s[i]; if (v === undefined) throw unbound(name); return v; }; }
  if (r.k === 'free') {
    const i = r.i, d = r.d;
    const miss = () => err('NameError', "cannot access free variable '" + name + "' where it is not associated with a value in enclosing scope");
    if (d === 1) return sc => { const v = sc.parent.s[i]; if (v === undefined) throw miss(); return v; };
    return sc => { let s = sc; for (let k = 0; k < d; k++) s = s.parent; const v = s.s[i]; if (v === undefined) throw miss(); return v; };
  }
  if (r.k === 'class') {
    const outer = mkLoad(cs.fnParent(), name, env);
    return sc => { const v = sc.ns[name]; return v !== undefined ? v : outer(sc.outer); };
  }
  const G = env.G, B = env.B;
  return () => { const v = G[name]; if (v !== undefined) return v; const b = B[name]; if (b !== undefined) return b; throw nameErr(name, env); };
}
function mkStore(cs, name, env) {
  const r = resolve(cs, name);
  if (r.k === 'local') { const i = r.i; return (sc, v) => { sc.s[i] = v; }; }
  if (r.k === 'free') { const i = r.i, d = r.d; return (sc, v) => { let s = sc; for (let k = 0; k < d; k++) s = s.parent; s.s[i] = v; }; }
  if (r.k === 'class') return (sc, v) => { sc.ns[name] = v; };
  const G = env.G;
  return (sc, v) => { G[name] = v; };
}
function mkDel(cs, name, env) {
  const r = resolve(cs, name);
  if (r.k === 'local') { const i = r.i; return sc => { if (sc.s[i] === undefined) throw unbound(name); sc.s[i] = undefined; }; }
  if (r.k === 'free') { const i = r.i, d = r.d; return sc => { let s = sc; for (let k = 0; k < d; k++) s = s.parent; s.s[i] = undefined; }; }
  if (r.k === 'class') return sc => { if (sc.ns[name] === undefined) throw nameErr(name, env); delete sc.ns[name]; };
  const G = env.G;
  return () => { if (G[name] === undefined) throw nameErr(name, env); delete G[name]; };
}
// The runtime Scope a nested function or comprehension should close over.
const closureFn = cs => cs.kind === 'module' ? () => null : cs.kind === 'class' ? sc => sc.outer : sc => sc;

// ---------------------------------------------------------------- name analysis
function scanExpr(e, cs) {
  if (e === null || typeof e !== 'object') return;
  if (Array.isArray(e)) { for (let i = 0; i < e.length; i++) scanExpr(e[i], cs); return; }
  const t = e.t;
  if (t === 'Num' || t === 'Str' || t === 'Const' || t === 'Name') return;
  if (t === 'NamedExpr') { cs.declare(e.target.id); scanExpr(e.value, cs); return; }
  if (t === 'Lambda') { for (const a of e.args.args) scanExpr(a.default, cs); for (const a of e.args.kwonly) scanExpr(a.default, cs); return; }
  for (const k in e) if (k !== 't' && k !== 'line') scanExpr(e[k], cs);
}
function bindTarget(t, cs) {
  if (t.t === 'Name') cs.declare(t.id);
  else if (t.t === 'Tuple' || t.t === 'List') t.elts.forEach(e => bindTarget(e, cs));
  else if (t.t === 'Starred') bindTarget(t.value, cs);
  else scanExpr(t, cs);
}
function scanDecls(stmts, cs) {
  for (const s of stmts) {
    switch (s.t) {
      case 'Global': s.names.forEach(n => cs.globals.add(n)); break;
      case 'Nonlocal': s.names.forEach(n => cs.nonlocals.add(n)); break;
      case 'If': case 'While': case 'For': scanDecls(s.body, cs); scanDecls(s.orelse, cs); break;
      case 'With': scanDecls(s.body, cs); break;
      case 'Try': scanDecls(s.body, cs); s.handlers.forEach(h => scanDecls(h.body, cs)); scanDecls(s.orelse, cs); if (s.finalbody) scanDecls(s.finalbody, cs); break;
    }
  }
}
function scanStmts(stmts, cs) {
  for (const s of stmts) {
    switch (s.t) {
      case 'Assign': s.targets.forEach(t => bindTarget(t, cs)); scanExpr(s.value, cs); break;
      case 'AugAssign': bindTarget(s.target, cs); scanExpr(s.value, cs); break;
      case 'AnnAssign': if (s.value !== null || s.target.t !== 'Name') bindTarget(s.target, cs); scanExpr(s.value, cs); break;
      case 'For': bindTarget(s.target, cs); scanExpr(s.iter, cs); scanStmts(s.body, cs); scanStmts(s.orelse, cs); break;
      case 'While': case 'If': scanExpr(s.test, cs); scanStmts(s.body, cs); scanStmts(s.orelse, cs); break;
      case 'With': scanExpr(s.ctx, cs); if (s.target) bindTarget(s.target, cs); scanStmts(s.body, cs); break;
      case 'Try':
        scanStmts(s.body, cs);
        s.handlers.forEach(h => { scanExpr(h.type, cs); if (h.name) cs.declare(h.name); scanStmts(h.body, cs); });
        scanStmts(s.orelse, cs);
        if (s.finalbody) scanStmts(s.finalbody, cs);
        break;
      case 'FunctionDef':
        cs.declare(s.name); scanExpr(s.decorators, cs);
        s.args.args.forEach(a => scanExpr(a.default, cs)); s.args.kwonly.forEach(a => scanExpr(a.default, cs));
        break;
      case 'ClassDef': cs.declare(s.name); scanExpr(s.decorators, cs); scanExpr(s.bases, cs); break;
      case 'Import': s.names.forEach(n => cs.declare(n.asname || n.name.split('.')[0])); break;
      case 'ImportFrom': if (s.names) s.names.forEach(n => cs.declare(n.asname || n.name)); break;
      case 'Delete': s.targets.forEach(t => bindTarget(t, cs)); break;
      case 'Expr': case 'Return': scanExpr(s.value, cs); break;
      case 'Assert': scanExpr(s.test, cs); scanExpr(s.msg, cs); break;
      case 'Raise': scanExpr(s.exc, cs); scanExpr(s.cause, cs); break;
    }
  }
}
function hasYield(n) {
  if (n === null || typeof n !== 'object') return false;
  if (Array.isArray(n)) { for (let i = 0; i < n.length; i++) if (hasYield(n[i])) return true; return false; }
  if (n._y !== undefined) return n._y;
  const t = n.t;
  if (t === 'Yield' || t === 'YieldFrom') return true;
  if (t === 'FunctionDef' || t === 'Lambda' || t === 'ClassDef' || t === 'Num' || t === 'Str' || t === 'Const' || t === 'Name') return false;
  let r = false;
  for (const k in n) if (k !== 't' && k !== 'line' && k !== '_y' && hasYield(n[k])) { r = true; break; }
  if (t) n._y = r;
  return r;
}

// ---------------------------------------------------------------- helpers used by compiled code
function toPyErr(e) {
  if (e instanceof PyErr) return e;
  if (e instanceof PyAbort || e instanceof PySyntax) throw e;
  if (e instanceof RangeError || /recursion|call stack/i.test(String(e && e.message))) return err('RecursionError', 'maximum recursion depth exceeded');
  throw e;
}
function matches(exc, type) {
  if (type instanceof PyClass) return isInst(exc, type);
  if (type instanceof PyTuple) { for (const c of type.a) if (c instanceof PyClass && isInst(exc, c)) return true; return false; }
  throw err('TypeError', 'catching classes that do not inherit from BaseException is not allowed');
}
function special(o, name) {
  if (o instanceof PyObj) { const f = findAttr(o.cls, name); return f === undefined ? undefined : bind(f, o); }
  const mt = mtFor(o);
  return mt && typeof mt[name] === 'function' ? new PyBound(o, null, mt[name], name) : undefined;
}
function unpack(v, n, star) {
  let a;
  if (Array.isArray(v)) a = v.slice();
  else if (v instanceof PyTuple) a = v.a;
  else {
    if (v === null || typeof v === 'number' || typeof v === 'boolean' || v instanceof MP.PyFloat) throw err('TypeError', 'cannot unpack non-iterable ' + tn(v) + ' object');
    a = toArr(v);
  }
  if (star < 0) {
    if (a.length !== n) throw err('ValueError', a.length > n ? 'too many values to unpack (expected ' + n + ')' : 'not enough values to unpack (expected ' + n + ', got ' + a.length + ')');
    return a;
  }
  if (a.length < n - 1) throw err('ValueError', 'not enough values to unpack (expected at least ' + (n - 1) + ', got ' + a.length + ')');
  const tail = n - 1 - star, out = a.slice(0, star);
  out.push(a.slice(star, a.length - tail));
  for (let i = a.length - tail; i < a.length; i++) out.push(a[i]);
  return out;
}
function raiseValue(v) {
  if (v instanceof PyClass) { if (!v.exc) throw err('TypeError', 'exceptions must derive from BaseException'); v = call(v, []); }
  if (!(v instanceof PyObj) || !v.cls.exc) throw err('TypeError', 'exceptions must derive from BaseException');
  return new PyErr(v);
}
function* delegate(v) {
  if (v instanceof PyGen) {
    for (;;) { const x = genNext(v, undefined); if (x === STOP) return v.retval === undefined ? null : v.retval; yield x; }
  }
  const it = iter(v);
  for (;;) { const x = it.next(); if (x === STOP) return null; yield x; }
}
function c3(cls) {
  const bases = cls.bases;
  if (bases.length === 1) return [cls].concat(bases[0].mro);
  const seqs = bases.map(b => b.mro.slice()).concat([bases.slice()]), out = [cls];
  for (;;) {
    const live = seqs.filter(s => s.length);
    if (!live.length) return out;
    let cand = null;
    for (const s of live) { const c = s[0]; if (!live.some(o => o.indexOf(c) > 0)) { cand = c; break; } }
    if (!cand) throw err('TypeError', 'Cannot create a consistent method resolution order (MRO) for these base classes');
    out.push(cand);
    for (const s of seqs) if (s[0] === cand) s.shift();
  }
}
function buildClass(name, bases, ns, fns) {
  if (!bases.length) bases = [T.object];
  for (const b of bases) {
    if (!(b instanceof PyClass)) throw err('TypeError', 'a class can only inherit from classes, and ' + repr(b) + ' is not one');
    if (b.ctor) throw err('TypeError', "Pylon's Python cannot make a subclass of '" + b.name + "'. Keep one inside your class instead");
  }
  const cls = new PyClass(name, bases, ns);
  cls.mro = c3(cls);
  cls.exc = cls.mro.some(c => c.exc);
  cls.hasProps = cls.mro.some(c => c.hasProps);
  for (const k in ns) { const v = ns[k]; if (v instanceof PyProperty) cls.hasProps = true; else if (v instanceof PyFunc && !v.owner) v.owner = cls; }
  if (fns) for (const f of fns) if (!f.owner) f.owner = cls;
  for (const c of cls.mro) { if (c.frozen) cls.frozen = true; if (c.fields && !cls.fields) cls.fields = c.fields; }
  return cls;
}
MP.buildClass = buildClass;

// ---------------------------------------------------------------- statements
let LOOPS = 0;
function cblock(stmts, cx) {
  const fs = [];
  for (const s of stmts) { const f = cstmt(s, cx); if (f) fs.push(f); }
  const n = fs.length;
  if (n === 0) return () => undefined;
  if (n === 1) return fs[0];
  if (n === 2) { const a = fs[0], b = fs[1]; return sc => { const r = a(sc); return r !== undefined ? r : b(sc); }; }
  if (n === 3) { const a = fs[0], b = fs[1], c = fs[2]; return sc => { let r = a(sc); if (r !== undefined) return r; r = b(sc); return r !== undefined ? r : c(sc); }; }
  return sc => { for (let i = 0; i < n; i++) { const r = fs[i](sc); if (r !== undefined) return r; } };
}
function cloop(stmts, cx) { LOOPS++; try { return cblock(stmts, cx); } finally { LOOPS--; } }
function sliceParts(s, cx) {
  const none = () => null;
  return [s.lower ? cexpr(s.lower, cx) : none, s.upper ? cexpr(s.upper, cx) : none, s.step ? cexpr(s.step, cx) : none];
}
function cstore(t, cx) {
  switch (t.t) {
    case 'Name': return mkStore(cx.cs, t.id, cx.env);
    case 'Attribute': { const o = cexpr(t.value, cx), a = t.attr; return (sc, v) => { setAttr(o(sc), a, v); }; }
    case 'Subscript': {
      const o = cexpr(t.value, cx);
      if (t.slice.t === 'Slice') { const [lo, hi, st] = sliceParts(t.slice, cx); return (sc, v) => { setSlice(o(sc), lo(sc), hi(sc), st(sc), v); }; }
      const k = cexpr(t.slice, cx);
      return (sc, v) => { setItem(o(sc), k(sc), v); };
    }
    case 'Tuple': case 'List': {
      const n = t.elts.length;
      let star = -1;
      const sts = t.elts.map((e, i) => { if (e.t === 'Starred') { star = i; return cstore(e.value, cx); } return cstore(e, cx); });
      return (sc, v) => { const a = unpack(v, n, star); for (let i = 0; i < n; i++) sts[i](sc, a[i]); };
    }
  }
  throw new PySyntax('cannot assign to this expression', t.line);
}
function cdel(t, cx) {
  switch (t.t) {
    case 'Name': return mkDel(cx.cs, t.id, cx.env);
    case 'Attribute': { const o = cexpr(t.value, cx), a = t.attr; return sc => { delAttr(o(sc), a); }; }
    case 'Subscript': {
      const o = cexpr(t.value, cx);
      if (t.slice.t === 'Slice') { const [lo, hi, st] = sliceParts(t.slice, cx); return sc => { delSlice(o(sc), lo(sc), hi(sc), st(sc)); }; }
      const k = cexpr(t.slice, cx);
      return sc => { delItem(o(sc), k(sc)); };
    }
    case 'Tuple': { const ds = t.elts.map(e => cdel(e, cx)); return sc => { for (const d of ds) d(sc); }; }
  }
  throw new PySyntax('cannot delete this expression', t.line);
}
function funcMaker(name, args, body, cx, line, isLambda, decorators) {
  const code = compileFunction(name, args, body, cx, line, isLambda);
  const defaults = args.args.filter(a => a.default).map(a => cexpr(a.default, cx));
  const kwdefs = args.kwonly.filter(a => a.default).map(a => ({ name: a.name, f: cexpr(a.default, cx) }));
  const decs = (decorators || []).map(d => cexpr(d, cx));
  const closure = closureFn(cx.cs), inClass = cx.cs.kind === 'class';
  return sc => {
    const dv = []; for (let i = 0; i < decs.length; i++) dv.push(decs[i](sc));
    const defs = []; for (let i = 0; i < defaults.length; i++) defs.push(defaults[i](sc));
    let kwd = null;
    if (kwdefs.length) { kwd = Object.create(null); for (const k of kwdefs) kwd[k.name] = k.f(sc); }
    let f = new PyFunc(code, closure(sc), defs, kwd);
    if (inClass) (sc.fns || (sc.fns = [])).push(f);
    for (let i = dv.length - 1; i >= 0; i--) f = call(dv[i], [f]);
    return f;
  };
}
function compileFunction(name, args, body, cx, line, isLambda) {
  const cs = new CScope('function', cx.cs);
  const pnames = args.args.map(a => a.name), seen = new Set();
  const all = pnames.concat(args.kwonly.map(a => a.name), args.vararg ? [args.vararg] : [], args.kwarg ? [args.kwarg] : []);
  for (const n of all) { if (seen.has(n)) throw new PySyntax("duplicate argument '" + n + "' in function definition", line); seen.add(n); }
  pnames.forEach(n => cs.slot(n));
  const kwonly = args.kwonly.map(a => ({ name: a.name, slot: cs.slot(a.name) }));
  const vararg = args.vararg ? cs.slot(args.vararg) : -1, kwarg = args.kwarg ? cs.slot(args.kwarg) : -1;
  const pindex = Object.create(null);
  pnames.forEach((n, i) => { pindex[n] = i; });
  kwonly.forEach(k => { pindex[k.name] = k.slot; });
  const qualname = (cx.qual || '') + name;
  const sub = { cs, env: cx.env, base: cx.base, qual: qualname + '.<locals>.' };
  const code = { name, qualname, np: pnames.length, pnames, pindex, vararg, kwarg, kwonly, nslots: 0, body: null, gbody: null, isGen: false,
    simple: vararg < 0 && kwarg < 0 && !kwonly.length, doc: null };
  const savedLoops = LOOPS;
  LOOPS = 0;
  try {
    if (isLambda) {
      scanExpr(body, cs);
      const e = cexpr(body, sub);
      code.body = sc => { sc.ret = e(sc); return RET; };
    } else {
      scanDecls(body, cs);
      for (const n of cs.globals) if (seen.has(n)) throw new PySyntax("name '" + n + "' is parameter and global", line);
      scanStmts(body, cs);
      if (body.length && body[0].t === 'Expr' && body[0].value.t === 'Str') code.doc = body[0].value.v;
      if (hasYield(body)) { code.isGen = true; code.gbody = gblock(body, sub); }
      else code.body = cblock(body, sub);
    }
  } finally { LOOPS = savedLoops; }
  code.nslots = cs.n;
  code.vars = Array.from(cs.slots.keys());       // slot index -> variable name, for the tracer
  return code;
}
function cstmt(node, cx) {
  const L = node.line + cx.base, cs = cx.cs, env = cx.env;
  switch (node.t) {
    case 'Expr': {
      const v = node.value;
      if (v.t === 'Str' || v.t === 'Num') return null;
      if (v.t === 'Const') return sc => { tick(L, sc); };
      const e = cexpr(v, cx);
      return sc => { tick(L, sc); e(sc); };
    }
    case 'Assign': {
      const v = cexpr(node.value, cx);
      if (node.targets.length === 1) {
        const t = node.targets[0];
        if (t.t === 'Name') {
          const r = resolve(cs, t.id);
          if (r.k === 'local') { const i = r.i; return sc => { tick(L, sc); sc.s[i] = v(sc); }; }
          if (r.k === 'global') { const G = env.G, nm = t.id; return sc => { tick(L, sc); G[nm] = v(sc); }; }
        }
        const st = cstore(t, cx);
        return sc => { tick(L, sc); st(sc, v(sc)); };
      }
      const sts = node.targets.map(t => cstore(t, cx));
      return sc => { tick(L, sc); const val = v(sc); for (let i = 0; i < sts.length; i++) sts[i](sc, val); };
    }
    case 'AugAssign': {
      const op = node.op, v = cexpr(node.value, cx), t = node.target;
      if (t.t === 'Name') {
        const r = resolve(cs, t.id), nm = t.id;
        if (r.k === 'local') { const i = r.i; return sc => { tick(L, sc); const cur = sc.s[i]; if (cur === undefined) throw unbound(nm); sc.s[i] = iop(op, cur, v(sc)); }; }
        const ld = mkLoad(cs, nm, env), st = mkStore(cs, nm, env);
        return sc => { tick(L, sc); st(sc, iop(op, ld(sc), v(sc))); };
      }
      if (t.t === 'Attribute') { const o = cexpr(t.value, cx), a = t.attr; return sc => { tick(L, sc); const obj = o(sc); setAttr(obj, a, iop(op, getAttr(obj, a), v(sc))); }; }
      const o = cexpr(t.value, cx);
      if (t.slice.t === 'Slice') {
        const [lo, hi, st] = sliceParts(t.slice, cx);
        return sc => { tick(L, sc); const obj = o(sc), a = lo(sc), b = hi(sc), c = st(sc); setSlice(obj, a, b, c, iop(op, getSlice(obj, a, b, c), v(sc))); };
      }
      const k = cexpr(t.slice, cx);
      return sc => { tick(L, sc); const obj = o(sc), key = k(sc); setItem(obj, key, iop(op, getItem(obj, key), v(sc))); };
    }
    case 'AnnAssign': {
      const t = node.target;
      const note = cs.kind === 'class' && t.t === 'Name'
        ? sc => { let a = sc.ns.__annotations__; if (a === undefined) a = sc.ns.__annotations__ = new PyDict(); dset(a, t.id, null); } : null;
      if (node.value === null) return note ? sc => { tick(L, sc); note(sc); } : null;
      const v = cexpr(node.value, cx), st = cstore(t, cx);
      return sc => { tick(L, sc); if (note) note(sc); st(sc, v(sc)); };
    }
    case 'If': {
      const test = ctest(node.test, cx), body = cblock(node.body, cx);
      if (!node.orelse.length) return sc => { tick(L, sc); if (test(sc)) return body(sc); };
      const orelse = cblock(node.orelse, cx);
      return sc => { tick(L, sc); return test(sc) ? body(sc) : orelse(sc); };
    }
    case 'While': {
      const test = ctest(node.test, cx), body = cloop(node.body, cx), orelse = node.orelse.length ? cblock(node.orelse, cx) : null;
      return sc => {
        tick(L, sc);
        while (test(sc)) {
          const r = body(sc);
          if (r !== undefined) { if (r === BRK) return; if (r !== CNT) return r; }
          tick(L, sc);
        }
        if (orelse !== null) return orelse(sc);
      };
    }
    case 'For': {
      const it = cexpr(node.iter, cx), body = cloop(node.body, cx), orelse = node.orelse.length ? cblock(node.orelse, cx) : null;
      const t = node.target;
      let slot = -1;
      if (t.t === 'Name') { const r = resolve(cs, t.id); if (r.k === 'local') slot = r.i; }
      const st = slot < 0 ? cstore(t, cx) : null;
      return sc => {
        tick(L, sc);
        const seq = it(sc);
        if (Array.isArray(seq)) {
          for (let i = 0; i < seq.length; i++) {
            if (++R.steps > R.max) stepLimit();
            if (slot >= 0) sc.s[slot] = seq[i]; else st(sc, seq[i]);
            const r = body(sc);
            if (r !== undefined) { if (r === BRK) return; if (r !== CNT) return r; }
          }
        } else if (seq instanceof PyRange) {
          const step = seq.step;
          for (let n = seq.len, x = seq.start; n > 0; n--, x += step) {
            if (++R.steps > R.max) stepLimit();
            if (slot >= 0) sc.s[slot] = x; else st(sc, x);
            const r = body(sc);
            if (r !== undefined) { if (r === BRK) return; if (r !== CNT) return r; }
          }
        } else {
          const iterator = iter(seq);
          for (;;) {
            const x = iterator.next();
            if (x === STOP) break;
            if (++R.steps > R.max) stepLimit();
            if (slot >= 0) sc.s[slot] = x; else st(sc, x);
            const r = body(sc);
            if (r !== undefined) { if (r === BRK) return; if (r !== CNT) return r; }
          }
        }
        if (orelse !== null) return orelse(sc);
      };
    }
    case 'FunctionDef': {
      const mk = funcMaker(node.name, node.args, node.body, cx, node.line, false, node.decorators), st = mkStore(cs, node.name, env);
      return sc => { tick(L, sc); st(sc, mk(sc)); };
    }
    case 'Return': {
      if (cs.kind !== 'function') throw new PySyntax("'return' outside function", node.line);
      if (node.value === null) return sc => { sc.ret = null; return RET; };
      const v = cexpr(node.value, cx);
      return sc => { tick(L, sc); const val = v(sc); sc.ret = val; if (R.trace !== null) R.trace(L, sc, val); return RET; };
    }
    case 'Break': if (!LOOPS) throw new PySyntax("'break' outside loop", node.line); return () => BRK;
    case 'Continue': if (!LOOPS) throw new PySyntax("'continue' not properly in loop", node.line); return () => CNT;
    case 'Pass': return sc => { tick(L, sc); };
    case 'Global': case 'Nonlocal': return null;
    case 'ClassDef': {
      const ccs = new CScope('class', cs), sub = { cs: ccs, env, base: cx.base, qual: (cx.qual || '') + node.name + '.' };
      const savedLoops = LOOPS;
      LOOPS = 0;
      let body;
      try { body = cblock(node.body, sub); } finally { LOOPS = savedLoops; }
      const bases = node.bases.map(b => { if (b.t === 'Starred') throw new PySyntax('starred base classes are not supported', node.line); return cexpr(b, cx); });
      const decs = node.decorators.map(d => cexpr(d, cx)), st = mkStore(cs, node.name, env), name = node.name, outer = closureFn(cs);
      return sc => {
        tick(L, sc);
        const dv = decs.map(d => d(sc)), bs = bases.map(b => b(sc));
        const frame = { ns: Object.create(null), outer: outer(sc), fns: null };
        body(frame);
        let c = buildClass(name, bs, frame.ns, frame.fns);
        for (let i = dv.length - 1; i >= 0; i--) c = call(dv[i], [c]);
        st(sc, c);
      };
    }
    case 'Import': {
      const items = node.names.map(n => ({ mod: n.name, st: mkStore(cs, n.asname || n.name.split('.')[0], env) }));
      return sc => { tick(L, sc); for (const it of items) it.st(sc, MP.importModule(it.mod, env)); };
    }
    case 'ImportFrom': {
      const modName = node.module;
      if (node.names === null) {
        if (cs.kind !== 'module') throw new PySyntax('import * only allowed at module level', node.line);
        return sc => { tick(L, sc); const m = MP.importModule(modName, env); for (const k in m.d) if (k[0] !== '_') env.G[k] = m.d[k]; };
      }
      const items = node.names.map(n => ({ name: n.name, st: mkStore(cs, n.asname || n.name, env) }));
      return sc => {
        tick(L, sc);
        const m = MP.importModule(modName, env);
        for (const it of items) {
          let v = m.d[it.name];
          if (v === undefined && m.fallback) v = m.fallback(it.name);
          if (v === undefined) {
            const e = err('ImportError', "cannot import name '" + it.name + "' from '" + modName + "'");
            const s = suggest(it.name, Object.keys(m.d)); if (s) e.hint = "Did you mean '" + s + "'?";
            throw e;
          }
          it.st(sc, v);
        }
      };
    }
    case 'Delete': { const ds = node.targets.map(t => cdel(t, cx)); return sc => { tick(L, sc); for (const d of ds) d(sc); }; }
    case 'Assert': {
      const test = ctest(node.test, cx), msg = node.msg ? cexpr(node.msg, cx) : null;
      return sc => { tick(L, sc); if (!test(sc)) throw msg ? new PyErr(MP.mkExc(MP.EXC.AssertionError, [msg(sc)])) : err('AssertionError'); };
    }
    case 'Raise': {
      if (!node.exc) return sc => { tick(L, sc); if (R.cur === null) throw err('RuntimeError', 'No active exception to reraise'); throw R.cur; };
      const e = cexpr(node.exc, cx), cause = node.cause ? cexpr(node.cause, cx) : null;
      return sc => {
        tick(L, sc);
        const v = e(sc), pe = raiseValue(v);
        if (cause) { let c = cause(sc); if (c instanceof PyClass) c = call(c, []); pe.exc.d.__cause__ = c; }
        else if (R.cur !== null && R.cur.exc !== pe.exc) pe.exc.d.__context__ = R.cur.exc;
        throw pe;
      };
    }
    case 'Try': {
      const body = cblock(node.body, cx);
      const hs = node.handlers.map(h => ({ type: h.type ? cexpr(h.type, cx) : null, st: h.name ? mkStore(cs, h.name, env) : null, body: cblock(h.body, cx) }));
      const orelse = node.orelse.length ? cblock(node.orelse, cx) : null, fin = node.finalbody ? cblock(node.finalbody, cx) : null;
      const guarded = sc => {
        const depth = R.calls.length;
        let r;
        try { r = body(sc); }
        catch (e0) {
          const e = toPyErr(e0);
          R.calls.length = depth;
          for (let i = 0; i < hs.length; i++) {
            const h = hs[i];
            if (h.type === null || matches(e.exc, h.type(sc))) {
              const prev = R.cur;
              R.cur = e;
              if (h.st) h.st(sc, e.exc);
              try { return h.body(sc); } finally { R.cur = prev; }
            }
          }
          throw e;
        }
        return r === undefined && orelse !== null ? orelse(sc) : r;
      };
      if (fin === null) return sc => { tick(L, sc); return guarded(sc); };
      return sc => {
        tick(L, sc);
        let r;
        try { r = hs.length ? guarded(sc) : body(sc); }
        finally { const fr = fin(sc); if (fr !== undefined) return fr; }   // a return inside finally wins, as in Python
        return r;
      };
    }
    case 'With': {
      const ctx = cexpr(node.ctx, cx), st = node.target ? cstore(node.target, cx) : null, body = cblock(node.body, cx);
      return sc => {
        tick(L, sc);
        const mgr = ctx(sc), enter = special(mgr, '__enter__'), exit = special(mgr, '__exit__');
        if (enter === undefined || exit === undefined) throw err('TypeError', "'" + tn(mgr) + "' object does not support the context manager protocol");
        const val = call(enter, []);
        if (st) st(sc, val);
        const depth = R.calls.length;
        let r;
        try { r = body(sc); }
        catch (e0) {
          const e = toPyErr(e0);
          R.calls.length = depth;
          if (!truthy(call(exit, [e.exc.cls, e.exc, null]))) throw e;
          return undefined;
        }
        call(exit, [null, null, null]);
        return r;
      };
    }
  }
  throw new PySyntax("this statement is not supported in Pylon's Python", node.line);
}

// ---------------------------------------------------------------- generator bodies (statements that contain yield)
function gblock(stmts, cx) {
  const items = [];
  for (const s of stmts) {
    if (hasYield(s)) items.push({ g: true, f: gstmt(s, cx) });
    else { const f = cstmt(s, cx); if (f) items.push({ g: false, f }); }
  }
  return function* (sc) {
    for (let i = 0; i < items.length; i++) {
      const it = items[i], r = it.g ? yield* it.f(sc) : it.f(sc);
      if (r !== undefined) return r;
    }
  };
}
function gloop(stmts, cx) { LOOPS++; try { return gblock(stmts, cx); } finally { LOOPS--; } }
function gstmt(node, cx) {
  const L = node.line + cx.base, cs = cx.cs, env = cx.env;
  const yieldValue = v => v.value ? cexpr(v.value, cx) : null;
  switch (node.t) {
    case 'Expr': {
      const v = node.value;
      if (v.t === 'Yield') { const e = yieldValue(v); return function* (sc) { tick(L, sc); yield (e ? e(sc) : null); }; }
      if (v.t === 'YieldFrom') { const e = cexpr(v.value, cx); return function* (sc) { tick(L, sc); yield* delegate(e(sc)); }; }
      break;
    }
    case 'Assign': {
      const v = node.value, sts = node.targets.map(t => cstore(t, cx));
      if (v.t === 'Yield') {
        const e = yieldValue(v);
        return function* (sc) { tick(L, sc); const sent = yield (e ? e(sc) : null); const val = sent === undefined ? null : sent; for (const st of sts) st(sc, val); };
      }
      if (v.t === 'YieldFrom') {
        const e = cexpr(v.value, cx);
        return function* (sc) { tick(L, sc); const val = yield* delegate(e(sc)); for (const st of sts) st(sc, val); };
      }
      break;
    }
    case 'If': {
      const test = ctest(node.test, cx), body = gblock(node.body, cx), orelse = node.orelse.length ? gblock(node.orelse, cx) : null;
      return function* (sc) { tick(L, sc); if (test(sc)) return yield* body(sc); if (orelse !== null) return yield* orelse(sc); };
    }
    case 'While': {
      const test = ctest(node.test, cx), body = gloop(node.body, cx), orelse = node.orelse.length ? gblock(node.orelse, cx) : null;
      return function* (sc) {
        tick(L, sc);
        while (test(sc)) {
          const r = yield* body(sc);
          if (r !== undefined) { if (r === BRK) return; if (r !== CNT) return r; }
          tick(L, sc);
        }
        if (orelse !== null) return yield* orelse(sc);
      };
    }
    case 'For': {
      const it = cexpr(node.iter, cx), st = cstore(node.target, cx), body = gloop(node.body, cx), orelse = node.orelse.length ? gblock(node.orelse, cx) : null;
      return function* (sc) {
        tick(L, sc);
        const iterator = iter(it(sc));
        for (;;) {
          const x = iterator.next();
          if (x === STOP) break;
          if (++R.steps > R.max) stepLimit();
          st(sc, x);
          const r = yield* body(sc);
          if (r !== undefined) { if (r === BRK) return; if (r !== CNT) return r; }
        }
        if (orelse !== null) return yield* orelse(sc);
      };
    }
    case 'Try': {
      const body = gblock(node.body, cx);
      const hs = node.handlers.map(h => ({ type: h.type ? cexpr(h.type, cx) : null, st: h.name ? mkStore(cs, h.name, env) : null, body: gblock(h.body, cx) }));
      const orelse = node.orelse.length ? gblock(node.orelse, cx) : null, fin = node.finalbody ? gblock(node.finalbody, cx) : null;
      const guarded = function* (sc) {
        let r;
        try { r = yield* body(sc); }
        catch (e0) {
          const e = toPyErr(e0);
          if (sc.gdepth !== undefined) R.calls.length = sc.gdepth;
          for (let i = 0; i < hs.length; i++) {
            const h = hs[i];
            if (h.type === null || matches(e.exc, h.type(sc))) {
              const prev = R.cur;
              R.cur = e;
              if (h.st) h.st(sc, e.exc);
              try { return yield* h.body(sc); } finally { R.cur = prev; }
            }
          }
          throw e;
        }
        return r === undefined && orelse !== null ? yield* orelse(sc) : r;
      };
      if (fin === null) return function* (sc) { tick(L, sc); return yield* guarded(sc); };
      return function* (sc) {
        tick(L, sc);
        let r;
        try { r = yield* guarded(sc); }
        finally { const fr = yield* fin(sc); if (fr !== undefined) return fr; }
        return r;
      };
    }
    case 'With': {
      const ctx = cexpr(node.ctx, cx), st = node.target ? cstore(node.target, cx) : null, body = gblock(node.body, cx);
      return function* (sc) {
        tick(L, sc);
        const mgr = ctx(sc), enter = special(mgr, '__enter__'), exit = special(mgr, '__exit__');
        if (enter === undefined || exit === undefined) throw err('TypeError', "'" + tn(mgr) + "' object does not support the context manager protocol");
        const val = call(enter, []);
        if (st) st(sc, val);
        let r;
        try { r = yield* body(sc); }
        catch (e0) {
          const e = toPyErr(e0);
          if (sc.gdepth !== undefined) R.calls.length = sc.gdepth;
          if (!truthy(call(exit, [e.exc.cls, e.exc, null]))) throw e;
          return undefined;
        }
        call(exit, [null, null, null]);
        return r;
      };
    }
  }
  throw new PySyntax("this use of 'yield' is not supported in Pylon's Python. Put the yield on its own line, or on the right side of '='", node.line);
}

// ---------------------------------------------------------------- expressions
const same = (a, b) => a === b;
const CMPF = {
  '==': (a, b) => (a === b && typeof a !== 'object') || pyEq(a, b),
  '!=': (a, b) => !((a === b && typeof a !== 'object') || pyEq(a, b)),
  '<': (a, b) => typeof a === 'number' && typeof b === 'number' ? a < b : rich(a, b, 0),
  '<=': (a, b) => typeof a === 'number' && typeof b === 'number' ? a <= b : rich(a, b, 1),
  '>': (a, b) => typeof a === 'number' && typeof b === 'number' ? a > b : rich(a, b, 2),
  '>=': (a, b) => typeof a === 'number' && typeof b === 'number' ? a >= b : rich(a, b, 3),
  'in': (a, b) => contains(b, a),
  'not in': (a, b) => !contains(b, a),
  'is': same,
  'is not': (a, b) => a !== b,
};
function ccompare(n, cx) {
  if (n.ops.length === 1) {
    const l = cexpr(n.left, cx), r = cexpr(n.comparators[0], cx);
    switch (n.ops[0]) {
      case '==': return sc => { const a = l(sc), b = r(sc); return (a === b && typeof a !== 'object') || pyEq(a, b); };
      case '!=': return sc => { const a = l(sc), b = r(sc); return !((a === b && typeof a !== 'object') || pyEq(a, b)); };
      case '<': return sc => { const a = l(sc), b = r(sc); return typeof a === 'number' && typeof b === 'number' ? a < b : rich(a, b, 0); };
      case '<=': return sc => { const a = l(sc), b = r(sc); return typeof a === 'number' && typeof b === 'number' ? a <= b : rich(a, b, 1); };
      case '>': return sc => { const a = l(sc), b = r(sc); return typeof a === 'number' && typeof b === 'number' ? a > b : rich(a, b, 2); };
      case '>=': return sc => { const a = l(sc), b = r(sc); return typeof a === 'number' && typeof b === 'number' ? a >= b : rich(a, b, 3); };
      case 'in': return sc => { const a = l(sc); return contains(r(sc), a); };
      case 'not in': return sc => { const a = l(sc); return !contains(r(sc), a); };
      case 'is': return sc => l(sc) === r(sc);
      default: return sc => l(sc) !== r(sc);
    }
  }
  const first = cexpr(n.left, cx), rest = n.comparators.map(c => cexpr(c, cx)), fs = n.ops.map(op => CMPF[op]);
  return sc => {
    let a = first(sc);
    for (let i = 0; i < fs.length; i++) { const b = rest[i](sc); if (!fs[i](a, b)) return false; a = b; }
    return true;
  };
}
// A condition compiled to return a JS boolean directly.
function ctest(n, cx) {
  if (n.t === 'Compare') return ccompare(n, cx);
  if (n.t === 'UnaryOp' && n.op === 'not') { const t = ctest(n.operand, cx); return sc => !t(sc); }
  if (n.t === 'BoolOp') {
    const ts = n.values.map(v => ctest(v, cx)), len = ts.length;
    if (n.op === 'and') return sc => { for (let i = 0; i < len; i++) if (!ts[i](sc)) return false; return true; };
    return sc => { for (let i = 0; i < len; i++) if (ts[i](sc)) return true; return false; };
  }
  const e = cexpr(n, cx);
  return sc => truthy(e(sc));
}
function cargs(args, cx) {
  if (args.some(a => a.t === 'Starred')) {
    const parts = args.map(a => a.t === 'Starred' ? { star: true, f: cexpr(a.value, cx) } : { star: false, f: cexpr(a, cx) });
    return sc => {
      const out = [];
      for (const p of parts) {
        if (p.star) { const items = arrOf(p.f(sc)); for (let i = 0; i < items.length; i++) out.push(items[i]); }
        else out.push(p.f(sc));
      }
      return out;
    };
  }
  const fs = args.map(a => cexpr(a, cx));
  switch (fs.length) {
    case 0: return () => [];
    case 1: { const a = fs[0]; return sc => [a(sc)]; }
    case 2: { const a = fs[0], b = fs[1]; return sc => [a(sc), b(sc)]; }
    case 3: { const a = fs[0], b = fs[1], c = fs[2]; return sc => [a(sc), b(sc), c(sc)]; }
    default: return sc => { const out = []; for (let i = 0; i < fs.length; i++) out.push(fs[i](sc)); return out; };
  }
}
function ckw(keywords, cx, line) {
  if (!keywords.length) return null;
  const names = new Set();
  for (const k of keywords) { if (k.arg !== null) { if (names.has(k.arg)) throw new PySyntax('keyword argument repeated: ' + k.arg, line); names.add(k.arg); } }
  const items = keywords.map(k => ({ name: k.arg, f: cexpr(k.value, cx) }));
  return sc => {
    const kw = Object.create(null);
    for (const it of items) {
      if (it.name !== null) { kw[it.name] = it.f(sc); continue; }
      const d = it.f(sc);
      if (!(d instanceof PyDict)) throw err('TypeError', 'argument after ** must be a mapping, not ' + tn(d));
      for (const e of d.m.values()) { if (typeof e[0] !== 'string') throw err('TypeError', 'keywords must be strings'); kw[e[0]] = e[1]; }
    }
    return kw;
  };
}
function ccall(n, cx) {
  const f = n.func, args = cargs(n.args, cx), kw = ckw(n.keywords, cx, n.line);
  if (f.t === 'Name' && f.id === 'super' && !n.args.length && !n.keywords.length && resolve(cx.cs, 'super').k === 'global') {
    const G = cx.env.G;
    return sc => {
      if (G.super !== undefined) return call(G.super, []);
      let s = sc;
      while (s && !s.fn) s = s.parent;
      if (!s || !s.fn || !s.fn.owner) throw err('RuntimeError', 'super(): no arguments. It only works inside a method of a class');
      return new PySuper(s.fn.owner, s.s[0]);
    };
  }
  if (f.t === 'Attribute') {
    const o = cexpr(f.value, cx), name = f.attr;
    if (kw === null) return sc => { const obj = o(sc); return callMethod(obj, name, args(sc), null); };
    return sc => { const obj = o(sc), a = args(sc); return callMethod(obj, name, a, kw(sc)); };
  }
  const fn = cexpr(f, cx);
  if (kw === null) return sc => { const fv = fn(sc); return call(fv, args(sc), null); };
  return sc => { const fv = fn(sc), a = args(sc); return call(fv, a, kw(sc)); };
}
function cseq(elts, cx) {
  if (elts.some(e => e.t === 'Starred')) {
    const parts = elts.map(e => e.t === 'Starred' ? { star: true, f: cexpr(e.value, cx) } : { star: false, f: cexpr(e, cx) });
    return sc => {
      const out = [];
      for (const p of parts) { if (p.star) { const items = toArr(p.f(sc)); for (let i = 0; i < items.length; i++) out.push(items[i]); } else out.push(p.f(sc)); }
      return out;
    };
  }
  const fs = elts.map(e => cexpr(e, cx)), len = fs.length;
  if (len === 0) return () => [];
  if (len === 1) { const a = fs[0]; return sc => [a(sc)]; }
  if (len === 2) { const a = fs[0], b = fs[1]; return sc => [a(sc), b(sc)]; }
  return sc => { const out = []; for (let i = 0; i < len; i++) out.push(fs[i](sc)); return out; };
}
function runComp(gens, level, s2, iterable, emit) {
  const g = gens[level], last = level === gens.length - 1, ifs = g.ifs, it = iter(iterable);
  outer: for (;;) {
    const v = it.next();
    if (v === STOP) return;
    if (++R.steps > R.max) stepLimit();
    g.st(s2, v);
    for (let i = 0; i < ifs.length; i++) if (!ifs[i](s2)) continue outer;
    if (last) emit(s2); else runComp(gens, level + 1, s2, gens[level + 1].it(s2), emit);
  }
}
function* genComp(gens, level, s2, iterable, elt) {
  const g = gens[level], last = level === gens.length - 1, ifs = g.ifs, it = iter(iterable);
  outer: for (;;) {
    const v = it.next();
    if (v === STOP) return;
    if (++R.steps > R.max) stepLimit();
    g.st(s2, v);
    for (let i = 0; i < ifs.length; i++) if (!ifs[i](s2)) continue outer;
    if (last) yield elt(s2); else yield* genComp(gens, level + 1, s2, gens[level + 1].it(s2), elt);
  }
}
function ccomp(n, cx) {
  const cs = new CScope('comp', cx.cs), sub = { cs, env: cx.env, base: cx.base, qual: cx.qual };
  for (const g of n.generators) bindTarget(g.target, cs);
  const first = cexpr(n.generators[0].iter, cx);       // the first iterable is evaluated in the enclosing scope
  const gens = n.generators.map((g, i) => ({ st: cstore(g.target, sub), it: i ? cexpr(g.iter, sub) : null, ifs: g.ifs.map(c => ctest(c, sub)) }));
  const parent = closureFn(cx.cs), mk = sc => new Scope(cs.n, parent(sc), null);
  if (n.t === 'DictComp') {
    const key = cexpr(n.key, sub), value = cexpr(n.value, sub);
    return sc => { const out = new PyDict(); runComp(gens, 0, mk(sc), first(sc), s2 => { const k = key(s2); dset(out, k, value(s2)); }); return out; };
  }
  const elt = cexpr(n.elt, sub);
  if (n.t === 'SetComp') return sc => { const out = new PySet(false); runComp(gens, 0, mk(sc), first(sc), s2 => { sadd(out, elt(s2)); }); return out; };
  if (n.t === 'GeneratorExp') {
    return sc => {
      const jsg = genComp(gens, 0, mk(sc), first(sc), elt);
      return new PyIter(() => { const r = jsg.next(); return r.done ? STOP : r.value; }, 'generator');
    };
  }
  if (gens.length === 1) {
    const st = gens[0].st, ifs = gens[0].ifs, nif = ifs.length;
    return sc => {
      const s2 = mk(sc), src = first(sc), out = [];
      if (Array.isArray(src)) {
        outer: for (let i = 0; i < src.length; i++) {
          if (++R.steps > R.max) stepLimit();
          st(s2, src[i]);
          for (let j = 0; j < nif; j++) if (!ifs[j](s2)) continue outer;
          out.push(elt(s2));
        }
        return out;
      }
      runComp(gens, 0, s2, src, x => { out.push(elt(x)); });
      return out;
    };
  }
  return sc => { const out = []; runComp(gens, 0, mk(sc), first(sc), s2 => { out.push(elt(s2)); }); return out; };
}
function cfield(p, cx) {
  const e = cexpr(p.expr, cx), conv = p.conv;
  let spec = null;
  if (p.spec) {
    const sp = p.spec.map(q => typeof q === 'string' ? q : cfield(q, cx));
    if (sp.length === 0) spec = '';
    else if (sp.length === 1 && typeof sp[0] === 'string') spec = sp[0];
    else spec = sc => { let s = ''; for (const q of sp) s += typeof q === 'string' ? q : q(sc); return s; };
  }
  return sc => {
    let v = e(sc);
    if (conv === 'r' || conv === 'a') v = repr(v); else if (conv === 's') v = str(v);
    if (spec === null) return typeof v === 'string' ? v : str(v);
    return fmt(v, typeof spec === 'string' ? spec : spec(sc));
  };
}
function cexpr(n, cx) {
  switch (n.t) {
    case 'Num': case 'Str': case 'Const': { const v = n.v; return () => v; }
    case 'Name': return mkLoad(cx.cs, n.id, cx.env);
    case 'BinOp': { const l = cexpr(n.left, cx), r = cexpr(n.right, cx), f = BIN[n.op]; return sc => f(l(sc), r(sc)); }
    case 'UnaryOp': {
      if (n.op === 'not') { const t = ctest(n.operand, cx); return sc => !t(sc); }
      if (n.op === '-' && n.operand.t === 'Num') { const v = neg(n.operand.v); return () => v; }
      const o = cexpr(n.operand, cx), f = n.op === '-' ? neg : n.op === '+' ? pos : invert;
      return sc => f(o(sc));
    }
    case 'BoolOp': {
      const vs = n.values.map(v => cexpr(v, cx)), last = vs.length - 1;
      if (n.op === 'and') return sc => { for (let i = 0; i < last; i++) { const v = vs[i](sc); if (!truthy(v)) return v; } return vs[last](sc); };
      return sc => { for (let i = 0; i < last; i++) { const v = vs[i](sc); if (truthy(v)) return v; } return vs[last](sc); };
    }
    case 'Compare': return ccompare(n, cx);
    case 'IfExp': { const t = ctest(n.test, cx), a = cexpr(n.body, cx), b = cexpr(n.orelse, cx); return sc => t(sc) ? a(sc) : b(sc); }
    case 'Call': return ccall(n, cx);
    case 'Attribute': { const o = cexpr(n.value, cx), a = n.attr; return sc => getAttr(o(sc), a); }
    case 'Subscript': {
      const o = cexpr(n.value, cx);
      if (n.slice.t === 'Slice') { const [lo, hi, st] = sliceParts(n.slice, cx); return sc => getSlice(o(sc), lo(sc), hi(sc), st(sc)); }
      const k = cexpr(n.slice, cx);
      return sc => getItem(o(sc), k(sc));
    }
    case 'Slice': { const [lo, hi, st] = sliceParts(n, cx); return sc => new PySlice(lo(sc), hi(sc), st(sc)); }
    case 'List': return cseq(n.elts, cx);
    case 'Tuple': { const f = cseq(n.elts, cx); return sc => new PyTuple(f(sc)); }
    case 'Set': { const f = cseq(n.elts, cx); return sc => { const s = new PySet(false), a = f(sc); for (let i = 0; i < a.length; i++) sadd(s, a[i]); return s; }; }
    case 'Dict': {
      const ks = n.keys.map(k => k === null ? null : cexpr(k, cx)), vs = n.values.map(v => cexpr(v, cx)), len = ks.length;
      return sc => {
        const d = new PyDict();
        for (let i = 0; i < len; i++) {
          if (ks[i] === null) {
            const m = vs[i](sc);
            if (!(m instanceof PyDict)) throw err('TypeError', "'" + tn(m) + "' object is not a mapping");
            for (const e of m.m.values()) dset(d, e[0], e[1]);
          } else { const k = ks[i](sc); dset(d, k, vs[i](sc)); }
        }
        return d;
      };
    }
    case 'ListComp': case 'SetComp': case 'DictComp': case 'GeneratorExp': return ccomp(n, cx);
    case 'Lambda': return funcMaker('<lambda>', n.args, n.body, cx, n.line, true, null);
    case 'FStr': {
      const parts = n.parts.map(p => typeof p === 'string' ? p : cfield(p, cx)), len = parts.length;
      return sc => { let s = ''; for (let i = 0; i < len; i++) { const p = parts[i]; s += typeof p === 'string' ? p : p(sc); } return s; };
    }
    case 'NamedExpr': { const v = cexpr(n.value, cx), st = mkStore(cx.cs, n.target.id, cx.env); return sc => { const val = v(sc); st(sc, val); return val; }; }
    case 'Starred': throw new PySyntax("can't use starred expression here", n.line);
    case 'Yield': case 'YieldFrom': {
      let c = cx.cs;
      while (c && c.kind === 'comp') c = c.parent;
      throw new PySyntax(c && c.kind === 'function' ? "this use of 'yield' is not supported in Pylon's Python. Put the yield on its own line, or on the right side of '='" : "'yield' outside function", n.line);
    }
  }
  throw new PySyntax("this expression is not supported in Pylon's Python", n.line);
}

// ---------------------------------------------------------------- entry points
// env = { G: globals, B: builtins }. `base` is added to every line number so callers can tell user code from helper code.
MP.compileModule = function (src, env, base) {
  const ast = MP.parse(src, 0), cx = { cs: new CScope('module', null), env, base: base || 0 };
  LOOPS = 0;
  const body = cblock(ast.body, cx);
  return () => body(null);
};
MP.compileExpr = function (src, env, base) {
  const ast = MP.parseExpr(src, 0), cx = { cs: new CScope('module', null), env, base: base || 0 };
  LOOPS = 0;
  const e = cexpr(ast, cx);
  return () => e(null);
};
MP.toPyErr = toPyErr;
MP.special = special;
})(typeof window !== 'undefined' ? window : globalThis);
