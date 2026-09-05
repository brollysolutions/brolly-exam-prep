import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

/**
 * The hi-vis-on-tar names live on as aliases in `tokens.json → legacyColors` so screens keep
 * compiling; the primitives must not use them. Phase A scans `apps/mobile/src/ui`; Phase E
 * widens the scan to all of `src` and deletes the aliases.
 */
const here = path.dirname(fileURLToPath(import.meta.url));
const tokens = JSON.parse(readFileSync(path.join(here, '..', 'tokens.json'), 'utf8'));
const SCAN_ROOT = path.join(here, '..', '..', '..', 'apps', 'mobile', 'src', 'ui');
const legacy = Object.keys(tokens.legacyColors).join('|');
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

test('src/ui uses semantic colour names only', () => {
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
