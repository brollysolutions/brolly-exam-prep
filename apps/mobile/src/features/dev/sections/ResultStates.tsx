import { buildPaper, FREE_MOCK_SHORT, SAMPLE_RESULT } from '@tslprb/fixtures';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import type { ResultDetail } from '@/data/api';
import { ResultView } from '@/features/result/ResultView';
import { SolutionsView } from '@/features/result/SolutionsView';
import { buildSolutionRows } from '@/features/result/solutions';
import { Kicker, Stack, Text } from '@/ui';

/**
 * Developer-only gallery for the result and solutions screens. Labels are dev copy,
 * deliberately outside the locale files, and the frame height is a dev-only viewport: both
 * screens are `flex-1` and need a bounded box inside the gallery's scroll view.
 */
const DEV = {
  title: 'Result & solutions',
  qualified: 'F-12 result — qualified',
  below: 'F-12 result — below cut-off',
  loading: 'F-12 result — loading skeleton',
  error: 'F-12 result — failed load',
  wrong: 'F-13 solutions — wrong filter',
  all: 'F-13 solutions — all filter',
} as const;

const FRAME_HEIGHT = 520;

const QUALIFIED: ResultDetail = {
  ...SAMPLE_RESULT,
  actions: SAMPLE_RESULT.actions.map((a) => ({
    id: a.id,
    title: { ...a.title },
    sub: { ...a.sub },
  })),
  review: SAMPLE_RESULT.review.map((r) => ({ ...r })),
};

const BELOW_CUTOFF: ResultDetail = {
  ...QUALIFIED,
  score: 31.5,
  qualified: false,
  rank: 7411,
  accuracyPct: 44,
  avgSecondsPerQuestion: 82,
};

const ROWS = buildSolutionRows(QUALIFIED.review, buildPaper(FREE_MOCK_SHORT.sections));

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

export function ResultStates({ index }: { index: string }) {
  return (
    <Stack gap={3} className="mt-6">
      <Kicker index={index} color="dim" uppercase>
        {DEV.title}
      </Kicker>
      <Frame label={DEV.qualified}>
        <ResultView result={QUALIFIED} />
      </Frame>
      <Frame label={DEV.below}>
        <ResultView result={BELOW_CUTOFF} />
      </Frame>
      <Frame label={DEV.loading}>
        <ResultView />
      </Frame>
      <Frame label={DEV.error}>
        <ResultView failed />
      </Frame>
      <Frame label={DEV.wrong}>
        <SolutionsView rows={ROWS} initialFilter="wrong" />
      </Frame>
      <Frame label={DEV.all}>
        <SolutionsView rows={ROWS} initialFilter="all" />
      </Frame>
    </Stack>
  );
}
