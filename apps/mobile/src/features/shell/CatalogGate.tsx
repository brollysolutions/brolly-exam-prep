import { setCatalog, setContent } from '@tslprb/fixtures/src/runtime';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState } from 'react-native';
import { getApi } from '@/data/api';
import { retryPendingSubmissions } from '@/data/complete';
import { useNetwork } from '@/data/useNetwork';
import { LoadError, Screen, Text } from '@/ui';

export function CatalogGate({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { offline } = useNetwork();
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [retry, setRetry] = useState(0);
  const ready = useRef(false);
  useEffect(() => {
    if (ready.current) return;
    let live = true;
    void Promise.all([getApi().listTestMetas(), getApi().getContent()])
      .then(([tests, content]) => {
        if (live) {
          setCatalog(tests);
          setContent(content);
          ready.current = true;
          setState('ready');
        }
      })
      .catch(() => {
        if (live) setState('error');
      });
    return () => {
      live = false;
    };
  }, [retry, offline]);
  useEffect(() => {
    if (state !== 'ready' || offline) return;
    void retryPendingSubmissions();
    const listener = AppState.addEventListener('change', (next) => {
      if (next === 'active') void retryPendingSubmissions();
    });
    return () => listener.remove();
  }, [state, offline]);
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
        <Text accessibilityRole="text" accessibilityLiveRegion="polite">
          {t('common.loadingTests')}
        </Text>
      )}
    </Screen>
  );
}
