import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const dir = path.dirname(fileURLToPath(import.meta.url));
const load = (l) => JSON.parse(readFileSync(path.join(dir, '..', 'locales', `${l}.json`), 'utf8'));

function keys(obj, prefix = '') {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' && !Array.isArray(v) ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  );
}

const en = keys(load('en')).sort();
for (const lang of ['te', 'ur']) {
  test(`${lang}.json has exactly the same keys as en.json`, () => {
    const other = keys(load(lang)).sort();
    const missing = en.filter((k) => !other.includes(k));
    const extra = other.filter((k) => !en.includes(k));
    assert.deepEqual({ missing, extra }, { missing: [], extra: [] });
  });
}

test('interpolation placeholders match across languages', () => {
  const flat = (l) => Object.fromEntries(keys(load(l)).map((k) => [k, k.split('.').reduce((o, p) => o[p], load(l))]));
  const ph = (s) => (typeof s === 'string' ? [...s.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort() : []);
  const e = flat('en');
  for (const lang of ['te', 'ur']) {
    const o = flat(lang);
    for (const k of Object.keys(e)) assert.deepEqual(ph(o[k]), ph(e[k]), `${lang}:${k}`);
  }
});
