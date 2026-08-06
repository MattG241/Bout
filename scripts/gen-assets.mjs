// Generates Bout's app assets with no external image deps: a raw RGBA PNG encoder + a
// lightning-bolt polygon fill, on a true-black background with the accent green. On-brand:
// stark, flat, monochrome + one accent. Run: node scripts/gen-assets.mjs
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const BLACK = [0, 0, 0, 255];
const ACCENT = [0, 230, 118, 255];
const TRANSPARENT = [0, 0, 0, 0];

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}
function chunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([t, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function encodePNG(width, height, pixelFn) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  let o = 0;
  for (let y = 0; y < height; y++) {
    raw[o++] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = pixelFn(x, y, width, height);
      raw[o++] = r;
      raw[o++] = g;
      raw[o++] = b;
      raw[o++] = a;
    }
  }
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type RGBA
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

// Lightning bolt in normalised [0,1] space.
const BOLT = [
  [0.56, 0.06], [0.30, 0.54], [0.46, 0.54], [0.40, 0.94],
  [0.72, 0.40], [0.54, 0.40], [0.64, 0.06],
];
function pointInPoly(px, py, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Returns a pixel fn drawing a centred bolt scaled to `scale` of min dimension. */
function boltPixel(bg, scale = 0.5) {
  return (x, y, w, h) => {
    const size = Math.min(w, h) * scale;
    const ox = (w - size) / 2;
    const oy = (h - size) / 2;
    const nx = (x - ox) / size;
    const ny = (y - oy) / size;
    if (nx >= 0 && nx <= 1 && ny >= 0 && ny <= 1 && pointInPoly(nx, ny, BOLT)) return ACCENT;
    return bg;
  };
}

mkdirSync('assets', { recursive: true });

// App icon — black field, bolt centred.
writeFileSync('assets/icon.png', encodePNG(1024, 1024, boltPixel(BLACK, 0.46)));
// Android adaptive foreground — transparent field (bg colour set in app.json), bolt in safe zone.
writeFileSync('assets/adaptive-icon.png', encodePNG(1024, 1024, boltPixel(TRANSPARENT, 0.4)));
// Splash — black, smaller centred bolt.
writeFileSync('assets/splash.png', encodePNG(1284, 2778, boltPixel(BLACK, 0.18)));
// Web favicon.
writeFileSync('assets/favicon.png', encodePNG(196, 196, boltPixel(BLACK, 0.55)));
// Notification icon (Android, monochrome silhouette is fine here).
writeFileSync('assets/notification-icon.png', encodePNG(96, 96, boltPixel(TRANSPARENT, 0.7)));

console.log('Generated assets: icon, adaptive-icon, splash, favicon, notification-icon');
