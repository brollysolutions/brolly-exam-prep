import { render, screen } from '@testing-library/react-native';
import { colors } from '@tslprb/design-tokens';
import { buildPaper, type SectionSpec } from '@tslprb/fixtures';
import { initI18n } from '@tslprb/i18n';

import { useLangStore } from '@/data/lang';

import { PaperView } from '../PaperView';

/** One question per section: enough to check the face, small enough to read as a snapshot. */
const SECTIONS: SectionSpec[] = [
  { id: 'reasoning', labelKey: 'test.sections.reasoning', questions: 1 },
  { id: 'gs', labelKey: 'test.sections.gs', questions: 1 },
];
const QUESTIONS = buildPaper(SECTIONS);

describe('PaperView (te)', () => {
  beforeAll(() => {
    useLangStore.setState({ lang: 'te' });
    initI18n('te');
  });

  it('sets the paper in Telugu and keeps the correct-answer bar on the left edge', async () => {
    await render(
      <PaperView title="PWT 2022 — SCT PC" questions={QUESTIONS} sections={SECTIONS} lang="te" />,
    );
    expect(screen.getByTestId('paper-header')).toHaveStyle({ flexDirection: 'row' });
    // The 3 px accent follows the reading start, the left-hand side.
    QUESTIONS.forEach((question, i) => {
      const marked = screen.getByTestId(`paper-option-${i + 1}-${question.correct}`);
      expect(marked).toHaveStyle({ borderLeftWidth: 3, borderLeftColor: colors.hivis });
      expect(marked).not.toHaveStyle({ borderRightWidth: 3 });
    });
    const stem = screen.getByTestId('paper-stem-1');
    expect(stem).toHaveTextContent(QUESTIONS[0].text.te);
    expect(stem).toHaveStyle({ fontFamily: 'NotoSansTelugu_400Regular' });
    expect(screen.toJSON()).toMatchSnapshot();
  });
});
