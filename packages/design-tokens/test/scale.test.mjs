import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

/**
 * The type ramp and the tracking scale, pinned. A size is a design decision (design review,
 * F-28 fix wave 1: the body climbed to 15 for the cream theme); this test makes a change to
 * one deliberate rather than a side effect of editing a neighbour.
 */
const t = JSON.parse(readFileSync(new URL('../tokens.json', import.meta.url), 'utf8'));

test('the type ramp', () => {
  assert.deepEqual(t.text, {
    kicker: 10.5,
    caption: 12,
    small: 13,
    body: 15,
    bodyLg: 16,
    question: 17.5,
    subtitle: 19,
    title: 24,
    titleLg: 26,
    display: 30,
    wordmark: 17,
    wordmarkSub: 13,
    timer: 23,
    score: 58,
    statLabel: 9.5,
    cell: 14,
    prefix: 17,
    otp: 20,
    glyph: 20,
    field: 22,
    stat: 22,
    keypad: 24,
  });
});

test('the tracking scale (every entry has a consumer: brand is the wordmark\'s "Solutions")', () => {
  assert.deepEqual(t.tracking, {
    kicker: 1.2,
    kickerTight: 1,
    timer: 0.6,
    qBadge: 1.2,
    brand: 2,
    phone: 2,
    scoreTight: -1,
    display: -0.3,
  });
});

test('the display roles route to a serif in both languages', () => {
  assert.deepEqual(Object.keys(t.face).sort(), ['display', 'title', 'titleLg', 'wordmark', 'wordmarkSub']);
  assert.equal(t.font.en.display.family, 'PlayfairDisplay');
  // Playfair has no Telugu: Noto Serif Telugu carries the same roles (D7), on a line-height
  // between 1.45 and 1.5 so stacked vowel signs never collide.
  assert.equal(t.font.te.display.family, 'NotoSerifTelugu');
  assert.equal(t.font.te.display.regular, 'NotoSerifTelugu_700Bold');
  assert.ok(t.font.te.display.lineHeight >= 1.45 && t.font.te.display.lineHeight <= 1.5);
});
