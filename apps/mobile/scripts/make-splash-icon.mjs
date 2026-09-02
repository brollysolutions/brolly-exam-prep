/**
 * Draws `assets/images/splash-icon.png`: the hi-vis PWT plate over a hazard bar, the same
 * brand block the welcome screen opens with.
 *
 * Written with `node:zlib` alone — no image library, because this phase adds no dependencies.
 * The three letters come from a hand-set 5x7 bitmap; at 8x that is a crisp, sharp-cornered
 * plate rather than an approximation of Archivo.
 *
 * Run: `node scripts/make-splash-icon.mjs` from `apps/mobile`.
 */
import { Buffer } from 'node:buffer';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const here = dirname(fileURLToPath(import.meta.url));
const tokens = JSON.parse(
  readFileSync(join(here, '../../../packages/design-tokens/tokens.json'), 'utf8'),
);

const rgb = (hex) => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

const HIVIS = rgb(tokens.colors.hivis);
const HAZARD = rgb(tokens.colors.hazard);
const TAR = rgb(tokens.colors.tar);

/** Logical geometry, in the same units the welcome screen's brand block uses. */
const SCALE = 4;
const PLATE_W = 84 * SCALE;
const PLATE_H = 34 * SCALE;
const GAP_H = 6 * SCALE;
const BAR_H = 4 * SCALE;
const W = PLATE_W;
const H = PLATE_H + GAP_H + BAR_H;

/** 5x7 bitmaps; '#' is ink. */
const GLYPHS = {
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  W: ['#...#', '#...#', '#...#', '#...#', '#.#.#', '##.##', '#...#'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
};
const WORD = 'PWT';
const UNIT = 8;
const GLYPH_W = 5;
const GLYPH_H = 7;
const TRACK = 1;

// RGBA canvas, transparent by default so the splash background colour shows through.
const px = new Uint8Array(W * H * 4);
const set = (x, y, [r, g, b]) => {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 4;
  px[i] = r;
  px[i + 1] = g;
  px[i + 2] = b;
  px[i + 3] = 255;
};
const rect = (x0, y0, w, h, color) => {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) set(x, y, color);
};

rect(0, 0, PLATE_W, PLATE_H, HIVIS);
rect(0, PLATE_H + GAP_H, W, BAR_H, HAZARD);

const wordW = (WORD.length * GLYPH_W + (WORD.length - 1) * TRACK) * UNIT;
const wordH = GLYPH_H * UNIT;
let penX = Math.round((PLATE_W - wordW) / 2);
const penY = Math.round((PLATE_H - wordH) / 2);
for (const ch of WORD) {
  const rows = GLYPHS[ch];
  rows.forEach((row, ry) => {
    [...row].forEach((cell, rx) => {
      if (cell === '#') rect(penX + rx * UNIT, penY + ry * UNIT, UNIT, UNIT, TAR);
    });
  });
  penX += (GLYPH_W + TRACK) * UNIT;
}

/* ---- minimal PNG writer (8-bit RGBA, filter 0) ---- */
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // colour type: RGBA
const raw = Buffer.alloc(H * (1 + W * 4));
for (let y = 0; y < H; y++) {
  raw[y * (1 + W * 4)] = 0; // filter: none
  Buffer.from(px.buffer, y * W * 4, W * 4).copy(raw, y * (1 + W * 4) + 1);
}
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);

const out = join(here, '../assets/images/splash-icon.png');
writeFileSync(out, png);
console.log(`wrote ${out} (${W}x${H}, ${png.length} bytes)`);
