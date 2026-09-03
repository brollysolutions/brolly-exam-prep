import { colors, radius } from '@tslprb/design-tokens';
import { LANGS, useDir, type Lang } from '@tslprb/i18n';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { startEdge } from '@/features/result/edge';
import {
  Button,
  Card,
  Chip,
  Duration,
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

import { shortDate, type HomeAffair, type HomeNotice } from './homeData';

/**
 * The one thing to do next, in the order the screen looks for it: a paper still running, then
 * the topic last open, then the first topic never opened. Exactly one is ever shown — a home
 * screen that offers three "continue"s has answered nothing.
 */
export type HomeContinue =
  | { kind: 'mock'; title: string; answered: number; remainingSec: number }
  | { kind: 'reading'; title: string; minutes: number }
  | { kind: 'start'; title: string; minutes: number };

export type HomeProgress = {
  topicsRead: number;
  topicsTotal: number;
  papers: number;
  /** Absent until a paper has been scored — a different thing from zero, drawn differently. */
  bestScore?: number;
};

/**
 * Blocks in the day's target bar. Ten, not twenty: at 20 questions a block is two answers,
 * which is a visible step on a 320 px screen where a twentieth would be a hairline.
 */
export const TARGET_SEGMENTS = 10;

/** Blocks lit for `done` out of `target`. */
export function targetFill(done: number, target: number): number {
  if (target <= 0 || done <= 0) return 0;
  // The first answer of the day lights the first block: floor alone would leave the bar dark
  // until a tenth of the target was done, which reads as "that didn't count".
  return Math.min(TARGET_SEGMENTS, Math.max(1, Math.floor((done / target) * TARGET_SEGMENTS)));
}

/**
 * The day's target as a row of blocks.
 *
 * Views, not SVG and not an arc: the shape is a hazard-tape run of segments, which is what
 * the identity already draws at the top of every screen, and it needs no dependency Expo Go
 * would have to be left for. Nothing animates, so there is nothing to gate under reduced
 * motion — the bar is simply drawn at the value it has.
 */
function TargetBar({ done, target }: { done: number; target: number }) {
  const filled = targetFill(done, target);
  return (
    <Row
      gap={1}
      testID="home-target"
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: target, now: Math.min(done, target) }}
    >
      {Array.from({ length: TARGET_SEGMENTS }, (_, i) => (
        <View
          key={i}
          testID="home-target-seg"
          className={`h-progress flex-1 rounded-xs ${i < filled ? 'bg-hivis' : 'bg-panel3'}`}
        />
      ))}
    </Row>
  );
}

/**
 * A block's heading and the way past it: "Updates … All updates ›".
 *
 * The link is 20 px of text with 14 px of hit slop either side rather than a 48 px box: a
 * half-height control beside a kicker would push the heading off its own baseline, and the
 * slop is what the finger actually lands in.
 */
function SectionHead({
  title,
  link,
  onPress,
  testID,
}: {
  title: string;
  link: string;
  onPress: () => void;
  testID: string;
}) {
  const d = useDir();
  const { pressed, handlers } = usePressed();
  return (
    <Row align="center" justify="between" gap={3}>
      <Kicker>{title}</Kicker>
      <Pressable
        testID={testID}
        accessibilityRole="link"
        accessibilityLabel={link}
        hitSlop={{ top: 14, bottom: 14, left: 10, right: 10 }}
        onPress={onPress}
        {...handlers}
        style={pressed ? { opacity: 0.85 } : undefined}
      >
        <Row gap={1} align="center">
          <Text variant="caption" weight="700" color="hivis">
            {link}
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
    </Row>
  );
}

/** One number and what it counts. Three of these are the whole progress block. */
function StatTile({
  testID,
  value,
  label,
  empty = false,
}: {
  testID: string;
  value: string;
  label: string;
  empty?: boolean;
}) {
  return (
    <Stack
      gap={1}
      testID={testID}
      accessible
      accessibilityLabel={`${label} ${value}`}
      className="flex-1 rounded-md border border-line bg-panel2 p-3"
    >
      {/* `dim`, not `mute`, when there is nothing yet: the number is still text a candidate
          has to read, and `mute` is 3.97:1 — decorative only. */}
      <Num variant="stat" color={empty ? 'dim' : 'hivis'}>
        {value}
      </Num>
      <Text variant="caption" color="dim">
        {label}
      </Text>
    </Stack>
  );
}

