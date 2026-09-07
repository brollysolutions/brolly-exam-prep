import { act, render, screen, userEvent, within } from '@testing-library/react-native';
import { initI18n, setLanguage } from '@tslprb/i18n';

import { iso } from '@/ui';

import { LibraryView } from '../LibraryView';

const handlers = () => ({
  lang: 'en' as const,
  onOpen: jest.fn(),
  onViewPaper: jest.fn(),
  onLocked: jest.fn(),
});

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
    expect(screen.queryByTestId('library-row-prev-2022')).toBeNull();
    await userEvent.press(screen.getByTestId('library-filter-previous'));
    expect(screen.getByTestId('library-row-prev-2022')).toBeOnTheScreen();
    expect(screen.queryByTestId('library-row-mock-07')).toBeNull();
  });

  // Two shelves and no third: the sectional drills were dropped in F-08's follow-up, so the
  // chip that opened them must not come back with them.
  it('offers the two shelves and nothing else', async () => {
    await render(<LibraryView {...handlers()} />);
    expect(screen.getByTestId('library-filter-full')).toBeOnTheScreen();
    expect(screen.getByTestId('library-filter-previous')).toBeOnTheScreen();
    expect(screen.queryByTestId('library-filter-sectional')).toBeNull();
    expect(screen.queryByTestId('library-row-sec-seating')).toBeNull();
    expect(screen.queryByTestId('library-row-sec-blood')).toBeNull();
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

  it('spends the gold fill on the chosen filter and nothing else', async () => {
    await render(<LibraryView {...handlers()} />);
    // A shelf of solid-gold Free badges beside the filters is several primary actions at once.
    expect(screen.getByTestId('library-filter-full').props.className).toMatch(/\bbg-accentSoft\b/);
    expect(screen.getByTestId('library-filter-previous').props.className).not.toContain(
      'bg-accentSoft',
    );
    expect(screen.getByTestId('library-badge-mock-07').props.className).not.toContain(
      'bg-accentSoft',
    );
  });

  // The badge says whether the paper will open, not the title's colour: `MarkerRow` gives every
  // title the same ink, and the lock is the icon the tab bar and the pattern already use — the
  // `⛌` glyph was a character no face outside the Latin one carries (F-30).
  it('marks a locked paper with a lock, not by dimming its title', async () => {
    await render(<LibraryView {...handlers()} />);
    expect(screen.getByText('PWT Full Mock 08').props.className).toMatch(/\btext-ink\b/);
    expect(screen.getByText('PWT Full Mock 07').props.className).toMatch(/\btext-ink\b/);
    expect(screen.getByTestId('library-badge-mock-08')).toHaveTextContent(/Locked$/);
    expect(
      screen.getByTestId('library-lock-mock-08', { includeHiddenElements: true }),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId('library-lock-mock-07', { includeHiddenElements: true }),
    ).toBeNull();
  });

  it('gives every filter a full 48 px target', async () => {
    await render(<LibraryView {...handlers()} />);
    expect(screen.getByTestId('library-filter-full').props.className).toMatch(/\bh-touch\b/);
  });

  it('opens on the shelf it is asked for', async () => {
    await render(<LibraryView initialKind="previous" {...handlers()} />);
    expect(screen.getByTestId('library-row-prev-2018')).toBeOnTheScreen();
    expect(screen.queryByTestId('library-row-mock-07')).toBeNull();
  });

  // The Tests tab is already mounted when Home links to `?kind=previous`, so a shelf that
  // only ever read the first value would leave the candidate on the full mocks.
  it('moves to the shelf a later request names', async () => {
    const h = handlers();
    const view = await render(<LibraryView kindKey="undefined:1" {...h} />);
    expect(screen.getByTestId('library-row-mock-07')).toBeOnTheScreen();
    await act(async () => {
      view.rerender(<LibraryView initialKind="previous" kindKey="previous:2" {...h} />);
    });
    expect(screen.getByTestId('library-row-prev-2022')).toBeOnTheScreen();
    expect(screen.queryByTestId('library-row-mock-07')).toBeNull();
  });

  // A chip pressed after the link is the candidate's own choice, and outlives it: the same
  // visit re-rendering (a language change, a store write) must not undo it.
  it('leaves a chip the candidate pressed alone when nothing new is asked for', async () => {
    const h = handlers();
    const view = await render(
      <LibraryView initialKind="previous" kindKey="previous:1" {...h} />,
    );
    await userEvent.press(screen.getByTestId('library-filter-full'));
    expect(screen.getByTestId('library-row-mock-07')).toBeOnTheScreen();
    await act(async () => {
      view.rerender(<LibraryView initialKind="previous" kindKey="previous:1" {...h} />);
    });
    expect(screen.getByTestId('library-row-mock-07')).toBeOnTheScreen();
  });

  // The bug the key exists for: pressing Home's card a second time repeats `?kind=previous`
  // verbatim, so only the visit tells the two navigations apart.
  it('honours a repeat of the same link once the candidate has moved off it', async () => {
    const h = handlers();
    const view = await render(
      <LibraryView initialKind="previous" kindKey="previous:1" {...h} />,
    );
    await userEvent.press(screen.getByTestId('library-filter-full'));
    expect(screen.getByTestId('library-row-mock-07')).toBeOnTheScreen();
    await act(async () => {
      view.rerender(<LibraryView initialKind="previous" kindKey="previous:2" {...h} />);
    });
    expect(screen.getByTestId('library-row-prev-2022')).toBeOnTheScreen();
    expect(screen.queryByTestId('library-row-mock-07')).toBeNull();
  });
});

