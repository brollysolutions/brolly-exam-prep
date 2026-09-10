import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { persistedJSONStorage } from './storage';

export const API_CACHE_STORAGE_KEY = 'tslprb.api-cache';
export const useApiCache = create<{
  entries: Record<string, unknown>;
  epoch: number;
  put: (key: string, value: unknown) => void;
  reset: () => void;
}>()(
  persist(
    (set) => ({
      entries: {},
      epoch: 0,
      put: (key, value) => set((state) => ({ entries: { ...state.entries, [key]: value } })),
      reset: () => set((state) => ({ entries: {}, epoch: state.epoch + 1 })),
    }),
    { name: API_CACHE_STORAGE_KEY, storage: persistedJSONStorage() },
  ),
);
