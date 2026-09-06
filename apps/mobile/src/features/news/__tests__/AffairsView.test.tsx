import { render, screen, userEvent, within } from '@testing-library/react-native';
import { tracking } from '@tslprb/design-tokens';
import { AFFAIRS, latestAffairs, type Affair } from '@tslprb/fixtures';
import { initI18n } from '@tslprb/i18n';

import { iso } from '@/ui';

import { AffairsView, groupByDay } from '../AffairsView';

const FEED = latestAffairs();

const props = () => ({ affairs: FEED, lang: 'en' as const, onBack: jest.fn() });

const day = (date: string, id: string): Affair =>
  ({ id, date, category: 'india', headline: {}, summary: {} }) as unknown as Affair;

describe('groupByDay', () => {
  it('cuts a sorted feed into one group per day', () => {
    const groups = groupByDay([
      day('2026-09-02', 'a'),
      day('2026-09-02', 'b'),
      day('2026-09-01', 'c'),
    ]);
    expect(groups.map((g) => g.date)).toEqual(['2026-09-02', '2026-09-01']);
    expect(groups[0].items.map((i) => i.id)).toEqual(['a', 'b']);
    expect(groups[1].items).toHaveLength(1);
  });

  // Sorting belongs to `latestAffairs`. A day that comes back twice is a feed that was never
  // sorted, and showing it twice is the honest rendering of that — a silent merge would hide
  // the bug behind a screen that looks right.
  it('does not re-sort, and does not merge a day that appears twice', () => {
    const groups = groupByDay([
      day('2026-09-01', 'a'),
      day('2026-09-02', 'b'),
      day('2026-09-01', 'c'),
    ]);
    expect(groups.map((g) => g.date)).toEqual(['2026-09-01', '2026-09-02', '2026-09-01']);
  });

  it('has nothing to group when the feed is empty', () => {
    expect(groupByDay([])).toEqual([]);
  });
});

describe('AffairsView', () => {
  beforeAll(() => {
    initI18n('en');
  });

  it('prints every item under the day it belongs to', async () => {
    await render(<AffairsView {...props()} />);
    for (const affair of AFFAIRS) {
      expect(screen.getByTestId(`affair-card-${affair.id}`)).toBeOnTheScreen();
    }
    const first = screen.getByTestId('affairs-day-2026-09-02');
    expect(within(first).getByTestId('affair-card-af-metro-corridor')).toBeOnTheScreen();
    // Four items share 2 September; the item from the day before is not one of them.
    expect(within(first).queryByTestId('affair-card-af-water-grid')).toBeNull();
  });

  it('heads each group with its date, newest day first', async () => {
    await render(<AffairsView {...props()} />);
    expect(screen.getByTestId('affairs-date-2026-09-02')).toHaveTextContent(iso('2 Sep 2026'));
    expect(screen.getByTestId('affairs-date-2026-09-01')).toHaveTextContent(iso('1 Sep 2026'));
    expect(screen.getByTestId('affairs-date-2026-08-31')).toHaveTextContent(iso('31 Aug 2026'));
    expect(groupByDay(FEED).map((g) => g.date)).toEqual(['2026-09-02', '2026-09-01', '2026-08-31']);
  });

  it('tags each row with its category, in words from the locale file', async () => {
    await render(<AffairsView {...props()} />);
    expect(screen.getByTestId('affair-cat-af-metro-corridor')).toHaveTextContent('Telangana');
    expect(screen.getByTestId('affair-cat-af-rural-roads')).toHaveTextContent('India');
    expect(screen.getByTestId('affair-cat-af-climate-fund')).toHaveTextContent('World');
    expect(screen.getByTestId('affair-cat-af-junior-athletics')).toHaveTextContent('Sports');
    expect(screen.getByTestId('affair-cat-af-short-film-prize')).toHaveTextContent('Awards');
  });

  it('gives a card a headline and one sentence of summary', async () => {
    await render(<AffairsView {...props()} />);
    expect(screen.getByTestId('affair-headline-af-metro-corridor')).toHaveTextContent(
      'First stretch of the airport metro corridor opens',
    );
    expect(screen.getByTestId('affair-summary-af-metro-corridor')).toHaveTextContent(
      /Trains now run on the first elevated section/,
    );
  });

  // F-30 rules the category tone: a quiet pill, the same tag shape a notice's kind wears, and
  // no gold at all. Phase A had it as a dark-gold kicker that `sand` had collapsed onto the
  // primary accent, so "the info accent, never the primary one" no longer meant anything.
  it('tags each card with its category as a quiet pill, and spends no gold on it', async () => {
    await render(<AffairsView {...props()} />);
    const tag = screen.getByTestId('affair-cat-af-metro-corridor');
    expect(tag.props.className).toMatch(/\bbg-surface2\b/);
    expect(tag.props.className).not.toMatch(/\bbg-accent\b/);
    expect(tag.props.className).not.toMatch(/\bborder-accentStrong\b/);
    // The pill's label keeps the kicker's tracking, like every other label in the app.
    expect(within(tag).getByText('Telangana')).toHaveStyle({ letterSpacing: tracking.kicker });
  });

  // Home's affairs rows lost their edge in fix wave 1 (one gold-edged card per screen); this
  // list is one card of rows now, so there is nothing left to draw an edge on (F-30).
  it('carries no start edge on a row', async () => {
    await render(<AffairsView {...props()} />);
    expect(screen.getByTestId('affair-card-af-metro-corridor')).not.toHaveStyle({
      borderLeftWidth: 3,
    });
  });

  it('heads each day with the date in a quiet pill, in ink3', async () => {
    await render(<AffairsView {...props()} />);
    expect(screen.getByTestId('affairs-date-2026-09-02').props.className).toMatch(
      /\btext-ink3\b/,
    );
  });

  it('says so plainly when there is no digest yet', async () => {
    await render(<AffairsView affairs={[]} lang="en" onBack={jest.fn()} />);
    const empty = screen.getByTestId('affairs-empty');
    expect(empty).toHaveTextContent(/Nothing yet/);
    expect(empty).toHaveTextContent(/No current affairs yet\./);
    expect(empty.props.className).toMatch(/\bjustify-center\b/);
    expect(screen.queryByTestId('affairs-list')).toBeNull();
  });

  it('goes back from the header', async () => {
    const p = props();
    await render(<AffairsView {...p} />);
    await userEvent.press(screen.getByTestId('affairs-header-back'));
    expect(p.onBack).toHaveBeenCalledTimes(1);
  });

  // Seeded fixtures until the API serves `GET /affairs`: the header says so, quietly.
  it('marks the digest as sample data in the header, as a badge and not a button', async () => {
    await render(<AffairsView {...props()} />);
    const chip = within(screen.getByTestId('affairs-header')).getByTestId('sample-data');
    expect(chip).toHaveTextContent('Sample data');
    expect(chip.props.accessibilityRole).toBeUndefined();
    // A quiet `Pill` now, the same label shape the rest of the app names a block with.
    expect(chip.props.className).toMatch(/\bbg-surface2\b/);
    expect(chip.props.className).toMatch(/\brounded-full\b/);
  });
});

describe('AffairsView (te)', () => {
  it('reads the digest in the chosen language, not the UI default', async () => {
    await render(<AffairsView {...props()} lang="te" />);
    expect(screen.getByTestId('affair-headline-af-metro-corridor')).toHaveTextContent(
      'ఎయిర్‌పోర్ట్ మెట్రో కారిడార్ తొలి దశ ప్రారంభం',
    );
    expect(screen.queryByText('First stretch of the airport metro corridor opens')).toBeNull();
  });
});
