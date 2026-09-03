import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistedJSONStorage } from './storage';

/** The topic the reader was last in, whether or not they finished it. */
export type LastRead = { id: string; at: number };

/**
 * Which study topics have been read.
 *
 * A set stored as `Record<id, true>` rather than an array: reading a topic twice must not
 * grow the record, and `isRead` has to be a lookup, not a scan, because the study list calls
 * it once per row on every render.
 *
 * `lastRead` is the bookmark Home's Continue card reads. It is where the reader *was*, not
 * what they finished, so opening a topic sets it and marking one read keeps it there.
 */
export type StudyState = { read: Record<string, true>; lastRead?: LastRead };

export type StudyActions = {
  /** The topic screen was opened on `id`. Moves the bookmark; does not mark anything read. */
  open: (id: string, now?: number) => void;
  markRead: (id: string, now?: number) => void;
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
      lastRead: undefined,
      open: (id, now = Date.now()) => set({ lastRead: { id, at: now } }),
      // Marking a topic already marked returns the SAME `read` object, so a repeat press
      // cannot re-render every row in the list; only the bookmark moves.
      markRead: (id, now = Date.now()) =>
        set((s) => ({
          read: s.read[id] ? s.read : { ...s.read, [id]: true as const },
          lastRead: { id, at: now },
        })),
      isRead: (id) => Boolean(get().read[id]),
      reset: () => set({ read: {}, lastRead: undefined }),
    }),
    {
      name: STUDY_STORAGE_KEY,
      storage: persistedJSONStorage(),
      partialize: (s): StudyState => ({ read: s.read, lastRead: s.lastRead }),
    },
  ),
);
