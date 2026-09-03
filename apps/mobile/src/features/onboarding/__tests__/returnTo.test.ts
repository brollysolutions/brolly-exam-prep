import { leaveOnboarding, returnFromEdit } from '../returnTo';

type Router = Parameters<typeof returnFromEdit>[0];

const router = (canGoBack = true): Router =>
  ({
    canGoBack: () => canGoBack,
    back: jest.fn(),
    replace: jest.fn(),
  }) as unknown as Router;

describe('returnFromEdit', () => {
  it('goes back to whatever opened the step', () => {
    const r = router();
    returnFromEdit(r, '/(tabs)/profile');
    expect(r.back).toHaveBeenCalledTimes(1);
    expect(r.replace).not.toHaveBeenCalled();
  });

  it('lands on the caller when a deep link left nothing to go back to', () => {
    const r = router(false);
    returnFromEdit(r, '/(tabs)/profile');
    expect(r.replace).toHaveBeenCalledWith('/(tabs)/profile');
  });

  it('falls back to Profile when the link named no caller at all', () => {
    const r = router(false);
    returnFromEdit(r, undefined);
    expect(r.replace).toHaveBeenCalledWith('/(tabs)/profile');
  });
});

describe('leaveOnboarding', () => {
  it('ends the sign-up walk on whatever asked for the account', () => {
    const r = router();
    leaveOnboarding(r, '/test/mock-07');
    expect(r.replace).toHaveBeenCalledWith('/test/mock-07');
    // `replace`, so the finished steps are not left on the back stack.
    expect(r.back).not.toHaveBeenCalled();
  });

  it('opens the shell when nothing asked for it', () => {
    const r = router();
    leaveOnboarding(r, undefined);
    expect(r.replace).toHaveBeenCalledWith('/(tabs)');
  });

  it('refuses a returnTo that points out of the app', () => {
    // A crafted link must not be able to bounce someone out the moment they finish signing in.
    for (const hostile of ['//evil.example', 'https://evil.example', 'javascript:alert(1)']) {
      const r = router();
      leaveOnboarding(r, hostile);
      expect(r.replace).toHaveBeenCalledWith('/(tabs)');
    }
  });
});
