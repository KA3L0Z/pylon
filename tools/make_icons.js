// Draws Pylon's icon (a teal hexagon ring with an amber core) as the PNG files an installable web app needs.
//   node tools/make_icons.js      -> icons/icon-192.png, icon-512.png, icon-maskable-512.png, icon-180.png
// No image library: each pixel is sampled from the shapes themselves, and the PNG is written with Node's own zlib.
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const OUT = path.join(__dirname, '..', 'icons');
const rgb = h => [(h >> 16) & 255, (h >> 8) & 255, h & 255];
const NIGHT = rgb(0x070b1a), RING = rgb(0x4fe3d0), CORE = rgb(0xffc247);
// The drawing lives on a 64 x 64 board: a hexagon with its points at the top and bottom, and a disc in the middle.
const HEX = [[32, 9], [52, 20.5], [52, 43.5], [32, 55], [12, 43.5], [12, 20.5]];
function toSegment(px, py, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1], t = Math.max(0, Math.min(1, ((px - a[0]) * dx + (py - a[1]) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - a[0] - t * dx, py - a[1] - t * dy);
}
// The colour at one point of the board, or null outside the rounded square. "bleed" fills the whole square (for icons
// the system cuts to its own shape) and "scale" shrinks the drawing towards the centre to keep it inside that cut.
function colourAt(x, y, bleed, scale) {
  if (!bleed) {
    const qx = Math.abs(x - 32) - 20, qy = Math.abs(y - 32) - 20;          // a square of half-width 32 with corners of radius 12
    if (Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) > 12) return null;
  }
  const u = 32 + (x - 32) / scale, v = 32 + (y - 32) / scale;
  if (Math.hypot(u - 32, v - 32) <= 7) return CORE;
  let d = Infinity;
  for (let i = 0; i < 6; i++) d = Math.min(d, toSegment(u, v, HEX[i], HEX[(i + 1) % 6]));
  return d <= 2.5 ? RING : NIGHT;                                              // a line 5 wide with round corners
}
function draw(size, bleed, scale) {
  const N = 4, px = Buffer.alloc(size * size * 4);                             // 16 samples a pixel smooth the edges
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
    let r = 0, g = 0, b = 0, hits = 0;
    for (let sj = 0; sj < N; sj++) for (let si = 0; si < N; si++) {
      const c = colourAt((i + (si + 0.5) / N) * 64 / size, (j + (sj + 0.5) / N) * 64 / size, bleed, scale);
      if (c) { r += c[0]; g += c[1]; b += c[2]; hits++; }
    }
    const o = (j * size + i) * 4;
    if (hits) { px[o] = Math.round(r / hits); px[o + 1] = Math.round(g / hits); px[o + 2] = Math.round(b / hits); px[o + 3] = Math.round(255 * hits / (N * N)); }
  }
  return png(size, size, px);
}
// ---- a PNG file: signature, header, the pixels deflated, end
const CRC = (() => { const t = new Int32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c; } return t; })();
function crc32(buf) { let c = -1; for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; }
function chunk(type, data) {
  const len = Buffer.alloc(4), body = Buffer.concat([Buffer.from(type, 'ascii'), data]), crc = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function png(w, h, rgba) {
  const head = Buffer.alloc(13), row = w * 4 + 1, raw = Buffer.alloc(row * h);
  head.writeUInt32BE(w, 0); head.writeUInt32BE(h, 4); head[8] = 8; head[9] = 6;          // 8 bits a channel, RGBA
  for (let y = 0; y < h; y++) rgba.copy(raw, y * row + 1, y * w * 4, (y + 1) * w * 4);    // each row starts with filter type 0
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', head), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

fs.mkdirSync(OUT, { recursive: true });
const files = [['icon-192.png', 192, false, 1], ['icon-512.png', 512, false, 1], ['icon-maskable-512.png', 512, true, 0.86], ['icon-180.png', 180, true, 0.94]];
for (const [name, size, bleed, scale] of files) {
  const data = draw(size, bleed, scale);
  fs.writeFileSync(path.join(OUT, name), data);
  console.log(name + '  ' + size + ' x ' + size + '  ' + data.length + ' bytes');
}
