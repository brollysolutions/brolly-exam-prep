import { render, screen } from '@testing-library/react-native';
import { buildPaper, type SectionSpec } from '@tslprb/fixtures';
import { initI18n } from '@tslprb/i18n';

import { useLangStore } from '@/data/lang';

import { PaperView } from '../PaperView';

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

  it('renders Telugu public questions without answer-key decoration', async () => {
    await render(
      <PaperView title="PWT 2022 — SCT PC" questions={QUESTIONS} sections={SECTIONS} lang="te" />,
    );
    const stem = screen.getByTestId('paper-stem-1');
    expect(stem).toHaveTextContent(QUESTIONS[0].text.te);
    expect(stem).toHaveStyle({ fontFamily: 'NotoSansTelugu_400Regular' });
    expect(
      screen.queryByTestId(`paper-tick-1-${QUESTIONS[0].correct}`, {
        includeHiddenElements: true,
      }),
    ).toBeNull();
    expect(screen.queryByText(QUESTIONS[0].explanation.te)).toBeNull();
    expect(screen.toJSON()).toMatchSnapshot();
  });
});
