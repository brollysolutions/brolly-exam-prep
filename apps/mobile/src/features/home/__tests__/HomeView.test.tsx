import { act, render, screen, userEvent } from '@testing-library/react-native';
import { initI18n, setLanguage } from '@tslprb/i18n';

import { HomeView } from '../HomeView';

/** `Num` isolates its content in LRI…PDI, so matching rendered digits needs the same wrapper. */
const iso = (value: string) => `⁦${value}⁩`;

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
    expect(screen.getByTestId('home-greeting')).toHaveTextContent('Ready, …1234?');
    expect(screen.getByTestId('home-countdown')).toHaveTextContent(`${iso('45')} days to PWT`);
    expect(screen.getByTestId('home-streak')).toHaveTextContent('4-day streak');
  });

  it('falls back to a name-less greeting when there is no number on file', async () => {
    await render(<HomeView {...props} name={undefined} lang="en" />);
    expect(screen.getByTestId('home-greeting')).toHaveTextContent('Ready?');
  });

  it('pitches the next full mock with its real size', async () => {
    await render(<HomeView {...props} lang="en" />);
    expect(screen.getByText('PWT Full Mock 08')).toBeOnTheScreen();
    expect(screen.getByText(iso('200'))).toBeOnTheScreen();
    expect(screen.getByText(iso('180'))).toBeOnTheScreen();
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
    expect(screen.getByText('پی ڈبلیو ٹی فل ماک 08')).toBeOnTheScreen();
    expect(screen.getByTestId('home-score')).toHaveStyle({ fontFamily: 'Archivo_700Bold' });
    expect(screen.toJSON()).toMatchSnapshot();
  });
});
