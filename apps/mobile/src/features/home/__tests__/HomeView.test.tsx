import { act, render, screen, userEvent } from '@testing-library/react-native';
import { initI18n, setLanguage } from '@tslprb/i18n';

import { iso } from '@/ui';

import { HomeView } from '../HomeView';

const props = {
  name: '…1234',
  signedIn: true,
  daysToExam: 45,
  streakDays: 4,
  onLang: jest.fn(),
  onSignIn: jest.fn(),
  onStudy: jest.fn(),
  onPreviousPapers: jest.fn(),
  onStartMock: jest.fn(),
};

/** F-19 — nobody has signed in yet, so there is no number to greet. */
const guest = { ...props, name: undefined, signedIn: false };

/** The three ways off the screen, read in tree order. */
const optionIds = () =>
  screen.getAllByTestId(/^home-(study|previous|next-mock)$/).map((node) => node.props.testID);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('HomeView', () => {
  beforeAll(() => {
    initI18n('en');
  });

  it('greets the signed-in number and counts down to the exam', async () => {
    await render(<HomeView {...props} lang="en" />);
    expect(screen.getByTestId('home-greeting')).toHaveTextContent(`Ready, ${iso('…1234')}?`);
    expect(screen.getByTestId('home-countdown')).toHaveTextContent(`${iso('45')} days to PWT`);
    expect(screen.getByTestId('home-streak')).toHaveTextContent('4-day streak');
  });

  it('falls back to a name-less greeting when there is no number on file', async () => {
    await render(<HomeView {...props} name={undefined} lang="en" />);
    expect(screen.getByTestId('home-greeting')).toHaveTextContent('Ready?');
  });

  it('offers the way in only while there is nobody signed in', async () => {
    await render(<HomeView {...props} lang="en" />);
    expect(screen.queryByTestId('home-signin')).toBeNull();
  });

  // F-20 — read, rehearse, sit. The mock is last because the other two lead to it, and it is
  // the only one wearing the yellow.
  it('offers three ways on, in the order a candidate reaches for them', async () => {
    await render(<HomeView {...props} lang="en" />);
    expect(optionIds()).toEqual(['home-study', 'home-previous', 'home-next-mock']);
    expect(screen.getByTestId('home-study')).toHaveTextContent(/Study material/);
    expect(screen.getByTestId('home-previous')).toHaveTextContent(/Previous question papers/);
    expect(screen.getByTestId('home-next-mock')).toHaveTextContent(/Mock test/);
  });

  it('gives each option its reason and a 64 px row', async () => {
    await render(<HomeView {...props} lang="en" />);
    const study = screen.getByTestId('home-study');
    expect(study).toHaveTextContent(/Notes for every section/);
    expect(study.props.className).toContain('min-h-16');
    const previous = screen.getByTestId('home-previous');
    expect(previous).toHaveTextContent(/PWT 2022, 2018 · practise or view/);
    expect(previous.props.className).toContain('min-h-16');
  });

  it('opens the study shelf and the previous papers from their own rows', async () => {
    await render(<HomeView {...props} lang="en" />);
    await userEvent.press(screen.getByTestId('home-study'));
    expect(props.onStudy).toHaveBeenCalledTimes(1);
    await userEvent.press(screen.getByTestId('home-previous'));
    expect(props.onPreviousPapers).toHaveBeenCalledTimes(1);
  });

  // Pointing the screen's one hi-vis action at a locked paper would make it a dead end.
  it('pitches a full mock the candidate can actually sit', async () => {
    await render(<HomeView {...props} lang="en" />);
    expect(screen.getByText('PWT Full Mock 07')).toBeOnTheScreen();
    expect(screen.queryByText('PWT Full Mock 08')).toBeNull();
    expect(screen.getByText(iso('40'))).toBeOnTheScreen();
    expect(screen.getByText(iso('60'))).toBeOnTheScreen();
  });

  it('reads a practice run as a fact, not a button', async () => {
    await render(<HomeView {...props} lang="en" />);
    expect(screen.getByTestId('home-streak').props.accessibilityRole).toBeUndefined();
  });

  it('starts the mock from the single primary action', async () => {
    await render(<HomeView {...props} lang="en" />);
    await userEvent.press(screen.getByTestId('home-start'));
    expect(props.onStartMock).toHaveBeenCalledTimes(1);
  });

  // F-20 dropped both: a score with nothing behind it, and a topic list nothing yet feeds.
  it('no longer reports a last score or a weak-topics list', async () => {
    await render(<HomeView {...props} lang="en" />);
    expect(screen.queryByTestId('home-last-score')).toBeNull();
    expect(screen.queryByTestId('home-score')).toBeNull();
    expect(screen.queryByTestId('home-weak-topics')).toBeNull();
    expect(screen.queryByText('Last score')).toBeNull();
    expect(screen.queryByText('Weak topics')).toBeNull();
  });

  it('switches language from the header', async () => {
    await render(<HomeView {...props} lang="en" />);
    await userEvent.press(screen.getByLabelText('తె'));
    expect(props.onLang).toHaveBeenCalledWith('te');
  });
});

