import { buildPaper, FREE_MOCK_SHORT, SAMPLE_RESULT } from '@tslprb/fixtures';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import type { ResultDetail, ReviewPaperQuestion } from '@/data/api';
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
  allCorrect: 'F-13 solutions — nothing wrong (P6)',
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

const DEV_PAPER = buildPaper(FREE_MOCK_SHORT.sections);
const DEV_REVIEW_PAPER: ReviewPaperQuestion[] = QUALIFIED.review.map((review) => {
  const question = DEV_PAPER[review.questionNo - 1];
  return {
    ...question,
    yourChoice: review.your,
    marked: false,
    seconds: review.seconds,
  };
});
const ROWS = buildSolutionRows(DEV_REVIEW_PAPER);
/** Every answer right: the wrong filter has nothing to show and the P6 empty state takes over. */
const ALL_RIGHT = ROWS.filter((r) => r.isCorrect);

function Frame({
  label,
  testID,
  children,
}: {
  label: string;
  testID: string;
  children: ReactNode;
}) {
  return (
    <Stack gap={2}>
      <Text variant="caption" color="ink3">
        {label}
      </Text>
      <View
        testID={testID}
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
      <Kicker index={index} color="ink3" uppercase>
        {DEV.title}
      </Kicker>
      <Frame label={DEV.qualified} testID="frame-result-qualified">
        <ResultView result={QUALIFIED} />
      </Frame>
      <Frame label={DEV.below} testID="frame-result-below">
        <ResultView result={BELOW_CUTOFF} />
      </Frame>
      <Frame label={DEV.loading} testID="frame-result-loading">
        <ResultView />
      </Frame>
      <Frame label={DEV.error} testID="frame-result-error">
        <ResultView failed />
      </Frame>
      <Frame label={DEV.wrong} testID="frame-solutions-wrong">
        <SolutionsView rows={ROWS} initialFilter="wrong" />
      </Frame>
      <Frame label={DEV.all} testID="frame-solutions-all">
        <SolutionsView rows={ROWS} initialFilter="all" />
      </Frame>
      <Frame label={DEV.allCorrect} testID="frame-solutions-allcorrect">
        <SolutionsView rows={ALL_RIGHT} initialFilter="wrong" />
      </Frame>
    </Stack>
  );
}
