import { colors, motion, spacing } from '@tslprb/design-tokens';
import { useDir } from '@tslprb/i18n';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import {
  ActionBar,
  Brand,
  Button,
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

/** A dot is 8 px; the page you are on stretches to a 20 px capsule. */
const DOT = spacing['2'];
const DOT_WIDE = spacing['5'];

export type WelcomeViewProps = {
  /** Slide the screen opens on (1-based) — the dev gallery uses it; the app always starts at 1. */
  initialSlide?: SlideNo;
  /** Skip and Get started both land here: the intro is never a gate. */
  onDone: () => void;
};

/**
 * One position indicator. The current page stretches from 8 to 20 px over 140 ms, so the eye
 * follows the change rather than finding a different dot lit — the one piece of motion on the
 * screen, and the only thing that moves besides the pager itself.
 *
 * Reanimated ignores `className`, so the dot is drawn in inline styles (mobile-ui web gotcha).
 * Under reduced motion the width is set outright.
 */
function Dot({ active, testID }: { active: boolean; testID: string }) {
  const reduced = useReducedMotionSafe();
  const width = useSharedValue(active ? DOT_WIDE : DOT);
  useEffect(() => {
    const to = active ? DOT_WIDE : DOT;
    width.set(reduced ? to : withTiming(to, { duration: motion.fast }));
  }, [active, reduced, width]);
  const grow = useAnimatedStyle(() => ({ width: width.get() }));
  return (
    <Animated.View
      testID={testID}
      style={[
        {
          height: DOT,
          borderRadius: DOT,
          backgroundColor: active ? colors.accentStrong : colors.line2,
        },
        grow,
      ]}
    />
  );
}

/**
 * F-02 — splash to intro. Three claims, one per page, then sign-in.
 *
 * A `ScrollView`, not a `FlatList`: three slides is not a virtualization case, and RN Web wraps
 * every horizontal list item in a content-height row, which left the copy pinned to the top of
 * a 505 px pager with 372 px of empty cream under it (design review D1). A plain paging
 * scroller stretches its children to the pager's own height, so a slide can centre in it.
 *
 * Under RTL (dormant) the pages are laid out physically right-to-left, so "next" is a swipe to
 * the *right* and slide 1 sits on the right edge. The data array is reversed rather than the
 * scroll transformed, because a mirrored scroll view breaks momentum paging on Android.
 */
export function WelcomeView({ initialSlide = 1, onDone }: WelcomeViewProps) {
  const { t } = useTranslation();
  const d = useDir();
  const reduced = useReducedMotionSafe();
  const { width } = useWindowDimensions();
  const pager = useRef<ScrollView>(null);

  // Physical page order; index 0 is the left-most page on screen in both directions.
  const [pages] = useState<SlideNo[]>(() => (d.isRTL ? [...SLIDES].reverse() : [...SLIDES]));
  const toPhysical = (slide: SlideNo) => pages.indexOf(slide);
  const [page, setPage] = useState(() => Math.max(0, pages.indexOf(initialSlide)));

  const slide = pages[page] ?? 1;
  const last = slide === SLIDES.length;
  // Digits are always Latin-faced; their tracking still follows the UI language.
  const tracking = d.lang === 'en' ? 'kicker' : 'none';

  // A scroller has no `initialScrollIndex`: the opening page is jumped to once, after layout.
  const opened = useRef(false);
  useEffect(() => {
    if (opened.current || width <= 0) return;
    opened.current = true;
    const start = Math.max(0, toPhysical(initialSlide));
    if (start > 0) pager.current?.scrollTo({ x: width * start, animated: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one jump, on the first real width.
  }, [width]);

  const goTo = (nextPage: number) => {
    if (nextPage < 0 || nextPage >= pages.length) return;
    setPage(nextPage);
    pager.current?.scrollTo({ x: width * nextPage, animated: !reduced });
  };

  return (
    <Screen testID="welcome-screen" bottomInset={false}>
      {/* The full Brolly lockup: this is the one screen with room for it. */}
      <View className="items-center pb-6 pt-8">
        <Brand variant="splash" testID="welcome-brand" />
      </View>

      <ScrollView
        ref={pager}
        testID="welcome-pager"
        className="flex-1"
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        // Without `flexGrow` the row of pages collapses to its tallest child, and a slide that
        // stretches to the container has nothing to stretch to.
        contentContainerStyle={{ flexGrow: 1 }}
        onMomentumScrollEnd={(e) =>
          setPage(Math.round(e.nativeEvent.contentOffset.x / Math.max(width, 1)))
        }
      >
        {pages.map((item) => (
          <Stack
            key={item}
            testID={`welcome-slide-${item}`}
            gap={3}
            align="center"
            justify="center"
            className="px-4"
            style={{ width }}
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
        ))}
      </ScrollView>

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
          <Dot key={n} testID={`welcome-dot-${n}`} active={i === page} />
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
