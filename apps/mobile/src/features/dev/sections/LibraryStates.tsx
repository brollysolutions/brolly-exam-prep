import type { ReactNode } from 'react';
import { View } from 'react-native';

import { useLangStore } from '@/data/lang';
import { LibraryView } from '@/features/library/LibraryView';
import { Kicker, Stack, Text } from '@/ui';

/** Developer-only gallery labels — not product copy, so deliberately outside the locale files. */
const DEV = {
  library: 'Test library (F-08 / F-22)',
  full: 'LibraryView — full mocks: a best score, a locked paper',
  previous: 'LibraryView — previous papers: practise or read',
  empty: 'LibraryView — a shelf with nothing on it',
} as const;

/** Dev frame: every screen is `flex-1`, so a preview inside a scroll needs a bounded height. */
const PREVIEW_H = 560;

function Preview({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Stack gap={2}>
      <Text variant="caption" color="ink3">
        {label}
      </Text>
      <View className="overflow-hidden rounded-md border border-line" style={{ height: PREVIEW_H }}>
        {children}
      </View>
    </Stack>
  );
}

const noop = () => {};

/**
 * F-08 / F-22 in the gallery. The two shelves are one screen with one piece of state, so the
 * only way to see them side by side is two copies opened on different kinds.
 */
export function LibraryStates({ index }: { index: string }) {
  const lang = useLangStore((s) => s.lang);

  return (
    <Stack gap={3} className="mt-6">
      <Kicker index={index} color="ink3" uppercase>
        {DEV.library}
      </Kicker>

      <Preview label={DEV.full}>
        <LibraryView lang={lang} initialKind="full" onOpen={noop} onViewPaper={noop} />
      </Preview>
      <Preview label={DEV.previous}>
        <LibraryView lang={lang} initialKind="previous" onOpen={noop} onViewPaper={noop} />
      </Preview>
      {/* No combination of the seeded bank is empty, so the state is reached with the prop the
          view takes for exactly this (design D15). */}
      <Preview label={DEV.empty}>
        <LibraryView lang={lang} tests={[]} onOpen={noop} onViewPaper={noop} />
      </Preview>
    </Stack>
  );
}