/** Width of a notice card in the horizontal shelf: wide enough for two lines of a title. */
const NOTICE_W = 236;

export type HomeViewProps = {
  /** Who is signed in — the last four digits of the phone, already elided ("…1234"). */
  name?: string;
  /**
   * F-19: the screen renders the same either way. Being signed out only adds the quiet way
   * in and the line under the progress tiles; nothing on Home is withheld from a guest.
   */
  signedIn: boolean;
  lang: Lang;
  onLang: (lang: Lang) => void;
  /** Days left until the notified PWT date. */
  daysToExam: number;
  /** That date as digits, `DD-MM-YYYY` — see `fullDate`. */
  examDate: string;
  /** The exam's own name in the reading language, from `EXAM_INFO.label`. */
  examLabel: string;
  streakDays: number;
  /** Today's work against the day's target; `done` may exceed `target`. */
  today: { done: number; target: number };
  /** Omitted only in the unreachable state where there is nothing left to read or sit. */
  continueItem?: HomeContinue;
  notices: HomeNotice[];
  affairs: HomeAffair[];
  progress: HomeProgress;
  onSignIn: () => void;
  /** The countdown hero opens the shelf of papers it is counting down to. */
  onOpenTests: () => void;
  onContinue: () => void;
  onOpenUpdates: () => void;
  onOpenPhysical: () => void;
  onOpenAffairs: () => void;
};

/**
 * F-23 — Home v3.
 *
 * The tab bar already carries Study and Tests, so the screen stops repeating them and answers
 * the questions only a home screen can: how long have I got, what was I in the middle of, what
 * has the board said, do I clear the physical, what happened today, and how far along am I.
 * One hi-vis action — the Continue card — because there is only ever one next thing.
 */
