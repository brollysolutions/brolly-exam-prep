import { FREE_MOCK_SHORT, TESTS, type TestMeta } from '@tslprb/fixtures';

import { useAttemptStore, type AttemptState } from '../attempt';
import {
  cellState,
  counts,
  elapsedOnCurrentSec,
  isSectionLocked,
  progressFraction,
  remainingMs,
  sectionOf,
  totalQuestions,
} from '../attempt.selectors';

const FREE_MOCK = TESTS.find((t) => t.id === 'mock-07') as TestMeta;
const T0 = Date.parse('2026-09-02T10:00:00.000Z');

const store = () => useAttemptStore.getState();
const snapshot = (): AttemptState => useAttemptStore.getState();

/** gs is questions 21-30; telangana (31-40) unlocks only once every one is answered. */
const answerWholeGsSection = () => {
  for (let n = 21; n <= 30; n += 1) store().answer(n, 0);
};

beforeEach(() => {
  jest.spyOn(Date, 'now').mockReturnValue(T0);
  store().reset();
  store().start(FREE_MOCK);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('start', () => {
  it('arms the attempt with a deadline, not a counter', () => {
    const s = snapshot();
    expect(s.status).toBe('running');
    expect(s.testId).toBe('mock-07');
    expect(s.pattern).toEqual(FREE_MOCK_SHORT);
    expect(s.endsAt).toBe(T0 + FREE_MOCK_SHORT.durationMinutes * 60_000);
    expect(s.attemptId).toBeTruthy();
    expect(s.current).toBe(1);
    expect(s.currentEnteredAt).toBe(T0);
    expect(s.visited).toEqual({ 1: true });
    expect(s.answers).toEqual({});
    expect(s.marked).toEqual({});
  });

  it('honours a server-issued attempt id and deadline', () => {
    store().reset();
    store().start(FREE_MOCK, { attemptId: 'att-99', endsAt: T0 + 90_000 });
    expect(snapshot().attemptId).toBe('att-99');
    expect(snapshot().endsAt).toBe(T0 + 90_000);
  });

  it('locks only the section with an unlockAfter gate', () => {
    expect(snapshot().sectionUnlocked).toEqual([true, true, true, false]);
  });
});

describe('goto and section locking', () => {
  it('refuses a locked section and leaves current where it was', () => {
    expect(store().goto(31)).toBe('locked');
    expect(snapshot().current).toBe(1);
    expect(snapshot().visited[31]).toBeUndefined();
  });

  it('unlocks telangana once every gs question is answered', () => {
    answerWholeGsSection();
    expect(isSectionLocked(snapshot(), 3)).toBe(false);
    expect(snapshot().sectionUnlocked).toEqual([true, true, true, true]);
    expect(store().goto(31)).toBe('ok');
    expect(snapshot().current).toBe(31);
  });

  it('stays locked while a single gs question is unanswered', () => {
    for (let n = 21; n <= 29; n += 1) store().answer(n, 1);
    expect(isSectionLocked(snapshot(), 3)).toBe(true);
    expect(store().goto(35)).toBe('locked');
  });

  it('keeps a section unlocked once earned, even if an answer is cleared', () => {
    answerWholeGsSection();
    store().goto(31);
    store().clear(25);
    expect(isSectionLocked(snapshot(), 3)).toBe(false);
    expect(snapshot().current).toBe(31);
  });

  it('marks visited and restarts the per-question clock', () => {
    jest.spyOn(Date, 'now').mockReturnValue(T0 + 12_000);
    expect(store().goto(7)).toBe('ok');
    expect(snapshot().visited[7]).toBe(true);
    expect(snapshot().currentEnteredAt).toBe(T0 + 12_000);
  });

  it('is a no-op when asked for the question already on screen', () => {
    store().goto(7);
    const enteredAt = snapshot().currentEnteredAt;
    jest.spyOn(Date, 'now').mockReturnValue(T0 + 30_000);
    expect(store().goto(7)).toBe('ok');
    expect(snapshot().current).toBe(7);
    // re-tapping the current cell must not restart "time on this question"
    expect(snapshot().currentEnteredAt).toBe(enteredAt);
  });

  it('rejects a question number outside the paper', () => {
    expect(store().goto(0)).toBe('invalid');
    expect(store().goto(41)).toBe('invalid');
    expect(snapshot().current).toBe(1);
  });
});

describe('next and prev', () => {
  it('walks forwards and backwards', () => {
    expect(store().next()).toBe('ok');
    expect(snapshot().current).toBe(2);
    expect(store().prev()).toBe('ok');
    expect(snapshot().current).toBe(1);
  });

  it('will not step past the paper', () => {
    expect(store().prev()).toBe('invalid');
    expect(snapshot().current).toBe(1);
  });

  it('will not step into a locked section', () => {
    store().goto(30);
    expect(store().next()).toBe('locked');
    expect(snapshot().current).toBe(30);
  });
});

describe('answer, clear and toggleMark', () => {
  it('records a choice and counts the question as visited', () => {
    store().answer(4, 2);
    expect(snapshot().answers[4]).toBe(2);
    expect(snapshot().visited[4]).toBe(true);
  });

  it('clears a choice without forgetting the visit', () => {
    store().answer(4, 2);
    store().clear(4);
    expect(snapshot().answers[4]).toBeUndefined();
    expect(snapshot().visited[4]).toBe(true);
  });

  it('toggles a mark on and off', () => {
    store().toggleMark(8);
    expect(snapshot().marked[8]).toBe(true);
    store().toggleMark(8);
    expect(snapshot().marked[8]).toBeUndefined();
  });

  it('ignores writes to a locked section', () => {
    store().answer(31, 1);
    store().toggleMark(31);
    expect(snapshot().answers[31]).toBeUndefined();
    expect(snapshot().marked[31]).toBeUndefined();
  });

  it('freezes input once submitted', () => {
    store().submit();
    store().answer(2, 3);
    store().toggleMark(2);
    expect(snapshot().answers[2]).toBeUndefined();
    expect(snapshot().marked[2]).toBeUndefined();
  });
});

describe('submit, autoSubmit and reset', () => {
  it('moves to submitted', () => {
    store().submit();
    expect(snapshot().status).toBe('submitted');
  });

  it('moves to autoSubmitted', () => {
    store().autoSubmit();
    expect(snapshot().status).toBe('autoSubmitted');
  });

  it('does not overwrite a manual submit with an auto-submit', () => {
    store().submit();
    store().autoSubmit();
    expect(snapshot().status).toBe('submitted');
  });

  it('locks a durable pending submission and completes it with the server result id', () => {
    store().requestSubmission(false);
    expect(snapshot().status).toBe('pendingSubmit');
    store().answer(1, 2);
    expect(snapshot().answers[1]).toBeUndefined();
    store().beginSubmission();
    expect(snapshot().status).toBe('submitting');
    store().completeSubmission('result-1', false);
    expect(snapshot()).toMatchObject({ status: 'submitted', resultId: 'result-1' });
  });

  it('reset returns the store to idle', () => {
    store().answer(1, 1);
    store().reset();
    const s = snapshot();
    expect(s.status).toBe('idle');
    expect(s.attemptId).toBeUndefined();
    expect(s.pattern).toBeUndefined();
    expect(s.endsAt).toBeUndefined();
    expect(s.answers).toEqual({});
    expect(s.sectionUnlocked).toEqual([]);
  });
});

describe('selectors', () => {
  it('remainingMs counts down from the deadline and floors at zero', () => {
    const s = snapshot();
    expect(remainingMs(s, T0)).toBe(60 * 60_000);
    expect(remainingMs(s, T0 + 60_000)).toBe(59 * 60_000);
    expect(remainingMs(s, T0 + 999 * 60_000)).toBe(0);
  });

  it('remainingMs is zero for an unarmed attempt', () => {
    store().reset();
    expect(remainingMs(snapshot(), T0)).toBe(0);
  });

  it('cellState covers the full nv / na / a / m / am matrix', () => {
    store().goto(2); // visited, unanswered
    store().goto(3);
    store().answer(3, 0); // answered
    store().goto(4);
    store().toggleMark(4); // marked, unanswered
    store().goto(5);
    store().answer(5, 1);
    store().toggleMark(5); // answered + marked
    const s = snapshot();
    expect(cellState(s, 10)).toBe('nv');
    expect(cellState(s, 2)).toBe('na');
    expect(cellState(s, 3)).toBe('a');
    expect(cellState(s, 4)).toBe('m');
    expect(cellState(s, 5)).toBe('am');
  });

  it('counts match the prototype legend', () => {
    store().goto(2);
    store().goto(3);
    store().answer(3, 0);
    store().goto(4);
    store().toggleMark(4);
    store().goto(5);
    store().answer(5, 1);
    store().toggleMark(5);
    // visited: 1, 2, 3, 4, 5 — answered: 3, 5 — marked: 4, 5
    expect(counts(snapshot())).toEqual({
      answered: 2,
      notAnswered: 3,
      marked: 2,
      notVisited: 35,
    });
  });

  it('counts are all-zero-ish for an unarmed attempt', () => {
    store().reset();
    expect(counts(snapshot())).toEqual({
      answered: 0,
      notAnswered: 0,
      marked: 0,
      notVisited: 0,
    });
    expect(totalQuestions(snapshot())).toBe(0);
  });

  it('progressFraction is answered over total', () => {
    expect(progressFraction(snapshot())).toBe(0);
    store().answer(1, 0);
    store().answer(2, 0);
    expect(progressFraction(snapshot())).toBeCloseTo(0.05);
    answerWholeGsSection();
    expect(progressFraction(snapshot())).toBeCloseTo(12 / 40);
  });

  it('sectionOf maps question numbers onto the four sections', () => {
    const s = snapshot();
    expect(sectionOf(s, 1)).toBe(0);
    expect(sectionOf(s, 10)).toBe(0);
    expect(sectionOf(s, 11)).toBe(1);
    expect(sectionOf(s, 30)).toBe(2);
    expect(sectionOf(s, 40)).toBe(3);
  });

  it('elapsedOnCurrentSec measures time on the question in whole seconds', () => {
    expect(elapsedOnCurrentSec(snapshot(), T0 + 41_400)).toBe(41);
    expect(elapsedOnCurrentSec(snapshot(), T0 - 5_000)).toBe(0);
  });

  it('treats an empty gate section as satisfied rather than locking what follows', () => {
    const empty: AttemptState = {
      ...snapshot(),
      pattern: {
        ...FREE_MOCK_SHORT,
        totalQuestions: 10,
        sections: [
          { id: 'gs', labelKey: 'test.sections.gs', questions: 0 },
          { id: 'telangana', labelKey: 'test.sections.telangana', questions: 10, unlockAfter: 'gs' },
        ],
      },
      answers: {},
      sectionUnlocked: [true, false],
    };
    expect(isSectionLocked(empty, 1)).toBe(false);
  });

  it('isSectionLocked is false for sections without a gate', () => {
    const s = snapshot();
    expect(isSectionLocked(s, 0)).toBe(false);
    expect(isSectionLocked(s, 2)).toBe(false);
    expect(isSectionLocked(s, 9)).toBe(false);
  });
});
