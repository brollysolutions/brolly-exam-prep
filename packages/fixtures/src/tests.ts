import { FREE_MOCK_SHORT, PWT_CONSTABLE, type ExamPattern } from './exam-pattern';

export type TestKind = 'full' | 'sectional' | 'previous';

export type TestMeta = {
  id: string;
  kind: TestKind;
  /** i18n interpolation for `result.title` etc.; plain titles for sectional/previous */
  title: { en: string; te: string };
  pattern: ExamPattern;
  /**
   * The paper opens without a payment. Every previous-year paper is free: it was public the
   * day it was set, so viewing it costs nothing and practising it asks for an account
   * (F-19's gate), not for money. Only the extra full mocks are held back.
   */
  free: boolean;
  attempted?: { bestScore: number; attempts: number };
};

export const TESTS: TestMeta[] = [
  { id: 'mock-07', kind: 'full', title: { en: 'PWT Full Mock 07', te: 'PWT ఫుల్ మాక్ 07' }, pattern: FREE_MOCK_SHORT, free: true, attempted: { bestScore: 62.25, attempts: 1 } },
  { id: 'mock-08', kind: 'full', title: { en: 'PWT Full Mock 08', te: 'PWT ఫుల్ మాక్ 08' }, pattern: PWT_CONSTABLE, free: false },
  { id: 'sec-seating', kind: 'sectional', title: { en: 'Seating arrangement — 20 Q', te: 'సీటింగ్ అరేంజ్‌మెంట్ — 20 ప్ర' }, pattern: { ...FREE_MOCK_SHORT, id: 'sec-seating', totalQuestions: 20, durationMinutes: 18, sections: [{ id: 'reasoning', labelKey: 'test.sections.reasoning', questions: 20 }] }, free: true },
  { id: 'sec-blood', kind: 'sectional', title: { en: 'Blood relations — 15 Q', te: 'బ్లడ్ రిలేషన్స్ — 15 ప్ర' }, pattern: { ...FREE_MOCK_SHORT, id: 'sec-blood', totalQuestions: 15, durationMinutes: 12, sections: [{ id: 'reasoning', labelKey: 'test.sections.reasoning', questions: 15 }] }, free: true },
  { id: 'prev-2022', kind: 'previous', title: { en: 'PWT 2022 — SCT PC', te: 'PWT 2022 — SCT PC' }, pattern: PWT_CONSTABLE, free: true },
  { id: 'prev-2018', kind: 'previous', title: { en: 'PWT 2018 — SCT PC', te: 'PWT 2018 — SCT PC' }, pattern: PWT_CONSTABLE, free: true },
];
