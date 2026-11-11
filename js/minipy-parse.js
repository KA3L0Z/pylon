/* MiniPy part 2 of 5: tokenizer and parser. Produces a plain-object AST; every node has `t` (type) and `line`. */
(function (root) {
'use strict';
const MP = root.MiniPy;
const { PySyntax, PyFloat, norm } = MP;

const KEYWORDS = new Set(['False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await', 'break', 'class', 'continue', 'def', 'del',
  'elif', 'else', 'except', 'finally', 'for', 'from', 'global', 'if', 'import', 'in', 'is', 'lambda', 'nonlocal', 'not', 'or', 'pass',
  'raise', 'return', 'try', 'while', 'with', 'yield']);
const OPS3 = new Set(['**=', '//=', '>>=', '<<=', '...']);
const OPS2 = new Set(['**', '//', '>>', '<<', '<=', '>=', '==', '!=', '->', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', ':=', '@=']);
const OPS1 = '+-*/%@&|^~<>()[]{},:.;=';
const AUG = new Set(['+=', '-=', '*=', '/=', '//=', '%=', '**=', '>>=', '<<=', '&=', '|=', '^=', '@=']);
const NUM = /(?:0[xX][0-9a-fA-F_]+|0[bB][01_]+|0[oO][0-7_]+|(?:\d[\d_]*)?\.\d[\d_]*(?:[eE][+-]?\d[\d_]*)?|\d[\d_]*\.?(?:[eE][+-]?\d[\d_]*)?)[jJ]?/y;
const NAME = /[A-Za-z_\u0080-￿][A-Za-z0-9_\u0080-￿]*/y;
const STRSTART = /([rRbBuUfF]{1,2})?('''|"""|'|")/y;
const CLOSER = { '(': ')', '[': ']', '{': '}' };

function unescape(s) {
  if (s.indexOf('\\') < 0) return s;
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c !== '\\') { out += c; continue; }
    const d = s[++i];
    switch (d) {
      case 'n': out += '\n'; break;
      case 't': out += '\t'; break;
      case 'r': out += '\r'; break;
      case '\\': out += '\\'; break;
      case "'": out += "'"; break;
      case '"': out += '"'; break;
      case 'a': out += '\x07'; break;
      case 'b': out += '\b'; break;
      case 'f': out += '\f'; break;
      case 'v': out += '\v'; break;
      case '\n': break;
      case 'x': { const h = s.substr(i + 1, 2); if (/^[0-9a-fA-F]{2}$/.test(h)) { out += String.fromCharCode(parseInt(h, 16)); i += 2; } else out += '\\x'; break; }
      case 'u': { const h = s.substr(i + 1, 4); if (/^[0-9a-fA-F]{4}$/.test(h)) { out += String.fromCharCode(parseInt(h, 16)); i += 4; } else out += '\\u'; break; }
      case 'U': { const h = s.substr(i + 1, 8); if (/^[0-9a-fA-F]{8}$/.test(h)) { out += String.fromCodePoint(parseInt(h, 16)); i += 8; } else out += '\\U'; break; }
      default:
        if (d >= '0' && d <= '7') { let o = d; while (o.length < 3 && s[i + 1] >= '0' && s[i + 1] <= '7') o += s[++i]; out += String.fromCharCode(parseInt(o, 8)); }
        else if (d === undefined) out += '\\';
        else out += '\\' + d;
    }
  }
  return out;
}

function tokenize(src, lineBase) {
  src = src.replace(/\r\n?/g, '\n');
  const toks = [], indents = [0], opens = [], n = src.length;
  let i = 0, line = 1 + (lineBase || 0), atStart = true;
  const push = (t, v) => { toks.push({ t, v, line }); };
  while (i < n) {
    if (atStart && opens.length === 0) {
      let col = 0, j = i;
      for (; j < n; j++) { const c = src[j]; if (c === ' ') col++; else if (c === '\t') col = ((col >> 3) + 1) << 3; else if (c === '\f') col = 0; else break; }
      if (j >= n) { i = j; break; }
      if (src[j] === '\n') { i = j + 1; line++; continue; }
      if (src[j] === '#') { while (j < n && src[j] !== '\n') j++; i = j; continue; }
      i = j;
      if (col > indents[indents.length - 1]) { indents.push(col); push('indent'); }
      else if (col < indents[indents.length - 1]) {
        while (col < indents[indents.length - 1]) { indents.pop(); push('dedent'); }
        if (col !== indents[indents.length - 1]) throw new PySyntax('unindent does not match any outer indentation level', line, 'IndentationError');
      }
      atStart = false;
    }
    const c = src[i];
    if (c === '\n') { if (opens.length === 0) { push('nl'); atStart = true; } i++; line++; continue; }
    if (c === ' ' || c === '\t' || c === '\f') { i++; continue; }
    if (c === '#') { while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '\\') {
      if (src[i + 1] === '\n') { i += 2; line++; continue; }
      throw new PySyntax('unexpected character after line continuation character', line);
    }
    STRSTART.lastIndex = i;
    const sm = STRSTART.exec(src);
    if (sm) {
      const prefix = (sm[1] || '').toLowerCase(), q = sm[2], startLine = line;
      if (prefix.indexOf('b') >= 0) throw new PySyntax("bytes literals (b'...') are not available in Pylon's Python", line);
      const raw = prefix.indexOf('r') >= 0, isF = prefix.indexOf('f') >= 0;
      let j = i + sm[0].length;
      const bodyStart = j;
      for (;;) {
        if (j >= n) throw new PySyntax(q.length === 3 ? 'unterminated triple-quoted string literal (detected at line ' + line + ')' : 'unterminated string literal (detected at line ' + startLine + ')', startLine);
        const d = src[j];
        if (d === '\\') { if (src[j + 1] === '\n') line++; j += 2; continue; }
        if (d === '\n') { if (q.length === 1) throw new PySyntax('unterminated string literal (detected at line ' + startLine + ')', startLine); line++; j++; continue; }
        if (src.startsWith(q, j)) break;
        j++;
      }
      const body = src.slice(bodyStart, j);
      i = j + q.length;
      if (isF) toks.push({ t: 'fstr', v: { body, raw }, line: startLine });
      else toks.push({ t: 'str', v: raw ? body : unescape(body), line: startLine });
      continue;
    }
    if ((c >= '0' && c <= '9') || (c === '.' && src[i + 1] >= '0' && src[i + 1] <= '9')) {
      NUM.lastIndex = i;
      const m = NUM.exec(src), text = m[0];
      i += text.length;
      NAME.lastIndex = i;
      if (NAME.test(src)) throw new PySyntax('invalid decimal literal', line);
      if (/[jJ]$/.test(text)) throw new PySyntax("complex numbers are not available in Pylon's Python", line);
      const clean = text.replace(/_/g, '');
      let v;
      if (/^0[xXbBoO]/.test(clean)) v = norm(BigInt(clean));
      else if (/[.eE]/.test(clean)) v = new PyFloat(parseFloat(clean));
      else {
        if (/^0\d/.test(clean) && !/^0+$/.test(clean)) throw new PySyntax('leading zeros in decimal integer literals are not permitted', line);
        v = clean.length <= 15 ? Number(clean) : norm(BigInt(clean));
      }
      push('num', v);
      continue;
    }
    NAME.lastIndex = i;
    const nm = NAME.exec(src);
    if (nm) { i += nm[0].length; push(KEYWORDS.has(nm[0]) ? 'kw' : 'name', nm[0]); continue; }
    const three = src.substr(i, 3), two = src.substr(i, 2);
    let op = null;
    if (OPS3.has(three)) op = three; else if (OPS2.has(two)) op = two; else if (OPS1.indexOf(c) >= 0) op = c;
    if (op === null) {
      if (c === '!') throw new PySyntax("invalid syntax. Python writes 'not' instead of '!'", line);
      if (c === '$' || c === '?' || c === '`') throw new PySyntax("invalid syntax: '" + c + "' is not used in Python", line);
      throw new PySyntax("invalid character '" + c + "'", line);
    }
    if (op === '(' || op === '[' || op === '{') opens.push({ c: op, line });
    else if (op === ')' || op === ']' || op === '}') {
      const o = opens.pop();
      if (!o) throw new PySyntax("unmatched '" + op + "'", line);
      if (CLOSER[o.c] !== op) throw new PySyntax("closing parenthesis '" + op + "' does not match opening parenthesis '" + o.c + "'" + (o.line !== line ? ' on line ' + o.line : ''), line);
    }
    push('op', op);
    i += op.length;
  }
  if (opens.length) { const o = opens[opens.length - 1]; throw new PySyntax("'" + o.c + "' was never closed", o.line); }
  if (toks.length && toks[toks.length - 1].t !== 'nl') push('nl');
  while (indents.length > 1) { indents.pop(); push('dedent'); }
  push('eof');
  return toks;
}

const BINLEVELS = [['|'], ['^'], ['&'], ['<<', '>>'], ['+', '-'], ['*', '/', '//', '%', '@']];
const CMPOPS = new Set(['<', '>', '==', '>=', '<=', '!=']);

function parser(toks) {
  let p = 0;
  const peek = () => toks[p];
  const isOp = v => { const t = toks[p]; return t.t === 'op' && t.v === v; };
  const isKw = v => { const t = toks[p]; return t.t === 'kw' && t.v === v; };
  const eatOp = v => { if (isOp(v)) { p++; return true; } return false; };
  const eatKw = v => { if (isKw(v)) { p++; return true; } return false; };
  function fail(msg, tok, kind) { throw new PySyntax(msg || 'invalid syntax', (tok || toks[Math.min(p, toks.length - 1)]).line, kind); }
  function expectOp(v) {
    if (eatOp(v)) return;
    if (v === ':') fail("expected ':'", toks[Math.max(0, p - 1)]);
    fail(peek().t === 'nl' || peek().t === 'eof' ? "invalid syntax: expected '" + v + "'" : 'invalid syntax');
  }
  function ident() {
    const t = peek();
    if (t.t !== 'name') fail(t.t === 'kw' ? "'" + t.v + "' is a reserved word and cannot be used as a name" : 'invalid syntax');
    p++; return t.v;
  }
  const startsExpr = () => {
    const t = peek();
    if (t.t === 'name' || t.t === 'num' || t.t === 'str' || t.t === 'fstr') return true;
    if (t.t === 'kw') return t.v === 'None' || t.v === 'True' || t.v === 'False' || t.v === 'not' || t.v === 'lambda' || t.v === 'yield' || t.v === 'await';
    if (t.t === 'op') return t.v === '(' || t.v === '[' || t.v === '{' || t.v === '-' || t.v === '+' || t.v === '~' || t.v === '*' || t.v === '...';
    return false;
  };
  const endOfSimple = () => { const t = peek(); return t.t === 'nl' || t.t === 'eof' || (t.t === 'op' && t.v === ';'); };

  // ---- statements
  function parseModule() {
    const body = [];
    while (peek().t !== 'eof') {
      if (peek().t === 'nl') { p++; continue; }
      if (peek().t === 'indent') fail('unexpected indent', null, 'IndentationError');
      if (peek().t === 'dedent') { p++; continue; }
      parseStmt(body);
    }
    return { t: 'Module', line: 1, body };
  }
  function parseStmt(out) {
    const tok = peek();
    if (tok.t === 'kw') {
      switch (tok.v) {
        case 'if': out.push(parseIf()); return;
        case 'while': out.push(parseWhile()); return;
        case 'for': out.push(parseFor()); return;
        case 'def': out.push(parseDef([])); return;
        case 'class': out.push(parseClass([])); return;
        case 'try': out.push(parseTry()); return;
        case 'with': out.push(parseWith()); return;
        case 'async': fail("async code is not available in Pylon's Python");
      }
    } else if (tok.t === 'op' && tok.v === '@') {
      const decorators = [];
      while (eatOp('@')) { decorators.push(parseNamedExpr()); if (peek().t !== 'nl') fail(); p++; }
      if (isKw('def')) out.push(parseDef(decorators));
      else if (isKw('class')) out.push(parseClass(decorators));
      else fail('invalid syntax: a decorator must be followed by def or class');
      return;
    } else if (tok.t === 'name' && tok.v === 'match' && toks[p + 1].t !== 'op' && toks[p + 1].t !== 'nl') {
      fail("match/case is not available in Pylon's Python. Use if/elif instead");
    }
    parseSimpleLine(out);
  }
  function parseSimpleLine(out) {
    for (;;) {
      out.push(parseSimple());
      if (eatOp(';')) { if (peek().t === 'nl' || peek().t === 'eof') break; continue; }
      break;
    }
    if (peek().t === 'nl') { p++; return; }
    if (peek().t === 'eof') return;
    const prev = out[out.length - 1], t = peek();
    if (prev && prev.t === 'Expr' && prev.value.t === 'Name') {
      if (prev.value.id === 'print') fail("Missing parentheses in call to 'print'. Did you mean print(...)?");
      if (t.t === 'name' || t.t === 'num' || t.t === 'str') fail('invalid syntax. Two things are side by side with nothing between them. Is a comma, an operator or a pair of parentheses missing?');
    }
    if (t.t === 'op' && (t.v === '+' || t.v === '-') && toks[p - 1].t === 'op' && toks[p - 1].v === t.v) fail("invalid syntax. Python has no ++ or --. Write x += 1 or x -= 1");
    if (t.t === 'op' && t.v === '{') fail('invalid syntax. Python uses a colon and indentation for blocks, not braces');
    fail();
  }
  function parseBlock(what, startTok) {
    if (!eatOp(':')) {
      if (isOp('{')) fail('invalid syntax. Python uses a colon and indentation for blocks, not braces');
      if (isOp('=')) fail("invalid syntax. Maybe you meant '==' or ':=' instead of '='?");
      fail("expected ':'", toks[Math.max(0, p - 1)]);
    }
    const body = [];
    if (peek().t === 'nl') {
      p++;
      if (peek().t !== 'indent') throw new PySyntax('expected an indented block after ' + what + ' on line ' + startTok.line, peek().t === 'eof' ? startTok.line + 1 : peek().line, 'IndentationError');
      p++;
      while (peek().t !== 'dedent' && peek().t !== 'eof') {
        if (peek().t === 'nl') { p++; continue; }
        if (peek().t === 'indent') fail('unexpected indent', null, 'IndentationError');
        parseStmt(body);
      }
      if (peek().t === 'dedent') p++;
    } else parseSimpleLine(body);
    return body;
  }
  function parseCond() {
    const e = parseNamedExpr();
    if (isOp('=')) fail("invalid syntax. Maybe you meant '==' or ':=' instead of '='?");
    return e;
  }
  function parseIf() {
    const tok = toks[p++], test = parseCond(), body = parseBlock("'" + tok.v + "' statement", tok);
    let orelse = [];
    if (isKw('elif')) orelse = [parseIf()];
    else if (isKw('else')) {
      const e = toks[p++];
      if (isKw('if')) fail("invalid syntax. Write 'elif' instead of 'else if'");
      orelse = parseBlock("'else' statement", e);
    }
    return { t: 'If', line: tok.line, test, body, orelse };
  }
  function parseElse() {
    if (!isKw('else')) return [];
    const e = toks[p++];
    return parseBlock("'else' statement", e);
  }
  function parseWhile() {
    const tok = toks[p++], test = parseCond(), body = parseBlock("'while' statement", tok);
    return { t: 'While', line: tok.line, test, body, orelse: parseElse() };
  }
  function parseFor() {
    const tok = toks[p++], target = toTarget(parseTargetList());
    if (!eatKw('in')) fail("invalid syntax: a for loop needs 'in'");
    const it = parseTestListStar(), body = parseBlock("'for' statement", tok);
    return { t: 'For', line: tok.line, target, iter: it, body, orelse: parseElse() };
  }
  function parseParams(isLambda) {
    const a = { args: [], vararg: null, kwonly: [], kwarg: null };
    let seenStar = false, seenDefault = false;
    const atEnd = () => isLambda ? isOp(':') : isOp(')');
    while (!atEnd()) {
      if (eatOp('**')) { a.kwarg = ident(); if (!isLambda && eatOp(':')) parseTest(); }
      else if (eatOp('*')) { seenStar = true; if (peek().t === 'name') { a.vararg = ident(); if (!isLambda && eatOp(':')) parseTest(); } }
      else if (eatOp('/')) { /* positional-only marker: accepted and ignored */ }
      else {
        const name = ident();
        if (!isLambda && eatOp(':')) parseTest();
        let def = null;
        if (eatOp('=')) def = parseTest();
        if (seenStar) a.kwonly.push({ name, default: def });
        else {
          if (def === null && seenDefault) fail('non-default argument follows default argument');
          if (def !== null) seenDefault = true;
          a.args.push({ name, default: def });
        }
      }
      if (!eatOp(',')) break;
    }
    return a;
  }
  function parseDef(decorators) {
    const tok = toks[p++], name = ident();
    if (!eatOp('(')) fail("expected '('");
    const args = parseParams(false);
    expectOp(')');
    if (eatOp('->')) parseTest();
    const body = parseBlock('function definition', tok);
    return { t: 'FunctionDef', line: tok.line, name, args, body, decorators };
  }
  function parseClass(decorators) {
    const tok = toks[p++], name = ident();
    let bases = [], keywords = [];
    if (eatOp('(')) { const c = parseCallArgs(); bases = c.args; keywords = c.keywords; }
    const body = parseBlock('class definition', tok);
    return { t: 'ClassDef', line: tok.line, name, bases, keywords, body, decorators };
  }
  function parseTry() {
    const tok = toks[p++], body = parseBlock("'try' statement", tok), handlers = [];
    while (isKw('except')) {
      const et = toks[p++];
      if (isOp('*')) fail("except* is not available in Pylon's Python");
      let type = null, name = null;
      if (!isOp(':')) { type = parseTest(); if (eatKw('as')) name = ident(); }
      handlers.push({ type, name, line: et.line, body: parseBlock("'except' statement", et) });
    }
    const orelse = handlers.length ? parseElse() : [];
    let finalbody = null;
    if (isKw('finally')) { const ft = toks[p++]; finalbody = parseBlock("'finally' statement", ft); }
    if (!handlers.length && !finalbody) fail("expected 'except' or 'finally' block");
    return { t: 'Try', line: tok.line, body, handlers, orelse, finalbody };
  }
  function parseWith() {
    const tok = toks[p++], items = [];
    do {
      const ctx = parseTest();
      let target = null;
      if (eatKw('as')) target = toTarget(parseBin(0));
      items.push({ ctx, target });
    } while (eatOp(','));
    let node = null;
    const body = parseBlock("'with' statement", tok);
    for (let i = items.length - 1; i >= 0; i--) node = { t: 'With', line: tok.line, ctx: items[i].ctx, target: items[i].target, body: node ? [node] : body };
    return node;
  }
  function dottedName() { let n = ident(); while (eatOp('.')) n += '.' + ident(); return n; }
  function parseSimple() {
    const tok = peek(), line = tok.line;
    if (tok.t === 'kw') {
      switch (tok.v) {
        case 'pass': p++; return { t: 'Pass', line };
        case 'break': p++; return { t: 'Break', line };
        case 'continue': p++; return { t: 'Continue', line };
        case 'return': p++; return { t: 'Return', line, value: endOfSimple() ? null : parseTestListStar() };
        case 'raise': {
          p++;
          let exc = null, cause = null;
          if (!endOfSimple()) { exc = parseTest(); if (eatKw('from')) cause = parseTest(); }
          return { t: 'Raise', line, exc, cause };
        }
        case 'global': case 'nonlocal': {
          p++;
          const names = [ident()];
          while (eatOp(',')) names.push(ident());
          return { t: tok.v === 'global' ? 'Global' : 'Nonlocal', line, names };
        }
        case 'del': {
          p++;
          const e = parseTargetList();
          return { t: 'Delete', line, targets: (e.t === 'Tuple' ? e.elts : [e]).map(toTarget) };
        }
        case 'assert': {
          p++;
          const test = parseTest();
          return { t: 'Assert', line, test, msg: eatOp(',') ? parseTest() : null };
        }
        case 'import': {
          p++;
          const names = [];
          do { const name = dottedName(); names.push({ name, asname: eatKw('as') ? ident() : null }); } while (eatOp(','));
          return { t: 'Import', line, names };
        }
        case 'from': {
          p++;
          while (eatOp('.') || eatOp('...')) { /* relative imports make no sense here; the name decides */ }
          const module = dottedName();
          if (!eatKw('import')) fail("invalid syntax: expected 'import'");
          if (eatOp('*')) return { t: 'ImportFrom', line, module, names: null };
          const paren = eatOp('('), names = [];
          do { if (paren && isOp(')')) break; const name = ident(); names.push({ name, asname: eatKw('as') ? ident() : null }); } while (eatOp(','));
          if (paren) expectOp(')');
          return { t: 'ImportFrom', line, module, names };
        }
        case 'yield': return { t: 'Expr', line, value: parseYield() };
        case 'else': case 'elif': fail("invalid syntax. This '" + tok.v + "' has no matching 'if' at the same indentation");
        case 'except': case 'finally': fail("invalid syntax. This '" + tok.v + "' has no matching 'try' at the same indentation");
        case 'await': fail("async code is not available in Pylon's Python");
      }
    }
    const first = parseTestListStar();
    if (isOp(':') && (first.t === 'Name' || first.t === 'Attribute' || first.t === 'Subscript')) {
      p++;
      parseTest();
      return { t: 'AnnAssign', line, target: first, value: eatOp('=') ? parseAssignValue() : null };
    }
    const t = peek();
    if (t.t === 'op' && AUG.has(t.v)) {
      p++;
      if (first.t !== 'Name' && first.t !== 'Attribute' && first.t !== 'Subscript') fail("'" + describe(first) + "' is an illegal expression for augmented assignment", tok);
      return { t: 'AugAssign', line, target: first, op: t.v.slice(0, -1), value: parseAssignValue() };
    }
    if (isOp('=')) {
      const targets = [first];
      let value = null;
      while (eatOp('=')) { value = parseAssignValue(); if (isOp('=')) targets.push(value); }
      return { t: 'Assign', line, targets: targets.map(toTarget), value };
    }
    return { t: 'Expr', line, value: first };
  }
  function parseAssignValue() { return isKw('yield') ? parseYield() : parseTestListStar(); }
  function parseYield() {
    const tok = toks[p++];
    if (eatKw('from')) return { t: 'YieldFrom', line: tok.line, value: parseTest() };
    return { t: 'Yield', line: tok.line, value: endOfSimple() || isOp(')') ? null : parseTestListStar() };
  }
  function describe(n) {
    switch (n.t) {
      case 'Call': return 'function call';
      case 'Num': case 'Str': case 'FStr': return 'literal';
      case 'Const': return n.v === null ? 'None' : n.v === true ? 'True' : n.v === false ? 'False' : 'Ellipsis';
      case 'BinOp': case 'UnaryOp': case 'BoolOp': return 'expression';
      case 'Compare': return 'comparison';
      case 'Lambda': return 'lambda';
      case 'IfExp': return 'conditional expression';
      case 'Dict': return 'dict literal';
      case 'Set': return 'set display';
      case 'ListComp': return 'list comprehension';
      case 'GeneratorExp': return 'generator expression';
      default: return 'expression';
    }
  }
  function toTarget(n) {
    switch (n.t) {
      case 'Name': case 'Attribute': case 'Subscript': return n;
      case 'Tuple': case 'List': {
        let stars = 0;
        const elts = n.elts.map(e => { if (e.t === 'Starred') { stars++; return { t: 'Starred', line: e.line, value: toTarget(e.value) }; } return toTarget(e); });
        if (stars > 1) fail('multiple starred expressions in assignment', n);
        return { t: 'Tuple', line: n.line, elts };
      }
      case 'Starred': fail('starred assignment target must be in a list or tuple', n);
    }
    const d = describe(n);
    fail('cannot assign to ' + d + (d === 'None' || d === 'True' || d === 'False' ? '' : " here. Maybe you meant '==' instead of '='?"), n);
  }

  // ---- expressions
  function parseStarOrTest() {
    if (isOp('*')) { const tok = toks[p++]; return { t: 'Starred', line: tok.line, value: parseBin(0) }; }
    return parseNamedExpr();
  }
  function parseTestListStar() {
    const tok = peek(), first = parseStarOrTest();
    if (!isOp(',')) { if (first.t === 'Starred') fail("can't use starred expression here", tok); return first; }
    const elts = [first];
    while (eatOp(',')) { if (startsExpr()) elts.push(parseStarOrTest()); else break; }
    return { t: 'Tuple', line: tok.line, elts };
  }
  function parseTargetList() {
    const tok = peek(), one = () => { if (isOp('*')) { const st = toks[p++]; return { t: 'Starred', line: st.line, value: parseBin(0) }; } return parseBin(0); };
    const first = one();
    if (!isOp(',')) return first;
    const elts = [first];
    while (eatOp(',')) { if (startsExpr()) elts.push(one()); else break; }
    return { t: 'Tuple', line: tok.line, elts };
  }
  function parseNamedExpr() {
    const tok = peek();
    if (tok.t === 'name' && toks[p + 1].t === 'op' && toks[p + 1].v === ':=') {
      p += 2;
      return { t: 'NamedExpr', line: tok.line, target: { t: 'Name', line: tok.line, id: tok.v }, value: parseTest() };
    }
    return parseTest();
  }
  function parseTest() {
    if (isKw('lambda')) {
      const tok = toks[p++], args = parseParams(true);
      expectOp(':');
      return { t: 'Lambda', line: tok.line, args, body: parseTest() };
    }
    const tok = peek(), e = parseOr();
    if (isKw('if')) {
      p++;
      const test = parseOr();
      if (!eatKw('else')) fail("expected 'else' after 'if' expression");
      return { t: 'IfExp', line: tok.line, test, body: e, orelse: parseTest() };
    }
    return e;
  }
  function parseOr() {
    const tok = peek(), first = parseAnd();
    if (!isKw('or')) return first;
    const values = [first];
    while (eatKw('or')) values.push(parseAnd());
    return { t: 'BoolOp', line: tok.line, op: 'or', values };
  }
  function parseAnd() {
    const tok = peek(), first = parseNot();
    if (!isKw('and')) return first;
    const values = [first];
    while (eatKw('and')) values.push(parseNot());
    return { t: 'BoolOp', line: tok.line, op: 'and', values };
  }
  function parseNot() {
    if (isKw('not')) { const tok = toks[p++]; return { t: 'UnaryOp', line: tok.line, op: 'not', operand: parseNot() }; }
    return parseComparison();
  }
  function parseComparison() {
    const tok = peek(), left = parseBin(0);
    let ops = null, comparators = null;
    for (;;) {
      const t = peek();
      let op = null;
      if (t.t === 'op' && CMPOPS.has(t.v)) { op = t.v; p++; }
      else if (t.t === 'kw' && t.v === 'in') { op = 'in'; p++; }
      else if (t.t === 'kw' && t.v === 'not' && toks[p + 1].t === 'kw' && toks[p + 1].v === 'in') { op = 'not in'; p += 2; }
      else if (t.t === 'kw' && t.v === 'is') { p++; op = eatKw('not') ? 'is not' : 'is'; }
      else break;
      (ops || (ops = [])).push(op);
      (comparators || (comparators = [])).push(parseBin(0));
    }
    return ops ? { t: 'Compare', line: tok.line, left, ops, comparators } : left;
  }
  function parseBin(level) {
    if (level === BINLEVELS.length) return parseFactor();
    const ops = BINLEVELS[level];
    let left = parseBin(level + 1);
    for (;;) {
      const t = peek();
      if (t.t !== 'op' || ops.indexOf(t.v) < 0) return left;
      p++;
      left = { t: 'BinOp', line: t.line, op: t.v, left, right: parseBin(level + 1) };
    }
  }
  function parseFactor() {
    const t = peek();
    if (t.t === 'op' && (t.v === '-' || t.v === '+' || t.v === '~')) { p++; return { t: 'UnaryOp', line: t.line, op: t.v, operand: parseFactor() }; }
    const base = parsePrimary();
    if (isOp('**')) { const o = toks[p++]; return { t: 'BinOp', line: o.line, op: '**', left: base, right: parseFactor() }; }
    return base;
  }
  function parseCallArgs() {
    const args = [], keywords = [];
    while (!isOp(')')) {
      const tok = peek();
      if (eatOp('**')) keywords.push({ arg: null, value: parseTest() });
      else if (eatOp('*')) args.push({ t: 'Starred', line: tok.line, value: parseTest() });
      else {
        const e = parseNamedExpr();
        if (isOp('=')) {
          if (e.t !== 'Name') fail('expression cannot contain assignment, perhaps you meant "=="?', tok);
          p++;
          keywords.push({ arg: e.id, value: parseTest() });
        } else if (isKw('for')) {
          args.push({ t: 'GeneratorExp', line: tok.line, elt: e, generators: parseCompFor() });
        } else {
          if (keywords.some(k => k.arg !== null)) fail('positional argument follows keyword argument', tok);
          args.push(e);
        }
      }
      if (!eatOp(',')) break;
    }
    if (!eatOp(')')) fail(peek().t === 'nl' || peek().t === 'eof' ? "'(' was never closed" : 'invalid syntax. Perhaps you forgot a comma?');
    return { args, keywords };
  }
  function parseCompFor() {
    const gens = [];
    while (isKw('for')) {
      p++;
      const target = toTarget(parseTargetList());
      if (!eatKw('in')) fail("invalid syntax: expected 'in'");
      const it = parseOr(), ifs = [];
      while (eatKw('if')) ifs.push(parseOrNamed());
      gens.push({ target, iter: it, ifs });
    }
    if (isKw('async')) fail("async code is not available in Pylon's Python");
    return gens;
  }
  function parseOrNamed() {
    const tok = peek();
    if (tok.t === 'name' && toks[p + 1].t === 'op' && toks[p + 1].v === ':=') return parseNamedExpr();
    return parseOr();
  }
  function parseSliceItem() {
    const tok = peek();
    let lower = null, upper = null, step = null;
    if (!isOp(':')) {
      const e = parseStarOrTest();
      if (!isOp(':')) return e;
      lower = e;
    }
    p++;
    if (!isOp(':') && !isOp(']') && !isOp(',')) upper = parseTest();
    if (eatOp(':')) { if (!isOp(']') && !isOp(',')) step = parseTest(); }
    return { t: 'Slice', line: tok.line, lower, upper, step };
  }
  function parsePrimary() {
    let node = parseAtom();
    for (;;) {
      const t = peek();
      if (t.t !== 'op') return node;
      if (t.v === '(') { p++; const c = parseCallArgs(); node = { t: 'Call', line: t.line, func: node, args: c.args, keywords: c.keywords }; }
      else if (t.v === '[') {
        p++;
        const items = [];
        let tuple = false;
        for (;;) { items.push(parseSliceItem()); if (eatOp(',')) { tuple = true; if (isOp(']')) break; } else break; }
        expectOp(']');
        node = { t: 'Subscript', line: t.line, value: node, slice: tuple ? { t: 'Tuple', line: t.line, elts: items } : items[0] };
      } else if (t.v === '.') {
        p++;
        const a = peek();
        if (a.t !== 'name' && a.t !== 'kw') fail();
        p++;
        node = { t: 'Attribute', line: t.line, value: node, attr: a.v };
      } else return node;
    }
  }
  function parseStrings() {
    const line = peek().line;
    let parts = [], isF = false;
    while (peek().t === 'str' || peek().t === 'fstr') {
      const t = toks[p++];
      if (t.t === 'str') parts.push(t.v);
      else { isF = true; parts = parts.concat(parseFString(t.v.body, t.v.raw, t.line)); }
    }
    if (!isF) return { t: 'Str', line, v: parts.join('') };
    const merged = [];
    for (const part of parts) {
      if (typeof part === 'string' && typeof merged[merged.length - 1] === 'string') merged[merged.length - 1] += part;
      else merged.push(part);
    }
    return { t: 'FStr', line, parts: merged };
  }
  function parseAtom() {
    const tok = peek(), line = tok.line;
    switch (tok.t) {
      case 'name': p++; return { t: 'Name', line, id: tok.v };
      case 'num': p++; return { t: 'Num', line, v: tok.v };
      case 'str': case 'fstr': return parseStrings();
      case 'kw':
        if (tok.v === 'None') { p++; return { t: 'Const', line, v: null }; }
        if (tok.v === 'True') { p++; return { t: 'Const', line, v: true }; }
        if (tok.v === 'False') { p++; return { t: 'Const', line, v: false }; }
        if (tok.v === 'await' || tok.v === 'async') fail("async code is not available in Pylon's Python");
        if (tok.v === 'yield') fail("'yield' needs parentheses here");
        fail();
        break;
      case 'op':
        if (tok.v === '(') {
          p++;
          if (eatOp(')')) return { t: 'Tuple', line, elts: [] };
          if (isKw('yield')) { const y = parseYield(); expectOp(')'); return y; }
          const first = parseStarOrTest();
          if (isKw('for')) { const g = { t: 'GeneratorExp', line, elt: first, generators: parseCompFor() }; expectOp(')'); return g; }
          if (isOp(',')) {
            const elts = [first];
            while (eatOp(',')) { if (isOp(')')) break; elts.push(parseStarOrTest()); }
            expectOp(')');
            return { t: 'Tuple', line, elts };
          }
          if (!eatOp(')')) fail(peek().t === 'nl' || peek().t === 'eof' ? "'(' was never closed" : 'invalid syntax. Perhaps you forgot a comma?');
          if (first.t === 'Starred') fail("can't use starred expression here", tok);
          if (first.t === 'Tuple') first.paren = true;
          return first;
        }
        if (tok.v === '[') {
          p++;
          if (eatOp(']')) return { t: 'List', line, elts: [] };
          const first = parseStarOrTest();
          if (isKw('for')) { const g = { t: 'ListComp', line, elt: first, generators: parseCompFor() }; expectOp(']'); return g; }
          const elts = [first];
          while (eatOp(',')) { if (isOp(']')) break; elts.push(parseStarOrTest()); }
          if (!eatOp(']')) fail('invalid syntax. Perhaps you forgot a comma?');
          return { t: 'List', line, elts };
        }
        if (tok.v === '{') {
          p++;
          if (eatOp('}')) return { t: 'Dict', line, keys: [], values: [] };
          if (isOp('**')) return parseDictRest(line, [], []);
          const first = parseStarOrTest();
          if (isOp(':')) {
            p++;
            const value = parseTest();
            if (isKw('for')) { const g = { t: 'DictComp', line, key: first, value, generators: parseCompFor() }; expectOp('}'); return g; }
            eatOp(',');
            return parseDictRest(line, [first], [value]);
          }
          if (isKw('for')) { const g = { t: 'SetComp', line, elt: first, generators: parseCompFor() }; expectOp('}'); return g; }
          const elts = [first];
          while (eatOp(',')) { if (isOp('}')) break; elts.push(parseStarOrTest()); }
          if (!eatOp('}')) fail('invalid syntax. Perhaps you forgot a comma?');
          return { t: 'Set', line, elts };
        }
        if (tok.v === '...') { p++; return { t: 'Const', line, v: MP.Ellipsis }; }
        break;
    }
    if (tok.t === 'nl' || tok.t === 'eof') {
      const a = toks[p - 1], b = toks[p - 2];
      if (a && b && a.t === 'op' && b.t === 'op' && a.v === b.v && (a.v === '+' || a.v === '-')) fail('invalid syntax. Python has no ++ or --. Write x += 1 or x -= 1', a);
      fail('invalid syntax: this line ends too early', toks[Math.max(0, p - 1)]);
    }
    if (tok.t === 'indent') fail('unexpected indent', tok, 'IndentationError');
    fail();
  }
  function parseDictRest(line, keys, values) {
    while (!isOp('}')) {
      if (eatOp('**')) { keys.push(null); values.push(parseBin(0)); }
      else { const k = parseTest(); if (!eatOp(':')) fail("invalid syntax: expected ':' in dictionary"); keys.push(k); values.push(parseTest()); }
      if (!eatOp(',')) break;
    }
    if (!eatOp('}')) fail('invalid syntax. Perhaps you forgot a comma?');
    return { t: 'Dict', line, keys, values };
  }

  return { parseModule, parseTestListStar, peek, fail };
}

// f-string body -> list of literal strings and { expr, conv, spec } fields
function parseFString(body, raw, line) {
  const parts = [], n = body.length;
  let lit = '', i = 0;
  const flush = () => { if (lit) { parts.push(raw ? lit : unescape(lit)); lit = ''; } };
  const bad = msg => { throw new PySyntax('f-string: ' + msg, line); };
  while (i < n) {
    const c = body[i];
    if (c === '{') {
      if (body[i + 1] === '{') { lit += '{'; i += 2; continue; }
      flush();
      i++;
      let depth = 0, j = i, q = null;
      for (; j < n; j++) {
        const d = body[j];
        if (q) { if (d === '\\') j++; else if (d === q) q = null; continue; }
        if (d === '"' || d === "'") { q = d; continue; }
        if (d === '(' || d === '[' || d === '{') depth++;
        else if (d === ')' || d === ']' || d === '}') { if (depth === 0) break; depth--; }
        else if (depth === 0 && d === ':') break;
        else if (depth === 0 && d === '!' && body[j + 1] !== '=') break;
      }
      if (j >= n) bad("expecting '}'");
      let src = body.slice(i, j), selfDoc = null;
      const m = /^([\s\S]*[^=!<>\s])(\s*=\s*)$/.exec(src);
      if (m) { selfDoc = src; src = m[1]; }
      let conv = null, spec = null;
      if (body[j] === '!') { conv = body[j + 1]; j += 2; if (conv !== 'r' && conv !== 's' && conv !== 'a') bad('invalid conversion character'); }
      if (body[j] === ':') {
        let k = j + 1, d2 = 0;
        for (; k < n; k++) { if (body[k] === '{') d2++; else if (body[k] === '}') { if (d2 === 0) break; d2--; } }
        if (k >= n) bad("expecting '}'");
        spec = parseFString(body.slice(j + 1, k), raw, line);
        j = k;
      }
      if (body[j] !== '}') bad("expecting '}'");
      if (!src.trim()) bad('empty expression not allowed');
      const expr = parseExpr(src.trim(), line - 1);
      if (selfDoc !== null) { parts.push(selfDoc); if (conv === null && spec === null) conv = 'r'; }
      parts.push({ expr, conv, spec });
      i = j + 1;
      continue;
    }
    if (c === '}') {
      if (body[i + 1] === '}') { lit += '}'; i += 2; continue; }
      bad("single '}' is not allowed");
    }
    lit += c; i++;
  }
  flush();
  return parts;
}

function parse(src, lineBase) { return parser(tokenize(src, lineBase)).parseModule(); }
function parseExpr(src, lineBase) {
  const toks = tokenize(src, lineBase);
  const P = parser(toks);
  const e = P.parseTestListStar();
  if (P.peek().t === 'nl') { /* fine */ } else if (P.peek().t !== 'eof') P.fail();
  return e;
}

MP.tokenize = tokenize;
MP.parse = parse;
MP.parseExpr = parseExpr;
})(typeof window !== 'undefined' ? window : globalThis);
