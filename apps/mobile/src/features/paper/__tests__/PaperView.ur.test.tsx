import { render, screen } from '@testing-library/react-native';
import { colors } from '@tslprb/design-tokens';
import { buildPaper, type SectionSpec } from '@tslprb/fixtures';
import { initI18n } from '@tslprb/i18n';

import { useLangStore } from '@/data/lang';

import { PaperView } from '../PaperView';

/** One question per section: enough to mirror, small enough to read as a snapshot. */
const SECTIONS: SectionSpec[] = [
  { id: 'reasoning', labelKey: 'test.sections.reasoning', questions: 1 },
  { id: 'gs', labelKey: 'test.sections.gs', questions: 1 },
];
const QUESTIONS = buildPaper(SECTIONS);

describe('PaperView (ur)', () => {
  beforeAll(() => {
    useLangStore.setState({ lang: 'ur' });
    initI18n('ur');
  });

  it('mirrors the screen and moves the correct-answer bar to the right edge', async () => {
    await render(
      <PaperView
        title="پی ڈبلیو ٹی 2022 — SCT PC"
        questions={QUESTIONS}
        sections={SECTIONS}
        lang="ur"
      />,
    );
    expect(screen.getByTestId('paper-header')).toHaveStyle({ flexDirection: 'row-reverse' });
    // The 3 px accent follows the reading start, which in Urdu is the right-hand side.
    QUESTIONS.forEach((question, i) => {
      const marked = screen.getByTestId(`paper-option-${i + 1}-${question.correct}`);
      expect(marked).toHaveStyle({ borderRightWidth: 3, borderRightColor: colors.hivis });
      expect(marked).not.toHaveStyle({ borderLeftWidth: 3 });
    });
    expect(screen.getByTestId(`paper-stem-1`)).toHaveTextContent(QUESTIONS[0].text.ur);
    expect(screen.toJSON()).toMatchSnapshot();
  });
});
