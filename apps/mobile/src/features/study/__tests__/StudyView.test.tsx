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

  // The mark is the state and the pill is the word for it: a topic still to read carries the
  // gold dot and no pill; one you have read carries the ink check and says so.
  it('ticks only the topics that have been read', async () => {
    await render(<StudyView {...props()} read={{ 'st-re-coding': true }} />);
    expect(screen.getByTestId('study-read-st-re-coding')).toHaveTextContent('Read');
    expect(screen.queryByTestId('study-read-st-ar-percentages')).toBeNull();

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

  // Gold is a dot and an edge on this screen, never a fill or a word: the read pill is quiet,
  // and the chevron the pattern draws is `ink3` (the `study-chevron-<id>` ID went with the
  // hand-rolled row — the pattern names its own end slot).
  it('spends no gold fill on a row, and lets the pattern own the chevron', async () => {
    await render(<StudyView {...props()} read={{ 'st-re-coding': true }} />);
    const pill = screen.getByTestId('study-read-st-re-coding');
    expect(pill.props.className).toMatch(/\bbg-surface2\b/);
    expect(pill.props.className).not.toMatch(/\bbg-accent\b/);
    const end = screen.getByTestId('study-row-st-re-coding-end');
    expect(end).toHaveTextContent('Read›');
    const chevron = within(end).getByText('›', { includeHiddenElements: true });
    expect(chevron.props.className).toMatch(/\btext-ink3\b/);
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
    expect(screen.getByTestId('study-row-st-re-coding').props.accessibilityLabel).toMatch(
      /Read$/,
    );
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
