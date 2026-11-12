/* Pylon 3D world (three.js r128). Two scenes share one renderer:
   - the hub: the tower with one platform per level on a rising spiral;
   - the arena: a robot deck (zone 1) or a ring of test crystals (code levels).
   The picture is treated like a film frame. Colours are authored in sRGB and lit in linear light, surfaces reflect a small
   studio of coloured lamps (an environment map), one key light casts soft shadows, bright things bloom, and the result goes
   through a filmic tone curve. Real ray tracing is out of reach for a browser game on a phone; these techniques give most
   of its look at a small part of the cost. The game talks to all of this through window.PylonWorld. */
(function (root) {
'use strict';
const T = root.THREE;
const W = root.PylonWorld = { ok: !!T };
if (!T) return;

const RISE = 2, RADIUS = 10, PER_TURN = 8, TAU = Math.PI * 2;
const mq = q => !!(root.matchMedia && root.matchMedia(q).matches);
let calm = mq('(prefers-reduced-motion: reduce)');           // the Menu can override what the system asks for
const coarse = mq('(pointer: coarse)');
const FONT = "'Barlow Condensed', 'Arial Narrow', 'Trebuchet MS', sans-serif";
let renderer, scene, camera, stage, canvas, glowTex, gridTex, sun, rim, hemi, sky, dust, starsB, bloom = null;
let hub, arena, pip, hubPip, selRing, beacon, beaconGlow, parts, shellPaint = 0x8f97b3;
let nodes = [], zoneInfo = [], pickables = [], levels = [], zones = [];
let mode = 'hub', selected = 0, nextNode = -1, epoch = 0, cb = {}, time = 0, arenaSpan = 9;
const cam = { az: 0, y: 0, dist: 27 }, camT = { az: 0, y: 0, dist: 27 };
const acam = { az: Math.PI / 2, el: 0.9, dist: 12 }, acamT = { az: Math.PI / 2, el: 0.9, dist: 12 }, atarget = new T.Vector3();
let topY = 0, board = null, crystals = [], lock = null, beam = null, aty = null;

// ---------------------------------------------------------------- small helpers
// Colours are written the way a designer picks them (sRGB) and converted once, because the lighting maths is linear.
const lin = c => (c && c.isColor ? c.clone() : new T.Color(c).convertSRGBToLinear());
const setLin = (color, hex) => color.set(hex).convertSRGBToLinear();
const pf = f => Math.pow(f, 2.2);                 // a brightness factor as the eye sees it, turned into a linear one
const tint = lin(0x4fe3d0), tintT = lin(0x4fe3d0), COOL = lin(0x5f86ff), SKYLIGHT = lin(0x9fb4ff), _c = new T.Color(), _v = new T.Vector3();
function std(color, o) {
  o = Object.assign({ roughness: 0.6, metalness: 0.15, envMapIntensity: 0.85 }, o || {});
  const em = o.emissive;
  delete o.emissive;
  const m = o.clearcoat !== undefined ? new T.MeshPhysicalMaterial(o) : new T.MeshStandardMaterial(o);
  m.color.copy(lin(color));
  if (em !== undefined) m.emissive.copy(lin(em));
  return m;
}
// Things that are light themselves (rims, eyes, beams) skip the tone curve so they stay vivid and feed the bloom.
function basic(color, o) { const m = new T.MeshBasicMaterial(Object.assign({ toneMapped: false }, o || {})); m.color.copy(lin(color)); return m; }
const easeInOut = k => k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
const easeOut = k => 1 - Math.pow(1 - k, 3);
const easeIn = k => k * k;
const tweens = [];
function tween(dur, fn, ease) {
  return new Promise(res => {
    if (calm) dur *= 0.5;
    if (dur <= 0) { fn(1); res(); return; }
    tweens.push({ t: 0, dur, fn, ease: ease || easeInOut, res });
  });
}
const sleep = s => tween(s, () => {});
function stepTweens(dt) {
  for (let i = tweens.length - 1; i >= 0; i--) {
    const t = tweens[i];
    t.t += dt;
    const k = Math.min(1, t.t / t.dur);
    t.fn(t.ease(k));
    if (k >= 1) { tweens.splice(i, 1); t.res(); }
  }
}
function cancelAll() {
  epoch++;
  const old = tweens.splice(0);
  for (const t of old) t.res();
  if (beam) beam.material.opacity = 0;             // a shot that was fading out when the show was skipped
}
function canvasTex(c) { const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = 4; return t; }
function makeGlow() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d'), grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,1)'); grad.addColorStop(0.25, 'rgba(255,255,255,.55)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
  return canvasTex(c);
}
// Light lines for the deck of a test arena: nested hexagons and spokes, drawn once and tinted by the floor colour.
function makeGrid() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, 512, 512);
  g.translate(256, 256);
  g.strokeStyle = '#fff'; g.lineJoin = 'round';
  const hex = (r, w, a) => { g.globalAlpha = a; g.lineWidth = w; g.beginPath(); for (let i = 0; i <= 6; i++) { const t = i * Math.PI / 3; g[i ? 'lineTo' : 'moveTo'](r * Math.cos(t), r * Math.sin(t)); } g.stroke(); };
  hex(238, 5, 1); hex(178, 2, 0.5); hex(112, 2, 0.38); hex(50, 3, 0.85);
  g.lineWidth = 2; g.globalAlpha = 0.3;
  for (let i = 0; i < 6; i++) { const t = i * Math.PI / 3 + Math.PI / 6; g.beginPath(); g.moveTo(44 * Math.cos(t), 44 * Math.sin(t)); g.lineTo(205 * Math.cos(t), 205 * Math.sin(t)); g.stroke(); }
  return canvasTex(c);
}
function glow(color, size, opacity) {
  const s = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: lin(color), transparent: true, opacity: opacity === undefined ? 0.6 : opacity, depthWrite: false, blending: T.AdditiveBlending, fog: false, toneMapped: false }));
  s.scale.set(size, size, 1);
  return s;
}
function textTex(text, w, h, font, color) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.font = font; g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, w / 2, h / 2 + h * 0.04);
  return canvasTex(c);
}
const track = s => s.split('').join(' ');       // letter-spacing for canvas text, which has none of its own
function dispose(obj) {
  const own = t => t && t !== glowTex && t !== gridTex;
  obj.traverse(o => {
    if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose();
    const m = o.material;
    if (m && !(m.userData && m.userData.shared)) { if (own(m.map)) m.map.dispose(); if (own(m.emissiveMap)) m.emissiveMap.dispose(); m.dispose(); }
  });
}
// Solid, lit surfaces cast and receive shadows; lights, glows and labels do not.
function lit(group) { group.traverse(o => { if (o.isMesh && o.material && o.material.isMeshStandardMaterial) { o.castShadow = true; o.receiveShadow = true; } }); }
// A sphere seen from inside, shaded from bottom to top through the given stops: [height -1..1, r, g, b] in linear light.
function paint(geo, stops) {
  const p = geo.attributes.position, n = p.count, col = new Float32Array(n * 3);
  let r = 0;
  for (let i = 0; i < n; i++) r = Math.max(r, Math.abs(p.getY(i)));
  for (let i = 0; i < n; i++) {
    const y = p.getY(i) / r;
    let k = 0;
    while (k < stops.length - 2 && y > stops[k + 1][0]) k++;
    const a = stops[k], b = stops[k + 1], t = Math.max(0, Math.min(1, (y - a[0]) / (b[0] - a[0])));
    for (let c = 0; c < 3; c++) col[i * 3 + c] = a[c + 1] + (b[c + 1] - a[c + 1]) * t;
  }
  geo.setAttribute('color', new T.BufferAttribute(col, 3));
}
const sfx = name => { if (cb.sfx) cb.sfx(name); };

// ---------------------------------------------------------------- picture quality
// Three tiers. "auto" starts from the kind of device and steps down by itself if frames stay slow.
const TIERS = { high: { dpr: 2, shadow: 2048, bloom: 2 }, medium: { dpr: 1.5, shadow: 1024, bloom: 1 }, low: { dpr: 1.25, shadow: 0, bloom: 0 } };
let qPref = 'auto', qName = 'high', q = TIERS.high, slow = 0, grace = 0;
function autoTier() {
  const mem = root.navigator && root.navigator.deviceMemory;
  if (mem && mem <= 3) return 'low';
  return coarse || Math.min(root.innerWidth || 9999, root.innerHeight || 9999) < 520 ? 'medium' : 'high';
}
function settle() { grace = performance.now() + 3000; slow = 0; }      // new shaders compile after a change: do not count those frames
function applyQuality(name) {
  qName = name; q = TIERS[name];
  renderer.setPixelRatio(Math.min(root.devicePixelRatio || 1, q.dpr));
  renderer.shadowMap.enabled = q.shadow > 0;
  sun.castShadow = q.shadow > 0;
  if (q.shadow && sun.shadow.mapSize.x !== q.shadow) {
    sun.shadow.mapSize.set(q.shadow, q.shadow);
    if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
  }
  scene.traverse(o => { if (o.material) o.material.needsUpdate = true; });       // shadows on or off changes every lit shader
  settle();
  W.resize();
}
W.setQuality = function (name) { qPref = TIERS[name] ? name : 'auto'; if (renderer) applyQuality(qPref === 'auto' ? autoTier() : qPref); };
W.getQuality = () => ({ pref: qPref, now: qName });

// ---------------------------------------------------------------- bloom
// The scene is drawn a second time at low resolution, everything but its brightest parts is thrown away, the rest is blurred
// and added on top of the sharp picture. The sharp picture keeps its anti-aliasing because it is never read back.
const VS = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
const FS_BRIGHT = 'uniform sampler2D tex; uniform float lo; uniform float hi; varying vec2 vUv; void main() { vec3 c = texture2D(tex, vUv).rgb; float m = max(c.r, max(c.g, c.b)); gl_FragColor = vec4(c * smoothstep(lo, hi, m), 1.0); }';
const FS_BLUR = 'uniform sampler2D tex; uniform vec2 dir; varying vec2 vUv; void main() { vec3 c = texture2D(tex, vUv).rgb * 0.227027; c += (texture2D(tex, vUv + dir * 1.3846).rgb + texture2D(tex, vUv - dir * 1.3846).rgb) * 0.316216; c += (texture2D(tex, vUv + dir * 3.2308).rgb + texture2D(tex, vUv - dir * 3.2308).rgb) * 0.070270; gl_FragColor = vec4(c, 1.0); }';
const FS_ADD = 'uniform sampler2D tex; uniform sampler2D wide; uniform float sa; uniform float sb; varying vec2 vUv; void main() { gl_FragColor = vec4(texture2D(tex, vUv).rgb * sa + texture2D(wide, vUv).rgb * sb, 1.0); }';
function makeBloom() {
  const rt = depth => { const t = new T.WebGLRenderTarget(4, 4, { minFilter: T.LinearFilter, magFilter: T.LinearFilter, format: T.RGBAFormat, depthBuffer: depth, stencilBuffer: false }); t.texture.generateMipmaps = false; return t; };
  const mat = (fs, uniforms, extra) => new T.ShaderMaterial(Object.assign({ vertexShader: VS, fragmentShader: fs, uniforms, depthTest: false, depthWrite: false }, extra || {}));
  const b = { scene: rt(true), a1: rt(false), a2: rt(false), b1: rt(false), b2: rt(false), qscene: new T.Scene(), qcam: new T.OrthographicCamera(-1, 1, 1, -1, 0, 1) };
  b.scene.texture.encoding = T.sRGBEncoding;           // so this copy holds the same display colours as the screen
  b.bright = mat(FS_BRIGHT, { tex: { value: null }, lo: { value: 0.8 }, hi: { value: 1.02 } });
  b.blur = mat(FS_BLUR, { tex: { value: null }, dir: { value: new T.Vector2() } });
  b.add = mat(FS_ADD, { tex: { value: null }, wide: { value: null }, sa: { value: 0.7 }, sb: { value: 0.8 } }, { blending: T.AdditiveBlending, transparent: true });
  b.quad = new T.Mesh(new T.PlaneGeometry(2, 2), b.bright);
  b.quad.frustumCulled = false;
  b.qscene.add(b.quad);
  return b;
}
function sizeBloom(w, h) {
  if (!bloom) return;
  const s = (t, d) => t.setSize(Math.max(2, Math.round(w / d)), Math.max(2, Math.round(h / d)));
  s(bloom.scene, 2); s(bloom.a1, 4); s(bloom.a2, 4); s(bloom.b1, 8); s(bloom.b2, 8);
}
function pass(m, tex, target) { m.uniforms.tex.value = tex; bloom.quad.material = m; renderer.setRenderTarget(target); renderer.render(bloom.qscene, bloom.qcam); }
function drawBloom() {
  const b = bloom, d = b.blur.uniforms.dir.value;
  renderer.setRenderTarget(b.scene);
  renderer.render(scene, camera);
  pass(b.bright, b.scene.texture, b.a1);
  d.set(1 / b.a1.width, 0); pass(b.blur, b.a1.texture, b.a2);
  d.set(0, 1 / b.a1.height); pass(b.blur, b.a2.texture, b.a1);
  if (q.bloom > 1) {                                   // a second, wider halo
    d.set(1.5 / b.b1.width, 0); pass(b.blur, b.a1.texture, b.b2);
    d.set(0, 1.5 / b.b1.height); pass(b.blur, b.b2.texture, b.b1);
  }
  b.add.uniforms.tex.value = b.a1.texture; b.add.uniforms.wide.value = b.b1.texture; b.add.uniforms.sb.value = q.bloom > 1 ? 0.8 : 0;
  b.quad.material = b.add;
  renderer.setRenderTarget(null);
  renderer.autoClear = false;
  renderer.render(b.qscene, b.qcam);
  renderer.autoClear = true;
}

// ---------------------------------------------------------------- particles
const PMAX = 420;
const ppos = new Float32Array(PMAX * 3), pcol = new Float32Array(PMAX * 3), pbase = new Float32Array(PMAX * 3), pvel = new Float32Array(PMAX * 3), plife = new Float32Array(PMAX);
let pcur = 0;
function makeParticles() {
  const geo = new T.BufferGeometry();
  for (let i = 0; i < PMAX; i++) ppos[i * 3 + 1] = -9999;
  geo.setAttribute('position', new T.BufferAttribute(ppos, 3));
  geo.setAttribute('color', new T.BufferAttribute(pcol, 3));
  parts = new T.Points(geo, new T.PointsMaterial({ size: 0.34, map: glowTex, vertexColors: true, transparent: true, depthWrite: false, blending: T.AdditiveBlending, fog: false, toneMapped: false }));
  parts.frustumCulled = false;
  scene.add(parts);
}
function burst(p, color, n, speed, lift) {
  if (calm) n = Math.ceil(n / 3);
  const c = lin(color);
  for (let k = 0; k < n; k++) {
    const i = pcur++ % PMAX, a = Math.random() * TAU, u = Math.random() * 2 - 1, r = Math.sqrt(1 - u * u), s = speed * (0.35 + Math.random() * 0.65);
    ppos[i * 3] = p.x; ppos[i * 3 + 1] = p.y; ppos[i * 3 + 2] = p.z;
    pvel[i * 3] = Math.cos(a) * r * s; pvel[i * 3 + 1] = u * s + (lift || 0); pvel[i * 3 + 2] = Math.sin(a) * r * s;
    pbase[i * 3] = c.r; pbase[i * 3 + 1] = c.g; pbase[i * 3 + 2] = c.b;
    plife[i] = 0.5 + Math.random() * 0.7;
  }
}
function stepParticles(dt) {
  let any = false;
  for (let i = 0; i < PMAX; i++) {
    if (plife[i] <= 0) continue;
    any = true;
    plife[i] -= dt;
    if (plife[i] <= 0) { ppos[i * 3 + 1] = -9999; continue; }
    pvel[i * 3 + 1] -= 5 * dt;
    ppos[i * 3] += pvel[i * 3] * dt; ppos[i * 3 + 1] += pvel[i * 3 + 1] * dt; ppos[i * 3 + 2] += pvel[i * 3 + 2] * dt;
    const f = Math.min(1, plife[i] * 2.2);
    pcol[i * 3] = pbase[i * 3] * f; pcol[i * 3 + 1] = pbase[i * 3 + 1] * f; pcol[i * 3 + 2] = pbase[i * 3 + 2] * f;
  }
  if (any) { parts.geometry.attributes.position.needsUpdate = true; parts.geometry.attributes.color.needsUpdate = true; }
}

