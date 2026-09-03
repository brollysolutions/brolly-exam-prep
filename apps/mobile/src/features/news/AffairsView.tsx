import type { Affair } from '@tslprb/fixtures';
import { useDir, type Lang } from '@tslprb/i18n';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';

import { startEdge } from '@/features/result/edge';
import { BackHeader } from '@/features/result/Header';
import { Chip, Kicker, Num, Screen, Stack, Text } from '@/ui';

import { NewsEmpty } from './Empty';
import { formatDay } from './format';

export type AffairsViewProps = {
  /** Newest first — the order the days are printed in. */
  affairs: Affair[];
  /** Which language's face the headline and summary are drawn in. */
  lang: Lang;
  onBack: () => void;
};

export type AffairDay = { date: string; items: Affair[] };

/**
 * The list, cut into days in the order it arrives.
 *
 * Sorting is the caller's business (`latestAffairs`): a run of same-day items becomes one
 * group, and a day that somehow appears twice becomes two, which is the honest rendering of
 * an unsorted feed rather than a silent merge that hides it.
 */
export function groupByDay(affairs: Affair[]): AffairDay[] {
  const days: AffairDay[] = [];
  for (const affair of affairs) {
    const last = days[days.length - 1];
    if (last && last.date === affair.date) last.items.push(affair);
    else days.push({ date: affair.date, items: [affair] });
  }
  return days;
}

/**
 * One item: what it is about, what happened, and one sentence of why it matters.
 *
 * The 3 px sand start edge is the same one the row carries on Home: a block with a non-hi-vis
 * accent colour carries it on its reading-start edge, wherever the block is. Sand is the info
 * accent — the one the `Why` block on a paper carries.
 */
function AffairCard({ affair, lang }: { affair: Affair; lang: Lang }) {
  const { t } = useTranslation();
  const d = useDir();
  return (
    <View
      className="rounded-md border border-line bg-panel2 p-4"
      // The mirrored edge is a style, never a class: see `startEdge`.
      style={startEdge(d.isRTL, 'sand')}
      testID={`affair-card-${affair.id}`}
    >
      <Kicker color="sand" testID={`affair-cat-${affair.id}`}>
        {t(`affairs.cat.${affair.category}`)}
      </Kicker>
      <Text variant="body" weight="600" className="mt-2" testID={`affair-headline-${affair.id}`}>
        {affair.headline[lang]}
      </Text>
      <Text
        variant="caption"
        color="chalk2"
        className="mt-2"
        testID={`affair-summary-${affair.id}`}
      >
        {affair.summary[lang]}
      </Text>
    </View>
  );
}

/**
 * F-24 — the daily current-affairs digest, grouped by the day it belongs to.
 *
 * A date is what a candidate revises by ("what did I miss on Tuesday"), so the day is the
 * heading and the category is the card's own kicker, not the other way round.
 *
 * Pure, so the route, the tests and the dev gallery render the same component.
 */
export function AffairsView({ affairs, lang, onBack }: AffairsViewProps) {
  const { t } = useTranslation();
  const days = groupByDay(affairs);
  return (
    <Screen testID="affairs-screen">
      {/* A quiet tag on the digest, not a control, and never a second yellow. It goes when
          `GET /affairs` replaces the seeded fixtures. */}
      <BackHeader
        title={t('affairs.title')}
        onBack={onBack}
        testID="affairs-header"
        trailing={<Chip label={t('common.sampleData')} tone="label" testID="sample-data" />}
      />
      {days.length === 0 ? (
        <NewsEmpty message={t('affairs.empty')} testID="affairs-empty" />
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-4 pb-6 pt-4"
          showsVerticalScrollIndicator={false}
          testID="affairs-list"
        >
          {days.map((day, i) => (
            <Stack
              key={`${day.date}-${i}`}
              gap={3}
              className={i === 0 ? undefined : 'mt-6'}
              testID={`affairs-day-${day.date}`}
            >
              {/* The day heading is a date, so it goes through `Num`: Latin face, tabular,
                  LTR-isolated, at the kicker's own size and weight — in `chalk2`, a step above
                  the cards it introduces. */}
              <Num
                variant="kicker"
                weight="700"
                color="chalk2"
                tracking="none"
                testID={`affairs-date-${day.date}`}
              >
                {formatDay(day.date)}
              </Num>
              {day.items.map((affair) => (
                <AffairCard key={affair.id} affair={affair} lang={lang} />
              ))}
            </Stack>
          ))}
        </ScrollView>
      )}
    </Screen>
  );
}
