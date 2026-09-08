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
  /** Clear the marks. Called by `signOut()`, and by the tests. */
  reset: () => void;
};

export type StudyStore = StudyState & StudyActions;

export const STUDY_STORAGE_KEY = 'tslprb.study';

/**
 * F-21 — study progress. Cleared by `signOut()`: the ticks say what one person has read, and
 * the Study tab shows them to anyone who opens it. The material stays free to guests; the
 * record of who read it does not survive them signing out.
 *
 * `merge` takes only the `read` map from storage: an earlier build also persisted a
 * `lastRead` bookmark for a Continue card that no longer exists, and a blob that still
 * carries it must load without dragging the dead field back into the store.
 */
export const useStudyStore = create<StudyStore>()(
  persist(
    (set, get) => ({
      read: {},
      // Marking a topic already marked returns the SAME `read` object, so a repeat press
      // cannot re-render every row in the list.
      markRead: (id) =>
        set((s) => ({ read: s.read[id] ? s.read : { ...s.read, [id]: true as const } })),
      isRead: (id) => Boolean(get().read[id]),
      reset: () => set({ read: {} }),
    }),
    {
      name: STUDY_STORAGE_KEY,
      storage: persistedJSONStorage(),
      partialize: (s): StudyState => ({ read: s.read }),
      merge: (persisted, current) => {
        const stored = persisted as Partial<StudyState> | undefined;
        return { ...current, read: stored?.read ?? {} };
      },
    },
  ),
);
