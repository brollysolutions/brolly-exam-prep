#!/usr/bin/env node
// Stop hook: if any source file changed since the last run, run the mobile test suite.
// Exit 2 (blocking) when tests fail so the session fixes them before stopping.
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const input = JSON.parse(await readStdin());
if (input?.stop_hook_active) process.exit(0); // avoid loops

let changed = '';
try {
  changed = execSync('git status --porcelain -- apps packages', { cwd: root, stdio: 'pipe' }).toString();
} catch {
  process.exit(0);
}
if (!changed.trim()) process.exit(0);
if (!existsSync(path.join(root, 'apps/mobile/node_modules'))) process.exit(0);

try {
  execSync('pnpm --filter mobile test --silent', { cwd: root, stdio: 'pipe', timeout: 300_000 });
} catch (e) {
  const out = `${String(e.stdout ?? '')}${String(e.stderr ?? '')}`;
  const tail = out.split('\n').slice(-60).join('\n');
  process.stderr.write(`[stop-verify] Tests are failing. Fix before stopping:\n${tail}\n`);
  process.exit(2);
}

function readStdin() {
  return new Promise((res) => {
    let s = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (c) => (s += c));
    process.stdin.on('end', () => res(s || '{}'));
    setTimeout(() => res(s || '{}'), 500);
  });
}
