#!/usr/bin/env node
// SessionStart hook: print a short brief — open features, open PRs, next unchecked plan step.
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const read = (p) => (existsSync(path.join(root, p)) ? readFileSync(path.join(root, p), 'utf8') : '');

const feats = read('docs/FEATURES.md').split('\n').filter((l) => /^\| F-\d{2} \|/.test(l));
const open = feats.filter((l) => !/\| done \|/.test(l)).slice(0, 8);
const prs = read('docs/PR_TRACKING.md').split('\n').filter((l) => /^\| #\d+ \|/.test(l) && /\| - \|[^|]*\|$/.test(l));
const plan = read('docs/IMPLEMENTATION_PLAN.md').split('\n').find((l) => /^\s*- \[ \]/.test(l));

const lines = ['[TSLPRB brief]'];
lines.push(`Features not done (${feats.length - (feats.length - open.length) - 0}): ` + (open.length ? open.map((l) => l.split('|')[1].trim() + ' ' + l.split('|')[4].trim()).join(', ') : 'none'));
lines.push(`Open PRs: ${prs.length ? prs.map((l) => l.split('|')[1].trim()).join(', ') : 'none'}`);
if (plan) lines.push(`Next plan step: ${plan.trim()}`);
lines.push('Skill routing table lives in CLAUDE.md — follow it without being asked.');
process.stdout.write(lines.join('\n') + '\n');
