import { render, screen } from '@testing-library/react-native';
import { hazard, size } from '@tslprb/design-tokens';
import { initI18n } from '@tslprb/i18n';

import { HazardRail } from '../HazardRail';

describe('HazardRail', () => {
  beforeAll(() => {
    initI18n('en');
  });

  it('lays its slices out in a row inside a 5 px track', async () => {
    await render(<HazardRail />);
    const rail = screen.getByTestId('hazard-rail', { includeHiddenElements: true });
    expect(rail).toHaveStyle({ height: size.rail });
    expect(rail.props.className).toContain('h-rail');
    // Animated.View is not NativeWind-wrapped: direction must be inline.
    const track = screen.getByTestId('hazard-rail-track', { includeHiddenElements: true });
    expect(track).toHaveStyle({ flexDirection: 'row' });
    const slices = track.children.filter((c) => typeof c !== 'string');
    expect(slices.length).toBeGreaterThan(8);
    expect(typeof slices[0] === 'object' && slices[0].props.style).toMatchObject({
      width: hazard.stripe,
    });
    expect(typeof slices[0] === 'object' && slices[0].props.className).toContain('bg-hivis');
  });

  it('turns flag when critical', async () => {
    await render(<HazardRail critical />);
    const track = screen.getByTestId('hazard-rail-track', { includeHiddenElements: true });
    const first = track.children.find((c) => typeof c !== 'string');
    expect(typeof first === 'object' && first.props.className).toContain('bg-flag');
  });
});
