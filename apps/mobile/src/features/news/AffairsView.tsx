import type { Affair } from '@tslprb/fixtures';
import type { Lang } from '@tslprb/i18n';
import { useTranslation } from 'react-i18next';
import { ScrollView } from 'react-native';

import { BackHeader, Card, EmptyState, MarkerRow, Num, Pill, Screen, Stack } from '@/ui';

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
 * One item: the headline, one sentence of why it matters, and what it is about.
 *
 * F-30 rules the category tone: a **quiet pill**, the same shape the notice board gives a
 * notice's kind, and no gold at all. It used to be a dark-gold kicker over its own 3 px start
 * edge, which put a second accented card on a screen made of nothing but cards; the day is the
 * heading here, the category is a tag, and the screen's gold is spent on neither.
 */
function AffairRow({ affair, lang, first }: { affair: Affair; lang: Lang; first: boolean }) {
  const { t } = useTranslation();
  return (
    <MarkerRow
      testID={`affair-card-${affair.id}`}
      titleTestID={`affair-headline-${affair.id}`}
      metaTestID={`affair-summary-${affair.id}`}
      first={first}
      title={affair.headline[lang]}
      meta={affair.summary[lang]}
      trailing={
        <Pill
          testID={`affair-cat-${affair.id}`}
          label={t(`affairs.cat.${affair.category}`)}
        />
      }
    />
  );
}

/**
 * F-24 — the daily current-affairs digest, grouped by the day it belongs to.
 *
 * A date is what a candidate revises by ("what did I miss on Tuesday"), so the day is the
 * heading and one card of rows sits under it — not a stack of bordered boxes.
 *
 * Pure, so the route, the tests and the dev gallery render the same component.
 */
export function AffairsView({ affairs, lang, onBack }: AffairsViewProps) {
  const { t } = useTranslation();
  const days = groupByDay(affairs);
  return (
    <Screen testID="affairs-screen">
      {/* A quiet tag on the digest, not a control, and never a second accent. It goes when
          `GET /affairs` replaces the seeded fixtures. */}
      <BackHeader
        title={t('affairs.title')}
        onBack={onBack}
        testID="affairs-header"
        trailing={<Pill label={t('common.sampleData')} testID="sample-data" />}
      />
      {days.length === 0 ? (
        <EmptyState message={t('affairs.empty')} testID="affairs-empty" />
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
              gap={2}
              className={i === 0 ? undefined : 'mt-7'}
              testID={`affairs-day-${day.date}`}
            >
              {/* The day heading is a date, so it goes through `Num` inside the pill: Latin
                  face, tabular, LTR-isolated, and the dates line up down the list. */}
              <Pill
                leading={
                  <Num
                    variant="caption"
                    weight="700"
                    color="ink3"
                    tracking="none"
                    testID={`affairs-date-${day.date}`}
                  >
                    {formatDay(day.date)}
                  </Num>
                }
              />
              <Card>
                {day.items.map((affair, j) => (
                  <AffairRow key={affair.id} affair={affair} lang={lang} first={j === 0} />
                ))}
              </Card>
            </Stack>
          ))}
        </ScrollView>
      )}
    </Screen>
  );
}
