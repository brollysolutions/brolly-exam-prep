import { act, render, screen, userEvent } from '@testing-library/react-native';
import { latestAffairs, latestNotices } from '@tslprb/fixtures';
import { initI18n, setLanguage } from '@tslprb/i18n';

import { iso } from '@/ui';

import { HomeView, targetFill, TARGET_SEGMENTS } from '../HomeView';

const props = {
  name: '…1234',
  signedIn: true,
  daysToExam: 45,
  examDate: '18-10-2026',
  examLabel: 'Preliminary Written Test',
  streakDays: 4,
  today: { done: 12, target: 20 },
  notices: latestNotices(3),
  affairs: latestAffairs(3),
  progress: { topicsRead: 5, topicsTotal: 11, papers: 3, bestScore: 62 },
  onLang: jest.fn(),
  onSignIn: jest.fn(),
  onOpenTests: jest.fn(),
  onOpenUpdates: jest.fn(),
  onOpenPhysical: jest.fn(),
  onOpenAffairs: jest.fn(),
};

/** F-19 — nobody has signed in yet, so there is no number to greet. */
const guest = { ...props, name: undefined, signedIn: false };

/**
 * RNTL matches a plain string against the WHOLE text content of a node, so one line of a card
 * has to be asked for as a pattern rather than as a string.
 */
const has = (text: string) => new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

/** How many blocks of the day's target bar are lit. */
const litSegments = () =>
  screen
    .getAllByTestId('home-target-seg')
    .filter((node) => String(node.props.className).includes('bg-hivis')).length;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('HomeView — countdown hero', () => {
  beforeAll(() => {
    initI18n('en');
  });

  it('counts the days down and names the paper they lead to', async () => {
    await render(<HomeView {...props} lang="en" />);
    expect(screen.getByTestId('home-days')).toHaveTextContent(iso('45'));
    expect(screen.getByTestId('home-exam-date')).toHaveTextContent(
      `Preliminary Written Test · ${iso('18-10-2026')}`,
    );
  });

  it('greets the signed-in number and reads the streak as a fact, not a button', async () => {
    await render(<HomeView {...props} lang="en" />);
    expect(screen.getByTestId('home-greeting')).toHaveTextContent(`Ready, ${iso('…1234')}?`);
    expect(screen.getByTestId('home-streak')).toHaveTextContent('4-day streak');
    expect(screen.getByTestId('home-streak').props.accessibilityRole).toBeUndefined();
  });

  // "0-day streak" is a scold, not a fact worth a line.
  it('drops the streak line when there is no streak', async () => {
    await render(<HomeView {...props} streakDays={0} lang="en" />);
    expect(screen.queryByTestId('home-streak')).toBeNull();
  });

  it('opens the papers it is counting down to', async () => {
    await render(<HomeView {...props} lang="en" />);
    await userEvent.press(screen.getByTestId('home-hero'));
    expect(props.onOpenTests).toHaveBeenCalledTimes(1);
  });

  // The hero is one button, so its label is read INSTEAD of the lines inside it: both facts
  // the card is made of have to be in there.
  it('says the whole card to a screen reader, which cannot see the layout', async () => {
    await render(<HomeView {...props} lang="en" />);
    expect(screen.getByTestId('home-hero').props.accessibilityLabel).toBe(
      `${iso('45')} days to PWT · ${iso('12')} of ${iso('20')} done`,
    );
  });
});

describe("HomeView — today's target", () => {
  beforeAll(() => {
    initI18n('en');
  });

  it('draws an empty bar before anything is done', async () => {
    await render(<HomeView {...props} today={{ done: 0, target: 20 }} lang="en" />);
    expect(screen.getAllByTestId('home-target-seg')).toHaveLength(TARGET_SEGMENTS);
    expect(litSegments()).toBe(0);
    expect(screen.getByTestId('home-target-count')).toHaveTextContent(
      `${iso('0')} of ${iso('20')} done`,
    );
  });

  it('draws half the bar at half the target', async () => {
    await render(<HomeView {...props} today={{ done: 10, target: 20 }} lang="en" />);
    expect(litSegments()).toBe(TARGET_SEGMENTS / 2);
  });

  it('fills the bar at the target', async () => {
    await render(<HomeView {...props} today={{ done: 20, target: 20 }} lang="en" />);
    expect(litSegments()).toBe(TARGET_SEGMENTS);
    expect(screen.getByTestId('home-target')).toHaveProp('accessibilityValue', {
      min: 0,
      max: 20,
      now: 20,
    });
  });

  it('never overflows the bar, and never over-reports to a screen reader', async () => {
    await render(<HomeView {...props} today={{ done: 31, target: 20 }} lang="en" />);
    expect(litSegments()).toBe(TARGET_SEGMENTS);
    expect(screen.getByTestId('home-target').props.accessibilityValue.now).toBe(20);
    // The count beside it stays honest, though: 31 answers is 31 answers.
    expect(screen.getByTestId('home-target-count')).toHaveTextContent(
      `${iso('31')} of ${iso('20')} done`,
    );
  });
});

