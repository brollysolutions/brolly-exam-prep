import { useDir } from '@tslprb/i18n';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, useWindowDimensions, View } from 'react-native';

import { Brand, Button, cx, Num, Row, Screen, Text, useReducedMotionSafe } from '@/ui';

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
  // One step between the counter, the title and the subtitle. One class, never two competing
  // ones: NativeWind has no last-wins merge.
  const gap = 'mt-3';

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
          <View
            testID={`welcome-slide-${item}`}
            className="justify-center px-4"
            style={{ width, flex: 1 }}
          >
            <Num
              variant="kicker"
              weight="700"
              color="hazard"
              align="center"
              tracking={d.lang === 'en' ? 'kicker' : 'none'}
            >
              {t('onboarding.step', { n: item, total: SLIDES.length })}
            </Num>
            <Text
              testID={`welcome-title-${item}`}
              variant="title"
              weight="600"
              align="center"
              className={gap}
            >
              {t(`onboarding.welcome${item}Title`)}
            </Text>
            <Text variant="body" color="dim" align="center" className={gap}>
              {t(`onboarding.welcome${item}Sub`)}
            </Text>
          </View>
        )}
      />

      {/* Position, not a control: the counter above each slide is the accessible version. */}
      <Row
        physical
        testID="welcome-dots"
        gap={2}
        justify="center"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        className="py-4"
      >
        {pages.map((n, i) => (
          <View
            key={n}
            testID={`welcome-dot-${n}`}
            className={cx('h-dot w-dot rounded-xs', i === page ? 'bg-hivis' : 'bg-line3')}
          />
        ))}
      </Row>

      <Row testID="welcome-footer" gap={3} align="center" className="px-3 pb-4">
        <Button
          testID="welcome-skip"
          variant="ghost"
          label={t('common.skip')}
          onPress={onDone}
        />
        <Button
          testID="welcome-primary"
          size="lg"
          label={last ? t('common.getStarted') : t('common.next')}
          onPress={() => (last ? onDone() : goTo(d.isRTL ? page - 1 : page + 1))}
          className="flex-1"
        />
      </Row>
    </Screen>
  );
}
