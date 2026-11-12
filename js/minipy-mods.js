/* MiniPy part 5 of 5: the standard-library modules MiniPy ships, and the Session API the game talks to. */
(function (root) {
'use strict';
const MP = root.MiniPy;
const { R, PyFloat, PyTuple, PyRange, PyDict, PyDefaultDict, PyCounter, PyOrderedDict, PySet, PyDeque, PyFunc, PyBuiltin, PyBound, PyClass, PyObj,
  PyModule, PyGen, PyIter, PyErr, PyAbort, PySyntax, PyTyping, CmpKey, STOP, NotImpl, MAXS, T, EXC, mkExc, err, stepLimit, tn, isInst, findAttr, bind,
  isNum, isInt, big, norm, fl, F, idx, arith, add, mul, truthy, pyEq, rich, cmp, dget, dset, ddel, sadd, hashOf, repr, str, iter, toArr, arrOf,
  getItem, getAttr, call, kwget, argc, sortArr, mkIter, meth } = MP;

const MODS = MP.modules = Object.create(null);
const fn = (name, f) => new PyBuiltin(name, f);
const umeth = (name, f) => { const b = meth(name, f); b.user = true; return b; };
const NOT_INCLUDED = ['json', 'csv', 'os', 'datetime', 'numpy', 'pandas', 'requests', 'threading', 'asyncio', 'pathlib', 'subprocess', 'socket', 'decimal', 'fractions', 'statistics', 'enum', 'unittest', 'pytest'];
MP.importModule = function (name, env) {
  const cache = env.mods || (env.mods = Object.create(null));
  if (cache[name]) return cache[name];
  const build = MODS[name];
  if (!build) {
    const e = err('ModuleNotFoundError', "No module named '" + name + "'");
    e.hint = (NOT_INCLUDED.indexOf(name.split('.')[0]) >= 0 ? "'" + name + "' is not included in Pylon's Python. " : '') + 'Modules you can import here: ' + Object.keys(MODS).filter(k => k[0] !== '_').sort().join(', ') + '.';
    throw e;
  }
  const d = Object.create(null), m = new PyModule(name, d);
  build(d, m, env);
  return cache[name] = m;
};
const lt = (a, b) => typeof a === 'number' && typeof b === 'number' ? a < b : rich(a, b, 0);
// wrap a JS generator as a Python iterator; every item costs one step so runaway iteration still hits the limit
function lazy(g, tname) { return mkIter(() => { if (++R.steps > R.max) stepLimit(); const r = g.next(); return r.done ? STOP : r.value; }, tname); }
function* each(v) { const it = iter(v); for (;;) { const x = it.next(); if (x === STOP) return; yield x; } }
const isCallable = f => f instanceof PyFunc || f instanceof PyBuiltin || f instanceof PyBound || f instanceof PyClass || (f instanceof PyObj && findAttr(f.cls, '__call__') !== undefined);
const num = v => { if (!isNum(v)) throw err('TypeError', 'must be real number, not ' + tn(v)); return fl(v); };
const toInt = (v, what) => { if (!isInt(v)) throw err('TypeError', "'" + tn(v) + "' object cannot be interpreted as an integer"); return typeof v === 'boolean' ? +v : v; };
const fromFloat = r => Math.abs(r) <= MAXS ? (r || 0) : BigInt(r);

// ---------------------------------------------------------------- math
MODS.math = d => {
  d.pi = F(Math.PI); d.e = F(Math.E); d.tau = F(2 * Math.PI); d.inf = F(Infinity); d.nan = F(NaN);
  const f1 = (name, f, check) => { d[name] = fn(name, a => { argc(name, a, 1, 1); const x = num(a[0]); if (check && !check(x)) throw err('ValueError', 'math domain error'); return F(f(x)); }); };
  f1('sqrt', Math.sqrt, x => x >= 0 || x !== x); f1('sin', Math.sin); f1('cos', Math.cos); f1('tan', Math.tan);
  f1('asin', Math.asin, x => x >= -1 && x <= 1); f1('acos', Math.acos, x => x >= -1 && x <= 1); f1('atan', Math.atan);
  f1('sinh', Math.sinh); f1('cosh', Math.cosh); f1('tanh', Math.tanh); f1('fabs', Math.abs);
  f1('log2', Math.log2, x => x > 0); f1('log10', Math.log10, x => x > 0); f1('log1p', Math.log1p, x => x > -1); f1('expm1', Math.expm1);
  f1('degrees', x => x * 180 / Math.PI); f1('radians', x => x * Math.PI / 180); f1('cbrt', Math.cbrt);
  d.exp = fn('exp', a => { const r = Math.exp(num(a[0])); if (r === Infinity) throw err('OverflowError', 'math range error'); return F(r); });
  d.log = fn('log', a => {
    argc('log', a, 1, 2);
    const x = num(a[0]);
    if (!(x > 0)) throw err('ValueError', 'math domain error');
    return F(a.length > 1 ? Math.log(x) / Math.log(num(a[1])) : Math.log(x));
  });
  d.pow = fn('pow', a => { const x = num(a[0]), y = num(a[1]); if (x === 0 && y < 0) throw err('ValueError', 'math domain error'); if (x < 0 && !Number.isInteger(y)) throw err('ValueError', 'math domain error'); return F(Math.pow(x, y)); });
  d.atan2 = fn('atan2', a => F(Math.atan2(num(a[0]), num(a[1]))));
  d.hypot = fn('hypot', a => F(Math.hypot.apply(null, a.map(num))));
  d.dist = fn('dist', a => { const p = arrOf(a[0]).map(num), q = arrOf(a[1]).map(num); return F(Math.hypot.apply(null, p.map((v, i) => v - q[i]))); });
  d.copysign = fn('copysign', a => { const x = Math.abs(num(a[0])), y = num(a[1]); return F(y < 0 || (y === 0 && 1 / y < 0) ? -x : x); });
  d.fmod = fn('fmod', a => F(num(a[0]) % num(a[1])));
  d.isinf = fn('isinf', a => Math.abs(num(a[0])) === Infinity);
  d.isnan = fn('isnan', a => { const x = num(a[0]); return x !== x; });
  d.isfinite = fn('isfinite', a => isFinite(num(a[0])));
  d.isclose = fn('isclose', (a, kw) => {
    const x = num(a[0]), y = num(a[1]), rel = num(kwget(kw, 'rel_tol', F(1e-9))), abs = num(kwget(kw, 'abs_tol', F(0)));
    return x === y || Math.abs(x - y) <= Math.max(rel * Math.max(Math.abs(x), Math.abs(y)), abs);
  });
  const rounder = (name, f) => { d[name] = fn(name, a => {
    const v = a[0];
    if (isInt(v)) return typeof v === 'boolean' ? +v : v;
    const x = num(v);
    if (x !== x) throw err('ValueError', 'cannot convert float NaN to integer');
    if (!isFinite(x)) throw err('OverflowError', 'cannot convert float infinity to integer');
    return fromFloat(f(x));
  }); };
  rounder('floor', Math.floor); rounder('ceil', Math.ceil); rounder('trunc', Math.trunc);
  const gcd2 = (x, y) => { x = x < 0n ? -x : x; y = y < 0n ? -y : y; while (y) { const t = x % y; x = y; y = t; } return x; };
  d.gcd = fn('gcd', a => { let g = 0n; for (const v of a) g = gcd2(g, big(toInt(v))); return norm(g); });
  d.lcm = fn('lcm', a => { let l = 1n; for (const v of a) { const b = big(toInt(v)); if (b === 0n) return 0; l = l / gcd2(l, b) * (b < 0n ? -b : b); } return norm(l); });
  d.factorial = fn('factorial', a => {
    const n = toInt(a[0]);
    if (n < 0) throw err('ValueError', 'factorial() not defined for negative values');
    if (n > 3000) throw err('OverflowError', 'that factorial is too large for Pylon to compute');
    let r = 1n;
    for (let i = 2n; i <= BigInt(n); i++) r *= i;
    return norm(r);
  });
  d.isqrt = fn('isqrt', a => {
    const n = big(toInt(a[0]));
    if (n < 0n) throw err('ValueError', 'isqrt() argument must be nonnegative');
    if (n < 2n) return Number(n);
    let x = BigInt(Math.floor(Math.sqrt(Number(n))));
    while (x * x > n) x--;
    while ((x + 1n) * (x + 1n) <= n) x++;
    return norm(x);
  });
  const comb = (n, k) => { if (k < 0n || k > n) return 0n; if (k > n - k) k = n - k; let r = 1n; for (let i = 1n; i <= k; i++) r = r * (n - k + i) / i; return r; };
  d.comb = fn('comb', a => { const n = big(toInt(a[0])), k = big(toInt(a[1])); if (n < 0n || k < 0n) throw err('ValueError', 'n and k must be non-negative integers'); return norm(comb(n, k)); });
  d.perm = fn('perm', a => {
    const n = big(toInt(a[0])), k = a.length > 1 && a[1] !== null ? big(toInt(a[1])) : n;
    if (n < 0n || k < 0n) throw err('ValueError', 'n and k must be non-negative integers');
    if (k > n) return 0;
    let r = 1n;
    for (let i = 0n; i < k; i++) r *= n - i;
    return norm(r);
  });
  d.prod = fn('prod', (a, kw) => { let r = kwget(kw, 'start', 1); for (const x of arrOf(a[0])) r = mul(r, x); return r; });
  d.fsum = fn('fsum', a => { let s = 0, c = 0; for (const x of arrOf(a[0])) { const y = num(x) - c, t = s + y; c = (t - s) - y; s = t; } return F(s); });
};

// ---------------------------------------------------------------- collections, heapq, bisect
MODS.collections = d => {
  d.deque = T.deque; d.Counter = T.Counter; d.defaultdict = T.defaultdict; d.OrderedDict = T.OrderedDict;
  d.namedtuple = fn('namedtuple', () => { throw err('RuntimeError', "namedtuple is not available in Pylon's Python. Use a small class or a @dataclass"); });
};
function siftdown(h, start, pos) {
  const item = h[pos];
  while (pos > start) { const parent = (pos - 1) >> 1, p = h[parent]; if (lt(item, p)) { h[pos] = p; pos = parent; } else break; }
  h[pos] = item;
}
function siftup(h, pos) {
  const end = h.length, start = pos, item = h[pos];
  let child = 2 * pos + 1;
  while (child < end) {
    const right = child + 1;
    if (right < end && !lt(h[child], h[right])) child = right;
    h[pos] = h[child]; pos = child; child = 2 * pos + 1;
  }
  h[pos] = item;
  siftdown(h, start, pos);
}
const heapOf = v => { if (!Array.isArray(v)) throw err('TypeError', 'heap argument must be a list'); R.steps += Math.ceil(Math.log2(v.length + 2)); return v; };
MODS.heapq = d => {
  d.heappush = fn('heappush', a => { argc('heappush', a, 2, 2); const h = heapOf(a[0]); h.push(a[1]); siftdown(h, 0, h.length - 1); return null; });
  d.heappop = fn('heappop', a => {
    const h = heapOf(a[0]);
    if (!h.length) throw err('IndexError', 'index out of range');
    const last = h.pop();
    if (!h.length) return last;
    const top = h[0]; h[0] = last; siftup(h, 0);
    return top;
  });
  d.heapify = fn('heapify', a => { const h = heapOf(a[0]); R.steps += h.length; for (let i = (h.length >> 1) - 1; i >= 0; i--) siftup(h, i); return null; });
  d.heappushpop = fn('heappushpop', a => { const h = heapOf(a[0]); let item = a[1]; if (h.length && lt(h[0], item)) { const t = h[0]; h[0] = item; item = t; siftup(h, 0); } return item; });
  d.heapreplace = fn('heapreplace', a => { const h = heapOf(a[0]); if (!h.length) throw err('IndexError', 'index out of range'); const top = h[0]; h[0] = a[1]; siftup(h, 0); return top; });
  d.nlargest = fn('nlargest', (a, kw) => sortArr(toArr(a[1]), kwget(kw, 'key', null), true).slice(0, Math.max(0, idx(a[0]))));
  d.nsmallest = fn('nsmallest', (a, kw) => sortArr(toArr(a[1]), kwget(kw, 'key', null), false).slice(0, Math.max(0, idx(a[0]))));
  d.merge = fn('merge', (a, kw) => { let all = []; for (const x of a) all = all.concat(toArr(x)); sortArr(all, kwget(kw, 'key', null), truthy(kwget(kw, 'reverse', false))); let i = 0; return mkIter(() => i < all.length ? all[i++] : STOP, 'generator'); });
};
MODS.bisect = d => {
  const search = (a, kw, right) => {
    const arr = arrOf(a[0]), x = a[1], key = kwget(kw, 'key', null);
    let lo = a.length > 2 ? idx(a[2]) : idx(kwget(kw, 'lo', 0)), hi = a.length > 3 && a[3] !== null ? idx(a[3]) : (kw && kw.hi !== undefined && kw.hi !== null ? idx(kw.hi) : arr.length);
    if (lo < 0) throw err('ValueError', 'lo must be non-negative');
    R.steps += Math.ceil(Math.log2(arr.length + 2));
    while (lo < hi) {
      const mid = (lo + hi) >> 1, v = key ? call(key, [arr[mid]]) : arr[mid];
      if (right ? lt(x, v) : !lt(v, x)) hi = mid; else lo = mid + 1;
    }
    return lo;
  };
  const ins = (a, kw, right) => {
    if (!Array.isArray(a[0])) throw err('TypeError', 'insort needs a list');
    const key = kwget(kw, 'key', null), i = search([a[0], key ? call(key, [a[1]]) : a[1]].concat(a.slice(2)), kw, right);
    R.steps += (a[0].length - i) >> 2;
    a[0].splice(i, 0, a[1]);
    return null;
  };
  d.bisect_left = fn('bisect_left', (a, kw) => search(a, kw, false));
  d.bisect_right = d.bisect = fn('bisect_right', (a, kw) => search(a, kw, true));
  d.insort_left = fn('insort_left', (a, kw) => ins(a, kw, false));
  d.insort_right = d.insort = fn('insort_right', (a, kw) => ins(a, kw, true));
};

// ---------------------------------------------------------------- itertools, functools, operator
MODS.itertools = d => {
  d.count = fn('count', (a, kw) => { let x = a.length ? a[0] : kwget(kw, 'start', 0); const step = a.length > 1 ? a[1] : kwget(kw, 'step', 1); return mkIter(() => { const r = x; x = add(x, step); return r; }, 'count'); });
  d.cycle = fn('cycle', a => lazy((function* () { const saved = []; for (const x of each(a[0])) { saved.push(x); yield x; } if (!saved.length) return; for (;;) for (let i = 0; i < saved.length; i++) yield saved[i]; })(), 'cycle'));
  d.repeat = fn('repeat', (a, kw) => { const t = a.length > 1 ? a[1] : kwget(kw, 'times', null); let n = t === null ? Infinity : idx(t); return mkIter(() => n-- > 0 ? a[0] : STOP, 'repeat'); });
  d.chain = fn('chain', a => lazy((function* () { for (const s of a) yield* each(s); })(), 'chain'));
  d.chain.attrs = Object.create(null);
  d.chain.attrs.from_iterable = fn('from_iterable', a => lazy((function* () { for (const s of each(a[0])) yield* each(s); })(), 'chain'));
  d.islice = fn('islice', a => {
    argc('islice', a, 2, 4);
    const opt = (v, dflt) => v === null || v === undefined ? dflt : idx(v);
    let start = 0, stop, step = 1;
    if (a.length === 2) stop = opt(a[1], Infinity); else { start = opt(a[1], 0); stop = opt(a[2], Infinity); step = opt(a[3], 1); }
    if (start < 0 || stop < 0 || step < 1) throw err('ValueError', 'Indices for islice() must be None or an integer: 0 <= x <= sys.maxsize.');
    return lazy((function* () {
      if (start >= stop) return;
      const it = iter(a[0]);
      let i = 0, next = start;
      for (;;) {
        const x = it.next();
        if (x === STOP) return;
        if (i === next) { yield x; next += step; if (next >= stop) return; }
        i++;
      }
    })(), 'islice');
  });
  d.accumulate = fn('accumulate', (a, kw) => lazy((function* () {
    const f = a.length > 1 ? a[1] : kwget(kw, 'func', null), init = kwget(kw, 'initial', null);
    let total = init, started = init !== null;
    if (started) yield total;
    for (const x of each(a[0])) { total = started ? (f ? call(f, [total, x]) : add(total, x)) : x; started = true; yield total; }
  })(), 'accumulate'));
  d.permutations = fn('permutations', a => lazy((function* () {
    const pool = toArr(a[0]), n = pool.length, r = a.length > 1 && a[1] !== null ? idx(a[1]) : n;
    if (r > n || r < 0) return;
    const ix = [], cycles = [];
    for (let i = 0; i < n; i++) ix.push(i);
    for (let i = n; i > n - r; i--) cycles.push(i);
    yield new PyTuple(ix.slice(0, r).map(i => pool[i]));
    if (!n) return;
    for (;;) {
      let i = r - 1;
      for (; i >= 0; i--) {
        cycles[i]--;
        if (cycles[i] === 0) { const t = ix.splice(i, 1)[0]; ix.push(t); cycles[i] = n - i; }
        else { const j = n - cycles[i], t = ix[i]; ix[i] = ix[j]; ix[j] = t; yield new PyTuple(ix.slice(0, r).map(k => pool[k])); break; }
      }
      if (i < 0) return;
    }
  })(), 'permutations'));
  const combos = (a, repl) => lazy((function* () {
    const pool = toArr(a[0]), n = pool.length, r = idx(a[1]);
    if (r < 0) throw err('ValueError', 'r must be non-negative');
    if ((!repl && r > n) || (repl && !n && r)) return;
    const ix = [];
    for (let i = 0; i < r; i++) ix.push(repl ? 0 : i);
    yield new PyTuple(ix.map(i => pool[i]));
    for (;;) {
      let i = r - 1;
      for (; i >= 0; i--) if (ix[i] !== (repl ? n - 1 : i + n - r)) break;
      if (i < 0) return;
      ix[i]++;
      for (let j = i + 1; j < r; j++) ix[j] = repl ? ix[i] : ix[j - 1] + 1;
      yield new PyTuple(ix.map(k => pool[k]));
    }
  })(), repl ? 'combinations_with_replacement' : 'combinations');
  d.combinations = fn('combinations', a => combos(a, false));
  d.combinations_with_replacement = fn('combinations_with_replacement', a => combos(a, true));
  d.product = fn('product', (a, kw) => lazy((function* () {
    const rep = idx(kwget(kw, 'repeat', 1));
    let pools = a.map(toArr), all = [];
    for (let i = 0; i < rep; i++) all = all.concat(pools);
    pools = all;
    if (pools.some(p => !p.length)) return;
    const ix = pools.map(() => 0);
    for (;;) {
      yield new PyTuple(ix.map((k, i) => pools[i][k]));
      let i = pools.length - 1;
      for (; i >= 0; i--) { if (++ix[i] < pools[i].length) break; ix[i] = 0; }
      if (i < 0) return;
    }
  })(), 'product'));
  d.zip_longest = fn('zip_longest', (a, kw) => lazy((function* () {
    const fill = kwget(kw, 'fillvalue', null), its = a.map(iter), done = its.map(() => false);
    if (!its.length) return;
    for (;;) {
      const row = [];
      let live = 0;
      for (let i = 0; i < its.length; i++) {
        if (done[i]) { row.push(fill); continue; }
        const x = its[i].next();
        if (x === STOP) { done[i] = true; row.push(fill); } else { live++; row.push(x); }
      }
      if (!live) return;
      yield new PyTuple(row);
    }
  })(), 'zip_longest'));
  d.pairwise = fn('pairwise', a => lazy((function* () { let prev, has = false; for (const x of each(a[0])) { if (has) yield new PyTuple([prev, x]); prev = x; has = true; } })(), 'pairwise'));
  d.starmap = fn('starmap', a => lazy((function* () { for (const x of each(a[1])) yield call(a[0], arrOf(x)); })(), 'starmap'));
  d.takewhile = fn('takewhile', a => lazy((function* () { for (const x of each(a[1])) { if (!truthy(call(a[0], [x]))) return; yield x; } })(), 'takewhile'));
  d.dropwhile = fn('dropwhile', a => lazy((function* () { let drop = true; for (const x of each(a[1])) { if (drop && truthy(call(a[0], [x]))) continue; drop = false; yield x; } })(), 'dropwhile'));
  d.filterfalse = fn('filterfalse', a => lazy((function* () { for (const x of each(a[1])) if (!(a[0] === null ? truthy(x) : truthy(call(a[0], [x])))) yield x; })(), 'filterfalse'));
  d.compress = fn('compress', a => lazy((function* () { const sel = iter(a[1]); for (const x of each(a[0])) { const s = sel.next(); if (s === STOP) return; if (truthy(s)) yield x; } })(), 'compress'));
  d.groupby = fn('groupby', (a, kw) => lazy((function* () {
    const key = a.length > 1 ? a[1] : kwget(kw, 'key', null);
    let cur, group = null;
    for (const x of each(a[0])) {
      const k = key ? call(key, [x]) : x;
      if (group === null || !pyEq(k, cur)) { if (group !== null) yield new PyTuple([cur, wrap(group)]); cur = k; group = []; }
      group.push(x);
    }
    if (group !== null) yield new PyTuple([cur, wrap(group)]);
    function wrap(g) { let i = 0; return mkIter(() => i < g.length ? g[i++] : STOP, '_grouper'); }
  })(), 'groupby'));
};
function cached(f, maxsize) {
  const cache = new PyDict();
  let hits = 0, misses = 0;
  const w = fn(f.name || 'wrapper', (args, kw) => {
    let keyArgs = args;
    if (kw !== null) { const names = Object.keys(kw); if (names.length) { keyArgs = args.concat(['\0kw']); for (const k of names.sort()) keyArgs.push(k, kw[k]); } }
    const key = new PyTuple(keyArgs), hit = dget(cache, key);
    if (hit !== undefined) { hits++; if (maxsize !== null) { ddel(cache, key); dset(cache, key, hit); } return hit; }
    misses++;
    const v = call(f, args, kw);
    dset(cache, key, v);
    if (maxsize !== null && cache.m.size > maxsize) cache.m.delete(cache.m.keys().next().value);
    return v;
  });
  w.attrs = Object.create(null);
  w.attrs.cache_clear = fn('cache_clear', () => { cache.m.clear(); hits = misses = 0; return null; });
  w.attrs.cache_info = fn('cache_info', () => 'CacheInfo(hits=' + hits + ', misses=' + misses + ', maxsize=' + (maxsize === null ? 'None' : maxsize) + ', currsize=' + cache.m.size + ')');
  w.attrs.__wrapped__ = f;
  if (f instanceof PyFunc) w.attrs.__doc__ = f.code.doc;
  return w;
}
MODS.functools = d => {
  d.lru_cache = fn('lru_cache', (a, kw) => {
    if (a.length === 1 && isCallable(a[0]) && kw === null) return cached(a[0], 128);
    const m = a.length ? a[0] : kwget(kw, 'maxsize', 128);
    return fn('decorator', b => cached(b[0], m === null ? null : idx(m)));
  });
  d.cache = fn('cache', a => cached(a[0], null));
  d.reduce = fn('reduce', a => {
    argc('reduce', a, 2, 3);
    const it = iter(a[1]);
    let acc;
    if (a.length > 2) acc = a[2]; else { acc = it.next(); if (acc === STOP) throw err('TypeError', 'reduce() of empty iterable with no initial value'); }
    for (;;) { const x = it.next(); if (x === STOP) return acc; R.steps++; acc = call(a[0], [acc, x]); }
  });
  d.wraps = fn('wraps', a => fn('decorator', b => {
    const src = a[0], w = b[0];
    if (w instanceof PyFunc || w instanceof PyBuiltin) {
      w.name = src.name || w.name;
      const at = w.attrs || (w.attrs = Object.create(null));
      at.__wrapped__ = src;
      at.__doc__ = src instanceof PyFunc ? src.code.doc : null;
    }
    return w;
  }));
  d.partial = fn('partial', (a, kw) => {
    const f = a[0], pre = a.slice(1);
    return fn('partial', (b, kw2) => { let k = null; if (kw || kw2) k = Object.assign(Object.create(null), kw || {}, kw2 || {}); return call(f, pre.concat(b), k); });
  });
  d.cmp_to_key = fn('cmp_to_key', a => fn('K', b => new CmpKey(a[0], b[0])));
  d.total_ordering = fn('total_ordering', a => {
    const cls = a[0], lt0 = findAttr(cls, '__lt__');
    if (lt0 === undefined) throw err('ValueError', 'total_ordering in Pylon needs __lt__ and __eq__ to be defined');
    const less = (x, y) => truthy(call(lt0, [x, y]));
    if (cls.d.__le__ === undefined) cls.d.__le__ = umeth('__le__', b => less(b[0], b[1]) || pyEq(b[0], b[1]));
    if (cls.d.__gt__ === undefined) cls.d.__gt__ = umeth('__gt__', b => !less(b[0], b[1]) && !pyEq(b[0], b[1]));
    if (cls.d.__ge__ === undefined) cls.d.__ge__ = umeth('__ge__', b => !less(b[0], b[1]));
    return cls;
  });
};
MODS.operator = d => {
  d.itemgetter = fn('itemgetter', a => fn('itemgetter', b => a.length === 1 ? getItem(b[0], a[0]) : new PyTuple(a.map(k => getItem(b[0], k)))));
  d.attrgetter = fn('attrgetter', a => fn('attrgetter', b => a.length === 1 ? getAttr(b[0], a[0]) : new PyTuple(a.map(k => getAttr(b[0], k)))));
  const bin = { add: '+', sub: '-', mul: '*', truediv: '/', floordiv: '//', mod: '%', pow: '**', and_: '&', or_: '|', xor: '^', lshift: '<<', rshift: '>>' };
  for (const k in bin) d[k] = fn(k, a => MP.BIN[bin[k]](a[0], a[1]));
  d.neg = fn('neg', a => MP.neg(a[0]));
  d.not_ = fn('not_', a => !truthy(a[0]));
  d.eq = fn('eq', a => pyEq(a[0], a[1])); d.ne = fn('ne', a => !pyEq(a[0], a[1]));
  d.lt = fn('lt', a => rich(a[0], a[1], 0)); d.le = fn('le', a => rich(a[0], a[1], 1));
  d.gt = fn('gt', a => rich(a[0], a[1], 2)); d.ge = fn('ge', a => rich(a[0], a[1], 3));
  d.getitem = fn('getitem', a => getItem(a[0], a[1]));
  d.contains = fn('contains', a => MP.contains(a[0], a[1]));
};

// ---------------------------------------------------------------- small modules
MODS.string = d => {
  d.ascii_lowercase = 'abcdefghijklmnopqrstuvwxyz'; d.ascii_uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  d.ascii_letters = d.ascii_lowercase + d.ascii_uppercase; d.digits = '0123456789'; d.hexdigits = '0123456789abcdefABCDEF'; d.octdigits = '01234567';
  d.punctuation = '!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~'; d.whitespace = ' \t\n\r\x0b\x0c';
};
function shallow(x) {
  if (Array.isArray(x)) return x.slice();
  if (x instanceof PyDict) return MP.MT.dict.copy(x);
  if (x instanceof PySet) return MP.MT.frozenset.copy(x);
  if (x instanceof PyDeque) return new PyDeque(x.a.slice(), x.maxlen);
  if (x instanceof PyObj) {
    const c = findAttr(x.cls, '__copy__');
    if (c !== undefined && !(c instanceof PyBuiltin)) return call(c, [x]);
    const o = new PyObj(x.cls);
    for (const k in x.d) o.d[k] = x.d[k];
    return o;
  }
  return x;
}
function deep(x, memo) {
  if (x === null || typeof x !== 'object' || x instanceof PyFloat || x instanceof PyRange || x instanceof PyFunc || x instanceof PyClass || x instanceof PyBuiltin || x instanceof PyModule) return x;
  if (memo.has(x)) return memo.get(x);
  if (++R.steps > R.max) stepLimit();
  if (Array.isArray(x)) { const c = []; memo.set(x, c); for (let i = 0; i < x.length; i++) c.push(deep(x[i], memo)); return c; }
  if (x instanceof PyTuple) { const c = new PyTuple(x.a.map(v => deep(v, memo))); memo.set(x, c); return c; }
  if (x instanceof PyDict) {
    const c = x instanceof PyDefaultDict ? new PyDefaultDict(x.factory) : x instanceof PyCounter ? new PyCounter() : x instanceof PyOrderedDict ? new PyOrderedDict() : new PyDict();
    memo.set(x, c);
    for (const e of x.m.values()) dset(c, deep(e[0], memo), deep(e[1], memo));
    return c;
  }
  if (x instanceof PySet) { const c = new PySet(x.frozen); memo.set(x, c); for (const k of x.m.values()) sadd(c, deep(k, memo)); return c; }
  if (x instanceof PyDeque) { const c = new PyDeque([], x.maxlen); memo.set(x, c); for (const v of x.a) c.a.push(deep(v, memo)); return c; }
  if (x instanceof PyObj) { const o = new PyObj(x.cls); memo.set(x, o); for (const k in x.d) o.d[k] = deep(x.d[k], memo); return o; }
  return x;
}
MODS.copy = d => { d.copy = fn('copy', a => shallow(a[0])); d.deepcopy = fn('deepcopy', a => deep(a[0], new Map())); };
MODS.typing = (d, m) => {
  const cls = name => { const c = new PyClass(name, [T.object], Object.create(null)); c.native = true; c.mro = [c, T.object]; return c; };
  d.Generic = cls('Generic'); d.Protocol = cls('Protocol');
  d.TYPE_CHECKING = false;
  d.TypeVar = fn('TypeVar', a => new PyTyping(String(a[0])));
  d.cast = fn('cast', a => a[1]);
  d.overload = fn('overload', a => a[0]); d.final = fn('final', a => a[0]);
  m.fallback = name => /^[A-Z]/.test(name) ? new PyTyping(name) : undefined;
};
MODS.__future__ = (d, m) => { m.fallback = name => new PyTyping(name); };
MODS.abc = d => {
  const c = new PyClass('ABC', [T.object], Object.create(null)); c.native = true; c.mro = [c, T.object];
  d.ABC = c;
  d.abstractmethod = fn('abstractmethod', a => a[0]);
};
MODS.sys = d => {
  d.maxsize = 9223372036854775807n;
  d.version = '3.12 (Pylon MiniPy)';
  d.argv = ['pylon'];
  d.setrecursionlimit = fn('setrecursionlimit', a => { R.maxCalls = 2 * Math.max(50, Math.min(idx(a[0]), MP.RECURSION_CAP)); return null; });
  d.getrecursionlimit = fn('getrecursionlimit', () => R.maxCalls / 2);
  d.exit = fn('exit', () => { throw new PyErr(mkExc(EXC.SystemExit, [])); });
};
MODS.time = d => {
  const now = () => F(Date.now() / 1000);
  d.time = fn('time', now); d.perf_counter = fn('perf_counter', now); d.monotonic = fn('monotonic', now);
  d.sleep = fn('sleep', () => null);
};
MODS.random = d => {
  let seed = 0x9e3779b9;
  const rnd = () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const below = n => Math.floor(rnd() * n);
  d.seed = fn('seed', a => { seed = a.length && a[0] !== null ? (hashOf(a[0]) | 0) : 0x9e3779b9; return null; });
  d.random = fn('random', () => F(rnd()));
  d.uniform = fn('uniform', a => F(num(a[0]) + (num(a[1]) - num(a[0])) * rnd()));
  d.randint = fn('randint', a => { const lo = idx(a[0]), hi = idx(a[1]); if (hi < lo) throw err('ValueError', 'empty range for randint()'); return lo + below(hi - lo + 1); });
  d.randrange = fn('randrange', a => { const r = T.range.ctor(a); if (!r.len) throw err('ValueError', 'empty range for randrange()'); return r.start + below(r.len) * r.step; });
  d.choice = fn('choice', a => { const s = arrOf(a[0]); if (!s.length) throw err('IndexError', 'Cannot choose from an empty sequence'); return s[below(s.length)]; });
  d.shuffle = fn('shuffle', a => { const s = a[0]; if (!Array.isArray(s)) throw err('TypeError', 'shuffle() needs a list'); for (let i = s.length - 1; i > 0; i--) { const j = below(i + 1), t = s[i]; s[i] = s[j]; s[j] = t; } return null; });
  d.sample = fn('sample', (a, kw) => { const s = toArr(a[0]), k = idx(a.length > 1 ? a[1] : kwget(kw, 'k', 1)); if (k > s.length || k < 0) throw err('ValueError', 'Sample larger than population or is negative'); for (let i = s.length - 1; i > 0; i--) { const j = below(i + 1), t = s[i]; s[i] = s[j]; s[j] = t; } return s.slice(0, k); });
  d.choices = fn('choices', (a, kw) => { const s = arrOf(a[0]), k = idx(kwget(kw, 'k', 1)), res = []; for (let i = 0; i < k; i++) res.push(s[below(s.length)]); return res; });
};

// ---------------------------------------------------------------- dataclasses and contextlib
class DCField { constructor(dflt, factory) { this.dflt = dflt; this.factory = factory; } }
function makeDataclass(cls, opts) {
  if (!(cls instanceof PyClass) || cls.native) throw err('TypeError', 'dataclass() should be used on a class');
  const fields = (cls.fields || []).slice(), ann = cls.d.__annotations__;
  if (ann instanceof PyDict) {
    for (const e of ann.m.values()) {
      const name = e[0], v = cls.d[name];
      const f = { name, dflt: undefined, factory: undefined };
      if (v instanceof DCField) { f.dflt = v.dflt; f.factory = v.factory; if (v.dflt !== undefined) cls.d[name] = v.dflt; else delete cls.d[name]; }
      else if (v !== undefined) {
        if (Array.isArray(v) || v instanceof PyDict || v instanceof PySet) throw err('ValueError', 'mutable default ' + repr(typeOfName(v)) + ' for field ' + name + ' is not allowed: use default_factory');
        f.dflt = v;
      }
      const i = fields.findIndex(x => x.name === name);
      if (i >= 0) fields[i] = f; else fields.push(f);
    }
  }
  let seenDefault = false;
  for (const f of fields) {
    const has = f.dflt !== undefined || f.factory !== undefined;
    if (!has && seenDefault) throw err('TypeError', "non-default argument '" + f.name + "' follows default argument");
    if (has) seenDefault = true;
  }
  cls.fields = fields;
  const own = n => cls.d[n] !== undefined;
  const values = o => new PyTuple(fields.map(f => o.d[f.name]));
  if (!own('__init__')) {
    cls.d.__init__ = umeth('__init__', (args, kw) => {
      const self = args[0], npos = args.length - 1;
      if (npos > fields.length) throw err('TypeError', cls.name + '.__init__() takes ' + (fields.length + 1) + ' positional arguments but ' + args.length + ' were given');
      const missing = [];
      fields.forEach((f, i) => {
        let v;
        if (i < npos) { if (kw && kw[f.name] !== undefined) throw err('TypeError', cls.name + ".__init__() got multiple values for argument '" + f.name + "'"); v = args[i + 1]; }
        else if (kw && kw[f.name] !== undefined) v = kw[f.name];
        else if (f.factory !== undefined) v = call(f.factory, []);
        else if (f.dflt !== undefined) v = f.dflt;
        else { missing.push("'" + f.name + "'"); return; }
        self.d[f.name] = v;
      });
      if (kw) for (const k in kw) if (!fields.some(f => f.name === k)) throw err('TypeError', cls.name + ".__init__() got an unexpected keyword argument '" + k + "'");
      if (missing.length) throw err('TypeError', cls.name + '.__init__() missing ' + MP.plural(missing.length, 'required positional argument') + ': ' + (missing.length === 1 ? missing[0] : missing.slice(0, -1).join(', ') + ' and ' + missing[missing.length - 1]));
      const post = findAttr(self.cls, '__post_init__');
      if (post !== undefined) call(bind(post, self), []);
      return null;
    });
  }
  if (!own('__repr__')) cls.d.__repr__ = umeth('__repr__', a => a[0].cls.name + '(' + fields.map(f => f.name + '=' + repr(a[0].d[f.name])).join(', ') + ')');
  if (opts.eq !== false && !own('__eq__')) cls.d.__eq__ = umeth('__eq__', a => (a[1] instanceof PyObj && a[1].cls === a[0].cls) ? pyEq(values(a[0]), values(a[1])) : NotImpl);
  if (opts.order) ['__lt__', '__le__', '__gt__', '__ge__'].forEach((n, op) => { cls.d[n] = umeth(n, a => (a[1] instanceof PyObj && a[1].cls === a[0].cls) ? rich(values(a[0]), values(a[1]), op) : NotImpl); });
  if (opts.frozen) { cls.frozen = true; cls.d.__hash__ = umeth('__hash__', a => hashOf(values(a[0]))); }
  return cls;
}
const typeOfName = v => tn(v);
MODS.dataclasses = d => {
  d.dataclass = fn('dataclass', (a, kw) => {
    const opts = { eq: kw && kw.eq !== undefined ? truthy(kw.eq) : true, order: !!(kw && kw.order !== undefined && truthy(kw.order)), frozen: !!(kw && kw.frozen !== undefined && truthy(kw.frozen)) };
    if (a.length === 1 && a[0] instanceof PyClass) return makeDataclass(a[0], opts);
    return fn('dataclass', b => makeDataclass(b[0], opts));
  });
  d.field = fn('field', (a, kw) => new DCField(kw && kw.default !== undefined ? kw.default : undefined, kw && kw.default_factory !== undefined ? kw.default_factory : undefined));
  d.asdict = fn('asdict', a => { const o = a[0], r = new PyDict(); for (const f of (o.cls.fields || [])) dset(r, f.name, o.d[f.name]); return r; });
  d.astuple = fn('astuple', a => new PyTuple((a[0].cls.fields || []).map(f => a[0].d[f.name])));
};
const CTX = new PyClass('_GeneratorContextManager', [T.object], Object.create(null));
CTX.native = true; CTX.mro = [CTX, T.object];
CTX.d.__enter__ = meth('__enter__', a => { const v = a[0].gen.next(); if (v === STOP) throw err('RuntimeError', "generator didn't yield"); return v; });
CTX.d.__exit__ = meth('__exit__', a => {
  const g = a[0].gen, exc = a.length > 2 ? a[2] : null;
  if (exc === null) { if (g.next() !== STOP) throw err('RuntimeError', "generator didn't stop"); return false; }
  if (g.done || g.it === null) return false;
  let r;
  try { r = g.it.throw(new PyErr(exc)); }
  catch (e) { g.done = true; if (e instanceof PyErr && e.exc === exc) return false; throw e; }
  if (r.done) { g.done = true; return true; }
  throw err('RuntimeError', "generator didn't stop after throw()");
});
const SUPPRESS = new PyClass('suppress', [T.object], Object.create(null));
SUPPRESS.native = true; SUPPRESS.mro = [SUPPRESS, T.object];
SUPPRESS.d.__enter__ = meth('__enter__', a => a[0]);
SUPPRESS.d.__exit__ = meth('__exit__', a => a.length > 2 && a[2] !== null && a[0].kinds.some(k => isInst(a[2], k)));
MODS.contextlib = d => {
  d.contextmanager = fn('contextmanager', a => {
    const w = fn(a[0].name || 'helper', (args, kw) => {
      const g = call(a[0], args, kw);
      if (!(g instanceof PyGen)) throw err('TypeError', '@contextmanager needs a generator function (one that uses yield)');
      const o = new PyObj(CTX); o.gen = g; return o;
    });
    return w;
  });
  d.suppress = fn('suppress', a => { const o = new PyObj(SUPPRESS); o.kinds = a; return o; });
};

// ---------------------------------------------------------------- re
// Python's regular expressions, run by the JavaScript engine. The two dialects agree on nearly everything a course
// needs; reTranslate() rewrites the places where they differ: named groups, \A and \Z, "$" before a final newline,
// "." and line breaks, (?i)-style flags at the start, {,n}, comments and verbose mode.
// Known gaps: \w, \d and \b see ASCII letters and digits only, and flags inside a group, (?i:...), are refused.
const RE_FLAGS = { I: 2, IGNORECASE: 2, M: 8, MULTILINE: 8, S: 16, DOTALL: 16, X: 64, VERBOSE: 64, A: 256, ASCII: 256, U: 32, UNICODE: 32 };
const RE_ERROR = MP.mkExcClass('re.error', EXC.Exception);
const reClass = name => { const c = new PyClass(name, [T.object], Object.create(null)); c.native = true; c.mro = [c, T.object]; c.mod = 're'; return c; };
const RE_PATTERN = reClass('Pattern'), RE_MATCH = reClass('Match');
const reErr = (msg, at) => new PyErr(mkExc(RE_ERROR, [msg + (at === undefined ? '' : ' at position ' + at)]));
function reTranslate(pat, flags) {
  const n = pat.length, names = [];
  let i = 0, src = '', inClass = false, groups = 0;
  for (;;) {                                   // flags written at the start of the pattern: (?i), (?ms)
    const m = /^\(\?([aiLmsux]+)\)/.exec(pat.slice(i));
    if (!m) break;
    for (const c of m[1]) flags |= ({ i: 2, m: 8, s: 16, x: 64, a: 256, u: 32 })[c] || 0;
    i += m[0].length;
  }
  const verbose = !!(flags & 64), multi = !!(flags & 8), dotall = !!(flags & 16);
  while (i < n) {
    const c = pat[i];
    if (c === '\\') {
      const d = pat[i + 1];
      if (d === undefined) throw reErr('bad escape (end of pattern)', i);
      if (!inClass && d === 'A') src += '(?<![\\s\\S])';
      else if (!inClass && d === 'Z') src += '(?![\\s\\S])';
      else src += c + d;
      i += 2;
      continue;
    }
    if (inClass) { if (c === ']') inClass = false; src += c; i++; continue; }
    if (c === '[') {
      inClass = true; src += c; i++;
      if (pat[i] === '^') { src += '^'; i++; }
      if (pat[i] === ']') { src += '\\]'; i++; }       // "]" right after "[" is an ordinary character in Python
      continue;
    }
    if (verbose) {
      if (c === ' ' || c === '\t' || c === '\n' || c === '\r' || c === '\f' || c === '\v') { i++; continue; }
      if (c === '#') { while (i < n && pat[i] !== '\n') i++; continue; }
    }
    if (c === '(') {
      if (pat[i + 1] !== '?') { groups++; src += '('; i++; continue; }
      const rest = pat.slice(i + 2);
      let m;
      if ((m = /^P<([A-Za-z_]\w*)>/.exec(rest))) {
        if (names.indexOf(m[1]) >= 0) throw reErr("redefinition of group name '" + m[1] + "'", i + 4);
        groups++; names[groups] = m[1]; src += '(?<' + m[1] + '>'; i += 2 + m[0].length; continue;
      }
      if ((m = /^P=([A-Za-z_]\w*)\)/.exec(rest))) {
        if (names.indexOf(m[1]) < 0) throw reErr("unknown group name '" + m[1] + "'", i + 4);
        src += '\\k<' + m[1] + '>'; i += 2 + m[0].length; continue;
      }
      if (rest[0] === '#') { const end = pat.indexOf(')', i); if (end < 0) throw reErr('missing ), unterminated comment', i); i = end + 1; continue; }
      if (rest[0] === 'P') throw reErr('unknown extension ?P' + (rest[1] || ''), i + 1);
      if (/^[aiLmsux]+\)/.test(rest)) throw reErr('global flags not at the start of the expression', i);
      if (/^[aiLmsux-]+:/.test(rest)) throw reErr("flags inside a group, such as (?i:...), are not available in Pylon's Python", i);
      src += '('; i++;                                 // (?: (?= (?! (?<= (?<! mean the same in both dialects
      continue;
    }
    if (c === '$') { src += multi ? '$' : '(?=\\n?(?![\\s\\S]))'; i++; continue; }
    if (c === '.') { src += dotall ? '[\\s\\S]' : '[^\\n]'; i++; continue; }
    if (c === '{') { const m = /^\{,(\d+)\}/.exec(pat.slice(i)); if (m) { src += '{0,' + m[1] + '}'; i += m[0].length; continue; } }
    src += c; i++;
  }
  if (inClass) throw reErr('unterminated character set');
  return { source: src, flags, names, groups, base: (flags & 2 ? 'i' : '') + (multi ? 'm' : '') };
}
// The engine's regular expression for one use: 'g' searches from a position, 'y' must match at it, 'f' must match to the end.
function reEngine(p, kind) {
  if (p[kind]) return p[kind];
  const src = kind === 'f' ? '(?:' + p.source + ')(?![\\s\\S])' : p.source, fl = p.base + (kind === 'g' ? 'g' : 'y');
  let r;
  try { r = new RegExp(src, fl + 'd'); }
  catch (e) {
    try { r = new RegExp(src, fl); }
    catch (e2) { throw reErr(String((e2 && e2.message) || e2).replace(/^Invalid regular expression: \/[\s\S]*\/[a-z]*: /, '').replace(/^Invalid regular expression: /, '').toLowerCase()); }
  }
  return p[kind] = r;
}
const reCache = new Map();
function reCompile(pattern, flags) {
  if (pattern instanceof PyObj && pattern.cls === RE_PATTERN) {
    if (flags) throw err('ValueError', 'cannot process flags argument with a compiled pattern');
    return pattern;
  }
  if (typeof pattern !== 'string') throw err('TypeError', 'first argument must be string or compiled pattern');
  if (typeof flags === 'boolean') flags = +flags;
  if (typeof flags !== 'number') throw err('TypeError', 'flags must be a number such as re.IGNORECASE');
  const key = flags + '/' + pattern;
  let o = reCache.get(key);
  if (o) return o;
  const p = reTranslate(pattern, flags);
  p.pattern = pattern;
  reEngine(p, 'g');                                    // a pattern with a mistake in it fails here, not at its first use
  o = new PyObj(RE_PATTERN);
  o.p = p;
  o.d.pattern = pattern; o.d.flags = p.flags | 32; o.d.groups = p.groups;
  const gi = new PyDict();
  p.names.forEach((name, k) => { dset(gi, name, k); });
  o.d.groupindex = gi;
  if (reCache.size > 200) reCache.clear();
  reCache.set(key, o);
  return o;
}
const reText = (s, what) => { if (typeof s !== 'string') throw err('TypeError', "expected string or bytes-like object, got '" + tn(s) + "'"); return s; };
function reFind(po, kind, string, pos) {
  const r = reEngine(po.p, kind);
  r.lastIndex = pos;
  const m = r.exec(string);
  if (++R.steps > R.max) stepLimit();
  return m;
}
function reMatchObj(po, m, string, pos) {
  if (!m) return null;
  const o = new PyObj(RE_MATCH), p = po.p;
  o.m = m; o.po = po;
  let last = null;
  for (let g = 1; g <= p.groups; g++) if (m[g] !== undefined) last = g;
  o.d.string = string; o.d.re = po; o.d.pos = pos; o.d.endpos = string.length; o.d.lastindex = last; o.d.lastgroup = last !== null && p.names[last] !== undefined ? p.names[last] : null;
  return o;
}
function* reEach(po, string, pos) {                  // every match from left to right, the way findall and sub walk
  let at = pos || 0;
  while (at <= string.length) {
    const m = reFind(po, 'g', string, at);
    if (!m) return;
    yield m;
    at = m.index + m[0].length + (m[0].length === 0 ? 1 : 0);
  }
}
const reSelf = (o, cls, what) => { if (!(o instanceof PyObj) || o.cls !== cls) throw err('TypeError', 'this method needs a ' + what + ' object'); return o; };
function reGroupIndex(mo, g) {
  const p = mo.po.p;
  if (typeof g === 'string') { const k = p.names.indexOf(g); if (k < 1) throw err('IndexError', 'no such group'); return k; }
  if (typeof g === 'boolean') g = +g;
  if (typeof g !== 'number' || g < 0 || g > p.groups) throw err('IndexError', 'no such group');
  return g;
}
const reSpan = (mo, k) => {
  const m = mo.m;
  if (k === 0) return [m.index, m.index + m[0].length];
  if (m[k] === undefined) return [-1, -1];
  return m.indices && m.indices[k] ? [m.indices[k][0], m.indices[k][1]] : [-1, -1];
};
const mdef = (name, f) => { RE_MATCH.d[name] = meth(name, f); };
mdef('group', a => {
  const mo = reSelf(a[0], RE_MATCH, 'match');
  if (a.length === 1) return mo.m[0];
  const one = g => { const v = mo.m[reGroupIndex(mo, g)]; return v === undefined ? null : v; };
  return a.length === 2 ? one(a[1]) : new PyTuple(a.slice(1).map(one));
});
mdef('__getitem__', a => { const mo = reSelf(a[0], RE_MATCH, 'match'), v = mo.m[reGroupIndex(mo, a[1])]; return v === undefined ? null : v; });
mdef('groups', (a, kw) => {
  const mo = reSelf(a[0], RE_MATCH, 'match'), dflt = a.length > 1 ? a[1] : kwget(kw, 'default', null), outv = [];
  for (let g = 1; g <= mo.po.p.groups; g++) outv.push(mo.m[g] === undefined ? dflt : mo.m[g]);
  return new PyTuple(outv);
});
mdef('groupdict', (a, kw) => {
  const mo = reSelf(a[0], RE_MATCH, 'match'), dflt = a.length > 1 ? a[1] : kwget(kw, 'default', null), dd = new PyDict();
  mo.po.p.names.forEach((name, k) => { dset(dd, name, mo.m[k] === undefined ? dflt : mo.m[k]); });
  return dd;
});
mdef('start', a => { const mo = reSelf(a[0], RE_MATCH, 'match'); return reSpan(mo, a.length > 1 ? reGroupIndex(mo, a[1]) : 0)[0]; });
mdef('end', a => { const mo = reSelf(a[0], RE_MATCH, 'match'); return reSpan(mo, a.length > 1 ? reGroupIndex(mo, a[1]) : 0)[1]; });
mdef('span', a => { const mo = reSelf(a[0], RE_MATCH, 'match'); return new PyTuple(reSpan(mo, a.length > 1 ? reGroupIndex(mo, a[1]) : 0)); });
RE_MATCH.reprFn = o => '<re.Match object; span=(' + o.m.index + ', ' + (o.m.index + o.m[0].length) + '), match=' + repr(o.m[0]) + '>';
RE_PATTERN.reprFn = o => 're.compile(' + repr(o.p.pattern) + ')';