describe('targetFill', () => {
  // The first answer of the day has to light something, or it reads as "that didn't count".
  it('lights one block for the first unit of work', () => {
    expect(targetFill(1, 20)).toBe(1);
  });

  it('is dark at nothing and full at the target', () => {
    expect(targetFill(0, 20)).toBe(0);
    expect(targetFill(20, 20)).toBe(TARGET_SEGMENTS);
    expect(targetFill(99, 20)).toBe(TARGET_SEGMENTS);
  });

  it('never divides by a target of zero', () => {
    expect(targetFill(5, 0)).toBe(0);
  });
});

describe('HomeView — the three shelves', () => {
  beforeAll(() => {
    initI18n('en');
  });

  // Newest first, and the chip is F-24's own `updates.kind.*` label, so a notice reads the
  // same word on this shelf as it does on `/updates`.
  it('shows the board’s notices with their kind and date', async () => {
    await render(<HomeView {...props} lang="en" />);
    const cards = screen.getAllByTestId('home-notice');
    expect(cards).toHaveLength(3);
    expect(cards[0]).toHaveTextContent(has('PMT / PET'));
    expect(cards[0]).toHaveTextContent(has(iso('24-10')));
    expect(cards[1]).toHaveTextContent(has('Hall ticket'));
    expect(cards[2]).toHaveTextContent(has('Exam date'));
  });

  it('offers the physical standards check without a paywall or a gate in front of it', async () => {
    await render(<HomeView {...guest} lang="en" />);
    expect(screen.getByTestId('home-physical')).toHaveTextContent(
      has('Do you meet the physical standards?'),
    );
    await userEvent.press(screen.getByTestId('home-physical-action'));
    expect(guest.onOpenPhysical).toHaveBeenCalledTimes(1);
  });

  // The Continue card went (2026-09-03), and the yellow it carried went to the one action left
  // that leads somewhere a candidate cannot reach from the tab bar.
  it('makes Check eligibility the screen’s only hi-vis action', async () => {
    await render(<HomeView {...props} lang="en" />);
    expect(screen.getByTestId('home-physical-action').props.className).toContain('bg-hivis');
    // The selected language chip is the one other yellow fill: a state, not an action.
    const yellow = screen
      .getAllByRole('button')
      .filter((node) => String(node.props.className).includes('bg-hivis'))
      .filter((node) => !node.props.accessibilityState?.selected);
    expect(yellow).toHaveLength(1);
  });

  it("shows today's affairs with their category", async () => {
    await render(<HomeView {...props} lang="en" />);
    const rows = screen.getAllByTestId('home-affair');
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent(has('Telangana'));
    expect(rows[1]).toHaveTextContent(has('India'));
    expect(rows[2]).toHaveTextContent(has('Sports'));
  });

  it('leads off each shelf to the list behind it', async () => {
    await render(<HomeView {...props} lang="en" />);
    await userEvent.press(screen.getByTestId('home-updates-all'));
    await userEvent.press(screen.getByTestId('home-affairs-more'));
    await userEvent.press(screen.getAllByTestId('home-notice')[0]);
    await userEvent.press(screen.getAllByTestId('home-affair')[0]);
    expect(props.onOpenUpdates).toHaveBeenCalledTimes(2);
    expect(props.onOpenAffairs).toHaveBeenCalledTimes(2);
  });
});

describe('HomeView — progress', () => {
  beforeAll(() => {
    initI18n('en');
  });

  it('counts topics read, papers sat and the best score', async () => {
    await render(<HomeView {...props} lang="en" />);
    expect(screen.getByTestId('home-progress-topics')).toHaveTextContent(
      `${iso('5/11')}Topics read`,
    );
    expect(screen.getByTestId('home-progress-papers')).toHaveTextContent(
      `${iso('3')}Papers practised`,
    );
    expect(screen.getByTestId('home-progress-best')).toHaveTextContent(`${iso('62')}Best score`);
  });

  // No paper sat is not a score of zero, and a tile that said "0" would be a worse lie the
  // longer it stood there.
  it('draws a dash where there is no best score yet', async () => {
    await render(
      <HomeView {...props} progress={{ topicsRead: 0, topicsTotal: 11, papers: 0 }} lang="en" />,
    );
    expect(screen.getByTestId('home-progress-best')).toHaveTextContent(has(iso('—')));
  });

  it('tells a guest where the numbers live, and shows them anyway', async () => {
    await render(<HomeView {...guest} lang="en" />);
    expect(screen.getByTestId('home-progress-topics')).toBeOnTheScreen();
    expect(screen.getByTestId('home-progress-nudge')).toHaveTextContent(
      'Sign in to keep this when you change phones',
    );
  });

  it('says nothing about signing in once someone has', async () => {
    await render(<HomeView {...props} lang="en" />);
    expect(screen.queryByTestId('home-progress-nudge')).toBeNull();
  });
});

