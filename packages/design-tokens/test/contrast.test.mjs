import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

/**
 * WCAG 2 contrast for the Brolly palette (docs/specs/2026-09-05-brolly-rebrand-design.md,
 * "Contrast rules"). Every pair a primitive relies on is pinned here, so a token edit that
 * drops text below AA fails before a screenshot ever shows it.
 */
const t = JSON.parse(readFileSync(new URL('../tokens.json', import.meta.url), 'utf8'));
const c = t.colors;

const channel = (v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const luminance = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => channel(parseInt(hex.slice(i, i + 2), 16) / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const ratio = (fg, bg) => {
  const [hi, lo] = [luminance(fg), luminance(bg)].sort((a, b) => b - a);
  return (hi + 0.05) / (lo + 0.05);
};

const AA = 4.5;
const AAA = 7;
const NON_TEXT = 3;

/** [foreground, background, minimum] — the pairs the primitives are built on. */
const TEXT_PAIRS = [
  ['ink', 'canvas', AAA],
  ['ink', 'surface', AAA],
  ['ink', 'surface2', AAA],
  ['ink2', 'canvas', AAA],
  ['ink2', 'surface2', AAA],
  ['ink3', 'canvas', AA],
  ['ink3', 'surface', AA],
  ['ink3', 'surface2', AA],
  ['onInk', 'ink', AAA],
  ['accentInk', 'canvas', AA],
  ['accentInk', 'surface', AA],
  ['dangerInk', 'canvas', AA],
  ['dangerInk', 'surface2', AA],
  ['okInk', 'canvas', AA],
  ['onInk', 'dangerInk', AA],
  ['ink', 'accent', AA],
  ['ink', 'accentSoft', AA],
  ['ink', 'danger', AA],
  ['ink', 'ok', AA],
  ['white', 'navy', AAA],
];

for (const [fg, bg, min] of TEXT_PAIRS) {
  test(`${fg} on ${bg} reads at ≥ ${min}:1`, () => {
    const r = ratio(c[fg], c[bg]);
    assert.ok(r >= min, `${fg} on ${bg} is ${r.toFixed(2)}:1, needs ${min}`);
  });
}

test('gold marks (accentStrong) clear the 3:1 non-text floor on cream', () => {
  assert.ok(ratio(c.accentStrong, c.canvas) >= NON_TEXT);
  assert.ok(ratio(c.accentStrong, c.surface) >= NON_TEXT);
});

test('brand gold (accent) is a fill, never text on cream', () => {
  // Documented: 2.3:1. Anyone tempted to write `text-accent` finds the number here.
  assert.ok(ratio(c.accent, c.canvas) < NON_TEXT);
});

test('ink4 is decorative only', () => {
  assert.ok(ratio(c.ink4, c.canvas) < AA);
});

test('every legacy alias that carries text still reads on cream', () => {
  const l = t.legacyColors;
  for (const name of ['chalk', 'chalk2', 'dim', 'steel', 'hivis', 'hazard', 'sand', 'flag', 'success']) {
    assert.ok(ratio(l[name], c.canvas) >= AA, `${name} on canvas`);
  }
  // `text-tar` on a legacy `bg-hivis` fill (the old primary button) stays AA.
  assert.ok(ratio(l.tar, l.hivis) >= AA);
});

test('every colour, semantic or legacy, is a palette value', () => {
  const values = new Set(Object.values(t.palette).map((v) => v.toLowerCase()));
  for (const [name, value] of Object.entries({ ...c, ...t.legacyColors })) {
    assert.ok(values.has(value.toLowerCase()), `${name} = ${value} is not in the palette`);
  }
});
