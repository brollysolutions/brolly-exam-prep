import { FREE_MOCK_SHORT, PWT_CONSTABLE, type ExamPattern } from './exam-pattern';
import { SI_MOCK_01_ID, SI_MOCK_01_PATTERN } from './si-mock';

export type TestKind = 'full' | 'previous';

export type TestMeta = {
  id: string;
  kind: TestKind;
  /** Generated demonstration content, with repeated sample questions. */
  demo?: boolean;
  /** i18n interpolation for `result.title` etc.; plain titles for previous-year papers */
  title: { en: string; te: string };
  pattern: ExamPattern;
  /** Show a general full mock only on Full mocks, not on post-specific shelves. */
  fullMocksOnly?: boolean;
  /** False for retired papers kept available to existing attempts and direct links. */
  listed?: boolean;
  /**
   * The paper opens without a payment. Every previous-year paper is free: it was public the
   * day it was set, so viewing it costs nothing and practising it asks for an account
   * (F-19's gate), not for money. Only the extra full mocks are held back.
   */
  free: boolean;
  attempted?: { bestScore: number; attempts: number };
};

export const TESTS: TestMeta[] = [
  {
    id: SI_MOCK_01_ID,
    kind: 'full',
    title: { en: 'SI Mock Test 01', te: 'ఎస్ఐ మాక్ టెస్ట్ 01' },
    pattern: SI_MOCK_01_PATTERN,
    free: true,
  },
  {
    id: 'mock-07',
    demo: true,
    kind: 'full',
    title: { en: 'PWT Full Mock 07', te: 'PWT ఫుల్ మాక్ 07' },
    pattern: FREE_MOCK_SHORT,
    fullMocksOnly: true,
    listed: false,
    free: true,
    attempted: { bestScore: 62.25, attempts: 1 },
  },
  {
    id: 'mock-08',
    demo: true,
    kind: 'full',
    title: { en: 'PWT Full Mock 08', te: 'PWT ఫుల్ మాక్ 08' },
    pattern: PWT_CONSTABLE,
    fullMocksOnly: true,
    listed: false,
    free: false,
  },
  {
    id: 'prev-2022',
    demo: true,
    kind: 'previous',
    title: { en: 'PWT 2022 — SCT PC (demo)', te: 'PWT 2022 — SCT PC (నమూనా)' },
    pattern: PWT_CONSTABLE,
    free: true,
  },
  {
    id: 'prev-2018',
    demo: true,
    kind: 'previous',
    title: { en: 'PWT 2018 — SCT PC (demo)', te: 'PWT 2018 — SCT PC (నమూనా)' },
    pattern: PWT_CONSTABLE,
    free: true,
  },
];
