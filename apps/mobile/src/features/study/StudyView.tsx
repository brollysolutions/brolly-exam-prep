import { colors } from '@tslprb/design-tokens';
import {
  STUDY_SECTIONS,
  studySectionMinutes,
  type StudySection,
  type StudyTopic,
} from '@tslprb/fixtures';
import { useDir, type Lang } from '@tslprb/i18n';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet } from 'react-native';

import { Chip, cx, Glyph, Kicker, Measure, Row, Screen, Stack, Text, usePressed } from '@/ui';

/** The ✓ that marks a topic already read. Latin face — Nastaliq has no U+2713. */
const READ_GLYPH = '✓';

export type StudyViewProps = {
  /** Language the topic titles are read in. */
  lang: Lang;
  /** Topic ids already marked read, as the store holds them. */
  read?: Record<string, true>;
  onOpen: (id: string) => void;
};

/** One topic row. Its own component so the press delta lives in state, not a style callback. */
function TopicRow({
  topic,
  lang,
  read,
  first,
  onPress,
}: {
  topic: StudyTopic;
  lang: Lang;
  read: boolean;
  first: boolean;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const d = useDir();
  const { pressed, handlers } = usePressed();
  return (
    <Pressable
      testID={`study-row-${topic.id}`}
      accessibilityRole="button"
      android_ripple={{ color: colors.hivisTint3 }}
      onPress={onPress}
      {...handlers}
      className={cx('min-h-[72px] justify-center border-b border-line', first && 'border-t')}
      // One flattened object, never a callback: see `usePressed`.
      style={StyleSheet.flatten([pressed ? { opacity: 0.85 } : null])}
    >
      <Row gap={3} align="center" justify="between">
        <Stack gap={1} className="flex-1">
          <Text variant="body" weight="600">
            {topic.title[lang]}
          </Text>
          <Measure
            testID={`study-minutes-${topic.id}`}
            value={topic.minutes}
            unit={t('study.minutes')}
          />
        </Stack>
        <Row gap={2} align="center">
          {read && (
            <Chip
              testID={`study-read-${topic.id}`}
              label={t('study.read')}
              leading={
                // The same hi-vis tick the topic page marks itself read with: the shelf and
                // the page must not disagree about what "read" looks like.
                <Glyph variant="small" color="hivis">
                  {READ_GLYPH}
                </Glyph>
              }
            />
          )}
          {/* The only hi-vis on the row: it says "this opens", and nothing else on the row
              competes with it. */}
          <Glyph
            color="hivis"
            accessibilityElementsHidden
            importantForAccessibility="no"
            testID={`study-chevron-${topic.id}`}
          >
            {d.chevronNext}
          </Glyph>
        </Row>
      </Row>
    </Pressable>
  );
}

function Section({
  section,
  index,
  lang,
  read,
  onOpen,
}: {
  section: StudySection;
  index: string;
  lang: Lang;
  read: Record<string, true>;
  onOpen: (id: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <Stack className="mt-6">
      <Row gap={3} align="baseline" justify="between" testID={`study-section-${section.id}`}>
        <Kicker index={index} uppercase>
          {t(section.labelKey)}
        </Kicker>
        <Row gap={2} align="baseline" wrap>
          <Measure value={studySectionMinutes(section)} unit={t('study.minutes')} />
          <Glyph variant="caption" color="mute">
            ·
          </Glyph>
          <Measure value={section.topics.length} unit={t('study.topics')} />
        </Row>
      </Row>
      <Stack className="mt-3">
        {section.topics.map((topic, i) => (
          <TopicRow
            key={topic.id}
            topic={topic}
            lang={lang}
            read={Boolean(read[topic.id])}
            first={i === 0}
            onPress={() => onOpen(topic.id)}
          />
        ))}
      </Stack>
    </Stack>
  );
}

/**
 * F-21 — the study shelf. Four sections in the order the paper puts them, each row saying
 * only what the topic is, how long it takes to read, and whether you have read it.
 *
 * Free for guests: an account buys you a saved attempt, not the syllabus.
 */
export function StudyView({ lang, read = {}, onOpen }: StudyViewProps) {
  const { t } = useTranslation();
  return (
    <Screen scroll padded bottomInset={false} testID="study-screen">
      <Text variant="titleLg" weight="600" className="mt-5">
        {t('study.title')}
      </Text>
      {STUDY_SECTIONS.map((section, i) => (
        <Section
          key={section.id}
          section={section}
          index={String(i + 1).padStart(2, '0')}
          lang={lang}
          read={read}
          onOpen={onOpen}
        />
      ))}
    </Screen>
  );
}
