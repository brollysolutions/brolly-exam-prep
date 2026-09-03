import { useRouter, type Href } from 'expo-router';

import { withReturnTo, type ReturnTarget } from './href';
import { useSessionStore } from './session';

/** How a cleared target is entered: stacked on top, or re-entered as a place (a tab). */
export type GateMode = 'push' | 'navigate';

/** What the gate asks about the person holding the phone. */
export type Gate = { signedIn: boolean; onboarded: boolean };

/**
 * Where a gated action actually goes: the thing itself, the onboarding answers it needs
 * first, or the sign-in — each carrying the target, so the chain ends where the tap did.
 */
export function gateHref(target: ReturnTarget, { signedIn, onboarded }: Gate): Href {
  if (!signedIn) return withReturnTo('/(auth)/login', target);
  if (!onboarded) return withReturnTo('/(onboarding)/post', target);
  return target;
}

export type RequireAuth = {
  /** Do the thing, or collect what the thing needs first and then do it. */
  ensure: (target: ReturnTarget, mode?: GateMode) => void;
  signedIn: boolean;
  onboarded: boolean;
};

/**
 * F-19 — the app opens on Home with no login, so an account is asked for at the point one is
 * actually needed: sitting a paper, running a drill, or the account rows in Profile. `ensure`
 * is that point, and the only place the three states are told apart.
 */
export function useRequireAuth(): RequireAuth {
  const router = useRouter();
  const signedIn = useSessionStore((s) => Boolean(s.token));
  // Both answers, not just the flag: a half-answered sign-up is not an onboarded user.
  const onboarded = useSessionStore((s) => s.onboarded && Boolean(s.post) && Boolean(s.category));

  const ensure = (target: ReturnTarget, mode: GateMode = 'push') => {
    const gated = !signedIn || !onboarded;
    // A sign-in or a missing answer is a card laid on top of what you were doing, so it always
    // stacks. Only a cleared target may `navigate`, which is how you re-enter a tab.
    if (gated || mode === 'push') router.push(gateHref(target, { signedIn, onboarded }));
    else router.navigate(target);
  };

  return { ensure, signedIn, onboarded };
}
