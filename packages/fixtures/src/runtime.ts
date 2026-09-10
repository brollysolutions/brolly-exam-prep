// API-populated content. No authored content or question banks in release bundles.
export type * from './index';
import type { AppContent } from '../../api-contracts/src';
import type { ExamPattern, Post } from './exam-pattern';
import type { TestMeta } from './tests';
import type { StudyTopic, StudySection } from './study';
import type {
  Gender,
  StandardsGroup,
  PhysicalStandards,
  StandardKey,
  Standard,
} from './physical-standards';

export const SI_MOCK_01_ID = 'si-brolly-01';
export const TESTS: TestMeta[] = [];
export const isImportedTest = (id: string | undefined): boolean =>
  id === 'si-brolly-01' || id === 'si-brolly-02' || id === 'pc-constable-01';
export function setCatalog(tests: TestMeta[]): void {
  TESTS.splice(0, TESTS.length, ...tests);
}

export let STUDY_SECTIONS: AppContent['studySections'] = [];
export let STUDY_TOPICS: StudyTopic[] = [];
export let NOTICES: AppContent['notices'] = [];
export let AFFAIRS: AppContent['affairs'] = [];
export let CATEGORIES: AppContent['categories'] = [];
export let EXAM_INFO: AppContent['examInfo'];
export let PWT_CONSTABLE: ExamPattern;
export let PWT_SI: ExamPattern;
export let FREE_MOCK_SHORT: ExamPattern;
export let PHYSICAL_STANDARDS: AppContent['physicalStandards'];
export let STANDARDS_NOTIFICATION_YEAR: number;
export let COST_ROWS: AppContent['costRows'];
export function setContent(content: AppContent): void {
  STUDY_SECTIONS = content.studySections;
  STUDY_TOPICS = STUDY_SECTIONS.flatMap((s) => s.topics);
  NOTICES = content.notices;
  AFFAIRS = content.affairs;
  EXAM_INFO = content.examInfo;
  CATEGORIES = content.categories;
  PWT_CONSTABLE = content.patterns.pc;
  PWT_SI = content.patterns.si;
  FREE_MOCK_SHORT = content.patterns.short;
  PHYSICAL_STANDARDS = content.physicalStandards;
  STANDARDS_NOTIFICATION_YEAR = content.standardsNotificationYear;
  COST_ROWS = content.costRows;
}
export const latestNotices = (n = NOTICES.length) =>
  [...NOTICES].sort((a, b) => b.date.localeCompare(a.date)).slice(0, n);
export const latestAffairs = (n = AFFAIRS.length) =>
  [...AFFAIRS].sort((a, b) => b.date.localeCompare(a.date)).slice(0, n);
export const patternFor = (post: Post): ExamPattern => (post === 'si' ? PWT_SI : PWT_CONSTABLE);

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

export const studySectionMinutes = (section: StudySection): number =>
  section.topics.reduce((n, topic) => n + topic.minutes, 0);

/**
 * A topic and the section it belongs to, or `undefined` for an id that is not in the shelf.
 * The reader needs both — the section supplies the kicker above the title.
 */
export function findStudyTopic(
  id: string | undefined,
): { topic: StudyTopic; section: StudySection } | undefined {
  if (!id) return undefined;
  for (const section of STUDY_SECTIONS) {
    const topic = section.topics.find((t) => t.id === id);
    if (topic) return { topic, section };
  }
  return undefined;
}

export const standardsFor = (
  post: Post,
  gender: Gender,
  group: StandardsGroup,
): PhysicalStandards => PHYSICAL_STANDARDS[post][gender][group];

/**
 * The standards that apply to one candidate, flattened into the order they are measured in:
 * height, chest, chest expansion, then the runs (longest first), the long jump and the shot put.
 *
 * The single place the "women are not chest-measured" and "which runs this post has" rules
 * live: the checker builds its rows from this list and the screen builds its fields from the
 * same list, so neither can drift and no one is asked for an event they will not be timed on.
 */
export function standardEntries(s: PhysicalStandards): { key: StandardKey; standard: Standard }[] {
  const entry = (key: StandardKey, standard: Standard | undefined) =>
    standard ? [{ key, standard }] : [];
  return [
    ...entry('height', s.height),
    ...entry('chest', s.chest?.unexpanded),
    ...entry('chestExpansion', s.chest?.expansion),
    ...entry('run1600m', s.run1600m),
    ...entry('run800m', s.run800m),
    ...entry('run100m', s.run100m),
    ...entry('longJump', s.longJump),
    ...entry('shotPut', s.shotPut),
  ];
}

/** True when every figure a candidate is measured against has been confirmed. */
export const allVerified = (s: PhysicalStandards): boolean =>
  standardEntries(s).every((e) => e.standard.verified);
