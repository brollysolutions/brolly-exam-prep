import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

/**
 * The hi-vis-on-tar colour names are gone.
 *
 * Phase A of the Brolly rebrand aliased them in `tokens.json → legacyColors` so the 69 screen
 * files kept compiling, and scanned `apps/mobile/src/ui` alone. Phase E (F-32) deleted the
 * alias block and widened the scan to all of `apps/mobile/src`, so this list lives here rather
 * than being derived from the tokens: it is the record of what those names were and the guard
 * that none of them comes back — a colour that is not in `tokens.json → colors` no longer
 * resolves to anything, and a `bg-tar` would fail silently as an unstyled element rather than
 * loudly as a type error.
 *
 * Their replacements, each resolving to the identical hex:
 *   tar → canvas · panel/panel2 → surface · panel3/panel4 → surface2 · line3 → line2 ·
 *   chalk → ink · chalk2 → ink2 · dim/steel → ink3 · mute/ghost → ink4 ·
 *   hivis/hazard/sand → accent (fill) | accentStrong (mark, edge) | accentInk (text) ·
 *   flag → danger (fill) | dangerInk (text, outline) · success → okInk ·
 *   hivisTint* → accentTint · flagTint → dangerTint ·
 *   offlineBg → surface2 · offlineLine → line · offlineText → ink2
 */
const RETIRED = [
  'tar',
  'panel',
  'panel2',
  'panel3',
  'panel4',
  'line3',
  'chalk',
  'chalk2',
  'dim',
  'steel',
  'mute',
  'ghost',
  'hivis',
  'hivisHover',
  'hazard',
  'flag',
  'sand',
  'success',
  'hivisTint',
  'hivisTint2',
  'hivisTint3',
  'flagTint',
  'offlineBg',
  'offlineLine',
  'offlineText',
];

const here = path.dirname(fileURLToPath(import.meta.url));
const tokens = JSON.parse(readFileSync(path.join(here, '..', 'tokens.json'), 'utf8'));
const SCAN_ROOT = path.join(here, '..', '..', '..', 'apps', 'mobile', 'src');
const legacy = RETIRED.join('|');
const PATTERNS = [
  // Tailwind colour utilities: bg-tar, text-dim, border-t-hivis …
  new RegExp(`\\b(?:bg|text|border(?:-[trblxy])?|from|to|via)-(?:${legacy})\\b`),
  // Token object access: colors.hivis
  new RegExp(`\\bcolors\\.(?:${legacy})\\b`),
  // Colour props: color="dim", indexColor="hazard", fg: 'steel'
  new RegExp(`\\b(?:color|indexColor|fg|bg|border)\\s*[:=]\\s*["'](?:${legacy})["']`),
];

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return walk(full);
    return /\.(ts|tsx)$/.test(name) ? [full] : [];
  });
}

test('apps/mobile/src uses semantic colour names only', () => {
  const offenders = [];
  for (const file of walk(SCAN_ROOT)) {
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, i) => {
      if (PATTERNS.some((p) => p.test(line)))
        offenders.push(`${path.relative(SCAN_ROOT, file)}:${i + 1}: ${line.trim()}`);
    });
  }
  assert.deepEqual(offenders, []);
});

test('no retired name is a colour token any more', () => {
  const live = Object.keys(tokens).filter((k) => k === 'colors' || k === 'legacyColors');
  assert.deepEqual(live, ['colors'], 'the legacyColors alias block must stay deleted');
  const back = RETIRED.filter((name) => name in tokens.colors);
  assert.deepEqual(back, []);
});
