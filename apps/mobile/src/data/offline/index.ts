export {
  getOfflineDatabase,
  getOfflineSchemaVersion,
  initializeOfflineDatabase,
  OFFLINE_DATABASE_NAME,
  OFFLINE_MIGRATIONS,
  OFFLINE_SCHEMA_VERSION,
  type OfflineDatabase,
} from './database';
export {
  createCachedContentRepository,
  createCachedPapersRepository,
  createCachedResultsRepository,
  createCachedTestsRepository,
  createLocalAnswersRepository,
  createLocalAttemptsRepository,
  createOfflineRepositories,
  createSyncOutboxRepository,
  type AnswerSyncState,
  type AnswerOutboxPayload,
  type CachedContent,
  type CachedPaper,
  type CachedResult,
  type CachedResultIdentity,
  type CachedResultPart,
  type CachedTest,
  type LocalAnswer,
  type LocalAttempt,
  type LocalAttemptStatus,
  type OutboxEntry,
  type OutboxOperation,
  type OutboxStatus,
  type UserScope,
} from './repositories';
export {
  getPublicReadCache,
  PublicReadCache,
  resetPublicReadCacheForTests,
  resolveCachedRead,
  type CachedRead,
  type CachedTestBundle,
} from './readCache';
export {
  getResultReadCache,
  resetResultReadCacheForTests,
  ResultReadCache,
  type ResultReadOptions,
} from './resultCache';
export { useCachedLoad, type CachedLoad } from './useCachedLoad';
export {
  DurableAttemptService,
  getDurableAttemptService,
  resetDurableAttemptServiceForTests,
  type AdoptAttemptInput,
  type CreateDurableAttemptInput,
  type RestoredAttempt,
  type SaveProgressInput,
} from './durableAttempts';
export {
  AnswerSyncService,
  classifySyncFailure,
  flushCurrentAttemptAnswers,
  getAnswerSyncService,
  requestAnswerSyncForCurrentUser,
  resetAnswerSyncServiceForTests,
  type AnswerSyncOptions,
  type AnswerSyncSummary,
} from './answerSync';
export {
  getSubmissionSyncService,
  requestCurrentAttemptSubmission,
  requestSubmissionSyncForCurrentUser,
  resetSubmissionSyncServiceForTests,
  SubmissionSyncService,
  type SubmissionSyncOptions,
  type SubmissionSyncSummary,
  type SubmittedAttempt,
} from './submissionSync';
export { AnswerSyncCoordinator } from './AnswerSyncCoordinator';
export {
  reconcileLocalUserScope,
  reconcileSignedInUserScope,
  type ScopeReconciliation,
} from './userScope';
