/* Pylon 3D world (three.js r128). Two scenes share one renderer:
   - the hub: the tower with one platform per level on a rising spiral;
   - the arena: a robot deck (zone 1) or a ring of test crystals (code levels).
   The game talks to it through window.PylonWorld. */
(function (root) {
'use strict';
const T = root.THREE;
const W = root.PylonWorld = { ok: !!T };
if (!T) return;

const RISE = 2, RADIUS = 10, PER_TURN = 8, ZONE_H = RISE * PER_TURN, TAU = Math.PI * 2;
const calm = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
let renderer, scene, camera, stage, canvas, glowTex;
let hub, arena, pip, hubPip, selRing, beacon, beaconGlow, parts;
let nodes = [], zoneInfo = [], pickables = [], levels = [], zones = [];
let mode = 'hub', selected = 0, nextNode = -1, epoch = 0, cb = {}, time = 0;
const cam = { az: 0, y: 0, dist: 27 }, camT = { az: 0, y: 0, dist: 27 };
const acam = { az: Math.PI / 2, el: 0.9, dist: 12 }, acamT = { az: Math.PI / 2, el: 0.9, dist: 12 }, atarget = new T.Vector3();
let topY = 0, board = null, crystals = [], lock = null, beam = null;

// ---------------------------------------------------------------- small helpers
const std = (color, o) => new T.MeshStandardMaterial(Object.assign({ color, roughness: 0.6, metalness: 0.15 }, o || {}));
const basic = (color, o) => new T.MeshBasicMaterial(Object.assign({ color }, o || {}));
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
function cancelAll() { epoch++; const old = tweens.splice(0); for (const t of old) t.res(); }
function makeGlow() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d'), grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,1)'); grad.addColorStop(0.25, 'rgba(255,255,255,.55)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
  return new T.CanvasTexture(c);
}
function glow(color, size, opacity) {
  const s = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color, transparent: true, opacity: opacity === undefined ? 0.6 : opacity, depthWrite: false, blending: T.AdditiveBlending, fog: false }));
  s.scale.set(size, size, 1);
  return s;
}
function textTex(text, w, h, font, color) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.font = font; g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, w / 2, h / 2 + h * 0.04);
  const t = new T.CanvasTexture(c);
  t.anisotropy = 4;
  return t;
}
function dispose(obj) {
  obj.traverse(o => {
    if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose();
    const m = o.material;
    if (m) { if (m.map && m.map !== glowTex) m.map.dispose(); m.dispose(); }
  });
}
const sfx = name => { if (cb.sfx) cb.sfx(name); };

