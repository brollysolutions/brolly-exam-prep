import { render, screen } from '@testing-library/react-native';
import { size } from '@tslprb/design-tokens';
import { initI18n } from '@tslprb/i18n';

import { HazardRail } from '../index';
import { Rail } from '../Rail';

const hidden = { includeHiddenElements: true };

describe('Rail', () => {
  beforeAll(() => {
    initI18n('en');
  });

  it('is a 3 px gold rule by default', async () => {
    await render(<Rail />);
    expect(screen.getByTestId('rail', hidden)).toHaveStyle({ height: size.rail });
    // Animated.View is not NativeWind-wrapped: the colour lives on a plain child.
    expect(screen.getByTestId('rail-fill', hidden).props.className).toContain('bg-accentStrong');
  });

  it('turns red for the danger tone, and critical alone implies danger', async () => {
    await render(<Rail tone="danger" />);
    expect(screen.getByTestId('rail-fill', hidden).props.className).toContain('bg-dangerInk');
    await screen.rerender(<Rail critical />);
    expect(screen.getByTestId('rail-fill', hidden).props.className).toContain('bg-dangerInk');
    expect(screen.getByTestId('rail-fill', hidden).props.className).not.toContain(
      'bg-accentStrong',
    );
  });

  it('is hidden from the accessibility tree', async () => {
    await render(<Rail />);
    expect(screen.queryByTestId('rail')).toBeNull();
    expect(screen.getByTestId('rail', hidden).props.accessibilityElementsHidden).toBe(true);
  });

  it('keeps the HazardRail name as an alias one cycle', () => {
    expect(HazardRail).toBe(Rail);
  });
});