// F-19 — the dashboard is the app's front door, so it has to stand up with no account.
describe('HomeView (guest)', () => {
  beforeAll(() => {
    initI18n('en');
  });

  it('greets nobody in particular and shows the whole screen anyway', async () => {
    await render(<HomeView {...guest} lang="en" />);
    expect(screen.getByTestId('home-greeting')).toHaveTextContent('Ready?');
    expect(screen.getByTestId('home-options')).toBeOnTheScreen();
    expect(optionIds()).toEqual(['home-study', 'home-previous', 'home-next-mock']);
  });

  it('puts a quiet way in beside the language switcher', async () => {
    await render(<HomeView {...guest} lang="en" />);
    const chip = screen.getByTestId('home-signin');
    expect(chip).toHaveTextContent('Sign in');
    // The screen keeps one hi-vis action, and it is not this one.
    expect(chip.props.className).not.toContain('bg-hivis');
    // 48 px, so it stands level with the language switcher it sits beside.
    expect(chip.props.className).toContain('h-touch');
    await userEvent.press(chip);
    expect(guest.onSignIn).toHaveBeenCalledTimes(1);
  });

  it('lets a guest into both shelves without asking for anything', async () => {
    await render(<HomeView {...guest} lang="en" />);
    await userEvent.press(screen.getByTestId('home-study'));
    await userEvent.press(screen.getByTestId('home-previous'));
    expect(guest.onStudy).toHaveBeenCalledTimes(1);
    expect(guest.onPreviousPapers).toHaveBeenCalledTimes(1);
  });

  it('still starts the mock — the gate lives behind the press, not in front of it', async () => {
    await render(<HomeView {...guest} lang="en" />);
    await userEvent.press(screen.getByTestId('home-start'));
    expect(guest.onStartMock).toHaveBeenCalledTimes(1);
  });
});

describe('HomeView (ur)', () => {
  beforeAll(async () => {
    await act(async () => {
      await setLanguage('ur');
    });
  });

  afterAll(async () => {
    await act(async () => {
      await setLanguage('en');
    });
  });

  it('mirrors the header, keeps the count LTR, and matches the snapshot', async () => {
    await render(<HomeView {...props} lang="ur" />);
    expect(screen.getByTestId('home-header')).toHaveStyle({ flexDirection: 'row-reverse' });
    expect(screen.getByTestId('home-mock-questions')).toHaveStyle({
      flexDirection: 'row-reverse',
    });
    expect(screen.getByText('پی ڈبلیو ٹی فل ماک 07')).toBeOnTheScreen();
    expect(screen.getByText(iso('40'))).toHaveStyle({ fontFamily: 'Archivo_600SemiBold' });
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('mirrors the option rows and keeps the chevron in the Latin face', async () => {
    await render(<HomeView {...props} lang="ur" />);
    expect(screen.getByTestId('home-study')).toHaveTextContent(/اسٹڈی میٹریل/);
    // Nastaliq has no U+2039, so the mirrored chevron has to render in Archivo or it is tofu.
    // Hidden from the a11y tree on purpose, so the query has to ask for it explicitly.
    const chevrons = screen.getAllByText('‹', { includeHiddenElements: true });
    expect(chevrons.length).toBe(2);
    expect(chevrons[0]).toHaveStyle({ fontFamily: 'Archivo_400Regular' });
  });

  // The guest header carries one more control, so it has to mirror with the rest of the row.
  it('mirrors the header the sign-in link sits in', async () => {
    await render(<HomeView {...guest} lang="ur" />);
    expect(screen.getByTestId('home-signin')).toHaveTextContent('سائن ان');
    expect(screen.getByTestId('home-header')).toHaveStyle({ flexDirection: 'row-reverse' });
  });
});
