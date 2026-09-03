import { act, render, screen, userEvent, within } from '@testing-library/react-native';
import { initI18n, setLanguage } from '@tslprb/i18n';

import { iso } from '@/ui';

import { LibraryView } from '../LibraryView';

const handlers = () => ({ lang: 'en' as const, onOpen: jest.fn(), onLocked: jest.fn() });

describe('LibraryView', () => {
  beforeAll(() => {
    initI18n('en');
  });

  it('opens on the full mocks and shows their size and badge', async () => {
    await render(<LibraryView {...handlers()} />);
    expect(screen.getByTestId('library-row-mock-07')).toBeOnTheScreen();
    expect(screen.getByTestId('library-badge-mock-07')).toHaveTextContent('Free');
    expect(screen.getByTestId('library-badge-mock-08')).toHaveTextContent(/Locked/);
    // The score is composed, not interpolated, so it can be tabular and LTR-isolated — and
    // the label must therefore carry no placeholder of its own.
    const best = screen.getByTestId('library-best-mock-07');
    expect(within(best).getByText(iso('62.25'))).toBeOnTheScreen();
    expect(best).toHaveTextContent(/^⁦62\.25⁩Best$/);
  });

  it('switches the list when a filter is chosen', async () => {
    await render(<LibraryView {...handlers()} />);
    expect(screen.queryByTestId('library-row-sec-seating')).toBeNull();
    await userEvent.press(screen.getByTestId('library-filter-sectional'));
    expect(screen.getByTestId('library-row-sec-seating')).toBeOnTheScreen();
    expect(screen.queryByTestId('library-row-mock-07')).toBeNull();
    await userEvent.press(screen.getByTestId('library-filter-previous'));
    expect(screen.getByTestId('library-row-prev-2022')).toBeOnTheScreen();
  });

  it('opens a free test', async () => {
    const h = handlers();
    await render(<LibraryView {...h} />);
    await userEvent.press(screen.getByTestId('library-row-mock-07'));
    expect(h.onOpen).toHaveBeenCalledWith('mock-07');
    expect(h.onLocked).not.toHaveBeenCalled();
  });

  it('explains a locked test instead of opening it', async () => {
    const h = handlers();
    await render(<LibraryView {...h} />);
    expect(screen.queryByTestId('library-locked-toast')).toBeNull();
    await userEvent.press(screen.getByTestId('library-row-mock-08'));
    expect(h.onLocked).toHaveBeenCalledWith('mock-08');
    expect(h.onOpen).not.toHaveBeenCalled();
    expect(screen.getByTestId('library-locked-toast')).toBeOnTheScreen();
  });

  it('spends hi-vis on the chosen filter and nothing else', async () => {
    await render(<LibraryView {...handlers()} />);
    // A shelf of solid-yellow Free badges next to three filters is six primary actions.
    expect(screen.getByTestId('library-filter-full').props.className).toContain('bg-hivis');
    expect(screen.getByTestId('library-filter-sectional').props.className).not.toContain(
      'bg-hivis',
    );
    expect(screen.getByTestId('library-badge-mock-07').props.className).not.toContain('bg-hivis');
  });

  it('lets a locked paper recede instead of shouting like one you can sit', async () => {
    await render(<LibraryView {...handlers()} />);
    expect(screen.getByText('PWT Full Mock 08').props.className).toContain('text-dim');
    expect(screen.getByText('PWT Full Mock 07').props.className).toContain('text-chalk');
    expect(screen.getByTestId('library-badge-mock-08')).toHaveTextContent(/⛌/);
  });

  it('gives every filter a full 48 px target', async () => {
    await render(<LibraryView {...handlers()} />);
    expect(screen.getByTestId('library-filter-full').props.className).toContain('h-touch');
  });

  it('opens on the shelf it is asked for', async () => {
    await render(<LibraryView initialKind="previous" {...handlers()} />);
    expect(screen.getByTestId('library-row-prev-2018')).toBeOnTheScreen();
    expect(screen.queryByTestId('library-row-mock-07')).toBeNull();
  });
});

describe('LibraryView (ur)', () => {
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

  it('mirrors the rows and matches the snapshot', async () => {
    await render(<LibraryView {...handlers()} lang="ur" />);
    expect(screen.getByTestId('library-filters')).toHaveStyle({ flexDirection: 'row-reverse' });
    expect(screen.getByText('پی ڈبلیو ٹی فل ماک 07')).toBeOnTheScreen();
    expect(screen.toJSON()).toMatchSnapshot();
  });
});
