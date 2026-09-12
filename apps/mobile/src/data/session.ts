import type { CategoryId, Post } from '@tslprb/fixtures';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistedJSONStorage } from './storage';

export type { CategoryId, Post };

/** Everything the app knows about who is using it. Language lives in `lang.ts`. */
export type SessionState = {
  /** Stable backend identity retained solely for correctly scoped local user data. */
  userId?: string;
  phone?: string;
  token?: string;
  post?: Post;
  category?: CategoryId;
  /** Post and category have both been chosen (onboarding steps 1/2 and 2/2). */
  onboarded: boolean;
  /**
   * The intro slides have been shown once. A property of the *handset*, not of the user:
   * it survives `logout()`, because a returning user re-reading the pitch is noise.
   */
  seenWelcome: boolean;
  /** Daily practice reminder. On by default — the app is useless to someone who forgets it. */
  notifications: boolean;
};

export type SessionActions = {
  startTestingSession: (phone: string) => void;
  setUserId: (userId: string) => void;
  setPhone: (phone: string) => void;
  setToken: (token: string) => void;
  setPost: (post: Post) => void;
  setCategory: (category: CategoryId) => void;
  completeOnboarding: () => void;
  markWelcomeSeen: () => void;
  setNotifications: (on: boolean) => void;
  /**
   * Full reset of the person, not the handset: `seenWelcome` is deliberately kept, and
   * `notifications` returns to its default `true` — the reminder is a preference of whoever
   * is signed in, and the next person on a shared phone does not inherit an opt-out.
   */
  logout: () => void;
  /**
   * The handset as well as the person: `seenWelcome` goes too, so the app opens on the
   * welcome slides as it did the day it was installed. Only `wipeLocalData()` calls this.
   */
  wipe: () => void;
  signedIn: () => boolean;
};

export type SessionStore = SessionState & SessionActions;

/**
 * Onboarding is finished only when the flag AND both answers are present.
 *
 * The flag alone would let a half-answered sign-up count as done — a token with a post and
 * no category, say — and every gate in the app has to agree on the question or the user is
 * asked for the same answer twice.
 */
export const isOnboarded = (s: SessionState): boolean =>
  s.onboarded && s.post !== undefined && s.category !== undefined;

export const SESSION_STORAGE_KEY = 'tslprb.session';
/** Local testing only: never send this marker as a backend credential. */
export const TEST_SESSION_TOKEN = 'local-testing-session';
export const backendToken = (session: SessionState): string | undefined =>
  session.token === TEST_SESSION_TOKEN ? undefined : session.token;

const initial: SessionState = {
  userId: undefined,
  phone: undefined,
  token: undefined,
  post: undefined,
  category: undefined,
  onboarded: false,
  seenWelcome: false,
  notifications: true,
};

export const useSessionStore = create<SessionStore>()(
  persist(
    (set, get) => ({
      ...initial,
      startTestingSession: (phone) => {
        if (!/^\d{10}$/.test(phone)) throw new Error('Enter exactly 10 digits');
        const previous = get();
        set({
          ...(previous.phone === phone ? {} : initial),
          seenWelcome: previous.seenWelcome,
          userId: undefined,
          phone,
          token: TEST_SESSION_TOKEN,
        });
      },
      setUserId: (userId) => set({ userId }),
      setPhone: (phone) => set({ phone }),
      setToken: (token) => set({ token }),
      setPost: (post) => set({ post }),
      setCategory: (category) => set({ category }),
      completeOnboarding: () => set({ onboarded: true }),
      markWelcomeSeen: () => set({ seenWelcome: true }),
      setNotifications: (notifications) => set({ notifications }),
      logout: () => set({ ...initial, seenWelcome: get().seenWelcome }),
      wipe: () => set({ ...initial }),
      signedIn: () => Boolean(get().token),
    }),
    {
      name: SESSION_STORAGE_KEY,
      storage: persistedJSONStorage(),
      partialize: (s): SessionState => ({
        userId: s.userId,
        phone: s.phone,
        token: s.token,
        post: s.post,
        category: s.category,
        onboarded: s.onboarded,
        seenWelcome: s.seenWelcome,
        notifications: s.notifications,
      }),
    },
  ),
);

/**
 * Stable owner key for application-owned SQLite rows. The phone fallback supports sessions
 * created before backend identity was retained, and temporary local testing sessions.
 */
export function offlineUserId(session: SessionState): string | undefined {
  if (session.userId) return `user:${session.userId}`;
  if (session.phone) return `phone:${session.phone}`;
  return undefined;
}

/**
 * True only when the session is backed by a real server user id AND a token — never the
 * phone-only offline fallback. Server-side attempt creation and submission require this, so a
 * legacy/degraded phone-only session can play and store locally but can never drive a backend
 * write. Temporary testing sessions never satisfy it.
 */
export function hasBackendIdentity(session: SessionState): boolean {
  return Boolean(session.userId && backendToken(session));
}
