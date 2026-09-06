import { act, render, screen, userEvent, within } from '@testing-library/react-native';
import { colors } from '@tslprb/design-tokens';
import { STUDY_SECTIONS, STUDY_TOPICS } from '@tslprb/fixtures';
import { initI18n, setLanguage } from '@tslprb/i18n';

import { iso } from '@/ui';

import { StudyView } from '../StudyView';

const props = () => ({ lang: 'en' as const, onOpen: jest.fn() });

describe('StudyView', () => {
  beforeAll(() => {
    initI18n('en');
  });

  it('lists every section of the paper and every topic under it', async () => {
    await render(<StudyView {...props()} />);
    for (const section of STUDY_SECTIONS) {
      expect(screen.getByTestId(`study-section-${section.id}`)).toBeOnTheScreen();
    }
    for (const topic of STUDY_TOPICS) {
      expect(screen.getByTestId(`study-row-${topic.id}`)).toBeOnTheScreen();
    }
    expect(screen.getByText('Percentages')).toBeOnTheScreen();
  });

  it('says how long a topic takes, and how much a section is', async () => {
    await render(<StudyView {...props()} />);
    // Composed, not interpolated: the digits stay tabular and LTR-isolated.
    expect(screen.getByTestId('study-minutes-st-ar-percentages')).toHaveTextContent(`${iso(8)}min`);
    // Arithmetic is 8 + 10 + 8 minutes over 3 topics.
    expect(screen.getByTestId('study-section-arithmetic')).toHaveTextContent(
      new RegExp(`${iso(26)}min`),
    );
    expect(screen.getByTestId('study-section-arithmetic')).toHaveTextContent(
      new RegExp(`${iso(3)}topics`),
    );
  });

  // The mark IS the state, and it says it once: a topic still to read carries the gold dot, one
  // you have read carries the ink check, and the trailing "Read" pill that repeated it in the
  // chevron's own slot is gone (design review D13). The row's composed name still says "Read".
  it('ticks only the topics that have been read, and says it once', async () => {
    await render(<StudyView {...props()} read={{ 'st-re-coding': true }} />);
    expect(screen.queryByTestId('study-read-st-re-coding')).toBeNull();
    expect(screen.queryByText('Read')).toBeNull();

    const done = screen.getByTestId('study-row-st-re-coding-marker', {
      includeHiddenElements: true,
    });
    expect(done).toHaveStyle({ color: colors.ink });
    expect(screen.getByTestId('study-row-st-ar-percentages-marker').props.className).toMatch(
      /\bbg-accentStrong\b/,
    );
  });

  it('opens the topic that was pressed', async () => {
    const p = props();
    await render(<StudyView {...p} />);
    await userEvent.press(screen.getByTestId('study-row-st-gs-rivers'));
    expect(p.onOpen).toHaveBeenCalledWith('st-gs-rivers');
  });

  // Gold is a dot and an edge on this screen, never a fill or a word, and with the read pill
  // gone the end slot holds the chevron alone (the `study-chevron-<id>` ID went with the
  // hand-rolled row — the pattern names its own end slot).
  it('spends no gold fill on a row, and lets the pattern own the chevron', async () => {
    await render(<StudyView {...props()} read={{ 'st-re-coding': true }} />);
    const end = screen.getByTestId('study-row-st-re-coding-end');
    expect(end).toHaveTextContent('›');
    const chevron = within(end).getByText('›', { includeHiddenElements: true });
    expect(chevron.props.className).toMatch(/\btext-ink3\b/);
  });

  // The section head is a `Pill` carrying its number, not a 10.5 px gold `Kicker`: that size is
  // below the caption floor the rules set for `ink3`, and a printed section number is not the
  // candidate's own input, which is what gold means here (design review A2/D5). `ink3` on the
  // pill's `surface2` measures 4.66:1; `accentInk` there would have been 4.25.
  it('heads each section with a numbered quiet pill, and no gold digit', async () => {
    await render(<StudyView {...props()} />);
    const head = screen.getByTestId('study-index-arithmetic');
    expect(head.props.className).toMatch(/\bbg-surface2\b/);
    expect(head.props.className).toMatch(/\brounded-full\b/);
    expect(head).toHaveTextContent(/Arithmetic$/);
    const digit = within(head).getByText(iso('01'));
    expect(digit.props.className).toMatch(/\btext-ink3\b/);
    expect(digit.props.className).not.toMatch(/\btext-accentInk\b/);
    // A number that names a block is not a status, so the pill carries no dot either.
    expect(screen.queryByTestId('study-index-arithmetic-dot')).toBeNull();
  });

  it('gives every row a 48 px-plus target', async () => {
    await render(<StudyView {...props()} />);
    // The pattern's own floor: 56 px, grown by the minutes line under the title.
    expect(screen.getByTestId('study-row-st-ar-percentages').props.className).toMatch(
      /\bmin-h-touchLg\b/,
    );
  });

  // A node meta says nothing a composed label could read, so the row spells out what it is,
  // how long it takes and whether it is read (`MarkerRow` code review I3).
  it('names each row with its minutes and its state', async () => {
    await render(<StudyView {...props()} read={{ 'st-re-coding': true }} />);
    expect(screen.getByTestId('study-row-st-ar-percentages').props.accessibilityLabel).toBe(
      `Percentages ${iso(8)} min`,
    );
    expect(screen.getByTestId('study-row-st-re-coding').props.accessibilityLabel).toMatch(/Read$/);
  });
});

describe('StudyView (te)', () => {
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

  it('reads the titles in the chosen language, not the UI default', async () => {
    await render(<StudyView {...props()} lang="te" />);
    expect(screen.getByText('శాతాలు')).toBeOnTheScreen();
    expect(screen.queryByText('Percentages')).toBeNull();
  });
});
