'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { setCatalog, setContent } from '@tslprb/fixtures/src/runtime';
import { getApi } from '@/data/api';
import { retryPendingSubmissions } from '@/data/complete';
import { Button, Notice, useCopy } from './web-ui';

export function CatalogGate({ children }: { children: ReactNode }) {
  const copy = useCopy();
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [retry, setRetry] = useState(0);
  const ready = useRef(false);
  useEffect(() => {
    let live = true;
    const retryPending = () => {
      void retryPendingSubmissions();
      if (!ready.current) load();
    };
    window.addEventListener('online', retryPending);
    const load = () =>
      void Promise.all([getApi().listTestMetas(), getApi().getContent()])
        .then(([tests, content]) => {
          if (live && !ready.current) {
            setCatalog(tests);
            setContent(content);
            setState('ready');
            ready.current = true;
            retryPending();
          }
        })
        .catch(() => {
          if (live && !ready.current) setState('error');
        });
    load();
    return () => {
      live = false;
      window.removeEventListener('online', retryPending);
    };
  }, [retry]);
  if (state === 'ready') return children;
  return (
    <main className="web-loading">
      <Notice error={state === 'error'}>
        {state === 'error'
          ? copy(
              'Unable to load tests. Check your connection and retry.',
              'పరీక్షలు లోడ్ కాలేదు. కనెక్షన్ తనిఖీ చేసి మళ్లీ ప్రయత్నించండి.',
            )
          : copy('Loading tests…', 'పరీక్షలు లోడ్ అవుతున్నాయి…')}
      </Notice>
      {state === 'error' && (
        <Button
          onClick={() => {
            setState('loading');
            setRetry((n) => n + 1);
          }}
        >
          {copy('Retry', 'మళ్లీ ప్రయత్నించండి')}
        </Button>
      )}
    </main>
  );
}
