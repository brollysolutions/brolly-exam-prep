import { render, screen } from '@testing-library/react-native';
import { AFFAIRS } from '@tslprb/fixtures';
import { initI18n } from '@tslprb/i18n';

import { useLangStore } from '@/data/lang';
import { iso } from '@/ui';

import { AffairsView } from '../AffairsView';

/** Three items over two days: enough to mirror and to group, small enough to read. */
const FEED = AFFAIRS.filter((a) =>
  ['af-metro-corridor', 'af-rural-roads', 'af-water-grid'].includes(a.id),
);

describe('AffairsView (ur)', () => {
  beforeAll(() => {
    useLangStore.setState({ lang: 'ur' });
    initI18n('ur');
  });

  it('mirrors the screen and keeps the day heading in Latin digits', async () => {
    await render(<AffairsView affairs={FEED} lang="ur" onBack={jest.fn()} />);
    expect(screen.getByTestId('affairs-header')).toHaveStyle({ flexDirection: 'row-reverse' });

    // The date goes through `Num`: Latin face, LTR-isolated, so it never re-orders in Urdu.
    const date = screen.getByTestId('affairs-date-2026-09-02');
    expect(date).toHaveTextContent(iso('2 Sep 2026'));
    expect(date.props.style).toMatchObject({ writingDirection: 'ltr' });

    expect(screen.getByTestId('affair-headline-af-metro-corridor')).toHaveTextContent(
      FEED[0].headline.ur,
    );
    expect(screen.toJSON()).toMatchSnapshot();
  });
});