// ---------------------------------------------------------------- PIP, the drone
function makePip() {
  const g = new T.Group(), tilt = new T.Group();
  g.add(tilt);
  // The shell is painted mid-grey on purpose: under the key light and the film curve that is what reads as white with shading left in it.
  const shell = std(shellPaint, { roughness: 0.3, metalness: 0.04, clearcoat: 1, clearcoatRoughness: 0.16, envMapIntensity: 0.7 });
  const dark = std(0x0c1232, { roughness: 0.22, metalness: 0.75, envMapIntensity: 1.35 });
  const body = new T.Mesh(new T.SphereGeometry(0.34, 32, 20), shell);
  body.scale.y = 0.92;
  const visor = new T.Mesh(new T.SphereGeometry(0.347, 32, 14, Math.PI / 2 - 0.95, 1.9, Math.PI / 2 - 0.46, 0.66), dark);
  visor.scale.y = 0.92;
  const eyeMat = basic(0x7ff6ff);
  const eyes = [-0.115, 0.115].map(x => { const e = new T.Mesh(new T.CircleGeometry(0.052, 16), eyeMat); e.position.set(x, 0.045, 0.352); e.rotation.y = x * 2.4; tilt.add(e); return e; });
  const mast = new T.Mesh(new T.CylinderGeometry(0.012, 0.012, 0.2, 6), dark);
  mast.position.y = 0.4;
  const tipMat = basic(0xffc247), tip = new T.Mesh(new T.SphereGeometry(0.045, 10, 8), tipMat);
  tip.position.y = 0.52;
  const ears = [-1, 1].map(s => { const e = new T.Mesh(new T.CylinderGeometry(0.075, 0.075, 0.09, 14), dark); e.rotation.z = Math.PI / 2; e.position.x = s * 0.35; tilt.add(e); return e; });
  const ring = new T.Mesh(new T.TorusGeometry(0.2, 0.028, 8, 28), basic(0x4fe3d0));
  ring.rotation.x = Math.PI / 2; ring.position.y = -0.36;
  const under = glow(0x4fe3d0, 0.95, 0.5);
  under.position.y = -0.5;
  const lamp = new T.PointLight(lin(0x4fe3d0), 1.1, 5.5, 2);          // the thruster lights whatever PIP hovers over
  lamp.position.y = -0.3;
  const shadow = new T.Mesh(new T.CircleGeometry(0.3, 20), basic(0x000000, { transparent: true, opacity: 0.26, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = -0.41;
  tilt.add(body, visor, mast, tip, ring, under, lamp);
  g.add(shadow);
  g.userData = { tilt, eyes, eyeMat, ears, ring, tip, shadow, shell, mood: 'idle', phase: Math.random() * 6 };
  return g;
}
function setMood(p, mood) {
  const u = p.userData;
  u.mood = mood;
  setLin(u.eyeMat.color, mood === 'sad' ? 0xff6b7d : mood === 'off' ? 0x26305c : 0x7ff6ff);
  for (const e of u.eyes) e.scale.set(1, mood === 'happy' ? 0.38 : mood === 'sad' ? 0.7 : 1, 1);
}
function idlePip(p, base, dt) {
  const u = p.userData;
  u.phase += dt;
  u.tilt.position.y = calm ? 0 : Math.sin(u.phase * 2.1) * 0.035 * base;
  u.ring.rotation.z += dt * 2.4;
  u.tip.scale.setScalar(1 + (calm ? 0 : Math.sin(u.phase * 5) * 0.18));
}

// ---------------------------------------------------------------- hub: the tower
const nodeAngle = i => i * (TAU / PER_TURN);
const nodePos = i => new T.Vector3(RADIUS * Math.cos(nodeAngle(i)), i * RISE + 1.2, RADIUS * Math.sin(nodeAngle(i)));
function buildHub() {
  hub = new T.Group();
  scene.add(hub);
  // Floors need not be the same size: each one is as tall as the levels that stand on it.
  const zoneStart = zones.map(() => 0), zoneCount = zones.map(() => 0);
  levels.forEach((lv, i) => { const k = lv.zone - 1; if (!zoneCount[k]) zoneStart[k] = i; zoneCount[k]++; });
  topY = levels.length * RISE;
  const island = new T.Mesh(new T.CylinderGeometry(15.5, 10.5, 2.6, 6), std(0x0a0f2a, { roughness: 0.88, metalness: 0.15, envMapIntensity: 0.35 }));
  island.position.y = -2.1;
  const islandRim = new T.Mesh(new T.TorusGeometry(15.2, 0.1, 6, 6), basic(0x2b3a80));
  islandRim.rotation.set(Math.PI / 2, 0, Math.PI / 6); islandRim.position.y = -0.8;
  const islandGlow = glow(0x3a56c8, 46, 0.22);
  islandGlow.position.set(0, -6, 0);
  hub.add(island, islandRim, islandGlow);
  const coreMat = std(0x10173c, { roughness: 0.5, metalness: 0.55, envMapIntensity: 0.7 }), collarMat = std(0x1a2456, { roughness: 0.4, metalness: 0.6 });
  zones.forEach((z, k) => {
    const y0 = zoneStart[k] * RISE, ZONE_H = Math.max(1, zoneCount[k]) * RISE, col = lin(z.color);
    const core = new T.Mesh(new T.CylinderGeometry(2.3, 2.3, ZONE_H - 0.5, 6), coreMat);
    core.position.y = y0 + ZONE_H / 2;
    hub.add(core);
    const stripMat = basic(0x000000);
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3, s = new T.Mesh(new T.BoxGeometry(0.16, ZONE_H - 1.6, 0.16), stripMat);
      s.position.set(2.36 * Math.sin(a), y0 + ZONE_H / 2, 2.36 * Math.cos(a));
      hub.add(s);
    }
    const collar = new T.Mesh(new T.CylinderGeometry(3.2, 3.2, 0.5, 6), collarMat);
    collar.position.y = y0 + 0.05;
    const ringMat = basic(0x000000), ring = new T.Mesh(new T.TorusGeometry(3.7, 0.09, 8, 54), ringMat);
    ring.rotation.x = Math.PI / 2; ring.position.y = y0 + 0.05;
    const halo = glow(z.color, 13, 0);
    halo.position.y = y0 + ZONE_H / 2;
    const a0 = nodeAngle(zoneStart[k]) + 0.4;
    const label = new T.Sprite(new T.SpriteMaterial({ map: textTex(track('FLOOR ' + (k + 1) + '  ·  ' + z.name.toUpperCase()), 1024, 96, '600 56px ' + FONT, z.color), transparent: true, depthWrite: false, fog: true, toneMapped: false }));
    label.scale.set(6.9, 0.65, 1);
    label.position.set(5.6 * Math.cos(a0), y0 + 5.2, 5.6 * Math.sin(a0));
    hub.add(collar, ring, halo, label);
    zoneInfo.push({ col, stripMat, ringMat, halo });
  });
  const spire = new T.Mesh(new T.CylinderGeometry(0.12, 1.7, 9, 6), std(0x1a2456, { roughness: 0.35, metalness: 0.7 }));
  spire.position.y = topY + 4.5;
  beacon = new T.Mesh(new T.IcosahedronGeometry(1.05, 1), basic(0x2c3870));
  beacon.position.y = topY + 9.7;
  beaconGlow = glow(0xfff2c2, 12, 0.08);
  beaconGlow.position.y = topY + 9.7;
  hub.add(spire, beacon, beaconGlow);

  const starGeo = new T.OctahedronGeometry(0.16);
  starGeo.userData.shared = true;
  const baseMat = std(0x1a2352, { roughness: 0.42, metalness: 0.62, envMapIntensity: 1 }), strutMat = std(0x141c46, { roughness: 0.45, metalness: 0.6 }), starMat = basic(0xffc247);
  levels.forEach((lv, i) => {
    const a = nodeAngle(i), pos = nodePos(i), big = lv.boss ? 1.35 : 1, g = new T.Group();
    g.position.copy(pos);
    g.rotation.y = -a;                                  // local +X points away from the tower
    const baseM = new T.Mesh(new T.CylinderGeometry(1.45 * big, 1.12 * big, 0.56, 6), baseMat);
    baseM.userData.node = i;
    pickables.push(baseM);
    // The top is dark glass; its state colour is light coming from inside it, so shadows and reflections still show on it.
    const topMat = std(0x080c22, { roughness: 0.36, metalness: 0.3, envMapIntensity: 0.8 }), top = new T.Mesh(new T.CylinderGeometry(1.2 * big, 1.2 * big, 0.06, 6), topMat);
    top.position.y = 0.3;
    top.userData.node = i;
    pickables.push(top);
    const rimMat = basic(0x222b5a), rim = new T.Mesh(new T.TorusGeometry(1.44 * big, 0.05, 6, 6), rimMat);
    rim.rotation.set(Math.PI / 2, 0, Math.PI / 6); rim.position.y = 0.3;
    const decalMat = basic(0xffffff, { map: textTex(lv.boss ? '★' : String(lv.order), 128, 128, '700 92px ' + FONT, '#ffffff'), transparent: true, depthWrite: false });
    const decal = new T.Mesh(new T.PlaneGeometry(1.45 * big, 1.45 * big), decalMat), dh = new T.Group();
    decal.rotation.x = -Math.PI / 2;
    dh.rotation.y = Math.PI / 2; dh.position.y = 0.345;
    dh.add(decal);
    const strutLen = RADIUS - 3.6, strut = new T.Mesh(new T.BoxGeometry(strutLen, 0.14, 0.34), strutMat);
    strut.position.set(-(1.2 * big + strutLen / 2), -0.16, 0);
    const stars = new T.Group();
    for (let s = 0; s < 3; s++) { const m = new T.Mesh(starGeo, starMat); m.position.set(0, 0, (s - 1) * 0.5); stars.add(m); }
    stars.position.y = 1.9 * (lv.boss ? 1.15 : 1);
    stars.visible = false;
    g.add(baseM, top, rim, dh, strut, stars);
    hub.add(g);
    let bridgeMat = null;
    if (i + 1 < levels.length) {
      const p2 = nodePos(i + 1), len = pos.distanceTo(p2) - 3.2;
      bridgeMat = basic(0x18204a);
      const b = new T.Mesh(new T.BoxGeometry(0.36, 0.07, len), bridgeMat);
      b.position.copy(pos).add(p2).multiplyScalar(0.5);
      b.position.y += 0.12;
      b.lookAt(p2.x, p2.y + 0.12, p2.z);
      hub.add(b);
    }
    nodes.push({ lv, pos, a, g, topMat, rimMat, decalMat, stars, bridgeMat, state: 'locked', col: zoneInfo[lv.zone - 1].col });
  });
  selRing = new T.Mesh(new T.TorusGeometry(1.95, 0.04, 8, 48), basic(0xffffff, { transparent: true, opacity: 0.9 }));
  selRing.rotation.x = Math.PI / 2;
  hub.add(selRing);
  hubPip = makePip();
  hubPip.scale.setScalar(1.45);
  hub.add(hubPip);
  lit(hub);
}
W.setProgress = function (states, next) {
  nextNode = next;
  const solvedByZone = zones.map(() => 0), countByZone = zones.map(() => 0);
  nodes.forEach((n, i) => {
    const s = states[i];
    n.state = s.state;
    const c = n.col;
    if (s.state === 'solved') { n.topMat.emissive.copy(c).multiplyScalar(pf(0.9)); n.rimMat.color.copy(c); setLin(n.decalMat.color, 0x0a0f2a); n.decalMat.opacity = 0.95; }
    else if (s.state === 'open') { n.topMat.emissive.copy(c).multiplyScalar(pf(0.36)); n.rimMat.color.copy(c).multiplyScalar(pf(0.75)); setLin(n.decalMat.color, 0xffffff); n.decalMat.opacity = 1; }
    else { setLin(n.topMat.emissive, 0x0d1330); setLin(n.rimMat.color, 0x222b5a); setLin(n.decalMat.color, 0x8892c4); n.decalMat.opacity = 0.35; }
    n.stars.visible = s.state === 'solved';
    n.stars.children.forEach((m, k) => { m.visible = k < s.stars; });
    if (n.bridgeMat) { if (s.state === 'solved') n.bridgeMat.color.copy(c).multiplyScalar(pf(0.85)); else setLin(n.bridgeMat.color, 0x18204a); }
    countByZone[n.lv.zone - 1]++;
    if (s.state === 'solved') solvedByZone[n.lv.zone - 1]++;
  });
  let all = true;
  zoneInfo.forEach((z, k) => {
    const r = countByZone[k] ? solvedByZone[k] / countByZone[k] : 0;
    if (r < 1) all = false;
    z.stripMat.color.copy(z.col).multiplyScalar(pf(0.1 + 0.9 * r));
    z.ringMat.color.copy(z.col).multiplyScalar(pf(r >= 1 ? 1 : 0.22 + 0.3 * r));
    z.halo.material.opacity = r >= 1 ? 0.2 : 0.05 * r;
  });
  setLin(beacon.material.color, all ? 0xfff6d6 : 0x2c3870);
  beaconGlow.material.opacity = all ? 0.95 : 0.08;
};
function nearAngle(a, ref) { return a + TAU * Math.round((ref - a) / TAU); }
function placeHubPip(i) {
  const n = nodes[i];
  hubPip.position.set(n.pos.x, n.pos.y + 1.12, n.pos.z);
  hubPip.rotation.y = Math.PI / 2 - n.a;
}
W.select = function (i, instant) {
  if (!nodes[i]) return;
  const from = selected, n = nodes[i];
  selected = i;
  camT.az = nearAngle(n.a, camT.az);
  camT.y = n.pos.y;
  if (mode === 'hub') tintT.copy(n.col);
  selRing.position.set(n.pos.x, n.pos.y + 0.36, n.pos.z);
  selRing.scale.setScalar(n.lv.boss ? 1.3 : 1);
  if (instant || from === i || mode !== 'hub') { cam.az = instant ? camT.az : cam.az; if (instant) cam.y = camT.y; placeHubPip(i); return; }
  const a = hubPip.position.clone(), b = new T.Vector3(n.pos.x, n.pos.y + 1.12, n.pos.z), my = epoch;
  const h0 = hubPip.rotation.y, h1 = h0 + (((Math.PI / 2 - n.a - h0) % TAU) + TAU * 1.5) % TAU - Math.PI;
  tween(Math.min(0.75, 0.3 + a.distanceTo(b) * 0.02), k => {
    if (my !== epoch) return;
    hubPip.position.lerpVectors(a, b, k);
    hubPip.position.y += Math.sin(k * Math.PI) * 1.6;
    hubPip.rotation.y = h0 + (h1 - h0) * k;
  });
};
W.showHub = function (celebrate) {
  cancelAll();
  mode = 'hub';
  hub.visible = true;
  if (arena) arena.visible = false;
  scene.fog.density = 0.012;
  placeHubPip(selected);
  setMood(hubPip, 'idle');
  if (nodes[selected]) tintT.copy(nodes[selected].col);
  settle();
  if (celebrate !== undefined && nodes[celebrate]) {
    const n = nodes[celebrate];
    burst(new T.Vector3(n.pos.x, n.pos.y + 1, n.pos.z), n.col, 70, 5, 3);
  }
};

// ---------------------------------------------------------------- arena shared
function clearArena() {
  cancelAll();
  if (arena) { scene.remove(arena); dispose(arena); }
  arena = new T.Group();
  scene.add(arena);
  board = null; crystals = []; lock = null; beam = null; pip = null; sc = null;
  data = null; dataCam = null; aty = null; lockHidden = false;
  mode = 'arena';
  hub.visible = false;
  scene.fog.density = 0.006;
  settle();
}
function fitDist(radius, el) {
  const aspect = stage.clientWidth / Math.max(1, stage.clientHeight), half = T.MathUtils.degToRad(camera.fov / 2);
  const eff = aspect >= 1 ? half : Math.atan(Math.tan(half) * aspect);
  return radius / Math.sin(eff) * (0.74 + 0.1 * el);
}
// Every arena opens with the camera a little too far and too high, and lets it settle: a short push-in.
function openShot() { Object.assign(acam, acamT); if (!calm) { acam.dist = acamT.dist * 1.32; acam.el = Math.min(1.5, acamT.el + 0.2); } }

// ---------------------------------------------------------------- arena: robot deck
const HEAD = { N: Math.PI, E: Math.PI / 2, S: 0, W: -Math.PI / 2 };
W.showRobot = function (world, color) {
  clearArena();
  const col = lin(color), ox = -(world.w - 1) / 2, oz = -(world.h - 1) / 2;
  const tileGeo = new T.BoxGeometry(0.94, 0.4, 0.94), wallGeo = new T.BoxGeometry(0.94, 0.6, 0.94), edgeGeo = new T.EdgesGeometry(wallGeo);
  let walls = 0;
  const matA = std(0x18225a, { roughness: 0.5, metalness: 0.35, envMapIntensity: 0.6 }), matB = std(0x121a44, { roughness: 0.5, metalness: 0.35, envMapIntensity: 0.6 }), wallMat = std(0x1f2b68, { roughness: 0.5, metalness: 0.35, envMapIntensity: 0.55 });
  const edgeMat = new T.LineBasicMaterial({ color: col.clone().multiplyScalar(pf(0.9)), transparent: true, opacity: 0.75, toneMapped: false });
  for (let y = 0; y < world.h; y++) for (let x = 0; x < world.w; x++) {
    const c = world.cells[y][x];
    if (c === 'void') continue;
    const tile = new T.Mesh(tileGeo, (x + y) % 2 ? matA : matB);
    tile.position.set(ox + x, -0.2, oz + y);
    arena.add(tile);
    if (c === 'wall') {
      const wl = new T.Mesh(wallGeo, wallMat), ed = new T.LineSegments(edgeGeo, edgeMat);
      wl.position.set(ox + x, 0.3, oz + y); ed.position.copy(wl.position);
      arena.add(wl, ed);
      walls++;
    }
  }
  const startRing = new T.Mesh(new T.TorusGeometry(0.36, 0.022, 6, 28), basic(0xffffff, { transparent: true, opacity: 0.45 }));
  startRing.rotation.x = Math.PI / 2; startRing.position.set(ox + world.start[0], 0.02, oz + world.start[1]);
  arena.add(startRing);
  board = { world, ox, oz, shards: {}, exit: null, col };
  if (world.exit) {
    const p = new T.Vector3(ox + world.exit[0], 0, oz + world.exit[1]);
    const ring = new T.Mesh(new T.TorusGeometry(0.34, 0.05, 8, 28), basic(0xffc247));
    ring.rotation.x = Math.PI / 2; ring.position.copy(p).setY(0.04);
    const shaft = new T.Mesh(new T.CylinderGeometry(0.16, 0.26, 2.6, 20, 1, true), basic(0xffc247, { transparent: true, opacity: 0.16, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide }));
    shaft.position.copy(p).setY(1.3);
    const g = glow(0xffc247, 1.9, 0.55);
    g.position.copy(p).setY(0.25);
    const lamp = new T.PointLight(lin(0xffc247), 1.3, 4.5, 2);
    lamp.position.copy(p).setY(0.8);
    arena.add(ring, shaft, g, lamp);
    board.exit = { p, ring, shaft };
  }
  const shardGeo = new T.OctahedronGeometry(0.19), shardMat = std(0x0b1030, { emissive: 0x8ff8ff, emissiveIntensity: 1.25, roughness: 0.1, metalness: 0.3, flatShading: true, envMapIntensity: 1.5 });
  for (const s of world.shards) {
    const m = new T.Mesh(shardGeo, shardMat), g = glow(0x4fe3d0, 0.9, 0.5), holder = new T.Group();
    holder.position.set(ox + s[0], 0.5, oz + s[1]);
    holder.add(m, g);
    arena.add(holder);
    board.shards[s[0] + ',' + s[1]] = holder;
  }
  const under = glow(color, Math.max(world.w, world.h) * 2.6, 0.2);
  under.position.y = -1.6;
  arena.add(under);
  pip = makePip();
  arena.add(pip);
  resetRobot();
  const r = 0.5 * Math.hypot(world.w, world.h) + 0.9;
  atarget.set(0, 0.1, 0);
  const el = walls > 4 ? 1.08 : 0.8;           // look more steeply into mazes so walls do not hide the corridors
  acamT.az = Math.PI / 2; acamT.el = el; acamT.dist = fitDist(r, el);
  openShot();
  arenaSpan = r + 2.5;
  tintT.copy(col);
  lit(arena);
};
function resetRobot() {
  if (!board) return;
  const w = board.world;
  pip.position.set(board.ox + w.start[0], 0.42, board.oz + w.start[1]);
  pip.rotation.set(0, HEAD[w.dir], 0);
  pip.scale.setScalar(1);
  pip.userData.tilt.rotation.set(0, 0, 0);
  pip.userData.shadow.visible = true;
  setMood(pip, 'idle');
  for (const k in board.shards) { board.shards[k].visible = true; board.shards[k].scale.setScalar(1); }
}
W.resetRobot = function () { cancelAll(); resetRobot(); };
W.playRobot = async function (run, opts) {
  opts = opts || {};
  cancelAll();
  resetRobot();
  const my = epoch, speed = opts.speed || 1, u = pip.userData, alive = () => my === epoch;
  await sleep(0.15);
  for (const a of run.actions) {
    if (!alive()) return false;
    if (opts.onLine) opts.onLine(a.line);
    if (a.t === 'move') {
      const from = pip.position.clone(), to = new T.Vector3(board.ox + a.x, 0.42, board.oz + a.y);
      sfx('step');
      await tween(0.24 / speed, k => { if (!alive()) return; pip.position.lerpVectors(from, to, k); u.tilt.rotation.x = Math.sin(k * Math.PI) * 0.22; });
    } else if (a.t === 'turn') {
      const h0 = pip.rotation.y, h1 = h0 - a.by * Math.PI / 2;
      sfx('turn');
      await tween(0.17 / speed, k => { if (alive()) pip.rotation.y = h0 + (h1 - h0) * k; });
    } else if (a.t === 'collect') {
      const sh = board.shards[a.x + ',' + a.y], y0 = pip.position.y;
      sfx('collect');
      if (sh) burst(sh.position, 0x8ff8ff, 16, 2.6, 1.5);
      await tween(0.2 / speed, k => { if (!alive()) return; pip.position.y = y0 + Math.sin(k * Math.PI) * 0.22; if (sh) sh.scale.setScalar(1 - k); }, easeOut);
      if (sh) sh.visible = false;
    } else if (a.t === 'crash') {
      setMood(pip, a.kind === 'power' ? 'off' : 'sad');
      sfx('crash');
      const from = pip.position.clone();
      if (a.kind === 'wall') {
        const to = new T.Vector3(board.ox + a.tx, 0.42, board.oz + a.ty), hit = from.clone().lerp(to, 0.5);
        await tween(0.1, k => { if (alive()) pip.position.lerpVectors(from, to, k * 0.32); }, easeIn);
        burst(hit, 0xff6b7d, 22, 3, 1);
        await tween(0.16, k => { if (alive()) pip.position.lerpVectors(from, to, 0.32 * (1 - k)); }, easeOut);
        await tween(0.4, k => { if (alive()) u.tilt.rotation.z = Math.sin(k * 20) * 0.22 * (1 - k); }, x => x);
      } else if (a.kind === 'edge') {
        const to = new T.Vector3(board.ox + a.tx, 0.42, board.oz + a.ty);
        u.shadow.visible = false;
        await tween(0.2, k => { if (alive()) pip.position.lerpVectors(from, to, k); });
        await tween(0.65, k => { if (!alive()) return; pip.position.y = 0.42 - 7 * k; u.tilt.rotation.x = k * 2.2; pip.scale.setScalar(1 - 0.5 * k); }, easeIn);
      } else {
        await tween(0.5, k => { if (alive()) u.tilt.rotation.y = Math.sin(k * 16) * 0.5 * (1 - k); }, x => x);
        if (a.kind === 'power') await tween(0.4, k => { if (alive()) pip.position.y = 0.42 - 0.2 * k; });
      }
    }
  }
  if (!alive()) return false;
  if (opts.onLine) opts.onLine(null);
  if (run.ok) {
    setMood(pip, 'happy');
    sfx('pass');
    burst(pip.position, 0xffc247, 46, 4, 3);
    const y0 = pip.position.y, h0 = pip.rotation.y;
    await tween(0.55, k => { if (!alive()) return; pip.position.y = y0 + Math.sin(k * Math.PI) * 0.5; pip.rotation.y = h0 + k * TAU; });
  } else if (!run.crashed && !run.error) {
    setMood(pip, 'sad');
    sfx('fail');
    await tween(0.55, k => { if (alive()) u.tilt.rotation.y = Math.sin(k * 14) * 0.45 * (1 - k); }, x => x);
  }
  return alive();
};

// ---------------------------------------------------------------- arena: test crystals
const CSTATE = { idle: 0x2a3676, run: 0xffffff, pass: null, fail: 0xff5d73, slow: 0xffb347 };
// Every floor has its own arena: the shape of the deck, the cut of the test crystals, and what drifts in the dark behind it.
const THEMES = [null, null, { sides: 6, gem: 'octa', prop: 'leaf' }, { sides: 8, gem: 'tetra', prop: 'ring' }, { sides: 4, gem: 'cube', prop: 'stack' }, { sides: 6, gem: 'slab', prop: 'slab' },
  { sides: 8, gem: 'icosa', prop: 'gear' }, { sides: 6, gem: 'dodeca', prop: 'pillar' }, { sides: 10, gem: 'spike', prop: 'arc' }, { sides: 12, gem: 'star', prop: 'shard' }];
function gemGeo(kind, big) {
  switch (kind) {
    case 'tetra': return new T.TetrahedronGeometry(0.5 * big);
    case 'cube': return new T.BoxGeometry(0.5 * big, 0.5 * big, 0.5 * big);
    case 'slab': return new T.BoxGeometry(0.48 * big, 0.66 * big, 0.12 * big);
    case 'icosa': return new T.IcosahedronGeometry(0.42 * big, 0);
    case 'dodeca': return new T.DodecahedronGeometry(0.42 * big, 0);
    case 'spike': { const g = new T.OctahedronGeometry(0.33 * big); g.scale(1, 1.6, 1); return g; }
    case 'star': { const g = new T.IcosahedronGeometry(0.34 * big, 0); g.scale(0.85, 1.35, 0.85); return g; }
    default: return new T.OctahedronGeometry(0.4 * big);
  }
}
function addProps(kind, col) {
  const mat = std(0x0e1538, { emissive: col, emissiveIntensity: 0.1, roughness: 0.4, metalness: 0.6, flatShading: true }), props = [];
  const put = (geo, k, n, r, y, spin) => {
    const a = -Math.PI / 2 + (k - (n - 1) / 2) * (2.5 / n), m = new T.Mesh(geo, mat);       // an arc behind the deck, clear of the camera
    m.position.set(r * Math.cos(a), y, r * Math.sin(a) - 1);
    m.userData.spin = spin; m.userData.y = y; m.userData.k = k;
    arena.add(m); props.push(m);
    return m;
  };
  if (kind === 'leaf') { const g = new T.TetrahedronGeometry(0.34); for (let k = 0; k < 14; k++) put(g, k, 14, 9 + (k % 3) * 1.3, 1 + (k * 37 % 50) / 10, 0.5 + (k % 4) * 0.2); }
  else if (kind === 'ring') { const g = new T.TorusGeometry(1.15, 0.05, 6, 30); for (let k = 0; k < 6; k++) { const m = put(g, k, 6, 10, 2 + (k % 3) * 1.6, 0.35 + (k % 2) * 0.2); m.rotation.x = 0.5 + k; } }
  else if (kind === 'stack') { const g = new T.BoxGeometry(0.8, 0.8, 0.8); for (let k = 0; k < 15; k++) { const m = put(g, Math.floor(k / 3), 5, 10, 0.3 + (k % 3) * 0.95, 0); m.rotation.y = k * 0.4; } }
  else if (kind === 'slab') { const g = new T.BoxGeometry(0.95, 3.6, 0.16); for (let k = 0; k < 8; k++) { const m = put(g, k, 8, 9.5 + (k % 2), 1.6 + (k % 3) * 0.5, 0); m.rotation.y = -m.position.x * 0.08; } }
  else if (kind === 'gear') { const g = new T.TorusGeometry(1.5, 0.16, 4, 10); for (let k = 0; k < 5; k++) { const m = put(g, k, 5, 10.5, 2.2 + (k % 2) * 2.2, 0); m.userData.roll = (k % 2 ? -1 : 1) * 0.5; } }
  else if (kind === 'pillar') { const g = new T.CylinderGeometry(0.11, 0.11, 9, 6); for (let k = 0; k < 9; k++) put(g, k, 9, 9.5 + (k % 2) * 1.5, 3.6, 0); }
  else if (kind === 'arc') { const g = new T.TorusGeometry(2.7, 0.045, 6, 44, Math.PI); for (let k = 0; k < 5; k++) { const m = put(g, k, 5, 10.5, 0.4 + (k % 2) * 0.8, 0); m.rotation.y = Math.PI / 2 - (-Math.PI / 2 + (k - 2) * 0.5); } }
  else if (kind === 'shard') { const g = new T.OctahedronGeometry(0.26); for (let k = 0; k < 16; k++) put(g, k, 16, 8.5 + (k % 4) * 0.9, 0.8 + (k * 53 % 70) / 10, 0.8 + (k % 3) * 0.3); }
  return props;
}
W.showTests = function (count, perf, color, boss, floor) {
  clearArena();
  const col = lin(color), theme = THEMES[floor] || { sides: 6, gem: 'octa', prop: null }, sides = theme.sides;
  const deck = new T.Mesh(new T.CylinderGeometry(3.3, 2.7, 0.6, sides), std(0x151d48, { roughness: 0.4, metalness: 0.62 }));
  deck.position.y = -0.3;
  // Dark glass with the floor's colour running through it as lines of light.
  const deckTop = new T.Mesh(new T.CylinderGeometry(3.0, 3.0, 0.05, sides), std(0x070b1e, { emissive: col, emissiveMap: gridTex, emissiveIntensity: 1.15, roughness: 0.18, metalness: 0.55, envMapIntensity: 1.2 }));
  deckTop.position.y = 0.02;
  const rimM = new T.Mesh(new T.TorusGeometry(3.3, 0.06, 6, sides), basic(col));
  rimM.rotation.set(Math.PI / 2, 0, (Math.PI / 2) % (TAU / sides));
  const under = glow(color, 13, 0.2);
  under.position.y = -2;
  arena.add(deck, deckTop, rimM, under);
  const span = Math.min(2.2, 0.36 * Math.max(1, count - 1)), R = 4.7;
  const padMat = std(0x1c2658, { roughness: 0.4, metalness: 0.6 }), postMat = std(0x2a3877, { roughness: 0.35, metalness: 0.65 });
  for (let i = 0; i < count; i++) {
    const th = count === 1 ? 0 : -span / 2 + span * i / (count - 1), big = perf[i] ? 1.3 : 1;
    const x = R * Math.sin(th), z = -R * Math.cos(th) + 1.6, h = 1.5 + (perf[i] ? 0.35 : 0);
    const pad = new T.Mesh(new T.CylinderGeometry(0.42, 0.52, 0.22, 6), padMat);
    pad.position.set(x, -0.2, z);
    const post = new T.Mesh(new T.CylinderGeometry(0.035, 0.035, h, 6), postMat);
    post.position.set(x, h / 2 - 0.1, z);
    // A faceted gem: it reflects the lamps around it and glows from inside in the colour of its state.
    const mat = std(0x0b1030, { emissive: CSTATE.idle, emissiveIntensity: 0.7, roughness: 0.1, metalness: 0.35, flatShading: true, envMapIntensity: 1.05 }), gem = new T.Mesh(gemGeo(theme.gem, big), mat);
    gem.position.set(x, h + 0.35, z);
    const g = glow(0xffffff, 2.2 * big, 0);
    g.position.copy(gem.position);
    arena.add(pad, post, gem, g);
    if (perf[i]) { const ring = new T.Mesh(new T.TorusGeometry(0.62, 0.022, 6, 30), basic(0xffb347, { transparent: true, opacity: 0.7 })); ring.position.copy(gem.position); arena.add(ring); gem.userData.ring = ring; }
    crystals.push({ gem, mat, glow: g, y: h + 0.35, state: 'idle', spin: 0.6 + Math.random() * 0.4 });
  }
  if (boss) {
    lock = new T.Group();
    const shellM = new T.Mesh(new T.IcosahedronGeometry(1.15, 0), std(0x1a2150, { roughness: 0.3, metalness: 0.7, flatShading: true, envMapIntensity: 1.3 }));
    const wire = new T.LineSegments(new T.EdgesGeometry(shellM.geometry), new T.LineBasicMaterial({ color: lin(0xff7a6b), toneMapped: false }));
    lock.add(shellM, wire, glow(0xff7a6b, 5, 0.35));
    lock.position.set(0, 5.2, -3.4);
    arena.add(lock);
  }
  beam = new T.Mesh(new T.CylinderGeometry(0.03, 0.03, 1, 6, 1, true), basic(0xffffff, { transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false }));
  arena.add(beam);
  pip = makePip();
  pip.scale.setScalar(2.1);
  pip.position.set(0, 0.95, 0.4);
  arena.add(pip);
  board = { col, props: theme.prop ? addProps(theme.prop, col) : [] };
  atarget.set(0, 1.5, -1.2);
  acamT.az = Math.PI / 2; acamT.el = 0.36; acamT.dist = fitDist(boss ? 7.6 : 6.6, 0.36);
  openShot();
  arenaSpan = 9;
  tintT.copy(col);
  lit(arena);
};
function setCrystal(i, state) {
  const c = crystals[i];
  if (!c) return;
  c.state = state;
  c.mat.emissive.copy(state === 'pass' ? board.col : lin(CSTATE[state]));
  c.mat.emissiveIntensity = state === 'idle' ? 0.7 : state === 'run' ? 2.2 : 0.95;
  c.glow.material.color.copy(c.mat.emissive);
  c.glow.material.opacity = state === 'idle' ? 0 : state === 'run' ? 0.85 : 0.4;
}
W.resetTests = function () { cancelAll(); acamT.az = Math.PI / 2; crystals.forEach((c, i) => setCrystal(i, 'idle')); if (pip) setMood(pip, 'idle'); if (lock) lock.visible = true; };
function fireBeam(to) {
  const from = new T.Vector3(pip.position.x, pip.position.y + 0.52 * pip.scale.y, pip.position.z), d = to.clone().sub(from), len = d.length();       // from the tip of the antenna
  beam.scale.set(1, len, 1);
  beam.position.copy(from).add(to).multiplyScalar(0.5);
  beam.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize());
  beam.material.opacity = 0.85;
  tween(0.22, k => { beam.material.opacity = 0.85 * (1 - k); }, x => x);
}
W.playTests = async function (states, opts) {
  opts = opts || {};
  cancelAll();
  acamT.az = Math.PI / 2;
  crystals.forEach((c, i) => setCrystal(i, 'idle'));
  if (lock) lock.visible = true;
  setMood(pip, 'idle');
  if (opts.instant) {                               // the player skipped ahead: show the verdict without the show
    const won = states.length > 0 && states.every(s => s === 'pass');
    states.forEach((s, i) => setCrystal(i, s));
    setMood(pip, won ? 'happy' : 'sad');
    if (lock && won) lock.visible = false;
    return true;
  }
  const my = epoch, alive = () => my === epoch;
  await sleep(0.1);
  for (let i = 0; i < states.length; i++) {
    if (!alive()) return false;
    if (!crystals[i]) continue;
    setCrystal(i, 'run');
    fireBeam(crystals[i].gem.position);
    await sleep(0.1);
    if (!alive()) return false;
    setCrystal(i, states[i]);
    sfx(states[i] === 'pass' ? 'tick' : 'buzz');
    if (states[i] === 'pass') burst(crystals[i].gem.position, board.col, 10, 2, 1);
    if (opts.onStep) opts.onStep(i, states[i]);
    await sleep(0.07);
  }
  if (!alive()) return false;
  if (states.length && states.every(s => s === 'pass')) {
    setMood(pip, 'happy');
    sfx('pass');
    burst(new T.Vector3(0, 2.2, 0), 0xffc247, 60, 5, 3);
    burst(new T.Vector3(0, 2.6, 0), board.col, 70, 7, 2);
    // the camera swings a little way round PIP and back
    tween(1.2, k => { if (alive()) acamT.az = Math.PI / 2 + Math.sin(k * Math.PI) * 0.3; }).then(() => { if (alive()) acamT.az = Math.PI / 2; });
    if (lock) { burst(lock.position, 0xff7a6b, 90, 7, 2); lock.visible = false; sfx('boss'); }
    const h0 = pip.rotation.y, y0 = pip.position.y;
    await tween(0.6, k => { if (!alive()) return; pip.rotation.y = h0 + k * TAU; pip.position.y = y0 + Math.sin(k * Math.PI) * 0.6; });
  } else {
    setMood(pip, 'sad');
    sfx('fail');
    const u = pip.userData;
    await tween(0.5, k => { if (alive()) u.tilt.rotation.y = Math.sin(k * 14) * 0.4 * (1 - k); }, x => x);
  }
  return alive();
};
// ---------------------------------------------------------------- arena: the player's data
// While a run is replayed, the values the code is working on stand in the arena as crates: a list is a row of them,
// a dictionary a row of pairs, a grid a wall, a linked list a chain of spheres. Names that point into a row hover above
// the crate they point at, and the crate that just changed is the one PIP fires at.
const MONO = "'JetBrains Mono', Consolas, 'Courier New', monospace";
const INK = '#eef1ff', MUTE = '#8d97c9', AMBER = '#ffc247';
const labelCache = new Map();
let data = null, dataCam = null, dataGeo = null, dataBody = null, lockHidden = false;
function labelMat(text, color, weight, wide) {
  wide = wide || 1;                                  // a long label gets a wider strip instead of smaller letters
  const key = color + '|' + weight + '|' + wide + '|' + text;
  let m = labelCache.get(key);
  if (m) return m;
  if (labelCache.size > 600) { for (const old of labelCache.values()) { old.map.dispose(); old.dispose(); } labelCache.clear(); }
  const c = document.createElement('canvas');
  c.width = Math.round(256 * wide); c.height = 128;
  const g = c.getContext('2d'), room = c.width - 20;
  let size = 78;
  g.font = weight + ' ' + size + 'px ' + MONO;
  const w = g.measureText(text).width;
  if (w > room) { size = Math.max(20, Math.floor(size * room / w)); g.font = weight + ' ' + size + 'px ' + MONO; }
  g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, c.width / 2, 68);
  m = new T.MeshBasicMaterial({ map: canvasTex(c), transparent: true, depthWrite: false, toneMapped: false });
  m.userData.shared = true;
  labelCache.set(key, m);
  return m;
}
function dataGeos() {
  if (dataGeo) return dataGeo;
  const share = g => { g.userData.shared = true; return g; }, box = share(new T.BoxGeometry(0.62, 0.62, 0.24));
  dataGeo = { box, edge: share(new T.EdgesGeometry(box)), face: share(new T.PlaneGeometry(0.6, 0.3)), small: share(new T.PlaneGeometry(0.42, 0.21)), tag: share(new T.PlaneGeometry(0.72, 0.36)),
    name: share(new T.PlaneGeometry(1.5, 0.75)), cone: share(new T.ConeGeometry(0.075, 0.15, 4)), ball: share(new T.SphereGeometry(0.33, 24, 16)), link: share(new T.CylinderGeometry(0.028, 0.028, 1, 6)),
    tip: share(new T.ConeGeometry(0.085, 0.2, 6)) };
  dataBody = std(0x0d1436, { roughness: 0.28, metalness: 0.55, envMapIntensity: 1.1 });
  dataBody.userData.shared = true;
  return dataGeo;
}
// The camera makes room for the data while it is shown, and goes back when it is taken away.
const dataBase = () => (sc ? Math.max(3.15, sc.tall + 0.45) : 3.15);          // over a scene, the data floats above whatever stands tallest
function frameData(on) {
  if (on) {
    if (!dataCam) dataCam = { y: aty !== null ? aty : atarget.y, dist: acamT.dist, el: acamT.el };
    aty = dataBase() - 0.25; acamT.dist = fitDist(6.3, 0.3); acamT.el = 0.3;
    if (lock && lock.visible) { lock.visible = false; lockHidden = true; }          // the boss lock would stand behind the data
  } else {
    if (dataCam) { aty = dataCam.y; acamT.dist = dataCam.dist; acamT.el = dataCam.el; dataCam = null; }
    if (lockHidden && lock) lock.visible = true;
    lockHidden = false;
  }
}
W.clearData = function () {
  if (data) { if (arena) arena.remove(data.group); dispose(data.group); data = null; }
  frameData(false);
};
// rows: [{ name, kind: 'seq' | 'map' | 'set' | 'grid' | 'chain', cells: [{ t, k, i, at: [names], chg, ghost }], w, more, tail }]
W.showData = function (rows) {
  if (mode !== 'arena' || !arena || !board || !beam) return;
  if (data) { arena.remove(data.group); dispose(data.group); data = null; }
  if (!rows || !rows.length) { frameData(false); return; }
  const G = dataGeos(), group = new T.Group(), col = board.col, hot = [];
  const edgeMat = new T.LineBasicMaterial({ color: col.clone().multiplyScalar(0.8), toneMapped: false }), edgeAt = new T.LineBasicMaterial({ color: lin(0xffc247), toneMapped: false });
  const edgeHot = new T.LineBasicMaterial({ color: lin(0xffffff), toneMapped: false }), edgeDim = new T.LineBasicMaterial({ color: lin(0x3a4686), toneMapped: false });
  const hotBody = std(0x0d1436, { emissive: col, emissiveIntensity: 0.9, roughness: 0.28, metalness: 0.55 }), ballMat = std(0x10183f, { emissive: col, emissiveIntensity: 0.22, roughness: 0.2, metalness: 0.5, envMapIntensity: 1.2 });
  const linkMat = basic(col), tagHex = '#' + new T.Color(col).convertLinearToSRGB().getHexString();
  const plane = (geo, text, color, weight, x, y, z, s, wide) => {
    const m = new T.Mesh(geo, labelMat(text, color, weight, wide || 1));
    m.position.set(x, y, z);
    if (s) m.scale.setScalar(s);
    if (wide && wide !== 1) m.scale.x *= wide;
    group.add(m);
    return m;
  };
  const tags = (names, x, y) => {
    if (!names || !names.length) return;
    const text = names.join(', ');
    plane(G.tag, text, AMBER, '700', x, y + 0.66, 0.02, 1, Math.min(3.5, Math.max(1, text.length / 5)));
    const cone = new T.Mesh(G.cone, edgeAt);
    cone.position.set(x, y + 0.42, 0); cone.rotation.x = Math.PI;
    group.add(cone);
  };
  const crate = (cell, x, y, s, wide) => {
    const pointed = cell.at && cell.at.length;
    if (!cell.ghost) { const body = new T.Mesh(G.box, cell.chg ? hotBody : dataBody); body.position.set(x, y, 0); body.scale.set(s * wide, s, s); group.add(body); if (cell.chg) hot.push(body); }
    const edge = new T.LineSegments(G.edge, cell.ghost ? edgeDim : cell.chg ? edgeHot : pointed ? edgeAt : edgeMat);
    edge.position.set(x, y, 0); edge.scale.set(s * wide, s, s);
    group.add(edge);
  };
  const blocks = rows.slice(0, 3).map(r => {
    const grid = r.kind === 'grid', chain = r.kind === 'chain', n = r.cells.length + (r.more ? 1 : 0) + (chain ? 1 : 0), cols = grid ? r.w : Math.max(1, n), lines = grid ? Math.ceil(r.cells.length / r.w) : 1;
    // a row of long values gets wider crates, so the letters stay readable
    const longest = r.cells.reduce((a, c) => Math.max(a, String(c.t || '').length, String(c.k || '').length), 1), wide = grid || chain ? 1 : Math.min(2.7, Math.max(1, longest / 4.4));
    const pitch = chain ? 0.98 : grid ? 0.66 : 0.62 * wide + 0.12;
    return { r, grid, cols, lines, pitch, wide, w: cols * pitch + 1.75, h: grid ? lines * 0.66 + 0.3 : 1.5 };
  });
  const totalH = blocks.reduce((a, b) => a + b.h, 0), maxW = Math.max.apply(null, blocks.map(b => b.w)), scale = Math.min(1.9, 7.4 / maxW, 4.4 / totalH);
  let top = totalH / 2;
  for (const b of blocks) {
    const r = b.r, left = -b.w / 2 + 1.75, s = b.grid ? 0.86 : 1, name = r.name || '', nameWide = Math.min(1.7, Math.max(1, name.length / 6));
    plane(G.name, name, INK, '600', left - 0.2 - 0.75 * nameWide, b.grid ? top - b.h / 2 : top - 0.76, 0, 1, nameWide);
    r.cells.forEach((cell, k) => {
      const cx = left + (b.grid ? k % r.w : k) * b.pitch + b.pitch / 2, cy = b.grid ? top - 0.15 - 0.33 - Math.floor(k / r.w) * 0.66 : top - 0.76;
      if (r.kind === 'chain') {
        const ball = new T.Mesh(G.ball, cell.chg ? hotBody : ballMat);
        ball.position.set(cx, cy, 0);
        group.add(ball);
        if (cell.chg) hot.push(ball);
        plane(G.face, cell.t, INK, '600', cx, cy, 0.34, 0.92);
        tags(cell.at, cx, cy);
        const link = new T.Mesh(G.link, linkMat);                      // the arrow to whatever comes next
        link.rotation.z = Math.PI / 2; link.scale.y = b.pitch - 0.78; link.position.set(cx + b.pitch / 2 - 0.03, cy, 0);
        const tip = new T.Mesh(G.tip, linkMat);
        tip.rotation.z = -Math.PI / 2; tip.position.set(cx + b.pitch - 0.42, cy, 0);
        group.add(link, tip);
        return;
      }
      crate(cell, cx, cy, s, b.wide);
      if (r.kind === 'map') { plane(G.face, cell.k, tagHex, '600', cx, cy + 0.15, 0.125, 0.86, b.wide); plane(G.face, cell.t, INK, '600', cx, cy - 0.14, 0.125, 0.86, b.wide); }
      else if (cell.t !== '') plane(G.face, cell.t, cell.ghost ? MUTE : INK, '600', cx, cy, 0.125 * s, s * (b.wide === 1 && cell.t.length <= 3 ? 1.3 : 1), b.wide);
      if (!b.grid) { if (cell.i !== undefined) plane(G.small, cell.i, MUTE, '500', cx, cy - 0.47, 0); tags(cell.at, cx, cy); }
    });
    const endX = left + r.cells.length * b.pitch + b.pitch / 2;
    if (r.kind === 'chain') plane(G.face, r.tail || 'None', MUTE, '600', endX - 0.1, top - 0.76, 0, 1.05);
    else if (r.more) plane(G.face, '+' + r.more, MUTE, '600', endX - b.pitch / 2 + 0.4, top - 0.76, 0, 0.9);
    top -= b.h;
  }
  group.scale.setScalar(scale);
  group.position.set(0, dataBase() + totalH * scale / 2, sc ? 0 : -1.2);
  arena.add(group);
  lit(group);
  data = { group };
  frameData(true);
  // the crate that just changed swells for a moment, and PIP marks it
  if (hot.length) {
    const p = hot[0].position.clone().multiplyScalar(scale).add(group.position);
    fireBeam(p);
    burst(p, col, 7, 1.5, 0.4);
    const base = hot.map(h => h.scale.clone());
    tween(0.3, k => { hot.forEach((h, n) => h.scale.copy(base[n]).multiplyScalar(1 + 0.32 * (1 - k))); }, easeOut);
  }
};

