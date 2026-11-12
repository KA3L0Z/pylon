/* Pylon's terminal: what a run looks like when it is written down the way Python's own prompt would show it.

   A run of a level becomes a transcript: the file is started, each test call is typed at the >>> prompt, what the code
   printed follows, then the value the call gave back, or the traceback if it raised. The player can type lines of their
   own at the same prompt (js/runner.js keeps the session; this file only decides what the text looks like).

   Plain logic with no page in it, so tools/check_terminal.js can run it in Node and compare it with real Python. */
(function (root) {
'use strict';
const FILE = 1000000, PROMPT = FILE * 200;                                // lines at or above this belong to the game's own helper code
const cut = (text, lines, chars) => {                // a long printout is shown from its start, with a count of what was left out
  let t = String(text).replace(/\r\n/g, '\n').replace(/\n$/, '');
  if (t.length > chars) t = t.slice(0, chars) + '…';
  const all = t.split('\n');
  return all.length > lines ? all.slice(0, lines).concat(['… ' + (all.length - lines) + ' more lines']) : all;
};

// An error as Python prints it. src is the player's file, for the line of code under each frame.
function traceback(error, src) {
  const code = String(src || '').split('\n'), out = [];
  if (!error) return out;
  if (error.abort === 'steps' || error.type === 'StepLimit') return ['Stopped: the code ran for too long. A loop probably never ends.'];
  if (error.internal) return ['InternalError: ' + error.message, 'This is a fault in Pylon itself, not in your code.'];
  const mine = n => n > 0 && n < FILE;
  if (error.syntax) {
    if (error.prompt) { out.push('  File "<stdin>", line 1'); const typed = String(error.typed || '').split('\n')[0].trim(); if (typed) out.push('    ' + typed); }
    else if (mine(error.line)) { out.push('  File "main.py", line ' + error.line); if ((code[error.line - 1] || '').trim()) out.push('    ' + code[error.line - 1].trim()); }
    else out.push('  File "<stdin>", line 1');
    out.push(error.type + ': ' + error.message);
    return out;
  }
  const frame = (line, fn) => {
    if (mine(line)) { out.push('  File "main.py", line ' + line + ', in ' + fn); if ((code[line - 1] || '').trim()) out.push('    ' + code[line - 1].trim()); }
    else if (line >= PROMPT || fn === '<module>') out.push('  File "<stdin>", line ' + (line >= PROMPT ? (line % 1000) || 1 : 1) + ', in ' + fn);          // typed at the prompt
    else out.push('  File "<pylon>", in ' + fn);          // one of the game's own helpers
  };
  const tr = error.trace || [];
  out.push('Traceback (most recent call last):');
  frame(tr.length ? tr[0].line : error.line, '<module>');
  for (let k = 0; k < tr.length; k++) frame(k + 1 < tr.length ? tr[k + 1].line : error.line, tr[k].fn);
  out.push(error.message ? error.type + ': ' + error.message : error.type);
  return out;
}

// A run as a list of lines: { k: 'sh' | 'in' | 'out' | 'val' | 'err' | 'note', t, ok }.
//   sh: a command at the shell ($), in: a line at Python's prompt (>>> or ...), out: printed text, val: the value echoed
//   after a call, err: a traceback, note: a comment of the game's own, written as Python would write a comment.
function transcript(level, res, src) {
  const L = [], put = (k, t, ok) => L.push(ok === undefined ? { k, t } : { k, t, ok });
  const outs = text => { if (text) for (const l of cut(text, 40, 2400)) put('out', l); };
  const errs = error => { for (const l of traceback(error, src)) put('err', l); };
  if (!level || !res) return L;
  if (level.kind === 'robot') {
    put('sh', 'python main.py');
    outs(res.output);
    const last = res.runs && res.runs[res.runs.length - 1];
    if (last && last.error) errs(last.error);
    else if (last && !last.ok && last.reason) put('note', '# ' + last.reason);
    return L;
  }
  if (level.kind === 'sandbox') { put('sh', 'python main.py'); outs(res.output); if (res.error) errs(res.error); return L; }
  const tests = res.tests || [], printed = tests.some(t => t.stdout);
  if (printed || (res.error && !tests.length && level.tests && level.tests.some(t => t.stdout !== undefined))) {
    if (!tests.length) { put('sh', 'python main.py', false); outs(res.output); errs(res.error); return L; }
    tests.forEach((t, i) => {
      put('sh', 'python main.py', !!t.ok);
      if (t.stdin) put('note', '# typed in: ' + String(t.stdin).replace(/\n$/, '').split('\n').join(' ⏎ '));
      outs(t.got);
      if (t.error) errs(t.error);
      else if (!t.ok) put('note', '# not what test ' + (i + 1) + ' expects: the list of tests shows the difference');
    });
    return L;
  }
  put('sh', 'python -i main.py');
  outs(res.output);
  if (res.error) { errs(res.error); return L; }
  tests.forEach((t, i) => {
    const spec = (level.tests && level.tests[i]) || {};
    if (spec.setup) String(spec.setup).split('\n').filter(l => l.trim()).forEach(l => put('in', l));
    put('in', String(t.show || spec.call || ''), !!t.ok);
    outs(t.output);
    if (t.error) errs(t.error);
    else {
      if (t.got !== undefined && t.got !== null && t.got !== 'None') for (const l of cut(t.got, 6, 400)) put('val', l);
      if (!t.ok) put('note', t.slow ? '# right answer, but too slow for the speed test' : '# expected ' + cut(t.expect, 3, 300).join(' '));
    }
  });
  return L;
}

// Has the player finished typing a statement? A block ("def f():") goes on until an empty line, as at Python's prompt,
// and an open bracket goes on until it is closed.
function pending(lines) {
  if (!lines.length) return false;
  let depth = 0, quote = null;
  const text = lines.join('\n');
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quote) { if (c === '\\') i++; else if (text.startsWith(quote, i)) { i += quote.length - 1; quote = null; } else if (c === '\n' && quote.length === 1) quote = null; continue; }
    if (c === '#') { while (i < text.length && text[i] !== '\n') i++; continue; }
    if (c === '"' || c === "'") { quote = text.startsWith(c + c + c, i) ? c + c + c : c; i += quote.length - 1; continue; }
    if ('([{'.indexOf(c) >= 0) depth++; else if (')]}'.indexOf(c) >= 0) depth--;
  }
  if (depth > 0 || (quote && quote.length === 3)) return true;
  const first = lines[0].replace(/#.*$/, '').trimEnd();
  return /:$/.test(first) && lines[lines.length - 1].trim() !== '';
}

// What one line typed at the prompt gave, as transcript lines.
function reply(result, src) {
  const L = [];
  if (!result) return L;
  if (result.output) for (const l of cut(result.output, 40, 2400)) L.push({ k: 'out', t: l });
  if (result.error) for (const l of traceback(result.error, src)) L.push({ k: 'err', t: l });
  else if (result.value !== null && result.value !== undefined) for (const l of cut(result.value, 12, 1200)) L.push({ k: 'val', t: l });
  return L;
}

root.PylonTerminal = { transcript, traceback, pending, reply };
if (typeof module !== 'undefined' && module.exports) module.exports = root.PylonTerminal;
})(typeof window !== 'undefined' ? window : globalThis);
