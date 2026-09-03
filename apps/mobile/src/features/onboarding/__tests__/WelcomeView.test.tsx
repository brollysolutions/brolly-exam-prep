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

describe('WelcomeView (ur)', () => {
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

  it('lays the pages out right-to-left and matches the snapshot', async () => {
    await render(<WelcomeView onDone={jest.fn()} />);
    expect(screen.getByText('اصل پی ڈبلیو ٹی کی مشق')).toBeOnTheScreen();
    // The footer mirrors like every other row…
    expect(screen.getByTestId('welcome-footer')).toHaveStyle({ flexDirection: 'row-reverse' });
    // …but the dots track physical page order: slide 1 is the right-most page, so the row
    // stays physically left-to-right and runs 3-2-1.
    const hidden = { includeHiddenElements: true };
    expect(screen.getByTestId('welcome-dots', hidden)).toHaveStyle({ flexDirection: 'row' });
    expect(
      screen.getAllByTestId(/^welcome-dot-/, hidden).map((dot) => dot.props.testID),
    ).toEqual(['welcome-dot-3', 'welcome-dot-2', 'welcome-dot-1']);
    // The brand acronym never falls back to Nastaliq.
    expect(screen.getByText('PWT')).toHaveStyle({ fontFamily: 'Archivo_700Bold' });
    // Nastaliq is set on a 2.05 line-height, and the title needs the room: 24 px type on a
    // 49 px line, with the wider step to the subtitle underneath it.
    const title = screen.getByTestId('welcome-title-1');
    expect(title).toHaveStyle({ fontSize: 24, lineHeight: 49.2 });
    expect(title.props.className).toContain('mt-6');
    expect(screen.toJSON()).toMatchSnapshot();
  });
});
