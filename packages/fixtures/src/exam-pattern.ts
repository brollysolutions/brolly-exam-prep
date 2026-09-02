/**
 * Official TSLPRB PWT pattern (Preliminary Written Test), config-driven so it can be corrected
 * without touching UI. Sources checked 2026-09-02: testbook.com/telangana-police-constable/syllabus-exam-pattern,
 * freejobalert.com (Constable pattern). SI-specific split is marked `verified: false` until confirmed
 * against the TSLPRB notification.
 *
 * The prototype's 40-question / 60-minute / +1 −0.25 numbers were placeholders; the free mock in
 * this app uses a SHORT preset derived from the official section ratios so a demo run stays quick.
 */
export type Post = 'pc' | 'si';
export type SectionId = 'arithmetic' | 'reasoning' | 'gs' | 'telangana' | 'english';

export type SectionSpec = {
  id: SectionId;
  /** i18n key under `test.sections.*` */
  labelKey: string;
  questions: number;
  /** Sequential unlock: section becomes available only after `unlockAfter` is fully answered. */
  unlockAfter?: SectionId;
};

export type ExamPattern = {
  id: string;
  post: Post;
  totalQuestions: number;
  durationMinutes: number;
  marksPerCorrect: number;
  negativePerWrong: number;
  qualifyingOnly: boolean;
  sections: SectionSpec[];
  verified: boolean;
  source: string;
};

export const PWT_CONSTABLE: ExamPattern = {
  id: 'pwt-pc-official',
  post: 'pc',
  totalQuestions: 200,
  durationMinutes: 180,
  marksPerCorrect: 1,
  negativePerWrong: 0,
  qualifyingOnly: true,
  sections: [
    { id: 'arithmetic', labelKey: 'test.sections.arithmetic', questions: 50 },
    { id: 'reasoning', labelKey: 'test.sections.reasoning', questions: 50 },
    { id: 'gs', labelKey: 'test.sections.gs', questions: 80 },
    { id: 'telangana', labelKey: 'test.sections.telangana', questions: 20, unlockAfter: 'gs' },
  ],
  verified: true,
  source: 'https://testbook.com/telangana-police-constable/syllabus-exam-pattern',
};

export const PWT_SI: ExamPattern = {
  ...PWT_CONSTABLE,
  id: 'pwt-si-official',
  post: 'si',
  sections: [
    { id: 'english', labelKey: 'test.sections.english', questions: 20 },
    { id: 'arithmetic', labelKey: 'test.sections.arithmetic', questions: 50 },
    { id: 'reasoning', labelKey: 'test.sections.reasoning', questions: 50 },
    { id: 'gs', labelKey: 'test.sections.gs', questions: 60 },
    { id: 'telangana', labelKey: 'test.sections.telangana', questions: 20, unlockAfter: 'gs' },
  ],
  verified: false,
  source: 'SI section split not yet confirmed against the TSLPRB notification',
};

/** Short free-mock preset used by the demo (matches the prototype's 4 sections × 10). */
export const FREE_MOCK_SHORT: ExamPattern = {
  id: 'pwt-free-mock-short',
  post: 'pc',
  totalQuestions: 40,
  durationMinutes: 60,
  marksPerCorrect: 1,
  negativePerWrong: 0,
  qualifyingOnly: true,
  sections: [
    { id: 'arithmetic', labelKey: 'test.sections.arithmetic', questions: 10 },
    { id: 'reasoning', labelKey: 'test.sections.reasoning', questions: 10 },
    { id: 'gs', labelKey: 'test.sections.gs', questions: 10 },
    { id: 'telangana', labelKey: 'test.sections.telangana', questions: 10, unlockAfter: 'gs' },
  ],
  verified: true,
  source: 'derived from PWT_CONSTABLE ratios for a quick demo',
};

/** PWT qualifying percentage by category (prototype values; confirm with notification). */
export const CATEGORIES = [
  { id: 'oc', labelKey: 'onboarding.cats.oc', qualifyingPct: 40 },
  { id: 'ews', labelKey: 'onboarding.cats.ews', qualifyingPct: 40 },
  { id: 'bc', labelKey: 'onboarding.cats.bc', qualifyingPct: 35 },
  { id: 'sc', labelKey: 'onboarding.cats.sc', qualifyingPct: 30 },
  { id: 'st', labelKey: 'onboarding.cats.st', qualifyingPct: 30 },
  { id: 'exs', labelKey: 'onboarding.cats.exs', qualifyingPct: 30 },
] as const;
export type CategoryId = (typeof CATEGORIES)[number]['id'];

export const patternFor = (post: Post): ExamPattern => (post === 'si' ? PWT_SI : PWT_CONSTABLE);

/** 1-based question number → section index, given a pattern. */
export function sectionIndexOf(pattern: ExamPattern, questionNo: number): number {
  let acc = 0;
  for (let i = 0; i < pattern.sections.length; i++) {
    acc += pattern.sections[i].questions;
    if (questionNo <= acc) return i;
  }
  return pattern.sections.length - 1;
}

export function firstQuestionOf(pattern: ExamPattern, sectionIndex: number): number {
  return pattern.sections.slice(0, sectionIndex).reduce((n, s) => n + s.questions, 0) + 1;
}
