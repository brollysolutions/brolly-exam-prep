import { useRouter, type Href } from 'expo-router';

import { withReturnTo, type ReturnTarget } from './href';
import { isOnboarded, useSessionStore } from './session';

/** What the gate asks about the person holding the phone. */
export type Gate = { signedIn: boolean; onboarded: boolean };

/**
 * Where a gated action actually goes: the thing itself, the onboarding answers it needs
 * first, or the sign-in — each carrying the target, so the chain ends where the tap did.
 *
 * Pure, because two callers need the same answer in two shapes: `ensure` pushes it, and the
 * attempt route redirects to it before it will load a paper.
 */
export function gateHref(target: ReturnTarget, { signedIn, onboarded }: Gate): Href {
  if (!signedIn) return withReturnTo('/(auth)/login', target);
  if (!onboarded) return withReturnTo('/(onboarding)/post', target);
  return target;
}

export type RequireAuth = {
  /** Do the thing, or collect what the thing needs first and then do it. */
  ensure: (target: ReturnTarget) => void;
  signedIn: boolean;
  onboarded: boolean;
};

/**
 * F-19 — the app opens on Home with no login, so an account is asked for at the point one is
 * actually needed: sitting a paper, or the account rows in Profile. `ensure` is that point,
 * and `gateHref` is the one place the three states are told apart.
 */
export function useRequireAuth(): RequireAuth {
  const router = useRouter();
  const signedIn = useSessionStore((s) => Boolean(s.token));
  const onboarded = useSessionStore(isOnboarded);

  // `push`, always: a sign-in is a card laid on top of what you were doing, and so is the
  // paper you asked for.
  const ensure = (target: ReturnTarget) => router.push(gateHref(target, { signedIn, onboarded }));

  return { ensure, signedIn, onboarded };
}
