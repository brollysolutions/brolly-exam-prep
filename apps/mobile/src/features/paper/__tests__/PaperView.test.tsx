import { act, render, screen, userEvent } from '@testing-library/react-native';
import { buildPaper, type SectionSpec } from '@tslprb/fixtures';
import { initI18n } from '@tslprb/i18n';
import { FlatList } from 'react-native';

import { firstIndexOfSection, PaperView } from '../PaperView';

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

describe('PaperView', () => {
  beforeAll(() => initI18n('en'));

  it('renders the title, question count, stems and four public options', async () => {
    await render(<PaperView {...props()} />);
    expect(screen.getByText('PWT 2022 — SCT PC')).toBeOnTheScreen();
    expect(screen.getByTestId('paper-count')).toHaveTextContent(/5/);
    QUESTIONS.forEach((question, index) => {
      const number = index + 1;
      expect(screen.getByTestId(`paper-stem-${number}`)).toHaveTextContent(question.text.en);
      for (let option = 0; option < 4; option += 1)
        expect(screen.getByTestId(`paper-option-${number}-${option}`)).toBeOnTheScreen();
    });
  });

  it('never exposes an answer key or explanation in the public paper view', async () => {
    await render(<PaperView {...props()} />);
    QUESTIONS.forEach((question, index) => {
      expect(
        screen.queryByTestId(`paper-tick-${index + 1}-${question.correct}`, {
          includeHiddenElements: true,
        }),
      ).toBeNull();
      expect(screen.queryByText(question.explanation.en)).toBeNull();
    });
    expect(screen.queryByText('Why')).toBeNull();
  });

  it('jumps to the first question in a selected section', async () => {
    const scrollToIndex = jest.spyOn(FlatList.prototype, 'scrollToIndex').mockImplementation();
    await render(<PaperView {...props()} />);
    await userEvent.press(screen.getByTestId('paper-section-1'));
    expect(scrollToIndex).toHaveBeenCalledWith({ index: 3, animated: false });
    scrollToIndex.mockRestore();
  });

  it('uses the list estimate and retries once when a section has not been measured', async () => {
    const scrollToOffset = jest.spyOn(FlatList.prototype, 'scrollToOffset').mockImplementation();
    const scrollToIndex = jest.spyOn(FlatList.prototype, 'scrollToIndex').mockImplementation();
    await render(<PaperView {...props()} />);
    const failed = screen.getByTestId('paper-list').props.onScrollToIndexFailed as (info: {
      index: number;
      averageItemLength: number;
    }) => void;
    await act(async () => failed({ index: 3, averageItemLength: 200 }));
    expect(scrollToOffset).toHaveBeenCalledWith({ offset: 600, animated: false });
    await act(async () => new Promise(requestAnimationFrame));
    expect(scrollToIndex).toHaveBeenCalledWith({ index: 3, animated: false });
    scrollToIndex.mockRestore();
    scrollToOffset.mockRestore();
  });

  it('shows loading and failed states without mounting the list', async () => {
    const { rerender } = await render(<PaperView lang="en" />);
    expect(
      screen.getByTestId('paper-skeleton', { includeHiddenElements: true }),
    ).toBeOnTheScreen();
    await rerender(<PaperView lang="en" failed />);
    expect(screen.getByTestId('paper-not-found')).toBeOnTheScreen();
    expect(screen.queryByTestId('paper-list')).toBeNull();
  });
});

describe('firstIndexOfSection', () => {
  it('is the running total of preceding sections', () => {
    expect(firstIndexOfSection(SECTIONS, 0)).toBe(0);
    expect(firstIndexOfSection(SECTIONS, 1)).toBe(3);
  });
});
