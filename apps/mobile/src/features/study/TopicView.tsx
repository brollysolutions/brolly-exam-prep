import type { Localized, StudyBlock, StudySection, StudyTopic } from '@tslprb/fixtures';
import { LANGS, useDir, type Lang } from '@tslprb/i18n';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { startEdge } from '@/features/result/edge';
import {
  BackRow,
  Button,
  Chip,
  Glyph,
  Kicker,
  Measure,
  Row,
  Screen,
  SegmentedChips,
  Stack,
  Text,
} from '@/ui';

/** The bullet mark. Latin face, like every other glyph — Nastaliq has no U+25A0. */
const BULLET_GLYPH = '■';
const READ_GLYPH = '✓';

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

function Bullets({ items, lang }: { items: Localized[]; lang: Lang }) {
  return (
    <Stack gap={2} testID="study-block-bullets">
      {items.map((item, i) => (
        <Row key={i} gap={2} align="baseline">
          <Glyph
            variant="small"
            color="hivis"
            accessibilityElementsHidden
            importantForAccessibility="no"
          >
            {BULLET_GLYPH}
          </Glyph>
          <Text variant="body" color="chalk2" className="flex-1">
            {item[lang]}
          </Text>
        </Row>
      ))}
    </Stack>
  );
}

/** A 3 px start-edge block: the worked example (hi-vis) and the exam tip (sand). */
function EdgeBlock({
  tone,
  kicker,
  text,
  testID,
}: {
  tone: 'hivis' | 'sand';
  kicker: string;
  text: string;
  testID: string;
}) {
  const d = useDir();
  return (
    <View
      testID={testID}
      className="bg-panel2 px-3 py-3"
      // The edge is a style, not a class: RN's `borderStartWidth` follows `I18nManager`, not
      // the in-app language. See `startEdge`.
      style={startEdge(d.isRTL, tone)}
    >
      <Kicker color={tone} tracking="kickerTight">
        {kicker}
      </Kicker>
      <Text variant="body" color="chalk2" className="mt-2">
        {text}
      </Text>
    </View>
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
      // `Text` resolves the line-height from the language's own metrics: 1.45 en, 1.65 te,
      // 2.05 ur. Nothing to set here.
      return (
        <Text variant="body" color="chalk2" testID="study-block-para">
          {block.text[lang]}
        </Text>
      );
    case 'bullets':
      return <Bullets items={block.items} lang={lang} />;
    case 'formula':
      return (
        <View
          testID="study-block-formula"
          className="rounded-sm border border-line bg-panel2 px-3 py-3"
        >
          {/* The box carries words now, not just symbols — a Telugu reader should not have to
              decode "New ÷ Old" — so it reads in the page's own face rather than going
              through `Num`'s Latin one. The digits stay tabular, and each maths run in the
              Urdu fixture carries its own LRI…PDI isolation, so `18/5` never re-orders. */}
          <Text variant="body" weight="600" color="chalk" numeric>
            {block.text[lang]}
          </Text>
        </View>
      );
    case 'example':
      return (
        <EdgeBlock
          tone="hivis"
          kicker={t('study.example')}
          text={block.text[lang]}
          testID="study-block-example"
        />
      );
    case 'tip':
      return (
        <EdgeBlock
          tone="sand"
          kicker={t('study.tip')}
          text={block.text[lang]}
          testID="study-block-tip"
        />
      );
  }
}

/** An id that is not in the shelf: say so and offer the way back, nothing else. */
function NotFound({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();
  return (
    <Stack gap={4} className="mt-6" testID="topic-not-found">
      <Stack gap={2}>
        <Kicker color="flag">{t('result.errorKicker')}</Kicker>
        <Text variant="body" color="dim">
          {t('study.notFound')}
        </Text>
      </Stack>
      <Button
        variant="secondary"
        label={t('common.back')}
        onPress={onBack}
        testID="topic-not-found-back"
      />
    </Stack>
  );
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

  return (
    <Screen scroll padded bottomInset={false} testID="topic-screen">
      <Row testID="topic-header" gap={3} align="center" justify="between">
        <BackRow label={t('common.back')} onPress={onBack} testID="topic-back" />
        <SegmentedChips value={lang} onChange={onLang} options={langOptions} testID="topic-lang" />
      </Row>

      {!topic || !section ? (
        <NotFound onBack={onBack} />
      ) : (
        <>
          <Kicker className="mt-4" uppercase>
            {t(section.labelKey)}
          </Kicker>
          <Text variant="title" weight="600" className="mt-2">
            {topic.title[lang]}
          </Text>
          <Measure
            testID="topic-minutes"
            value={topic.minutes}
            unit={t('study.minutes')}
            className="mt-2"
          />

          <Stack gap={4} className="mt-6">
            {topic.blocks.map((block, i) => (
              <Block key={i} block={block} lang={lang} />
            ))}
          </Stack>

          <Stack gap={2} className="mt-8">
            {read ? (
              // Already read: a badge, not a button. Re-pressing a completed action is a
              // control that does nothing, and hi-vis is reserved for what is still to do.
              <Chip
                testID="topic-read"
                size="lg"
                label={t('study.read')}
                leading={
                  <Glyph variant="small" color="hivis">
                    {READ_GLYPH}
                  </Glyph>
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
            {/* Once the topic is read, drilling the section is the only thing left to do on
                this page, so it takes over the hi-vis the mark-read button was holding. */}
            <Button
              variant={read ? 'primary' : 'secondary'}
              label={t('study.practiseSection')}
              onPress={onPractise}
              testID="topic-practise"
            />
          </Stack>
        </>
      )}
    </Screen>
  );
}
