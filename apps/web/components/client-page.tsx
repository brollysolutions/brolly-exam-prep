'use client';

import dynamic from 'next/dynamic';

// Persisted exam stores are browser-only. This prevents shared server state and hydration
// mismatches while keeping routes, links, API handlers and deployment owned by Next.js.
const Website = dynamic(() => import('./website'), {
  ssr: false,
  loading: () => (
    <main className="web-loading" role="status">
      Loading / లోడ్ అవుతోంది…
    </main>
  ),
});
export default function ClientPage({ route, id }: { route: string; id?: string }) {
  return <Website route={route} id={id} />;
}
