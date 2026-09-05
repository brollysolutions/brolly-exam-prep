import { act, render, screen } from '@testing-library/react-native';
import { initI18n, setLanguage } from '@tslprb/i18n';

import { ProgressRail } from '../ProgressRail';

describe('ProgressRail', () => {
  beforeAll(() => {
    initI18n('en');
  });
  afterEach(async () => {
    await act(async () => {
      await setLanguage('en');
    });
  });

  it('fills from the left with ticks from the left in English', async () => {
    await render(<ProgressRail fraction={0.4} />);
    expect(screen.getByTestId('progress-fill')).toHaveStyle({ left: 0, width: '40%' });
    const ticks = screen.getAllByTestId('progress-tick');
    expect(ticks).toHaveLength(3);
    expect(ticks[0]).toHaveStyle({ left: '25%' });
  });

  it('keeps fill and ticks on the left in Telugu', async () => {
    await act(async () => {
      await setLanguage('te');
    });
    await render(<ProgressRail fraction={0.4} ticks={4} />);
    expect(screen.getByTestId('progress-fill')).toHaveStyle({ left: 0 });
    for (const [i, tick] of screen.getAllByTestId('progress-tick').entries()) {
      expect(tick).toHaveStyle({ left: `${(i + 1) * 25}%` });
      expect(tick.props.style).not.toHaveProperty('right');
    }
  });

  it('clamps the fraction and reports progress for accessibility', async () => {
    await render(<ProgressRail fraction={1.7} testID="rail" />);
    expect(screen.getByTestId('rail').props.accessibilityValue).toEqual({
      min: 0,
      max: 100,
      now: 100,
    });
  });
});
