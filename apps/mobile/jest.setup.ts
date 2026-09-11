/* eslint-disable @typescript-eslint/no-require-imports -- jest.mock factories must use require */
// RNTL 14 registers its jest matchers automatically; no extend-expect import needed.

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(() => Promise.resolve()),
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));
jest.mock('expo-font', () => ({
  useFonts: () => [true, null],
  isLoaded: () => true,
  loadAsync: jest.fn(),
}));
jest.mock('react-native-reanimated', () => ({
  ...require('react-native-reanimated/mock'),
  // The bundled mock leaves this out; motion helpers read it on every render.
  useReducedMotion: () => false,
}));
jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);
jest.mock('@gorhom/bottom-sheet', () => require('@gorhom/bottom-sheet/mock'));

// expo-sqlite/kv-store is native; tests get an in-memory store with the same sync + async surface.
jest.mock('expo-sqlite/kv-store', () => {
  const mem = new Map<string, string>();
  const store = {
    getItem: (k: string) => Promise.resolve(mem.get(k) ?? null),
    setItem: (k: string, v: string) => {
      mem.set(k, v);
      return Promise.resolve();
    },
    removeItem: (k: string) => {
      mem.delete(k);
      return Promise.resolve();
    },
    getItemSync: (k: string) => mem.get(k) ?? null,
    setItemSync: (k: string, v: string) => {
      mem.set(k, v);
    },
    removeItemSync: (k: string) => {
      mem.delete(k);
    },
  };
  return { __esModule: true, default: store, Storage: store, AsyncStorage: store };
});

// Screen tests explicitly use sample props/data; the running app loads this shape from FastAPI.
jest.mock('@/data/content', () => {
  const actual = jest.requireActual('@/data/content');
  const fixtures = jest.requireActual('@tslprb/fixtures');
  const physicalStandards = ['pc', 'si'].flatMap((post) =>
    ['male', 'female'].flatMap((gender) =>
      ['general', 'st'].map(
        (group) => fixtures.PHYSICAL_STANDARDS[post][gender][group],
      ),
    ),
  );
  return {
    ...actual,
    ...fixtures,
    CATEGORIES: actual.CATEGORIES,
    useContentData: () => ({
      version: 'jest-fixtures',
      notices: fixtures.NOTICES,
      affairs: fixtures.AFFAIRS,
      studySections: fixtures.STUDY_SECTIONS,
      studyTopics: fixtures.STUDY_TOPICS,
      examInfo: fixtures.EXAM_INFO,
      categories: fixtures.CATEGORIES,
      costRows: fixtures.COST_ROWS,
      physicalStandards,
      standardsNotificationYear: fixtures.STANDARDS_NOTIFICATION_YEAR,
    }),
  };
});
jest.mock('expo-sqlite', () => ({ openDatabaseAsync: jest.fn() }));
jest.mock('@/data/api', () => {
  const actual = jest.requireActual('@/data/api');
  const { MockApi } = jest.requireActual('@/data/testing/mockApi');
  let api: InstanceType<typeof MockApi> | undefined;
  return {
    ...actual,
    getApi: () => (api ??= new MockApi()),
    resetApi: () => { api = undefined; },
  };
});

// Route tests keep exercising their MockApi methods; dedicated offline tests unmock this
// module and use a real in-memory SQLite database.
jest.mock('@/data/offline/readCache', () => ({
  getPublicReadCache: async () => {
    const { getApi } = require('@/data/api');
    const api = getApi();
    return {
      readContent: async () => ({ fresh: api.getContent() }),
      readTestCatalog: async () => ({ fresh: api.listTestMetas() }),
      readTestMeta: async (testId: string) => ({ fresh: api.getTestMeta(testId) }),
      readTestPaper: async (testId: string) => ({ fresh: api.getPaper(testId) }),
      readTestBundle: async (testId: string) => ({
        fresh: Promise.all([api.getTestMeta(testId), api.getPaper(testId)]).then(
          ([meta, questions]) => ({ meta, questions }),
        ),
      }),
    };
  },
  resolveCachedRead: async <T>(readPromise: Promise<{ cached?: T; fresh: Promise<T> }>) => {
    const read = await readPromise;
    return read.cached === undefined ? read.fresh : read.cached;
  },
}));

// Route tests still exercise the authorized MockApi result methods. The dedicated Phase 6
// tests unmock this module and cover its real SQLite behavior.
jest.mock('@/data/offline/resultCache', () => ({
  getResultReadCache: async () => {
    const { getApi } = require('@/data/api');
    const api = getApi();
    return {
      readDetail: async (_scope: { userId: string }, resultId: string) => ({
        fresh: api.getResultDetail(resultId),
      }),
      readPaper: async (_scope: { userId: string }, resultId: string) => ({
        fresh: api.getReviewPaper(resultId),
      }),
    };
  },
  resetResultReadCacheForTests: () => undefined,
}));

jest.mock('@/data/offline/durableAttempts', () => {
  const service = {
    create: jest.fn(),
    adopt: jest.fn(),
    findLatest: jest.fn(async () => undefined),
    restore: jest.fn(async () => undefined),
    saveProgress: jest.fn(async () => undefined),
    flushWrites: jest.fn(async () => undefined),
    updateStatus: jest.fn(async () => undefined),
  };
  return {
    getDurableAttemptService: async () => service,
    resetDurableAttemptServiceForTests: () => undefined,
    __mockDurableAttemptService: service,
  };
});

jest.mock('@/data/offline/submissionSync', () => {
  const empty = () => ({
    completed: [],
    pending: 0,
    failed: 0,
    permanentFailures: 0,
    skipped: 0,
    pausedForAuth: false,
    offline: false,
  });
  const service = {
    requestSubmission: jest.fn(async () => ({ ...empty(), pending: 1 })),
    syncNow: jest.fn(async () => empty()),
    resumeAfterAuthentication: jest.fn(async () => empty()),
    dispose: jest.fn(),
  };
  return {
    getSubmissionSyncService: async () => service,
    requestCurrentAttemptSubmission: jest.fn(async (localAttemptId: string) => {
      const state = require('@/data/attempt').useAttemptStore.getState();
      if (!state.serverAttemptId) return { ...empty(), pending: 1, offline: true };
      const response = await require('@/data/api').getApi().submitAttempt(state.serverAttemptId);
      return {
        ...empty(),
        completed: [{
          localAttemptId,
          serverAttemptId: state.serverAttemptId,
          testId: state.testId,
          resultId: response.result_id,
        }],
      };
    }),
    requestSubmissionSyncForCurrentUser: jest.fn(async () => empty()),
    resetSubmissionSyncServiceForTests: () => undefined,
    __mockSubmissionSyncService: service,
  };
});

jest.mock('@/data/offline/answerSync', () => {
  const service = {
    syncNow: jest.fn(async () => undefined),
    resumeAfterAuthentication: jest.fn(async () => undefined),
    flushAttempt: jest.fn(async () => true),
    dispose: jest.fn(),
  };
  return {
    getAnswerSyncService: async () => service,
    requestAnswerSyncForCurrentUser: jest.fn(async () => undefined),
    flushCurrentAttemptAnswers: jest.fn(async () => true),
    resetAnswerSyncServiceForTests: () => undefined,
    __mockAnswerSyncService: service,
  };
});
