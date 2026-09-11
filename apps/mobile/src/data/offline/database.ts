import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

export const OFFLINE_DATABASE_NAME = 'brolly-offline.db';
export const OFFLINE_SCHEMA_VERSION = 4;

export type SqlValue = string | number | null | Uint8Array;

export type SqlRunResult = {
  changes: number;
  lastInsertRowId: number;
};

/** Small common surface shared by Expo SQLite and the in-memory SQLite test adapter. */
export interface OfflineDatabase {
  execAsync(source: string): Promise<void>;
  runAsync(source: string, ...params: SqlValue[]): Promise<SqlRunResult>;
  getFirstAsync<T>(source: string, ...params: SqlValue[]): Promise<T | null>;
  getAllAsync<T>(source: string, ...params: SqlValue[]): Promise<T[]>;
  withExclusiveTransactionAsync(
    task: (transaction: OfflineDatabase) => Promise<void>,
  ): Promise<void>;
}

type Migration = {
  version: number;
  sql: string;
};

/**
 * Versioned, forward-only migrations. Never edit an applied migration; append the next version.
 * `PRAGMA user_version` belongs to this database file and is committed with each migration.
 */
export const OFFLINE_MIGRATIONS: readonly Migration[] = [
  {
    version: 1,
    sql: `
      CREATE TABLE cached_content (
        cache_key TEXT PRIMARY KEY NOT NULL,
        version TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE cached_tests (
        test_id TEXT PRIMARY KEY NOT NULL,
        payload_json TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE cached_papers (
        test_id TEXT PRIMARY KEY NOT NULL,
        payload_json TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE local_attempts (
        user_id TEXT NOT NULL,
        id TEXT NOT NULL,
        test_id TEXT NOT NULL,
        server_attempt_id TEXT,
        started_at INTEGER NOT NULL,
        ends_at INTEGER NOT NULL,
        status TEXT NOT NULL CHECK (
          status IN ('running', 'pending_submit', 'submitting', 'submitted', 'auto_submitted', 'sync_failed')
        ),
        result_id TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        PRIMARY KEY (user_id, id),
        UNIQUE (user_id, server_attempt_id),
        UNIQUE (user_id, result_id)
      );

      CREATE TABLE local_answers (
        user_id TEXT NOT NULL,
        attempt_id TEXT NOT NULL,
        question_id TEXT NOT NULL,
        question_no INTEGER NOT NULL CHECK (question_no > 0),
        choice INTEGER CHECK (choice IS NULL OR choice BETWEEN 0 AND 3),
        marked INTEGER NOT NULL DEFAULT 0 CHECK (marked IN (0, 1)),
        revision INTEGER NOT NULL DEFAULT 0 CHECK (revision >= 0),
        sync_state TEXT NOT NULL DEFAULT 'dirty' CHECK (sync_state IN ('clean', 'dirty')),
        updated_at INTEGER NOT NULL,
        PRIMARY KEY (user_id, attempt_id, question_id),
        UNIQUE (user_id, attempt_id, question_no),
        FOREIGN KEY (user_id, attempt_id)
          REFERENCES local_attempts (user_id, id) ON DELETE CASCADE
      );

      CREATE TABLE sync_outbox (
        user_id TEXT NOT NULL,
        id TEXT NOT NULL,
        attempt_id TEXT NOT NULL,
        operation TEXT NOT NULL CHECK (
          operation IN ('create_attempt', 'patch_answer', 'submit_attempt')
        ),
        entity_key TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'failed')),
        attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
        next_attempt_at INTEGER,
        last_error TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        PRIMARY KEY (user_id, id),
        UNIQUE (user_id, attempt_id, operation, entity_key),
        FOREIGN KEY (user_id, attempt_id)
          REFERENCES local_attempts (user_id, id) ON DELETE CASCADE
      );

      CREATE TABLE cached_results (
        user_id TEXT NOT NULL,
        result_id TEXT NOT NULL,
        test_id TEXT NOT NULL,
        attempt_id TEXT,
        detail_json TEXT NOT NULL,
        paper_json TEXT,
        updated_at INTEGER NOT NULL,
        PRIMARY KEY (user_id, result_id),
        UNIQUE (user_id, attempt_id)
      );

      CREATE INDEX idx_cached_tests_order
        ON cached_tests (sort_order, test_id);
      CREATE INDEX idx_cached_papers_updated
        ON cached_papers (updated_at);
      CREATE INDEX idx_local_attempts_user_status
        ON local_attempts (user_id, status, updated_at DESC);
      CREATE INDEX idx_local_attempts_user_test
        ON local_attempts (user_id, test_id, updated_at DESC);
      CREATE INDEX idx_local_answers_attempt_sync
        ON local_answers (user_id, attempt_id, sync_state, question_no);
      CREATE INDEX idx_sync_outbox_due
        ON sync_outbox (user_id, status, next_attempt_at, created_at);
      CREATE INDEX idx_cached_results_user_test
        ON cached_results (user_id, test_id, updated_at DESC);
    `,
  },
  {
    version: 2,
    sql: `
      ALTER TABLE local_attempts
        ADD COLUMN current_question INTEGER NOT NULL DEFAULT 1 CHECK (current_question > 0);
      ALTER TABLE local_attempts
        ADD COLUMN current_question_id TEXT;
      ALTER TABLE local_attempts
        ADD COLUMN current_entered_at INTEGER;
      ALTER TABLE local_attempts
        ADD COLUMN section_unlocked_json TEXT NOT NULL DEFAULT '[]';
      ALTER TABLE local_answers
        ADD COLUMN visited INTEGER NOT NULL DEFAULT 1 CHECK (visited IN (0, 1));
    `,
  },
  {
    version: 3,
    sql: `
      ALTER TABLE sync_outbox
        ADD COLUMN revision INTEGER NOT NULL DEFAULT 0 CHECK (revision >= 0);
      CREATE INDEX idx_sync_outbox_answer_due
        ON sync_outbox (user_id, operation, status, next_attempt_at, created_at);
    `,
  },
  {
    version: 4,
    sql: `
      ALTER TABLE local_attempts
        ADD COLUMN submission_requested_at INTEGER;
      ALTER TABLE local_attempts
        ADD COLUMN submission_completed_at INTEGER;
      ALTER TABLE local_attempts
        ADD COLUMN submission_attempt_count INTEGER NOT NULL DEFAULT 0
          CHECK (submission_attempt_count >= 0);
      ALTER TABLE local_attempts
        ADD COLUMN submission_next_attempt_at INTEGER;
      ALTER TABLE local_attempts
        ADD COLUMN submission_last_error TEXT;
      ALTER TABLE local_attempts
        ADD COLUMN submission_auto INTEGER NOT NULL DEFAULT 0
          CHECK (submission_auto IN (0, 1));
      CREATE INDEX idx_local_attempts_pending_submission
        ON local_attempts (user_id, status, submission_next_attempt_at, updated_at);
    `,
  },
];

