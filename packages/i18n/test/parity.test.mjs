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
for (const lang of ['te']) {
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
  for (const lang of ['te']) {
    const o = flat(lang);
    for (const k of Object.keys(e)) assert.deepEqual(ph(o[k]), ph(e[k]), `${lang}:${k}`);
  }
});

/**
 * Every key a JSON document declares, as `a.b.c` paths, INCLUDING any a duplicate would hide.
 *
 * `JSON.parse` cannot help here: it collapses two identical keys to the last one before a
 * reviver ever runs, so a duplicate is invisible to every other test in this file — parity
 * passes, the app reads the survivor, and the loser is a silent edit a later merge can
 * resurrect. This walks the raw text instead, tracking string and escape state so a brace
 * inside a translated sentence never opens a scope.
 */
function declaredKeys(raw) {
  const keys = [];
  // Each frame remembers the key it hangs off (`name`) and the key most recently read at
  // its own level (`pending`), which is what names the next child frame.
  const stack = [];
  const path = (key) => [...stack.map((f) => f.name).filter(Boolean), key].join('.');
  let i = 0;
  while (i < raw.length) {
    const ch = raw[i];
    if (ch === '"') {
      let j = i + 1;
      let text = '';
      while (j < raw.length && raw[j] !== '"') {
        // 92 is a backslash; comparing the code keeps this line free of escapes.
        if (raw.charCodeAt(j) === 92) {
          text += raw[j + 1];
          j += 2;
          continue;
        }
        text += raw[j];
        j += 1;
      }
      let k = j + 1;
      while (k < raw.length && /\s/.test(raw[k])) k += 1;
      const frame = stack[stack.length - 1];
      if (raw[k] === ':' && frame?.object) {
        keys.push(path(text));
        frame.pending = text;
      }
      i = j + 1;
      continue;
    }
    if (ch === '{' || ch === '[') {
      stack.push({ object: ch === '{', name: stack[stack.length - 1]?.pending });
    } else if (ch === '}' || ch === ']') {
      stack.pop();
    }
    i += 1;
  }
  return keys;
}

for (const lang of ['en', 'te']) {
  test(`${lang}.json declares every key exactly once`, () => {
    const raw = readFileSync(path.join(dir, '..', 'locales', `${lang}.json`), 'utf8');
    const counts = new Map();
    for (const k of declaredKeys(raw)) counts.set(k, (counts.get(k) ?? 0) + 1);
    const duplicates = [...counts].filter(([, n]) => n > 1).map(([k]) => k);
    assert.deepEqual(duplicates, [], `duplicate keys in ${lang}.json`);
  });
}
