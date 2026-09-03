import Storage from 'expo-sqlite/kv-store';

import { STUDY_STORAGE_KEY, useStudyStore } from '../study';

const read = () => useStudyStore.getState();

beforeEach(() => {
  read().reset();
});

describe('study store', () => {
  it('starts with nothing read', () => {
    expect(read().read).toEqual({});
    expect(read().isRead('st-ar-percentages')).toBe(false);
  });

  it('marks a topic read and answers for it', () => {
    read().markRead('st-ar-percentages');
    expect(read().isRead('st-ar-percentages')).toBe(true);
    expect(read().isRead('st-re-coding')).toBe(false);
  });

  it('keeps every topic it is given', () => {
    read().markRead('st-ar-percentages');
    read().markRead('st-tg-statehood');
    expect(read().read).toEqual({ 'st-ar-percentages': true, 'st-tg-statehood': true });
  });

  // The list renders one row per topic and reads the record on each; a new object per press
  // would re-render the whole shelf for a mark that changed nothing.
  it('returns the same record when a topic is marked twice', () => {
    read().markRead('st-ar-percentages');
    const first = read().read;
    read().markRead('st-ar-percentages');
    expect(read().read).toBe(first);
  });

  it('persists the marks under its own key', () => {
    read().markRead('st-gs-polity', 1_700_000_000_000);
    const stored = Storage.getItemSync(STUDY_STORAGE_KEY);
    expect(stored).not.toBeNull();
    expect(JSON.parse(stored as string).state).toEqual({
      read: { 'st-gs-polity': true },
      lastRead: { id: 'st-gs-polity', at: 1_700_000_000_000 },
    });
  });
});

// F-23 — the bookmark Home's Continue card reads.
describe('study store (last read)', () => {
  it('starts with no bookmark', () => {
    expect(read().lastRead).toBeUndefined();
  });

  // Where the reader *was*, not what they finished: a topic put down half way is still the
  // one to come back to.
  it('moves the bookmark when a topic is merely opened', () => {
    read().open('st-ar-percentages', 10);
    expect(read().lastRead).toEqual({ id: 'st-ar-percentages', at: 10 });
    expect(read().isRead('st-ar-percentages')).toBe(false);
  });

  it('moves the bookmark when a topic is marked read', () => {
    read().markRead('st-tg-statehood', 20);
    expect(read().lastRead).toEqual({ id: 'st-tg-statehood', at: 20 });
  });

  it('keeps the latest of several topics', () => {
    read().open('st-ar-percentages', 10);
    read().open('st-re-coding', 30);
    expect(read().lastRead?.id).toBe('st-re-coding');
  });

  it('clears with the marks', () => {
    read().open('st-ar-percentages', 10);
    read().reset();
    expect(read().lastRead).toBeUndefined();
  });
});
