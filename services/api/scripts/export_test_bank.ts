/** Generate the API bank from the same source-authored papers the website uses. */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { TESTS, isImportedTest, paperForTest } from '../../../apps/web/lib/test-catalog';
import { PaperQuestionSchema, TestMetaSchema } from '../../../packages/api-contracts/src/index';

const bank = TESTS.filter((test) => test.listed !== false && isImportedTest(test.id)).map((test) => {
  const p = test.pattern;
  const questions = paperForTest(test);
  if (questions.length !== p.totalQuestions || new Set(questions.map((q) => q.id)).size !== questions.length)
    throw new Error(`Invalid question count or duplicate IDs: ${test.id}`);
  for (const section of p.sections) {
    if (questions.filter((q) => q.section === section.id).length !== section.questions)
      throw new Error(`Section count mismatch: ${test.id}/${section.id}`);
  }
  for (const q of questions) {
    if (![0, 1, 2, 3].includes(q.correct) || q.options.en.length !== 4 || q.options.te.length !== 4)
      throw new Error(`Invalid answer/options: ${q.id}`);
  }
  return {
    meta: {
      id: test.id, kind: test.kind, title: test.title,
      pattern: {
        id: p.id, post: p.post, total_questions: p.totalQuestions,
        duration_minutes: p.durationMinutes, marks_per_correct: p.marksPerCorrect,
        negative_per_wrong: p.negativePerWrong, qualifying_only: p.qualifyingOnly,
        sections: p.sections.map((s) => ({
          id: s.id, label_key: s.labelKey, questions: s.questions, unlock_after: s.unlockAfter ?? null,
        })),
        verified: p.verified, source: p.source,
      },
      full_mocks_only: test.fullMocksOnly ?? false, listed: true, free: test.free, attempted: null,
    },
    // Preserve the website's existing practice cutoff, not a candidate-specific eligibility decision.
    cutoff_pct: 40,
    questions: questions.map((q) => ({
      id: q.id, section: q.section, text: q.text, options: q.options,
      avg_seconds: q.avgSeconds, correct_choice: q.correct, explanation: q.explanation,
    })),
  };
});

const output = fileURLToPath(new URL('../app/test_bank.json', import.meta.url));
// Validate the exact contracts consumed by the mobile HTTP adapter as well as bank invariants.
for (const paper of bank) {
  TestMetaSchema.parse(paper.meta);
  for (const question of paper.questions) PaperQuestionSchema.parse(question);
}
const serialized = `${JSON.stringify(bank, null, 2)}\n`;
if (process.argv.includes('--check')) {
  if (readFileSync(output, 'utf8') !== serialized) throw new Error('API test bank is stale. Run api:export-tests.');
} else {
  writeFileSync(output, serialized, 'utf8');
}
console.log(`${bank.length} papers / ${bank.reduce((n, test) => n + test.questions.length, 0)} questions verified`);