// The replacement text of sub(): \1 and \g<name> stand for groups, \n and friends for the usual characters.
function reTemplate(po, repl) {
  const parts = [], p = po.p;
  let lit = '';
  const ref = (g, at) => {
    let k;
    if (/^\d+$/.test(g)) { k = +g; if (k > p.groups) throw reErr('invalid group reference ' + k, at); }
    else { k = p.names.indexOf(g); if (k < 1) throw err('IndexError', "unknown group name '" + g + "'"); }
    if (lit) { parts.push(lit); lit = ''; }
    parts.push(k);
  };
  for (let i = 0; i < repl.length; i++) {
    const c = repl[i];
    if (c !== '\\') { lit += c; continue; }
    const d = repl[i + 1];
    if (d === undefined) throw reErr('bad escape (end of pattern)', i);
    if (d === 'g') {
      const m = /^g<([^>]*)>/.exec(repl.slice(i + 1));
      if (!m) throw reErr('missing <', i + 2);
      ref(m[1], i + 3);
      i += m[0].length;
    } else if (d >= '1' && d <= '9') {
      let g = d;
      if (repl[i + 2] >= '0' && repl[i + 2] <= '9') g += repl[i + 2];
      ref(g, i + 1);
      i += g.length;
    } else if ('ntrfvab\\'.indexOf(d) >= 0) { lit += ({ n: '\n', t: '\t', r: '\r', f: '\f', v: '\v', a: '\x07', b: '\b', '\\': '\\' })[d]; i++; }
    else if (/[A-Za-z0]/.test(d)) throw reErr('bad escape \\' + d, i);
    else { lit += c + d; i++; }
  }
  if (lit) parts.push(lit);
  return parts;
}
function reSub(po, repl, string, count) {
  reText(string);
  const fnRepl = typeof repl !== 'string', parts = fnRepl ? null : reTemplate(po, repl);
  let res = '', last = 0, done = 0;
  for (const m of reEach(po, string, 0)) {
    res += string.slice(last, m.index);
    if (fnRepl) {
      const r = call(repl, [reMatchObj(po, m, string, 0)]);
      if (typeof r !== 'string') throw err('TypeError', 'the replacement function must return a string, not ' + tn(r));
      res += r;
    } else for (const part of parts) res += typeof part === 'string' ? part : (m[part] === undefined ? '' : m[part]);
    last = m.index + m[0].length;
    done++;
    if (count && done >= count) break;
  }
  return [res + string.slice(last), done];
}
function reSplit(po, string, maxsplit) {
  reText(string);
  const parts = [], groups = po.p.groups;
  let last = 0, done = 0;
  for (const m of reEach(po, string, 0)) {
    parts.push(string.slice(last, m.index));
    for (let g = 1; g <= groups; g++) parts.push(m[g] === undefined ? null : m[g]);
    last = m.index + m[0].length;
    if (maxsplit && ++done >= maxsplit) break;
  }
  parts.push(string.slice(last));
  return parts;
}
function reFindall(po, string, pos) {
  reText(string);
  const found = [], groups = po.p.groups;
  for (const m of reEach(po, string, pos)) {
    if (groups === 0) found.push(m[0]);
    else if (groups === 1) found.push(m[1] === undefined ? '' : m[1]);
    else { const t = []; for (let g = 1; g <= groups; g++) t.push(m[g] === undefined ? '' : m[g]); found.push(new PyTuple(t)); }
  }
  return found;
}
const reIterObj = (po, string, pos) => { reText(string); const g = reEach(po, string, pos); return lazy((function* () { for (const m of g) yield reMatchObj(po, m, string, pos); })(), 'callable_iterator'); };
const rePos = (a, kw, k) => { const v = a.length > k ? a[k] : kwget(kw, 'pos', 0); return typeof v === 'number' ? Math.max(0, v) : 0; };
const pdef = (name, f) => { RE_PATTERN.d[name] = meth(name, f); };
[['search', 'g'], ['match', 'y'], ['fullmatch', 'f']].forEach(pair => {
  pdef(pair[0], (a, kw) => { const po = reSelf(a[0], RE_PATTERN, 'pattern'), s = reText(a[1]), pos = rePos(a, kw, 2); return reMatchObj(po, reFind(po, pair[1], s, pos), s, pos); });
});
pdef('findall', (a, kw) => reFindall(reSelf(a[0], RE_PATTERN, 'pattern'), a[1], rePos(a, kw, 2)));
pdef('finditer', (a, kw) => reIterObj(reSelf(a[0], RE_PATTERN, 'pattern'), a[1], rePos(a, kw, 2)));
pdef('sub', (a, kw) => reSub(reSelf(a[0], RE_PATTERN, 'pattern'), a[1], a[2], a.length > 3 ? a[3] : kwget(kw, 'count', 0))[0]);
pdef('subn', (a, kw) => new PyTuple(reSub(reSelf(a[0], RE_PATTERN, 'pattern'), a[1], a[2], a.length > 3 ? a[3] : kwget(kw, 'count', 0))));
pdef('split', (a, kw) => reSplit(reSelf(a[0], RE_PATTERN, 'pattern'), a[1], a.length > 2 ? a[2] : kwget(kw, 'maxsplit', 0)));
MODS.re = d => {
  for (const k in RE_FLAGS) d[k] = RE_FLAGS[k];
  d.error = RE_ERROR; d.Pattern = RE_PATTERN; d.Match = RE_MATCH;
  const flagsOf = (a, kw, k) => (a.length > k ? a[k] : kwget(kw, 'flags', 0));
  d.compile = fn('compile', (a, kw) => { argc('compile', a, 1, 2); return reCompile(a[0], flagsOf(a, kw, 1)); });
  [['search', 'g'], ['match', 'y'], ['fullmatch', 'f']].forEach(pair => {
    d[pair[0]] = fn(pair[0], (a, kw) => { argc(pair[0], a, 2, 3); const po = reCompile(a[0], flagsOf(a, kw, 2)), s = reText(a[1]); return reMatchObj(po, reFind(po, pair[1], s, 0), s, 0); });
  });
  d.findall = fn('findall', (a, kw) => { argc('findall', a, 2, 3); return reFindall(reCompile(a[0], flagsOf(a, kw, 2)), a[1], 0); });
  d.finditer = fn('finditer', (a, kw) => { argc('finditer', a, 2, 3); return reIterObj(reCompile(a[0], flagsOf(a, kw, 2)), a[1], 0); });
  d.sub = fn('sub', (a, kw) => { argc('sub', a, 3, 5); return reSub(reCompile(a[0], flagsOf(a, kw, 4)), a[1], a[2], a.length > 3 ? a[3] : kwget(kw, 'count', 0))[0]; });
  d.subn = fn('subn', (a, kw) => { argc('subn', a, 3, 5); return new PyTuple(reSub(reCompile(a[0], flagsOf(a, kw, 4)), a[1], a[2], a.length > 3 ? a[3] : kwget(kw, 'count', 0))); });
  d.split = fn('split', (a, kw) => { argc('split', a, 2, 4); return reSplit(reCompile(a[0], flagsOf(a, kw, 3)), a[1], a.length > 2 ? a[2] : kwget(kw, 'maxsplit', 0)); });
  d.escape = fn('escape', a => { argc('escape', a, 1, 1); return reText(a[0]).replace(/[()[\]{}?*+\-|^$\\.&~# \t\n\r\v\f]/g, '\\$&'); });
  d.purge = fn('purge', () => { reCache.clear(); return null; });
};

// ---------------------------------------------------------------- Session: what the game uses
MP.RECURSION_CAP = 800;
MP.FILE = 1000000;   // line numbers are tagged: line + FILE * n says "helper code number n", plain lines are the player's code
function describeError(e) {
  if (e instanceof PySyntax) return { type: e.kind, message: e.msg, line: e.line, hint: null, trace: [], syntax: true, exc: null };
  if (e instanceof PyAbort) return { type: e.kind === 'steps' ? 'StepLimit' : 'Stopped', message: e.msg, line: e.line, hint: null, trace: [], abort: e.kind, exc: null };
  if (!(e instanceof PyErr)) {
    try { e = MP.toPyErr(e); }
    catch (x) { return { type: 'InternalError', message: String((x && x.message) || x), line: R.line, hint: null, trace: [], internal: true, exc: null, stack: x && x.stack }; }
  }
  let message;
  try { message = str(e.exc); } catch (x) { message = '(this error could not be printed)'; }
  const trace = [];
  for (let i = 0; i + 1 < e.trace.length; i += 2) if (e.trace[i] !== undefined) trace.push({ line: e.trace[i], fn: e.trace[i + 1] });
  return { type: e.exc.cls.name, message, line: e.line, hint: e.hint, trace, exc: e.exc };
}
function looseEq(a, b) {
  const aa = Array.isArray(a) ? a : a instanceof PyTuple ? a.a : null, bb = Array.isArray(b) ? b : b instanceof PyTuple ? b.a : null;
  if (aa && bb) {
    if (aa.length !== bb.length) return false;
    for (let i = 0; i < aa.length; i++) if (!looseEq(aa[i], bb[i])) return false;
    return true;
  }
  return pyEq(a, b);
}
class Session {
  constructor(opts) {
    opts = opts || {};
    this.G = Object.create(null);
    this.B = Object.assign(Object.create(null), MP.builtins, opts.builtins || {});
    this.env = { G: this.G, B: this.B, mods: null };
    this.maxSteps = opts.maxSteps || 2000000;
    this.output = '';
    // What a program can read and write: lines for input(), and files that live in memory. `echo` makes input()
    // print the line it took, the way a terminal shows what was typed.
    this.io = { stdin: [], pos: 0, files: new Map(), echo: !!opts.echo };
  }
  setInput(text) {
    const lines = text === null || text === undefined ? [] : String(text).replace(/\r\n?/g, '\n').split('\n');
    if (lines.length && lines[lines.length - 1] === '') lines.pop();
    this.io.stdin = lines; this.io.pos = 0;
  }
  setFiles(files) {
    this.io.files = new Map();
    for (const name in files || {}) this.io.files.set(name, String(files[name]).replace(/\r\n?/g, '\n'));
  }
  files() { return Array.from(this.io.files.entries()); }
  // Runs `thunk` with clean runtime state. Never throws: errors come back described.
  run(thunk, maxSteps, trace) {
    R.steps = 0; R.max = maxSteps || this.maxSteps; R.line = 0; R.calls.length = 0;
    R.out = []; R.outLen = 0; R.outCut = false; R.cur = null; R.maxCalls = 2 * MP.RECURSION_CAP;
    R.trace = trace || null;
    R.io = this.io;
    let value, error = null;
    try { value = thunk(); }
    catch (e) { R.trace = null; error = describeError(e); }
    R.trace = null;
    const output = R.out.join('');
    this.output += output;
    return { ok: error === null, value: value === undefined ? null : value, error, output, steps: R.steps };
  }
  exec(src, base, maxSteps, trace) { return this.run(() => { MP.compileModule(src, this.env, base || 0)(); return null; }, maxSteps, trace); }
  eval(src, base, maxSteps, trace) { return this.run(() => MP.compileExpr(src, this.env, base || 0)(), maxSteps, trace); }
  call(f, args, maxSteps) { return this.run(() => call(f, args || [], null), maxSteps); }
  get(name) { const v = this.G[name]; return v === undefined ? undefined : v; }
  repr(v) { const r = this.run(() => repr(v)); return r.ok ? r.value : '<' + tn(v) + '>'; }
  equal(a, b) { const r = this.run(() => looseEq(a, b)); return r.ok && r.value === true; }
}
MP.Session = Session;
MP.describeError = describeError;
MP.looseEq = looseEq;
if (typeof module !== 'undefined' && module.exports) module.exports = MP;
})(typeof window !== 'undefined' ? window : globalThis);
