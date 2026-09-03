import { buildPaper, FREE_MOCK_SHORT } from '@tslprb/fixtures';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { useLangStore } from '@/data/lang';
import { PaperView } from '@/features/paper/PaperView';
import { Kicker, Stack, Text } from '@/ui';

/**
 * Developer-only gallery for the previous-paper screen. Labels are dev copy, deliberately
 * outside the locale files; the frame height is a dev-only viewport, because `PaperView` is
 * `flex-1` and needs a bounded box inside the gallery's own scroll view.
 */
const DEV = {
  title: 'Previous question paper',
  loaded: 'F-22 paper — answers marked, 4 section chips',
  loading: 'F-22 paper — loading skeleton',
  notFound: 'F-22 paper — unknown id',
} as const;

const FRAME_HEIGHT = 520;

/** A short pattern: the gallery wants three sections on screen, not a 200-question paper. */
const SECTIONS = FREE_MOCK_SHORT.sections;
const QUESTIONS = buildPaper(SECTIONS);
const TITLE = 'PWT 2022 — SCT PC';

function Frame({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Stack gap={2}>
      <Text variant="caption" color="dim">
        {label}
      </Text>
      <View
        className="overflow-hidden rounded-md border border-line"
        style={{ height: FRAME_HEIGHT }}
      >
        {children}
      </View>
    </Stack>
  );
}

export function PaperStates({ index }: { index: string }) {
  const lang = useLangStore((s) => s.lang);
  return (
    <Stack gap={3} className="mt-6">
      <Kicker index={index} color="dim" uppercase>
        {DEV.title}
      </Kicker>
      <Frame label={DEV.loaded}>
        <PaperView title={TITLE} questions={QUESTIONS} sections={SECTIONS} lang={lang} />
      </Frame>
      <Frame label={DEV.loading}>
        <PaperView title={TITLE} lang={lang} />
      </Frame>
      <Frame label={DEV.notFound}>
        <PaperView lang={lang} failed />
      </Frame>
    </Stack>
  );
}
