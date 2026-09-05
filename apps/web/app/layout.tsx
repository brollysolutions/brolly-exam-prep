import type { ReactNode } from 'react';
import { colors } from '@tslprb/design-tokens';

export const metadata = {
  title: 'Brolly Solutions — TSLPRB PWT mock tests',
  description: 'Practise the Telangana police Preliminary Written Test in English and Telugu.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          background: colors.canvas,
          color: colors.ink,
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        {children}
      </body>
    </html>
  );
}