type VersionRow = { user_version: number };

/** Adapts Expo's overloaded methods to the deliberately small repository interface. */
function adaptExpoDatabase(database: SQLiteDatabase): OfflineDatabase {
  return {
    execAsync: (source) => database.execAsync(source),
    runAsync: async (source, ...params) => {
      const result = await database.runAsync(source, ...params);
      return { changes: result.changes, lastInsertRowId: result.lastInsertRowId };
    },
    getFirstAsync: (source, ...params) => database.getFirstAsync(source, ...params),
    getAllAsync: (source, ...params) => database.getAllAsync(source, ...params),
    withExclusiveTransactionAsync: (task) =>
      database.withExclusiveTransactionAsync(async (transaction) => {
        await task(adaptExpoDatabase(transaction));
      }),
  };
}

export async function getOfflineSchemaVersion(database: OfflineDatabase): Promise<number> {
  const row = await database.getFirstAsync<VersionRow>('PRAGMA user_version');
  return row?.user_version ?? 0;
}

/** Enables integrity settings and applies every migration newer than the database file. */
export async function initializeOfflineDatabase(database: OfflineDatabase): Promise<void> {
  await database.execAsync('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
  const currentVersion = await getOfflineSchemaVersion(database);
  if (currentVersion > OFFLINE_SCHEMA_VERSION) {
    throw new Error(
      `Offline database version ${currentVersion} is newer than supported version ${OFFLINE_SCHEMA_VERSION}`,
    );
  }

  for (const migration of OFFLINE_MIGRATIONS) {
    if (migration.version <= currentVersion) continue;
    await database.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.execAsync(migration.sql);
      await transaction.execAsync(`PRAGMA user_version = ${migration.version}`);
    });
  }
}

let databasePromise: Promise<OfflineDatabase> | undefined;

/** Opens and initializes the one application-owned offline database for this installation. */
export function getOfflineDatabase(): Promise<OfflineDatabase> {
  if (!databasePromise) {
    databasePromise = openDatabaseAsync(OFFLINE_DATABASE_NAME)
      .then((database) => {
        const adapted = adaptExpoDatabase(database);
        return initializeOfflineDatabase(adapted).then(() => adapted);
      })
      .catch((error) => {
        databasePromise = undefined;
        throw error;
      });
  }
  return databasePromise;
}

/** Test-only reset for the lazy singleton; it does not delete or close a database file. */
export function resetOfflineDatabaseForTests(): void {
  databasePromise = undefined;
}