// ---------------------------------------------------------------- arena: scenes for code levels
// A code level is staged like a drone deck: a floor with things standing on it, taken from one of the level's tests, and
// PIP acting out on them whatever the player's code returned. js/scenes.js decides what stands where and what happens
// (a stage and a list of beats); this part only knows how to build the pieces and how to play a beat.
const SHADE = { ok: 0x5fe3a1, bad: 0xff5d73, pick: 0xffc247, dim: 0x141b40, off: 0x2a3676 };
const OKC = '#5fe3a1', BADC = '#ff5d73', PIP_SIZE = 1.4;
const TINTS = [0x4fe3d0, 0xffc247, 0xb18cff, 0x6cb8ff, 0xa3e635, 0xff9a62];        // c0 to c5: colours for telling groups apart
const inset = { top: 50, bottom: 20 };                // pixels of the view that the page's own labels cover
let sc = null, unitBox = null, unitEdge = null, labelGeo = null, ballGeo = null, tileTex = null;
const clamp01 = v => Math.max(0, Math.min(1, v));
function sceneGeos() {
  if (unitBox) return;
  const share = g => { g.userData.shared = true; return g; };
  unitBox = share(new T.BoxGeometry(1, 1, 1)); unitEdge = share(new T.EdgesGeometry(unitBox)); labelGeo = share(new T.PlaneGeometry(1, 0.5)); ballGeo = share(new T.SphereGeometry(0.34, 24, 16));
  // the deck of a scene: square plates with a seam between them and a mark at every corner
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, 128, 128);
  g.strokeStyle = '#fff'; g.globalAlpha = 0.42; g.lineWidth = 2; g.strokeRect(0, 0, 128, 128);
  g.globalAlpha = 1; g.fillStyle = '#fff';
  for (const [x, y] of [[0, 0], [128, 0], [0, 128], [128, 128]]) { g.fillRect(x - 10, y - 1.5, 20, 3); g.fillRect(x - 1.5, y - 10, 3, 20); }
  tileTex = canvasTex(c);
}
// Text standing in the world, as large as its place allows: at most maxW wide, with letters at most maxH high.
function labelSize(text, maxW, maxH) {
  const len = Math.max(1, text.length), em = Math.min(maxH, maxW / (0.6 * len));
  return { wide: Math.max(1, Math.ceil((len * 46.8 + 24) / 64) / 4), size: em * 3.28 };
}
function sceneLabel(text, color, maxW, maxH) {
  text = String(text);
  const f = labelSize(text, maxW, maxH), m = new T.Mesh(labelGeo, labelMat(text, color, '600', f.wide));
  m.scale.set(f.size * f.wide, f.size, 1);
  m.renderOrder = 2;
  m.userData = { text, color, maxW, maxH };
  return m;
}
function relabel(m, color, text) {
  const u = m.userData;
  if (text !== undefined) u.text = String(text);
  u.color = color;
  const f = labelSize(u.text, u.maxW, u.maxH);
  m.material = labelMat(u.text, color, '600', f.wide);
  m.scale.set(f.size * f.wide, f.size, 1);
}
// Something that stands above the deck gets a step under it.
function riser(g, wid, dep, h) {
  const m = new T.Mesh(unitBox, sc.stepMat);
  m.scale.set(wid, h, dep); m.position.y = -h / 2;
  g.add(m);
}
// One piece of a scene: what it looks like, where PIP stands to work on it, and how it shows a state.
function scenePiece(p) {
  const g = new T.Group(), col = sc.col, y0 = p.y || 0, px = p.x || 0, pz = p.z || 0;
  g.position.set(px, y0, pz);
  // anchor: where a shot at the piece lands. top and half: how high and how wide it is. front and side: where PIP stands to work on it.
  const piece = { p, g, anchor: new T.Vector3(px, y0 + 0.5, pz), top: y0 + 1, half: 0.5, front: 1.05, side: 0, mark() {}, text() {} };
  const lamp = (color, k) => std(0x0d1436, { emissive: color, emissiveIntensity: k, roughness: 0.3, metalness: 0.5, envMapIntensity: 1.1 });
  // on: the floor's own colour, lit. pick: the same colour turned up until it is nearly white, so it stands out on any floor.
  const shade = s => (s === 'on' ? col : s === 'pick' ? col.clone().lerp(lin(0xffffff), 0.55) : /^c\d$/.test(s) ? lin(TINTS[s[1] % TINTS.length]) : lin(SHADE[s] !== undefined ? SHADE[s] : SHADE.off));
  const line = k => new T.LineBasicMaterial({ color: col.clone().multiplyScalar(k), toneMapped: false });
  switch (p.k) {
    case 'crate': {
      const wd = p.wd || 1, card = p.tone === 'card', wid = 0.8 * wd, hgt = card ? 0.56 : 0.8, dep = card ? 0.14 : 0.6, rest = p.tone === 'out' ? 0.34 : card ? 0.03 : 0.1;
      const mat = lamp(col, rest), body = new T.Mesh(unitBox, mat), edgeMat = line(card ? 0.5 : p.tone === 'out' ? 1 : 0.6), edge = new T.LineSegments(unitEdge, edgeMat), base = edgeMat.color.clone(), ink = card ? AMBER : INK;
      body.scale.set(wid, hgt, dep); edge.scale.copy(body.scale);
      body.position.y = edge.position.y = hgt / 2;
      const lab = sceneLabel(p.t, ink, wid - 0.1, card ? 0.34 : 0.5);
      lab.position.set(0, hgt / 2, dep / 2 + 0.012);
      g.add(body, edge, lab);
      if (y0 > 0 && !p.air) riser(g, wid + 0.06, dep + 0.06, y0);
      piece.anchor.y = y0 + hgt / 2; piece.top = y0 + hgt; piece.half = wid / 2;
      piece.mark = s => { const c = shade(s), rested = s === 'off'; edgeMat.color.copy(rested ? base : c); mat.emissive.copy(rested ? col : c); mat.emissiveIntensity = s === 'dim' ? 0 : rested ? rest : 0.3; relabel(lab, s === 'dim' ? MUTE : ink); };
      break;
    }
    case 'cell': {
      const s = p.slim ? 0.8 : 1, mat = lamp(col, 0.9), ped = new T.Mesh(new T.CylinderGeometry(0.24 * s, 0.31 * s, 0.5, 14), sc.metal), core = new T.Mesh(new T.CylinderGeometry(0.19 * s, 0.19 * s, 0.56, 14), mat), cap = new T.Mesh(new T.CylinderGeometry(0.22 * s, 0.22 * s, 0.07, 14), sc.metal), gl = glow(0xffffff, 1.2, 0.3);
      ped.position.y = 0.25; core.position.y = 0.78; cap.position.y = 1.09; gl.position.y = 0.78; gl.material.color.copy(col);
      const lab = sceneLabel(p.t, INK, p.slim ? 0.74 : 1.02, 0.44);
      lab.position.set(0, 1.48, 0);
      g.add(ped, core, cap, gl, lab);
      if (p.sub !== undefined && p.sub !== '') { const sub = sceneLabel(p.sub, MUTE, 0.44, 0.2); sub.position.set(0, 0.2, 0.31 * s + 0.02); g.add(sub); }
      piece.anchor.y = y0 + 0.78; piece.top = y0 + 1.8; piece.half = 0.42 * s;
      piece.mark = st => {
        const c = st === 'off' ? col : shade(st), up = st === 'pick' ? 0.2 : 0;
        mat.emissive.copy(c); mat.emissiveIntensity = st === 'dim' ? 0.04 : st === 'off' ? 0.9 : st === 'pick' ? 1.9 : 1.3;
        gl.material.color.copy(c); gl.material.opacity = st === 'dim' ? 0.03 : st === 'off' ? 0.3 : st === 'pick' ? 0.75 : 0.5;
        core.position.y = gl.position.y = 0.78 + up; cap.position.y = 1.09 + up; lab.position.y = 1.48 + up;
        relabel(lab, st === 'dim' ? MUTE : INK);
      };
      break;
    }
    case 'bar': {
      const hh = Math.max(0.12, Math.abs(p.h)), wid = p.slim ? 0.5 : 0.62, water = p.tone === 'water', neg = p.h < 0, rest = neg ? 0.06 : 0.42;
      const mat = water ? std(0x1a4c8f, { emissive: 0x3fa3ff, emissiveIntensity: 0.7, transparent: true, opacity: 0.62, roughness: 0.15, metalness: 0.1, depthWrite: false }) : lamp(col, rest), body = new T.Mesh(unitBox, mat);
      if (neg) { mat.transparent = true; mat.opacity = 0.55; }                      // a number below zero: a hollow bar
      body.scale.set(water ? wid * 1.5 : wid, hh, water ? wid * 0.92 : wid); body.position.y = hh / 2;
      g.add(body);
      let edgeMat = null, lab = null;
      if (!water) { edgeMat = line(0.9); const edge = new T.LineSegments(unitEdge, edgeMat); edge.scale.copy(body.scale); edge.position.y = hh / 2; g.add(edge); }
      if (p.t) { lab = sceneLabel(p.t, INK, p.slim ? 0.74 : 0.92, 0.4); lab.position.set(0, hh + 0.36, 0); g.add(lab); }
      piece.anchor.y = y0 + hh; piece.top = y0 + hh + (p.t ? 0.75 : 0.05); piece.half = wid / 2;
      piece.mark = st => {
        if (water) return;
        const c = st === 'off' ? col : shade(st);
        mat.emissive.copy(c); mat.emissiveIntensity = st === 'off' ? rest : st === 'pick' ? 0.5 : 0.7;
        edgeMat.color.copy(st === 'off' ? col.clone().multiplyScalar(0.9) : c);
      };
      break;
    }
    case 'tile': {
      const base = { land: [col, 0.5], sea: [lin(0x0a1030), 0], plain: [lin(0x26347a), 0.3], start: [lin(SHADE.pick), 0.6], goal: [lin(SHADE.ok), 0.6], good: [lin(SHADE.ok), 0.7], wrong: [lin(SHADE.bad), 0.75] }[p.tone || 'plain'];
      const mat = lamp(base[0], base[1]), body = new T.Mesh(unitBox, mat), up = new T.Group();
      body.scale.set(0.9, 0.12, 0.9); body.position.y = 0.06;
      up.add(body);
      if (p.t) { const lab = sceneLabel(p.t, INK, 0.76, 0.46); lab.rotation.x = -Math.PI / 2; lab.position.set(0, 0.127, 0.02); up.add(lab); }
      g.add(up);
      piece.anchor.y = y0 + 0.14; piece.top = y0 + 0.3; piece.half = 0.45; piece.front = 0;
      // a tile that is counted or walked over lights up whiter and rises a little
      piece.mark = st => { const lifted = st === 'on' || /^c\d$/.test(st); mat.emissive.copy(st === 'off' ? base[0] : shade(st)); mat.emissiveIntensity = st === 'off' ? base[1] : 0.85; up.position.y = lifted ? 0.09 : 0; };
      break;
    }
    case 'node': {
      const s = p.big ? 1.3 : 1, mat = lamp(col, 0.3), ball = new T.Mesh(ballGeo, mat), lab = sceneLabel(p.t, INK, 0.6 * s, 0.4 * s);
      ball.position.y = 0.55; ball.scale.setScalar(s); lab.position.set(0, 0.55, 0.36 * s);
      g.add(ball, lab);
      if (!p.air) { const stem = new T.Mesh(new T.CylinderGeometry(0.05, 0.17, 0.24, 10), sc.metal); stem.position.y = 0.12; g.add(stem); if (y0 > 0) riser(g, 0.62, 0.62, y0); }
      piece.anchor.y = y0 + 0.55; piece.top = y0 + 0.55 + 0.4 * s; piece.half = 0.36 * s;
      piece.mark = st => { mat.emissive.copy(st === 'off' ? col : shade(st)); mat.emissiveIntensity = st === 'off' ? 0.3 : st === 'dim' ? 0.02 : 0.62; };
      break;
    }
    case 'sign': {
      const mh = 0.33 * (p.sz || 1), mw = p.wd || 1.4, own = { mute: MUTE, amber: AMBER, ok: OKC, bad: BADC }[p.tone] || INK, lab = sceneLabel(p.t, own, mw, mh);
      const plate = new T.Mesh(labelGeo, basic(0x070b1e, { transparent: true, opacity: 0.74, depthWrite: false })), rule = new T.Mesh(unitBox, basic(col));
      plate.scale.set(mw + 0.3, (mh + 0.24) * 2, 1); plate.position.z = -0.02; plate.renderOrder = 1;
      rule.scale.set(mw + 0.3, 0.022, 0.01); rule.position.set(0, -(mh + 0.24) / 2, -0.01);
      g.rotation.x = -0.2;
      g.add(plate, rule, lab);
      piece.anchor.y = y0; piece.top = y0 + mh; piece.half = mw / 2 + 0.15; piece.front = 1.2;
      piece.text = (t, tone) => relabel(lab, tone === 'ok' ? OKC : tone === 'bad' ? BADC : own, t);
      piece.mark = st => relabel(lab, st === 'ok' ? OKC : st === 'bad' ? BADC : st === 'pick' ? AMBER : own);
      break;
    }
    case 'lamp': case 'flag': {
      const flag = p.k === 'flag', h = flag ? 1.3 : Math.max(0.4, y0), rest = flag ? SHADE.pick : SHADE.off, mat = basic(rest), post = new T.Mesh(new T.CylinderGeometry(0.03, 0.045, h, 6), sc.metal), ball = new T.Mesh(new T.SphereGeometry(flag ? 0.13 : 0.17, 14, 10), mat), gl = glow(SHADE.pick, 1.3, flag ? 0.5 : 0);
      g.position.y = 0;
      post.position.y = h / 2; ball.position.y = h; gl.position.y = h;
      g.add(post, ball, gl);
      if (flag) {
        const ring = new T.Mesh(new T.TorusGeometry(0.34, 0.03, 6, 24), mat);
        ring.rotation.x = Math.PI / 2; ring.position.y = 0.03;
        g.add(ring);
        if (p.t) { const lab = sceneLabel(p.t, AMBER, 1.3, 0.24); lab.position.y = h + 0.36; g.add(lab); }
      }
      piece.anchor.set(px, h, pz); piece.top = h + (flag ? 0.6 : 0.25); piece.half = 0.3; piece.front = flag ? 0 : 1;
      piece.mark = st => { const c = st === 'off' ? lin(rest) : shade(st); mat.color.copy(c); gl.material.color.copy(c); gl.material.opacity = st === 'off' ? (flag ? 0.5 : 0) : 0.75; };
      break;
    }
    case 'slot': {
      const wid = 0.8 * (p.wd || 1) + 0.04, mat = line(0.8), sq = new T.LineSegments(unitEdge, mat);
      sq.scale.set(wid, 0.05, 0.64); sq.position.y = 0.03;
      g.add(sq);
      if (y0 > 0) riser(g, wid + 0.02, 0.66, y0);
      piece.anchor.y = y0 + 0.05; piece.top = y0 + 0.1; piece.half = wid / 2; piece.front = 0;
      piece.mark = st => mat.color.copy(st === 'off' ? col.clone().multiplyScalar(0.8) : shade(st));
      break;
    }
    case 'pad': {
      const slab = new T.Mesh(unitBox, sc.stepMat), lines = tileTex.clone(), rim = new T.LineSegments(unitEdge, line(1));
      lines.needsUpdate = true; lines.wrapS = lines.wrapT = T.RepeatWrapping; lines.repeat.set(Math.max(1, Math.round(p.wd)), Math.max(1, Math.round(p.dp)));
      const top = new T.Mesh(new T.PlaneGeometry(p.wd - 0.14, p.dp - 0.14), std(0x070b1e, { emissive: col, emissiveMap: lines, emissiveIntensity: 0.5, roughness: 0.2, metalness: 0.55, envMapIntensity: 1.2 }));
      slab.scale.set(p.wd, 0.5, p.dp); slab.position.y = -0.26; top.rotation.x = -Math.PI / 2; rim.scale.set(p.wd, 0.5, p.dp); rim.position.y = -0.26;
      g.add(slab, top, rim);
      piece.anchor.y = 0; piece.top = 0.1; piece.half = p.wd / 2;
      break;
    }
    case 'link': {
      g.position.set(0, 0, 0);
      const a = new T.Vector3(p.a[0], p.a[1], p.a[2]), b = new T.Vector3(p.b[0], p.b[1], p.b[2]), dir = b.clone().sub(a), cut = Math.min(0.38, dir.length() / 3), mat = basic(col, { transparent: true, opacity: 0.85 });
      dir.normalize();
      const from = a.clone().addScaledVector(dir, cut), to = b.clone().addScaledVector(dir, -cut - (p.arrow ? 0.12 : 0)), rod = new T.Mesh(new T.CylinderGeometry(0.03, 0.03, 1, 6), mat);
      rod.scale.y = Math.max(0.05, from.distanceTo(to)); rod.position.copy(from).add(to).multiplyScalar(0.5); rod.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), dir);
      g.add(rod);
      if (p.arrow) { const tip = new T.Mesh(new T.ConeGeometry(0.1, 0.26, 8), mat); tip.position.copy(to).addScaledVector(dir, 0.1); tip.quaternion.copy(rod.quaternion); g.add(tip); }
      piece.anchor.copy(a).add(b).multiplyScalar(0.5); piece.top = Math.max(p.a[1], p.b[1]); piece.half = Math.abs(p.a[0] - p.b[0]) / 2;
      piece.mark = st => mat.color.copy(st === 'off' ? col : shade(st));
      break;
    }
    case 'gate': {
      const leafMat = lamp(col, 0.25), barMat = basic(SHADE.off);
      for (const sx of [-1, 1]) { const pil = new T.Mesh(unitBox, sc.metal); pil.scale.set(0.3, 2.2, 0.3); pil.position.set(sx * 1.1, 1.1, 0); g.add(pil); }
      const lintel = new T.Mesh(unitBox, sc.metal), bar = new T.Mesh(unitBox, barMat), leaves = [-1, 1].map(sx => { const l = new T.Mesh(unitBox, leafMat); l.scale.set(0.95, 2.1, 0.1); l.position.set(sx * 0.475, 1.07, 0); g.add(l); return l; });
      lintel.scale.set(2.5, 0.3, 0.34); lintel.position.y = 2.33; bar.scale.set(1.6, 0.06, 0.36); bar.position.y = 2.15;
      const lab = sceneLabel(p.t || ' ', INK, 4.4, 0.34);
      lab.position.set(0, 2.95, 0); lab.rotation.x = -0.15;
      g.add(lintel, bar, lab);
      piece.anchor.y = y0 + 1.2; piece.top = y0 + 3.3; piece.half = 2.3; piece.front = 1.7;
      piece.text = (t, tone) => relabel(lab, tone === 'ok' ? OKC : tone === 'bad' ? BADC : INK, t);
      piece.open = async (dur, alive) => {
        barMat.color.copy(lin(SHADE.ok)); leafMat.emissive.copy(lin(SHADE.ok)); leafMat.emissiveIntensity = 0.8;
        await tween(dur(0.45), k => { if (alive()) leaves.forEach((l, i) => { l.position.x = (i ? 1 : -1) * (0.475 + k * 0.42); l.scale.x = 0.95 * (1 - k * 0.88); }); }, easeOut);
      };
      piece.jam = async (dur, alive) => {
        barMat.color.copy(lin(SHADE.bad)); leafMat.emissive.copy(lin(SHADE.bad)); leafMat.emissiveIntensity = 0.8;
        await tween(dur(0.35), k => { if (alive()) g.position.x = px + Math.sin(k * 30) * 0.06 * (1 - k); }, x => x);
        g.position.x = px;
      };
      break;
    }
    case 'bridge': {
      g.position.set(0, 0, 0);
      const n = p.n, planks = [], ghostMat = line(0.34);
      for (let k = 0; k < n; k++) {
        const m = std(0x10183f, { emissive: col, emissiveIntensity: 0.16, roughness: 0.3, metalness: 0.6, transparent: true, opacity: 1 }), pl = new T.Mesh(unitBox, m), mark = new T.LineSegments(unitEdge, ghostMat), x = px + k * p.pitch;
        pl.scale.set(p.pitch * 0.9, 0.14, 1.3); pl.position.set(x, -0.07, pz); pl.visible = false;
        mark.scale.copy(pl.scale); mark.position.copy(pl.position);              // where the plank will be, before there is one, and its lit edge afterwards
        g.add(pl, mark);
        let lab = null;
        if (p.labels && p.labels[k] !== '') { lab = sceneLabel(p.labels[k], AMBER, p.pitch - 0.1, 0.34); lab.position.set(x, 0.66, pz - 0.3); g.add(lab); }
        planks.push({ pl, m, lab, mark, x });
      }
      piece.anchor.set(px + (n - 1) * p.pitch / 2, 0.2, pz); piece.top = 1.1; piece.half = n * p.pitch / 2;
      piece.extend = async (dur, alive, ghost) => {
        for (const q of planks) { q.pl.visible = true; q.m.opacity = ghost ? 0.3 : 1; q.m.depthWrite = !ghost; }
        if (!ghost) ghostMat.color.copy(col);
        await tween(dur(0.3 + n * 0.02), k => { if (alive()) planks.forEach((q, i) => { q.pl.scale.x = p.pitch * 0.9 * Math.max(0.01, clamp01(k * (n + 1) - i)); }); }, x => x);
      };
      piece.snap = async (dur, alive, at, quiet) => {
        const q = planks[Math.max(0, Math.min(n - 1, at))];
        q.m.emissive.copy(lin(SHADE.bad)); q.m.emissiveIntensity = 1.1; q.m.opacity = 1; q.m.depthWrite = true;
        q.mark.visible = false;
        if (q.lab) relabel(q.lab, BADC);
        if (!quiet) { burst(new T.Vector3(q.x, 0.1, pz), 0xff6b7d, 26, 3, 1.2); sfx('crash'); }
        await tween(dur(0.5), k => { if (alive()) { q.pl.position.y = -0.07 - k * 5; q.pl.rotation.z = k * 1.6; } }, easeIn);
        q.pl.visible = false;
      };
      break;
    }
    case 'tube': {
      const H = 2.5, glass = new T.Mesh(new T.CylinderGeometry(0.5, 0.5, H, 28, 1, true), std(0x9fb4ff, { transparent: true, opacity: 0.17, roughness: 0.05, metalness: 0.2, side: T.DoubleSide, envMapIntensity: 1.6, depthWrite: false }));
      const liqMat = lamp(col, 0.95), liq = new T.Mesh(new T.CylinderGeometry(0.43, 0.43, 1, 24), liqMat), foot = new T.Mesh(new T.CylinderGeometry(0.62, 0.7, 0.2, 24), sc.metal), cap = new T.Mesh(new T.CylinderGeometry(0.56, 0.56, 0.12, 24), sc.metal);
      const rotor = new T.Mesh(unitBox, basic(col)), ringMat = basic(SHADE.pick), ring = new T.Mesh(new T.TorusGeometry(0.57, 0.035, 8, 32), ringMat);
      glass.position.y = 0.2 + H / 2; liq.scale.y = 0.001; liq.position.y = 0.2; foot.position.y = 0.1; cap.position.y = 0.26 + H; rotor.scale.set(0.95, 0.05, 0.12); rotor.position.y = 0.4 + H;
      ring.rotation.x = Math.PI / 2; ring.visible = false;
      g.add(liq, foot, cap, rotor, ring, glass);
      let level = 0, want = null;
      const setLevel = v => { level = v; liq.scale.y = Math.max(0.001, v * H); liq.position.y = 0.2 + v * H / 2; };
      piece.anchor.y = y0 + 1.3; piece.top = y0 + H + 0.5; piece.half = 0.75; piece.front = 1.5;
      piece.fill = async (dur, alive, to) => { const from = level; await tween(dur(0.7), k => { if (alive()) setLevel(from + (to - from) * k); }, easeInOut); setLevel(to); };
      piece.ring = (at, t) => {
        ring.visible = true; ring.position.y = 0.2 + at * H;
        if (!t) return;
        if (want) relabel(want, AMBER, t); else { want = sceneLabel(t, AMBER, 1.9, 0.24); g.add(want); }
        want.position.set(-1.62, 0.2 + at * H, 0);
      };
      piece.spin = async (dur, alive, quiet) => {
        liqMat.emissive.copy(lin(SHADE.ok)); ringMat.color.copy(lin(SHADE.ok));
        if (!quiet) burst(new T.Vector3(px, 0.6 + H, pz), SHADE.ok, 24, 3, 1.5);
        await tween(dur(0.6), k => { if (alive()) rotor.rotation.y = k * 14; }, easeOut);
      };
      piece.mark = st => liqMat.emissive.copy(st === 'off' ? col : shade(st));
      break;
    }
    case 'screen': {
      // the signal wall: lines of text drawn on one canvas. Letters keep a fixed pitch, so a wrong one can be boxed in red.
      // The wall is as many letters wide as its longest line needs (p.cols), so short lines are written large.
      const rows = p.rows.map(r => Object.assign({ shown: String(r.text).length, marks: null, hl: null }, r)), CW = 1280, X0 = 208, room = (CW - X0 - 24) / (p.cols || 36);
      const RH = Math.round(Math.max(64, Math.min(132, 642 / rows.length, room * 2.25))), FS = Math.round(Math.min(RH * 0.62, room * 1.4)), TS = Math.round(Math.max(24, Math.min(34, RH * 0.3))), PITCH = Math.min(room, FS * 0.7);
      const CH = rows.length * RH + 28, WID = 8.2, hgt = CH / CW * WID, cy = 0.5 + hgt / 2;
      const cv = document.createElement('canvas'), accent = '#' + new T.Color(col).convertLinearToSRGB().getHexString();
      cv.width = CW; cv.height = CH;
      const tex = canvasTex(cv), face = new T.Mesh(new T.PlaneGeometry(WID, hgt), new T.MeshBasicMaterial({ map: tex, toneMapped: false })), back = new T.Mesh(unitBox, std(0x0a0f26, { roughness: 0.35, metalness: 0.5 })), rim = new T.LineSegments(unitEdge, line(1));
      tex.generateMipmaps = false; tex.minFilter = T.LinearFilter;
      back.scale.set(WID + 0.3, hgt + 0.3, 0.16); back.position.set(0, cy, -0.1); rim.scale.copy(back.scale); rim.position.copy(back.position); face.position.set(0, cy, 0);
      for (const sx of [-1, 1]) { const leg = new T.Mesh(unitBox, sc.metal); leg.scale.set(0.16, 0.5, 0.16); leg.position.set(sx * 3.4, 0.25, -0.1); g.add(leg); }
      g.add(back, rim, face);
      const c2 = cv.getContext('2d'), box = Math.round(RH * 0.39);
      const draw = () => {
        c2.fillStyle = '#060916'; c2.fillRect(0, 0, CW, CH);
        rows.forEach((r, k) => {
          const y = 14 + k * RH + RH / 2, text = String(r.text).slice(0, Math.round(r.shown));
          if (r.out) { c2.fillStyle = 'rgba(255,255,255,0.05)'; c2.fillRect(X0 - 14, y - RH / 2 + 5, CW - X0 - 6, RH - 10); }
          c2.textAlign = 'left'; c2.textBaseline = 'middle';
          c2.font = '600 ' + TS + 'px ' + FONT; c2.fillStyle = r.out ? accent : '#8d97c9';
          c2.fillText(track(String(r.tag || '').toUpperCase()), 22, y + 2);
          c2.font = '500 ' + FS + 'px ' + MONO; c2.textAlign = 'center';
          for (let j = 0; j < text.length; j++) {
            const x = X0 + j * PITCH, wrong = !!r.marks && r.marks[j] === 1;
            if (r.hl && j >= r.hl[0] && j < r.hl[1]) { c2.fillStyle = 'rgba(255,194,71,0.3)'; c2.fillRect(x, y - box, PITCH, box * 2); }
            if (wrong) { c2.fillStyle = 'rgba(255,93,115,0.3)'; c2.fillRect(x, y - box, PITCH, box * 2); }
            c2.fillStyle = wrong ? '#ff5d73' : r.out && r.marks ? '#5fe3a1' : '#eef1ff';
            if (text[j] !== ' ') c2.fillText(text[j], x + PITCH / 2, y + 2);
          }
          if (r.out && r.shown < String(r.text).length) { c2.fillStyle = accent; c2.fillRect(X0 + text.length * PITCH + 3, y - box * 0.8, 4, box * 1.6); }      // the cursor
        });
        tex.needsUpdate = true;
      };
      draw();
      piece.anchor.set(px, y0 + cy, pz); piece.top = y0 + cy + hgt / 2 + 0.3; piece.half = WID / 2 + 0.15; piece.front = 2; piece.side = -3.3;
      piece.type = async (dur, alive, id, text, marks) => {
        const r = rows.find(x => x.id === id);
        if (!r) return;
        r.text = String(text); r.marks = marks || []; r.shown = 0;
        await tween(dur(Math.min(1.1, 0.2 + r.text.length * 0.03)), k => { if (alive()) { r.shown = k * r.text.length; draw(); } }, x => x);
        r.shown = r.text.length;
        draw();
      };
      piece.hl = (id, from, to) => { const r = rows.find(x => x.id === id); if (r) { r.hl = [from, to]; draw(); } };
      break;
    }
  }
  return piece;
}
// The camera stands as close as it can while everything on the stage stays in view. The stage is a different shape on
// every screen (a tall column next to the editor, a low strip above it on a phone), so this is worked out, not guessed.
function sceneFrame() {
  const s = sc, high = Math.max(1, stage.clientHeight), aspect = stage.clientWidth / high, tv = Math.tan(T.MathUtils.degToRad(camera.fov / 2)), th = tv * aspect, se = Math.sin(s.el), ce = Math.cos(s.el);
  const over = Math.max(0.4, Math.min(0.95, 1 - 2 * (inset.top + 6) / high)), under = Math.max(0.4, Math.min(0.95, 1 - 2 * (inset.bottom + 6) / high));        // how much of the view above and below its middle is free
  const tries = [];
  let least = Infinity;
  for (let ty = -1.5; ty <= 4.51; ty += 0.15) {
    let dist = 4.5;
    for (const p of s.pts) {
      const py = p[1] - ty, deep = -(py * se + p[2] * ce), up = py * ce - p[2] * se;        // how far into the view the point is, and how high in it
      dist = Math.max(dist, p[0] / (0.94 * th) - deep, (up > 0 ? up / (over * tv) : -up / (under * tv)) - deep);
    }
    tries.push([ty, dist, dist + ty * se]);            // the last: how far the camera really is from the deck, which is what decides how large the scene looks
    least = Math.min(least, dist + ty * se);
  }
  // Where the view is taller than the scene, many heights show it just as large. Of those, take the one that leaves as
  // much room above the scene as below it.
  let best = null;
  for (const t of tries) {
    if (t[2] > least * 1.012) continue;
    let lo = Infinity, hi = -Infinity;
    for (const p of s.pts) { const py = p[1] - t[0], v = (py * ce - p[2] * se) / (tv * (t[1] - py * se - p[2] * ce)); lo = Math.min(lo, v); hi = Math.max(hi, v); }
    const off = Math.abs((over - hi) - (lo + under));
    if (!best || off < best.off) best = { y: t[0], dist: t[1], off };
  }
  return best;
}
const reframe = () => { if (!sc || mode !== 'arena') return; const f = sceneFrame(); if (dataCam) { dataCam.y = f.y; dataCam.dist = f.dist; } else { aty = f.y; acamT.dist = f.dist; } };
// The page tells how many pixels at the top and the bottom of the view its own labels cover, so that a scene is framed clear of them.
W.setInsets = function (top, bottom) { if (inset.top === top && inset.bottom === bottom) return; inset.top = top; inset.bottom = bottom; reframe(); };
// meta: { color, floor, boss, tests, perf: [bool], keep }
W.showScene = function (stage, meta) {
  const keep = !!meta.keep && !!sc && mode === 'arena';           // the same level again: the camera stays where it is
  clearArena();
  sceneGeos();
  const col = lin(meta.color), theme = THEMES[meta.floor] || { gem: 'octa', prop: null }, w = stage.w, d = stage.d;
  sc = { stage, col, w, d, el: stage.el || 0.6, map: new Map(), home: stage.pip.slice(), hover: 0.42 * PIP_SIZE + 0.03, pts: [],
    metal: std(0x1c2658, { roughness: 0.4, metalness: 0.62 }), stepMat: std(0x151d48, { roughness: 0.42, metalness: 0.62 }) };
  if (!stage.props.some(p => p.k === 'pad')) {                     // a bridge has two platforms and a drop between them instead of one deck
    const slab = new T.Mesh(unitBox, sc.stepMat), lines = tileTex.clone(), rim = new T.LineSegments(unitEdge, new T.LineBasicMaterial({ color: col, toneMapped: false }));
    lines.needsUpdate = true; lines.wrapS = lines.wrapT = T.RepeatWrapping; lines.repeat.set(Math.max(1, Math.round(w + 0.6)), Math.max(1, Math.round(d + 0.6)));
    const top = new T.Mesh(new T.PlaneGeometry(w + 0.6, d + 0.6), std(0x070b1e, { emissive: col, emissiveMap: lines, emissiveIntensity: 0.5, roughness: 0.2, metalness: 0.55, envMapIntensity: 1.2 }));
    slab.scale.set(w + 0.9, 0.5, d + 0.9); slab.position.y = -0.26; rim.scale.copy(slab.scale); rim.position.y = -0.26;
    top.rotation.x = -Math.PI / 2;
    arena.add(slab, top, rim);
  }
  const under = glow(meta.color, Math.max(w, d) * 2.2, 0.2);
  under.position.y = -1.8;
  arena.add(under);
  for (const p of stage.props) { const piece = scenePiece(p); sc.map.set(p.id, piece); arena.add(piece.g); }
  // the tests: one small crystal for each, in a row along the front edge like footlights
  const count = meta.tests || 0, gap = Math.min(0.56, (w - 0.4) / Math.max(1, count)), fz = d / 2 + 0.72;
  if (count) { const rail = new T.Mesh(unitBox, sc.stepMat); rail.scale.set(count * gap + 0.4, 0.3, 0.5); rail.position.set(0, -0.25, fz); arena.add(rail); }
  for (let i = 0; i < count; i++) {
    const slow = !!(meta.perf && meta.perf[i]), size = slow ? 0.66 : 0.5, x = (i - (count - 1) / 2) * gap;
    const mat = std(0x0b1030, { emissive: CSTATE.idle, emissiveIntensity: 0.7, roughness: 0.1, metalness: 0.35, flatShading: true, envMapIntensity: 1.05 }), gem = new T.Mesh(gemGeo(theme.gem, size), mat), gl = glow(0xffffff, 1.3 * size, 0);
    gem.position.set(x, 0.3, fz); gl.position.copy(gem.position);
    arena.add(gem, gl);
    if (slow) { const ring = new T.Mesh(new T.TorusGeometry(0.3, 0.014, 6, 24), basic(0xffb347, { transparent: true, opacity: 0.7 })); ring.position.copy(gem.position); arena.add(ring); gem.userData.ring = ring; }
    crystals.push({ gem, mat, glow: gl, y: 0.3, k: 0.5, state: 'idle', spin: 0.6 + Math.random() * 0.4 });
  }
  if (meta.boss) {
    lock = new T.Group();
    const shellM = new T.Mesh(new T.IcosahedronGeometry(0.62, 0), std(0x1a2150, { roughness: 0.3, metalness: 0.7, flatShading: true, envMapIntensity: 1.3 }));
    lock.add(shellM, new T.LineSegments(new T.EdgesGeometry(shellM.geometry), new T.LineBasicMaterial({ color: lin(0xff7a6b), toneMapped: false })), glow(0xff7a6b, 2.8, 0.35));
    lock.position.set(w / 2 - 0.3, 2.7, -d / 2 - 0.2);
    arena.add(lock);
  }
  beam = new T.Mesh(new T.CylinderGeometry(0.03, 0.03, 1, 6, 1, true), basic(0xffffff, { transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false }));
  arena.add(beam);
  pip = makePip();
  pip.scale.setScalar(PIP_SIZE);
  pip.position.set(sc.home[0], sc.hover, sc.home[1]);
  arena.add(pip);
  board = { col, props: theme.prop ? addProps(theme.prop, col) : [] };
  // what has to stay in view: the deck and the footlights, room for PIP to hop, and everything that stands taller
  const reach = Math.max(2, stage.top || 0), xs = w / 2 + 0.45;
  sc.pts.push([xs, -0.2, d / 2 + 1.05], [xs, 0.6, d / 2 + 0.95], [xs, reach, d / 2], [xs, reach, -d / 2], [xs, 0, -d / 2 - 0.45]);
  sc.tall = reach;
  for (const piece of sc.map.values()) { sc.pts.push([Math.abs(piece.anchor.x) + piece.half, piece.top, piece.anchor.z]); sc.tall = Math.max(sc.tall, piece.top); }
  if (lock) sc.pts.push([w / 2 + 0.4, 3.4, lock.position.z]);
  const f = sceneFrame();
  acamT.az = Math.PI / 2; acamT.el = sc.el; acamT.dist = f.dist;
  if (keep) { atarget.x = 0; atarget.z = 0; aty = f.y; } else { atarget.set(0, f.y, 0); openShot(); }
  arenaSpan = Math.max(w, d) / 2 + 3;
  tintT.copy(col);
  lit(arena);
};
// Play the beats of a scene. opts: speed, instant (jump to how it ends), note(text, kind): a caption for the player.
W.playScene = async function (beats, opts) {
  opts = opts || {};
  if (!sc || mode !== 'arena' || !pip) return true;
  cancelAll();
  const scene = sc, my = epoch, alive = () => my === epoch && sc === scene, fast = !!opts.instant, speed = Math.max(0.5, opts.speed || 1), dur = s => (fast ? 0 : s / speed), u = pip.userData;
  const get = id => scene.map.get(id) || null;
  const stand = to => {                                 // where PIP goes to work on a piece, or the place given
    if (Array.isArray(to)) return new T.Vector3(to[0], scene.hover, to[1]);
    const piece = get(to);
    return piece ? new T.Vector3(piece.anchor.x + piece.side, scene.hover, piece.anchor.z + piece.front) : pip.position.clone();
  };
  const travel = (to, hop, secs) => {
    const from = pip.position.clone(), arc = hop ? 0.5 : 0.1, lean = Math.max(-0.5, Math.min(0.5, (to.x - from.x) * 0.22));
    if (hop && !fast) sfx('step');
    return tween(dur(secs || (hop ? 0.26 : 0.34)), k => {
      if (!alive()) return;
      pip.position.lerpVectors(from, to, k); pip.position.y += Math.sin(k * Math.PI) * arc;
      u.tilt.rotation.x = Math.sin(k * Math.PI) * 0.16; pip.rotation.y = Math.sin(k * Math.PI) * lean;
    });
  };
  const pulse = g => { if (!fast) tween(dur(0.22), k => { if (alive()) g.scale.setScalar(1 + 0.2 * (1 - k)); }, easeOut); };
  async function play(b) {
    const piece = b.id !== undefined && !Array.isArray(b.id) ? get(b.id) : null;
    switch (b.a) {
      case 'go': { const to = stand(b.to); to.y = scene.hover + (b.y || 0); await travel(to, false, b.t); break; }
      case 'hop': { const to = stand(b.to); to.y = scene.hover + (b.y || 0); await travel(to, true, b.t); break; }
      case 'zap': if (piece && !fast) { fireBeam(piece.anchor); burst(piece.anchor, scene.col, 6, 1.4, 0.4); sfx('trace'); await sleep(dur(0.1)); } break;
      case 'mark': {
        const ids = Array.isArray(b.id) ? b.id : [b.id];
        for (const id of ids) { const m = get(id); if (m) m.mark(b.s); }
        if (!fast && (b.s === 'ok' || b.s === 'bad')) { sfx(b.s === 'ok' ? 'tick' : 'buzz'); await sleep(dur(0.07)); }
        else if (!fast && (b.s === 'on' || b.s === 'pick')) sfx('pick');
        break;
      }
      case 'new': {
        if (scene.map.has(b.p.id)) break;
        const made = scenePiece(b.p), g = made.g, to = g.position.clone(), from = b.from === 'pip' ? new T.Vector3(pip.position.x, pip.position.y + 0.4, pip.position.z) : to;
        scene.map.set(b.p.id, made);
        arena.add(g);
        lit(g);
        await tween(dur(b.from === 'pip' ? 0.2 : 0.13), k => { if (!alive()) return; g.scale.setScalar(0.15 + 0.85 * k); g.position.lerpVectors(from, to, k); }, easeOut);
        g.scale.setScalar(1); g.position.copy(to);
        if (!fast && b.from === 'pip') sfx('place');
        break;
      }
      case 'txt': if (piece) { piece.text(b.t, b.tone); pulse(piece.g); } break;
      case 'type': if (piece && piece.type) { if (!fast) sfx('type'); await piece.type(dur, alive, b.row, b.text, b.marks); } break;
      case 'hl': if (piece && piece.hl) piece.hl(b.row, b.from, b.to); break;
      case 'open': if (piece && piece.open) { if (!fast) { sfx('gate'); burst(piece.anchor, SHADE.ok, 30, 3.5, 1.5); } await piece.open(dur, alive); } break;
      case 'jam': if (piece && piece.jam) { if (!fast) { sfx('jam'); burst(piece.anchor, 0xff6b7d, 18, 2.5, 1); } await piece.jam(dur, alive); } break;
      case 'extend': if (piece && piece.extend) { if (!fast) sfx('plank'); await piece.extend(dur, alive, !!b.ghost); } break;
      case 'snap': if (piece && piece.snap) await piece.snap(dur, alive, b.at, fast); break;
      case 'fill': if (piece && piece.fill) { if (!fast) sfx('pour'); await piece.fill(dur, alive, b.to); } break;
      case 'ring': if (piece && piece.ring) piece.ring(b.at, b.t); break;
      case 'spin': if (piece && piece.spin) await piece.spin(dur, alive, fast); break;
      case 'note': if (b.t) { if (opts.note) opts.note(b.t, b.s); await sleep(dur(0.3 + Math.min(0.7, b.t.length * 0.01))); } break;
      case 'wait': await sleep(dur(b.t || 0.2)); break;
      case 'all': await Promise.all(b.b.map(play)); break;
      case 'seq': for (const x of b.b) { if (!alive()) return; await play(x); } break;
      case 'pip':
        if (b.do === 'fall') {
          u.shadow.visible = false;
          if (!fast) sfx('fall');
          await tween(dur(0.6), k => { if (alive()) { pip.position.y = scene.hover - 7 * k; u.tilt.rotation.x = k * 2.2; pip.scale.setScalar(PIP_SIZE * (1 - 0.5 * k)); } }, easeIn);
          if (!alive()) return;
          pip.position.set(scene.home[0], scene.hover, scene.home[1]); pip.scale.setScalar(PIP_SIZE); u.tilt.rotation.set(0, 0, 0); u.shadow.visible = true;
          setMood(pip, 'sad');
        } else if (b.do === 'no') await tween(dur(0.45), k => { if (alive()) u.tilt.rotation.y = Math.sin(k * 12) * 0.45 * (1 - k); }, x => x);
        else setMood(pip, 'sad');
        break;
      case 'end':
        setMood(pip, b.ok ? 'happy' : 'sad');
        if (fast) break;
        if (b.ok) {
          sfx('pass');
          burst(new T.Vector3(pip.position.x, 1.6, pip.position.z), 0xffc247, 46, 4.5, 3);
          burst(new T.Vector3(0, 2, 0), scene.col, 50, 6, 2);
          if (!calm) tween(1.1, k => { if (alive()) acamT.az = Math.PI / 2 + Math.sin(k * Math.PI) * 0.13; }).then(() => { if (alive()) acamT.az = Math.PI / 2; });
          const y0 = pip.position.y, h0 = pip.rotation.y;
          await tween(dur(0.55), k => { if (alive()) { pip.position.y = y0 + Math.sin(k * Math.PI) * 0.5; pip.rotation.y = h0 + k * TAU; } });
          if (alive()) pip.rotation.y = h0;
        } else {
          sfx('fail');
          await tween(dur(0.5), k => { if (alive()) u.tilt.rotation.y = Math.sin(k * 14) * 0.4 * (1 - k); }, x => x);
        }
        break;
    }
  }
  for (const b of beats) { if (!alive()) return false; await play(b); }
  return alive();
};
// After a scene has played, the footlights give the whole verdict: one for each test.
W.lightTests = async function (states, instant) {
  const my = epoch, won = states.length > 0 && states.every(s => s === 'pass');
  for (let i = 0; i < states.length; i++) {
    if (!crystals[i]) continue;
    setCrystal(i, states[i]);
    if (instant || my !== epoch) continue;
    if (states[i] === 'pass') burst(crystals[i].gem.position, board.col, 5, 1.4, 0.6);
    sfx('pick');
    await sleep(0.045);
  }
  if (lock && won) { if (!instant && my === epoch) { burst(lock.position, 0xff7a6b, 70, 6, 2); sfx('boss'); } lock.visible = false; }
  if (pip && states.length && !won) setMood(pip, 'sad');
  return my === epoch;
};

