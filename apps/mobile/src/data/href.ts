import type { Href } from 'expo-router';

/**
 * The string half of `Href`. The object form (`{ pathname, params }`) cannot ride inside a
 * query parameter, and a gate target has to survive being handed down the sign-in chain.
 */
export type ReturnTarget = Extract<Href, string>;

/**
 * `pathname` with the place to come back to attached. The object form keeps the target out of
 * the literal string — expo-router encodes it — so a path full of slashes and parentheses
 * ("/(tabs)/profile") survives the round trip through the URL intact.
 */
export function withReturnTo(pathname: ReturnTarget, returnTo?: string): Href {
  return (returnTo ? { pathname, params: { returnTo } } : pathname) as Href;
}

/**
 * A `returnTo` read back off the URL, if it is somewhere this app can actually go.
 *
 * The value arrives from a link, so it is not trusted: only an app-absolute path is honoured,
 * never a scheme and never a protocol-relative one. A crafted link must not be able to bounce
 * someone out of the app at the exact moment they finish signing in.
 */
export function returnHref(returnTo: string | undefined): Href | undefined {
  if (!returnTo || !returnTo.startsWith('/')) return undefined;
  // A second separator is what makes it protocol-relative: `//host`, and the `/\host` that
  // some parsers read the same way. 92 is a backslash; comparing the code keeps this line
  // free of escapes.
  if (returnTo[1] === '/' || returnTo.charCodeAt(1) === 92) return undefined;
  return returnTo as Href;
}
