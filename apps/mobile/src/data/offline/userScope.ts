import { getOfflineDatabase, type OfflineDatabase } from './database';

/** Tables whose rows are owned by the scope key (`user:<id>` / `phone:<phone>`). */
const SCOPED_TABLES = [
  'local_attempts',
  'local_answers',
  'sync_outbox',
  'cached_results',
] as const;

export type ScopeReconciliation = { migrated: boolean; attempts: number };

/**
 * One-time adoption of offline data left under a phone-only scope when the same person later
 * signs in and is issued a backend user id. A session created before the user id was retained
 * owns its SQLite rows under `phone:<phone>`; a real sign-in re-scopes to `user:<id>`, which
 * would otherwise orphan that data (it is looked up under the new scope, not the old one).
 *
 * Additive and non-destructive: rows are re-owned, never deleted, and the move is skipped
 * entirely when the target scope already holds data, so two distinct accounts can never be
 * merged and no unique/foreign-key row is ever clobbered. Foreign-key checks are deferred to
 * the single commit so the parent `local_attempts` key and its children move together.
 */
export async function reconcileLocalUserScope(
  database: OfflineDatabase,
  fromUserId: string,
  toUserId: string,
): Promise<ScopeReconciliation> {
  if (!fromUserId || !toUserId || fromUserId === toUserId) {
    return { migrated: false, attempts: 0 };
  }

  let result: ScopeReconciliation = { migrated: false, attempts: 0 };
  await database.withExclusiveTransactionAsync(async (transaction) => {
    // Move the parent row and its FK children in one commit, not one statement at a time.
    await transaction.execAsync('PRAGMA defer_foreign_keys = ON');

    const source = await transaction.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) AS count FROM local_attempts WHERE user_id = ?',
      fromUserId,
    );
    const sourceCount = source?.count ?? 0;
    if (sourceCount === 0) return;

    const target = await transaction.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) AS count FROM local_attempts WHERE user_id = ?',
      toUserId,
    );
    // A non-empty target is a different account's data on a shared device — never merge.
    if ((target?.count ?? 0) > 0) return;

    for (const table of SCOPED_TABLES) {
      await transaction.runAsync(
        `UPDATE ${table} SET user_id = ? WHERE user_id = ?`,
        toUserId,
        fromUserId,
      );
    }
    result = { migrated: true, attempts: sourceCount };
  });
  return result;
}

/**
 * Re-scopes any phone-only offline data to the signed-in backend user, using the same scope
 * encoding as `offlineUserId`. Safe to call on every successful sign-in; it is a no-op unless
 * phone-scoped data exists and the user scope is empty.
 */
export async function reconcileSignedInUserScope(
  phone: string,
  userId: string,
): Promise<ScopeReconciliation> {
  if (!phone || !userId) return { migrated: false, attempts: 0 };
  const database = await getOfflineDatabase();
  return reconcileLocalUserScope(database, `phone:${phone}`, `user:${userId}`);
}