describe('HomeView — guest', () => {
  beforeAll(() => {
    initI18n('en');
  });

  it('greets nobody in particular and shows the whole screen anyway', async () => {
    await render(<HomeView {...guest} lang="en" />);
    expect(screen.getByTestId('home-greeting')).toHaveTextContent('Ready?');
    expect(screen.getByTestId('home-hero')).toBeOnTheScreen();
    expect(screen.getByTestId('home-updates')).toBeOnTheScreen();
    expect(screen.getByTestId('home-physical')).toBeOnTheScreen();
    expect(screen.getByTestId('home-affairs')).toBeOnTheScreen();
    expect(screen.getByTestId('home-progress')).toBeOnTheScreen();
  });

  it('puts a quiet way in beside the language switcher', async () => {
    await render(<HomeView {...guest} lang="en" />);
    const chip = screen.getByTestId('home-signin');
    expect(chip).toHaveTextContent('Sign in');
    // The screen keeps one hi-vis action, and it is not this one.
    expect(chip.props.className).not.toContain('bg-hivis');
    expect(chip.props.className).toContain('h-touch');
    await userEvent.press(chip);
    expect(guest.onSignIn).toHaveBeenCalledTimes(1);
  });

  it('offers the way in only while there is nobody signed in', async () => {
    await render(<HomeView {...props} lang="en" />);
    expect(screen.queryByTestId('home-signin')).toBeNull();
  });

  it('switches language from the header', async () => {
    await render(<HomeView {...props} lang="en" />);
    await userEvent.press(screen.getByLabelText('తె'));
    expect(props.onLang).toHaveBeenCalledWith('te');
  });
});

// F-23 replaced the option cards: Study and Tests are tabs, and Home repeating them was the
// one thing on the screen that answered nothing.
describe('HomeView — what F-23 removed', () => {
  beforeAll(() => {
    initI18n('en');
  });

  it('no longer offers Study, Previous papers or a Mock card', async () => {
    await render(<HomeView {...props} lang="en" />);
    expect(screen.queryByTestId('home-study')).toBeNull();
    expect(screen.queryByTestId('home-previous')).toBeNull();
    expect(screen.queryByTestId('home-next-mock')).toBeNull();
    expect(screen.queryByTestId('home-start')).toBeNull();
    expect(screen.queryByText('Study material')).toBeNull();
    expect(screen.queryByText('Previous question papers')).toBeNull();
    expect(screen.queryByText('Mock test')).toBeNull();
  });

  // Removed at the user's request, 2026-09-03: the whole card, not one variant of it.
  it('no longer offers a Continue card of any kind', async () => {
    await render(<HomeView {...props} lang="en" />);
    expect(screen.queryByTestId('home-continue')).toBeNull();
    expect(screen.queryByTestId('home-continue-action')).toBeNull();
    expect(screen.queryByText('Still running')).toBeNull();
    expect(screen.queryByText('Continue reading')).toBeNull();
    expect(screen.queryByText('Start with')).toBeNull();
  });
});

describe('HomeView (ur)', () => {
  beforeAll(async () => {
    initI18n('en');
    await act(async () => {
      await setLanguage('ur');
    });
  });

  afterAll(async () => {
    await act(async () => {
      await setLanguage('en');
    });
  });

  it('mirrors the header, keeps the counts LTR, and matches the snapshot', async () => {
    await render(<HomeView {...props} lang="ur" />);
    expect(screen.getByTestId('home-header')).toHaveStyle({ flexDirection: 'row-reverse' });
    expect(screen.getByTestId('home-target')).toHaveStyle({ flexDirection: 'row-reverse' });
    expect(screen.getByTestId('home-days')).toHaveStyle({ fontFamily: 'Archivo_700Bold' });
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('keeps the shelf links in the Latin face, where the chevron has a glyph', async () => {
    await render(<HomeView {...props} lang="ur" />);
    expect(screen.getByTestId('home-updates-all')).toHaveTextContent(has('تمام اپ ڈیٹس'));
    // Nastaliq has no U+2039, so the mirrored chevron has to render in Archivo or it is tofu.
    const chevrons = screen.getAllByText('‹', { includeHiddenElements: true });
    expect(chevrons.length).toBe(2);
    expect(chevrons[0]).toHaveStyle({ fontFamily: 'Archivo_400Regular' });
  });
});
