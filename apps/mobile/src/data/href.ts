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
 * never `//host` or a scheme. A crafted link must not be able to bounce someone out of the
 * app at the exact moment they finish signing in.
 */
export function returnHref(returnTo: string | undefined): Href | undefined {
  if (!returnTo || !returnTo.startsWith('/') || returnTo.startsWith('//')) return undefined;
  return returnTo as Href;
}
