/* Pylon code editor: a textarea with a syntax-highlighted layer behind it. Small on purpose.
   Tab indents, Enter keeps indentation (and adds a level after a colon), Ctrl/Cmd+Enter runs, Ctrl/Cmd+/ comments. */
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
  let errLine = null, actLine = null, lineEls = [], numEls = [];

  function render() {
    const lines = highlight(ta.value);
    let h = '', g = '';
    for (let i = 0; i < lines.length; i++) {
      h += '<div class="ln' + (i + 1 === errLine ? ' err' : '') + (i + 1 === actLine ? ' act' : '') + '">' + (lines[i] || ' ') + '</div>';
      g += '<div class="' + (i + 1 === errLine ? 'err' : i + 1 === actLine ? 'act' : '') + '">' + (i + 1) + '</div>';
    }
    hl.innerHTML = h;
    gutter.innerHTML = g;
    lineEls = hl.children; numEls = gutter.children;
    sync();
  }
  function sync() { hl.scrollTop = ta.scrollTop; hl.scrollLeft = ta.scrollLeft; gutter.scrollTop = ta.scrollTop; }
  function mark(kind, line) {
    const prev = kind === 'err' ? errLine : actLine;
    if (prev && lineEls[prev - 1]) { lineEls[prev - 1].classList.remove(kind); numEls[prev - 1].classList.remove(kind); }
    if (kind === 'err') errLine = line; else actLine = line;
    if (line && lineEls[line - 1]) {
      lineEls[line - 1].classList.add(kind); numEls[line - 1].classList.add(kind);
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
  const PAIRS = { '(': ')', '[': ']', '{': '}' };
  ta.addEventListener('keydown', e => {
    const s = ta.selectionStart, en = ta.selectionEnd, v = ta.value, mod = e.ctrlKey || e.metaKey;
    if (e.key === 'Enter' && mod) { e.preventDefault(); if (opts.onRun) opts.onRun(); return; }
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
  ta.addEventListener('input', () => { if (errLine) errLine = null; render(); if (opts.onChange) opts.onChange(ta.value); });
  ta.addEventListener('scroll', sync);
  render();
  return {
    el: ta,
    get value() { return ta.value; },
    set(text) { ta.value = text; errLine = actLine = null; ta.scrollTop = 0; ta.scrollLeft = 0; render(); },
    focus() { ta.focus(); },
    markError(line) { mark('err', line); },
    markActive(line) { mark('act', line); },
    insert(text) { insert(text); },
  };
}
root.PylonEditor = PylonEditor;
root.PylonHighlight = src => highlight(src).join('\n');
})(typeof window !== 'undefined' ? window : globalThis);
