#!/usr/bin/env node
// PostToolUse hook (Edit|Write): lint + typecheck the package that owns the edited file.
// Exit 2 with stderr so Claude sees and fixes the problem. Silent on success.
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

const input = JSON.parse(await readStdin());
const file = input?.tool_input?.file_path ?? input?.tool_input?.filePath;
if (!file) process.exit(0);

const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const rel = path.relative(root, file).replace(/\\/g, '/');
const isTs = /\.(ts|tsx|mjs|js|jsx)$/.test(rel);
if (!isTs || rel.startsWith('.claude/') || rel.includes('node_modules')) process.exit(0);

const pkgDir = findPackageDir(path.dirname(file), root);
if (!pkgDir) process.exit(0);

const errors = [];
try {
  execSync(`npx eslint --fix --no-warn-ignored "${file}"`, { cwd: pkgDir, stdio: 'pipe', timeout: 60_000 });
} catch (e) {
  errors.push(`eslint:\n${String(e.stdout ?? '')}${String(e.stderr ?? '')}`);
}
if (/\.(ts|tsx)$/.test(rel) && existsSync(path.join(pkgDir, 'tsconfig.json'))) {
  try {
    execSync('npx tsc --noEmit -p tsconfig.json', { cwd: pkgDir, stdio: 'pipe', timeout: 120_000 });
  } catch (e) {
    const out = `${String(e.stdout ?? '')}${String(e.stderr ?? '')}`;
    const lines = out.split('\n').filter((l) => /error TS/.test(l)).slice(0, 25);
    if (lines.length) errors.push(`tsc (${path.relative(root, pkgDir)}):\n${lines.join('\n')}`);
  }
}
if (errors.length) {
  process.stderr.write(`[post-edit] Problems after editing ${rel}:\n${errors.join('\n\n')}\n`);
  process.exit(2);
}

function findPackageDir(dir, stop) {
  let d = dir;
  while (d.startsWith(stop)) {
    if (existsSync(path.join(d, 'package.json')) && d !== stop) return d;
    const parent = path.dirname(d);
    if (parent === d) break;
    d = parent;
  }
  return null;
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
