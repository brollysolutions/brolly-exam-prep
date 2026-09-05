import { render, screen } from '@testing-library/react-native';
import { colors } from '@tslprb/design-tokens';
import { AFFAIRS } from '@tslprb/fixtures';
import { initI18n } from '@tslprb/i18n';

import { useLangStore } from '@/data/lang';
import { iso } from '@/ui';

import { AffairsView } from '../AffairsView';

/** Three items over two days: enough to group, small enough to read. */
const FEED = AFFAIRS.filter((a) =>
  ['af-metro-corridor', 'af-rural-roads', 'af-water-grid'].includes(a.id),
);

describe('AffairsView (te)', () => {
  beforeAll(() => {
    useLangStore.setState({ lang: 'te' });
    initI18n('te');
  });

  it('sets the feed in Telugu and keeps the day heading in Latin digits', async () => {
    await render(<AffairsView affairs={FEED} lang="te" onBack={jest.fn()} />);
    expect(screen.getByTestId('affairs-header')).toHaveStyle({ flexDirection: 'row' });

    // The date goes through `Num`: Latin face, LTR-isolated, so it never re-orders.
    const date = screen.getByTestId('affairs-date-2026-09-02');
    expect(date).toHaveTextContent(iso('2 Sep 2026'));
    expect(date.props.style).toMatchObject({ writingDirection: 'ltr' });

    const headline = screen.getByTestId('affair-headline-af-metro-corridor');
    expect(headline).toHaveTextContent(FEED[0].headline.te);
    expect(headline).toHaveStyle({ fontFamily: 'NotoSansTelugu_600SemiBold' });
    // The accent edge is on the reading-start side, the left.
    expect(screen.getByTestId('affair-card-af-metro-corridor')).toHaveStyle({
      borderLeftWidth: 3,
      borderLeftColor: colors.sand,
    });
    expect(screen.toJSON()).toMatchSnapshot();
  });
});
