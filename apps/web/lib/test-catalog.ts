import {
  TESTS as sharedTests,
  isImportedTest as isSharedImportedTest,
  paperForTest as sharedPaperForTest,
  type ExamPattern,
  type Question,
  type TestMeta,
} from '@tslprb/fixtures';
import { SI_MOCK_02_QUESTIONS } from '../data/papers/si-mock-02';
import { CONSTABLE_MOCK_01_QUESTIONS } from '../data/papers/constable-mock-01';
import { CONSTABLE_MOCK_01_ID, SI_MOCK_02_ID } from './test-ids';
export { CONSTABLE_MOCK_01_ID, SI_MOCK_02_ID } from './test-ids';

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
  source: 'User-supplied BrollyExamPrep constable 1.docx; full 200-question paper with source-authored solutions',
};

export const SI_MOCK_02_PATTERN: ExamPattern = {
  id: SI_MOCK_02_ID,
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
  verified: false,
  source: 'User-supplied BrollyExamPrep Arithmetic 2, Reasoning 2 and GS2 DOCX papers; source-authored answer keys',
};

// Website catalogue extension: the mobile catalogue and Test 01 stay unchanged.
export const TESTS: TestMeta[] = [
  sharedTests[0],
  {
    id: SI_MOCK_02_ID,
    kind: 'full',
    title: { en: 'SI Mock Test 02', te: 'ఎస్ఐ మాక్ టెస్ట్ 02' },
    pattern: SI_MOCK_02_PATTERN,
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
];

export const isImportedTest = (id: string | undefined): boolean =>
  id === SI_MOCK_02_ID || id === CONSTABLE_MOCK_01_ID || isSharedImportedTest(id);

export function paperForTest(meta: TestMeta): Question[] {
  const importedPaper = meta.id === SI_MOCK_02_ID
    ? SI_MOCK_02_QUESTIONS
    : meta.id === CONSTABLE_MOCK_01_ID ? CONSTABLE_MOCK_01_QUESTIONS : undefined;
  if (!importedPaper) return sharedPaperForTest(meta);
  return importedPaper.map((q) => ({
    ...q,
    text: { ...q.text },
    options: { en: [...q.options.en], te: [...q.options.te] },
    explanation: { ...q.explanation },
  }));
}
