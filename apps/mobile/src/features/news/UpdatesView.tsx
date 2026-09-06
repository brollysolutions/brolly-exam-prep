import { colors, motion } from '@tslprb/design-tokens';
import type { Notice } from '@tslprb/fixtures';
import { dir, useDir, type Lang } from '@tslprb/i18n';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';

import {
  BackHeader,
  Card,
  cx,
  EmptyState,
  Glyph,
  Num,
  Pill,
  pressedClass,
  Row,
  Screen,
  Stack,
  Text,
  useMotion,
  usePressed,
} from '@/ui';

import { formatDay } from './format';

/**
 * The disclosure caret. Latin face through `Glyph`, the same reason `‹ ›` is drawn that way.
 * Collapsed it points along the reading direction, so RTL gets the mirrored one; open, the
 * SAME glyph is turned a quarter to point down — turned inwards, so it never swings out
 * through the card's edge.
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
 * Ink label and an `ink3` chevron: gold is a fill, an edge or a dot in this app, never a link
 * (Phase B ruling), and the chevron is the same one every row that goes somewhere carries.
 *
 * `self-start` is physical, so it goes through `dir()` — under RTL the row has to hug the right
 * edge, not the left (design review D10). The `px-1` that grows the target comes back as a
 * negative margin, the way every small control on this app grows one: `hitSlop` is not
 * implemented in react-native-web, so the label still starts on the card's own text axis.
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
      // Pressed = a `surface2` fill: an opacity dim is invisible between two creams.
      className={cx(
        '-mx-1 h-touch justify-center rounded-sm px-1',
        dir(d, 'self-start', 'self-end'),
        pressed && pressedClass,
      )}
    >
      <Row gap={1} align="center">
        <Text variant="caption" weight="600">
          {label}
        </Text>
        <Glyph
          variant="caption"
          color="ink3"
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
 * The gold start edge appears **only while the card is open**: it marks where you are in the
 * list, and a shelf where every card wore one would have six accents and no focus.
 *
 * Opening is 180 ms, not a jump: the card grows on a layout transition, the body fades in,
 * and the caret turns. All three fall back to an instant change under reduced motion.
 * `Animated.View` ignores `className`, so it carries only the motion and inline styles; the
 * styled surface is the `Card` inside it.
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
      {/* The card draws the edge and compensates its own padding for it — this screen used to
          do the sum itself, and subtracted the whole 3 px rather than the two the bar added
          over the resting `line`, which left an open notice's pill a pixel out of line with
          the closed cards around it (design review D8 / code review 1). */}
      <Card testID={`update-card-${notice.id}`} startEdge={expanded ? 'accentStrong' : undefined}>
        {/* The card supplies the padding, so the press target fills its inner box — the same
            shape `MarkerRow` takes inside a card on Home and Profile. */}
        <Pressable
          testID={`update-row-${notice.id}`}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          android_ripple={{ color: colors.accentTint }}
          onPress={() => setExpanded((open) => !open)}
          {...handlers}
          className={cx('min-h-touchLg justify-center', pressed && pressedClass)}
        >
          <Row gap={2} align="center" justify="between">
            <Row gap={2} align="center" className="flex-1">
              {/* A label, not a control: the kind is a tag to read, and it must not out-shout
                  the title under it. */}
              <Pill label={t(`updates.kind.${notice.kind}`)} testID={`update-kind-${notice.id}`} />
              {/* Latin face, tabular, LTR-isolated: the dates line up down the list and never
                  re-order inside a bidi row. */}
              <Num variant="caption" weight="600" color="ink3" testID={`update-date-${notice.id}`}>
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
                color="ink3"
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
            <Stack gap={2} className="mt-3">
              <Text variant="body" color="ink2" testID={`update-body-${notice.id}`}>
                {notice.body[lang]}
              </Text>
              {link !== undefined && onOpenLink !== undefined && (
                <LinkRow
                  label={t('updates.open')}
                  onPress={() => onOpenLink(link)}
                  testID={`update-link-${notice.id}`}
                />
              )}
            </Stack>
          </Animated.View>
        )}
      </Card>
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
      {/* A quiet tag on the feed, not a control, and never a second accent. It goes when
          `GET /notices` replaces the seeded fixtures. */}
      <BackHeader
        title={t('updates.title')}
        onBack={onBack}
        testID="updates-header"
        trailing={<Pill label={t('common.sampleData')} testID="sample-data" />}
      />
      {notices.length === 0 ? (
        <EmptyState message={t('updates.empty')} testID="updates-empty" />
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
