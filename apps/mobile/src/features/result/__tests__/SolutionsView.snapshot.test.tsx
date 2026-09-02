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

describe('SolutionsView (ur)', () => {
  beforeAll(() => {
    useLangStore.setState({ lang: 'ur' });
    initI18n('ur');
  });

  it('mirrors the screen and matches the snapshot', async () => {
    await render(<SolutionsView rows={ROWS} />);
    expect(screen.getByTestId('solutions-header')).toHaveStyle({ flexDirection: 'row-reverse' });
    expect(screen.getAllByTestId('solution-card')).toHaveLength(3);
    expect(screen.getAllByText('درست جواب')).toHaveLength(3);
    expect(screen.toJSON()).toMatchSnapshot();
  });
});
