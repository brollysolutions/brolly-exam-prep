import { colors } from '@tslprb/design-tokens';
import { SAMPLE_RESULT, TESTS } from '@tslprb/fixtures';
import { LANGS, useDir, type Lang } from '@tslprb/i18n';
import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';

import {
  Button,
  Card,
  Chip,
  cx,
  Glyph,
  Kicker,
  Num,
  Row,
  Screen,
  SegmentedChips,
  Text,
  usePressed,
} from '@/ui';

type WeakTopicAction = (typeof SAMPLE_RESULT.actions)[number];

/** The full mock the home card pitches (`mock-08`). */
const NEXT_MOCK = TESTS[1];

/**
 * A number inside an interpolated sentence cannot be wrapped in `<Num>`, so it gets the same
 * LRI…PDI isolation `<Num>` applies: it keeps its reading order inside an Urdu line. Only the
 * tabular figures are lost, which at caption size is invisible.
 */
const iso = (value: number | string) => `⁦${value}⁩`;

/** Digits plus a unit noun — the one shape that keeps `<Num>` and `t()` both honest. */
function Meta({ n, unit }: { n: number; unit: string }) {
  return (
    <Row gap={1} align="baseline">
      <Num variant="caption" weight="600" color="dim">
        {n}
      </Num>
      <Text variant="caption" color="dim">
        {unit}
      </Text>
    </Row>
  );
}

/**
 * One row of `home-weak-topics`. A `Pressable` `style` FUNCTION would drop its static
 * `className` entries on web (see `usePressed`), so press feedback is state-driven instead —
 * one `usePressed` call per row, via its own component rather than inside the list `.map`.
 */
function WeakTopicRow({
  action,
  lang,
  first,
  onPress,
}: {
  action: WeakTopicAction;
  lang: Lang;
  first: boolean;
  onPress: () => void;
}) {
  const d = useDir();
  const { pressed, handlers } = usePressed();
  return (
    <Pressable
      testID={`home-topic-${action.id}`}
      accessibilityRole="button"
      android_ripple={{ color: colors.hivisTint3 }}
      onPress={onPress}
      {...handlers}
      className={cx('min-h-touch justify-center', first ? 'mt-1' : 'border-t border-line2')}
      style={pressed ? { opacity: 0.85 } : undefined}
    >
      <Row gap={3} align="center" justify="between">
        <Text variant="body" weight="600" className="flex-1">
          {action.title[lang]}
        </Text>
        <Glyph color="dim" accessibilityElementsHidden importantForAccessibility="no">
          {d.chevronNext}
        </Glyph>
      </Row>
    </Pressable>
  );
}

export type HomeViewProps = {
  /** Who is signed in — the last four digits of the phone, already elided ("…1234"). */
  name?: string;
  lang: Lang;
  onLang: (lang: Lang) => void;
  /** Days left until the notified PWT date. */
  daysToExam: number;
  streakDays: number;
  onStartMock: () => void;
  onWeakTopic: (id: string) => void;
};

/**
 * F-07 — the home dashboard. One question is answered above the fold: *what do I do next?*
 * Everything below it is evidence for that answer, in the order a candidate asks for it.
 */
export function HomeView({
  name,
  lang,
  onLang,
  daysToExam,
  streakDays,
  onStartMock,
  onWeakTopic,
}: HomeViewProps) {
  const { t } = useTranslation();
  const langOptions = LANGS.map((l: Lang) => ({ value: l, label: t(`lang.${l}Short`), lang: l }));
  const pattern = NEXT_MOCK.pattern;

  return (
    <Screen scroll padded testID="home-screen">
      <Row testID="home-header" align="center" justify="between" className="mt-4">
        <Kicker lang="en" color="hivis" tracking="brand">
          {t('common.brand')}
        </Kicker>
        <SegmentedChips value={lang} onChange={onLang} options={langOptions} testID="home-lang" />
      </Row>

      <Text variant="title" weight="600" testID="home-greeting" className="mt-4">
        {name ? t('home.greeting', { name }) : t('home.greetingPlain')}
      </Text>

      <Row className="mt-3">
        <Chip
          testID="home-countdown"
          label={t('home.examCountdown', { days: iso(daysToExam) })}
          tone="sand"
          active
        />
      </Row>

      {/* The one hi-vis action on the screen. */}
      <Card testID="home-next-mock" className="mt-6">
        <Kicker>{t('home.nextMock')}</Kicker>
        <Text variant="subtitle" weight="700" className="mt-2">
          {NEXT_MOCK.title[lang]}
        </Text>
        <Row gap={2} align="center" wrap className="mt-2">
          <Meta n={pattern.totalQuestions} unit={t('common.questionsUnit')} />
          <Glyph variant="caption" color="mute">
            ·
          </Glyph>
          <Meta n={pattern.durationMinutes} unit={t('common.minutesUnit')} />
        </Row>
        <Button
          testID="home-start"
          size="lg"
          label={t('home.startNow')}
          onPress={onStartMock}
          className="mt-4"
        />
      </Card>

      <Card testID="home-last-score" className="mt-3">
        <Kicker>{t('home.lastScore')}</Kicker>
        <Row align="center" justify="between" gap={3} className="mt-2">
          <Row gap={2} align="baseline">
            <Num variant="display" color="hivis" testID="home-score">
              {SAMPLE_RESULT.score}
            </Num>
            <Text variant="caption" color="dim">
              {t('home.outOf', { max: iso(SAMPLE_RESULT.maxScore) })}
            </Text>
          </Row>
          <Chip label={t('result.qualified')} tone="hivis" active shape="pill" />
        </Row>
      </Card>

      <Card testID="home-weak-topics" className="mt-3">
        <Kicker>{t('home.weakTopics')}</Kicker>
        {SAMPLE_RESULT.actions.map((action, i) => (
          <WeakTopicRow
            key={action.id}
            action={action}
            lang={lang}
            first={i === 0}
            onPress={() => onWeakTopic(action.id)}
          />
        ))}
      </Card>

      <Row className="mt-4">
        <Chip testID="home-streak" label={t('home.streak', { count: streakDays })} />
      </Row>
    </Screen>
  );
}
