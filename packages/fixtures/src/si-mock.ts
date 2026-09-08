import type { ExamPattern } from './exam-pattern';

export const SI_MOCK_01_ID = 'si-brolly-01';

/** Combined practice paper: 50-minute Arithmetic, 50-minute Reasoning, 90-minute GS. */
export const SI_MOCK_01_PATTERN: ExamPattern = {
  id: SI_MOCK_01_ID,
  post: 'si',
  totalQuestions: 200,
  durationMinutes: 190,
  marksPerCorrect: 1,
  negativePerWrong: 0,
  qualifyingOnly: true,
  sections: [
    { id: 'arithmetic', labelKey: 'test.sections.arithmetic', questions: 50 },
    { id: 'reasoning', labelKey: 'test.sections.reasoning', questions: 50 },
    { id: 'gs', labelKey: 'test.sections.gs', questions: 100 },
  ],
  // This is a combined practice preset, not a claim about the official exam blueprint.
  verified: false,
  source:
    'BrollyExamPrep Arithmetic 1, Reasoning 1 and GS1 supplied DOCX papers; reviewed corrections',
};

export const isImportedTest = (id: string | undefined): boolean => id === SI_MOCK_01_ID;
