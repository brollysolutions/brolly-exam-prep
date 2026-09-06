import { Ionicons } from '@expo/vector-icons';
import { colors, size } from '@tslprb/design-tokens';
import type { Localized, StudyBlock, StudySection, StudyTopic } from '@tslprb/fixtures';
import { LANGS, useDir, type Lang } from '@tslprb/i18n';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { startEdge } from '@/features/result/edge';
import {
  BackRow,
  Button,
  Card,
  EmptyState,
  Kicker,
  Measure,
  Pill,
  Row,
  Screen,
  SegmentedChips,
  Stack,
  Text,
} from '@/ui';

/** The read mark, the same Ionicon the study shelf puts on a topic it has ticked off. */
const CHECK = size.icon;

export type TopicViewProps = {
  /** The topic and the section it sits in. Omit for an id the shelf does not hold. */
  topic?: StudyTopic;
  section?: StudySection;
  /** Language the material is read in; also the UI language, so the screen mirrors with it. */
  lang: Lang;
  onLang: (lang: Lang) => void;
  read?: boolean;
  onBack: () => void;
  onMarkRead: () => void;
  /** Sectional practice for this topic's section. Ungated — reading is free, so is drilling. */
  onPractise: () => void;
};

/**
 * A list inside the prose. The mark is a 6 px gold dot, not a glyph: a bullet is decoration
 * with no reading of its own, and a dot at 3.4:1 is a mark rather than a character a screen
 * reader has to be told to ignore.
 */
function Bullets({ items, lang }: { items: Localized[]; lang: Lang }) {
  return (
    <Stack gap={2} testID="study-block-bullets">
      {items.map((item, i) => (
        <Row key={i} gap={3} align="baseline">
          {/* `mt-2` puts the dot on the first line's optical centre, not on its baseline. */}
          <View className="mt-2 h-1.5 w-1.5 rounded-full bg-accentStrong" />
          <Text variant="body" color="ink2" className="flex-1">
            {item[lang]}
          </Text>
        </Row>
      ))}
    </Stack>
  );
}

/**
 * The two blocks that step out of the prose. The worked example is this page's one gold-edged
 * card — the thing the reader came for — and the exam tip is a quiet `surface2` inset beside
 * it. Both name themselves with a pill instead of a coloured kicker: gold is an edge here, not
 * a word (the two used to share one dark-gold kicker and were told apart by their label alone).
 */
function CalloutBlock({
  tone,
  label,
  text,
  testID,
}: {
  tone: 'example' | 'tip';
  label: string;
  text: string;
  testID: string;
}) {
  const d = useDir();
  const body = (
    <Stack gap={2}>
      <Pill label={label} />
      <Text variant="body" color="ink2">
        {text}
      </Text>
    </Stack>
  );
  if (tone === 'tip') {
    return (
      <View testID={testID} className="rounded-md bg-surface2 p-3">
        {body}
      </View>
    );
  }
  return (
    // The edge is a style, not a class: RN's `borderStartWidth` follows `I18nManager`, not
    // the in-app language. See `startEdge`.
    <Card testID={testID} style={startEdge(d.isRTL, 'accentStrong')}>
      {body}
    </Card>
  );
}

function Block({ block, lang }: { block: StudyBlock; lang: Lang }) {
  const { t } = useTranslation();
  switch (block.kind) {
    case 'heading':
      return (
        <Kicker testID="study-block-heading" uppercase>
          {block.text[lang]}
        </Kicker>
      );
    case 'para':
      // `Text` resolves the line-height from the language's own metrics: 1.5 en, 1.65 te.
      // Nothing to set here.
      return (
        <Text variant="body" color="ink2" testID="study-block-para">
          {block.text[lang]}
        </Text>
      );
    case 'bullets':
      return <Bullets items={block.items} lang={lang} />;
    case 'formula':
      return (
        <View testID="study-block-formula" className="rounded-md bg-surface2 px-3 py-3">
          {/* The box carries words now, not just symbols — a Telugu reader should not have to
              decode "New ÷ Old" — so it reads in the page's own face rather than going
              through `Num`'s Latin one. The digits stay tabular, and each maths run in the
              fixture carries its own LRI…PDI isolation, so `18/5` never re-orders. */}
          <Text variant="body" weight="600" numeric>
            {block.text[lang]}
          </Text>
        </View>
      );
    case 'example':
      return (
        <CalloutBlock
          tone="example"
          label={t('study.example')}
          text={block.text[lang]}
          testID="study-block-example"
        />
      );
    case 'tip':
      return (
        <CalloutBlock
          tone="tip"
          label={t('study.tip')}
          text={block.text[lang]}
          testID="study-block-tip"
        />
      );
  }
}

/**
 * F-21 — one topic, read top to bottom. Six block kinds and no navigation inside the page:
 * a candidate revising on a bus should be able to finish a topic with a thumb.
 */
export function TopicView({
  topic,
  section,
  lang,
  onLang,
  read = false,
  onBack,
  onMarkRead,
  onPractise,
}: TopicViewProps) {
  const { t } = useTranslation();
  const langOptions = LANGS.map((l: Lang) => ({
    value: l,
    label: t(`lang.${l}Short`),
    lang: l,
  }));
  const header = (
    <Row testID="topic-header" gap={3} align="center" justify="between">
      <BackRow label={t('common.back')} onPress={onBack} testID="topic-back" />
      <SegmentedChips value={lang} onChange={onLang} options={langOptions} testID="topic-lang" />
    </Row>
  );

  // An id that is not in the shelf: say so and offer the way back, nothing else. Not inside
  // the scroller — the waiting state centres in the space the topic would have filled.
  if (!topic || !section) {
    return (
      <Screen padded bottomInset={false} testID="topic-screen">
        {header}
        <EmptyState
          testID="topic-not-found"
          title={t('result.errorKicker')}
          message={t('study.notFound')}
          action={
            <Button
              variant="secondary"
              label={t('common.back')}
              onPress={onBack}
              testID="topic-not-found-back"
              className="px-6"
            />
          }
        />
      </Screen>
    );
  }

  return (
    <Screen scroll padded bottomInset={false} testID="topic-screen">
      {header}

      <Stack gap={2} className="mt-4">
        <Pill label={t(section.labelKey)} />
        {/* A display role: Playfair in English, Noto Serif Telugu in Telugu, two lines allowed. */}
        <Text variant="title" weight="600">
          {topic.title[lang]}
        </Text>
        <Measure testID="topic-minutes" value={topic.minutes} unit={t('study.minutes')} />
      </Stack>

      <Stack gap={4} className="mt-7">
        {topic.blocks.map((block, i) => (
          <Block key={i} block={block} lang={lang} />
        ))}
      </Stack>

      <Stack gap={2} className="mt-8">
        {read ? (
          // Already read: a badge, not a button. Re-pressing a completed action is a control
          // that does nothing, and the ink fill belongs to what is still to do.
          <Pill
            testID="topic-read"
            label={t('study.read')}
            leading={
              <Ionicons
                name="checkmark-circle"
                size={CHECK}
                color={colors.ink}
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
            }
          />
        ) : (
          <Button
            size="lg"
            label={t('study.markRead')}
            onPress={onMarkRead}
            testID="topic-mark-read"
          />
        )}
        {/* Once the topic is read, drilling the section is the only thing left to do on this
            page, so it takes over the ink fill the mark-read button was holding. */}
        <Button
          variant={read ? 'primary' : 'secondary'}
          size={read ? 'lg' : 'md'}
          label={t('study.practiseSection')}
          onPress={onPractise}
          testID="topic-practise"
        />
      </Stack>
    </Screen>
  );
}
