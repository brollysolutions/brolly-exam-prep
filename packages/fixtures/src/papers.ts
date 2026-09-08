import { buildPaper, type Question } from './questions';
import { SI_MOCK_01_QUESTIONS } from './si-mock-01';
import { isImportedTest } from './si-mock';
import type { TestMeta } from './tests';

/** Imported papers use their actual questions, never the repeating demonstration bank. */
export function paperForTest(meta: TestMeta): Question[] {
  if (!isImportedTest(meta.id)) return buildPaper(meta.pattern.sections);
  return SI_MOCK_01_QUESTIONS.map((q) => ({
    ...q,
    text: { ...q.text },
    options: { en: [...q.options.en], te: [...q.options.te] },
    explanation: { ...q.explanation },
  }));
}
