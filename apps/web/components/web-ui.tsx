'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './ui/button';
import { useLangStore } from '@/data/lang';

export { Button };
export function useCopy() {
  const lang = useLangStore((s) => s.lang);
  return (en: string, te: string) => (lang === 'te' ? te : en);
}
export function PageTitle({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: string;
  children?: ReactNode;
}) {
  return (
    <header className="page-title">
      <div>
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      {children}
    </header>
  );
}
export function Notice({ children, error = false }: { children: ReactNode; error?: boolean }) {
  return (
    <p className={`notice${error ? ' notice-error' : ''}`} role={error ? 'alert' : 'status'}>
      {children}
    </p>
  );
}
export function BackLink({ href = '/', children }: { href?: string; children?: ReactNode }) {
  const { t } = useTranslation();
  return (
    <Link className="back-link" href={href}>
      ← {children ?? t('common.back')}
    </Link>
  );
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  const { t } = useTranslation();
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={id}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className="web-dialog"
    >
      <div className="dialog-heading">
        <h2 id={id}>{title}</h2>
        <Button variant="ghost" aria-label={t('common.close')} onClick={onClose}>
          ×
        </Button>
      </div>
      {children}
    </dialog>
  );
}
export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty-state">{children}</div>;
}
