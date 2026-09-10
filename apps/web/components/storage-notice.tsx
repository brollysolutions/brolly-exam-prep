'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { kvStorage } from '@/data/storage';
import { Button, useCopy } from './web-ui';

export const useStorageStatus = () =>
  useSyncExternalStore(kvStorage.subscribe, kvStorage.getStatus, () => 'persistent');

export function StorageNotice() {
  const status = useStorageStatus();
  const copy = useCopy();
  const [retried, setRetried] = useState(false);
  const notice = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = notice.current;
    const main = node?.closest<HTMLElement>('.main-content');
    if (!node || !main) return;
    const observer = new ResizeObserver(() => {
      main.style.setProperty(
        '--storage-notice-height',
        `${node.getBoundingClientRect().height + 16}px`,
      );
    });
    observer.observe(node);
    return () => {
      observer.disconnect();
      main.style.removeProperty('--storage-notice-height');
    };
  }, [status]);
  useEffect(() => {
    if (status !== 'temporary') return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [status]);
  if (status === 'persistent')
    return retried ? (
      <p role="status" className="notice">
        {copy(
          'Saving restored. Your pending changes are saved in this browser.',
          'సేవింగ్ పునరుద్ధరించబడింది. మీ మార్పులు ఈ బ్రౌజర్‌లో సేవ్ అయ్యాయి.',
        )}
      </p>
    ) : null;
  return (
    <div ref={notice} className="notice notice-error storage-notice" role="alert">
      <p>
        {copy(
          'Browser saving is unavailable. Keep this tab open: recent answers and changes may be lost if you reload or close it.',
          'బ్రౌజర్‌లో సేవ్ చేయడం సాధ్యం కావడం లేదు. ఈ ట్యాబ్ తెరిచి ఉంచండి: రీలోడ్ చేసినా లేదా మూసినా ఇటీవలి సమాధానాలు, మార్పులు పోవచ్చు.',
        )}
      </p>
      <Button
        variant="outline"
        onClick={() => {
          kvStorage.retry();
          setRetried(true);
        }}
      >
        {copy('Retry saving', 'సేవ్ చేయడానికి మళ్లీ ప్రయత్నించండి')}
      </Button>
      {retried && (
        <p role="status">
          {copy(
            'Still unable to save. Allow browser storage or free some space, then retry without reloading.',
            'ఇంకా సేవ్ కావడం లేదు. బ్రౌజర్ నిల్వను అనుమతించండి లేదా కొంత ఖాళీ చేసి, రీలోడ్ చేయకుండా మళ్లీ ప్రయత్నించండి.',
          )}
        </p>
      )}
    </div>
  );
}
