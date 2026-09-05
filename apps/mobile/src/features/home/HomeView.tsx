import { colors, radius } from '@tslprb/design-tokens';
import type { Affair, Notice } from '@tslprb/fixtures';
import { LANGS, useDir, type Lang } from '@tslprb/i18n';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { startEdge } from '@/features/result/edge';
import {
  Brand,
  Button,
  Card,
  Chip,
  Glyph,
  iso,
  Kicker,
  Num,
  Row,
  Screen,
  SegmentedChips,
  Stack,
  Text,
  usePressed,
} from '@/ui';

import { shortDate } from './dates';

export type HomeProgress = {
  topicsRead: number;
  topicsTotal: number;
  papers: number;
  /**
   * The best paper as a percentage of its marks (0–100), already rounded. A percentage and
   * not a score, because the papers do not share a scale (200, 40, 20 or 15 marks). Absent
   * until a paper has been scored — a different thing from zero, drawn differently.
   */
  bestPct?: number;
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
 *
 * An unlit block is `line3`: `panel3` on the card was 1.14:1 and read as nothing at all.
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
          className={`h-progress flex-1 rounded-xs ${i < filled ? 'bg-hivis' : 'bg-line3'}`}
        />
      ))}
    </Row>
  );
}

/**
 * A block's heading and the way past it: "Updates · Sample data … All updates ›".
 *
 * The link is 20 px of text with 16 px of hit slop above and below rather than a 48 px box:
 * a half-height control beside a kicker would push the heading off its own baseline, and
 * the slop is what the finger actually lands in. Its label is `chalk2`, not yellow: the
 * screen has one yellow action and the chevron is enough to say "this goes somewhere".
 *
 * `badge` is a static tag after the title — "Sample data" while the shelf is seeded from
 * fixtures. It sits inside the heading `Row`, so it follows the reading direction and lands
 * at the reading end without a mirrored class of its own.
 */