export function HomeView({
  name,
  signedIn,
  lang,
  onLang,
  daysToExam,
  examDate,
  examLabel,
  streakDays,
  today,
  continueItem,
  notices,
  affairs,
  progress,
  onSignIn,
  onOpenTests,
  onContinue,
  onOpenUpdates,
  onOpenPhysical,
  onOpenAffairs,
}: HomeViewProps) {
  const { t } = useTranslation();
  const d = useDir();
  const langOptions = LANGS.map((l: Lang) => ({ value: l, label: t(`lang.${l}Short`), lang: l }));

  /**
   * The hero is one button, so a screen reader is read its label INSTEAD of the four lines
   * inside it — which means the label has to carry both facts the card is made of, or the
   * day's target is invisible to anyone not looking at it.
   */
  const heroLabel = [
    t('home.examCountdown', { days: iso(daysToExam) }),
    t('home.targetDone', { done: iso(today.done), target: iso(today.target) }),
  ].join(' · ');

  const continueKicker =
    continueItem?.kind === 'mock'
      ? t('home.continueMock')
      : continueItem?.kind === 'reading'
        ? t('home.continueReading')
        : t('home.startWith');
  const continueAction =
    continueItem?.kind === 'mock'
      ? t('home.resume')
      : continueItem?.kind === 'reading'
        ? t('common.continue')
        : t('home.startNow');

  return (
    <Screen scroll padded bottomInset={false} testID="home-screen">
      <Row testID="home-header" align="center" justify="between" gap={2} wrap className="mt-4">
        <Kicker lang="en" color="hivis" tracking="brand">
          {t('common.brand')}
        </Kicker>
        <Row gap={2} align="center">
          {/* Outlined, not hi-vis: signing in is not what this screen is for. */}
          {!signedIn && (
            <Chip testID="home-signin" label={t('common.signIn')} size="lg" onPress={onSignIn} />
          )}
          <SegmentedChips value={lang} onChange={onLang} options={langOptions} testID="home-lang" />
        </Row>
      </Row>

      <Text variant="title" weight="600" testID="home-greeting" className="mt-4">
        {name ? t('home.greeting', { name: iso(name) }) : t('home.greetingPlain')}
      </Text>

      {/* ------------------------------------------------------- countdown hero */}
      {/* Hazard, not hi-vis: a date closing in is a warning, and the yellow on this screen
          belongs to the one action. Tapping it opens the papers it is counting down to. */}
      <Card
        testID="home-hero"
        onPress={onOpenTests}
        accessibilityLabel={heroLabel}
        className="mt-4"
        style={startEdge(d.isRTL, 'hazard')}
      >
        <Kicker color="hazard">{t('home.examIn')}</Kicker>
        <Row gap={2} align="baseline" className="mt-2">
          <Num variant="display" color="hivis" testID="home-days">
            {daysToExam}
          </Num>
          <Text variant="bodyLg" color="dim">
            {t('home.days')}
          </Text>
        </Row>
        <Text variant="caption" color="dim" testID="home-exam-date" className="mt-1">
          {t('home.examDate', { label: examLabel, date: iso(examDate) })}
        </Text>
        {/* Not a control: a run of practice is a fact about the reader. Hidden at zero — a
            "0-day streak" is a scold, not a fact worth a line. */}
        {streakDays > 0 && (
          <Text variant="caption" color="dim" testID="home-streak" className="mt-1">
            {t('home.streak', { count: streakDays })}
          </Text>
        )}

        <View className="mt-4 h-px bg-line2" />
        <Row align="center" justify="between" gap={3} className="mt-3">
          <Kicker>{t('home.todayTarget')}</Kicker>
          <Text variant="caption" color="dim" testID="home-target-count">
            {t('home.targetDone', { done: iso(today.done), target: iso(today.target) })}
          </Text>
        </Row>
        <View className="mt-2">
          <TargetBar done={today.done} target={today.target} />
        </View>
      </Card>

      {/* ------------------------------------------------------------- continue */}
      {continueItem && (
        <Card testID="home-continue" className="mt-3">
          <Kicker>{continueKicker}</Kicker>
          <Text variant="subtitle" weight="700" className="mt-2" testID="home-continue-title">
            {continueItem.title}
          </Text>
          <Row gap={2} align="baseline" wrap className="mt-2">
            {continueItem.kind === 'mock' ? (
              <>
                <Measure
                  testID="home-continue-answered"
                  value={continueItem.answered}
                  unit={t('common.questionsUnit')}
                />
                <Glyph variant="caption" color="mute">
                  ·
                </Glyph>
                <Duration testID="home-continue-left" seconds={continueItem.remainingSec} />
              </>
            ) : (
              <Measure
                testID="home-continue-minutes"
                value={continueItem.minutes}
                unit={t('common.minutesUnit')}
              />
            )}
          </Row>
          {/* The screen's single hi-vis action: whatever "next" happens to be today. */}
          <Button
            testID="home-continue-action"
            size="lg"
            label={continueAction}
            onPress={onContinue}
            className="mt-4"
          />
        </Card>
      )}

      {/* -------------------------------------------------------------- updates */}
      <View testID="home-updates" className="mt-6">
        <SectionHead
          title={t('home.updates')}
          link={t('home.allUpdates')}
          onPress={onOpenUpdates}
          testID="home-updates-all"
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-3"
          // A row inside the scroller rather than `contentContainerStyle`: `Row` is what
          // knows the reading direction, so Urdu gets the newest notice on the right.
        >
          <Row gap={2}>
            {notices.map((notice) => (
              <NoticeCard key={notice.id} notice={notice} lang={lang} onPress={onOpenUpdates} />
            ))}
          </Row>
        </ScrollView>
      </View>

      {/* --------------------------------------------------------- physical test */}
      <Card testID="home-physical" className="mt-6">
        <Kicker>{t('home.physical')}</Kicker>
        <Text variant="bodyLg" weight="600" className="mt-2">
          {t('home.physicalSub')}
        </Text>
        {/* Outlined, not filled: the card's own primary action, but the screen keeps one
            yellow and it belongs to Continue. */}
        <Button
          testID="home-physical-action"
          variant="secondary"
          label={t('home.checkEligibility')}
          onPress={onOpenPhysical}
          className="mt-4"
        />
      </Card>

      {/* --------------------------------------------------------------- affairs */}
      <View testID="home-affairs" className="mt-6">
        <SectionHead
          title={t('home.affairs')}
          link={t('home.more')}
          onPress={onOpenAffairs}
          testID="home-affairs-more"
        />
        <Stack gap={2} className="mt-3">
          {affairs.map((affair) => (
            <AffairRow key={affair.id} affair={affair} lang={lang} onPress={onOpenAffairs} />
          ))}
        </Stack>
      </View>

      {/* -------------------------------------------------------------- progress */}
      <View testID="home-progress" className="mt-6">
        <Kicker>{t('home.progress')}</Kicker>
        <Row gap={2} align="stretch" className="mt-3">
          <StatTile
            testID="home-progress-topics"
            value={`${progress.topicsRead}/${progress.topicsTotal}`}
            label={t('home.topicsRead')}
            empty={progress.topicsRead === 0}
          />
          <StatTile
            testID="home-progress-papers"
            value={String(progress.papers)}
            label={t('home.papersPractised')}
            empty={progress.papers === 0}
          />
          <StatTile
            testID="home-progress-best"
            value={progress.bestScore === undefined ? '—' : String(progress.bestScore)}
            label={t('home.bestScore')}
            empty={progress.bestScore === undefined}
          />
        </Row>
        {/* The tiles are the same for a guest; only the warning that they live on this one
            handset is added. Nothing here is withheld. */}
        {!signedIn && (
          <Text variant="caption" color="dim" testID="home-progress-nudge" className="mt-2">
            {t('home.signInToKeep')}
          </Text>
        )}
      </View>
    </Screen>
  );
}