W.stop = cancelAll;

// ---------------------------------------------------------------- camera, lights, input, loop
function placeCamera(dt) {
  const s = 1 - Math.exp(-dt * 7), sway = calm ? 0 : Math.sin(time * 0.21) * 0.014;       // the camera is never perfectly still
  if (mode === 'hub') {
    cam.az += (camT.az - cam.az) * s; cam.y += (camT.y - cam.y) * s; cam.dist += (camT.dist - cam.dist) * s;
    const el = 0.3, c = Math.cos(el) * cam.dist, az = cam.az + sway;
    camera.position.set(c * Math.cos(az), cam.y + 0.8 + Math.sin(el) * cam.dist, c * Math.sin(az));
    camera.lookAt(5.2 * Math.cos(cam.az), cam.y - 1.9, 5.2 * Math.sin(cam.az));
  } else {
    if (aty !== null) atarget.y += (aty - atarget.y) * s;
    acam.az += (acamT.az - acam.az) * s; acam.el += (acamT.el - acam.el) * s; acam.dist += (acamT.dist - acam.dist) * s;
    const c = Math.cos(acam.el) * acam.dist, az = acam.az + sway * 1.6;
    camera.position.set(atarget.x + c * Math.cos(az), atarget.y + Math.sin(acam.el) * acam.dist, atarget.z + c * Math.sin(az));
    camera.lookAt(atarget);
  }
}
// The key light sits above the subject, to the camera's left; a cool light edges it from behind. In the hub both travel
// with the camera, so the platform you are looking at is always well lit.
function aimLights(dt) {
  const az = mode === 'hub' ? cam.az : Math.PI / 2, span = mode === 'hub' ? 17 : arenaSpan;
  if (mode === 'hub') _v.set(5.2 * Math.cos(az), cam.y, 5.2 * Math.sin(az)); else _v.copy(atarget);
  const kx = Math.cos(az + 0.8), kz = Math.sin(az + 0.8);
  sun.position.set(_v.x + kx * 26, _v.y + 34, _v.z + kz * 26);
  sun.target.position.copy(_v);
  rim.position.set(_v.x - kx * 22, _v.y + 9, _v.z - kz * 22);
  rim.target.position.copy(_v);
  const sc = sun.shadow.camera;
  if (sc.right !== span) { sc.left = -span; sc.right = span; sc.top = span; sc.bottom = -span; sc.updateProjectionMatrix(); }
  // every floor has its own colour of light
  tint.lerp(tintT, 1 - Math.exp(-dt * 2.5));
  rim.color.copy(COOL).lerp(tint, 0.55);
  hemi.color.copy(SKYLIGHT).lerp(tint, 0.16);
  dust.material.color.copy(SKYLIGHT).lerp(tint, 0.5);
  dust.position.set(_v.x, _v.y + (calm ? 0 : Math.sin(time * 0.27) * 0.5), _v.z);
  dust.rotation.y = time * 0.018;
}
function hubDist() { const a = stage.clientWidth / Math.max(1, stage.clientHeight); return Math.min(52, 27 / Math.max(0.5, Math.min(1, a * 0.85))); }
function bindInput() {
  const ray = new T.Raycaster(), mouse = new T.Vector2(), ptrs = new Map();
  let moved = 0, pinch = 0;
  const pick = e => {
    const r = canvas.getBoundingClientRect();
    mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(mouse, camera);
    const hit = ray.intersectObjects(pickables, false)[0];
    return hit ? hit.object.userData.node : -1;
  };
  canvas.addEventListener('pointerdown', e => { ptrs.set(e.pointerId, [e.clientX, e.clientY]); moved = 0; pinch = 0; try { canvas.setPointerCapture(e.pointerId); } catch (x) { /* older browsers */ } });
  canvas.addEventListener('pointermove', e => {
    const p = ptrs.get(e.pointerId);
    if (!p) {
      if (mode === 'hub' && e.pointerType === 'mouse') canvas.style.cursor = pick(e) >= 0 ? 'pointer' : 'grab';
      return;
    }
    const dx = e.clientX - p[0], dy = e.clientY - p[1];
    p[0] = e.clientX; p[1] = e.clientY;
    if (ptrs.size === 2) {
      const v = Array.from(ptrs.values()), d = Math.hypot(v[0][0] - v[1][0], v[0][1] - v[1][1]);
      if (pinch) zoom(pinch / d);
      pinch = d; moved = 99;
      return;
    }
    moved += Math.abs(dx) + Math.abs(dy);
    if (mode === 'hub') { camT.az += dx * 0.0052; camT.y = Math.max(0, Math.min(topY + 4, camT.y + dy * 0.055)); }
    else { acamT.az += dx * 0.006; acamT.el = Math.max(0.16, Math.min(1.5, acamT.el + dy * 0.005)); }
  });
  const up = e => {
    if (!ptrs.has(e.pointerId)) return;
    ptrs.delete(e.pointerId);
    if (moved < (e.pointerType === 'mouse' ? 7 : 14) && mode === 'hub' && e.type === 'pointerup') {       // a finger is never as still as a mouse
      const i = pick(e);
      if (i >= 0) { if (i === selected && cb.onOpen) cb.onOpen(i); else if (cb.onSelect) cb.onSelect(i); }
    }
  };
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  function zoom(f) {
    if (mode === 'hub') camT.dist = Math.max(13, Math.min(64, camT.dist * f));
    else acamT.dist = Math.max(4, Math.min(48, acamT.dist * f));
  }
  canvas.addEventListener('wheel', e => { e.preventDefault(); zoom(1 + Math.max(-0.3, Math.min(0.3, e.deltaY * 0.0012))); }, { passive: false });
  canvas.addEventListener('dblclick', e => { if (mode === 'hub') { const i = pick(e); if (i >= 0 && cb.onOpen) cb.onOpen(i); } });
}
W.resize = function () {
  if (!renderer) return;
  const w = stage.clientWidth, h = stage.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  camT.dist = hubDist();
  reframe();                                        // a scene is framed to fit the view it has
  sizeBloom(w, h);
};
let last = 0, lastTick = 0;
function frame(now, fromTimer) {
  if (fromTimer !== true) requestAnimationFrame(frame);
  const real = Math.min(0.6, (now - last) / 1000 || 0.016), dt = Math.min(0.05, real);
  last = now;
  lastTick = performance.now();
  time += dt;
  stepTweens(real);          // sequences keep real time even when the browser throttles frames
  if (!stage.clientHeight) return;                 // the view is folded away (a phone keyboard is open): nothing to draw
  stepParticles(dt);
  if (mode === 'hub') {
    idlePip(hubPip, 1, dt);
    selRing.rotation.z += dt * 0.6;
    selRing.material.opacity = 0.55 + 0.35 * Math.sin(time * 3.2);
    beacon.rotation.y += dt * 0.5;
    if (nextNode >= 0 && nodes[nextNode] && nodes[nextNode].state === 'open') {
      const n = nodes[nextNode];
      n.topMat.emissive.copy(n.col).multiplyScalar(pf(calm ? 0.5 : 0.44 + 0.26 * Math.sin(time * 3.4)));
    }
    for (const n of nodes) if (n.stars.visible) n.stars.rotation.y += dt * 1.2;
  } else {
    if (pip) idlePip(pip, 1, dt);
    if (board && board.shards) for (const k in board.shards) { const s = board.shards[k]; if (s.visible) { s.children[0].rotation.y += dt * 2; s.position.y = 0.5 + (calm ? 0 : Math.sin(time * 2.4 + s.position.x) * 0.06); } }
    if (board && board.exit) { board.exit.ring.scale.setScalar(1 + 0.08 * Math.sin(time * 4)); board.exit.shaft.material.opacity = 0.16 + 0.07 * Math.sin(time * 2.2); }
    for (const c of crystals) {
      c.gem.rotation.y += dt * c.spin * (c.state === 'pass' ? 2.4 : c.state === 'fail' ? 0.1 : 1);
      const ty = c.y + (c.state === 'pass' ? 0.3 : c.state === 'fail' ? -0.22 : 0) * (c.k || 1);
      c.gem.position.y += (ty + (calm ? 0 : Math.sin(time * 2 + c.spin * 9) * 0.05) - c.gem.position.y) * Math.min(1, dt * 8);
      c.glow.position.copy(c.gem.position);
      if (c.gem.userData.ring) { c.gem.userData.ring.position.copy(c.gem.position); c.gem.userData.ring.rotation.x += dt * 1.5; c.gem.userData.ring.rotation.y += dt; }
    }
    if (lock && lock.visible) { lock.rotation.y += dt * 0.5; lock.rotation.x += dt * 0.23; }
    if (board && board.props && !calm) for (const p of board.props) {
      if (p.userData.spin) { p.rotation.y += dt * p.userData.spin; p.rotation.x += dt * p.userData.spin * 0.6; p.position.y = p.userData.y + Math.sin(time * 0.6 + p.userData.k) * 0.25; }
      if (p.userData.roll) p.rotation.z += dt * p.userData.roll;
    }
  }
  placeCamera(dt);
  aimLights(dt);
  sky.position.copy(camera.position);
  starsB.material.opacity = calm ? 0.8 : 0.62 + 0.3 * Math.sin(time * 1.3);
  renderer.shadowMap.needsUpdate = true;            // once per frame; the bloom copy below reuses it
  renderer.setRenderTarget(null);
  renderer.render(scene, camera);
  if (q.bloom && bloom) drawBloom();
  // "auto" quality: a few seconds of slow frames, while the page is really being watched, step the picture down a tier
  if (qPref === 'auto' && fromTimer !== true && qName !== 'low' && now > grace && document.visibilityState === 'visible') {
    if (real > 0.034 && real < 0.25) slow += real; else slow = Math.max(0, slow - real * 0.6);
    if (slow > 2.4) applyQuality(qName === 'high' ? 'medium' : 'low');
  }
}
W.mood = m => { if (mode === 'arena' && pip) setMood(pip, m); };
// PIP's shell colour, on the tower and in the arena.
W.setCalm = v => { calm = !!v; };
W.setPaint = function (hex) { shellPaint = hex; for (const p of [hubPip, pip]) if (p && p.userData.shell) setLin(p.userData.shell.color, hex); };

