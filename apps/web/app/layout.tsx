import type { ReactNode } from 'react';
import { themeVariables } from '@/lib/theme';
import './globals.css';

export const metadata = {
  title: 'Brolly Solutions — TSLPRB PWT mock tests',
  description:
    'Practise Telangana police mock tests, review solutions and study in English and Telugu.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" style={themeVariables}>
      <body
        style={{
          margin: 0,
          background: 'var(--background)',
          color: 'var(--foreground)',
          fontFamily: 'var(--brand-font-sans)',
        }}
      >
        {children}
      </body>
    </html>
  );
}
