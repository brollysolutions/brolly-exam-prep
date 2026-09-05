import { render, screen } from '@testing-library/react-native';
import { size } from '@tslprb/design-tokens';
import { initI18n } from '@tslprb/i18n';

import { HazardRail } from '../index';
import { Rail } from '../Rail';

const hidden = { includeHiddenElements: true };

/**
 * Overrides the global Reanimated mock for this file so the reduced-motion flag can be flipped
 * per test and the repeat call observed. The names carry the `mock` prefix jest requires of
 * factory captures.
 */
const mockReduced = jest.fn(() => false);
const mockWithRepeat = jest.fn((animation: unknown) => animation);
jest.mock('react-native-reanimated', () => ({
  ...jest.requireActual('react-native-reanimated/mock'),
  useReducedMotion: () => mockReduced(),
  withRepeat: (...args: unknown[]) => mockWithRepeat(...args),
}));

describe('Rail', () => {
  beforeAll(() => {
    initI18n('en');
  });
  beforeEach(() => {
    mockReduced.mockReturnValue(false);
    mockWithRepeat.mockClear();
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

  it('pulses while critical: one repeating opacity animation, reversing, forever', async () => {
    await render(<Rail critical />);
    expect(mockWithRepeat).toHaveBeenCalledTimes(1);
    expect(mockWithRepeat).toHaveBeenLastCalledWith(expect.anything(), -1, true);
  });

  it('does not pulse at rest', async () => {
    await render(<Rail />);
    expect(mockWithRepeat).not.toHaveBeenCalled();
  });

  // Under reduced motion the red tone alone carries the warning: no repeat, no easing loop,
  // a static rule (mobile-ui rule: motion honours `useReducedMotion()`).
  it('stays a static red rule under reduced motion', async () => {
    mockReduced.mockReturnValue(true);
    await render(<Rail critical />);
    expect(mockWithRepeat).not.toHaveBeenCalled();
    expect(screen.getByTestId('rail-fill', hidden).props.className).toContain('bg-dangerInk');
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
