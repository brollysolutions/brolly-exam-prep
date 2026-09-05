import { act, render, screen, userEvent, within } from '@testing-library/react-native';
import { colors } from '@tslprb/design-tokens';
import { buildPaper, type SectionSpec } from '@tslprb/fixtures';
import { initI18n } from '@tslprb/i18n';
import { FlatList } from 'react-native';

import { firstIndexOfSection, PaperView } from '../PaperView';

/**
 * Two short sections rather than a real 200-question paper: a `FlatList` only mounts its
 * first window, so a test that counts cards has to stay inside it.
 */
const SECTIONS: SectionSpec[] = [
  { id: 'reasoning', labelKey: 'test.sections.reasoning', questions: 3 },
  { id: 'gs', labelKey: 'test.sections.gs', questions: 2 },
];
const QUESTIONS = buildPaper(SECTIONS);

const props = () => ({
  title: 'PWT 2022 — SCT PC',
  questions: QUESTIONS,
  sections: SECTIONS,
  lang: 'en' as const,
});

/** `test.optionKeys` in English — the glyph each option is labelled with. */
const KEYS = ['A', 'B', 'C', 'D'];

/** The list's own miss handler, as `VirtualizedList` would call it. */
const onScrollToIndexFailed = () =>
  screen.getByTestId('paper-list').props.onScrollToIndexFailed as (info: {
    index: number;
    averageItemLength: number;
  }) => void;

