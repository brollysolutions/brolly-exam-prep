import {
  STUDY_SECTIONS,
  studySectionMinutes,
  type StudySection,
  type StudyTopic,
} from '@tslprb/fixtures';
import { type Lang } from '@tslprb/i18n';
import { useTranslation } from 'react-i18next';

import {
  Card,
  Glyph,
  iso,
  MarkerRow,
  Measure,
  Num,
  PageHeader,
  Pill,
  Row,
  Screen,
  Stack,
} from '@/ui';

export type StudyViewProps = {
  /** Language the topic titles are read in. */
  lang: Lang;
  /** Topic ids already marked read, as the store holds them. */
  read?: Record<string, true>;
  onOpen: (id: string) => void;
};

/**
 * One topic row (P4). The mark says where you are — a gold dot for a topic still to read, the
 * ink check for one you have — and that is the whole of it. A trailing "Read" pill said the
 * same thing a second time, in the slot the chevron already occupies, on every row you had
 * finished; the composed name below still spells "Read" out for anyone who cannot see the mark
 * (design review D13). The minutes are a `Measure`, not a string, because a digit belongs in
 * `<Num>`; a node meta is silent in the composed name, so the row spells its own out.
 */
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
  const unit = t('study.minutes');
  const name = [topic.title[lang], `${iso(topic.minutes)} ${unit}`, read ? t('study.read') : null]
    .filter(Boolean)
    .join(' ');
  return (
    <MarkerRow
      testID={`study-row-${topic.id}`}
      first={first}
      marker={read ? 'done' : 'dot'}
      title={topic.title[lang]}
      meta={<Measure testID={`study-minutes-${topic.id}`} value={topic.minutes} unit={unit} />}
      chevron
      accessibilityLabel={name}
      onPress={onPress}
    />
  );
}

/**
 * One section: the paper's own numbering and the section name in a single `Pill`, what the
 * section costs in minutes and topics beside it, then one card of rows.
 *
 * The number is `ink3` on the pill's `surface2` (4.66:1), not gold. Gold is the candidate's own
 * input in this app and a printed section number is nobody's input; and the `Kicker` form it
 * replaces was 10.5 px, below the caption floor the same rules set two lines above — gold on
 * `surface2` would have been 4.25:1 anyway (design review A2/D5). It is the shape Affairs and
 * Library already head their blocks with.
 */
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
    <Stack gap={2} className="mt-7" testID={`study-section-${section.id}`}>
      <Row gap={3} align="center" justify="between">
        <Pill
          testID={`study-index-${section.id}`}
          leading={
            <Num variant="caption" weight="700" color="ink3" tracking="none">
              {index}
            </Num>
          }
          label={t(section.labelKey)}
        />
        <Row gap={2} align="baseline" wrap>
          <Measure value={studySectionMinutes(section)} unit={t('study.minutes')} />
          <Glyph variant="caption" color="ink3">
            ·
          </Glyph>
          <Measure value={section.topics.length} unit={t('study.topics')} />
        </Row>
      </Row>
      <Card>
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
      </Card>
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
      <PageHeader testID="study-header" title={t('study.title')} />
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