/**
 * F-22 — a previous paper is two things at once, so its row offers both instead of guessing.
 */
describe('LibraryView — previous papers', () => {
  beforeAll(() => {
    initI18n('en');
  });

  const previous = async () => {
    const h = handlers();
    await render(<LibraryView initialKind="previous" {...h} />);
    return h;
  };

  it('gives every previous paper a practise and a view action', async () => {
    await previous();
    for (const id of ['prev-2022', 'prev-2018']) {
      expect(screen.getByTestId(`library-practise-${id}`)).toHaveTextContent('Practise');
      expect(screen.getByTestId(`library-view-${id}`)).toHaveTextContent('View paper');
    }
  });

  it('sends practise through the gate and view paper straight to the paper', async () => {
    const h = await previous();
    await userEvent.press(screen.getByTestId('library-practise-prev-2022'));
    expect(h.onOpen).toHaveBeenCalledWith('prev-2022');
    expect(h.onViewPaper).not.toHaveBeenCalled();
    await userEvent.press(screen.getByTestId('library-view-prev-2018'));
    expect(h.onViewPaper).toHaveBeenCalledWith('prev-2018');
    expect(h.onOpen).toHaveBeenCalledTimes(1);
  });

  it('reads a previous paper as free — the account is for the attempt, not the paper', async () => {
    await previous();
    expect(screen.getByTestId('library-badge-prev-2022')).toHaveTextContent('Free');
    expect(screen.queryByTestId('library-locked-toast')).toBeNull();
  });

  // One ink fill per screen counts every INSTANCE, and a shelf draws this pair once per row:
  // two black blocks at 15.1:1 were 14 % of the card while the active filter chip — the thing
  // that says which shelf you are on — is 1.38:1 (design review A1/D4). Neither is the fill.
  it('keeps both controls 48 px and gives the shelf no ink fill at all', async () => {
    await previous();
    const practise = screen.getByTestId('library-practise-prev-2022');
    const view = screen.getByTestId('library-view-prev-2022');
    expect(practise).toHaveStyle({ height: 48 });
    expect(view).toHaveStyle({ height: 48 });
    expect(practise.props.className).not.toMatch(/\bbg-ink\b/);
    expect(view.props.className).not.toMatch(/\bbg-ink\b/);
    // Rank inside the pair is the box, not the fill: Practise is the outlined one, View paper
    // is bare. Weight still separates them, as it did.
    expect(practise.props.className).toMatch(/\bborder-outline\b/);
    expect(view.props.className).not.toMatch(/\bborder-outline\b/);
    expect(within(practise).getByText('Practise').props.style.fontFamily).toContain('700Bold');
    expect(within(view).getByText('View paper').props.style.fontFamily).not.toContain('700Bold');
  });

  // The screen's ink budget: with the pair demoted there is no `bg-ink` control anywhere on it.
  it('leaves the whole Tests screen without a single ink-filled button', async () => {
    await previous();
    const filled = screen
      .getAllByRole('button')
      .filter(
        (n) => typeof n.props.className === 'string' && /\bbg-ink\b/.test(n.props.className),
      );
    expect(filled).toHaveLength(0);
  });

  // Filling Practise must not cost the shelf its "which shelf am I on" mark.
  it('leaves the active filter chip its gold', async () => {
    await previous();
    expect(screen.getByTestId('library-filter-previous').props.className).toContain(
      'bg-accentSoft',
    );
    expect(screen.getByTestId('library-filter-full').props.className).not.toContain(
      'bg-accentSoft',
    );
  });

  // A shelf with nothing on it: the state Library never had. Not a failure, so no red dot and
  // nothing to retry — the filters above are the way out and the line says so (design D15).
  it('shows an empty state when a shelf has nothing on it', async () => {
    await render(<LibraryView {...handlers()} tests={[]} />);
    expect(screen.queryByTestId('library-list')).toBeNull();
    expect(screen.getByTestId('library-empty')).toBeOnTheScreen();
    expect(screen.getByText('No tests here yet. Try another filter.')).toBeOnTheScreen();
    expect(screen.queryByTestId('library-empty-pill-dot')).toBeNull();
    // The filters are still there: the empty state replaces the shelf, not the screen.
    expect(screen.getByTestId('library-filter-full')).toBeOnTheScreen();
  });

  it('leaves the full-mock shelf with the one whole-row action it had', async () => {
    await render(<LibraryView {...handlers()} />);
    expect(screen.getByTestId('library-row-mock-07')).toBeOnTheScreen();
    expect(screen.queryByTestId('library-practise-mock-07')).toBeNull();
    expect(screen.queryByTestId('library-view-mock-07')).toBeNull();
  });
});

describe('LibraryView (te)', () => {
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

  it('renders the Telugu rows and matches the snapshot', async () => {
    await render(<LibraryView {...handlers()} lang="te" />);
    expect(screen.getByTestId('library-filters')).toHaveStyle({ flexDirection: 'row' });
    expect(screen.getByText('PWT ఫుల్ మాక్ 07')).toBeOnTheScreen();
    expect(screen.toJSON()).toMatchSnapshot();
  });
});
