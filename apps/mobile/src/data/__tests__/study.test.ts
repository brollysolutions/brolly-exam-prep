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
    read().markRead('st-gs-polity');
    const stored = Storage.getItemSync(STUDY_STORAGE_KEY);
    expect(stored).not.toBeNull();
    expect(JSON.parse(stored as string).state).toEqual({ read: { 'st-gs-polity': true } });
  });

  // Earlier builds persisted a `lastRead` bookmark for a Continue card that no longer exists
  // (review I3). A blob that still carries it has to load, and the field has to stop being
  // written back, or every old install keeps a dead value for ever.
  it('loads a record written by a build that still kept a bookmark, and drops it', async () => {
    Storage.setItemSync(
      STUDY_STORAGE_KEY,
      JSON.stringify({
        state: { read: { 'st-ar-percentages': true }, lastRead: { id: 'st-ar-percentages', at: 1 } },
        version: 0,
      }),
    );
    await useStudyStore.persist.rehydrate();
    expect(read().isRead('st-ar-percentages')).toBe(true);
    expect('lastRead' in read()).toBe(false);
    read().markRead('st-re-coding');
    expect(JSON.parse(Storage.getItemSync(STUDY_STORAGE_KEY) as string).state).toEqual({
      read: { 'st-ar-percentages': true, 'st-re-coding': true },
    });
  });
});