/** One notice on the horizontal shelf: what kind it is, when, and what it says. */
function NoticeCard({
  notice,
  lang,
  onPress,
}: {
  notice: HomeNotice;
  lang: Lang;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const { pressed, handlers } = usePressed();
  return (
    <Pressable
      testID="home-notice"
      accessibilityRole="button"
      android_ripple={{ color: colors.hivisTint3 }}
      onPress={onPress}
      {...handlers}
      className="justify-start rounded-md border border-line bg-panel2 p-3"
      // Width and radius live in the flattened object so css-interop cannot drop them; the
      // press delta comes from state, never a `style` callback (see `usePressed`).
      style={StyleSheet.flatten([
        { width: NOTICE_W, borderRadius: radius.md },
        pressed ? { opacity: 0.85 } : null,
      ])}
    >
      <Row gap={2} align="center" justify="between">
        {/* Outlined, like every other badge on the screen: the kind is a label to read, not
            a state to react to. */}
        <Chip label={t(`home.kind.${notice.kind}`)} />
        <Num variant="caption" weight="600" color="dim">
          {shortDate(notice.date)}
        </Num>
      </Row>
      <Text variant="body" weight="600" numberOfLines={3} className="mt-2">
        {notice.title[lang]}
      </Text>
    </Pressable>
  );
}

/** One line of today's news: where it happened, what happened, when. */
function AffairRow({
  affair,
  lang,
  onPress,
}: {
  affair: HomeAffair;
  lang: Lang;
  onPress: () => void;
}) {
  const { t } = useTranslation();
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
        ...startEdge(d.isRTL, 'sand'),
      }}
    >
      <Pressable
        testID="home-affair"
        accessibilityRole="button"
        android_ripple={{ color: colors.hivisTint3 }}
        onPress={onPress}
        {...handlers}
        className="min-h-touch justify-center p-3"
        style={pressed ? { opacity: 0.85 } : undefined}
      >
        <Row gap={2} align="baseline" justify="between">
          <Kicker color="sand">{t(`home.cat.${affair.category}`)}</Kicker>
          <Num variant="caption" weight="600" color="dim">
            {shortDate(affair.date)}
          </Num>
        </Row>
        <Text variant="body" color="chalk2" numberOfLines={2} className="mt-1">
          {affair.headline[lang]}
        </Text>
      </Pressable>
    </View>
  );
}