function SectionHead({
  title,
  badge,
  badgeTestID,
  link,
  onPress,
  testID,
}: {
  title: string;
  badge?: string;
  badgeTestID?: string;
  link: string;
  onPress: () => void;
  testID: string;
}) {
  const d = useDir();
  const { pressed, handlers } = usePressed();
  return (
    <Row align="center" justify="between" gap={3}>
      <Row align="center" gap={2} className="flex-1" wrap>
        <Kicker>{title}</Kicker>
        {badge !== undefined && <Chip label={badge} tone="label" testID={badgeTestID} />}
      </Row>
      <Pressable
        testID={testID}
        accessibilityRole="link"
        accessibilityLabel={link}
        hitSlop={{ top: 16, bottom: 16, left: 12, right: 12 }}
        onPress={onPress}
        {...handlers}
        style={pressed ? { opacity: 0.85 } : undefined}
      >
        <Row gap={1} align="center">
          <Text variant="caption" weight="600" color="chalk2">
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
  /**
   * Days until the notified PWT date: positive before it, zero on the day, negative after
   * it. The hero counts down, says "exam day", or says when the paper was held.
   */
  daysToExam: number;
  /** That date as digits, `DD-MM-YYYY` — see `fullDate`. */
  examDate: string;
  /** The exam's own name in the reading language, from `EXAM_INFO.label`. */
  examLabel: string;
  streakDays: number;
  /** Today's work against the day's target; `done` may exceed `target`. */
  today: { done: number; target: number };
  /** Newest first. An empty shelf is not drawn at all — not even its heading. */
  notices: Notice[];
  affairs: Affair[];
  progress: HomeProgress;
  onSignIn: () => void;
  onOpenUpdates: () => void;
  /** A tapped notice card opens THAT notice on `/updates`, not the top of the list. */
  onOpenNotice: (id: string) => void;
  onOpenPhysical: () => void;
  onOpenAffairs: () => void;
};

/**
 * F-23 — Home v3.
 *
 * The tab bar already carries Study and Tests, so the screen stops repeating them and answers
 * the questions only a home screen can: how long have I got, what has the board said, do I
 * clear the physical, what happened today, and how far along am I.
 * One hi-vis action — "Check eligibility" — the one place on the screen the tab bar cannot
 * take a candidate. (The Continue card was removed at the user's request, 2026-09-03.)
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
  notices,
  affairs,
  progress,
  onSignIn,
  onOpenUpdates,
  onOpenNotice,
  onOpenPhysical,
  onOpenAffairs,
}: HomeViewProps) {
  const { t } = useTranslation();
  const d = useDir();
  const langOptions = LANGS.map((l: Lang) => ({ value: l, label: t(`lang.${l}Short`), lang: l }));

  /**
   * The notice shelf is a reversed `Row` inside a scroller whose origin is its LEFT edge
   * (the app never calls `I18nManager.forceRTL`), so under RTL the newest notice sits at the
   * right and off-screen. The shelf is scrolled to its end once its content is measured.
   */
  const shelf = useRef<ScrollView>(null);

  // The three ways the hero can read: counting down, on the day, or after it.
  const examState =
    daysToExam > 0 ? 'ahead' : daysToExam === 0 ? 'today' : ('held' as 'ahead' | 'today' | 'held');
  const examLine =
    examState === 'ahead'
      ? t('home.examCountdown', { days: iso(daysToExam) })
      : examState === 'today'
        ? t('home.examToday')
        : t('home.examHeld', { date: iso(examDate) });
  const dateLine = t('home.examDate', { label: examLabel, date: iso(examDate) });
  const streakLine = t('home.streak', { count: streakDays, days: iso(streakDays) });
  const targetLine = t('home.targetDone', { done: iso(today.done), target: iso(today.target) });

  /**
   * The hero is read as ONE element, so its label is read INSTEAD of the lines inside it —
   * which means the label has to carry every fact the card is made of, or the date and the
   * day's target are invisible to anyone not looking at them.
   */
  const heroLabel = [
    examLine,
    examState === 'held' ? examLabel : dateLine,
    ...(streakDays > 0 ? [streakLine] : []),
    targetLine,
  ].join(' · ');

  return (
    <Screen scroll padded bottomInset={false} testID="home-screen">
      <Row testID="home-header" align="center" justify="between" gap={2} wrap className="mt-4">
        <Brand testID="home-brand" />
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
      {/* The one gold-edged card on Home (the spec's start-edge gold). A fact, not a button:
          Tests is a tab already. */}
      <Card
        testID="home-hero"
        accessible
        accessibilityLabel={heroLabel}
        className="mt-4"
        style={startEdge(d.isRTL, 'accentStrong')}
      >
        {examState === 'ahead' ? (
          <>
            <Kicker color="hazard">{t('home.examIn')}</Kicker>
            <Row gap={2} align="baseline" className="mt-2">
              <Num variant="display" color="hivis" testID="home-days">
                {daysToExam}
              </Num>
              <Text variant="bodyLg" color="dim">
                {t('home.days')}
              </Text>
            </Row>
          </>
        ) : (
          // No number on or after the day: "0 days" next to a past date reads as a stuck clock.
          <Text variant="subtitle" weight="700" color="hivis" testID="home-exam-state">
            {examLine}
          </Text>
        )}
        <Text variant="caption" color="dim" testID="home-exam-date" className="mt-1">
          {examState === 'held' ? examLabel : dateLine}
        </Text>
        {/* Not a control: a run of practice is a fact about the reader. Hidden at zero — a
            "0-day streak" is a scold, not a fact worth a line. */}
        {streakDays > 0 && (
          <Text variant="caption" color="dim" testID="home-streak" className="mt-1">
            {streakLine}
          </Text>
        )}

        <View className="mt-4 h-px bg-line" />
        <Row align="center" justify="between" gap={3} className="mt-3">
          <Kicker>{t('home.todayTarget')}</Kicker>
          <Text variant="caption" color="dim" testID="home-target-count">
            {targetLine}
          </Text>
        </Row>
        <View className="mt-2">
          <TargetBar done={today.done} target={today.target} />
        </View>
      </Card>

      {/* -------------------------------------------------------------- updates */}
      {notices.length > 0 && (
        <View testID="home-updates" className="mt-6">
          <SectionHead
            title={t('home.updates')}
            badge={t('common.sampleData')}
            badgeTestID="sample-data-updates"
            link={t('home.allUpdates')}
            onPress={onOpenUpdates}
            testID="home-updates-all"
          />
          <ScrollView
            ref={shelf}
            testID="home-updates-shelf"
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mt-3"
            onContentSizeChange={() => {
              if (d.isRTL) shelf.current?.scrollToEnd({ animated: false });
            }}
            // A row inside the scroller rather than `contentContainerStyle`: `Row` is what
            // knows the reading direction, so RTL gets the newest notice on the right.
          >
            <Row gap={2}>
              {notices.map((notice) => (
                <NoticeCard
                  key={notice.id}
                  notice={notice}
                  lang={lang}
                  onPress={() => onOpenNotice(notice.id)}
                />
              ))}
            </Row>
          </ScrollView>
        </View>
      )}

      {/* --------------------------------------------------------- physical test */}
      <Card testID="home-physical" className="mt-6">
        <Kicker>{t('home.physical')}</Kicker>
        <Text variant="bodyLg" weight="600" className="mt-2">
          {t('home.physicalSub')}
        </Text>
        {/* The screen's one hi-vis action: the only block whose destination is not already a
            tab, so it is the one thing Home has to say "go here" about — at the primary size. */}
        <Button
          testID="home-physical-action"
          size="lg"
          label={t('home.checkEligibility')}
          onPress={onOpenPhysical}
          className="mt-4"
        />
      </Card>

      {/* --------------------------------------------------------------- affairs */}
      {affairs.length > 0 && (
        <View testID="home-affairs" className="mt-6">
          <SectionHead
            title={t('home.affairs')}
            badge={t('common.sampleData')}
            badgeTestID="sample-data-affairs"
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
      )}

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
            value={progress.bestPct === undefined ? '—' : `${progress.bestPct}%`}
            label={t('home.bestScore')}
            empty={progress.bestPct === undefined}
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
  notice: Notice;
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
        {/* A tag, not a chip: the kind is a label to read, and it must not out-shout the
            title under it. */}
        <Chip label={t(`updates.kind.${notice.kind}`)} tone="label" />
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
  affair: Affair;
  lang: Lang;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const { pressed, handlers } = usePressed();
  // No start edge: the hero is Home's one gold-edged card (fix wave 1, D9); Phase B folds
  // these rows into one surface card of marker rows.
  return (
    <View
      testID="home-affair-card"
      style={{
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.line,
        backgroundColor: colors.panel2,
        overflow: 'hidden',
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
          <Kicker color="sand">{t(`affairs.cat.${affair.category}`)}</Kicker>
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
