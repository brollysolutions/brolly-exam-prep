import assert from 'node:assert/strict';
import test from 'node:test';
import { createKvStorage } from '../data/storage';

function fixture() {
  const disk = new Map<string, string>([
    ['existing', 'saved'],
    ['removed', 'old'],
  ]);
  let failWrites = false;
  let failReads = false;
  const storage = createKvStorage({
    getItemSync(key) {
      if (failReads) throw new Error('unavailable');
      return disk.get(key) ?? null;
    },
    setItemSync(key, value) {
      if (failWrites) throw new Error('quota');
      disk.set(key, value);
    },
    removeItemSync(key) {
      if (failWrites) throw new Error('blocked');
      disk.delete(key);
    },
  });
  return {
    disk,
    storage,
    writesFail: (fail: boolean) => {
      failWrites = fail;
    },
    readsFail: (fail: boolean) => {
      failReads = fail;
    },
  };
}

test('failed saves stay readable and retry persists the latest answers and deletions', () => {
  const f = fixture();
  let notifications = 0;
  const unsubscribe = f.storage.subscribe(() => notifications++);
  f.writesFail(true);
  f.storage.setItem('attempt', 'answer-A');
  f.storage.setItem('attempt', 'answer-C');
  f.storage.removeItem('removed');
  assert.equal(f.storage.getStatus(), 'temporary');
  assert.equal(notifications, 1);
  assert.equal(f.storage.getItem('attempt'), 'answer-C');
  assert.equal(f.storage.getItem('removed'), null);
  assert.equal(f.storage.getItem('existing'), 'saved');
  assert.equal(f.storage.retry(), false);
  f.writesFail(false);
  assert.equal(f.storage.retry(), true);
  assert.equal(f.disk.get('attempt'), 'answer-C');
  assert.equal(f.disk.has('removed'), false);
  assert.equal(f.disk.get('existing'), 'saved');
  assert.equal(f.storage.getStatus(), 'persistent');
  assert.equal(notifications, 2);
  unsubscribe();
});

test('a read failure retains cached data without abandoning other persisted keys', () => {
  const f = fixture();
  assert.equal(f.storage.getItem('existing'), 'saved');
  f.readsFail(true);
  assert.equal(f.storage.getItem('existing'), 'saved');
  assert.equal(f.storage.getStatus(), 'temporary');
  f.readsFail(false);
  assert.equal(f.storage.getItem('removed'), 'old');
  assert.equal(f.storage.retry(), true);
});

test('a later successful save cannot hide an older failed save', () => {
  const f = fixture();
  f.writesFail(true);
  f.storage.setItem('attempt', 'latest-answer');
  f.writesFail(false);
  f.storage.setItem('language', 'te');
  assert.equal(f.storage.getStatus(), 'temporary');
  assert.equal(f.storage.retry(), true);
  assert.equal(f.disk.get('attempt'), 'latest-answer');
  assert.equal(f.disk.get('language'), 'te');
});

test('partial recovery retains the remaining dirty keys for a second retry', () => {
  const disk = new Map<string, string>();
  let writable = false;
  let secondWritable = false;
  const storage = createKvStorage({
    getItemSync: (key) => disk.get(key) ?? null,
    setItemSync(key, value) {
      if (!writable || (key === 'history' && !secondWritable)) throw new Error('quota');
      disk.set(key, value);
    },
    removeItemSync: (key) => {
      disk.delete(key);
    },
  });
  storage.setItem('attempt', 'answer');
  storage.setItem('history', 'result');
  writable = true;
  assert.equal(storage.retry(), false);
  assert.equal(disk.get('attempt'), 'answer');
  assert.equal(storage.getItem('history'), 'result');
  secondWritable = true;
  assert.equal(storage.retry(), true);
  assert.equal(disk.get('history'), 'result');
});