describe('PaperView', () => {
  beforeAll(() => {
    initI18n('en');
  });

  it('renders the paper, its title and one card per question', async () => {
    await render(<PaperView {...props()} />);
    expect(screen.getByText('PWT 2022 — SCT PC')).toBeOnTheScreen();
    expect(screen.getByTestId('paper-count')).toHaveTextContent(/questions/);
    expect(screen.getByTestId('paper-count')).toHaveTextContent(/5/);
    QUESTIONS.forEach((question, i) => {
      expect(screen.getByTestId(`paper-card-${i + 1}`)).toBeOnTheScreen();
      expect(screen.getByTestId(`paper-stem-${i + 1}`)).toHaveTextContent(question.text.en);
    });
  });

  it('marks the option the paper calls correct, and only that one, on every card', async () => {
    await render(<PaperView {...props()} />);
    QUESTIONS.forEach((question, i) => {
      const n = i + 1;
      // The mark is a 3 px hi-vis bar on the reading-start side plus the tint behind it.
      expect(screen.getByTestId(`paper-option-${n}-${question.correct}`)).toHaveStyle({
        borderLeftWidth: 3,
        borderLeftColor: colors.hivis,
        backgroundColor: colors.hivisTint2,
      });
      [0, 1, 2, 3]
        .filter((k) => k !== question.correct)
        .forEach((k) => {
          expect(screen.getByTestId(`paper-option-${n}-${k}`)).not.toHaveStyle({
            borderLeftWidth: 3,
          });
          expect(
            screen.queryByTestId(`paper-tick-${n}-${k}`, { includeHiddenElements: true }),
          ).toBeNull();
        });
      // The ✓ is decorative; the row's own label is what says "correct answer" out loud.
      const tick = screen.getByTestId(`paper-tick-${n}-${question.correct}`, {
        includeHiddenElements: true,
      });
      expect(tick).toBeOnTheScreen();
      // Gold text on the gold tint is 4.14:1 (fix wave 1, C2): the key letter and the tick
      // are ink; the edge and the tint carry the meaning.
      expect(tick.props.className).toMatch(/\btext-ink\b/);
      const option = screen.getByTestId(`paper-option-${n}-${question.correct}`);
      expect(
        within(option).getByText(KEYS[question.correct], { includeHiddenElements: true }).props
          .className,
      ).toMatch(/\btext-ink\b/);
      // Scoped to the card: the seed bank repeats, so the same option text is on screen twice.
      expect(
        within(screen.getByTestId(`paper-card-${n}`)).getByLabelText(
          `${KEYS[question.correct]} · ${question.options.en[question.correct]} · Correct answer`,
        ),
      ).toBeOnTheScreen();
    });
  });

  it('puts the explanation under its own kicker on every card', async () => {
    await render(<PaperView {...props()} />);
    expect(screen.getAllByText('Why')).toHaveLength(QUESTIONS.length);
    QUESTIONS.forEach((question, i) => {
      expect(
        within(screen.getByTestId(`paper-card-${i + 1}`)).getByText(question.explanation.en),
      ).toBeOnTheScreen();
    });
  });

  it('offers a full-height chip per section and jumps to its first question', async () => {
    const scrollToIndex = jest.spyOn(FlatList.prototype, 'scrollToIndex').mockImplementation();
    await render(<PaperView {...props()} />);
    expect(screen.getByTestId('paper-section-0').props.className).toContain('h-touch');
    await userEvent.press(screen.getByTestId('paper-section-1'));
    // Section 2 starts at question 4, which is index 3.
    expect(scrollToIndex).toHaveBeenCalledWith({ index: 3, animated: false });
    scrollToIndex.mockRestore();
  });

  // A card's height depends on its stem, four options and an explanation in three scripts, so
  // there is no `getItemLayout` and a long paper may not have measured as far as the section.
  it('estimates the offset when the jump misses, then lands on the card a frame later', async () => {
    const scrollToOffset = jest.spyOn(FlatList.prototype, 'scrollToOffset').mockImplementation();
    const scrollToIndex = jest.spyOn(FlatList.prototype, 'scrollToIndex').mockImplementation();
    await render(<PaperView {...props()} />);
    const failed = onScrollToIndexFailed();

    await act(async () => failed({ index: 3, averageItemLength: 200 }));
    expect(scrollToOffset).toHaveBeenCalledWith({ offset: 600, animated: false });

    await act(async () => {
      await new Promise(requestAnimationFrame);
    });
    expect(scrollToIndex).toHaveBeenCalledWith({ index: 3, animated: false });
    scrollToIndex.mockRestore();
    scrollToOffset.mockRestore();
  });

  it('settles for the estimate when the retry misses too, instead of jumping again', async () => {
    const scrollToOffset = jest.spyOn(FlatList.prototype, 'scrollToOffset').mockImplementation();
    await render(<PaperView {...props()} />);
    const failed = onScrollToIndexFailed();
    // A list that still has not measured that far calls the handler straight back.
    const scrollToIndex = jest
      .spyOn(FlatList.prototype, 'scrollToIndex')
      .mockImplementation(() => failed({ index: 3, averageItemLength: 200 }));

    await act(async () => failed({ index: 3, averageItemLength: 200 }));
    await act(async () => {
      await new Promise(requestAnimationFrame);
    });
    await act(async () => {
      await new Promise(requestAnimationFrame);
    });
    expect(scrollToIndex).toHaveBeenCalledTimes(1);
    expect(scrollToOffset).toHaveBeenCalledTimes(2);
    scrollToIndex.mockRestore();
    scrollToOffset.mockRestore();
  });

  it('hides the section strip when the paper has only one section', async () => {
    const one: SectionSpec[] = [SECTIONS[0]];
    await render(<PaperView {...props()} sections={one} questions={buildPaper(one)} />);
    expect(screen.queryByTestId('paper-sections')).toBeNull();
  });

  it('shows the skeleton and no list while the paper is loading', async () => {
    await render(<PaperView lang="en" />);
    expect(
      screen.getByTestId('paper-skeleton', { includeHiddenElements: true }),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId('paper-list')).toBeNull();
    expect(screen.queryByTestId('paper-count')).toBeNull();
  });

  it('says the paper could not be opened, and keeps the way back', async () => {
    const onBack = jest.fn();
    await render(<PaperView lang="en" failed onBack={onBack} />);
    expect(screen.getByTestId('paper-not-found')).toBeOnTheScreen();
    expect(screen.getByText('That paper could not be opened.')).toBeOnTheScreen();
    expect(screen.queryByTestId('paper-list')).toBeNull();
    // The generic screen title stands in when there is no paper to name.
    expect(screen.getByText('Question paper')).toBeOnTheScreen();
    await userEvent.press(screen.getByTestId('paper-header-back'));
    expect(onBack).toHaveBeenCalled();
  });
});

describe('firstIndexOfSection', () => {
  it('is the running total of the sections before it', () => {
    expect(firstIndexOfSection(SECTIONS, 0)).toBe(0);
    expect(firstIndexOfSection(SECTIONS, 1)).toBe(3);
  });
});
