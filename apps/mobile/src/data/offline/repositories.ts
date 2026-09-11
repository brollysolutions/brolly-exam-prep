import type { OfflineDatabase, SqlValue } from './database';

export type UserScope = { userId: string };

export type CachedContent<T = unknown> = {
  cacheKey: string;
  version: string;
  payload: T;
  updatedAt: number;
};

export type CachedTest<T = unknown> = {
  testId: string;
  payload: T;
  sortOrder: number;
  updatedAt: number;
};

export type CachedPaper<T = unknown> = {
  testId: string;
  payload: T;
  updatedAt: number;
};

export type LocalAttemptStatus =
  'running' | 'pending_submit' | 'submitting' | 'submitted' | 'auto_submitted' | 'sync_failed';

export type LocalAttempt = UserScope & {
  id: string;
  testId: string;
  serverAttemptId?: string;
  startedAt: number;
  endsAt: number;
  status: LocalAttemptStatus;
  resultId?: string;
  currentQuestion: number;
  currentQuestionId?: string;
  currentEnteredAt?: number;
  sectionUnlocked: boolean[];
  submissionRequestedAt?: number;
  submissionCompletedAt?: number;
  submissionAttemptCount: number;
  submissionNextAttemptAt?: number;
  submissionLastError?: string;
  submissionAuto: boolean;
  createdAt: number;
  updatedAt: number;
};

export type LocalAttemptUpdate = Partial<
  Pick<
    LocalAttempt,
    | 'serverAttemptId'
    | 'endsAt'
    | 'status'
    | 'resultId'
    | 'currentQuestion'
    | 'currentQuestionId'
    | 'currentEnteredAt'
    | 'sectionUnlocked'
    | 'submissionRequestedAt'
    | 'submissionCompletedAt'
    | 'submissionAttemptCount'
    | 'submissionNextAttemptAt'
    | 'submissionLastError'
    | 'submissionAuto'
  >
> & { updatedAt: number };

export type AnswerSyncState = 'clean' | 'dirty';

export type LocalAnswer = UserScope & {
  attemptId: string;
  questionId: string;
  questionNo: number;
  choice: number | null;
  marked: boolean;
  visited: boolean;
  revision: number;
  syncState: AnswerSyncState;
  updatedAt: number;
};

export type OutboxOperation = 'create_attempt' | 'patch_answer' | 'submit_attempt';
export type OutboxStatus = 'pending' | 'processing' | 'failed';

export type AnswerOutboxPayload = {
  question_id: string;
  choice: number | null;
  marked: boolean;
  revision: number;
};

export type OutboxEntry<T = unknown> = UserScope & {
  id: string;
  attemptId: string;
  operation: OutboxOperation;
  entityKey: string;
  revision: number;
  payload: T;
  status: OutboxStatus;
  attemptCount: number;
  nextAttemptAt?: number;
  lastError?: string;
  createdAt: number;
  updatedAt: number;
};

export type CachedResult<Detail = unknown, Paper = unknown> = UserScope & {
  resultId: string;
  testId: string;
  attemptId?: string;
  detail: Detail;
  paper?: Paper;
  updatedAt: number;
};

export type CachedResultIdentity = UserScope & {
  resultId: string;
  testId: string;
  attemptId?: string;
  updatedAt: number;
};

export type CachedResultPart<T = unknown> = CachedResultIdentity & { payload: T };

type ContentRow = {
  cache_key: string;
  version: string;
  payload_json: string;
  updated_at: number;
};

type TestRow = {
  test_id: string;
  payload_json: string;
  sort_order: number;
  updated_at: number;
};

type PaperRow = {
  test_id: string;
  payload_json: string;
  updated_at: number;
};

type AttemptRow = {
  user_id: string;
  id: string;
  test_id: string;
  server_attempt_id: string | null;
  started_at: number;
  ends_at: number;
  status: LocalAttemptStatus;
  result_id: string | null;
  current_question: number;
  current_question_id: string | null;
  current_entered_at: number | null;
  section_unlocked_json: string;
  submission_requested_at: number | null;
  submission_completed_at: number | null;
  submission_attempt_count: number;
  submission_next_attempt_at: number | null;
  submission_last_error: string | null;
  submission_auto: number;
  created_at: number;
  updated_at: number;
};

type AnswerRow = {
  user_id: string;
  attempt_id: string;
  question_id: string;
  question_no: number;
  choice: number | null;
  marked: number;
  visited: number;
  revision: number;
  sync_state: AnswerSyncState;
  updated_at: number;
};

type OutboxRow = {
  user_id: string;
  id: string;
  attempt_id: string;
  operation: OutboxOperation;
  entity_key: string;
  revision: number;
  payload_json: string;
  status: OutboxStatus;
  attempt_count: number;
  next_attempt_at: number | null;
  last_error: string | null;
  created_at: number;
  updated_at: number;
};

type ResultRow = {
  user_id: string;
  result_id: string;
  test_id: string;
  attempt_id: string | null;
  detail_json: string;
  paper_json: string | null;
  updated_at: number;
};

function requireId(value: string, name: string): string {
  if (!value.trim()) throw new Error(`${name} must not be empty`);
  return value;
}

function encodeJson(value: unknown): string {
  const encoded = JSON.stringify(value);
  if (encoded === undefined) throw new Error('Cannot store undefined as JSON');
  return encoded;
}

function decodeJson<T>(value: string): T {
  return JSON.parse(value) as T;
}

function decodeBooleanArray(value: string): boolean[] {
  const parsed = decodeJson<unknown>(value);
  if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== 'boolean')) {
    throw new Error('section_unlocked_json must be a boolean array');
  }
  return parsed;
}

const optional = (value: string | number | null): string | number | undefined =>
  value === null ? undefined : value;

