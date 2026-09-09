import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PWT_CONSTABLE } from '@tslprb/fixtures';
import type { AttemptState } from '../data/attempt';
import { counts, sectionCounts } from '../data/attempt.selectors';

const attempt: AttemptState = {
  pattern: PWT_CONSTABLE,
  current: 51,
  status: 'running',
  sectionUnlocked: [],
  answers: { 1: 0, 50: 2, 51: 1, 200: 3 },
  visited: { 1: true, 2: true, 3: true, 50: true, 51: true, 52: true, 200: true },
  marked: { 1: true, 3: true, 52: true },
};

test('submission summary respects exact section boundaries and option zero', () => {
  assert.deepEqual(sectionCounts(attempt, 0), {
    answered: 2,
    notAnswered: 2,
    marked: 2,
    notVisited: 46,
  });
  assert.deepEqual(sectionCounts(attempt, 1), {
    answered: 1,
    notAnswered: 1,
    marked: 1,
    notVisited: 48,
  });
  assert.deepEqual(sectionCounts(attempt, 2), {
    answered: 0,
    notAnswered: 0,
    marked: 0,
    notVisited: 80,
  });
  assert.deepEqual(sectionCounts(attempt, 3), {
    answered: 1,
    notAnswered: 0,
    marked: 0,
    notVisited: 19,
  });
});

test('section totals agree with the whole paper and review flags are overlapping', () => {
  const summed = PWT_CONSTABLE.sections.reduce(
    (total, section, index) => {
      const row = sectionCounts(attempt, index);
      assert.equal(row.answered + row.notAnswered + row.notVisited, section.questions);
      return {
        answered: total.answered + row.answered,
        notAnswered: total.notAnswered + row.notAnswered,
        marked: total.marked + row.marked,
        notVisited: total.notVisited + row.notVisited,
      };
    },
    { answered: 0, notAnswered: 0, marked: 0, notVisited: 0 },
  );
  assert.deepEqual(summed, counts(attempt));
});

test('clearing a marked answer keeps it visited and marked for review', () => {
  const cleared = { ...attempt, answers: { ...attempt.answers } };
  delete cleared.answers[1];
  assert.deepEqual(sectionCounts(cleared, 0), {
    answered: 1,
    notAnswered: 3,
    marked: 2,
    notVisited: 46,
  });
});

test('summary is safe for an idle attempt or an out-of-range section', () => {
  const empty = { answered: 0, notAnswered: 0, marked: 0, notVisited: 0 };
  assert.deepEqual(sectionCounts({ ...attempt, pattern: undefined }, 0), empty);
  assert.deepEqual(sectionCounts(attempt, 4), empty);
});
