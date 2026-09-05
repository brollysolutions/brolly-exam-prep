import { act, fireEvent, render, screen, userEvent } from '@testing-library/react-native';
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

  // The copy sat at the top of a 506 px pager with 384 px of cream under it, because RN Web
  // wraps a horizontal list item in a content-height row and no `flexGrow` reaches through it
  // (design review D1). The pager measures itself and each slide takes that as a MINIMUM — a
  // fixed height would clip a Telugu slide that outgrows the box.
  it('gives each slide the pager’s own height, and centres the copy in it', async () => {
    await render(<WelcomeView onDone={jest.fn()} />);
    const slide = () => screen.getByTestId('welcome-slide-1');
    expect(slide()).toHaveStyle({ justifyContent: 'center', alignItems: 'center' });
    expect(slide().props.style.minHeight).toBe(0);

    await act(async () => {
      fireEvent(screen.getByTestId('welcome-pager'), 'layout', {
        nativeEvent: { layout: { width: 390, height: 506, x: 0, y: 0 } },
      });
    });
    for (const n of [1, 2, 3]) {
      expect(screen.getByTestId(`welcome-slide-${n}`).props.style.minHeight).toBe(506);
    }
    expect(slide().props.style.height).toBeUndefined();
  });

  it('opens on the full Brolly logo, named in Latin', async () => {
    await render(<WelcomeView onDone={jest.fn()} />);
    expect(screen.getByTestId('welcome-brand')).toBeOnTheScreen();
    expect(screen.getByRole('image', { name: 'Brolly Solutions' })).toBeOnTheScreen();
    // The exam keeps its own name in the copy; the brand never claims it.
    expect(screen.getByText('Practise the real PWT')).toBeOnTheScreen();
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
    expect(screen.getByTestId('welcome-footer-row')).toHaveStyle({ flexDirection: 'row' });
    // The dots track physical page order, which is 1-2-3 in a left-to-right language.
    const hidden = { includeHiddenElements: true };
    expect(screen.getByTestId('welcome-dots', hidden)).toHaveStyle({ flexDirection: 'row' });
    expect(screen.getAllByTestId(/^welcome-dot-/, hidden).map((dot) => dot.props.testID)).toEqual([
      'welcome-dot-1',
      'welcome-dot-2',
      'welcome-dot-3',
    ]);
    // The brand keeps its Latin name in every language; the exam name stays in the Telugu copy.
    expect(screen.getByRole('image', { name: 'Brolly Solutions' })).toBeOnTheScreen();
    // A Telugu title is a serif too: Noto Serif Telugu 700 on a 1.5 line-height (24 px type
    // on a 36 px line), since Playfair (the English display face) has no Telugu.
    const title = screen.getByTestId('welcome-title-1');
    expect(title).toHaveStyle({
      fontSize: 24,
      lineHeight: 36,
      fontFamily: 'NotoSerifTelugu_700Bold',
    });
    // One token step between the counter, the title and the line under it — a Stack gap
    // now, not three `mt-*` classes.
    expect(screen.getByTestId('welcome-slide-1')).toHaveStyle({
      flexDirection: 'column',
      gap: 12,
    });
    expect(screen.toJSON()).toMatchSnapshot();
  });
});
