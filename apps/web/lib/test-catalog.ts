import {
  TESTS as sharedTests,
  SI_MOCK_DURATION_MINUTES,
  isImportedTest as isSharedImportedTest,
  paperForTest as sharedPaperForTest,
  type ExamPattern,
  type Question,
  type TestMeta,
} from '@tslprb/fixtures';
import { SI_MOCK_02_QUESTIONS } from '../data/papers/si-mock-02';
import { SI_MOCK_03_QUESTIONS } from '../data/papers/si-mock-03';
import { CONSTABLE_MOCK_01_QUESTIONS } from '../data/papers/constable-mock-01';
import { CONSTABLE_MOCK_02_QUESTIONS } from '../data/papers/constable-mock-02';
import { CONSTABLE_MOCK_03_QUESTIONS } from '../data/papers/constable-mock-03';
import {
  CONSTABLE_MOCK_01_ID,
  CONSTABLE_MOCK_02_ID,
  CONSTABLE_MOCK_03_ID,
  SI_MOCK_02_ID,
  SI_MOCK_03_ID,
} from './test-ids';
export {
  CONSTABLE_MOCK_01_ID,
  CONSTABLE_MOCK_02_ID,
  CONSTABLE_MOCK_03_ID,
  SI_MOCK_02_ID,
  SI_MOCK_03_ID,
} from './test-ids';

export const CONSTABLE_MOCK_01_PATTERN: ExamPattern = {
  id: CONSTABLE_MOCK_01_ID,
  post: 'pc',
  totalQuestions: 200,
  durationMinutes: 180,
  marksPerCorrect: 1,
  negativePerWrong: 0,
  qualifyingOnly: true,
  sections: [
    { id: 'english', labelKey: 'test.sections.english', questions: 25 },
    { id: 'arithmetic', labelKey: 'test.sections.arithmetic', questions: 35 },
    { id: 'reasoning', labelKey: 'test.sections.reasoning', questions: 40 },
    { id: 'gs', labelKey: 'test.sections.gs', questions: 100 },
  ],
  verified: false,
  source:
    'User-supplied BrollyExamPrep constable 1.docx; full 200-question paper with source-authored solutions',
};

export const SI_MOCK_02_PATTERN: ExamPattern = {
  id: SI_MOCK_02_ID,
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
  verified: false,
  source:
    'User-supplied BrollyExamPrep Arithmetic 2, Reasoning 2 and GS2 DOCX papers; source-authored answer keys',
};

export const CONSTABLE_MOCK_02_PATTERN: ExamPattern = {
  ...CONSTABLE_MOCK_01_PATTERN,
  id: CONSTABLE_MOCK_02_ID,
  sections: CONSTABLE_MOCK_01_PATTERN.sections.map((section) => ({ ...section })),
  source:
    'User-supplied BrollyExamPrep constable 2.docx; full bilingual 200-question paper with solutions',
};

export const CONSTABLE_MOCK_03_PATTERN: ExamPattern = {
  ...CONSTABLE_MOCK_01_PATTERN,
  id: CONSTABLE_MOCK_03_ID,
  sections: CONSTABLE_MOCK_01_PATTERN.sections.map((section) => ({ ...section })),
  source:
    'User-supplied BrollyExamPrep constable 3.docx; complete bilingual 200-question paper with source-authored keys and explanations',
};

export const SI_MOCK_03_PATTERN: ExamPattern = {
  ...SI_MOCK_02_PATTERN,
  id: SI_MOCK_03_ID,
  sections: SI_MOCK_02_PATTERN.sections.map((section) => ({ ...section })),
  source:
    'User-supplied BrollyExamPrep arthamatic si 3, reasoning si 3 and si gs3 DOCX papers; source-authored keys and bilingual solutions',
};

// Authoring catalogue exported to FastAPI; both clients download it at runtime.
export const TESTS: TestMeta[] = [
  sharedTests[0],
  {
    id: SI_MOCK_02_ID,
    kind: 'full',
    title: { en: 'SI Mock Test 02', te: 'ఎస్ఐ మాక్ టెస్ట్ 02' },
    pattern: SI_MOCK_02_PATTERN,
    free: true,
  },
  {
    id: SI_MOCK_03_ID,
    kind: 'full',
    title: { en: 'SI Mock Test 03', te: 'ఎస్ఐ మాక్ టెస్ట్ 03' },
    pattern: SI_MOCK_03_PATTERN,
    free: true,
  },
  ...sharedTests.slice(1),
  {
    id: CONSTABLE_MOCK_01_ID,
    kind: 'full',
    title: { en: 'Constable Mock Test 01', te: 'కానిస్టేబుల్ మాక్ టెస్ట్ 01' },
    pattern: CONSTABLE_MOCK_01_PATTERN,
    free: true,
  },
  {
    id: CONSTABLE_MOCK_02_ID,
    kind: 'full',
    title: { en: 'Constable Mock Test 02', te: 'కానిస్టేబుల్ మాక్ టెస్ట్ 02' },
    pattern: CONSTABLE_MOCK_02_PATTERN,
    free: true,
  },
  {
    id: CONSTABLE_MOCK_03_ID,
    kind: 'full',
    title: { en: 'Constable Mock Test 03', te: 'కానిస్టేబుల్ మాక్ టెస్ట్ 03' },
    pattern: CONSTABLE_MOCK_03_PATTERN,
    free: true,
  },
];

export const isImportedTest = (id: string | undefined): boolean =>
  id === SI_MOCK_02_ID ||
  id === SI_MOCK_03_ID ||
  id === CONSTABLE_MOCK_01_ID ||
  id === CONSTABLE_MOCK_02_ID ||
  id === CONSTABLE_MOCK_03_ID ||
  isSharedImportedTest(id);

export function paperForTest(meta: TestMeta): Question[] {
  const importedPaper =
    meta.id === SI_MOCK_02_ID
      ? SI_MOCK_02_QUESTIONS
      : meta.id === SI_MOCK_03_ID
        ? SI_MOCK_03_QUESTIONS
        : meta.id === CONSTABLE_MOCK_01_ID
          ? CONSTABLE_MOCK_01_QUESTIONS
          : meta.id === CONSTABLE_MOCK_02_ID
            ? CONSTABLE_MOCK_02_QUESTIONS
            : meta.id === CONSTABLE_MOCK_03_ID
              ? CONSTABLE_MOCK_03_QUESTIONS
              : undefined;
  if (!importedPaper) return sharedPaperForTest(meta);
  return importedPaper.map((q) => ({
    ...q,
    text: { ...q.text },
    options: { en: [...q.options.en], te: [...q.options.te] },
    explanation: { ...q.explanation },
  }));
}