// A small studio of coloured lamps that every shiny surface reflects. It is never seen directly.
function makeEnv() {
  const env = new T.Scene();
  const dome = new T.Mesh(new T.SphereGeometry(40, 24, 12), new T.MeshBasicMaterial({ vertexColors: true, side: T.BackSide }));
  paint(dome.geometry, [[-1, 0.004, 0.005, 0.014], [-0.05, 0.02, 0.03, 0.075], [0.12, 0.05, 0.07, 0.17], [1, 0.012, 0.018, 0.05]]);
  env.add(dome);
  const lamp = (w, h, r, g, b, x, y, z) => {
    const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: new T.Color(r, g, b), side: T.DoubleSide }));
    m.position.set(x, y, z); m.lookAt(0, 0, 0);
    env.add(m);
  };
  lamp(26, 14, 3.0, 3.6, 4.6, 10, 26, 18);          // large cool key, above and in front
  lamp(10, 16, 3.4, 2.3, 1.2, -30, 6, 6);           // warm panel to one side
  lamp(34, 3, 0.5, 2.6, 2.2, 0, 3, -34);            // teal strip behind
  lamp(8, 8, 2.4, 0.6, 1.7, 26, -8, -20);           // magenta kicker, low
  const pm = new T.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(env, 0.035).texture;
  pm.dispose();
  env.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
}
function makeSky() {
  sky = new T.Mesh(new T.SphereGeometry(700, 32, 16), new T.MeshBasicMaterial({ vertexColors: true, side: T.BackSide, fog: false, depthWrite: false, toneMapped: false }));
  paint(sky.geometry, [[-1, 0.002, 0.003, 0.009], [-0.12, 0.006, 0.01, 0.03], [0.04, 0.022, 0.036, 0.105], [0.3, 0.008, 0.013, 0.042], [1, 0.003, 0.005, 0.016]]);
  sky.renderOrder = -10; sky.frustumCulled = false;
  scene.add(sky);
  const field = (n, size, opacity) => {
    const sp = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, u = Math.random() * 1.5 - 0.5, r = Math.sqrt(Math.max(0, 1 - u * u)), d = 260 + Math.random() * 180;
      sp[i * 3] = Math.cos(a) * r * d; sp[i * 3 + 1] = u * d + 40; sp[i * 3 + 2] = Math.sin(a) * r * d;
    }
    const sg = new T.BufferGeometry();
    sg.setAttribute('position', new T.BufferAttribute(sp, 3));
    const p = new T.Points(sg, new T.PointsMaterial({ color: lin(0xcfdcff), size, sizeAttenuation: false, transparent: true, opacity, fog: false, depthWrite: false, toneMapped: false }));
    p.frustumCulled = false;
    scene.add(p);
    return p;
  };
  field(coarse ? 700 : 1300, 1.4, 0.7);
  starsB = field(90, 2.6, 0.8);                     // a few bright ones that twinkle
  [[0x2b4fd6, -190, 60, -160, 330], [0x7a3fd0, 210, 120, -90, 300], [0x1fa89a, 40, -40, 260, 280]].forEach(n => { const s = glow(n[0], n[4], 0.16); s.position.set(n[1], n[2], n[3]); scene.add(s); });
  // dust in the air around whatever the camera is looking at
  const n = coarse ? 70 : 140, dp = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { dp[i * 3] = (Math.random() - 0.5) * 30; dp[i * 3 + 1] = (Math.random() - 0.5) * 15; dp[i * 3 + 2] = (Math.random() - 0.5) * 30; }
  const dg = new T.BufferGeometry();
  dg.setAttribute('position', new T.BufferAttribute(dp, 3));
  dust = new T.Points(dg, new T.PointsMaterial({ size: 0.1, map: glowTex, color: lin(0x9fb4ff), transparent: true, opacity: 0.5, depthWrite: false, blending: T.AdditiveBlending, fog: false, toneMapped: false }));
  dust.frustumCulled = false;
  scene.add(dust);
}
W.init = function (stageEl, canvasEl, data, callbacks) {
  stage = stageEl; canvas = canvasEl; levels = data.levels; zones = data.zones; cb = callbacks || {};
  try { renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', stencil: false }); }
  catch (e) { W.ok = false; return Promise.resolve(false); }
  renderer.outputEncoding = T.sRGBEncoding;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  scene = new T.Scene();
  scene.background = lin(0x04060f);
  scene.fog = new T.FogExp2(lin(0x070b1a), 0.012);
  camera = new T.PerspectiveCamera(42, 1, 0.3, 900);
  hemi = new T.HemisphereLight(SKYLIGHT.clone(), lin(0x070a1c), 0.38);
  sun = new T.DirectionalLight(lin(0xfff0dc), 1.55);
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.035;
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 150;
  rim = new T.DirectionalLight(COOL.clone(), 1.15);
  scene.add(hemi, sun, sun.target, rim, rim.target);
  glowTex = makeGlow();
  gridTex = makeGrid();
  try { makeEnv(); } catch (e) { /* no reflections on this device; the lights still do their work */ }
  makeSky();
  makeParticles();
  try { bloom = makeBloom(); } catch (e) { bloom = null; }
  const fonts = document.fonts && document.fonts.load ? Promise.all([document.fonts.load("700 92px 'Barlow Condensed'"), document.fonts.load("600 56px 'Barlow Condensed'")]).catch(() => null) : Promise.resolve();
  return Promise.race([fonts, new Promise(r => setTimeout(r, 1500))]).then(() => {
    buildHub();
    bindInput();
    applyQuality(qPref === 'auto' ? autoTier() : qPref);
    new ResizeObserver(W.resize).observe(stage);
    W.resize();
    cam.dist = camT.dist;
    requestAnimationFrame(frame);
    // Browsers stop animation frames for background tabs. Keep the game moving slowly so a run never hangs.
    setInterval(() => { if (performance.now() - lastTick > 320) frame(performance.now(), true); }, 220);
    return true;
  });
};
})(typeof window !== 'undefined' ? window : globalThis);
