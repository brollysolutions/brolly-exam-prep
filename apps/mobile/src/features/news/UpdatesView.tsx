import { colors, motion } from '@tslprb/design-tokens';
import type { Notice } from '@tslprb/fixtures';
import { useDir, type Lang } from '@tslprb/i18n';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';

import {
  BackHeader,
  Chip,
  Glyph,
  Num,
  Row,
  Screen,
  Stack,
  Text,
  useMotion,
  usePressed,
} from '@/ui';

import { NewsEmpty } from './Empty';
import { formatDay } from './format';

/**
 * The disclosure caret. Latin face through `Glyph`, the same reason `■` and `✓` are drawn
 * that way. Collapsed it points along the reading direction, so RTL gets the mirrored one;
 * open, the SAME glyph is turned a quarter to
 * point down — turned inwards, so it never swings out through the card's edge.
 */
const CARET_LTR = '▸';
const CARET_RTL = '◂';

export type UpdatesViewProps = {
  /** Newest first — the order the list prints them in. */
  notices: Notice[];
  /** Which language's face the title and body are drawn in. */
  lang: Lang;
  onBack: () => void;
  /** Opens the notice on the Board's site. Omitted, the link row is not offered. */
  onOpenLink?: (link: string) => void;
  /** The notice to arrive with already open — a card tapped on Home sends its id here. */
  openId?: string;
};

/**
 * The "read the full notice" row. Its own 48 px target, below the body, only when expanded.
 * Chalk with a yellow chevron: the yellow says "this leaves", the label does not have to.
 */
function LinkRow({
  label,
  onPress,
  testID,
}: {
  label: string;
  onPress: () => void;
  testID: string;
}) {
  const d = useDir();
  const { pressed, handlers } = usePressed();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="link"
      accessibilityLabel={label}
      onPress={onPress}
      {...handlers}
      className="mt-2 h-touch justify-center"
      // One flattened object, never a callback: see `usePressed`.
      style={StyleSheet.flatten([pressed ? { opacity: 0.85 } : null])}
    >
      <Row gap={1} align="center">
        <Text variant="caption" weight="600" color="chalk2">
          {label}
        </Text>
        <Glyph
          variant="caption"
          color="hivis"
          accessibilityElementsHidden
          importantForAccessibility="no"
        >
          {d.chevronNext}
        </Glyph>
      </Row>
    </Pressable>
  );
}

/**
 * One notice. The row says what kind it is and when — enough to decide whether it concerns
 * you — and the body is a tap away, so six notices still fit on one screen.
 *
 * Its own component because the expanded flag, the caret's turn and the press delta are
 * per-row state; a `style` callback would lose the card's static values on web (`usePressed`).
 *
 * Opening is 180 ms, not a jump: the card grows on a layout transition, the body fades in,
 * and the caret turns. All three fall back to an instant change under reduced motion.
 * `Animated.View` ignores `className`, so it carries only the motion and inline styles; the
 * styled surface is the plain `View` inside it.
 */
function NoticeCard({
  notice,
  lang,
  initiallyOpen,
  onOpenLink,
}: {
  notice: Notice;
  lang: Lang;
  initiallyOpen: boolean;
  onOpenLink?: (link: string) => void;
}) {
  const { t } = useTranslation();
  const d = useDir();
  const m = useMotion();
  const [expanded, setExpanded] = useState(initiallyOpen);
  const { pressed, handlers } = usePressed();
  const link = notice.link;

  // A quarter turn inwards: clockwise for ▸, anticlockwise for ◂. A state-driven CSS
  // transition, not a shared value: two resting angles need no worklet.
  const turn = d.isRTL ? -90 : 90;
  const layout = m.reduced ? undefined : LinearTransition.duration(motion.base);

  return (
    <Animated.View layout={layout}>
      <View className="rounded-md border border-line bg-panel2" testID={`update-card-${notice.id}`}>
        <Pressable
          testID={`update-row-${notice.id}`}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          android_ripple={{ color: colors.hivisTint3 }}
          onPress={() => setExpanded((open) => !open)}
          {...handlers}
          className="min-h-[72px] justify-center p-4"
          // One flattened object, never a callback: see `usePressed`.
          style={StyleSheet.flatten([pressed ? { opacity: 0.85 } : null])}
        >
          <Row gap={2} align="center" justify="between">
            <Row gap={2} align="center" className="flex-1">
              {/* A tag, not a chip: the kind is a label to read, and it must not out-shout the
                  title under it. */}
              <Chip
                label={t(`updates.kind.${notice.kind}`)}
                tone="label"
                testID={`update-kind-${notice.id}`}
              />
              {/* Latin face, tabular, LTR-isolated: the dates line up down the list and never
                  re-order inside a bidi row. */}
              <Num variant="caption" weight="600" color="dim" testID={`update-date-${notice.id}`}>
                {formatDay(notice.date)}
              </Num>
            </Row>
            <Animated.View
              testID={`update-caret-box-${notice.id}`}
              style={{
                transform: [{ rotate: `${expanded ? turn : 0}deg` }],
                transitionProperty: 'transform',
                transitionDuration: m.reduced ? 0 : motion.base,
              }}
            >
              <Glyph
                variant="body"
                color="dim"
                testID={`update-caret-${notice.id}`}
                accessibilityElementsHidden
                importantForAccessibility="no"
              >
                {d.pick(CARET_LTR, CARET_RTL)}
              </Glyph>
            </Animated.View>
          </Row>
          <Text variant="body" weight="600" className="mt-2" testID={`update-title-${notice.id}`}>
            {notice.title[lang]}
          </Text>
        </Pressable>

        {expanded && (
          <Animated.View entering={m.fadeIn()}>
            <View className="px-4 pb-4">
              <Text variant="caption" color="chalk2" testID={`update-body-${notice.id}`}>
                {notice.body[lang]}
              </Text>
              {link !== undefined && onOpenLink !== undefined && (
                <LinkRow
                  label={t('updates.open')}
                  onPress={() => onOpenLink(link)}
                  testID={`update-link-${notice.id}`}
                />
              )}
            </View>
          </Animated.View>
        )}
      </View>
    </Animated.View>
  );
}

/**
 * F-24 — the Board's notice board: notification, application window, exam date, hall tickets,
 * PMT/PET, result, newest first.
 *
 * Free for guests, and deliberately so: a candidate checking whether the hall tickets are out
 * should never meet a sign-in wall on the way.
 *
 * Pure, so the route, the tests and the dev gallery render the same component.
 */
export function UpdatesView({ notices, lang, onBack, onOpenLink, openId }: UpdatesViewProps) {
  const { t } = useTranslation();
  return (
    <Screen testID="updates-screen">
      {/* A quiet tag on the feed, not a control, and never a second yellow. It goes when
          `GET /notices` replaces the seeded fixtures. */}
      <BackHeader
        title={t('updates.title')}
        onBack={onBack}
        testID="updates-header"
        trailing={<Chip label={t('common.sampleData')} tone="label" testID="sample-data" />}
      />
      {notices.length === 0 ? (
        <NewsEmpty message={t('updates.empty')} testID="updates-empty" />
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-4 pb-6 pt-4"
          showsVerticalScrollIndicator={false}
          testID="updates-list"
        >
          <Stack gap={3}>
            {notices.map((notice) => (
              <NoticeCard
                key={notice.id}
                notice={notice}
                lang={lang}
                initiallyOpen={notice.id === openId}
                onOpenLink={onOpenLink}
              />
            ))}
          </Stack>
        </ScrollView>
      )}
    </Screen>
  );
}
