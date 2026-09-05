import { useDir } from '@tslprb/i18n';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, useWindowDimensions, View } from 'react-native';

import {
  ActionBar,
  Brand,
  Button,
  cx,
  Num,
  Pill,
  Row,
  Screen,
  Stack,
  Text,
  useReducedMotionSafe,
} from '@/ui';

/** The three things a candidate needs to believe before signing up. */
const SLIDES = [1, 2, 3] as const;
type SlideNo = (typeof SLIDES)[number];

export type WelcomeViewProps = {
  /** Slide the screen opens on (1-based) — the dev gallery uses it; the app always starts at 1. */
  initialSlide?: SlideNo;
  /** Skip and Get started both land here: the intro is never a gate. */
  onDone: () => void;
};

/**
 * F-02 — splash to intro. Three claims, one per page, then sign-in.
 *
 * Under RTL (dormant) the pages are laid out physically right-to-left, so "next" is a swipe to the *right*
 * and slide 1 sits on the right edge. The data array is reversed rather than the scroll
 * transformed, because a mirrored scroll view breaks momentum paging on Android.
 */
export function WelcomeView({ initialSlide = 1, onDone }: WelcomeViewProps) {
  const { t } = useTranslation();
  const d = useDir();
  const reduced = useReducedMotionSafe();
  const { width } = useWindowDimensions();
  const list = useRef<FlatList<SlideNo>>(null);

  // Physical page order; index 0 is the left-most page on screen in both directions.
  const [pages] = useState<SlideNo[]>(() => (d.isRTL ? [...SLIDES].reverse() : [...SLIDES]));
  const toPhysical = (slide: SlideNo) => pages.indexOf(slide);
  const [page, setPage] = useState(() => Math.max(0, pages.indexOf(initialSlide)));

  const slide = pages[page] ?? 1;
  const last = slide === SLIDES.length;
  // Digits are always Latin-faced; their tracking still follows the UI language.
  const tracking = d.lang === 'en' ? 'kicker' : 'none';

  const goTo = (nextPage: number) => {
    if (nextPage < 0 || nextPage >= pages.length) return;
    setPage(nextPage);
    list.current?.scrollToIndex({ index: nextPage, animated: !reduced });
  };

  return (
    <Screen testID="welcome-screen">
      {/* The full Brolly lockup: this is the one screen with room for it. */}
      <View className="items-center pb-6 pt-8">
        <Brand variant="splash" testID="welcome-brand" />
      </View>

      <FlatList
        ref={list}
        testID="welcome-pager"
        className="flex-1"
        data={pages}
        keyExtractor={(n) => String(n)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={toPhysical(initialSlide)}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
        // Without `flexGrow` the row of pages collapses to its tallest child, and a slide
        // that is `flex: 1` inside it has nothing to fill.
        contentContainerStyle={{ flexGrow: 1 }}
        onMomentumScrollEnd={(e) =>
          setPage(Math.round(e.nativeEvent.contentOffset.x / Math.max(width, 1)))
        }
        renderItem={({ item }) => (
          <Stack
            testID={`welcome-slide-${item}`}
            gap={3}
            align="center"
            justify="center"
            className="px-4"
            style={{ width, flex: 1 }}
          >
            {/* The counter is the accessible version of the dots below. */}
            <Pill
              align="center"
              leading={
                <Num variant="caption" weight="700" tracking={tracking}>
                  {t('onboarding.step', { n: item, total: SLIDES.length })}
                </Num>
              }
            />
            <Text testID={`welcome-title-${item}`} variant="title" weight="600" align="center">
              {t(`onboarding.welcome${item}Title`)}
            </Text>
            <Text variant="body" color="ink3" align="center">
              {t(`onboarding.welcome${item}Sub`)}
            </Text>
          </Stack>
        )}
      />

      {/* Position, not a control: the counter above each slide is the accessible version.
          The page you are on stretches to a 20 px capsule, so which one is current reads
          from the shape as well as from the gold. */}
      <Row
        physical
        testID="welcome-dots"
        gap={2}
        justify="center"
        align="center"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        className="py-4"
      >
        {pages.map((n, i) => (
          <View
            key={n}
            testID={`welcome-dot-${n}`}
            className={cx('h-2 rounded-full', i === page ? 'w-5 bg-accentStrong' : 'w-2 bg-line2')}
          />
        ))}
      </Row>

      <ActionBar
        testID="welcome-footer"
        bordered={false}
        secondary={
          <Button testID="welcome-skip" variant="ghost" label={t('common.skip')} onPress={onDone} />
        }
        primary={
          <Button
            testID="welcome-primary"
            size="lg"
            label={last ? t('common.getStarted') : t('common.next')}
            onPress={() => (last ? onDone() : goTo(d.isRTL ? page - 1 : page + 1))}
          />
        }
      />
    </Screen>
  );
}
