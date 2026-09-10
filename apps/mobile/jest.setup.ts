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

// Component fixtures are supplied explicitly; release bundles boot from the API.
require('@tslprb/fixtures/src/runtime').setCatalog(require('@tslprb/fixtures').TESTS);

const f = require('@tslprb/fixtures');
require('@tslprb/fixtures/src/runtime').setContent({
  studySections: f.STUDY_SECTIONS,
  notices: f.NOTICES,
  affairs: f.AFFAIRS,
  examInfo: f.EXAM_INFO,
  categories: f.CATEGORIES,
  patterns: { pc: f.PWT_CONSTABLE, si: f.PWT_SI, short: f.FREE_MOCK_SHORT },
  physicalStandards: f.PHYSICAL_STANDARDS,
  standardsNotificationYear: f.STANDARDS_NOTIFICATION_YEAR,
  costRows: f.COST_ROWS,
});
