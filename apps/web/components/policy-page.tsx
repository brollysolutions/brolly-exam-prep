import Link from 'next/link';
import type { ReactNode } from 'react';
import { privacyContact } from '@/lib/privacy';
import styles from './policy-page.module.css';

export function PolicyPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <div className={styles.page}>
      <a className="skip-link" href="#policy-content">
        Skip to content
      </a>
      <header className={styles.header}>
        <Link href="/" className={styles.brand}>
          Brolly Exam Prep
        </Link>
        <Link href="/">Back to website</Link>
      </header>
      <main id="policy-content" className={styles.content}>
        <p className={styles.eyebrow}>Brolly Solutions · App &amp; website</p>
        <h1>{title}</h1>
        <p className={styles.intro}>{intro}</p>
        <p className={styles.date}>Last updated: 12 September 2026</p>
        {children}
      </main>
      <footer className={styles.footer}>
        <span>Brolly Exam Prep · Brolly Solutions</span>
        <nav aria-label="Privacy and account support">
          <Link href="/privacy-policy">Privacy Policy</Link>
          <Link href="/account-deletion">Account Deletion</Link>
        </nav>
      </footer>
    </div>
  );
}

export function PrivacyContact({ deletion = false }: { deletion?: boolean }) {
  const subject = deletion
    ? 'Brolly Exam Prep — account and data deletion request'
    : 'Brolly Exam Prep — privacy enquiry';
  const body = deletion
    ? 'Please delete my Brolly Exam Prep account and associated data.\n\nRegistered phone number (with country code):\nPlatform (Android / website):\nAttempt or result links, if available:\n\nPlease confirm any ownership verification needed and when deletion is complete.'
    : '';
  return (
    <div>
      <p>
        <a
          href={`mailto:${privacyContact.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`}
        >
          {deletion ? 'Email a deletion request' : 'Contact privacy support'}
        </a>
      </p>
      <p>
        You can also email <a href={`mailto:${privacyContact.email}`}>{privacyContact.email}</a>{' '}
        directly.
        {deletion &&
          ' Use the subject “Brolly Exam Prep — account and data deletion request”. Opening the email link does not send a request; send the email from your mail app.'}
      </p>
    </div>
  );
}
