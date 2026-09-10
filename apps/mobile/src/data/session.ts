import type { CategoryId, Post } from '@tslprb/fixtures/src/runtime';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistedJSONStorage } from './storage';

export type { CategoryId, Post };

/** Everything the app knows about who is using it. Language lives in `lang.ts`. */
export type SessionState = {
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

const initial: SessionState = {
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
