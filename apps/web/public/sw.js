/* Public application shells/assets only. API responses and browser storage are never cached. */
const CACHE = 'brolly-next-website-v1';
const offline =
  '<!doctype html><html lang="en"><meta name="viewport" content="width=device-width"><title>Offline</title><body><h1>You are offline / మీరు ఆఫ్‌లైన్‌లో ఉన్నారు</h1><p>Reconnect to open a page you have not visited. Previously saved progress can be resumed when browser storage is available.</p><p lang="te">మీరు సందర్శించని పేజీని తెరవడానికి మళ్లీ కనెక్ట్ అవ్వండి. బ్రౌజర్ నిల్వ అందుబాటులో ఉంటే గతంలో సేవ్ చేసిన పురోగతిని కొనసాగించవచ్చు.</p><a href="/tests">Tests / పరీక్షలు</a></body></html>';
const asset = (url) =>
  url.origin === self.location.origin &&
  /^(?:\/_next\/static\/|\/fonts\/|\/brand\/)/.test(url.pathname);
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});
// Browser caches are optional. A quota/private-mode failure must not break online requests.
const openCache = async () => {
  try {
    return await caches.open(CACHE);
  } catch {
    return undefined;
  }
};
const cached = async (cache, request, options) => {
  try {
    return await cache?.match(request, options);
  } catch {
    return undefined;
  }
};
const save = async (cache, request, response) => {
  try {
    await cache?.put(request, response);
  } catch {
    /* cache unavailable */
  }
};
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
self.addEventListener('message', (event) => {
  if (event.data?.type !== 'CACHE_PUBLIC_ASSETS' || !Array.isArray(event.data.urls)) return;
  event.waitUntil(
    (async () => {
      const cache = await openCache();
      if (!cache) return;
      await Promise.allSettled(
        event.data.urls.slice(0, 200).map(async (value) => {
          const url = new URL(value, self.location.origin);
          if (asset(url) && !(await cache.match(url))) await cache.add(url);
        }),
      );
      // Shells contain no account state: Next renders only a loading boundary here.
      const routes = [
        '/',
        '/tests',
        '/profile',
        '/study',
        '/tests/simocktest',
        '/test/simocktest/result',
        '/test/simocktest/solutions',
      ];
      const current = new URL(event.data.route || '/', self.location.origin);
      if (
        current.origin === self.location.origin &&
        !/^\/(?:api|_next)(?:\/|$)/.test(current.pathname)
      )
        routes.push(current.pathname);
      for (const route of routes) {
        try {
          const response = await fetch(route, { cache: 'no-store' });
          if (!response.ok) continue;
          const html = await response.clone().text();
          await cache.put(route, response);
          // Each Next route has its own entry script, even when the browser UI is shared.
          await Promise.allSettled(
            [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(async (match) => {
              const url = new URL(match[1].replace(/&amp;/g, '&'), self.location.origin);
              if (asset(url) && !(await cache.match(url))) await cache.add(url);
            }),
          );
        } catch {
          /* offline */
        }
      }
      const fonts = [
        'Inter_400Regular',
        'Inter_500Medium',
        'Inter_600SemiBold',
        'Inter_700Bold',
        'Inter_800ExtraBold',
        'PlayfairDisplay_400Regular',
        'NotoSansTelugu_400Regular',
        'NotoSansTelugu_700Bold',
        'NotoSerifTelugu_700Bold',
      ];
      await Promise.allSettled(
        fonts.map(async (name) => {
          const url = `/fonts/${name}.ttf`;
          if (!(await cache.match(url))) await cache.add(url);
        }),
      );
    })(),
  );
});
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (
    request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    /^\/api(?:\/|$)/.test(url.pathname) ||
    url.pathname === '/openapi.json'
  )
    return;
  if (asset(url)) {
    event.respondWith(
      (async () => {
        const cache = await openCache();
        const existing = await cached(cache, request);
        if (existing) return existing;
        const response = await fetch(request);
        if (response.ok) await save(cache, request, response.clone());
        return response;
      })(),
    );
  } else if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cache = await openCache();
        try {
          const response = await fetch(request);
          if (response.ok) await save(cache, request, response.clone());
          return response;
        } catch {
          return (
            (await cached(cache, request, { ignoreSearch: true, ignoreVary: true })) ??
            new Response(offline, {
              status: 503,
              headers: { 'Content-Type': 'text/html; charset=utf-8' },
            })
          );
        }
      })(),
    );
  }
});
