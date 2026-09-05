/**
 * Generates the Brolly brand rasters from the two source files in `assets/brand/`:
 *
 *   brolly-logo.png (552×452, black lockup on transparent)
 *     → assets/brand/umbrella.png      the umbrella glyph alone, cropped to its ink + 4 px,
 *                                      recoloured to brand ink, 3 px transparent bleed
 *     → assets/brand/splash-logo.png   the full lockup, alpha-trimmed, in brand ink, for the
 *                                      splash screen (app.json reads the file as is)
 *   brolly-mark.svg (navy tile, gold "B")
 *     → assets/images/icon.png                      1024, full-bleed navy, no alpha (stores mask the corners)
 *     → assets/images/android-icon-foreground.png   1024, the gold "B" inside the 66 % safe zone
 *     → assets/images/android-icon-monochrome.png   1024, the "B" in white for themed icons
 *     → assets/images/favicon.png                   48, the rounded tile
 *
 * The source is pure black; the rasters ship in `colors.ink` so the splash and the welcome
 * logo match the header's live text and never read as a harder black on the cream. The
 * umbrella crop is found, not hard-coded: the first band of rows with ink, scanning from the
 * top, is the glyph; the text starts after the first fully transparent row below it.
 * `Brand.tsx` exports the resulting aspect ratios — re-run this and update them if the source
 * logo changes (the script prints the sizes).
 *
 * Run: `node scripts/make-brand-assets.mjs` from `apps/mobile`. Uses `sharp`, pinned as a
 * devDependency of this package (0.35.4) so the rasters are reproducible.
 */
import { Buffer } from 'node:buffer';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const here = dirname(fileURLToPath(import.meta.url));
const brand = join(here, '../assets/brand');
const images = join(here, '../assets/images');
/** The colour source: the rasters ship in `colors.ink`, the icon tile in `navy`, the glyph in `accent`. */
const tokens = JSON.parse(readFileSync(join(here, '../../../packages/design-tokens/tokens.json'), 'utf8'));

const LOGO = join(brand, 'brolly-logo.png');
const MARK = join(brand, 'brolly-mark.svg');
/** Alpha above this counts as ink when scanning the logo for its bands. */
const INK = 40;
const MARGIN = 4;
/** Transparent pixels around the umbrella so a scaled, tinted edge never clips its anti-aliasing. */
const BLEED = 3;
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

const hex = (value) => [1, 3, 5].map((i) => parseInt(value.slice(i, i + 2), 16));
const [INK_R, INK_G, INK_B] = hex(tokens.colors.ink);

/**
 * Recolour a black-on-transparent raster to brand ink: every pixel's RGB becomes the ink and
 * the alpha channel — the shape and its anti-aliasing — is kept as it is.
 */
async function inked(pipeline) {
  const { data, info } = await pipeline.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += info.channels) {
    data[i] = INK_R;
    data[i + 1] = INK_G;
    data[i + 2] = INK_B;
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: info.channels } });
}

/** Rows with any ink, as [start, end] bands. */
async function inkBands(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const bands = [];
  let start = null;
  for (let y = 0; y < height; y += 1) {
    let ink = false;
    for (let x = 0; x < width && !ink; x += 1) ink = data[(y * width + x) * channels + 3] > INK;
    if (ink && start === null) start = y;
    if (!ink && start !== null) {
      bands.push([start, y - 1]);
      start = null;
    }
  }
  if (start !== null) bands.push([start, height - 1]);
  return { bands, width, height, data, channels };
}

async function umbrella() {
  const { bands, width, data, channels } = await inkBands(LOGO);
  const [y0, y1] = bands[0];
  const alpha = (x, y) => data[(y * width + x) * channels + 3];
  let x0 = width;
  let x1 = 0;
  for (let y = y0; y <= y1; y += 1)
    for (let x = 0; x < width; x += 1)
      if (alpha(x, y) > INK) {
        x0 = Math.min(x0, x);
        x1 = Math.max(x1, x);
      }
  // The margin below must stop short of the wordmark. The gap rows carry anti-aliasing from
  // both sides: the umbrella's tail stays inside its own columns, the ascenders' tops do not,
  // so the first gap row with a faint pixel outside [x0, x1] belongs to the wordmark.
  const next = bands[1]?.[0];
  let bottom = next === undefined ? y1 + MARGIN : Math.min(y1 + MARGIN, next - 1);
  for (let y = y1 + 1; y <= bottom; y += 1) {
    let foreign = false;
    for (let x = 0; x < width && !foreign; x += 1) foreign = alpha(x, y) > 0 && (x < x0 || x > x1);
    if (foreign) {
      bottom = y - 1;
      break;
    }
  }
  const top = Math.max(0, y0 - MARGIN);
  const box = {
    left: Math.max(0, x0 - MARGIN),
    top,
    width: x1 - x0 + 1 + 2 * MARGIN,
    height: bottom - top + 1,
  };
  const glyph = await inked(sharp(LOGO).extract(box));
  const info = await glyph
    .extend({ top: BLEED, bottom: BLEED, left: BLEED, right: BLEED, background: TRANSPARENT })
    .png()
    .toFile(join(brand, 'umbrella.png'));
  console.log('umbrella.png', `${info.width}×${info.height}`, `from (${box.left},${box.top}) + ${BLEED} px bleed`);
}

async function splashLogo() {
  const out = join(brand, 'splash-logo.png');
  const logo = await inked(sharp(LOGO).trim());
  const info = await logo.png().toFile(out);
  console.log('splash-logo.png', `${info.width}×${info.height}`);
}

/** The mark's "B" path, lifted from brolly-mark.svg, in the colour asked for. */
function glyphSvg(fill) {
  const svg = readFileSync(MARK, 'utf8');
  const d = /<path d="([^"]+)"/.exec(svg)?.[1];
  if (!d) throw new Error('brolly-mark.svg: no <path> found');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path d="${d}" fill="${fill}"/></svg>`;
}

function tileSvg({ rounded }) {
  const svg = readFileSync(MARK, 'utf8');
  return rounded ? svg : svg.replace(/rx="14"/, 'rx="0"');
}

async function icons() {
  const SIZE = 1024;
  // The store icon is opaque: the tile fills the square and the alpha channel is dropped.
  await sharp(Buffer.from(tileSvg({ rounded: false })))
    .resize(SIZE, SIZE)
    .flatten({ background: tokens.colors.navy })
    .png()
    .toFile(join(images, 'icon.png'));
  await sharp(Buffer.from(tileSvg({ rounded: true }))).resize(48, 48).png().toFile(join(images, 'favicon.png'));

  // Android adaptive layers: the glyph sits inside the central 66 % (the safe zone); the
  // launcher supplies the navy from `adaptiveIcon.backgroundColor`.
  const safe = Math.round(SIZE * 0.66);
  const pad = Math.round((SIZE - safe) / 2);
  const layer = async (fill, name) =>
    sharp(Buffer.from(glyphSvg(fill)))
      .resize(safe, safe)
      .extend({ top: pad, bottom: SIZE - safe - pad, left: pad, right: SIZE - safe - pad, background: TRANSPARENT })
      .png()
      .toFile(join(images, name));
  await layer(tokens.colors.accent, 'android-icon-foreground.png');
  await layer(tokens.colors.white, 'android-icon-monochrome.png');
  console.log('icon.png 1024, favicon.png 48, android-icon-{foreground,monochrome}.png 1024');
}

await umbrella();
await splashLogo();
await icons();
