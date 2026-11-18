'use strict';
/* Draws the EVSmith logo (six coloured wedges) into src/icons/*.png with a tiny built-in rasterizer: no dependencies.
   Usage: node tools/make-icons.js */
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const OUT = path.join(__dirname, '..', 'src', 'icons');
const COLORS = ['#3fae5c', '#e0523f', '#3b82e0', '#9163e0', '#d9609a', '#d9a400'];
const TRI = [[50, 6, 88.1, 28], [88.1, 28, 88.1, 72], [88.1, 72, 50, 94], [50, 94, 11.9, 72], [11.9, 72, 11.9, 28], [11.9, 28, 50, 6]];
const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
function crc32(buf) { let c, crc = ~0; for (let n = 0; n < buf.length; n++) { c = (crc ^ buf[n]) & 255; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; crc = (crc >>> 8) ^ c; } return ~crc >>> 0; }
function chunk(type, data) { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]), crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, crc]); }
function png(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
const inTri = (px, py, t) => { const [ax, ay, bx, by] = t, cx = 50, cy = 50, d = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax), l1 = ((bx - px) * (cy - py) - (by - py) * (cx - px)) / d, l2 = ((px - ax) * (cy - ay) - (py - ay) * (cx - ax)) / d; return l1 >= 0 && l2 >= 0 && l1 + l2 <= 1; };
/* kind: 'any' = rounded dark square with the logo at 74%; 'maskable' = full-bleed background, logo inside the 60% safe zone */
function render(size, kind) {
  const buf = Buffer.alloc(size * size * 4), SS = 3, scale = (kind === 'maskable' ? .60 : .74) * size / 100, off = size / 2 - 50 * scale, bg = hex('#0d2a2d'), r = size * .22;
  const cent = TRI.map(t => [(t[0] + t[2] + 50) / 3, (t[1] + t[3] + 50) / 3]);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let R = 0, G = 0, B = 0, A = 0;
    for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
      const X = x + (sx + .5) / SS, Y = y + (sy + .5) / SS;
      let inside = true;
      if (kind === 'any') { const dx = Math.max(r - X, 0, X - (size - r)), dy = Math.max(r - Y, 0, Y - (size - r)); inside = dx * dx + dy * dy <= r * r; }
      if (!inside) continue;
      let c = bg;
      const lx = (X - off) / scale, ly = (Y - off) / scale;
      for (let i = 0; i < 6; i++) { const [cx, cy] = cent[i], px = cx + (lx - cx) / .965, py = cy + (ly - cy) / .965; if (inTri(px, py, TRI[i])) { c = hex(COLORS[i]); break; } }
      R += c[0]; G += c[1]; B += c[2]; A += 255;
    }
    const n = SS * SS, o = (y * size + x) * 4, a = A / n;
    buf[o] = A ? R * 255 / A | 0 : 0; buf[o + 1] = A ? G * 255 / A | 0 : 0; buf[o + 2] = A ? B * 255 / A | 0 : 0; buf[o + 3] = Math.round(a);
  }
  return png(size, size, buf);
}
fs.mkdirSync(OUT, { recursive: true });
[['icon-192.png', 192, 'any'], ['icon-512.png', 512, 'any'], ['icon-maskable-512.png', 512, 'maskable']].forEach(([f, s, k]) => { fs.writeFileSync(path.join(OUT, f), render(s, k)); console.log('wrote', f); });
