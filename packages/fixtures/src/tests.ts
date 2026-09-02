import { FREE_MOCK_SHORT, PWT_CONSTABLE, type ExamPattern } from './exam-pattern';

export type TestKind = 'full' | 'sectional' | 'previous';

export type TestMeta = {
  id: string;
  kind: TestKind;
  /** i18n interpolation for `result.title` etc.; plain titles for sectional/previous */
  title: { en: string; te: string; ur: string };
  pattern: ExamPattern;
  free: boolean;
  attempted?: { bestScore: number; attempts: number };
};

export const TESTS: TestMeta[] = [
  { id: 'mock-07', kind: 'full', title: { en: 'PWT Full Mock 07', te: 'PWT ఫుల్ మాక్ 07', ur: 'پی ڈبلیو ٹی فل ماک 07' }, pattern: FREE_MOCK_SHORT, free: true, attempted: { bestScore: 62.25, attempts: 1 } },
  { id: 'mock-08', kind: 'full', title: { en: 'PWT Full Mock 08', te: 'PWT ఫుల్ మాక్ 08', ur: 'پی ڈبلیو ٹی فل ماک 08' }, pattern: PWT_CONSTABLE, free: false },
  { id: 'sec-seating', kind: 'sectional', title: { en: 'Seating arrangement — 20 Q', te: 'సీటింగ్ అరేంజ్‌మెంట్ — 20 ప్ర', ur: 'سیٹنگ آرینجمنٹ — 20 س' }, pattern: { ...FREE_MOCK_SHORT, id: 'sec-seating', totalQuestions: 20, durationMinutes: 18, sections: [{ id: 'reasoning', labelKey: 'test.sections.reasoning', questions: 20 }] }, free: true },
  { id: 'sec-blood', kind: 'sectional', title: { en: 'Blood relations — 15 Q', te: 'బ్లడ్ రిలేషన్స్ — 15 ప్ర', ur: 'بلڈ ریلیشنز — 15 س' }, pattern: { ...FREE_MOCK_SHORT, id: 'sec-blood', totalQuestions: 15, durationMinutes: 12, sections: [{ id: 'reasoning', labelKey: 'test.sections.reasoning', questions: 15 }] }, free: true },
  { id: 'prev-2022', kind: 'previous', title: { en: 'PWT 2022 — SCT PC', te: 'PWT 2022 — SCT PC', ur: 'پی ڈبلیو ٹی 2022 — SCT PC' }, pattern: PWT_CONSTABLE, free: false },
  { id: 'prev-2018', kind: 'previous', title: { en: 'PWT 2018 — SCT PC', te: 'PWT 2018 — SCT PC', ur: 'پی ڈبلیو ٹی 2018 — SCT PC' }, pattern: PWT_CONSTABLE, free: false },
];
