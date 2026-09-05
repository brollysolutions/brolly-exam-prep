import { act, render, screen, userEvent } from '@testing-library/react-native';
import { initI18n, setLanguage } from '@tslprb/i18n';

import { iso } from '@/ui';

import { WelcomeView } from '../WelcomeView';

describe('WelcomeView', () => {
  beforeAll(() => {
    initI18n('en');
  });

  it('renders all three slides behind the pager', async () => {
    await render(<WelcomeView onDone={jest.fn()} />);
    expect(screen.getByTestId('welcome-slide-1')).toBeOnTheScreen();
    expect(screen.getByTestId('welcome-slide-2')).toBeOnTheScreen();
    expect(screen.getByTestId('welcome-slide-3')).toBeOnTheScreen();
    expect(screen.getByText('Practise the real PWT')).toBeOnTheScreen();
    expect(screen.getByText(iso('1 / 3'))).toBeOnTheScreen();
  });

  it('offers Next until the last slide, then Get started', async () => {
    await render(<WelcomeView onDone={jest.fn()} />);
    expect(screen.getByTestId('welcome-primary')).toHaveTextContent('Next');
    await userEvent.press(screen.getByTestId('welcome-primary'));
    expect(screen.getByTestId('welcome-primary')).toHaveTextContent('Next');
    await userEvent.press(screen.getByTestId('welcome-primary'));
    expect(screen.getByTestId('welcome-primary')).toHaveTextContent('Get started');
  });

  it('finishes from the last slide', async () => {
    const onDone = jest.fn();
    await render(<WelcomeView initialSlide={3} onDone={onDone} />);
    expect(screen.getByTestId('welcome-primary')).toHaveTextContent('Get started');
    await userEvent.press(screen.getByTestId('welcome-primary'));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('lets you skip out from the first slide', async () => {
    const onDone = jest.fn();
    await render(<WelcomeView onDone={onDone} />);
    await userEvent.press(screen.getByTestId('welcome-skip'));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('shows the brand plate in the Latin face in every language', async () => {
    await render(<WelcomeView onDone={jest.fn()} />);
    expect(screen.getByText('PWT')).toHaveStyle({ fontFamily: 'Archivo_700Bold' });
  });
});

describe('WelcomeView (te)', () => {
  beforeAll(async () => {
    await act(async () => {
      await setLanguage('te');
    });
  });

  afterAll(async () => {
    await act(async () => {
      await setLanguage('en');
    });
  });

  it('renders the Telugu pages left-to-right and matches the snapshot', async () => {
    await render(<WelcomeView onDone={jest.fn()} />);
    expect(screen.getByText('నిజమైన PWT లాగే ప్రాక్టీస్')).toBeOnTheScreen();
    expect(screen.getByTestId('welcome-footer')).toHaveStyle({ flexDirection: 'row' });
    // The dots track physical page order, which is 1-2-3 in a left-to-right language.
    const hidden = { includeHiddenElements: true };
    expect(screen.getByTestId('welcome-dots', hidden)).toHaveStyle({ flexDirection: 'row' });
    expect(
      screen.getAllByTestId(/^welcome-dot-/, hidden).map((dot) => dot.props.testID),
    ).toEqual(['welcome-dot-1', 'welcome-dot-2', 'welcome-dot-3']);
    // The brand acronym never leaves the Latin face.
    expect(screen.getByText('PWT')).toHaveStyle({ fontFamily: 'Archivo_700Bold' });
    // Telugu is set on a 1.65 line-height: 23 px type on a 37.9 px line, one step to the subtitle.
    const title = screen.getByTestId('welcome-title-1');
    expect(title).toHaveStyle({
      fontSize: 23,
      lineHeight: 37.9,
      fontFamily: 'NotoSansTelugu_600SemiBold',
    });
    expect(title.props.className).toContain('mt-3');
    expect(screen.toJSON()).toMatchSnapshot();
  });
});
