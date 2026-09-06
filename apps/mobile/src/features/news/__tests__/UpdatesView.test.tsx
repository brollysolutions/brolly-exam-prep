import { render, screen, userEvent, within } from '@testing-library/react-native';
import { colors } from '@tslprb/design-tokens';
import { latestNotices, NOTICES } from '@tslprb/fixtures';
import { initI18n } from '@tslprb/i18n';

import { iso } from '@/ui';

import { UpdatesView } from '../UpdatesView';

const FEED = latestNotices();

const props = () => ({
  notices: FEED,
  lang: 'en' as const,
  onBack: jest.fn(),
  onOpenLink: jest.fn(),
});

describe('UpdatesView', () => {
  beforeAll(() => {
    initI18n('en');
  });

  it('lists every notice, newest first', async () => {
    await render(<UpdatesView {...props()} />);
    for (const notice of NOTICES) {
      expect(screen.getByTestId(`update-card-${notice.id}`)).toBeOnTheScreen();
    }
    expect(screen.getByText('PMT and PET schedule for shortlisted candidates')).toBeOnTheScreen();
    expect(screen.getByTestId('update-date-nt-2026-pmt-pet')).toHaveTextContent(iso('24 Oct 2026'));
  });

  it('says what kind each notice is, in words from the locale file', async () => {
    await render(<UpdatesView {...props()} />);
    expect(screen.getByTestId('update-kind-nt-2026-notification')).toHaveTextContent(
      'Notification',
    );
    expect(screen.getByTestId('update-kind-nt-2026-hall-ticket')).toHaveTextContent('Hall ticket');
    expect(screen.getByTestId('update-kind-nt-2026-exam-date')).toHaveTextContent('Exam date');
    expect(screen.getByTestId('update-kind-nt-2026-final-list')).toHaveTextContent('Result');
    expect(screen.getByTestId('update-kind-nt-2026-pmt-pet')).toHaveTextContent('PMT / PET');
  });

  it('keeps the body behind a tap, and gives the tap back', async () => {
    await render(<UpdatesView {...props()} />);
    const row = screen.getByTestId('update-row-nt-2026-hall-ticket');
    expect(row).toBeCollapsed();
    expect(screen.queryByTestId('update-body-nt-2026-hall-ticket')).toBeNull();

    await userEvent.press(row);
    expect(row).toBeExpanded();
    expect(screen.getByTestId('update-body-nt-2026-hall-ticket')).toHaveTextContent(
      /Download the hall ticket/,
    );

    await userEvent.press(row);
    expect(row).toBeCollapsed();
    expect(screen.queryByTestId('update-body-nt-2026-hall-ticket')).toBeNull();
  });

  // Arriving from a tapped card on Home (`/updates?open=<id>`), the notice is already open.
  it('opens the notice it was asked to open, and only that one', async () => {
    await render(<UpdatesView {...props()} openId="nt-2026-hall-ticket" />);
    expect(screen.getByTestId('update-row-nt-2026-hall-ticket')).toBeExpanded();
    expect(screen.getByTestId('update-body-nt-2026-hall-ticket')).toBeOnTheScreen();
    expect(screen.getByTestId('update-row-nt-2026-exam-date')).toBeCollapsed();
  });

  it('opens one notice at a time without closing the others', async () => {
    await render(<UpdatesView {...props()} />);
    await userEvent.press(screen.getByTestId('update-row-nt-2026-hall-ticket'));
    await userEvent.press(screen.getByTestId('update-row-nt-2026-exam-date'));
    expect(screen.getByTestId('update-body-nt-2026-hall-ticket')).toBeOnTheScreen();
    expect(screen.getByTestId('update-body-nt-2026-exam-date')).toBeOnTheScreen();
  });

  // The caret is one glyph that turns, not two glyphs swapped: a swap is an instant jump, a
  // turn is 180 ms the eye can follow (design 21).
  it('turns the caret over when a notice opens', async () => {
    await render(<UpdatesView {...props()} />);
    const caret = () =>
      screen.getByTestId('update-caret-nt-2026-hall-ticket', { includeHiddenElements: true });
    const box = () =>
      screen.getByTestId('update-caret-box-nt-2026-hall-ticket', { includeHiddenElements: true });
    expect(caret()).toHaveTextContent('▸');
    expect(box()).toHaveStyle({ transform: [{ rotate: '0deg' }] });
    await userEvent.press(screen.getByTestId('update-row-nt-2026-hall-ticket'));
    expect(caret()).toHaveTextContent('▸');
    expect(box()).toHaveStyle({ transform: [{ rotate: '90deg' }] });
  });

  // Gold is a fill, an edge or a dot in this app, never a link (Phase B ruling): the label is
  // ink and the chevron is the `ink3` one every row that goes somewhere carries.
  it('keeps the link row quiet — an ink label behind an ink3 chevron', async () => {
    await render(<UpdatesView {...props()} />);
    await userEvent.press(screen.getByTestId('update-row-nt-2026-notification'));
    expect(screen.getByText('Read the full notice').props.className).toMatch(/\btext-ink\b/);
    expect(screen.getByText('›', { includeHiddenElements: true }).props.className).toMatch(
      /\btext-ink3\b/,
    );
  });

  it('offers the full notice only where there is one to open', async () => {
    const p = props();
    await render(<UpdatesView {...p} />);

    await userEvent.press(screen.getByTestId('update-row-nt-2026-notification'));
    const link = screen.getByTestId('update-link-nt-2026-notification');
    expect(link).toHaveTextContent(/Read the full notice/);
    await userEvent.press(link);
    expect(p.onOpenLink).toHaveBeenCalledWith('https://www.tslprb.in');

    // The exam-date notice carries no link, so the row is not offered at all.
    await userEvent.press(screen.getByTestId('update-row-nt-2026-exam-date'));
    expect(screen.queryByTestId('update-link-nt-2026-exam-date')).toBeNull();
  });

  it('drops the link row when the screen has nowhere to send the reader', async () => {
    await render(<UpdatesView notices={FEED} lang="en" onBack={jest.fn()} />);
    await userEvent.press(screen.getByTestId('update-row-nt-2026-notification'));
    expect(screen.queryByTestId('update-link-nt-2026-notification')).toBeNull();
  });

  it('gives every row a 48 px-plus target', async () => {
    await render(<UpdatesView {...props()} />);
    expect(screen.getByTestId('update-row-nt-2026-notification').props.className).toMatch(
      /\bmin-h-touchLg\b/,
    );
  });

  // The gold start edge marks where you are in the list, so only the open card wears one: a
  // shelf where every card carried an accent would have six and point at none (F-30).
  it('gives the gold start edge to the open card and to no other', async () => {
    await render(<UpdatesView {...props()} openId="nt-2026-hall-ticket" />);
    expect(screen.getByTestId('update-card-nt-2026-hall-ticket')).toHaveStyle({
      borderLeftWidth: 3,
      borderLeftColor: colors.accentStrong,
    });
    expect(screen.getByTestId('update-card-nt-2026-exam-date')).not.toHaveStyle({
      borderLeftWidth: 3,
    });
  });

  // The edge must not move the card's contents. `Card` gives back only the two pixels the 3 px
  // bar added over its own 1 px `line` — the screen used to subtract all three, which left the
  // open card's pill on 16 px against a closed card's 17 (design review D8 / code review 1).
  it('keeps the open card contents on the same axis as every closed one', async () => {
    await render(<UpdatesView {...props()} openId="nt-2026-hall-ticket" />);
    const open = screen.getByTestId('update-card-nt-2026-hall-ticket');
    const closed = screen.getByTestId('update-card-nt-2026-exam-date');
    expect(open.props.style.paddingLeft).toBe(14);
    expect((open.props.style.borderLeftWidth as number) + 14).toBe(17);
    // The closed card takes its 16 px from `p-4` behind its 1 px border: 17 either way.
    expect(closed.props.style.paddingLeft).toBeUndefined();
    expect(closed.props.className).toMatch(/\bp-4\b/);
  });

  // `self-start` is physical: under RTL the link has to hug the right edge, so it goes through
  // `dir()`. The `px-1` that grows the 48 px target comes back as a negative margin, so the
  // label still starts on the card's own text axis (design review D10).
  it('hugs the reading edge with the link row, and gives its padding back', async () => {
    await render(<UpdatesView {...props()} openId="nt-2026-hall-ticket" />);
    const link = screen.getByTestId('update-link-nt-2026-hall-ticket');
    expect(link.props.className).toMatch(/\bself-start\b/);
    expect(link.props.className).toMatch(/-mx-1/);
    expect(link.props.className).toMatch(/\bpx-1\b/);
    expect(link.props.className).toMatch(/\bh-touch\b/);
  });

  // Centred in the space the list would fill, with a kicker: not one grey line in the corner.
  it('says so plainly when the Board has posted nothing', async () => {
    await render(<UpdatesView notices={[]} lang="en" onBack={jest.fn()} />);
    const empty = screen.getByTestId('updates-empty');
    expect(empty).toHaveTextContent(/Nothing yet/);
    expect(empty).toHaveTextContent(/No updates from the Board yet\./);
    expect(empty.props.className).toMatch(/\bitems-center\b/);
    expect(empty.props.className).toMatch(/\bjustify-center\b/);
    expect(screen.queryByTestId('updates-list')).toBeNull();
  });

  it('goes back from the header', async () => {
    const p = props();
    await render(<UpdatesView {...p} />);
    await userEvent.press(screen.getByTestId('updates-header-back'));
    expect(p.onBack).toHaveBeenCalledTimes(1);
  });

  // Seeded fixtures until the API serves `GET /notices`: the header says so, quietly.
  it('marks the feed as sample data in the header, as a badge and not a button', async () => {
    await render(<UpdatesView {...props()} />);
    const chip = within(screen.getByTestId('updates-header')).getByTestId('sample-data');
    expect(chip).toHaveTextContent('Sample data');
    expect(chip.props.accessibilityRole).toBeUndefined();
    // A quiet `Pill` now, the same label shape the rest of the app names a block with.
    expect(chip.props.className).toMatch(/\bbg-surface2\b/);
    expect(chip.props.className).toMatch(/\brounded-full\b/);
  });
});

describe('UpdatesView (te)', () => {
  it('reads the notices in the chosen language, not the UI default', async () => {
    await render(<UpdatesView {...props()} lang="te" />);
    expect(screen.getByText('హాల్ టికెట్లు అక్టోబర్ 10 నుంచి')).toBeOnTheScreen();
    expect(screen.queryByText('Hall tickets to download from 10 October')).toBeNull();
  });
});
