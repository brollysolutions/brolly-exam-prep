import { act, render, screen, userEvent, within } from '@testing-library/react-native';
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

  it('ticks only the topics that have been read', async () => {
    await render(<StudyView {...props()} read={{ 'st-re-coding': true }} />);
    expect(screen.getByTestId('study-read-st-re-coding')).toHaveTextContent(/✓Read/);
    expect(screen.queryByTestId('study-read-st-ar-percentages')).toBeNull();
  });

  it('opens the topic that was pressed', async () => {
    const p = props();
    await render(<StudyView {...p} />);
    await userEvent.press(screen.getByTestId('study-row-st-gs-rivers'));
    expect(p.onOpen).toHaveBeenCalledWith('st-gs-rivers');
  });

  it('keeps the row hi-vis to ink — the chevron and the read tick — and never a fill', async () => {
    await render(<StudyView {...props()} read={{ 'st-re-coding': true }} />);
    // The chevron is decorative, so it is hidden from the accessibility tree and has to be
    // asked for explicitly.
    const chevron = screen.getByTestId('study-chevron-st-re-coding', {
      includeHiddenElements: true,
    });
    expect(chevron.props.className).toContain('text-hivis');
    const chip = screen.getByTestId('study-read-st-re-coding');
    expect(chip.props.className).not.toContain('bg-hivis');
    // The same tick the topic page uses once you mark it read.
    expect(within(chip).getByText('✓').props.className).toContain('text-hivis');
  });

  it('gives every row a 48 px-plus target', async () => {
    await render(<StudyView {...props()} />);
    expect(screen.getByTestId('study-row-st-ar-percentages').props.className).toContain(
      'min-h-[72px]',
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
