import type { ReactNode } from 'react';
import { colors } from '@tslprb/design-tokens';

export const metadata = {
  title: 'TSLPRB PWT mock tests',
  description: 'Practise the Telangana police Preliminary Written Test in English, Telugu and Urdu.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: colors.ink, color: colors.chalk, fontFamily: 'Archivo, system-ui, sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
