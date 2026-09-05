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

/** `rgba(r,g,b,a)` → its four channels. The tints and scrims are written this way. */
export const rgba = (value) => {
  const m = /^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)$/.exec(value);
  assert.ok(m, `${value} is not an rgba() colour`);
  return { r: +m[1], g: +m[2], b: +m[3], a: +m[4] };
};

/**
 * Alpha-composite a translucent tint over an opaque background: the colour the eye meets
 * behind text on a tinted block. Text contrast is measured against THIS, not the tint.
 */
export const over = (tint, bgHex) => {
  const f = rgba(tint);
  const bg = [1, 3, 5].map((i) => parseInt(bgHex.slice(i, i + 2), 16));
  const mix = [f.r, f.g, f.b].map((v, i) => Math.round(f.a * v + (1 - f.a) * bg[i]));
  return `#${mix.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
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
  // The disabled primary (D8) and the muted chip (D2): ink3 is the floor, on every cream.
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

/**
 * Text on a tinted block: [text, tint, the surface under the tint, minimum]. The selected
 * card, the wrong-answer block, the correct-answer block and the eligible verdict.
 */
const TINTED_PAIRS = [
  ['ink', 'accentTint', 'surface', AAA],
  ['ink', 'accentTint', 'canvas', AAA],
  ['dangerInk', 'dangerTint', 'canvas', AA],
  ['dangerInk', 'dangerTint', 'surface', AA],
  ['okInk', 'okTint', 'canvas', AA],
  ['okInk', 'okTint', 'surface', AA],
];

for (const [fg, tint, bg, min] of TINTED_PAIRS) {
  test(`${fg} over ${tint} on ${bg} reads at ≥ ${min}:1`, () => {
    const r = ratio(c[fg], over(c[tint], c[bg]));
    assert.ok(r >= min, `${fg} over ${tint} on ${bg} is ${r.toFixed(2)}:1, needs ${min}`);
  });
}

test('gold text never sits on the gold tint: accentInk over accentTint is below AA', () => {
  // 4.14:1 on canvas (fix wave 1, C2). The tinted answer blocks and the selected state
  // tiles carry ink text instead — the gold edge and the tint already say "correct".
  assert.ok(ratio(c.accentInk, over(c.accentTint, c.canvas)) < AA);
  assert.ok(ratio(c.accentInk, over(c.accentTint, c.surface)) < AA);
});

test('gold text never sits on surface2: accentInk on surface2 is below AA', () => {
  // 4.25:1 (fix wave 1, I3). Kickers, counters and the active tab live on canvas or surface.
  assert.ok(ratio(c.accentInk, c.surface2) < AA);
});

/**
 * Non-text boundaries (WCAG 1.4.11): the rest border of every interactive outlined control —
 * secondary buttons, inactive chips, the segmented frame, idle keypad/OTP/phone boxes — and
 * every gold mark (rails, rings, edges) must clear 3:1 on the cream they sit on.
 */
const NON_TEXT_PAIRS = [
  ['outline', 'canvas'],
  ['outline', 'surface'],
  ['accentStrong', 'canvas'],
  ['accentStrong', 'surface'],
  ['dangerInk', 'canvas'],
  ['ink', 'canvas'],
];

for (const [fg, bg] of NON_TEXT_PAIRS) {
  test(`${fg} on ${bg} clears the 3:1 non-text floor`, () => {
    const r = ratio(c[fg], c[bg]);
    assert.ok(r >= NON_TEXT, `${fg} on ${bg} is ${r.toFixed(2)}:1, needs ${NON_TEXT}`);
  });
}

test('line and line2 are structure only: hairlines, dividers and grabbers, never a control edge', () => {
  // 1.15:1 and 1.5:1 on canvas — documented so nobody reaches for them as an outline.
  assert.ok(ratio(c.line, c.canvas) < NON_TEXT);
  assert.ok(ratio(c.line2, c.canvas) < NON_TEXT);
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
