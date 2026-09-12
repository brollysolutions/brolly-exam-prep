import Storage from 'expo-sqlite/kv-store';
import { createJSONStorage, type StateStorage } from 'zustand/middleware';

export type SyncKvStore = {
  getItemSync: (key: string) => string | null;
  setItemSync: (key: string, value: string) => void;
  removeItemSync: (key: string) => void;
};
export type StorageStatus = 'persistent' | 'temporary';
export const STORAGE_PROBE_KEY = 'tslprb.storage-check';
export type ReliableStorage = StateStorage & {
  subscribe: (listener: () => void) => () => void;
  getStatus: () => StorageStatus;
  retry: () => boolean;
};

/** Cache reads and retain failed writes/deletions until retry saves them durably. */
export function createKvStorage(store: SyncKvStore): ReliableStorage {
  const memory = new Map<string, string | null>();
  const pending = new Map<string, string | null>();
  const listeners = new Set<() => void>();
  let status: StorageStatus = 'persistent';
  const publish = (next: StorageStatus) => {
    if (status === next) return;
    status = next;
    listeners.forEach((listener) => listener());
  };
  const write = (name: string, value: string | null) => {
    if (value === null) store.removeItemSync(name);
    else store.setItemSync(name, value);
  };
  const change = (name: string, value: string | null) => {
    memory.set(name, value);
    pending.set(name, value);
    try {
      write(name, value);
      pending.delete(name);
    } catch {
      publish('temporary');
    }
  };
  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getStatus: () => status,
    getItem(name) {
      if (pending.has(name)) return memory.get(name) ?? null;
      try {
        const value = store.getItemSync(name);
        memory.set(name, value);
        return value;
      } catch {
        publish('temporary');
        return memory.get(name) ?? null;
      }
    },
    setItem: change,
    removeItem: (name) => change(name, null),
    retry() {
      try {
        for (const [name, value] of pending) {
          write(name, value);
          pending.delete(name);
        }
        const probe = STORAGE_PROBE_KEY;
        const previous = store.getItemSync(probe);
        store.setItemSync(probe, '1');
        write(probe, previous);
        publish('persistent');
        return true;
      } catch {
        publish('temporary');
        return false;
      }
    },
  };
}

export const kvStorage = createKvStorage(Storage);
export const persistedJSONStorage = () => createJSONStorage(() => kvStorage);
