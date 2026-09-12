import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
const allowed =
  /^\/(?:health|openapi\.json|v1\/(?:content|auth\/phone|tests(?:\/[^/]+(?:\/(?:meta|paper))?)?|attempts(?:\/[^/]+(?:\/(?:answers|submit|paper|meta))?)?|results\/[^/]+(?:\/(?:detail|paper))?))$/;

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  if (path.some((segment) => segment === '.' || segment === '..' || /[\\/]/.test(segment)))
    return new Response('Not found', { status: 404 });
  const pathname = '/' + path.map(encodeURIComponent).join('/');
  if (!allowed.test(pathname)) return new Response('Not found', { status: 404 });
  const origin = (process.env.API_INTERNAL_URL ?? 'http://127.0.0.1:8200').replace(/\/$/, '');
  const headers = new Headers({ Accept: 'application/json' });
  for (const name of ['authorization', 'content-type']) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  try {
    const upstream = await fetch(`${origin}${pathname}${request.nextUrl.search}`, {
      method: request.method,
      headers,
      cache: 'no-store',
      redirect: 'manual',
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : await request.text(),
      signal: AbortSignal.timeout(30_000),
    });
    if (pathname === '/openapi.json' && upstream.ok) {
      const schema = await upstream.json();
      return Response.json(
        { ...schema, servers: [{ url: '/api' }] },
        {
          headers: { 'Cache-Control': 'no-store' },
        },
      );
    }
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        'Content-Type': upstream.headers.get('content-type') ?? 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    return Response.json(
      { detail: 'API unavailable' },
      { status: 502, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
export { proxy as GET, proxy as POST, proxy as PATCH };
