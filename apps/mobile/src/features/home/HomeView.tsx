import { colors, radius } from '@tslprb/design-tokens';
import { SAMPLE_RESULT, TESTS } from '@tslprb/fixtures';
import { LANGS, useDir, type Lang } from '@tslprb/i18n';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { startEdge } from '@/features/result/edge';
import {
  Button,
  Card,
  Chip,
  Glyph,
  iso,
  Kicker,
  Measure,
  Num,
  Row,
  Screen,
  SegmentedChips,
  Stack,
  Text,
  usePressed,
} from '@/ui';

/**
 * What the home card pitches: the first full mock a candidate can actually sit. Pointing at
 * a locked paper would make the screen's one hi-vis action a dead end (design review round 1).
 *
 * Exported because the route has to open *this* paper: an id repeated there is an id that
 * drifts, and the drift is invisible until someone taps a card for one mock and gets another.
 */
export const NEXT_MOCK = TESTS.find((test) => test.kind === 'full' && test.free) ?? TESTS[0];

/**
 * The prototype's action row: a 3 px hi-vis bar on the reading-start side, a title, the reason
 * underneath, and a hi-vis chevron. The edge is a flattened style object because the mirrored
 * half cannot be a class name (see `startEdge`), and the press delta comes from state because
 * a `style` callback next to `className` loses its static values on web (see `usePressed`).
 */
function TopicRow({
  action,
  onPress,
}: {
  action: (typeof SAMPLE_RESULT.actions)[number];
  onPress: () => void;
}) {
  const d = useDir();
  const { pressed, handlers } = usePressed();
  return (
    <View
      style={{
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.line,
        backgroundColor: colors.panel2,
        overflow: 'hidden',
        ...startEdge(d.isRTL, 'hivis'),
      }}
    >
      <Pressable
        testID={`home-topic-${action.id}`}
        accessibilityRole="button"
        android_ripple={{ color: colors.hivisTint3 }}
        onPress={onPress}
        {...handlers}
        className="min-h-16 justify-center p-4"
        style={pressed ? { opacity: 0.85 } : undefined}
      >
        <Row gap={3} align="center">
          <Stack gap={1} className="flex-1">
            <Text variant="body" weight="600">
              {action.title[d.lang]}
            </Text>
            <Text variant="caption" color="dim">
              {action.sub[d.lang]}
            </Text>
          </Stack>
          <Glyph color="hivis" accessibilityElementsHidden importantForAccessibility="no">
            {d.chevronNext}
          </Glyph>
        </Row>
      </Pressable>
    </View>
  );
}

export type HomeViewProps = {
  /** Who is signed in — the last four digits of the phone, already elided ("…1234"). */
  name?: string;
  /**
   * F-19: the screen renders the same either way. Being signed out only adds the quiet way
   * in; the actions below stay where they are and collect an account when they are pressed.
   */
  signedIn: boolean;
  lang: Lang;
  onLang: (lang: Lang) => void;
  /** Days left until the notified PWT date. */
  daysToExam: number;
  streakDays: number;
  onSignIn: () => void;
  onStartMock: () => void;
  onWeakTopic: (id: string) => void;
};

/**
 * F-07 — the home dashboard. One question is answered above the fold: *what do I do next?*
 * Everything below it is evidence for that answer, in the order a candidate asks for it.
 */
export function HomeView({
  name,
  signedIn,
  lang,
  onLang,
  daysToExam,
  streakDays,
  onSignIn,
  onStartMock,
  onWeakTopic,
}: HomeViewProps) {
  const { t } = useTranslation();
  const langOptions = LANGS.map((l: Lang) => ({ value: l, label: t(`lang.${l}Short`), lang: l }));
  const pattern = NEXT_MOCK.pattern;

  return (
    <Screen scroll padded bottomInset={false} testID="home-screen">
      <Row testID="home-header" align="center" justify="between" gap={2} wrap className="mt-4">
        <Kicker lang="en" color="hivis" tracking="brand">
          {t('common.brand')}
        </Kicker>
        <Row gap={2} align="center">
          {/* Outlined, not hi-vis: signing in is not what this screen is for. The yellow stays
              on "Start now", which asks for an account itself when it needs one. */}
          {!signedIn && (
            <Chip
              testID="home-signin"
              label={t('common.signIn')}
              size="lg"
              onPress={onSignIn}
            />
          )}
          <SegmentedChips value={lang} onChange={onLang} options={langOptions} testID="home-lang" />
        </Row>
      </Row>

      <Text variant="title" weight="600" testID="home-greeting" className="mt-4">
        {name ? t('home.greeting', { name: iso(name) }) : t('home.greetingPlain')}
      </Text>
      {/* Not a control: a run of practice is a fact about the reader, so it reads as caption
          text beside the greeting rather than a tappable-looking chip. */}
      <Text variant="caption" color="dim" testID="home-streak" className="mt-1">
        {t('home.streak', { count: streakDays })}
      </Text>

      <Row className="mt-4">
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
          <Measure value={pattern.totalQuestions} unit={t('common.questionsUnit')} />
          <Glyph variant="caption" color="mute">
            ·
          </Glyph>
          <Measure value={pattern.durationMinutes} unit={t('common.minutesUnit')} />
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
          <Chip label={t('result.qualified')} tone="hivis" active />
        </Row>
      </Card>

      <Kicker className="mt-6">{t('home.weakTopics')}</Kicker>
      <Stack gap={2} testID="home-weak-topics" className="mt-2">
        {SAMPLE_RESULT.actions.map((action) => (
          <TopicRow key={action.id} action={action} onPress={() => onWeakTopic(action.id)} />
        ))}
      </Stack>
    </Screen>
  );
}
