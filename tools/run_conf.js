// Runs the conformance corpus (tests/conf/*.py) through MiniPy and compares with CPython's output (*.out).
// Usage: node tools/run_conf.js [filter] [-v]
const fs = require('fs');
const path = require('path');
const MP = require('./minipy.js');

const dir = path.join(__dirname, '..', 'tests', 'conf');
const args = process.argv.slice(2);
const verbose = args.includes('-v');
const filter = args.find(a => a !== '-v') || '';
const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith('.py') && f.includes(filter)).sort() : [];
let pass = 0;
const failed = [];
for (const f of files) {
  const src = fs.readFileSync(path.join(dir, f), 'utf8');
  const outFile = path.join(dir, f.replace(/\.py$/, '.out'));
  if (!fs.existsSync(outFile)) continue;
  const want = fs.readFileSync(outFile, 'utf8').replace(/\r\n/g, '\n');
  const s = new MP.Session({ maxSteps: 20000000 });
  const lines = path.join(dir, f.replace(/\.py$/, '.in'));          // what the program reads with input()
  if (fs.existsSync(lines)) s.setInput(fs.readFileSync(lines, 'utf8'));
  let r;
  try { r = s.exec(src); } catch (e) { r = { ok: false, output: '', error: { type: 'CRASH', message: String(e && e.stack || e), line: 0 } }; }
  let got = r.output;
  if (!r.ok) got += '\n!! ' + r.error.type + ': ' + r.error.message + ' (line ' + r.error.line + ')' + (r.error.stack ? '\n' + r.error.stack : '');
  if (got === want) { pass++; continue; }
  failed.push(f);
  const g = got.split('\n'), w = want.split('\n');
  let i = 0;
  while (i < g.length && i < w.length && g[i] === w[i]) i++;
  console.log('FAIL ' + f + '  (first difference at output line ' + (i + 1) + ')');
  const show = verbose ? 12 : 3;
  for (let k = i; k < Math.min(i + show, Math.max(g.length, w.length)); k++) {
    console.log('   want: ' + JSON.stringify(w[k]));
    console.log('   got:  ' + JSON.stringify(g[k]));
  }
}
console.log('\n' + pass + '/' + (pass + failed.length) + ' passed');
if (failed.length) console.log('failed: ' + failed.join(' '));
process.exit(failed.length ? 1 : 0);