function mapAttempt(row: AttemptRow): LocalAttempt {
  return {
    userId: row.user_id,
    id: row.id,
    testId: row.test_id,
    serverAttemptId: optional(row.server_attempt_id) as string | undefined,
    startedAt: row.started_at,
    endsAt: row.ends_at,
    status: row.status,
    resultId: optional(row.result_id) as string | undefined,
    currentQuestion: row.current_question,
    currentQuestionId: optional(row.current_question_id) as string | undefined,
    currentEnteredAt: optional(row.current_entered_at) as number | undefined,
    sectionUnlocked: decodeBooleanArray(row.section_unlocked_json),
    submissionRequestedAt: optional(row.submission_requested_at) as number | undefined,
    submissionCompletedAt: optional(row.submission_completed_at) as number | undefined,
    submissionAttemptCount: row.submission_attempt_count,
    submissionNextAttemptAt: optional(row.submission_next_attempt_at) as number | undefined,
    submissionLastError: optional(row.submission_last_error) as string | undefined,
    submissionAuto: row.submission_auto === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAnswer(row: AnswerRow): LocalAnswer {
  return {
    userId: row.user_id,
    attemptId: row.attempt_id,
    questionId: row.question_id,
    questionNo: row.question_no,
    choice: row.choice,
    marked: row.marked === 1,
    visited: row.visited === 1,
    revision: row.revision,
    syncState: row.sync_state,
    updatedAt: row.updated_at,
  };
}

function mapOutbox<T>(row: OutboxRow): OutboxEntry<T> {
  return {
    userId: row.user_id,
    id: row.id,
    attemptId: row.attempt_id,
    operation: row.operation,
    entityKey: row.entity_key,
    revision: row.revision,
    payload: decodeJson<T>(row.payload_json),
    status: row.status,
    attemptCount: row.attempt_count,
    nextAttemptAt: optional(row.next_attempt_at) as number | undefined,
    lastError: optional(row.last_error) as string | undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createCachedContentRepository(database: OfflineDatabase) {
  return {
    async put<T>(entry: CachedContent<T>): Promise<void> {
      await database.runAsync(
        `INSERT INTO cached_content (cache_key, version, payload_json, updated_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(cache_key) DO UPDATE SET
           version = excluded.version,
           payload_json = excluded.payload_json,
           updated_at = excluded.updated_at`,
        requireId(entry.cacheKey, 'cacheKey'),
        entry.version,
        encodeJson(entry.payload),
        entry.updatedAt,
      );
    },

    async get<T>(cacheKey = 'current'): Promise<CachedContent<T> | undefined> {
      const row = await database.getFirstAsync<ContentRow>(
        'SELECT cache_key, version, payload_json, updated_at FROM cached_content WHERE cache_key = ?',
        requireId(cacheKey, 'cacheKey'),
      );
      return row
        ? {
            cacheKey: row.cache_key,
            version: row.version,
            payload: decodeJson<T>(row.payload_json),
            updatedAt: row.updated_at,
          }
        : undefined;
    },

    async delete(cacheKey = 'current'): Promise<boolean> {
      const result = await database.runAsync(
        'DELETE FROM cached_content WHERE cache_key = ?',
        requireId(cacheKey, 'cacheKey'),
      );
      return result.changes > 0;
    },
  };
}

export function createCachedTestsRepository(database: OfflineDatabase) {
  const write = async <T>(target: OfflineDatabase, entry: CachedTest<T>): Promise<void> => {
    await target.runAsync(
      `INSERT INTO cached_tests (test_id, payload_json, sort_order, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(test_id) DO UPDATE SET
         payload_json = excluded.payload_json,
         sort_order = excluded.sort_order,
         updated_at = excluded.updated_at`,
      requireId(entry.testId, 'testId'),
      encodeJson(entry.payload),
      entry.sortOrder,
      entry.updatedAt,
    );
  };

  return {
    async put<T>(entry: CachedTest<T>): Promise<void> {
      await write(database, entry);
    },

    async get<T>(testId: string): Promise<CachedTest<T> | undefined> {
      const row = await database.getFirstAsync<TestRow>(
        'SELECT test_id, payload_json, sort_order, updated_at FROM cached_tests WHERE test_id = ?',
        requireId(testId, 'testId'),
      );
      return row
        ? {
            testId: row.test_id,
            payload: decodeJson<T>(row.payload_json),
            sortOrder: row.sort_order,
            updatedAt: row.updated_at,
          }
        : undefined;
    },

    async list<T>(): Promise<CachedTest<T>[]> {
      const rows = await database.getAllAsync<TestRow>(
        `SELECT test_id, payload_json, sort_order, updated_at
         FROM cached_tests ORDER BY sort_order, test_id`,
      );
      return rows.map((row) => ({
        testId: row.test_id,
        payload: decodeJson<T>(row.payload_json),
        sortOrder: row.sort_order,
        updatedAt: row.updated_at,
      }));
    },

    /** Lists only tests confirmed by the latest catalog response. */
    async listCatalog<T>(): Promise<CachedTest<T>[]> {
      const rows = await database.getAllAsync<TestRow>(
        `SELECT test_id, payload_json, sort_order, updated_at
         FROM cached_tests WHERE sort_order >= 0 ORDER BY sort_order, test_id`,
      );
      return rows.map((row) => ({
        testId: row.test_id,
        payload: decodeJson<T>(row.payload_json),
        sortOrder: row.sort_order,
        updatedAt: row.updated_at,
      }));
    },

    /** Atomically replaces catalog membership while retaining metadata-only rows. */
    async replaceCatalog<T>(entries: CachedTest<T>[]): Promise<void> {
      await database.withExclusiveTransactionAsync(async (transaction) => {
        await transaction.runAsync('DELETE FROM cached_tests WHERE sort_order >= 0');
        for (const entry of entries) await write(transaction, entry);
      });
    },

    async delete(testId: string): Promise<boolean> {
      const result = await database.runAsync(
        'DELETE FROM cached_tests WHERE test_id = ?',
        requireId(testId, 'testId'),
      );
      return result.changes > 0;
    },
  };
}

export function createCachedPapersRepository(database: OfflineDatabase) {
  return {
    async put<T>(entry: CachedPaper<T>): Promise<void> {
      await database.runAsync(
        `INSERT INTO cached_papers (test_id, payload_json, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(test_id) DO UPDATE SET
           payload_json = excluded.payload_json,
           updated_at = excluded.updated_at`,
        requireId(entry.testId, 'testId'),
        encodeJson(entry.payload),
        entry.updatedAt,
      );
    },

    async get<T>(testId: string): Promise<CachedPaper<T> | undefined> {
      const row = await database.getFirstAsync<PaperRow>(
        'SELECT test_id, payload_json, updated_at FROM cached_papers WHERE test_id = ?',
        requireId(testId, 'testId'),
      );
      return row
        ? {
            testId: row.test_id,
            payload: decodeJson<T>(row.payload_json),
            updatedAt: row.updated_at,
          }
        : undefined;
    },

    async delete(testId: string): Promise<boolean> {
      const result = await database.runAsync(
        'DELETE FROM cached_papers WHERE test_id = ?',
        requireId(testId, 'testId'),
      );
      return result.changes > 0;
    },
  };
}

export function createLocalAttemptsRepository(database: OfflineDatabase) {
  return {
    async insert(attempt: LocalAttempt): Promise<void> {
      await database.runAsync(
        `INSERT INTO local_attempts (
           user_id, id, test_id, server_attempt_id, started_at, ends_at, status,
           result_id, current_question, current_question_id, current_entered_at,
           section_unlocked_json, submission_requested_at, submission_completed_at,
           submission_attempt_count, submission_next_attempt_at, submission_last_error,
           submission_auto, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        requireId(attempt.userId, 'userId'),
        requireId(attempt.id, 'attempt id'),
        requireId(attempt.testId, 'testId'),
        attempt.serverAttemptId ?? null,
        attempt.startedAt,
        attempt.endsAt,
        attempt.status,
        attempt.resultId ?? null,
        attempt.currentQuestion,
        attempt.currentQuestionId ?? null,
        attempt.currentEnteredAt ?? null,
        encodeJson(attempt.sectionUnlocked),
        attempt.submissionRequestedAt ?? null,
        attempt.submissionCompletedAt ?? null,
        attempt.submissionAttemptCount,
        attempt.submissionNextAttemptAt ?? null,
        attempt.submissionLastError ?? null,
        attempt.submissionAuto ? 1 : 0,
        attempt.createdAt,
        attempt.updatedAt,
      );
    },

    async update(scope: UserScope, id: string, patch: LocalAttemptUpdate): Promise<boolean> {
      const assignments: string[] = [];
      const params: SqlValue[] = [];
      if ('serverAttemptId' in patch) {
        assignments.push('server_attempt_id = ?');
        params.push(patch.serverAttemptId ?? null);
      }
      if (patch.endsAt !== undefined) {
        assignments.push('ends_at = ?');
        params.push(patch.endsAt);
      }
      if (patch.status !== undefined) {
        assignments.push('status = ?');
        params.push(patch.status);
      }
      if ('resultId' in patch) {
        assignments.push('result_id = ?');
        params.push(patch.resultId ?? null);
      }
      if (patch.currentQuestion !== undefined) {
        assignments.push('current_question = ?');
        params.push(patch.currentQuestion);
      }
      if ('currentQuestionId' in patch) {
        assignments.push('current_question_id = ?');
        params.push(patch.currentQuestionId ?? null);
      }
      if ('currentEnteredAt' in patch) {
        assignments.push('current_entered_at = ?');
        params.push(patch.currentEnteredAt ?? null);
      }
      if (patch.sectionUnlocked !== undefined) {
        assignments.push('section_unlocked_json = ?');
        params.push(encodeJson(patch.sectionUnlocked));
      }
      if ('submissionRequestedAt' in patch) {
        assignments.push('submission_requested_at = ?');
        params.push(patch.submissionRequestedAt ?? null);
      }
      if ('submissionCompletedAt' in patch) {
        assignments.push('submission_completed_at = ?');
        params.push(patch.submissionCompletedAt ?? null);
      }
      if (patch.submissionAttemptCount !== undefined) {
        assignments.push('submission_attempt_count = ?');
        params.push(patch.submissionAttemptCount);
      }
      if ('submissionNextAttemptAt' in patch) {
        assignments.push('submission_next_attempt_at = ?');
        params.push(patch.submissionNextAttemptAt ?? null);
      }
      if ('submissionLastError' in patch) {
        assignments.push('submission_last_error = ?');
        params.push(patch.submissionLastError ?? null);
      }
      if (patch.submissionAuto !== undefined) {
        assignments.push('submission_auto = ?');
        params.push(patch.submissionAuto ? 1 : 0);
      }
      assignments.push('updated_at = ?');
      params.push(patch.updatedAt, requireId(scope.userId, 'userId'), requireId(id, 'attempt id'));
      const result = await database.runAsync(
        `UPDATE local_attempts SET ${assignments.join(', ')} WHERE user_id = ? AND id = ?`,
        ...params,
      );
      return result.changes > 0;
    },

    async get(scope: UserScope, id: string): Promise<LocalAttempt | undefined> {
      const row = await database.getFirstAsync<AttemptRow>(
        `SELECT user_id, id, test_id, server_attempt_id, started_at, ends_at, status,
                result_id, current_question, current_question_id, current_entered_at,
                section_unlocked_json, submission_requested_at, submission_completed_at,
                submission_attempt_count, submission_next_attempt_at, submission_last_error,
                submission_auto, created_at, updated_at
         FROM local_attempts WHERE user_id = ? AND id = ?`,
        requireId(scope.userId, 'userId'),
        requireId(id, 'attempt id'),
      );
      return row ? mapAttempt(row) : undefined;
    },

    async findByResultId(
      scope: UserScope,
      resultId: string,
    ): Promise<LocalAttempt | undefined> {
      const row = await database.getFirstAsync<AttemptRow>(
        `SELECT user_id, id, test_id, server_attempt_id, started_at, ends_at, status,
                result_id, current_question, current_question_id, current_entered_at,
                section_unlocked_json, submission_requested_at, submission_completed_at,
                submission_attempt_count, submission_next_attempt_at, submission_last_error,
                submission_auto, created_at, updated_at
         FROM local_attempts WHERE user_id = ? AND result_id = ?
         ORDER BY updated_at DESC, id LIMIT 1`,
        requireId(scope.userId, 'userId'),
        requireId(resultId, 'resultId'),
      );
      return row ? mapAttempt(row) : undefined;
    },

    async list(scope: UserScope): Promise<LocalAttempt[]> {
      const rows = await database.getAllAsync<AttemptRow>(
        `SELECT user_id, id, test_id, server_attempt_id, started_at, ends_at, status,
                result_id, current_question, current_question_id, current_entered_at,
                section_unlocked_json, submission_requested_at, submission_completed_at,
                submission_attempt_count, submission_next_attempt_at, submission_last_error,
                submission_auto, created_at, updated_at
         FROM local_attempts WHERE user_id = ? ORDER BY updated_at DESC`,
        requireId(scope.userId, 'userId'),
      );
      return rows.map(mapAttempt);
    },

    async listUnfinished(scope: UserScope, testId?: string): Promise<LocalAttempt[]> {
      const params: SqlValue[] = [requireId(scope.userId, 'userId')];
      const testClause = testId === undefined ? '' : ' AND test_id = ?';
      if (testId !== undefined) params.push(requireId(testId, 'testId'));
      const rows = await database.getAllAsync<AttemptRow>(
        `SELECT user_id, id, test_id, server_attempt_id, started_at, ends_at, status,
                result_id, current_question, current_question_id, current_entered_at,
                section_unlocked_json, submission_requested_at, submission_completed_at,
                submission_attempt_count, submission_next_attempt_at, submission_last_error,
                submission_auto, created_at, updated_at
         FROM local_attempts
         WHERE user_id = ?
           AND status IN ('running', 'pending_submit', 'submitting', 'sync_failed')${testClause}
         ORDER BY updated_at DESC, id`,
        ...params,
      );
      return rows.map(mapAttempt);
    },

    async listPendingSubmissions(scope: UserScope): Promise<LocalAttempt[]> {
      const rows = await database.getAllAsync<AttemptRow>(
        `SELECT user_id, id, test_id, server_attempt_id, started_at, ends_at, status,
                result_id, current_question, current_question_id, current_entered_at,
                section_unlocked_json, submission_requested_at, submission_completed_at,
                submission_attempt_count, submission_next_attempt_at, submission_last_error,
                submission_auto, created_at, updated_at
         FROM local_attempts
         WHERE user_id = ? AND status IN ('pending_submit', 'submitting')
         ORDER BY submission_requested_at, updated_at, id`,
        requireId(scope.userId, 'userId'),
      );
      return rows.map(mapAttempt);
    },

    /** Idempotently records completion intent without erasing retry/recovery evidence. */
    async requestSubmission(
      scope: UserScope,
      id: string,
      requestedAt: number,
      auto: boolean,
    ): Promise<boolean> {
      const result = await database.runAsync(
        `UPDATE local_attempts
         SET status = CASE WHEN status = 'running' THEN 'pending_submit' ELSE status END,
             submission_requested_at = COALESCE(submission_requested_at, ?),
             submission_auto = CASE WHEN submission_auto = 1 OR ? = 1 THEN 1 ELSE 0 END,
             updated_at = ?
         WHERE user_id = ? AND id = ?
           AND status IN ('running', 'pending_submit', 'submitting')`,
        requestedAt,
        auto ? 1 : 0,
        requestedAt,
        requireId(scope.userId, 'userId'),
        requireId(id, 'attempt id'),
      );
      return result.changes > 0;
    },

    /** Atomic per-attempt claim used before the non-idempotent submit POST. */
    async claimSubmission(scope: UserScope, id: string, now: number): Promise<boolean> {
      const result = await database.runAsync(
        `UPDATE local_attempts
         SET status = 'submitting',
             submission_attempt_count = submission_attempt_count + 1,
             submission_next_attempt_at = NULL,
             submission_last_error = NULL,
             updated_at = ?
         WHERE user_id = ? AND id = ? AND status = 'pending_submit'
           AND (submission_next_attempt_at IS NULL OR submission_next_attempt_at <= ?)`,
        now,
        requireId(scope.userId, 'userId'),
        requireId(id, 'attempt id'),
        now,
      );
      return result.changes > 0;
    },

    /** Lets an explicit retry bypass only a temporary/waiting submission delay. */
    async makeTemporarySubmissionRetryDue(
      scope: UserScope,
      id: string,
      updatedAt: number,
    ): Promise<boolean> {
      const result = await database.runAsync(
        `UPDATE local_attempts
         SET submission_next_attempt_at = NULL, updated_at = ?
         WHERE user_id = ? AND id = ? AND status = 'pending_submit'
           AND submission_next_attempt_at IS NOT NULL
           AND (
             submission_last_error LIKE 'waiting:%'
             OR submission_last_error LIKE 'temporary:%'
           )`,
        updatedAt,
        requireId(scope.userId, 'userId'),
        requireId(id, 'attempt id'),
      );
      return result.changes > 0;
    },

    async resumeSubmissionAuthFailures(scope: UserScope, updatedAt: number): Promise<number> {
      const result = await database.runAsync(
        `UPDATE local_attempts
         SET submission_next_attempt_at = NULL, submission_last_error = NULL, updated_at = ?
         WHERE user_id = ? AND status IN ('pending_submit', 'submitting')
           AND submission_last_error LIKE 'auth:%'`,
        updatedAt,
        requireId(scope.userId, 'userId'),
      );
      return result.changes;
    },

    async nextSubmissionRetryAt(scope: UserScope): Promise<number | undefined> {
      const row = await database.getFirstAsync<{ next_attempt_at: number | null }>(
        `SELECT MIN(submission_next_attempt_at) AS next_attempt_at
         FROM local_attempts
         WHERE user_id = ? AND status IN ('pending_submit', 'submitting')
           AND submission_next_attempt_at IS NOT NULL`,
        requireId(scope.userId, 'userId'),
      );
      return row?.next_attempt_at ?? undefined;
    },

    async delete(scope: UserScope, id: string): Promise<boolean> {
      const result = await database.runAsync(
        'DELETE FROM local_attempts WHERE user_id = ? AND id = ?',
        requireId(scope.userId, 'userId'),
        requireId(id, 'attempt id'),
      );
      return result.changes > 0;
    },
  };
}

export function createLocalAnswersRepository(database: OfflineDatabase) {
  return {
    async put(answer: LocalAnswer): Promise<void> {
      await database.runAsync(
        `INSERT INTO local_answers (
           user_id, attempt_id, question_id, question_no, choice, marked, visited,
           revision, sync_state, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(user_id, attempt_id, question_id) DO UPDATE SET
           question_no = excluded.question_no,
           choice = excluded.choice,
           marked = excluded.marked,
           visited = excluded.visited,
           revision = excluded.revision,
           sync_state = excluded.sync_state,
           updated_at = excluded.updated_at`,
        requireId(answer.userId, 'userId'),
        requireId(answer.attemptId, 'attemptId'),
        requireId(answer.questionId, 'questionId'),
        answer.questionNo,
        answer.choice,
        answer.marked ? 1 : 0,
        answer.visited ? 1 : 0,
        answer.revision,
        answer.syncState,
        answer.updatedAt,
      );
    },

    async get(
      scope: UserScope,
      attemptId: string,
      questionId: string,
    ): Promise<LocalAnswer | undefined> {
      const row = await database.getFirstAsync<AnswerRow>(
        `SELECT user_id, attempt_id, question_id, question_no, choice, marked, visited,
                revision, sync_state, updated_at
         FROM local_answers WHERE user_id = ? AND attempt_id = ? AND question_id = ?`,
        requireId(scope.userId, 'userId'),
        requireId(attemptId, 'attemptId'),
        requireId(questionId, 'questionId'),
      );
      return row ? mapAnswer(row) : undefined;
    },

    async list(scope: UserScope, attemptId: string): Promise<LocalAnswer[]> {
      const rows = await database.getAllAsync<AnswerRow>(
        `SELECT user_id, attempt_id, question_id, question_no, choice, marked, visited,
                revision, sync_state, updated_at
         FROM local_answers WHERE user_id = ? AND attempt_id = ? ORDER BY question_no`,
        requireId(scope.userId, 'userId'),
        requireId(attemptId, 'attemptId'),
      );
      return rows.map(mapAnswer);
    },

    async listDirty(scope: UserScope): Promise<LocalAnswer[]> {
      const rows = await database.getAllAsync<AnswerRow>(
        `SELECT user_id, attempt_id, question_id, question_no, choice, marked, visited,
                revision, sync_state, updated_at
         FROM local_answers
         WHERE user_id = ? AND sync_state = 'dirty'
         ORDER BY updated_at, attempt_id, question_no`,
        requireId(scope.userId, 'userId'),
      );
      return rows.map(mapAnswer);
    },

    async hasDirtyForAttempt(scope: UserScope, attemptId: string): Promise<boolean> {
      const row = await database.getFirstAsync<{ found: number }>(
        `SELECT 1 AS found FROM local_answers
         WHERE user_id = ? AND attempt_id = ? AND sync_state = 'dirty' LIMIT 1`,
        requireId(scope.userId, 'userId'),
        requireId(attemptId, 'attemptId'),
      );
      return row?.found === 1;
    },

    async markCleanIfRevision(
      scope: UserScope,
      attemptId: string,
      questionId: string,
      revision: number,
      updatedAt: number,
    ): Promise<boolean> {
      const result = await database.runAsync(
        `UPDATE local_answers
         SET sync_state = 'clean', updated_at = ?
         WHERE user_id = ? AND attempt_id = ? AND question_id = ? AND revision = ?`,
        updatedAt,
        requireId(scope.userId, 'userId'),
        requireId(attemptId, 'attemptId'),
        requireId(questionId, 'questionId'),
        revision,
      );
      return result.changes > 0;
    },

    async delete(scope: UserScope, attemptId: string, questionId: string): Promise<boolean> {
      const result = await database.runAsync(
        'DELETE FROM local_answers WHERE user_id = ? AND attempt_id = ? AND question_id = ?',
        requireId(scope.userId, 'userId'),
        requireId(attemptId, 'attemptId'),
        requireId(questionId, 'questionId'),
      );
      return result.changes > 0;
    },
  };
}

export function createSyncOutboxRepository(database: OfflineDatabase) {
  return {
    /** Coalesces one logical operation per attempt/entity while retaining the original row id. */
    async put<T>(entry: OutboxEntry<T>): Promise<void> {
      await database.runAsync(
        `INSERT INTO sync_outbox (
           user_id, id, attempt_id, operation, entity_key, revision, payload_json,
           status, attempt_count, next_attempt_at, last_error, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(user_id, attempt_id, operation, entity_key) DO UPDATE SET
           revision = excluded.revision,
           payload_json = excluded.payload_json,
           status = CASE
             WHEN sync_outbox.status = 'failed' AND sync_outbox.last_error LIKE 'auth:%'
             THEN sync_outbox.status ELSE excluded.status END,
           attempt_count = CASE
             WHEN sync_outbox.status = 'failed' AND sync_outbox.last_error LIKE 'auth:%'
             THEN sync_outbox.attempt_count ELSE excluded.attempt_count END,
           next_attempt_at = CASE
             WHEN sync_outbox.status = 'failed' AND sync_outbox.last_error LIKE 'auth:%'
             THEN sync_outbox.next_attempt_at ELSE excluded.next_attempt_at END,
           last_error = CASE
             WHEN sync_outbox.status = 'failed' AND sync_outbox.last_error LIKE 'auth:%'
             THEN sync_outbox.last_error ELSE excluded.last_error END,
           updated_at = excluded.updated_at`,
        requireId(entry.userId, 'userId'),
        requireId(entry.id, 'outbox id'),
        requireId(entry.attemptId, 'attemptId'),
        entry.operation,
        requireId(entry.entityKey, 'entityKey'),
        entry.revision,
        encodeJson(entry.payload),
        entry.status,
        entry.attemptCount,
        entry.nextAttemptAt ?? null,
        entry.lastError ?? null,
        entry.createdAt,
        entry.updatedAt,
      );
    },

    async get<T>(scope: UserScope, id: string): Promise<OutboxEntry<T> | undefined> {
      const row = await database.getFirstAsync<OutboxRow>(
        `SELECT user_id, id, attempt_id, operation, entity_key, revision, payload_json, status,
                attempt_count, next_attempt_at, last_error, created_at, updated_at
         FROM sync_outbox WHERE user_id = ? AND id = ?`,
        requireId(scope.userId, 'userId'),
        requireId(id, 'outbox id'),
      );
      return row ? mapOutbox<T>(row) : undefined;
    },

    async list(scope: UserScope): Promise<OutboxEntry[]> {
      const rows = await database.getAllAsync<OutboxRow>(
        `SELECT user_id, id, attempt_id, operation, entity_key, revision, payload_json, status,
                attempt_count, next_attempt_at, last_error, created_at, updated_at
         FROM sync_outbox WHERE user_id = ? ORDER BY created_at, id`,
        requireId(scope.userId, 'userId'),
      );
      return rows.map((row) => mapOutbox(row));
    },

    async listDue<T>(scope: UserScope, now: number, limit = 100): Promise<OutboxEntry<T>[]> {
      const rows = await database.getAllAsync<OutboxRow>(
        `SELECT user_id, id, attempt_id, operation, entity_key, revision, payload_json, status,
                attempt_count, next_attempt_at, last_error, created_at, updated_at
         FROM sync_outbox
         WHERE user_id = ? AND operation = 'patch_answer'
           AND (
             (status = 'pending' AND (next_attempt_at IS NULL OR next_attempt_at <= ?))
             OR (status = 'failed' AND next_attempt_at IS NOT NULL AND next_attempt_at <= ?)
           )
         ORDER BY created_at, id
         LIMIT ?`,
        requireId(scope.userId, 'userId'),
        now,
        now,
        limit,
      );
      return rows.map((row) => mapOutbox<T>(row));
    },

    async markProcessing(
      scope: UserScope,
      id: string,
      revision: number,
      updatedAt: number,
    ): Promise<boolean> {
      const result = await database.runAsync(
        `UPDATE sync_outbox
         SET status = 'processing', updated_at = ?
         WHERE user_id = ? AND id = ? AND revision = ?
           AND status IN ('pending', 'failed')`,
        updatedAt,
        requireId(scope.userId, 'userId'),
        requireId(id, 'outbox id'),
        revision,
      );
      return result.changes > 0;
    },

    async markFailed(
      scope: UserScope,
      id: string,
      revision: number,
      failure: {
        attemptCount: number;
        nextAttemptAt?: number;
        lastError: string;
        updatedAt: number;
      },
    ): Promise<boolean> {
      const result = await database.runAsync(
        `UPDATE sync_outbox
         SET status = 'failed', attempt_count = ?, next_attempt_at = ?,
             last_error = ?, updated_at = ?
         WHERE user_id = ? AND id = ? AND revision = ?`,
        failure.attemptCount,
        failure.nextAttemptAt ?? null,
        failure.lastError,
        failure.updatedAt,
        requireId(scope.userId, 'userId'),
        requireId(id, 'outbox id'),
        revision,
      );
      return result.changes > 0;
    },

    async deleteIfRevision(
      scope: UserScope,
      id: string,
      revision: number,
    ): Promise<boolean> {
      const result = await database.runAsync(
        'DELETE FROM sync_outbox WHERE user_id = ? AND id = ? AND revision = ?',
        requireId(scope.userId, 'userId'),
        requireId(id, 'outbox id'),
        revision,
      );
      return result.changes > 0;
    },

    async resetInterrupted(scope: UserScope, updatedAt: number): Promise<number> {
      const result = await database.runAsync(
        `UPDATE sync_outbox
         SET status = 'pending', next_attempt_at = NULL,
             last_error = 'interrupted', updated_at = ?
         WHERE user_id = ? AND operation = 'patch_answer' AND status = 'processing'`,
        updatedAt,
        requireId(scope.userId, 'userId'),
      );
      return result.changes;
    },

    async resumeAuthFailures(scope: UserScope, updatedAt: number): Promise<number> {
      const result = await database.runAsync(
        `UPDATE sync_outbox
         SET status = 'pending', attempt_count = 0, next_attempt_at = NULL,
             last_error = NULL, updated_at = ?
         WHERE user_id = ? AND operation = 'patch_answer'
           AND status = 'failed' AND last_error LIKE 'auth:%'`,
        updatedAt,
        requireId(scope.userId, 'userId'),
      );
      return result.changes;
    },

    async pauseForAuth(scope: UserScope, updatedAt: number): Promise<number> {
      const result = await database.runAsync(
        `UPDATE sync_outbox
         SET status = 'failed', next_attempt_at = NULL,
             last_error = 'auth:401', updated_at = ?
         WHERE user_id = ? AND operation = 'patch_answer'`,
        updatedAt,
        requireId(scope.userId, 'userId'),
      );
      return result.changes;
    },

    async hasAuthFailure(scope: UserScope): Promise<boolean> {
      const row = await database.getFirstAsync<{ found: number }>(
        `SELECT 1 AS found FROM sync_outbox
         WHERE user_id = ? AND operation = 'patch_answer'
           AND status = 'failed' AND last_error LIKE 'auth:%'
         LIMIT 1`,
        requireId(scope.userId, 'userId'),
      );
      return row?.found === 1;
    },

    async hasForAttempt(scope: UserScope, attemptId: string): Promise<boolean> {
      const row = await database.getFirstAsync<{ found: number }>(
        `SELECT 1 AS found FROM sync_outbox
         WHERE user_id = ? AND attempt_id = ? AND operation = 'patch_answer'
         LIMIT 1`,
        requireId(scope.userId, 'userId'),
        requireId(attemptId, 'attemptId'),
      );
      return row?.found === 1;
    },

    async hasPermanentFailureForAttempt(
      scope: UserScope,
      attemptId: string,
    ): Promise<boolean> {
      const row = await database.getFirstAsync<{ found: number }>(
        `SELECT 1 AS found FROM sync_outbox
         WHERE user_id = ? AND attempt_id = ? AND operation = 'patch_answer'
           AND status = 'failed' AND next_attempt_at IS NULL
           AND last_error LIKE 'permanent:%'
         LIMIT 1`,
        requireId(scope.userId, 'userId'),
        requireId(attemptId, 'attemptId'),
      );
      return row?.found === 1;
    },

    async nextRetryAtForAttempt(
      scope: UserScope,
      attemptId: string,
    ): Promise<number | undefined> {
      const row = await database.getFirstAsync<{ next_attempt_at: number | null }>(
        `SELECT MIN(next_attempt_at) AS next_attempt_at
         FROM sync_outbox
         WHERE user_id = ? AND attempt_id = ? AND operation = 'patch_answer'
           AND status = 'failed' AND next_attempt_at IS NOT NULL`,
        requireId(scope.userId, 'userId'),
        requireId(attemptId, 'attemptId'),
      );
      return row?.next_attempt_at ?? undefined;
    },

    /** Makes only temporary answer failures for one explicitly retried attempt due now. */
    async makeTemporaryFailuresDueForAttempt(
      scope: UserScope,
      attemptId: string,
      updatedAt: number,
    ): Promise<number> {
      const result = await database.runAsync(
        `UPDATE sync_outbox
         SET status = 'pending', next_attempt_at = NULL, updated_at = ?
         WHERE user_id = ? AND attempt_id = ? AND operation = 'patch_answer'
           AND (
             (status = 'failed' AND next_attempt_at IS NOT NULL
               AND last_error LIKE 'temporary:%')
             OR (status = 'pending' AND next_attempt_at IS NOT NULL)
           )`,
        updatedAt,
        requireId(scope.userId, 'userId'),
        requireId(attemptId, 'attemptId'),
      );
      return result.changes;
    },

    async nextRetryAt(scope: UserScope): Promise<number | undefined> {
      const row = await database.getFirstAsync<{ next_attempt_at: number | null }>(
        `SELECT MIN(next_attempt_at) AS next_attempt_at
         FROM sync_outbox
         WHERE user_id = ? AND operation = 'patch_answer'
           AND status = 'failed' AND next_attempt_at IS NOT NULL`,
        requireId(scope.userId, 'userId'),
      );
      return row?.next_attempt_at ?? undefined;
    },

    async delete(scope: UserScope, id: string): Promise<boolean> {
      const result = await database.runAsync(
        'DELETE FROM sync_outbox WHERE user_id = ? AND id = ?',
        requireId(scope.userId, 'userId'),
        requireId(id, 'outbox id'),
      );
      return result.changes > 0;
    },
  };
}

export function createCachedResultsRepository(database: OfflineDatabase) {
  return {
    async put<Detail, Paper>(entry: CachedResult<Detail, Paper>): Promise<void> {
      await database.runAsync(
        `INSERT INTO cached_results (
           user_id, result_id, test_id, attempt_id, detail_json, paper_json, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(user_id, result_id) DO UPDATE SET
           test_id = excluded.test_id,
           attempt_id = excluded.attempt_id,
           detail_json = excluded.detail_json,
           paper_json = excluded.paper_json,
           updated_at = excluded.updated_at`,
        requireId(entry.userId, 'userId'),
        requireId(entry.resultId, 'resultId'),
        requireId(entry.testId, 'testId'),
        entry.attemptId ?? null,
        encodeJson(entry.detail),
        entry.paper === undefined ? null : encodeJson(entry.paper),
        entry.updatedAt,
      );
    },

    async get<Detail, Paper>(
      scope: UserScope,
      resultId: string,
    ): Promise<CachedResult<Detail, Paper> | undefined> {
      const row = await database.getFirstAsync<ResultRow>(
        `SELECT user_id, result_id, test_id, attempt_id, detail_json, paper_json, updated_at
         FROM cached_results WHERE user_id = ? AND result_id = ?`,
        requireId(scope.userId, 'userId'),
        requireId(resultId, 'resultId'),
      );
      return row
        ? {
            userId: row.user_id,
            resultId: row.result_id,
            testId: row.test_id,
            attemptId: optional(row.attempt_id) as string | undefined,
            detail: decodeJson<Detail>(row.detail_json),
            paper: row.paper_json === null ? undefined : decodeJson<Paper>(row.paper_json),
            updatedAt: row.updated_at,
          }
        : undefined;
    },

    /** Updates result analysis without erasing an already-downloaded review paper. */
    async putDetail<Detail>(
      entry: CachedResultIdentity & { detail: Detail },
    ): Promise<void> {
      await database.runAsync(
        `INSERT INTO cached_results (
           user_id, result_id, test_id, attempt_id, detail_json, paper_json, updated_at
         ) VALUES (?, ?, ?, ?, ?, NULL, ?)
         ON CONFLICT(user_id, result_id) DO UPDATE SET
           test_id = excluded.test_id,
           attempt_id = excluded.attempt_id,
           detail_json = excluded.detail_json,
           updated_at = excluded.updated_at`,
        requireId(entry.userId, 'userId'),
        requireId(entry.resultId, 'resultId'),
        requireId(entry.testId, 'testId'),
        entry.attemptId ?? null,
        encodeJson(entry.detail),
        entry.updatedAt,
      );
    },

    /** A review paper is attached only to an existing, validated result-detail row. */
    async putPaper<Paper>(
      scope: UserScope,
      resultId: string,
      paper: Paper,
      updatedAt: number,
    ): Promise<boolean> {
      const result = await database.runAsync(
        `UPDATE cached_results SET paper_json = ?, updated_at = ?
         WHERE user_id = ? AND result_id = ?`,
        encodeJson(paper),
        updatedAt,
        requireId(scope.userId, 'userId'),
        requireId(resultId, 'resultId'),
      );
      return result.changes > 0;
    },

    async getIdentity(
      scope: UserScope,
      resultId: string,
    ): Promise<CachedResultIdentity | undefined> {
      const row = await database.getFirstAsync<ResultRow>(
        `SELECT user_id, result_id, test_id, attempt_id, detail_json, paper_json, updated_at
         FROM cached_results WHERE user_id = ? AND result_id = ?`,
        requireId(scope.userId, 'userId'),
        requireId(resultId, 'resultId'),
      );
      return row
        ? {
            userId: row.user_id,
            resultId: row.result_id,
            testId: row.test_id,
            attemptId: optional(row.attempt_id) as string | undefined,
            updatedAt: row.updated_at,
          }
        : undefined;
    },

    async getDetail<Detail>(
      scope: UserScope,
      resultId: string,
    ): Promise<CachedResultPart<Detail> | undefined> {
      const row = await database.getFirstAsync<ResultRow>(
        `SELECT user_id, result_id, test_id, attempt_id, detail_json, paper_json, updated_at
         FROM cached_results WHERE user_id = ? AND result_id = ?`,
        requireId(scope.userId, 'userId'),
        requireId(resultId, 'resultId'),
      );
      return row
        ? {
            userId: row.user_id,
            resultId: row.result_id,
            testId: row.test_id,
            attemptId: optional(row.attempt_id) as string | undefined,
            payload: decodeJson<Detail>(row.detail_json),
            updatedAt: row.updated_at,
          }
        : undefined;
    },

    async getPaper<Paper>(
      scope: UserScope,
      resultId: string,
    ): Promise<CachedResultPart<Paper> | undefined> {
      const row = await database.getFirstAsync<ResultRow>(
        `SELECT user_id, result_id, test_id, attempt_id, detail_json, paper_json, updated_at
         FROM cached_results WHERE user_id = ? AND result_id = ?`,
        requireId(scope.userId, 'userId'),
        requireId(resultId, 'resultId'),
      );
      if (!row || row.paper_json === null) return undefined;
      return {
        userId: row.user_id,
        resultId: row.result_id,
        testId: row.test_id,
        attemptId: optional(row.attempt_id) as string | undefined,
        payload: decodeJson<Paper>(row.paper_json),
        updatedAt: row.updated_at,
      };
    },

    async deletePaper(scope: UserScope, resultId: string): Promise<boolean> {
      const result = await database.runAsync(
        `UPDATE cached_results SET paper_json = NULL
         WHERE user_id = ? AND result_id = ? AND paper_json IS NOT NULL`,
        requireId(scope.userId, 'userId'),
        requireId(resultId, 'resultId'),
      );
      return result.changes > 0;
    },

    async list<Detail, Paper>(scope: UserScope): Promise<CachedResult<Detail, Paper>[]> {
      const rows = await database.getAllAsync<ResultRow>(
        `SELECT user_id, result_id, test_id, attempt_id, detail_json, paper_json, updated_at
         FROM cached_results WHERE user_id = ? ORDER BY updated_at DESC`,
        requireId(scope.userId, 'userId'),
      );
      return rows.map((row) => ({
        userId: row.user_id,
        resultId: row.result_id,
        testId: row.test_id,
        attemptId: optional(row.attempt_id) as string | undefined,
        detail: decodeJson<Detail>(row.detail_json),
        paper: row.paper_json === null ? undefined : decodeJson<Paper>(row.paper_json),
        updatedAt: row.updated_at,
      }));
    },

    async delete(scope: UserScope, resultId: string): Promise<boolean> {
      const result = await database.runAsync(
        'DELETE FROM cached_results WHERE user_id = ? AND result_id = ?',
        requireId(scope.userId, 'userId'),
        requireId(resultId, 'resultId'),
      );
      return result.changes > 0;
    },
  };
}

export function createOfflineRepositories(database: OfflineDatabase) {
  return {
    content: createCachedContentRepository(database),
    tests: createCachedTestsRepository(database),
    papers: createCachedPapersRepository(database),
    attempts: createLocalAttemptsRepository(database),
    answers: createLocalAnswersRepository(database),
    outbox: createSyncOutboxRepository(database),
    results: createCachedResultsRepository(database),
  };
}
