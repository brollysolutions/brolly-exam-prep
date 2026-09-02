import type { CategoryId, Post } from '@tslprb/fixtures';
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
};

export type SessionActions = {
  setPhone: (phone: string) => void;
  setToken: (token: string) => void;
  setPost: (post: Post) => void;
  setCategory: (category: CategoryId) => void;
  completeOnboarding: () => void;
  /** Full reset: nothing about the previous user survives on a shared handset. */
  logout: () => void;
  signedIn: () => boolean;
};

export type SessionStore = SessionState & SessionActions;

export const SESSION_STORAGE_KEY = 'tslprb.session';

const initial: SessionState = {
  phone: undefined,
  token: undefined,
  post: undefined,
  category: undefined,
  onboarded: false,
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
      logout: () => set({ ...initial }),
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
      }),
    },
  ),
);
