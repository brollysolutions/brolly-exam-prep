#!/usr/bin/env node
/**
 * Headless screenshots of the Expo web build for design review (replaces the Chrome MCP loop
 * when the browser extension is not connected).
 *
 * Usage:
 *   pnpm --filter mobile export:web            # builds apps/mobile/dist
 *   node scripts/screenshots.mjs [--routes dev/states,login] [--langs en,te,ur] [--out docs/screenshots]
 *                               [--lang-labels en=EN,te=తె,ur=اُر]   # click the in-app switcher per language
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
// Routes may be given without a leading slash (`dev/states`) — Git Bash on Windows rewrites
// `/dev/...` arguments into Windows paths (MSYS path conversion); we add the slash back here.
const routes = (args.routes ?? 'dev/states').split(',').map((r) => (r.startsWith('/') ? r : `/${r}`));
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
  // Fall back to a global install (`npm i -g playwright`) so the workspace lockfile stays untouched.
  try {
    const { createRequire } = await import('node:module');
    const { execSync } = await import('node:child_process');
    const globalRoot = execSync('npm root -g').toString().trim();
    ({ chromium } = createRequire(path.join(globalRoot, 'x.js'))('playwright'));
  } catch (e) {
    console.error('Playwright missing. Run: pnpm add -Dw playwright && npx playwright install chromium (or npm i -g playwright)');
    console.error(String(e?.message ?? e));
    process.exit(1);
  }
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
    // Optional: switch language through the in-page switcher instead of storage
    // (native kv-store falls back to memory on web). --lang-labels en=EN,te=తె,ur=اُر
    const langLabels = Object.fromEntries((args['lang-labels'] ?? '').split(',').filter(Boolean).map((p) => p.split('=')));
    for (const route of routes) {
      // `?lang=` is honoured by the app's web-only override (apps/mobile/src/data/langOverride.ts).
      await page.goto(`http://localhost:${port}${route}?lang=${lang}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(600);
      if (langLabels[lang]) {
        const chip = page.getByText(langLabels[lang], { exact: true }).first();
        if (await chip.count()) {
          await chip.click();
          await page.waitForTimeout(400);
        }
      }
      const name = `${route.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'index'}.${lang}.png`;
      // RN-web renders a fixed-height internal ScrollView, so `fullPage` only sees one viewport.
      // Grow the viewport to the tallest scrollable element so the whole screen is captured.
      const tallest = await page.evaluate(() => {
        let max = document.documentElement.scrollHeight;
        for (const el of document.querySelectorAll('*')) {
          const s = getComputedStyle(el);
          if ((s.overflowY === 'auto' || s.overflowY === 'scroll') && el.scrollHeight > el.clientHeight) {
            max = Math.max(max, el.scrollHeight + (window.innerHeight - el.clientHeight));
          }
        }
        return Math.min(max, 20000);
      });
      if (tallest > height) {
        await page.setViewportSize({ width, height: tallest });
        await page.waitForTimeout(300);
      }
      await page.screenshot({ path: path.join(out, name), fullPage: true });
      await page.setViewportSize({ width, height });
      console.log(`saved ${path.join(out, name)}`);
    }
    await ctx.close();
  }
} finally {
  await browser.close();
  server.close();
}
