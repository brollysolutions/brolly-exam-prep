import type { ExamPattern } from './exam-pattern';

export const SI_MOCK_01_ID = 'si-brolly-01';
export const SI_MOCK_DURATION_MINUTES = 180;

/** Combined SI practice paper: one 180-minute timer across all three sections. */
export const SI_MOCK_01_PATTERN: ExamPattern = {
  id: SI_MOCK_01_ID,
  post: 'si',
  totalQuestions: 200,
  durationMinutes: SI_MOCK_DURATION_MINUTES,
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