// ---------------------------------------------------------------- particles
const PMAX = 420;
const ppos = new Float32Array(PMAX * 3), pcol = new Float32Array(PMAX * 3), pbase = new Float32Array(PMAX * 3), pvel = new Float32Array(PMAX * 3), plife = new Float32Array(PMAX);
let pcur = 0;
function makeParticles() {
  const geo = new T.BufferGeometry();
  for (let i = 0; i < PMAX; i++) ppos[i * 3 + 1] = -9999;
  geo.setAttribute('position', new T.BufferAttribute(ppos, 3));
  geo.setAttribute('color', new T.BufferAttribute(pcol, 3));
  parts = new T.Points(geo, new T.PointsMaterial({ size: 0.34, map: glowTex, vertexColors: true, transparent: true, depthWrite: false, blending: T.AdditiveBlending, fog: false }));
  parts.frustumCulled = false;
  scene.add(parts);
}
function burst(p, color, n, speed, lift) {
  if (calm) n = Math.ceil(n / 3);
  const c = new T.Color(color);
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
  const shell = std(0xe9edff, { roughness: 0.32, metalness: 0.12 }), dark = std(0x11183a, { roughness: 0.35, metalness: 0.35 });
  const body = new T.Mesh(new T.SphereGeometry(0.34, 24, 16), shell);
  body.scale.y = 0.92;
  const visor = new T.Mesh(new T.SphereGeometry(0.347, 24, 12, Math.PI / 2 - 0.95, 1.9, Math.PI / 2 - 0.46, 0.66), dark);
  visor.scale.y = 0.92;
  const eyeMat = basic(0x7ff6ff);
  const eyes = [-0.115, 0.115].map(x => { const e = new T.Mesh(new T.CircleGeometry(0.052, 14), eyeMat); e.position.set(x, 0.045, 0.352); e.rotation.y = x * 2.4; tilt.add(e); return e; });
  const mast = new T.Mesh(new T.CylinderGeometry(0.012, 0.012, 0.2, 6), dark);
  mast.position.y = 0.4;
  const tipMat = basic(0xffc247), tip = new T.Mesh(new T.SphereGeometry(0.045, 10, 8), tipMat);
  tip.position.y = 0.52;
  const ears = [-1, 1].map(s => { const e = new T.Mesh(new T.CylinderGeometry(0.075, 0.075, 0.09, 12), dark); e.rotation.z = Math.PI / 2; e.position.x = s * 0.35; tilt.add(e); return e; });
  const ring = new T.Mesh(new T.TorusGeometry(0.2, 0.028, 8, 28), basic(0x4fe3d0));
  ring.rotation.x = Math.PI / 2; ring.position.y = -0.36;
  const under = glow(0x4fe3d0, 0.95, 0.5);
  under.position.y = -0.5;
  const shadow = new T.Mesh(new T.CircleGeometry(0.3, 20), basic(0x000000, { transparent: true, opacity: 0.35, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = -0.41;
  tilt.add(body, visor, mast, tip, ring, under);
  g.add(shadow);
  g.userData = { tilt, eyes, eyeMat, ears, ring, tip, shadow, mood: 'idle', phase: Math.random() * 6 };
  return g;
}
function setMood(p, mood) {
  const u = p.userData;
  u.mood = mood;
  u.eyeMat.color.setHex(mood === 'sad' ? 0xff6b7d : mood === 'off' ? 0x26305c : 0x7ff6ff);
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
  const nz = zones.length;
  topY = nz * ZONE_H;
  const island = new T.Mesh(new T.CylinderGeometry(15.5, 10.5, 2.6, 6), std(0x0e1536, { roughness: 0.9 }));
  island.position.y = -2.1;
  const islandRim = new T.Mesh(new T.TorusGeometry(15.2, 0.1, 6, 6), basic(0x2b3a80));
  islandRim.rotation.set(Math.PI / 2, 0, Math.PI / 6); islandRim.position.y = -0.8;
  const islandGlow = glow(0x3a56c8, 46, 0.22);
  islandGlow.position.set(0, -6, 0);
  hub.add(island, islandRim, islandGlow);
  zones.forEach((z, k) => {
    const y0 = k * ZONE_H, col = new T.Color(z.color);
    const core = new T.Mesh(new T.CylinderGeometry(2.3, 2.3, ZONE_H - 0.5, 6), std(0x121a40, { roughness: 0.55, metalness: 0.35 }));
    core.position.y = y0 + ZONE_H / 2;
    hub.add(core);
    const stripMat = basic(0x000000);
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3, s = new T.Mesh(new T.BoxGeometry(0.16, ZONE_H - 1.6, 0.16), stripMat);
      s.position.set(2.36 * Math.sin(a), y0 + ZONE_H / 2, 2.36 * Math.cos(a));
      hub.add(s);
    }
    const collar = new T.Mesh(new T.CylinderGeometry(3.2, 3.2, 0.5, 6), std(0x1a2456, { metalness: 0.3 }));
    collar.position.y = y0 + 0.05;
    const ringMat = basic(0x000000), ring = new T.Mesh(new T.TorusGeometry(3.7, 0.09, 8, 54), ringMat);
    ring.rotation.x = Math.PI / 2; ring.position.y = y0 + 0.05;
    const halo = glow(z.color, 13, 0);
    halo.position.y = y0 + ZONE_H / 2;
    const a0 = nodeAngle(k * PER_TURN) + 0.4;
    const label = new T.Sprite(new T.SpriteMaterial({ map: textTex('FLOOR ' + (k + 1) + '  ·  ' + z.name.toUpperCase(), 768, 96, "600 50px 'Chakra Petch', 'Trebuchet MS', sans-serif", z.color), transparent: true, depthWrite: false, fog: true }));
    label.scale.set(5.2, 0.65, 1);
    label.position.set(5.6 * Math.cos(a0), y0 + 5.2, 5.6 * Math.sin(a0));
    hub.add(collar, ring, halo, label);
    zoneInfo.push({ col, stripMat, ringMat, halo });
  });
  const spire = new T.Mesh(new T.CylinderGeometry(0.12, 1.7, 9, 6), std(0x1a2456, { metalness: 0.4 }));
  spire.position.y = topY + 4.5;
  beacon = new T.Mesh(new T.IcosahedronGeometry(1.05, 1), basic(0x2c3870));
  beacon.position.y = topY + 9.7;
  beaconGlow = glow(0xfff2c2, 12, 0.08);
  beaconGlow.position.y = topY + 9.7;
  hub.add(spire, beacon, beaconGlow);

  const starGeo = new T.OctahedronGeometry(0.16);
  starGeo.userData.shared = true;
  levels.forEach((lv, i) => {
    const a = nodeAngle(i), pos = nodePos(i), big = lv.boss ? 1.35 : 1, g = new T.Group();
    g.position.copy(pos);
    g.rotation.y = -a;                                  // local +X points away from the tower
    const baseM = new T.Mesh(new T.CylinderGeometry(1.45 * big, 1.12 * big, 0.56, 6), std(0x1c2658, { roughness: 0.62, metalness: 0.22 }));
    baseM.userData.node = i;
    pickables.push(baseM);
    const topMat = basic(0x141b3d), top = new T.Mesh(new T.CylinderGeometry(1.2 * big, 1.2 * big, 0.06, 6), topMat);
    top.position.y = 0.3;
    top.userData.node = i;
    pickables.push(top);
    const rimMat = basic(0x222b5a), rim = new T.Mesh(new T.TorusGeometry(1.44 * big, 0.05, 6, 6), rimMat);
    rim.rotation.set(Math.PI / 2, 0, Math.PI / 6); rim.position.y = 0.3;
    const decalMat = basic(0xffffff, { map: textTex(lv.boss ? '★' : String(lv.order), 128, 128, "700 84px 'Chakra Petch', 'Trebuchet MS', sans-serif", '#ffffff'), transparent: true, depthWrite: false });
    const decal = new T.Mesh(new T.PlaneGeometry(1.45 * big, 1.45 * big), decalMat), dh = new T.Group();
    decal.rotation.x = -Math.PI / 2;
    dh.rotation.y = Math.PI / 2; dh.position.y = 0.345;
    dh.add(decal);
    const strutLen = RADIUS - 3.6, strut = new T.Mesh(new T.BoxGeometry(strutLen, 0.14, 0.34), std(0x161f4a, { metalness: 0.3 }));
    strut.position.set(-(1.2 * big + strutLen / 2), -0.16, 0);
    const stars = new T.Group();
    for (let s = 0; s < 3; s++) { const m = new T.Mesh(starGeo, basic(0xffc247)); m.position.set(0, 0, (s - 1) * 0.5); stars.add(m); }
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
}
W.setProgress = function (states, next) {
  nextNode = next;
  const solvedByZone = zones.map(() => 0), countByZone = zones.map(() => 0);
  nodes.forEach((n, i) => {
    const s = states[i];
    n.state = s.state;
    const c = n.col;
    if (s.state === 'solved') { n.topMat.color.copy(c).multiplyScalar(0.92); n.rimMat.color.copy(c); n.decalMat.color.setHex(0x0a0f2a); n.decalMat.opacity = 0.95; }
    else if (s.state === 'open') { n.topMat.color.copy(c).multiplyScalar(0.34); n.rimMat.color.copy(c).multiplyScalar(0.75); n.decalMat.color.setHex(0xffffff); n.decalMat.opacity = 1; }
    else { n.topMat.color.setHex(0x121939); n.rimMat.color.setHex(0x222b5a); n.decalMat.color.setHex(0x8892c4); n.decalMat.opacity = 0.35; }
    n.stars.visible = s.state === 'solved';
    n.stars.children.forEach((m, k) => { m.visible = k < s.stars; });
    if (n.bridgeMat) { if (s.state === 'solved') n.bridgeMat.color.copy(c).multiplyScalar(0.85); else n.bridgeMat.color.setHex(0x18204a); }
    countByZone[n.lv.zone - 1]++;
    if (s.state === 'solved') solvedByZone[n.lv.zone - 1]++;
  });
  let all = true;
  zoneInfo.forEach((z, k) => {
    const r = countByZone[k] ? solvedByZone[k] / countByZone[k] : 0;
    if (r < 1) all = false;
    z.stripMat.color.copy(z.col).multiplyScalar(0.1 + 0.9 * r);
    z.ringMat.color.copy(z.col).multiplyScalar(r >= 1 ? 1 : 0.22 + 0.3 * r);
    z.halo.material.opacity = r >= 1 ? 0.2 : 0.05 * r;
  });
  beacon.material.color.setHex(all ? 0xfff6d6 : 0x2c3870);
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
  board = null; crystals = []; lock = null; beam = null; pip = null;
  mode = 'arena';
  hub.visible = false;
  scene.fog.density = 0.006;
}
function fitDist(radius, el) {
  const aspect = stage.clientWidth / Math.max(1, stage.clientHeight), half = T.MathUtils.degToRad(camera.fov / 2);
  const eff = aspect >= 1 ? half : Math.atan(Math.tan(half) * aspect);
  return radius / Math.sin(eff) * (0.74 + 0.1 * el);
}

// ---------------------------------------------------------------- arena: robot deck
const HEAD = { N: Math.PI, E: Math.PI / 2, S: 0, W: -Math.PI / 2 };
W.showRobot = function (world, color) {
  clearArena();
  const col = new T.Color(color), ox = -(world.w - 1) / 2, oz = -(world.h - 1) / 2;
  const tileGeo = new T.BoxGeometry(0.94, 0.4, 0.94), wallGeo = new T.BoxGeometry(0.94, 0.6, 0.94), edgeGeo = new T.EdgesGeometry(wallGeo);
  let walls = 0;
  const matA = std(0x1d2860, { roughness: 0.7 }), matB = std(0x18214f, { roughness: 0.7 }), wallMat = std(0x2a3877, { roughness: 0.5, metalness: 0.25 });
  const edgeMat = new T.LineBasicMaterial({ color: col.clone().multiplyScalar(0.9), transparent: true, opacity: 0.75 });
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
    arena.add(ring, shaft, g);
    board.exit = { p, ring, shaft };
  }
  const shardGeo = new T.OctahedronGeometry(0.19);
  for (const s of world.shards) {
    const m = new T.Mesh(shardGeo, basic(0x8ff8ff)), g = glow(0x4fe3d0, 0.9, 0.5), holder = new T.Group();
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
  Object.assign(acam, acamT);
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
W.showTests = function (count, perf, color, boss) {
  clearArena();
  const col = new T.Color(color);
  const deck = new T.Mesh(new T.CylinderGeometry(3.3, 2.7, 0.6, 6), std(0x18214f, { roughness: 0.6, metalness: 0.25 }));
  deck.position.y = -0.3;
  const deckTop = new T.Mesh(new T.CylinderGeometry(3.0, 3.0, 0.05, 6), basic(col.clone().multiplyScalar(0.22)));
  deckTop.position.y = 0.02;
  const rim = new T.Mesh(new T.TorusGeometry(3.3, 0.06, 6, 6), basic(col));
  rim.rotation.set(Math.PI / 2, 0, Math.PI / 6);
  const under = glow(color, 13, 0.2);
  under.position.y = -2;
  arena.add(deck, deckTop, rim, under);
  const span = Math.min(2.2, 0.36 * Math.max(1, count - 1)), R = 4.7;
  for (let i = 0; i < count; i++) {
    const th = count === 1 ? 0 : -span / 2 + span * i / (count - 1), big = perf[i] ? 1.3 : 1;
    const x = R * Math.sin(th), z = -R * Math.cos(th) + 1.6, h = 1.5 + (perf[i] ? 0.35 : 0);
    const pad = new T.Mesh(new T.CylinderGeometry(0.42, 0.52, 0.22, 6), std(0x1c2658, { metalness: 0.3 }));
    pad.position.set(x, -0.2, z);
    const post = new T.Mesh(new T.CylinderGeometry(0.035, 0.035, h, 6), std(0x2a3877));
    post.position.set(x, h / 2 - 0.1, z);
    const mat = basic(CSTATE.idle), gem = new T.Mesh(new T.OctahedronGeometry(0.4 * big), mat);
    gem.position.set(x, h + 0.35, z);
    const g = glow(0xffffff, 2.2 * big, 0);
    g.position.copy(gem.position);
    arena.add(pad, post, gem, g);
    if (perf[i]) { const ring = new T.Mesh(new T.TorusGeometry(0.62, 0.022, 6, 30), basic(0xffb347, { transparent: true, opacity: 0.7 })); ring.position.copy(gem.position); arena.add(ring); gem.userData.ring = ring; }
    crystals.push({ gem, mat, glow: g, y: h + 0.35, state: 'idle', spin: 0.6 + Math.random() * 0.4 });
  }
  if (boss) {
    lock = new T.Group();
    const shellM = new T.Mesh(new T.IcosahedronGeometry(1.15, 0), std(0x1a2150, { roughness: 0.4, metalness: 0.5, flatShading: true }));
    const wire = new T.LineSegments(new T.EdgesGeometry(shellM.geometry), new T.LineBasicMaterial({ color: 0xff7a6b }));
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
  board = { col };
  atarget.set(0, 1.5, -1.2);
  acamT.az = Math.PI / 2; acamT.el = 0.36; acamT.dist = fitDist(boss ? 7.6 : 6.6, 0.36);
  Object.assign(acam, acamT);
};
function setCrystal(i, state) {
  const c = crystals[i];
  if (!c) return;
  c.state = state;
  c.mat.color.copy(state === 'pass' ? board.col : new T.Color(CSTATE[state]));
  c.glow.material.color.copy(c.mat.color);
  c.glow.material.opacity = state === 'idle' ? 0 : state === 'run' ? 0.9 : 0.55;
}
W.resetTests = function () { cancelAll(); crystals.forEach((c, i) => setCrystal(i, 'idle')); if (pip) setMood(pip, 'idle'); if (lock) lock.visible = true; };
function fireBeam(to) {
  const from = new T.Vector3(pip.position.x, pip.position.y + 1.1, pip.position.z), d = to.clone().sub(from), len = d.length();
  beam.scale.set(1, len, 1);
  beam.position.copy(from).add(to).multiplyScalar(0.5);
  beam.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize());
  beam.material.opacity = 0.85;
  tween(0.22, k => { beam.material.opacity = 0.85 * (1 - k); }, x => x);
}
W.playTests = async function (states, opts) {
  opts = opts || {};
  cancelAll();
  crystals.forEach((c, i) => setCrystal(i, 'idle'));
  if (lock) lock.visible = true;
  setMood(pip, 'idle');
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
W.stop = cancelAll;

// ---------------------------------------------------------------- camera, input, loop
function placeCamera(dt) {
  const s = 1 - Math.exp(-dt * 7);
  if (mode === 'hub') {
    cam.az += (camT.az - cam.az) * s; cam.y += (camT.y - cam.y) * s; cam.dist += (camT.dist - cam.dist) * s;
    const el = 0.3, c = Math.cos(el) * cam.dist;
    camera.position.set(c * Math.cos(cam.az), cam.y + 0.8 + Math.sin(el) * cam.dist, c * Math.sin(cam.az));
    camera.lookAt(5.2 * Math.cos(cam.az), cam.y - 1.9, 5.2 * Math.sin(cam.az));
  } else {
    acam.az += (acamT.az - acam.az) * s; acam.el += (acamT.el - acam.el) * s; acam.dist += (acamT.dist - acam.dist) * s;
    const c = Math.cos(acam.el) * acam.dist;
    camera.position.set(atarget.x + c * Math.cos(acam.az), atarget.y + Math.sin(acam.el) * acam.dist, atarget.z + c * Math.sin(acam.az));
    camera.lookAt(atarget);
  }
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
    if (moved < 7 && mode === 'hub' && e.type === 'pointerup') {
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
};
let last = 0, lastTick = 0;
function frame(now, fromTimer) {
  if (fromTimer !== true) requestAnimationFrame(frame);
  const real = Math.min(0.6, (now - last) / 1000 || 0.016), dt = Math.min(0.05, real);
  last = now;
  lastTick = performance.now();
  time += dt;
  stepTweens(real);          // sequences keep real time even when the browser throttles frames
  stepParticles(dt);
  if (mode === 'hub') {
    idlePip(hubPip, 1, dt);
    selRing.rotation.z += dt * 0.6;
    selRing.material.opacity = 0.55 + 0.35 * Math.sin(time * 3.2);
    beacon.rotation.y += dt * 0.5;
    if (nextNode >= 0 && nodes[nextNode] && nodes[nextNode].state === 'open') {
      const n = nodes[nextNode];
      n.topMat.color.copy(n.col).multiplyScalar(calm ? 0.5 : 0.42 + 0.26 * Math.sin(time * 3.4));
    }
    for (const n of nodes) if (n.stars.visible) n.stars.rotation.y += dt * 1.2;
  } else {
    if (pip) idlePip(pip, 1, dt);
    if (board && board.shards) for (const k in board.shards) { const s = board.shards[k]; if (s.visible) { s.children[0].rotation.y += dt * 2; s.position.y = 0.5 + (calm ? 0 : Math.sin(time * 2.4 + s.position.x) * 0.06); } }
    if (board && board.exit) { board.exit.ring.scale.setScalar(1 + 0.08 * Math.sin(time * 4)); board.exit.shaft.material.opacity = 0.16 + 0.07 * Math.sin(time * 2.2); }
    for (const c of crystals) {
      c.gem.rotation.y += dt * c.spin * (c.state === 'pass' ? 2.4 : c.state === 'fail' ? 0.1 : 1);
      const ty = c.y + (c.state === 'pass' ? 0.3 : c.state === 'fail' ? -0.22 : 0);
      c.gem.position.y += (ty + (calm ? 0 : Math.sin(time * 2 + c.spin * 9) * 0.05) - c.gem.position.y) * Math.min(1, dt * 8);
      c.glow.position.copy(c.gem.position);
      if (c.gem.userData.ring) { c.gem.userData.ring.position.copy(c.gem.position); c.gem.userData.ring.rotation.x += dt * 1.5; c.gem.userData.ring.rotation.y += dt; }
    }
    if (lock && lock.visible) { lock.rotation.y += dt * 0.5; lock.rotation.x += dt * 0.23; }
  }
  placeCamera(dt);
  renderer.render(scene, camera);
}
W.mood = m => { if (mode === 'arena' && pip) setMood(pip, m); };
W.init = function (stageEl, canvasEl, data, callbacks) {
  stage = stageEl; canvas = canvasEl; levels = data.levels; zones = data.zones; cb = callbacks || {};
  try { renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }); }
  catch (e) { W.ok = false; return Promise.resolve(false); }
  renderer.setPixelRatio(Math.min(root.devicePixelRatio || 1, 2));
  scene = new T.Scene();
  scene.background = new T.Color(0x070b1a);
  scene.fog = new T.FogExp2(0x070b1a, 0.012);
  camera = new T.PerspectiveCamera(42, 1, 0.3, 900);
  scene.add(new T.HemisphereLight(0x9fb4ff, 0x0b0f24, 0.85));
  const sun = new T.DirectionalLight(0xffffff, 0.85);
  sun.position.set(14, 30, 20);
  scene.add(sun);
  glowTex = makeGlow();
  const sp = new Float32Array(1100 * 3);
  for (let i = 0; i < 1100; i++) {
    const a = Math.random() * TAU, u = Math.random() * 1.5 - 0.5, r = Math.sqrt(Math.max(0, 1 - u * u)), d = 260 + Math.random() * 180;
    sp[i * 3] = Math.cos(a) * r * d; sp[i * 3 + 1] = u * d + 40; sp[i * 3 + 2] = Math.sin(a) * r * d;
  }
  const sg = new T.BufferGeometry();
  sg.setAttribute('position', new T.BufferAttribute(sp, 3));
  const starsP = new T.Points(sg, new T.PointsMaterial({ color: 0xbfd0ff, size: 1.5, sizeAttenuation: false, transparent: true, opacity: 0.8, fog: false, depthWrite: false }));
  starsP.frustumCulled = false;
  scene.add(starsP);
  [[0x2b4fd6, -190, 60, -160, 330], [0x7a3fd0, 210, 120, -90, 300], [0x1fa89a, 40, -40, 260, 280]].forEach(n => { const s = glow(n[0], n[4], 0.16); s.position.set(n[1], n[2], n[3]); scene.add(s); });
  makeParticles();
  const fonts = document.fonts && document.fonts.load ? Promise.all([document.fonts.load("700 84px 'Chakra Petch'"), document.fonts.load("600 50px 'Chakra Petch'")]).catch(() => null) : Promise.resolve();
  return Promise.race([fonts, new Promise(r => setTimeout(r, 1500))]).then(() => {
    buildHub();
    bindInput();
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
