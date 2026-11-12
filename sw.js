/* Pylon's service worker, for the standalone site only: it keeps a copy of the game so that it starts without a connection.
   build_site.js fills in the three constants below. The copy is one matching set: the page and exactly the scripts that
   page names. A new release is a new worker, which fetches its own set and then drops the old one.

   Online, the page always comes from the network, so a new release shows up at once. Scripts carry a stamp of their
   contents in their address and never change, so they come from the copy. */
const VERSION = "afd338332f";
const CORE = ["./","manifest.webmanifest","icons/icon-192.png","js/minipy-core.js?v=daab12d8","js/minipy-parse.js?v=7eddbc9d","js/minipy-compile.js?v=9cd9a387","js/minipy-lib.js?v=023ffa9e","js/minipy-mods.js?v=40a94720","js/prelude.js?v=779f9a85","js/runner.js?v=3dccdfce","js/craft.js?v=d9ca1295","js/bughunt.js?v=6c055900","js/levels-z1.js?v=f2c34aa6","js/levels-z2.js?v=44902b50","js/levels-z3.js?v=9284c5ff","js/levels-z4.js?v=e11455b8","js/levels-z5.js?v=d188c157","js/levels-z6.js?v=3ed1a65c","js/levels-z7.js?v=f8f55e5c","js/levels-z8.js?v=be4b774f","js/levels-z9.js?v=fba3828b","js/toolcards.js?v=bbd2f717","js/story.js?v=d0085020","js/saga.js?v=12da5cfd","js/curriculum.js?v=9c74b978","js/complete.js?v=2b415e9e","js/editor.js?v=989a6b71","js/terminal.js?v=c2c032b0","js/scenes.js?v=a55b244b","js/world.js?v=8f903d0d","js/score.js?v=088221a0","js/game.js?v=dfc59a8c"];
const OUTSIDE_FILES = ["https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js","https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Barlow:wght@400;500;600&family=JetBrains+Mono:wght@400;500;700&display=swap"];
const CACHE = 'pylon-' + VERSION, KEEP = 'pylon-keep-1';          // KEEP outlives releases: the 3D library, fonts, music
const OUTSIDE = new Set(['cdnjs.cloudflare.com', 'fonts.googleapis.com', 'fonts.gstatic.com']);

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(CORE.map(u => new Request(u, { cache: 'reload' })));
    await outside(OUTSIDE_FILES[0]);                              // the 3D library: without it there is no tower
    for (const u of OUTSIDE_FILES.slice(1)) await fonts(u).catch(() => {});      // the fonts are nice to have, not needed
    await self.skipWaiting();
  })());
});
// The font sheet names one file for every script a font covers. The game is written in the Latin ones, so those are kept.
async function fonts(sheet) {
  const css = await (await outside(sheet)).clone().text();
  const latin = css.split('/*').filter(block => /^\s*latin(-ext)?\s*\*\//.test(block));
  const files = (latin.length ? latin.join(' ') : css).match(/https:\/\/fonts\.gstatic\.com\/[^)\s'"]+/g) || [];
  await Promise.all(Array.from(new Set(files)).slice(0, 40).map(u => outside(u).catch(() => {})));
}
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) if (name.indexOf('pylon-') === 0 && name !== CACHE && name !== KEEP) await caches.delete(name);
    await self.clients.claim();
  })());
});

// A file from another site (the 3D library, the font sheet, a font): kept the first time it is fetched.
async function outside(url) {
  const keep = await caches.open(KEEP), hit = await keep.match(url, { ignoreVary: true });
  if (hit) return hit;
  const res = await fetch(url, { mode: 'cors', credentials: 'omit' });
  if (res.ok) await keep.put(url, res.clone());
  return res;
}
// The page: the network first, the copy when the network fails or takes too long.
async function page(request) {
  try {
    return await Promise.race([fetch(request), new Promise((yes, no) => setTimeout(() => no(new Error('slow')), 6000))]);
  } catch (e) {
    const hit = await (await caches.open(CACHE)).match('./', { ignoreVary: true });
    if (hit) return hit;
    return fetch(request);
  }
}
// Scripts and the other files of the site: the copy first.
async function asset(request) {
  const cache = await caches.open(CACHE), hit = await cache.match(request, { ignoreVary: true });
  if (hit) return hit;
  try {
    const res = await fetch(request);
    if (res.ok && /[?&]v=\w+$/.test(request.url)) cache.put(request, res.clone());      // a stamped script never changes
    return res;
  } catch (e) {
    const old = await cache.match(request, { ignoreSearch: true, ignoreVary: true });   // an older stamp is better than nothing
    if (old) return old;
    throw e;
  }
}
// Music: players ask for a file in parts. The whole file is kept the first time it is asked for, and parts are cut from it.
const fetching = {};
function keepWhole(url) {
  if (!fetching[url]) fetching[url] = (async () => {
    try { const res = await fetch(url); if (res.status === 200) await (await caches.open(KEEP)).put(url, res); } catch (e) { /* another time */ }
    delete fetching[url];
  })();
  return fetching[url];
}
async function part(request, whole) {
  const m = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get('range') || '');
  if (!m || (m[1] === '' && m[2] === '')) return whole;
  const blob = await whole.blob(), size = blob.size;
  const start = m[1] === '' ? Math.max(0, size - Number(m[2])) : Number(m[1]), end = m[1] !== '' && m[2] !== '' ? Math.min(size - 1, Number(m[2])) : size - 1;
  if (start >= size || start > end) return new Response(null, { status: 416, headers: { 'Content-Range': 'bytes */' + size } });
  return new Response(blob.slice(start, end + 1), { status: 206, statusText: 'Partial Content', headers: {
    'Content-Type': whole.headers.get('Content-Type') || 'audio/mpeg', 'Content-Range': 'bytes ' + start + '-' + end + '/' + size, 'Content-Length': String(end - start + 1), 'Accept-Ranges': 'bytes' } });
}
async function media(event) {
  const request = event.request, hit = await (await caches.open(KEEP)).match(request.url, { ignoreVary: true });
  if (hit) return part(request, hit);
  try { event.waitUntil(keepWhole(request.url)); } catch (e) { /* the event has already ended */ }
  return fetch(request);
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin === self.location.origin) {
    if (/\/audio\//.test(url.pathname)) event.respondWith(media(event));
    else if (request.mode === 'navigate') event.respondWith(page(request));
    else event.respondWith(asset(request));
  } else if (OUTSIDE.has(url.hostname)) event.respondWith(outside(request.url).catch(() => fetch(request)));
});
