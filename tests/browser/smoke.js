// A real browser plays the first minutes of Pylon, the way a new player would, and fails loudly if anything breaks:
// the intro, the first-time tour, a drone level, a code level, a failing run, the step-by-step view, the bug hunt,
// the save code, the comfort settings and, on the built site, starting again with the network switched off.
//
//   npm install --no-save puppeteer-core        (drives a Chrome that is already installed; downloads no browser)
//   node tests/browser/smoke.js [--show]
//
// Chrome is taken from CHROME_BIN, or looked for in the usual places. The script serves this folder itself.
const http = require('http'), fs = require('fs'), path = require('path');
const puppeteer = require('puppeteer-core');

const root = path.join(__dirname, '..', '..');
const pageFile = fs.existsSync(path.join(root, 'index.html')) ? 'index.html' : 'pylon.html';      // the site, or the working copy
const hasWorker = fs.existsSync(path.join(root, 'sw.js'));
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  let rel = decodeURIComponent(req.url.split('?')[0]);
  if (rel === '/') rel = '/' + pageFile;
  const file = path.join(root, rel);
  if (file.indexOf(root) !== 0 || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end('not found'); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
  fs.createReadStream(file).pipe(res);
});
const chrome = [process.env.CHROME_BIN, process.env.PUPPETEER_EXECUTABLE_PATH, '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium-browser', '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe']
  .find(p => p && fs.existsSync(p));
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  if (!chrome) { console.log('No Chrome found. Set CHROME_BIN to its path.'); process.exit(2); }
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const url = 'http://localhost:' + server.address().port + '/';
  const browser = await puppeteer.launch({ executablePath: chrome, headless: !process.argv.includes('--show'),
    args: ['--no-sandbox', '--mute-audio', '--window-size=1280,800', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  const errors = [];
  page.on('pageerror', e => errors.push('uncaught: ' + (e && e.message)));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
  let step = 'starting';
  const say = text => { step = text; console.log('  ' + text); };
  // ---- small helpers that act inside the page
  const click = sel => page.evaluate(s => { const el = document.querySelector(s); if (!el) throw new Error('nothing matches ' + s); el.click(); }, sel);
  const until = (fn, arg, ms) => page.waitForFunction(fn, { timeout: ms || 20000, polling: 100 }, arg);
  const seen = sel => until(s => { const el = document.querySelector(s); return !!el && !el.hidden && el.getClientRects().length > 0; }, sel);
  const text = sel => page.evaluate(s => { const el = document.querySelector(s); return el ? el.innerText : ''; }, sel);
  const closeModal = async () => { await page.evaluate(() => { const m = document.getElementById('modal'); if (!m.hidden) m.click(); }); await sleep(150); };
  const setCode = code => page.evaluate(c => { const ta = document.querySelector('.ed-ta'); ta.value = c; ta.dispatchEvent(new Event('input', { bubbles: true })); }, code);
  const getCode = () => page.evaluate(() => document.querySelector('.ed-ta').value);
  // Run, skip the show, and wait for the verdict.
  const run = async () => {
    await page.evaluate(() => { document.getElementById('run-status').textContent = ''; });
    await click('#btn-run');
    await sleep(400);
    await page.evaluate(() => { const b = document.getElementById('btn-run'); if (b.classList.contains('busy')) b.click(); });
    await until(() => /Solved|Not yet|Done|Error/.test(document.getElementById('run-status').textContent) && !document.getElementById('btn-run').classList.contains('busy'), null, 40000);
    return page.evaluate(() => document.getElementById('run-status').textContent);      // the text as written, not as the stylesheet capitalises it
  };
  const expect = (ok, what) => { if (!ok) throw new Error(what); };
  const openLevel = async id => {                  // through the Codex, from the tower
    await click('#btn-menu'); await seen('#btn-codex2');
    await click('#btn-codex2'); await seen('[data-codex="' + id + '"]');
    await click('[data-codex="' + id + '"]'); await seen('#modal-body [data-go]');
    await click('#modal-body [data-go]'); await seen('#card-enter');
    await click('#card-enter');
    await until(() => document.getElementById('app').classList.contains('mode-level'));
    await sleep(300);
  };
  const skipTour = async must => {
    try { await page.waitForFunction(() => !document.getElementById('coach').hidden, { timeout: 4000, polling: 100 }); }
    catch (e) { if (must) throw new Error('the tour did not appear'); return false; }
    await click('#coach-skip');
    return true;
  };

  try {
    say('the page loads');
    await page.goto(url, { waitUntil: 'load', timeout: 60000 });
    await until(() => document.getElementById('stage').classList.contains('ready'), null, 60000);
    const levels = await page.evaluate(() => window.PylonCurriculum.arrange(window.PYLON_LEVELS).levels.map(l => ({ id: l.id, kind: l.kind, title: l.title, solution: l.solution, starter: l.starter })));
    expect(levels.length >= 70, 'only ' + levels.length + ' levels loaded');
    const world = await page.evaluate(() => !!(window.PylonWorld && window.PylonWorld.ok) && document.getElementById('nogl').hidden);
    console.log('    ' + levels.length + ' levels, 3D view ' + (world ? 'running' : 'not available here (the game goes on without it)'));
    const byTitle = t => levels.find(l => l.title.toLowerCase() === t.trim().toLowerCase());

    say('the intro, then the first drone level with its tour');
    await seen('#intro-start');
    await click('#intro-start');
    await seen('#card-enter');
    await click('#card-enter');
    await until(() => document.getElementById('app').classList.contains('mode-level'));
    await skipTour(true);
    await page.evaluate(() => { const low = document.querySelector('#robot-ctl [data-speed="4"]'); if (low) low.click(); });
    await setCode(levels[0].solution);
    expect(await run() === 'Solved', 'the model solution of the first level did not pass');
    await seen('#modal-body .done');
    expect(/level complete/i.test(await text('#modal-body')), 'no Level complete dialog');
    const saved = await page.evaluate(id => { const s = JSON.parse(localStorage.getItem('pylon.save.v1')); return s.levels[id]; }, levels[0].id);
    expect(saved && saved.solved && saved.stars === 3, 'the first level was not saved as solved with three stars');
    await click('#done-tower');
    await until(() => document.getElementById('app').classList.contains('mode-hub'));

    say('lighter graphics, and every level unlocked from the Menu');
    await click('#btn-menu'); await seen('#opt-unlock');
    await click('[data-gfx="low"]');
    await click('#opt-unlock');
    await click('#menu-close');

    say('the first code level, with the second tour');
    const code = levels.filter(l => l.kind === 'code');
    await openLevel(code[0].id);
    await skipTour(true);
    expect(await run() === 'Not yet', 'the starting code of a code level passed its tests');
    await setCode(code[0].solution);
    expect(await run() === 'Solved', 'the model solution of ' + code[0].id + ' did not pass');
    await seen('#modal-body .done');
    await click('#done-tower');
    await until(() => document.getElementById('app').classList.contains('mode-hub'));

    say('a level with tests: a wrong answer, the step-by-step view, the right answer, craft marks');
    const target = levels.find(l => l.id === 'z2-shelf-slots') || code[2];
    await openLevel(target.id);
    await skipTour(false);
    await setCode(target.solution.replace(' + ', ' - '));
    expect(await run() === 'Not yet', 'a wrong answer was accepted');
    expect(/of \d+ tests passed/i.test(await text('#results')), 'the failing tests are not listed');
    await click('#btn-trace');
    await seen('#trace');
    expect(/\d+\s*\/\s*\d+/.test(await text('#tr-pos')), 'the step-by-step view shows no step counter');
    await click('#tr-close');
    await setCode(target.solution);
    expect(await run() === 'Solved', 'the model solution of ' + target.id + ' did not pass');
    await seen('#modal-body .done');
    await closeModal();
    expect(/craft/i.test(await text('#results')), 'no craft marks under a passing answer');
    await click('#btn-back');
    await until(() => document.getElementById('app').classList.contains('mode-hub'));

    say('the bug hunt: a bug is planted, the tests catch it, the repair is rewarded');
    await click('#btn-interview'); await seen('#bug-start');
    expect(await page.evaluate(() => !document.getElementById('bug-start').disabled), 'the bug hunt is closed after a code level was solved');
    await click('#bug-start');
    await until(() => !!document.querySelector('.bugnote') && document.getElementById('modal').hidden, null, 20000);
    const hunted = byTitle(await text('#p-name'));
    expect(hunted, 'the bug hunt opened a level this test does not know');
    const bugged = await getCode(), clean = hunted.solution.replace(/\s+$/, '') + '\n';
    const changed = bugged.split('\n').filter((line, i) => line !== clean.split('\n')[i]).length;
    expect(changed === 1, 'the planted bug changed ' + changed + ' lines instead of one');
    expect(await run() === 'Not yet', 'the planted bug passes the tests');
    await setCode(clean);
    expect(await run() === 'Solved', 'the repaired code did not pass');
    await seen('#bug-again');
    expect(/bug fixed/i.test(await text('#modal-body')), 'no Bug fixed dialog');
    await click('#done-tower');
    await until(() => document.getElementById('app').classList.contains('mode-hub'));

    say('the save code and the comfort settings');
    await click('#btn-menu'); await seen('#btn-savebox');
    await click('[data-ts="2"]');
    expect(await page.evaluate(() => document.documentElement.classList.contains('ts-2')), 'the larger text size was not applied');
    await click('[data-ts="0"]');
    await click('#btn-savebox');
    await until(() => { const out = document.getElementById('save-out'); return !!out && /^PYLON[12]\./.test(out.value); });
    const saveCode = await page.evaluate(() => document.getElementById('save-out').value);
    await page.evaluate(c => { document.getElementById('save-in').value = c; }, saveCode);
    await click('#save-load'); await seen('#confirm-yes');
    await click('#confirm-yes');
    await until(() => [...document.querySelectorAll('.toast')].some(t => /Save loaded/.test(t.textContent)));

    if (hasWorker) {
      say('the offline copy: the page starts again with the network switched off');
      await page.evaluate(() => navigator.serviceWorker.ready);
      await until(() => !!navigator.serviceWorker.controller, null, 60000);
      await page.setOfflineMode(true);
      await page.reload({ waitUntil: 'load', timeout: 60000 });
      await until(() => document.getElementById('stage').classList.contains('ready'), null, 60000);
      const offline = await page.evaluate(() => ({ levels: (window.PYLON_LEVELS || []).length, solved: Object.values(JSON.parse(localStorage.getItem('pylon.save.v1')).levels).filter(l => l.solved).length }));
      expect(offline.levels === levels.length, 'offline, ' + offline.levels + ' levels loaded instead of ' + levels.length);
      expect(offline.solved >= 3, 'offline, the saved progress is gone');
      await page.setOfflineMode(false);
    }

    expect(!errors.length, 'the page reported errors:\n    ' + errors.join('\n    '));
    console.log('\nsmoke test passed');
    await browser.close(); server.close();
    process.exit(0);
  } catch (e) {
    console.log('\nFAILED while checking: ' + step + '\n  ' + (e && e.message));
    if (errors.length) console.log('  page errors:\n    ' + errors.join('\n    '));
    try { await page.screenshot({ path: path.join(__dirname, 'failure.png') }); console.log('  screenshot: tests/browser/failure.png'); } catch (x) { /* no picture */ }
    await browser.close(); server.close();
    process.exit(1);
  }
})();
