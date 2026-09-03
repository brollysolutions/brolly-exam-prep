import { colors } from '@tslprb/design-tokens';
import type { Notice } from '@tslprb/fixtures';
import { useDir, type Lang } from '@tslprb/i18n';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { BackHeader } from '@/features/result/Header';
import { Chip, Glyph, Num, Row, Screen, Stack, Text, usePressed } from '@/ui';

import { NewsEmpty } from './Empty';
import { formatDay } from './format';

/**
 * The disclosure caret. Latin face through `Glyph` — Nastaliq has no Geometric Shapes block,
 * the same reason `■` and `✓` are drawn that way. Collapsed it points along the reading
 * direction, so Urdu gets the mirrored one; expanded it points down in both.
 */
const CARET_EXPANDED = '▾';
const CARET_COLLAPSED_LTR = '▸';
const CARET_COLLAPSED_RTL = '◂';

export type UpdatesViewProps = {
  /** Newest first — the order the list prints them in. */
  notices: Notice[];
  /** Which language's face the title and body are drawn in. */
  lang: Lang;
  onBack: () => void;
  /** Opens the notice on the Board's site. Omitted, the link row is not offered. */
  onOpenLink?: (link: string) => void;
};

/** The "read the full notice" row. Its own 48 px target, below the body, only when expanded. */
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
      <Row gap={2} align="center">
        <Text variant="caption" weight="600" color="hivis">
          {label}
        </Text>
        <Glyph
          variant="small"
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
 * Its own component because the expanded flag and the press delta are per-row state; a
 * `style` callback would lose the card's static values on web (`usePressed`).
 */
function NoticeCard({
  notice,
  lang,
  onOpenLink,
}: {
  notice: Notice;
  lang: Lang;
  onOpenLink?: (link: string) => void;
}) {
  const { t } = useTranslation();
  const d = useDir();
  const [expanded, setExpanded] = useState(false);
  const { pressed, handlers } = usePressed();
  const link = notice.link;
  return (
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
            <Chip label={t(`updates.kind.${notice.kind}`)} testID={`update-kind-${notice.id}`} />
            {/* Latin face, tabular, LTR-isolated: the dates line up down the list and never
                re-order inside an Urdu row. */}
            <Num variant="caption" weight="600" color="dim" testID={`update-date-${notice.id}`}>
              {formatDay(notice.date)}
            </Num>
          </Row>
          <Glyph
            variant="small"
            color="dim"
            testID={`update-caret-${notice.id}`}
            accessibilityElementsHidden
            importantForAccessibility="no"
          >
            {expanded ? CARET_EXPANDED : d.pick(CARET_COLLAPSED_LTR, CARET_COLLAPSED_RTL)}
          </Glyph>
        </Row>
        <Text variant="body" weight="600" className="mt-2" testID={`update-title-${notice.id}`}>
          {notice.title[lang]}
        </Text>
      </Pressable>

      {expanded && (
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
      )}
    </View>
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
export function UpdatesView({ notices, lang, onBack, onOpenLink }: UpdatesViewProps) {
  const { t } = useTranslation();
  return (
    <Screen testID="updates-screen">
      {/* Static and dim: a label on the feed, not a control, and never a second yellow. It
          goes when `GET /notices` replaces the seeded fixtures. */}
      <BackHeader
        title={t('updates.title')}
        onBack={onBack}
        testID="updates-header"
        trailing={<Chip label={t('common.sampleData')} testID="sample-data" />}
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
              <NoticeCard key={notice.id} notice={notice} lang={lang} onOpenLink={onOpenLink} />
            ))}
          </Stack>
        </ScrollView>
      )}
    </Screen>
  );
}
