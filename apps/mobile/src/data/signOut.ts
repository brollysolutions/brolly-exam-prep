import { useAttemptStore } from './attempt';
import { useSessionStore } from './session';

/**
 * The single way to sign out. Both stores are persisted, so clearing the session alone
 * would leave a half-finished attempt (answers, marks, a live `endsAt`) on disk for the
 * next person to pick up on a shared handset — and the app would boot straight back into
 * someone else's running test.
 *
 * It lives here rather than inside `session.logout()` so the two stores never import each
 * other; each stays independently testable and free of the other's rehydration order.
 * The language preference is deliberately kept: it belongs to the handset, not the account.
 */
export function signOut(): void {
  useSessionStore.getState().logout();
  useAttemptStore.getState().reset();
}
