import { render, screen } from '@testing-library/react-native';
import { buildPaper, FREE_MOCK_SHORT, SAMPLE_RESULT } from '@tslprb/fixtures';
import { initI18n } from '@tslprb/i18n';

import { useLangStore } from '@/data/lang';

import { SolutionsView } from '../SolutionsView';
import { buildSolutionRows } from '../solutions';

const ROWS = buildSolutionRows(
  SAMPLE_RESULT.review.map((r) => ({ ...r })),
  buildPaper(FREE_MOCK_SHORT.sections),
);

describe('SolutionsView (te)', () => {
  beforeAll(() => {
    useLangStore.setState({ lang: 'te' });
    initI18n('te');
  });

  it('renders in Telugu and matches the snapshot', async () => {
    await render(<SolutionsView rows={ROWS} />);
    expect(screen.getByTestId('solutions-header')).toHaveStyle({ flexDirection: 'row' });
    expect(screen.getAllByTestId('solution-card')).toHaveLength(3);
    expect(screen.getAllByText('సరైన జవాబు')).toHaveLength(3);
    expect(screen.toJSON()).toMatchSnapshot();
  });
});
