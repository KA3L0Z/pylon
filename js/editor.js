/* Pylon code editor: a textarea with a syntax-highlighted layer behind it. Small on purpose.
   Tab indents, Enter keeps indentation (and adds a level after a colon), Ctrl/Cmd+Enter runs, Ctrl/Cmd+/ comments.
   While you type it offers completions (js/complete.js decides which): a list at the caret on a computer, a bar of chips
   above the keyboard on a touch screen. */
(function (root) {
'use strict';
const KW = new Set(['False', 'None', 'True', 'and', 'as', 'assert', 'break', 'class', 'continue', 'def', 'del', 'elif', 'else', 'except', 'finally', 'for',
  'from', 'global', 'if', 'import', 'in', 'is', 'lambda', 'nonlocal', 'not', 'or', 'pass', 'raise', 'return', 'try', 'while', 'with', 'yield']);
const BI = new Set(['print', 'len', 'range', 'int', 'float', 'str', 'bool', 'list', 'dict', 'set', 'tuple', 'abs', 'min', 'max', 'sum', 'sorted', 'reversed',
  'enumerate', 'zip', 'map', 'filter', 'any', 'all', 'isinstance', 'type', 'round', 'divmod', 'ord', 'chr', 'iter', 'next', 'super', 'repr',
  'move', 'turn_left', 'turn_right', 'collect', 'front_is_clear', 'left_is_clear', 'right_is_clear', 'on_shard', 'at_beacon', 'shards_left']);
const TOKEN = /(#[^\n]*)|((?:\b[rRuUfF]{1,2})?(?:"""[\s\S]*?(?:"""|$)|'''[\s\S]*?(?:'''|$)|"(?:[^"\\\n]|\\.)*"?|'(?:[^'\\\n]|\\.)*'?))|(\b\d[\d_]*(?:\.[\d_]*)?(?:[eE][+-]?\d+)?\b)|(@[A-Za-z_][\w.]*)|([A-Za-z_]\w*)/g;
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Returns one HTML string per source line.
function highlight(src) {
  const lines = [''];
  const put = (text, cls) => {
    const parts = text.split('\n');
    for (let i = 0; i < parts.length; i++) {
      if (i) lines.push('');
      if (parts[i]) lines[lines.length - 1] += cls ? '<span class="' + cls + '">' + esc(parts[i]) + '</span>' : esc(parts[i]);
    }
  };
  let last = 0, m, prevWord = '';
  TOKEN.lastIndex = 0;
  while ((m = TOKEN.exec(src))) {
    if (m.index > last) put(src.slice(last, m.index), '');
    if (m[1] !== undefined) put(m[1], 'c');
    else if (m[2] !== undefined) put(m[2], 's');
    else if (m[3] !== undefined) put(m[3], 'n');
    else if (m[4] !== undefined) put(m[4], 'd');
    else {
      const w = m[5];
      put(w, KW.has(w) ? 'k' : (prevWord === 'def' || prevWord === 'class') ? 'f' : BI.has(w) ? 'b' : w === 'self' ? 'k2' : '');
    }
    prevWord = m[5] || '';
    last = TOKEN.lastIndex;
    if (m[0] === '') TOKEN.lastIndex++;
  }
  if (last < src.length) put(src.slice(last), '');
  return lines;
}

function PylonEditor(host, opts) {
  opts = opts || {};
  host.classList.add('ed');
  host.innerHTML = '<div class="ed-gutter" aria-hidden="true"></div><div class="ed-main"><pre class="ed-hl" aria-hidden="true"></pre>' +
    '<textarea class="ed-ta" id="' + (opts.id || 'code-input') + '" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" wrap="off" aria-label="Python code editor"></textarea></div>';
  const gutter = host.querySelector('.ed-gutter'), hl = host.querySelector('.ed-hl'), ta = host.querySelector('.ed-ta');
  const marks = { err: null, act: null, warn: null };
  let lineEls = [], numEls = [];
  const cls = n => (n === marks.err ? ' err' : '') + (n === marks.act ? ' act' : '') + (n === marks.warn ? ' warn' : '');

  function render() {
    const lines = highlight(ta.value);
    let h = '', g = '';
    for (let i = 0; i < lines.length; i++) {
      const c = cls(i + 1);
      h += '<div class="ln' + c + '">' + (lines[i] || ' ') + '</div>';
      g += '<div class="' + c.trim() + '">' + (i + 1) + '</div>';
    }
    hl.innerHTML = h;
    gutter.innerHTML = g;
    lineEls = hl.children; numEls = gutter.children;
    sync();
  }
  function sync() { hl.scrollTop = ta.scrollTop; hl.scrollLeft = ta.scrollLeft; gutter.scrollTop = ta.scrollTop; }
  function mark(kind, line) {
    const prev = marks[kind];
    if (prev && lineEls[prev - 1]) { lineEls[prev - 1].classList.remove(kind); numEls[prev - 1].classList.remove(kind); }
    marks[kind] = line;
    if (line && lineEls[line - 1]) {
      lineEls[line - 1].classList.add(kind); numEls[line - 1].classList.add(kind);
      if (kind === 'warn') return;                       // a warning never moves the view away from where you are typing
      const top = lineEls[line - 1].offsetTop, bottom = top + lineEls[line - 1].offsetHeight;
      if (top < ta.scrollTop + 8) ta.scrollTop = Math.max(0, top - 30);
      else if (bottom > ta.scrollTop + ta.clientHeight - 8) ta.scrollTop = bottom - ta.clientHeight + 30;
      sync();
    }
  }
  function insert(text) {
    ta.focus();
    let ok = false;
    try { ok = text === '' ? document.execCommand('delete') : document.execCommand('insertText', false, text); } catch (e) { ok = false; }
    if (!ok) { ta.setRangeText(text, ta.selectionStart, ta.selectionEnd, 'end'); ta.dispatchEvent(new Event('input', { bubbles: true })); }
  }
  function blockRange() {
    const v = ta.value, s = ta.selectionStart;
    let e = ta.selectionEnd;
    if (e > s && v[e - 1] === '\n') e--;
    const a = v.lastIndexOf('\n', s - 1) + 1;
    let b = v.indexOf('\n', e);
    if (b < 0) b = v.length;
    return [a, b];
  }
  function editBlock(fn) {
    const [a, b] = blockRange(), out = ta.value.slice(a, b).split('\n').map(fn).join('\n');
    ta.setSelectionRange(a, b);
    insert(out);
    ta.setSelectionRange(a, a + out.length);
  }

  // ---------------------------------------------------------------- completions
  const touch = !!(root.matchMedia && root.matchMedia('(pointer: coarse)').matches), strip = opts.strip || null;
  const pop = document.createElement('div');
  pop.className = 'ac'; pop.hidden = true; pop.setAttribute('role', 'listbox'); pop.setAttribute('aria-label', 'Suggestions');
  document.body.appendChild(pop);
  let ac = null, acSel = 0, acMoved = false, acOn = opts.complete !== false, acBusy = false, words = [], cw = 0;
  const useStrip = () => touch && strip;
  function acClose() {
    if (!ac && pop.hidden) return;
    ac = null;
    pop.hidden = true;
    if (strip) { strip.innerHTML = ''; strip.classList.remove('has'); }
  }
  function charW() {
    if (!cw) {
      const c = document.createElement('canvas').getContext('2d'), cs = getComputedStyle(ta);
      c.font = cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
      cw = c.measureText('MMMMMMMMMM').width / 10;
    }
    return cw;
  }
  const lit = (label, word) => {                         // the letters already typed, shown brighter
    if (!word || label.toLowerCase().indexOf(word.toLowerCase()) !== 0) return esc(label);
    return '<b>' + esc(label.slice(0, word.length)) + '</b>' + esc(label.slice(word.length));
  };
  function acRender() {
    if (useStrip()) {
      strip.innerHTML = ac.items.map((it, i) => '<button type="button" class="ac-chip" data-i="' + i + '">' + lit(it.label, ac.word) + '</button>').join('');
      strip.classList.add('has');
      strip.scrollLeft = 0;
      return;
    }
    const it = ac.items[acSel];
    pop.innerHTML = ac.items.map((x, i) => '<div class="ac-item' + (i === acSel ? ' on' : '') + '" role="option" aria-selected="' + (i === acSel) + '" data-i="' + i + '"><span class="ac-l">' + lit(x.label, ac.word) + '</span><span class="ac-k">' + esc(x.kindText) + '</span></div>').join('') +
      '<div class="ac-doc">' + (it.sig ? '<code>' + esc(it.sig) + '</code>' : '') + (it.doc ? '<span>' + esc(it.doc) + '</span>' : '') + '<i>Tab inserts</i></div>';
    // place the list under the word being typed, or above it when there is no room below
    const v = ta.value, p = ac.from, ls = v.lastIndexOf('\n', p - 1) + 1, cs = getComputedStyle(ta), lh = parseFloat(cs.lineHeight) || 22, r = ta.getBoundingClientRect();
    let row = 0;
    for (let i = v.indexOf('\n'); i >= 0 && i < p; i = v.indexOf('\n', i + 1)) row++;
    let x = r.left + parseFloat(cs.paddingLeft) + (p - ls) * charW() - ta.scrollLeft, y = r.top + parseFloat(cs.paddingTop) + (row + 1) * lh - ta.scrollTop;
    pop.hidden = false;
    const pw = pop.offsetWidth, ph = pop.offsetHeight;
    if (y + ph > root.innerHeight - 8) y = y - lh - ph - 4;
    pop.style.left = Math.max(8, Math.min(x - 9, root.innerWidth - pw - 8)) + 'px';
    pop.style.top = Math.max(8, y + 2) + 'px';
  }
  function acUpdate(force) {
    if (acBusy) return;
    if (!acOn || !root.PylonComplete || ta.selectionStart !== ta.selectionEnd) { acClose(); return; }
    const res = root.PylonComplete.suggest(ta.value, ta.selectionStart, { words, min: force || touch ? 1 : 2, limit: touch ? 7 : 8 });
    if (!res) { acClose(); return; }
    ac = res; acSel = 0; acMoved = false;
    acRender();
  }
  function acAccept(i) {
    const it = ac && ac.items[i];
    if (!it) return;
    const v = ta.value, from = ac.from, to = ac.to, ls = v.lastIndexOf('\n', from - 1) + 1, indent = /^[ \t]*/.exec(v.slice(ls))[0];
    let text = it.insert.replace(/\n/g, '\n' + indent), caret = text.indexOf('|');
    if (caret >= 0) text = text.slice(0, caret) + text.slice(caret + 1);
    if (v[to] === '(' && /\(\)?$/.test(text)) { text = text.replace(/\(\)?$/, ''); caret = -1; }         // the bracket is already there
    acClose();
    acBusy = true;
    ta.setSelectionRange(from, to);
    insert(text);
    const at = caret >= 0 ? from + caret : from + text.length;
    ta.setSelectionRange(at, at);
    acBusy = false;
    if (opts.onPick) opts.onPick(it);
  }
  pop.addEventListener('mousedown', e => { e.preventDefault(); const it = e.target.closest('.ac-item'); if (it) acAccept(+it.dataset.i); });
  if (strip) {
    strip.addEventListener('pointerdown', e => { if (e.target.closest('.ac-chip')) e.preventDefault(); });       // keep the keyboard open
    strip.addEventListener('click', e => { const b = e.target.closest('.ac-chip'); if (b) acAccept(+b.dataset.i); });
  }
  ta.addEventListener('blur', () => { if (!touch) acClose(); });
  ta.addEventListener('mouseup', acClose);
  root.addEventListener('resize', () => { cw = 0; acClose(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { cw = 0; });

  const PAIRS = { '(': ')', '[': ']', '{': '}' };
  ta.addEventListener('keydown', e => {
    const s = ta.selectionStart, en = ta.selectionEnd, v = ta.value, mod = e.ctrlKey || e.metaKey;
    if (ac && !useStrip()) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); acMoved = true; acSel = (acSel + (e.key === 'ArrowDown' ? 1 : ac.items.length - 1)) % ac.items.length; acRender(); return; }
      if (e.key === 'Tab' && !mod && !e.shiftKey) { e.preventDefault(); acAccept(acSel); return; }
      if (e.key === 'Enter' && !mod && !e.shiftKey && acMoved) { e.preventDefault(); acAccept(acSel); return; }       // Enter picks only after you chose with the arrows
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); acClose(); return; }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Home' || e.key === 'End' || e.key === 'PageUp' || e.key === 'PageDown') acClose();
    }
    if (mod && (e.key === ' ' || e.code === 'Space')) { e.preventDefault(); acUpdate(true); return; }
    if (e.key === 'Enter' && mod) { e.preventDefault(); acClose(); if (opts.onRun) opts.onRun(); return; }
    if (e.key === 'Escape') { ta.blur(); return; }
    if (mod && e.key === '/') {
      e.preventDefault();
      const [a, b] = blockRange(), all = v.slice(a, b).split('\n').filter(l => l.trim()).every(l => /^\s*#/.test(l));
      editBlock(l => !l.trim() ? l : all ? l.replace(/^(\s*)# ?/, '$1') : l.replace(/^(\s*)/, '$1# '));
      return;
    }
    if (mod || e.altKey) return;
    if (e.key === 'Tab') {
      e.preventDefault();
      if (s !== en || e.shiftKey) editBlock(l => e.shiftKey ? l.replace(/^ {1,4}/, '') : (l ? '    ' + l : l));
      else { const col = s - (v.lastIndexOf('\n', s - 1) + 1); insert(' '.repeat(4 - (col % 4))); }
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const line = v.slice(v.lastIndexOf('\n', s - 1) + 1, s);
      let ind = /^[ \t]*/.exec(line)[0];
      const code = line.replace(/#.*$/, '').replace(/\s+$/, '');
      if (code.endsWith(':')) ind += '    ';
      else if (/^\s*(return|pass|break|continue|raise)\b/.test(line) && ind.length >= 4) ind = ind.slice(0, -4);
      insert('\n' + ind);
      return;
    }
    if (e.key === 'Backspace' && s === en) {
      const before = v.slice(v.lastIndexOf('\n', s - 1) + 1, s);
      if (before.length && /^ +$/.test(before)) { e.preventDefault(); ta.setSelectionRange(s - (((before.length - 1) % 4) + 1), s); insert(''); return; }
      const pair = v.slice(s - 1, s + 1);
      if (pair === '()' || pair === '[]' || pair === '{}' || pair === '""' || pair === "''") { e.preventDefault(); ta.setSelectionRange(s - 1, s + 1); insert(''); return; }
      return;
    }
    const next = v[en] || '';
    if (PAIRS[e.key] && s === en && (!next || /[\s)\]}:,]/.test(next))) { e.preventDefault(); insert(e.key + PAIRS[e.key]); ta.setSelectionRange(s + 1, s + 1); return; }
    if ((e.key === ')' || e.key === ']' || e.key === '}') && s === en && next === e.key) { e.preventDefault(); ta.setSelectionRange(s + 1, s + 1); return; }
    if ((e.key === '"' || e.key === "'") && s === en) {
      if (next === e.key) { e.preventDefault(); ta.setSelectionRange(s + 1, s + 1); return; }
      const prev = v[s - 1] || '';
      if ((!next || /[\s)\]},:]/.test(next)) && (!/[\w"']/.test(prev) || /(^|[^\w])[fFrR]$/.test(v.slice(Math.max(0, s - 2), s)))) { e.preventDefault(); insert(e.key + e.key); ta.setSelectionRange(s + 1, s + 1); }
    }
  });
  ta.addEventListener('input', () => { marks.err = null; marks.warn = null; render(); acUpdate(); if (opts.onChange) opts.onChange(ta.value); });
  ta.addEventListener('scroll', () => { sync(); if (ac && !useStrip()) acClose(); });
  render();
  return {
    el: ta,
    get value() { return ta.value; },
    set(text) { acClose(); ta.value = text; marks.err = marks.act = marks.warn = null; ta.scrollTop = 0; ta.scrollLeft = 0; render(); },
    focus() { ta.focus(); },
    markError(line) { mark('err', line); },
    markActive(line) { mark('act', line); },
    markWarn(line) { mark('warn', line); },
    insert(text) { insert(text); },
    move(by) { const p = Math.max(0, Math.min(ta.value.length, ta.selectionStart + by)); ta.focus(); ta.setSelectionRange(p, p); acClose(); },
    setWords(list) { words = list || []; },
    setComplete(on) { acOn = !!on; if (!acOn) acClose(); },
    closeComplete: acClose,
    get completing() { return !!ac; },
  };
}
root.PylonEditor = PylonEditor;
root.PylonHighlight = src => highlight(src).join('\n');
})(typeof window !== 'undefined' ? window : globalThis);
