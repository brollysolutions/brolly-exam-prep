import type { Gender, Post, StandardKey, StandardsGroup } from '@tslprb/fixtures';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistedJSONStorage } from './storage';

export type { Gender, StandardsGroup };

export type EligibilityState = {
  /**
   * The three pickers, `undefined` until the user actually moves one. The screen falls back to
   * the session's post and category, so a stored `undefined` is not the same as a stored
   * default: it means "still following my profile", and it keeps following it if the profile
   * changes.
   */
  post?: Post;
  gender?: Gender;
  group?: StandardsGroup;
  /**
   * Exactly what was typed, not a rounding of it. A candidate coming back to the screen should
   * see their own "167.6", cursor position and all, rather than a number the app re-formatted.
   */
  values: Partial<Record<StandardKey, string>>;
  /** Check has been pressed at least once, so the verdict block belongs on screen. */
  checked: boolean;
};

export type EligibilityActions = {
  setPost: (post: Post) => void;
  setGender: (gender: Gender) => void;
  setGroup: (group: StandardsGroup) => void;
  setValue: (key: StandardKey, value: string) => void;
  check: () => void;
  reset: () => void;
};

export type EligibilityStore = EligibilityState & EligibilityActions;

export const ELIGIBILITY_STORAGE_KEY = 'tslprb.eligibility';

const initial: EligibilityState = {
  post: undefined,
  gender: undefined,
  group: undefined,
  values: {},
  checked: false,
};

/**
 * F-25 — the last PMT/PET measurements someone entered.
 *
 * Cleared by `signOut()`. The checker stays free and ungated, but height, chest and run times
 * are the most personal thing the app holds, and the screen redraws them — and the verdict —
 * for whoever opens it next. A shared handset is not one person.
 */
export const useEligibilityStore = create<EligibilityStore>()(
  persist(
    (set) => ({
      ...initial,
      setPost: (post) => set({ post }),
      setGender: (gender) => set({ gender }),
      setGroup: (group) => set({ group }),
      setValue: (key, value) => set((s) => ({ values: { ...s.values, [key]: value } })),
      check: () => set({ checked: true }),
      reset: () => set({ ...initial, values: {} }),
    }),
    {
      name: ELIGIBILITY_STORAGE_KEY,
      storage: persistedJSONStorage(),
      partialize: (s): EligibilityState => ({
        post: s.post,
        gender: s.gender,
        group: s.group,
        values: s.values,
        checked: s.checked,
      }),
    },
  ),
);
