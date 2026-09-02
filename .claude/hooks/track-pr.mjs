#!/usr/bin/env node
// PostToolUse hook (Bash): when a `gh pr create` / `gh pr merge` command ran, upsert docs/PR_TRACKING.md
// and flip the matching F-xx rows in docs/FEATURES.md.
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const input = JSON.parse(await readStdin());
const cmd = String(input?.tool_input?.command ?? '');
const out = String(input?.tool_response?.stdout ?? input?.tool_response?.output ?? '');
const isCreate = /\bgh\s+pr\s+create\b/.test(cmd);
const isMerge = /\bgh\s+pr\s+merge\b/.test(cmd);
if (!isCreate && !isMerge) process.exit(0);

const urlMatch = out.match(/https:\/\/github\.com\/[^\s]+\/pull\/(\d+)/) || cmd.match(/\bpull\/(\d+)|\bmerge\s+(\d+)/);
const prNum = urlMatch ? (urlMatch[1] ?? urlMatch[2]) : null;
if (!prNum) process.exit(0);

let branch = '';
try { branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: root, stdio: 'pipe' }).toString().trim(); } catch {}
let title = '';
try { title = execSync(`gh pr view ${prNum} --json title,headRefName -q ".title + \\"|\\" + .headRefName"`, { cwd: root, stdio: 'pipe' }).toString().trim(); } catch {}
if (title.includes('|')) { const [t, b] = title.split('|'); title = t; branch = b || branch; }
const fids = [...new Set([...(title + ' ' + branch).matchAll(/F-\d{2}/g)].map((m) => m[0]))];
const today = new Date().toISOString().slice(0, 10);

const prFile = path.join(root, 'docs/PR_TRACKING.md');
let pr = readFileSync(prFile, 'utf8');
const rowRe = new RegExp(`^\\| #${prNum} \\|.*$`, 'm');
if (isCreate) {
  const row = `| #${prNum} | ${branch} | ${fids.join(', ') || '-'} | ${today} | pending | - | ${title} |`;
  pr = rowRe.test(pr) ? pr.replace(rowRe, row) : appendRow(pr, row);
} else if (rowRe.test(pr)) {
  pr = pr.replace(rowRe, (line) => {
    const cells = line.split('|');
    cells[6] = ` ${today} `;
    return cells.join('|');
  });
}
writeFileSync(prFile, pr);

const featFile = path.join(root, 'docs/FEATURES.md');
let feat = readFileSync(featFile, 'utf8');
for (const id of fids) {
  feat = feat.replace(new RegExp(`^(\\| ${id} \\|[^|]*\\|[^|]*\\|) [^|]* (\\|) [^|]* (\\|.*)$`, 'm'), (_, a, b, c) =>
    `${a} ${isMerge ? 'done' : 'review'} ${b} #${prNum} ${c}`,
  );
}
writeFileSync(featFile, feat);
process.stdout.write(`[track-pr] ${isMerge ? 'merged' : 'opened'} #${prNum} → ${fids.join(', ') || 'no F-ids'}\n`);

function appendRow(md, row) {
  const lines = md.split('\n');
  let last = -1;
  lines.forEach((l, i) => { if (l.startsWith('| #')) last = i; });
  if (last === -1) lines.forEach((l, i) => { if (/^\|\s*-+/.test(l)) last = i; });
  lines.splice(last + 1, 0, row);
  return lines.join('\n');
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
