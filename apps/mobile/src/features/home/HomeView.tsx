import type { Affair, Notice } from '@tslprb/fixtures';
import { LANGS, useDir, type Lang } from '@tslprb/i18n';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';

import { startEdge } from '@/features/result/edge';
import {
  Button,
  Card,
  Chip,
  cx,
  Glyph,
  iso,
  MarkerRow,
  Num,
  PageHeader,
  Pill,
  pressedClass,
  Row,
  Screen,
  SegmentedChips,
  Stack,
  StatTile,
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
 * Views, not SVG and not an arc: ten rounded blocks, which needs no dependency Expo Go would
 * have to be left for. Nothing animates, so there is nothing to gate under reduced motion —
 * the bar is simply drawn at the value it has.
 *
 * A lit block is `accentStrong` (3.4:1, the non-text gold); an unlit one is `line2`, because
 * `surface2` on the card was 1.05:1 and read as nothing at all.
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
          className={`h-progress flex-1 rounded-full ${i < filled ? 'bg-accentStrong' : 'bg-line2'}`}
        />
      ))}
    </Row>
  );
}

/**
 * A block's heading and the way past it: "Updates … All updates ›".
 *
 * The heading pill carries no dot: a dot is status in this app's vocabulary (mine / active),
 * and the name of a block is not a state (ruling M14). It carries no tag either — a heading
 * and a tag beside it read as one object, so "Sample data" lives on the Updates and Affairs
 * screens where the seeded content actually is (design review D3).
 *
 * The link grows its target with padding it gives back as negative margin, not with `hitSlop`:
 * `hitSlop` is not implemented in react-native-web, which left the link 18 px tall on the web
 * build (design review D6). Its label and chevron are ink, not gold: the screen has one
 * gold-edged card and one ink action, and gold is a fill here, never a word.
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
      <Pill label={title} className="flex-shrink" />
      <Pressable
        testID={testID}
        accessibilityRole="link"
        accessibilityLabel={link}
        onPress={onPress}
        {...handlers}
        // Padding for the finger, negative margin so the heading keeps its own baseline; the
        // pressed fill is `surface2`, because opacity is invisible between two creams.
        className={cx('-mx-1 -my-2 px-1 py-2', pressed && pressedClass)}
      >
        <Row gap={1} align="center">
          <Text variant="caption" weight="600">
            {link}
          </Text>
          <Glyph variant="caption" accessibilityElementsHidden importantForAccessibility="no">
            {d.chevronNext}
          </Glyph>
        </Row>
      </Pressable>
    </Row>
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
      <PageHeader
        brand
        brandTestID="home-brand"
        testID="home-header"
        titleTestID="home-greeting"
        title={name ? t('home.greeting', { name: iso(name) }) : t('home.greetingPlain')}
        trailing={
          <Row gap={2} align="center">
            {/* An outlined capsule, not a fill: signing in is not what this screen is for.
                `md`, not `lg`: at the Telugu face the lockup, the capsule and the switcher
                filled the row edge to edge with no slack left (design review D14). */}
            {!signedIn && (
              <Chip
                testID="home-signin"
                label={t('common.signIn')}
                size="md"
                shape="pill"
                onPress={onSignIn}
              />
            )}
            <SegmentedChips
              value={lang}
              onChange={onLang}
              options={langOptions}
              testID="home-lang"
            />
          </Row>
        }
      />

      {/* ------------------------------------------------------- countdown hero */}
      {/* The one gold-edged card on Home (the spec's start-edge gold). A fact, not a button:
          Tests is a tab already. */}
      <Card
        testID="home-hero"
        accessible
        accessibilityLabel={heroLabel}
        className="mt-7"
        style={startEdge(d.isRTL, 'accentStrong')}
      >
        {/* One rhythm, not six: the card used to carry `mt-1`, `mt-2`, `mt-3` and `mt-4` in
            a single column, so nothing lined up with anything (design review D15). The only
            margin left is the break before the rule. */}
        <Stack gap={2}>
          {examState === 'ahead' ? (
            <>
              <Pill label={t('home.examIn')} dot />
              <Row gap={2} align="baseline">
                {/* Ink, not gold: gold is a fill on cream, and the card's own edge is the gold. */}
                <Num variant="display" testID="home-days">
                  {daysToExam}
                </Num>
                <Text variant="bodyLg" color="ink3">
                  {t('home.days')}
                </Text>
              </Row>
            </>
          ) : (
            // No number on or after the day: "0 days" beside a past date reads as a stuck clock.
            <Text variant="subtitle" weight="700" testID="home-exam-state">
              {examLine}
            </Text>
          )}
          <Text variant="caption" color="ink3" testID="home-exam-date">
            {examState === 'held' ? examLabel : dateLine}
          </Text>
          {/* Not a control: a run of practice is a fact about the reader. Hidden at zero — a
              "0-day streak" is a scold, not a fact worth a line. */}
          {streakDays > 0 && <Pill testID="home-streak" label={streakLine} />}

          <View className="mt-4 h-px bg-line" />
          <Row align="center" justify="between" gap={3}>
            <Pill label={t('home.todayTarget')} />
            <Text variant="caption" color="ink3" testID="home-target-count">
              {targetLine}
            </Text>
          </Row>
          <TargetBar done={today.done} target={today.target} />
        </Stack>
      </Card>

      {/* -------------------------------------------------------------- updates */}
      {notices.length > 0 && (
        <View testID="home-updates" className="mt-7">
          <SectionHead
            title={t('home.updates')}
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
      <Card testID="home-physical" className="mt-7">
        <Pill label={t('home.physical')} />
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
        <View testID="home-affairs" className="mt-7">
          <SectionHead
            title={t('home.affairs')}
            link={t('home.more')}
            onPress={onOpenAffairs}
            testID="home-affairs-more"
          />
          {/* One card of rows, not three cards: the hero is Home's single gold-edged
              surface, and a stack of bordered boxes competed with it. */}
          <Card testID="home-affair-card" className="mt-3">
            {affairs.map((affair, i) => (
              <AffairRow
                key={affair.id}
                affair={affair}
                lang={lang}
                first={i === 0}
                onPress={onOpenAffairs}
              />
            ))}
          </Card>
        </View>
      )}

      {/* -------------------------------------------------------------- progress */}
      <View testID="home-progress" className="mt-7">
        <Pill label={t('home.progress')} />
        <Row gap={2} align="stretch" className="mt-3">
          <StatTile
            testID="home-progress-topics"
            value={`${progress.topicsRead}/${progress.topicsTotal}`}
            label={t('home.topicsRead')}
            empty={progress.topicsRead === 0}
          />
          <StatTile
            testID="home-progress-papers"
            value={progress.papers}
            label={t('home.papersPractised')}
            empty={progress.papers === 0}
          />
          {/* No value at all, not a zero: the tile draws its own dash in ink3. */}
          <StatTile
            testID="home-progress-best"
            value={progress.bestPct === undefined ? undefined : `${progress.bestPct}%`}
            label={t('home.bestScore')}
          />
        </Row>
        {/* The tiles are the same for a guest; only the warning that they live on this one
            handset is added. Nothing here is withheld. */}
        {!signedIn && (
          <Text variant="caption" color="ink3" testID="home-progress-nudge" className="mt-2">
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
  return (
    <Card
      testID="home-notice"
      onPress={onPress}
      // The width lives in the flattened object so css-interop cannot drop it (`Card` merges
      // it after its own shadow).
      style={{ width: NOTICE_W }}
    >
      <Row gap={2} align="center" justify="between">
        {/* A label to read, not a control: the kind must not out-shout the title under it. */}
        <Pill label={t(`updates.kind.${notice.kind}`)} />
        <Num variant="caption" weight="600" color="ink3">
          {shortDate(notice.date)}
        </Num>
      </Row>
      <Text variant="body" weight="600" numberOfLines={3} className="mt-2">
        {notice.title[lang]}
      </Text>
    </Card>
  );
}

/** One line of today's news: what happened, where, and when. */
function AffairRow({
  affair,
  lang,
  first,
  onPress,
}: {
  affair: Affair;
  lang: Lang;
  first: boolean;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const date = shortDate(affair.date);
  // The headline leads: the category and the date are what it was, not what it says. Two lines
  // of it, then the ellipsis — the list is a shelf, and the full story is on `/affairs`.
  // `trailingLabel` puts the date back into the row's name: a row that sets its own label
  // stops its children being read (code review I3, I5).
  return (
    <MarkerRow
      testID="home-affair"
      // No mark: a news item is not a to-do, and the gold dot said it was. `/affairs` already
      // draws these rows without one, so the shelf and the screen it links to now match
      // (design review D12).
      marker="none"
      first={first}
      title={affair.headline[lang]}
      titleLines={2}
      meta={t(`affairs.cat.${affair.category}`)}
      trailingLabel={date}
      trailing={
        <Num variant="caption" weight="600" color="ink3">
          {date}
        </Num>
      }
      onPress={onPress}
    />
  );
}
