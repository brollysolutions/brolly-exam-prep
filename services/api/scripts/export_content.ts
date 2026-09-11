import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  AFFAIRS,
  CATEGORIES,
  COST_ROWS,
  EXAM_INFO,
  NOTICES,
  PHYSICAL_STANDARDS,
  STANDARDS_NOTIFICATION_YEAR,
  STUDY_SECTIONS,
} from '../../../packages/fixtures/src/index.ts';
import type { PhysicalStandards } from '../../../packages/fixtures/src/index.ts';

const mapStudySection = (section: (typeof STUDY_SECTIONS)[number]) => ({
  id: section.id,
  label_key: section.labelKey,
  topics: section.topics,
});

const noticeKinds = { admitCard: 'admit_card', examDate: 'exam_date' } as const;

const mapStandard = (standard: PhysicalStandards) => ({
  post: standard.post,
  gender: standard.gender,
  group: standard.group,
  height: standard.height,
  ...(standard.chest ? { chest: standard.chest } : {}),
  ...(standard.run1600m ? { run_1600m: standard.run1600m } : {}),
  ...(standard.run800m ? { run_800m: standard.run800m } : {}),
  ...(standard.run100m ? { run_100m: standard.run100m } : {}),
  long_jump: standard.longJump,
  shot_put: standard.shotPut,
  shot_kg: standard.shotKg,
});

const physicalStandards = Object.values(PHYSICAL_STANDARDS).flatMap((byGender) =>
  Object.values(byGender).flatMap((byGroup) => Object.values(byGroup).map(mapStandard)),
);

const payload = {
  version: '2026-09-10',
  notices: NOTICES.map((notice) => ({
    ...notice,
    kind: noticeKinds[notice.kind as keyof typeof noticeKinds] ?? notice.kind,
  })),
  affairs: AFFAIRS,
  study_sections: STUDY_SECTIONS.map(mapStudySection),
  exam_info: { pwt_date: EXAM_INFO.pwtDate, label: EXAM_INFO.label },
  categories: CATEGORIES.map(({ id, labelKey, qualifyingPct }) => ({
    id,
    label_key: labelKey,
    qualifying_pct: qualifyingPct,
  })),
  cost_rows: COST_ROWS,
  physical_standards: physicalStandards,
  standards_notification_year: STANDARDS_NOTIFICATION_YEAR,
};

const output = fileURLToPath(new URL('../app/content_fixture.json', import.meta.url));
writeFileSync(output, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
