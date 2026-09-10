import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { TESTS, paperForTest } from '../lib/test-catalog';
import {
  STUDY_SECTIONS,
  NOTICES,
  AFFAIRS,
  EXAM_INFO,
  CATEGORIES,
  PWT_CONSTABLE,
  PWT_SI,
  FREE_MOCK_SHORT,
  PHYSICAL_STANDARDS,
  STANDARDS_NOTIFICATION_YEAR,
  COST_ROWS,
} from '@tslprb/fixtures';
import { AppContentSchema } from '@tslprb/api-contracts';

// Authoring sources stay in the repository; only the API image ships this bank.
const target = resolve(import.meta.dirname, '../../../services/api/app/content/catalog.json');
const tests = TESTS.map((test) => {
  const meta = { ...test };
  delete meta.attempted;
  return { meta, paper: paperForTest(meta) };
});
for (const { meta, paper } of tests) {
  if (
    paper.length !== meta.pattern.totalQuestions ||
    new Set(paper.map((q) => q.id)).size !== paper.length
  )
    throw new Error(`Invalid paper: ${meta.id}`);
}
mkdirSync(resolve(target, '..'), { recursive: true });
writeFileSync(target, JSON.stringify(tests, null, 2) + '\n');
const content = AppContentSchema.parse({
  studySections: STUDY_SECTIONS,
  notices: NOTICES,
  affairs: AFFAIRS,
  examInfo: EXAM_INFO,
  categories: CATEGORIES,
  patterns: { pc: PWT_CONSTABLE, si: PWT_SI, short: FREE_MOCK_SHORT },
  physicalStandards: PHYSICAL_STANDARDS,
  standardsNotificationYear: STANDARDS_NOTIFICATION_YEAR,
  costRows: COST_ROWS,
});
writeFileSync(resolve(target, '../content.json'), JSON.stringify(content, null, 2) + '\n');
console.log(
  `Exported ${tests.length} tests, ${tests.reduce((n, t) => n + t.paper.length, 0)} questions`,
);
