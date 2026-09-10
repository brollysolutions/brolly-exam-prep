import { Ionicons } from '@expo/vector-icons';
import { colors, size } from '@tslprb/design-tokens';
import type { Localized, StudyBlock, StudySection, StudyTopic } from '@tslprb/fixtures/src/runtime';
import { LANGS, type Lang } from '@tslprb/i18n';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';

import {
  BackHeader,
  Button,
  Card,
  cx,
  EmptyState,
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

/**
 * The inset the two quiet callouts pad to, so their text starts on the same axis as the worked
 * example's. A `Card` puts its content 17 px in — 16 px of padding behind its 1 px `line` — and
 * a box that draws no border has to make that pixel up itself. `p-4` alone left the exam tip and
 * the formula a pixel inside the example beside them, and the formula's `px-3` left it four
 * (design review D8). A literal, so Tailwind's scanner sees the class.
 */
const CALLOUT_INSET = 'p-[17px]';

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
  /** Opens the test library. Ungated — reading is free, so is practising what you read. */
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
      <View testID={testID} className={cx('rounded-md bg-surface2', CALLOUT_INSET)}>
        {body}
      </View>
    );
  }
  // The card draws the edge and compensates its own padding for it, so the example's prose
  // starts where the tip's does rather than three pixels further in (design review D8).
  return (
    <Card testID={testID} startEdge="accentStrong">
      {body}
    </Card>
  );
}

function Block({ block, lang }: { block: StudyBlock; lang: Lang }) {
  const { t } = useTranslation();
  switch (block.kind) {
    case 'heading':
      // A `Pill`, not a 10.5 px `Kicker`: `ink3` below caption size is under the floor the rules
      // set for it, and this is a block head — the shape the rest of the app names one with
      // (design review A2/D5).
      return <Pill testID="study-block-heading" label={block.text[lang]} />;
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
        <View testID="study-block-formula" className={cx('rounded-md bg-surface2', CALLOUT_INSET)}>
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
  // The leaf bar every other leaf screen wears, with no title in it: the topic's own title is
  // a display-face line in the body that is allowed two lines, and squeezing it into an Inter
  // 600 one-liner would be the same title said twice (F-30 fix wave, D17). The bar's job here
  // is the 48 px chevron and the language switcher, on `surface` under a `line`.
  const header = (
    <BackHeader
      testID="topic-header"
      onBack={onBack}
      trailing={
        <SegmentedChips value={lang} onChange={onLang} options={langOptions} testID="topic-lang" />
      }
    />
  );

  // An id that is not in the shelf: say so and offer the way back, nothing else. Not inside
  // the scroller — the waiting state centres in the space the topic would have filled.
  if (!topic || !section) {
    return (
      <Screen bottomInset={false} testID="topic-screen">
        {header}
        <EmptyState
          testID="topic-not-found"
          // The same red dot `LoadError` puts on the paper that could not be opened: two
          // not-found screens should read as one mechanism (design review D14).
          dotTone="danger"
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
    <Screen bottomInset={false} testID="topic-screen">
      {header}
      {/* The bar is chrome and stays put; only the prose scrolls, as on every other leaf
          screen. `pt-4` is the gap the header's own `mt-4` used to make. */}
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-6 pt-4"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        testID="topic-body"
      >
        <Stack gap={2}>
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
            label={t('study.practise')}
            onPress={onPractise}
            testID="topic-practise"
          />
        </Stack>
      </ScrollView>
    </Screen>
  );
}
