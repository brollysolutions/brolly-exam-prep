import { render, screen, userEvent, within } from '@testing-library/react-native';
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

  it('kickers each card with its category, in words from the locale file', async () => {
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

  it('keeps the category kicker sand — the info accent, never the primary one', async () => {
    await render(<AffairsView {...props()} />);
    expect(screen.getByTestId('affair-cat-af-metro-corridor').props.className).toContain(
      'text-sand',
    );
  });

  it('says so plainly when there is no digest yet', async () => {
    await render(<AffairsView affairs={[]} lang="en" onBack={jest.fn()} />);
    expect(screen.getByTestId('affairs-empty')).toHaveTextContent('No current affairs yet.');
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
    expect(chip.props.className).not.toContain('bg-hivis');
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
