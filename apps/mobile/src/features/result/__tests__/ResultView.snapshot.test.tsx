import { render, screen } from '@testing-library/react-native';
import { SAMPLE_RESULT } from '@tslprb/fixtures';
import { initI18n } from '@tslprb/i18n';

import type { ResultDetail } from '@/data/api';
import { useLangStore } from '@/data/lang';

import { ResultView } from '../ResultView';

const RESULT: ResultDetail = {
  ...SAMPLE_RESULT,
  actions: SAMPLE_RESULT.actions.map((a) => ({
    id: a.id,
    title: { ...a.title },
    sub: { ...a.sub },
  })),
  review: SAMPLE_RESULT.review.map((r) => ({ ...r })),
};

describe('ResultView (te)', () => {
  beforeAll(() => {
    useLangStore.setState({ lang: 'te' });
    initI18n('te');
  });

  it('renders in Telugu and matches the snapshot', async () => {
    await render(<ResultView result={RESULT} />);
    expect(screen.getByTestId('result-header')).toHaveStyle({ flexDirection: 'row' });
    // Telugu copy from the locale file is on screen, and the score stays physically LTR.
    expect(screen.getByText('మీ స్కోరు')).toBeOnTheScreen();
    expect(screen.getByTestId('result-score-row')).toHaveStyle({ flexDirection: 'row' });
    expect(screen.toJSON()).toMatchSnapshot();
  });
});
