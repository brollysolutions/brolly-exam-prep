import { act, render, screen, userEvent } from '@testing-library/react-native';
import { initI18n, setLanguage } from '@tslprb/i18n';

import { iso } from '@/ui';

import { HomeView } from '../HomeView';

const props = {
  name: '…1234',
  daysToExam: 45,
  streakDays: 4,
  onLang: jest.fn(),
  onStartMock: jest.fn(),
  onWeakTopic: jest.fn(),
};

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

  it('gives each weak topic its reason and a 64 px row', async () => {
    await render(<HomeView {...props} lang="en" />);
    const row = screen.getByTestId('home-topic-drill-blood');
    expect(row).toHaveTextContent(/12 minutes · 3 wrong yesterday/);
    expect(row.props.className).toContain('min-h-16');
  });

  it('starts the mock from the single primary action', async () => {
    await render(<HomeView {...props} lang="en" />);
    await userEvent.press(screen.getByTestId('home-start'));
    expect(props.onStartMock).toHaveBeenCalledTimes(1);
  });

  it('renders the last score and its verdict', async () => {
    await render(<HomeView {...props} lang="en" />);
    expect(screen.getByTestId('home-score')).toHaveTextContent(iso('62.25'));
    expect(screen.getByText('Qualified')).toBeOnTheScreen();
  });

  it('opens a weak topic', async () => {
    await render(<HomeView {...props} lang="en" />);
    await userEvent.press(screen.getByTestId('home-topic-drill-blood'));
    expect(props.onWeakTopic).toHaveBeenCalledWith('drill-blood');
  });

  it('switches language from the header', async () => {
    await render(<HomeView {...props} lang="en" />);
    await userEvent.press(screen.getByLabelText('తె'));
    expect(props.onLang).toHaveBeenCalledWith('te');
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

  it('mirrors the header, keeps the score LTR, and matches the snapshot', async () => {
    await render(<HomeView {...props} lang="ur" />);
    expect(screen.getByTestId('home-header')).toHaveStyle({ flexDirection: 'row-reverse' });
    expect(screen.getByText('پی ڈبلیو ٹی فل ماک 07')).toBeOnTheScreen();
    expect(screen.getByTestId('home-score')).toHaveStyle({ fontFamily: 'Archivo_700Bold' });
    expect(screen.toJSON()).toMatchSnapshot();
  });
});
