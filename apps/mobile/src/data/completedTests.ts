import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { ResultDetail } from './api/types';
import { persistedJSONStorage } from './storage';

export type CompletedTest = { attemptId: string; result: ResultDetail; completedAt?: number };
export const COMPLETED_TESTS_STORAGE_KEY = 'tslprb.completedTests';

/** Latest completed imported paper, retained across reloads and cleared on sign-out. */
export const useCompletedTestsStore = create<{
  tests: Record<string, CompletedTest>;
  save: (testId: string, completed: CompletedTest) => void;
  reset: () => void;
}>()(
  persist(
    (set) => ({
      tests: {},
      save: (testId, completed) => set((s) => ({ tests: { ...s.tests, [testId]: completed } })),
      reset: () => set({ tests: {} }),
    }),
    {
      name: COMPLETED_TESTS_STORAGE_KEY,
      storage: persistedJSONStorage(),
      partialize: (s) => ({ tests: s.tests }),
    },
  ),
);
