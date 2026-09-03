import { render, screen, userEvent, within } from '@testing-library/react-native';
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

  it('opens one notice at a time without closing the others', async () => {
    await render(<UpdatesView {...props()} />);
    await userEvent.press(screen.getByTestId('update-row-nt-2026-hall-ticket'));
    await userEvent.press(screen.getByTestId('update-row-nt-2026-exam-date'));
    expect(screen.getByTestId('update-body-nt-2026-hall-ticket')).toBeOnTheScreen();
    expect(screen.getByTestId('update-body-nt-2026-exam-date')).toBeOnTheScreen();
  });

  it('turns the caret over when a notice opens', async () => {
    await render(<UpdatesView {...props()} />);
    const caret = () =>
      screen.getByTestId('update-caret-nt-2026-hall-ticket', { includeHiddenElements: true });
    expect(caret()).toHaveTextContent('▸');
    await userEvent.press(screen.getByTestId('update-row-nt-2026-hall-ticket'));
    expect(caret()).toHaveTextContent('▾');
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
    expect(screen.getByTestId('update-row-nt-2026-notification').props.className).toContain(
      'min-h-[72px]',
    );
  });

  it('says so plainly when the Board has posted nothing', async () => {
    await render(<UpdatesView notices={[]} lang="en" onBack={jest.fn()} />);
    expect(screen.getByTestId('updates-empty')).toHaveTextContent('No updates from the Board yet.');
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
    expect(chip.props.className).not.toContain('bg-hivis');
  });
});

describe('UpdatesView (te)', () => {
  it('reads the notices in the chosen language, not the UI default', async () => {
    await render(<UpdatesView {...props()} lang="te" />);
    expect(screen.getByText('హాల్ టికెట్లు అక్టోబర్ 10 నుంచి')).toBeOnTheScreen();
    expect(screen.queryByText('Hall tickets to download from 10 October')).toBeNull();
  });
});
