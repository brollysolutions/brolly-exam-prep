import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistedJSONStorage } from './storage';

/**
 * Which study topics have been read.
 *
 * A set stored as `Record<id, true>` rather than an array: reading a topic twice must not
 * grow the record, and `isRead` has to be a lookup, not a scan, because the study list calls
 * it once per row on every render.
 */
export type StudyState = { read: Record<string, true> };

export type StudyActions = {
  markRead: (id: string) => void;
  isRead: (id: string) => boolean;
  /** Clear the marks. Used by tests; there is no product action that unreads a topic. */
  reset: () => void;
};

export type StudyStore = StudyState & StudyActions;

export const STUDY_STORAGE_KEY = 'tslprb.study';

/**
 * F-21 — study progress. Deliberately NOT cleared by `signOut()`: what you have read belongs
 * to the handset, like the language preference, and the material is free to guests anyway.
 */
export const useStudyStore = create<StudyStore>()(
  persist(
    (set, get) => ({
      read: {},
      // Marking a topic already marked returns the SAME object, so a repeat press cannot
      // re-render every row in the list.
      markRead: (id) => set((s) => (s.read[id] ? s : { read: { ...s.read, [id]: true as const } })),
      isRead: (id) => Boolean(get().read[id]),
      reset: () => set({ read: {} }),
    }),
    {
      name: STUDY_STORAGE_KEY,
      storage: persistedJSONStorage(),
      partialize: (s): StudyState => ({ read: s.read }),
    },
  ),
);
