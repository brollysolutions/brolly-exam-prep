#!/usr/bin/env node
/**
 * Headless screenshots of the Expo web build for design review (replaces the Chrome MCP loop
 * when the browser extension is not connected).
 *
 * Usage:
 *   pnpm --filter mobile export:web            # builds apps/mobile/dist
 *   node scripts/screenshots.mjs [--routes /dev/states,/login] [--langs en,te,ur] [--out docs/screenshots]
 *
 * Requires: `pnpm add -Dw playwright && npx playwright install chromium` (one-time, ~150 MB).
 * Language is injected through the persisted zustand store key used by apps/mobile/src/data/lang.ts
 * (localStorage on web). Override with --storage-key if the store name changes.
 */
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const args = Object.fromEntries(
  process.argv.slice(2).map((a, i, arr) => (a.startsWith('--') ? [a.slice(2), arr[i + 1] ?? 'true'] : [])).filter((x) => x.length),
);
const routes = (args.routes ?? '/dev/states').split(',');
const langs = (args.langs ?? 'en,te,ur').split(',');
const out = args.out ?? 'docs/screenshots';
const storageKey = args['storage-key'] ?? 'tslprb.lang';
const dist = path.resolve('apps/mobile/dist');
const width = Number(args.width ?? 390);
const height = Number(args.height ?? 844);

if (!existsSync(dist)) {
  console.error(`No web export at ${dist}. Run: pnpm --filter mobile export:web`);
  process.exit(1);
}
let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  console.error('Playwright missing. Run: pnpm add -Dw playwright && npx playwright install chromium');
  process.exit(1);
}

const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  let file = path.join(dist, decodeURIComponent(url.pathname));
  if (!existsSync(file) || url.pathname === '/') file = path.join(dist, url.pathname.replace(/\/$/, '') + '.html');
  if (!existsSync(file)) file = path.join(dist, 'index.html');
  try {
    res.writeHead(200, { 'content-type': mime[path.extname(file)] ?? 'application/octet-stream' });
    res.end(await readFile(file));
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;

await mkdir(out, { recursive: true });
const browser = await chromium.launch();
try {
  for (const lang of langs) {
    const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
    await ctx.addInitScript(([k, l]) => localStorage.setItem(k, JSON.stringify({ state: { lang: l }, version: 0 })), [storageKey, lang]);
    const page = await ctx.newPage();
    for (const route of routes) {
      await page.goto(`http://localhost:${port}${route}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(600);
      const name = `${route.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'index'}.${lang}.png`;
      await page.screenshot({ path: path.join(out, name), fullPage: true });
      console.log(`saved ${path.join(out, name)}`);
    }
    await ctx.close();
  }
} finally {
  await browser.close();
  server.close();
}
