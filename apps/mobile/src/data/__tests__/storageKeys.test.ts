import { ALL_STORAGE_KEYS } from '../signOut';

/**
 * This file reads the source tree, which the app itself never does: `apps/mobile/tsconfig.json`
 * sets `types: ['jest']` deliberately, so React Native code cannot reach for a Node API that
 * will not exist on a phone. Rather than widen that for one test, the two bindings it needs are
 * declared here. `packages/design-tokens/test/legacy.test.mjs` scans the same tree the other
 * way — as a `node --test` file — but this check needs a TypeScript export, so it stays in jest.
 */
declare const __dirname: string;
declare function require(id: string): unknown;

const { readdirSync, readFileSync } = require('node:fs') as {
  readdirSync: (path: string) => string[];
  readFileSync: (path: string, encoding: 'utf8') => string;
};

const DATA_DIR = `${__dirname}/..`;

/** Every `'tslprb.*'` literal declared anywhere in `src/data`. */
function declaredKeys(): string[] {
  const found = new Set<string>();
  for (const file of readdirSync(DATA_DIR)) {
    if (!file.endsWith('.ts') || file.endsWith('.d.ts')) continue;
    const source = readFileSync(`${DATA_DIR}/${file}`, 'utf8');
    for (const match of source.matchAll(/'(tslprb\.[a-zA-Z0-9_.-]+)'/g)) found.add(match[1]);
  }
  return [...found].sort();
}

/**
 * The bug this guards against has already happened once: `signOut()` cleared two of the six
 * stores that held a person's data, and the four it missed — measurements, scores, streak,
 * read marks — were read by whoever picked the handset up next.
 *
 * Nothing in a review catches that. A new persisted store is a normal-looking feature commit,
 * and the omission only shows on someone else's phone. So the check is mechanical: every
 * storage key declared in `src/data` must appear in `ALL_STORAGE_KEYS`, the list the wipe
 * walks. A new store fails this test until its author has decided what a sign-out does to it.
 */
describe('storage keys', () => {
  it('names every persisted key in ALL_STORAGE_KEYS', () => {
    expect(declaredKeys()).toEqual([...ALL_STORAGE_KEYS].sort());
  });

  it('finds the keys at all — a silent zero would pass the check above vacuously', () => {
    expect(declaredKeys().length).toBeGreaterThanOrEqual(7);
  });
});
