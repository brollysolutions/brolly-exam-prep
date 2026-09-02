import { leaveOnboarding } from '../returnTo';

type Router = Parameters<typeof leaveOnboarding>[0];

const router = (canGoBack: boolean): Router =>
  ({
    canGoBack: () => canGoBack,
    back: jest.fn(),
    replace: jest.fn(),
  }) as unknown as Router;

describe('leaveOnboarding', () => {
  it('walks the sign-up flow on when nothing asked to come back', () => {
    const r = router(true);
    const onward = jest.fn();
    leaveOnboarding(r, undefined, onward);
    expect(onward).toHaveBeenCalledTimes(1);
    // Even with a screen behind it: during sign-up, step 2 always has step 1 there.
    expect(r.back).not.toHaveBeenCalled();
  });

  it('returns to the caller when the step was opened as an edit', () => {
    const r = router(true);
    const onward = jest.fn();
    leaveOnboarding(r, 'profile', onward);
    expect(r.back).toHaveBeenCalledTimes(1);
    expect(onward).not.toHaveBeenCalled();
  });

  it('lands on Profile when a deep link left nothing to go back to', () => {
    const r = router(false);
    leaveOnboarding(r, 'profile', jest.fn());
    expect(r.replace).toHaveBeenCalledWith('/(tabs)/profile');
  });
});
