/* Pylon autocomplete: decides what to offer at the caret. Pure functions with no DOM, so they can be tested on their own.
   Every name offered here exists in the game's interpreter (checked against it), and each comes with a one-line reminder of
   what it does, because for a learner the list doubles as a cheat sheet. */
(function (root) {
'use strict';
// name, signature, what it does, how often a learner needs it (9 = all the time), true when it is normally called with nothing
const fn = (kind, name, sig, doc, pri, bare) => ({ label: name, insert: name + (bare ? '()' : '(|)'), kind, sig: sig || name + '()', doc: doc || '', pri: pri || 4 });
const F = (name, sig, doc, pri, bare) => fn('fn', name, sig, doc, pri, bare);
const M = (name, sig, doc, pri, bare) => fn('method', name, sig, doc, pri, bare);
const V = (name, doc, pri) => ({ label: name, insert: name, kind: 'value', sig: name, doc: doc || '', pri: pri || 4 });

const BUILTINS = [
  F('print', 'print(value, ...)', 'Show values in the output', 9),
  F('len', 'len(x)', 'How many items x holds', 9),
  F('range', 'range(start, stop, step)', 'Whole numbers from start up to, but not including, stop', 9),
  F('enumerate', 'enumerate(items, start=0)', 'Each item together with its position', 8),
  F('sorted', 'sorted(items, key=None, reverse=False)', 'A new list in order. The original stays as it was', 8),
  F('sum', 'sum(numbers)', 'All the numbers added up', 8),
  F('min', 'min(a, b)  or  min(items)', 'The smallest one', 8),
  F('max', 'max(a, b)  or  max(items)', 'The largest one', 8),
  F('int', 'int(x)', 'Turn text or a float into a whole number', 8),
  F('str', 'str(x)', 'Turn a value into text', 8),
  F('list', 'list(items)', 'A new list from any sequence', 8),
  F('dict', 'dict()', 'A new dictionary', 6),
  F('set', 'set(items)', 'A collection with no duplicates and fast lookups', 7),
  F('zip', 'zip(a, b)', 'Pairs made from several sequences', 6),
  F('reversed', 'reversed(seq)', 'The items from last to first', 6),
  F('abs', 'abs(x)', 'Distance from zero', 6),
  F('any', 'any(items)', 'True when at least one item is true', 6),
  F('all', 'all(items)', 'True when every item is true', 6),
  F('float', 'float(x)', 'Turn a value into a number with a decimal point', 5),
  F('bool', 'bool(x)', 'True or False for a value', 5),
  F('tuple', 'tuple(items)', 'A sequence that cannot change', 5),
  F('isinstance', 'isinstance(x, kind)', 'Is x a value of that type?', 5),
  F('type', 'type(x)', 'The type of a value', 5),
  F('map', 'map(fn, items)', 'Apply a function to every item', 5),
  F('filter', 'filter(fn, items)', 'Keep the items for which fn is true', 5),
  F('round', 'round(x, digits)', 'Round to the nearest number', 5),
  F('ord', 'ord(ch)', 'The number code of a character', 5),
  F('chr', 'chr(n)', 'The character with that number code', 5),
  F('divmod', 'divmod(a, b)', 'The quotient and the remainder at once', 4),
  F('pow', 'pow(a, b)', 'a to the power b', 4),
  F('next', 'next(it)', 'The next item of an iterator', 4),
  F('iter', 'iter(x)', 'An iterator over x', 3),
  F('super', 'super()', 'The parent class, from inside a method', 4, true),
  F('repr', 'repr(x)', 'The text Python would print for x in a list', 3),
  F('hasattr', 'hasattr(obj, name)', 'Does the object have that attribute?', 3),
  F('getattr', 'getattr(obj, name)', 'Read an attribute by its name', 3),
  F('callable', 'callable(x)', 'Can x be called like a function?', 2),
  F('frozenset', 'frozenset(items)', 'A set that cannot change, usable as a dictionary key', 3),
  F('hash', 'hash(x)', 'The number Python uses to look x up', 2),
  F('bin', 'bin(n)', 'The number written in binary, as text', 3),
  F('hex', 'hex(n)', 'The number written in hexadecimal, as text', 2),
].concat(['ValueError', 'TypeError', 'IndexError', 'KeyError', 'ZeroDivisionError', 'StopIteration', 'Exception', 'RuntimeError', 'NotImplementedError']
  .map(n => ({ label: n, insert: n, kind: 'class', sig: n, doc: 'An error type, for raise and except', pri: 3 })));

const KEYWORDS = [['for', 'for ', 9], ['if', 'if ', 9], ['return', 'return ', 9], ['in', 'in ', 8], ['def', 'def ', 8], ['while', 'while ', 8], ['else', 'else:', 8], ['elif', 'elif ', 8],
  ['True', 'True', 8], ['False', 'False', 8], ['None', 'None', 8], ['not', 'not ', 7], ['and', 'and ', 7], ['or', 'or ', 7], ['break', 'break', 7], ['continue', 'continue', 7],
  ['pass', 'pass', 6], ['class', 'class ', 6], ['import', 'import ', 6], ['from', 'from ', 6], ['is', 'is ', 6], ['lambda', 'lambda ', 5], ['try', 'try:', 5], ['except', 'except ', 5],
  ['raise', 'raise ', 5], ['yield', 'yield ', 5], ['finally', 'finally:', 4], ['as', 'as ', 4], ['del', 'del ', 4], ['assert', 'assert ', 4], ['nonlocal', 'nonlocal ', 4], ['with', 'with ', 3], ['global', 'global ', 3]]
  .map(k => ({ label: k[0], insert: k[1], kind: 'kw', sig: '', doc: '', pri: k[2] }));
const KWSET = new Set(KEYWORDS.map(k => k.label));

// Whole lines the player can drop in. "|" marks where the caret lands.
const SNIPPETS = [
  ['for', 'for i in range(n):', 'for i in range(|):', 'Repeat a block a set number of times', 9],
  ['for', 'for i, x in enumerate(items):', 'for i, x in enumerate(|):', 'Loop with the position and the item', 7],
  ['for', 'for x in items:', 'for x in |:', 'Visit every item of a sequence', 8],
  ['while', 'while condition:', 'while |:', 'Repeat as long as the condition is true', 8],
  ['if', 'if condition:', 'if |:', 'Run a block only when the condition is true', 8],
  ['if', 'if … else', 'if |:\n    pass\nelse:\n    pass', 'Two branches', 6],
  ['def', 'def name(args):', 'def |():', 'Define your own function', 8],
  ['class', 'class with __init__', 'class |:\n    def __init__(self):\n        pass', 'A new kind of object', 6],
  ['try', 'try … except', 'try:\n    |\nexcept Exception as e:\n    pass', 'Catch an error instead of stopping', 5],
  ['print', 'print(f"…")', 'print(f"{|}")', 'Print text with values placed inside it', 6],
  ['lambda', 'lambda x: …', 'lambda x: |', 'A small function written in place', 5],
].map(s => ({ match: s[0], label: s[1], insert: s[2], kind: 'snip', sig: '', doc: s[3], pri: s[4] }));

const METHODS = {
  list: [M('append', 'append(x)', 'Add x at the end', 9), M('pop', 'pop()  or  pop(i)', 'Remove and return the last item, or the one at position i', 8, true),
    M('sort', 'sort(key=None, reverse=False)', 'Sort this list in place. It returns None', 8, true), M('insert', 'insert(i, x)', 'Put x at position i', 6),
    M('extend', 'extend(items)', 'Add every item of another sequence', 6), M('remove', 'remove(x)', 'Remove the first x. An error if there is none', 6),
    M('index', 'index(x)', 'Position of the first x', 6), M('count', 'count(x)', 'How many times x appears', 6), M('reverse', 'reverse()', 'Reverse this list in place', 6, true),
    M('copy', 'copy()', 'A separate copy of the list', 5, true), M('clear', 'clear()', 'Remove every item', 4, true)],
  str: [M('split', 'split(sep)', 'Cut the text into a list of pieces', 8), M('join', 'join(items)', 'Glue the items together with this text between them', 8),
    M('strip', 'strip()', 'A copy without spaces at both ends', 7, true), M('lower', 'lower()', 'A copy in lower case', 7, true), M('upper', 'upper()', 'A copy in upper case', 7, true),
    M('replace', 'replace(old, new)', 'A copy with every old swapped for new', 7), M('find', 'find(sub)', 'Position of sub, or -1 when it is not there', 6),
    M('startswith', 'startswith(prefix)', 'Does the text begin with prefix?', 6), M('endswith', 'endswith(suffix)', 'Does the text end with suffix?', 6),
    M('isdigit', 'isdigit()', 'Is it made of digits only?', 6, true), M('isalpha', 'isalpha()', 'Is it made of letters only?', 6, true), M('isalnum', 'isalnum()', 'Letters and digits only?', 6, true),
    M('count', 'count(sub)', 'How many times sub appears', 5), M('index', 'index(sub)', 'Position of sub. An error when it is not there', 5), M('title', 'title()', 'Each Word Capitalized', 4, true),
    M('capitalize', 'capitalize()', 'First letter in upper case', 4, true), M('lstrip', 'lstrip()', 'Without spaces at the start', 4, true), M('rstrip', 'rstrip()', 'Without spaces at the end', 4, true),
    M('isspace', 'isspace()', 'Only spaces?', 4, true), M('isupper', 'isupper()', 'All upper case?', 4, true), M('islower', 'islower()', 'All lower case?', 4, true),
    M('format', 'format(values)', 'Fill the {} places in the text', 4), M('zfill', 'zfill(width)', 'Pad with zeros on the left', 3), M('splitlines', 'splitlines()', 'A list of the lines', 3, true),
    M('rfind', 'rfind(sub)', 'Position of the last sub, or -1', 3), M('swapcase', 'swapcase()', 'Upper becomes lower and the reverse', 2, true), M('center', 'center(width)', 'Padded on both sides', 2),
    M('ljust', 'ljust(width)', 'Padded on the right', 2), M('rjust', 'rjust(width)', 'Padded on the left', 2), M('removeprefix', 'removeprefix(text)', 'Without that start', 2), M('removesuffix', 'removesuffix(text)', 'Without that end', 2)],
  dict: [M('get', 'get(key, default)', 'The value for key, or the default when the key is missing', 9), M('items', 'items()', 'Every (key, value) pair', 9, true),
    M('keys', 'keys()', 'Every key', 7, true), M('values', 'values()', 'Every value', 7, true), M('pop', 'pop(key)', 'Remove key and return its value', 6),
    M('setdefault', 'setdefault(key, default)', 'The value for key, storing the default first if it is missing', 5), M('update', 'update(other)', 'Copy every pair from another dictionary', 5),
    M('copy', 'copy()', 'A separate copy', 4, true), M('clear', 'clear()', 'Remove every pair', 3, true), M('popitem', 'popitem()', 'Remove and return the last pair', 2, true)],
  set: [M('add', 'add(x)', 'Put x in the set', 9), M('remove', 'remove(x)', 'Take x out. An error if it is missing', 6), M('discard', 'discard(x)', 'Take x out if it is there', 6),
    M('union', 'union(other)', 'Everything that is in either set', 5), M('intersection', 'intersection(other)', 'Only what both sets share', 5), M('difference', 'difference(other)', 'What this set has and the other lacks', 5),
    M('pop', 'pop()', 'Remove and return some item', 4, true), M('update', 'update(items)', 'Add many items', 4), M('issubset', 'issubset(other)', 'Is every item also in other?', 3),
    M('issuperset', 'issuperset(other)', 'Does it hold every item of other?', 3), M('copy', 'copy()', 'A separate copy', 3, true), M('clear', 'clear()', 'Remove every item', 3, true),
    M('isdisjoint', 'isdisjoint(other)', 'Do the sets share nothing?', 2), M('symmetric_difference', 'symmetric_difference(other)', 'What is in exactly one of the sets', 2)],
  deque: [M('popleft', 'popleft()', 'Remove and return the first item, in one step', 9, true), M('append', 'append(x)', 'Add x at the right end', 8), M('appendleft', 'appendleft(x)', 'Add x at the left end', 7),
    M('pop', 'pop()', 'Remove and return the last item', 7, true), M('extend', 'extend(items)', 'Add many items at the right end', 4), M('rotate', 'rotate(n)', 'Move the last n items to the front', 4),
    M('clear', 'clear()', 'Remove every item', 3, true), M('extendleft', 'extendleft(items)', 'Add many items at the left end', 2)],
  tuple: [M('count', 'count(x)', 'How many times x appears', 5), M('index', 'index(x)', 'Position of the first x', 5)],
};
METHODS.counter = [M('most_common', 'most_common(n)', 'The n most frequent items with their counts', 9), M('total', 'total()', 'The sum of all counts', 3, true), M('elements', 'elements()', 'Each item repeated as often as its count', 3, true)].concat(METHODS.dict);
// When the type of the thing before the dot is unknown, offer the methods a learner meets most, whatever they belong to.
const GENERIC = (() => { const seen = new Set(), out = []; for (const t of ['list', 'str', 'dict', 'set', 'deque']) for (const m of METHODS[t]) if (!seen.has(m.label)) { seen.add(m.label); out.push(m); } return out; })();

const MODULES = {
  math: [F('sqrt', 'math.sqrt(x)', 'Square root', 8), F('floor', 'math.floor(x)', 'Round down', 7), F('ceil', 'math.ceil(x)', 'Round up', 7), V('inf', 'A number larger than every other', 8), V('pi', '3.14159…', 5),
    F('gcd', 'math.gcd(a, b)', 'Greatest common divisor', 6), F('factorial', 'math.factorial(n)', 'n × (n-1) × … × 1', 5), F('isqrt', 'math.isqrt(n)', 'Whole-number square root', 5), F('log', 'math.log(x)', 'Natural logarithm', 4),
    F('log2', 'math.log2(x)', 'Logarithm base 2', 5), F('comb', 'math.comb(n, k)', 'Ways to choose k from n', 4), F('lcm', 'math.lcm(a, b)', 'Least common multiple', 4), F('pow', 'math.pow(a, b)', 'a to the power b, as a float', 3),
    F('prod', 'math.prod(items)', 'All the numbers multiplied', 4), F('hypot', 'math.hypot(x, y)', 'Length of the diagonal', 3), F('fabs', 'math.fabs(x)', 'Distance from zero, as a float', 2), F('log10', 'math.log10(x)', 'Logarithm base 10', 3),
    F('exp', 'math.exp(x)', 'e to the power x', 2), F('trunc', 'math.trunc(x)', 'Cut off the decimals', 2), V('e', '2.71828…', 2), V('nan', 'Not a number', 1)],
  collections: [F('deque', 'deque(items)', 'A list that is fast at both ends: the right tool for a queue', 9), F('defaultdict', 'defaultdict(list)', 'A dictionary that creates missing values by itself', 8),
    F('Counter', 'Counter(items)', 'Counts how often each item appears', 9), F('OrderedDict', 'OrderedDict()', 'A dictionary that can move keys to either end', 5), F('namedtuple', 'namedtuple(name, fields)', 'A tuple with named parts', 3)],
  heapq: [F('heappush', 'heapq.heappush(heap, x)', 'Add x, keeping the smallest item first', 9), F('heappop', 'heapq.heappop(heap)', 'Remove and return the smallest item', 9), F('heapify', 'heapq.heapify(items)', 'Turn a list into a heap, in place', 7),
    F('nlargest', 'heapq.nlargest(n, items)', 'The n largest items', 6), F('nsmallest', 'heapq.nsmallest(n, items)', 'The n smallest items', 6), F('heappushpop', 'heapq.heappushpop(heap, x)', 'Push x, then pop the smallest', 4),
    F('heapreplace', 'heapq.heapreplace(heap, x)', 'Pop the smallest, then push x', 3), F('merge', 'heapq.merge(a, b)', 'Merge sorted sequences into one', 3)],
  itertools: [F('permutations', 'permutations(items)', 'Every ordering of the items', 7), F('combinations', 'combinations(items, k)', 'Every way to pick k items', 7), F('product', 'product(a, b)', 'Every pair, like nested loops', 6),
    F('accumulate', 'accumulate(numbers)', 'Running totals', 6), F('chain', 'chain(a, b)', 'One sequence after the other', 5), F('count', 'count(start)', 'start, start+1, … without end', 4), F('zip_longest', 'zip_longest(a, b)', 'zip that keeps going to the longest', 4),
    F('groupby', 'groupby(items, key)', 'Runs of neighbouring items with the same key', 4), F('islice', 'islice(items, n)', 'The first n items of any iterator', 4), F('pairwise', 'pairwise(items)', 'Each item with the one after it', 4),
    F('cycle', 'cycle(items)', 'The items again and again', 3), F('repeat', 'repeat(x, n)', 'x, n times', 3)],
  functools: [F('lru_cache', '@lru_cache(maxsize=None)', 'Remember results, so each input is computed once', 9), F('cache', '@cache', 'Remember every result', 8, true), F('reduce', 'reduce(fn, items)', 'Fold a sequence into one value', 6),
    F('cmp_to_key', 'cmp_to_key(compare)', 'Use an old-style compare function as a sort key', 4), F('partial', 'partial(fn, args)', 'A function with some arguments already filled in', 4), F('wraps', '@wraps(fn)', 'Keep the name of a decorated function', 4)],
  bisect: [F('bisect_left', 'bisect_left(items, x)', 'Where x goes in a sorted list, before any equal items', 9), F('bisect_right', 'bisect_right(items, x)', 'Where x goes in a sorted list, after any equal items', 8),
    F('insort', 'insort(items, x)', 'Insert x and keep the list sorted', 6), F('bisect', 'bisect(items, x)', 'The same as bisect_right', 4)],
  string: [V('ascii_lowercase', "'abc…z'", 7), V('ascii_uppercase', "'ABC…Z'", 6), V('ascii_letters', 'Both alphabets', 5), V('digits', "'0123456789'", 6), V('punctuation', 'Every punctuation mark', 4)],
  random: [F('randint', 'random.randint(a, b)', 'A whole number from a to b, both included', 8), F('choice', 'random.choice(items)', 'One item, picked at random', 8), F('random', 'random.random()', 'A float from 0 up to 1', 6, true),
    F('shuffle', 'random.shuffle(items)', 'Mix a list in place', 6), F('sample', 'random.sample(items, k)', 'k different items', 4), F('seed', 'random.seed(n)', 'Make the randomness repeatable', 3), F('randrange', 'random.randrange(stop)', 'A whole number below stop', 4)],
  copy: [F('deepcopy', 'copy.deepcopy(x)', 'A copy that shares nothing with the original', 7), F('copy', 'copy.copy(x)', 'A copy of the outer container only', 5)],
  operator: [F('itemgetter', 'itemgetter(i)', 'A function that picks item i, handy as a sort key', 6), F('attrgetter', 'attrgetter(name)', 'A function that reads that attribute', 4), F('add', 'operator.add(a, b)', 'a + b', 3), F('mul', 'operator.mul(a, b)', 'a * b', 3)],
};
const MODNAMES = Object.keys(MODULES).map(n => ({ label: n, insert: n, kind: 'mod', sig: 'import ' + n, doc: '', pri: n === 'math' || n === 'collections' ? 8 : 6 }));
const ROBOT = { move: 'One step forward', turn_left: 'Quarter turn to the left', turn_right: 'Quarter turn to the right', collect: 'Pick up the shard under PIP', front_is_clear: 'Is the tile ahead free?',
  left_is_clear: 'Is the tile to the left free?', right_is_clear: 'Is the tile to the right free?', on_shard: 'Is PIP standing on a shard?', at_beacon: 'Is PIP on the beacon?', shards_left: 'How many shards are still on the deck' };
const KIND = { fn: 'function', method: 'method', kw: 'keyword', name: 'your name', snip: 'template', mod: 'module', value: 'value', cmd: 'PIP command', class: 'class', attr: 'attribute' };

// ---------------------------------------------------------------- reading the code around the caret
// The same text with strings and comments blanked out, so names inside them are not mistaken for code.
const NOISE = /(#[^\n]*)|("""[\s\S]*?(?:"""|$)|'''[\s\S]*?(?:'''|$)|"(?:[^"\\\n]|\\.)*"?|'(?:[^'\\\n]|\\.)*'?)/g;
const blank = text => text.replace(NOISE, m => m.replace(/[^\n]/g, ' '));
function inside(line) {                 // is the caret inside a string or a comment on this line?
  let q = null;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) { if (ch === '\\') i++; else if (ch === q) q = null; }
    else if (ch === '#') return true;
    else if (ch === '"' || ch === "'") q = ch;
  }
  return q !== null;
}
const LISTY = /^(nums|arr|array|items|lst|values|stack|queue|result|results|res|out|output|path|grid|matrix|board|intervals|heights|prices|words|strs|tokens|cells|rows|parts|pieces|digits|letters|chars|heap|order|nodes)$/;
const TEXTY = /^(s|t|text|word|line|name|string|pattern|sentence|message|msg|title|label)$/;
// A guess at what kind of value a name holds, from the nearest place it was given a value.
function typeOf(clean, name, pos) {
  if (MODULES[name] && new RegExp('\\bimport\\s+[\\w, ]*\\b' + name + '\\b').test(clean)) return 'mod:' + name;
  const re = new RegExp('(?:^|\\n)[ \\t]*(?:self\\.)?' + name + '[ \\t]*(?::[^=\\n]+)?=(?!=)[ \\t]*([^\\n]*)', 'g');
  let m, rhs = null;
  while ((m = re.exec(clean))) { if (m.index > pos) break; rhs = m[1]; }
  if (rhs !== null) {
    rhs = rhs.trim();
    if (/^(deque|collections\.deque)\s*\(/.test(rhs)) return 'deque';
    if (/^(Counter|collections\.Counter)\s*\(/.test(rhs)) return 'counter';
    if (/^(dict|defaultdict|OrderedDict|collections\.\w+)\s*\(/.test(rhs)) return 'dict';
    if (/^(set|frozenset)\s*\(/.test(rhs)) return 'set';
    if (/^(list|sorted)\s*\(/.test(rhs) || rhs[0] === '[' || /\.split\([^)]*\)$/.test(rhs)) return 'list';
    if (/^(str|input)\s*\(/.test(rhs) || /^[fFrRbB]?\s*$/.test(rhs) || /\.(join|strip|lower|upper|replace|title|format)\([^)]*\)$/.test(rhs)) return 'str';
    if (rhs[0] === '{') return rhs === '{}' || rhs.indexOf(':') > 0 ? 'dict' : 'set';
    if (rhs[0] === '(') return 'tuple';
    return null;
  }
  return LISTY.test(name) ? 'list' : TEXTY.test(name) ? 'str' : null;
}
function score(label, word) {
  if (!word) return 50;
  if (label.startsWith(word)) return 100 - Math.min(24, label.length - word.length) * 0.5;
  const l = label.toLowerCase(), w = word.toLowerCase();
  if (l.startsWith(w)) return 86 - Math.min(24, label.length - word.length) * 0.5;
  if (l[0] !== w[0] || w.length < 2) return 0;
  let i = 0;                               // letters in order, like "tl" for turn_left
  for (let k = 0; k < l.length && i < w.length; k++) if (l[k] === w[i]) i++;
  return i === w.length ? 52 : 0;
}

/* suggest(text, pos, opts) -> null, or { from, to, word, member, items: [{ label, insert, kind, kindText, sig, doc }] }
   opts.words: extra items for this level; opts.min: letters needed before names are offered; opts.limit: how many to return. */
function suggest(text, pos, opts) {
  opts = opts || {};
  const start = text.lastIndexOf('\n', pos - 1) + 1, line = text.slice(start, pos);
  if (inside(line)) return null;
  const word = (/[A-Za-z_]\w*$/.exec(line) || [''])[0], from = pos - word.length, before = line.slice(0, line.length - word.length);
  const clean = blank(text), limit = opts.limit || 8;
  let pool = [], member = false;
  if (/\.\s*$/.test(before) && !/\d\.\s*$/.test(before)) {
    member = true;
    const recv = (/([A-Za-z_][\w.]*)\s*\.\s*$/.exec(before) || [])[1], last = before.replace(/\s*\.\s*$/, '').slice(-1);
    if (recv === 'self') {
      const seen = new Set();
      let m;
      const attr = /\bself\.([A-Za-z_]\w*)\s*(?::[^=\n]+)?=(?!=)/g, meth = /\bdef\s+([A-Za-z_]\w*)\s*\(\s*self\b([^)]*)\)/g;
      while ((m = attr.exec(clean))) if (!seen.has(m[1])) { seen.add(m[1]); pool.push({ label: m[1], insert: m[1], kind: 'attr', sig: 'self.' + m[1], doc: '', pri: 7 }); }
      while ((m = meth.exec(clean))) if (!seen.has(m[1]) && !/^__/.test(m[1])) { seen.add(m[1]); const args = m[2].replace(/^\s*,\s*/, '').trim(); pool.push({ label: m[1], insert: m[1] + (args ? '(|)' : '()'), kind: 'method', sig: m[1] + '(' + args + ')', doc: '', pri: 7 }); }
    } else if (recv && recv.indexOf('.') < 0) {
      const t = typeOf(clean, recv, pos);
      pool = !t ? GENERIC : t.slice(0, 4) === 'mod:' ? MODULES[t.slice(4)] : METHODS[t] || GENERIC;
    } else if (last === '"' || last === "'") pool = METHODS.str;
    else if (recv && /^self\.\w+$/.test(recv)) { const t = typeOf(clean, recv.slice(5), pos); pool = METHODS[t] || GENERIC; }
    else pool = GENERIC;
  } else {
    const fromImport = /^\s*from\s+(\w+)\s+import\s+(?:[\w, ]*,\s*)?$/.exec(before);
    if (fromImport) pool = MODULES[fromImport[1]] || [];
    else if (/^\s*(?:import|from)\s+(?:[\w, ]*,\s*)?$/.test(before)) pool = MODNAMES;
    else {
      if (/\b(def|class|for|as|lambda|global|nonlocal|del)\s+$/.test(before) || /^\s*def\s+\w+\s*\([^)]*$/.test(line)) return null;       // the player is naming something new
      if (word.length < (opts.min || 1)) return null;
      // names the player has used anywhere in the code
      const locals = new Map(), re = /[A-Za-z_]\w*/g;
      let m;
      while ((m = re.exec(clean))) {
        const w = m[0];
        if (m.index === from || KWSET.has(w) || clean[m.index - 1] === '.') continue;
        const d = Math.abs(m.index - pos), e = locals.get(w);
        if (!e || d < e.d) locals.set(w, { d });
      }
      const defs = new Map();
      const dre = /\b(def|class)\s+([A-Za-z_]\w*)\s*(\(([^)]*)\))?/g;
      while ((m = dre.exec(clean))) defs.set(m[2], m[1] === 'def' ? '(' + (m[4] || '').trim() + ')' : '');
      const taken = new Set();
      for (const w of (opts.words || [])) { taken.add(w.label); pool.push(Object.assign({ pri: 9, bonus: 14 }, w)); }
      locals.forEach((e, w) => {
        if (taken.has(w)) return;
        taken.add(w);
        const sig = defs.get(w);
        pool.push({ label: w, insert: sig !== undefined ? w + (sig === '()' ? '()' : '(|)') : w, kind: sig === undefined ? 'name' : sig === '' ? 'class' : 'fn', sig: sig !== undefined ? w + sig : '', doc: '', pri: 7, bonus: 10 + Math.max(0, 6 - e.d / 80) });
      });
      for (const s of SNIPPETS) pool.push(s);
      for (const b of BUILTINS) if (!taken.has(b.label)) pool.push(b);
      for (const k of KEYWORDS) pool.push(k);
    }
  }
  const ranked = [];
  for (const it of pool) {
    const s = score(it.match || it.label, word);
    if (s <= 0) continue;
    if (it.kind !== 'snip' && it.label === word && it.insert.replace('|', '') === word) continue;      // already typed in full
    ranked.push({ it, s: s + (it.pri || 4) * 1.6 + (it.bonus || 0) });
  }
  if (!ranked.length) return null;
  ranked.sort((a, b) => b.s - a.s || a.it.label.length - b.it.label.length);
  return { from, to: pos, word, member, items: ranked.slice(0, limit).map(r => ({ label: r.it.label, insert: r.it.insert, kind: r.it.kind, kindText: KIND[r.it.kind] || '', sig: r.it.sig || '', doc: r.it.doc || '' })) };
}
// Items for the commands a drone level has introduced so far, e.g. ['move()', 'turn_left()', 'for i in range(n):'].
function robotWords(commands) {
  const out = [];
  for (const c of commands || []) { const m = /^(\w+)\(\)$/.exec(c); if (m && ROBOT[m[1]]) out.push({ label: m[1], insert: m[1] + '()', kind: 'cmd', sig: m[1] + '()', doc: ROBOT[m[1]] }); }
  return out;
}

root.PylonComplete = { suggest, robotWords, METHODS, MODULES, BUILTINS };
if (typeof module !== 'undefined' && module.exports) module.exports = root.PylonComplete;
})(typeof window !== 'undefined' ? window : globalThis);
