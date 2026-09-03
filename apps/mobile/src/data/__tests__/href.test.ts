import { returnHref, withReturnTo } from '../href';

describe('withReturnTo', () => {
  // The object form keeps slashes and parentheses out of the literal string.
  it('hands the destination on as a parameter, not as text', () => {
    expect(withReturnTo('/(auth)/login', '/(tabs)/profile')).toEqual({
      pathname: '/(auth)/login',
      params: { returnTo: '/(tabs)/profile' },
    });
  });

  it('stays a plain route when there is nowhere to come back to', () => {
    expect(withReturnTo('/(auth)/login')).toBe('/(auth)/login');
  });
});

describe('returnHref', () => {
  it('honours an app-absolute path', () => {
    expect(returnHref('/(tabs)/profile')).toBe('/(tabs)/profile');
  });

  it('refuses anything that leaves the app', () => {
    expect(returnHref(undefined)).toBeUndefined();
    expect(returnHref('//evil.example')).toBeUndefined();
    expect(returnHref('https://evil.example')).toBeUndefined();
    expect(returnHref('tests')).toBeUndefined();
  });
});
