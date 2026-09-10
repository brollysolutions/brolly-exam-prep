import { setCatalog, setContent } from '@tslprb/fixtures/src/runtime';
import { useEffect, useState, type ReactNode } from 'react';
import { getApi } from '@/data/api';
import { retryPendingSubmissions } from '@/data/complete';
import { useNetwork } from '@/data/useNetwork';
import { LoadError, Screen, Text } from '@/ui';

export function CatalogGate({ children }: { children: ReactNode }) {
  const { offline } = useNetwork();
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let live = true;
    void Promise.all([getApi().listTestMetas(), getApi().getContent()])
      .then(([tests, content]) => {
        if (live) {
          setCatalog(tests);
          setContent(content);
          setState('ready');
          void retryPendingSubmissions();
        }
      })
      .catch(() => {
        if (live) setState('error');
      });
    return () => {
      live = false;
    };
  }, [retry, offline]);
  if (state === 'ready') return children;
  return (
    <Screen>
      {state === 'error' ? (
        <LoadError
          onRetry={() => {
            setState('loading');
            setRetry((n) => n + 1);
          }}
        />
      ) : (
        <Text>Loading tests / పరీక్షలు లోడ్ అవుతున్నాయి…</Text>
      )}
    </Screen>
  );
}
