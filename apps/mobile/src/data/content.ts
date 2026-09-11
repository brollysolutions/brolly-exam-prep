import type { Content as ApiContent } from '@tslprb/api-contracts';
import type {
  Affair,
  CategoryId,
  ExamPattern,
  Gender,
  Localized,
  Notice,
  PhysicalStandards,
  Post,
  SectionId,
  Standard,
  StandardKey,
  StandardsGroup,
  StudyBlock,
  StudySection,
  StudyTopic,
  TestMeta,
} from '@tslprb/fixtures';
import { useEffect } from 'react';
import { create } from 'zustand';

import { ApiError } from './api/types';
import { getPublicReadCache } from './offline';

export type {
  Affair,
  CategoryId,
  ExamPattern,
  Gender,
  Localized,
  Notice,
  PhysicalStandards,
  Post,
  Question,
  SectionId,
  SectionSpec,
  Standard,
  StandardKey,
  StandardsGroup,
  StudyBlock,
  StudySection,
  StudyTopic,
  TestKind,
  TestMeta,
} from '@tslprb/fixtures';

export type ContentCategory = {
  id: CategoryId;
  labelKey: string;
  qualifyingPct?: number;
};

export type CostRows = Record<'en' | 'te', [string, string, string][]>;

export type AppContent = {
  version: string;
  notices: Notice[];
  affairs: Affair[];
  studySections: StudySection[];
  studyTopics: StudyTopic[];
  examInfo: { pwtDate: string; label: Localized };
  categories: ContentCategory[];
  costRows: CostRows;
  physicalStandards: PhysicalStandards[];
  standardsNotificationYear: number | undefined;
};

const CATEGORY_IDS = new Set<CategoryId>(['oc', 'ews', 'bc', 'sc', 'st', 'exs']);
const SECTION_IDS = new Set<SectionId>([
  'arithmetic',
  'reasoning',
  'gs',
  'telangana',
  'english',
]);

function contentMismatch(message: string): never {
  throw new ApiError(200, 'schema_mismatch', message);
}

function categoryId(value: string): CategoryId {
  if (CATEGORY_IDS.has(value as CategoryId)) return value as CategoryId;
  return contentMismatch(`Unsupported content category ${value}`);
}

function sectionId(value: string): SectionId {
  if (SECTION_IDS.has(value as SectionId)) return value as SectionId;
  return contentMismatch(`Unsupported study section ${value}`);
}

function mapStudyBlock(
  block: ApiContent['study_sections'][number]['topics'][number]['blocks'][number],
): StudyBlock {
  if (block.kind === 'bullets') {
    if (!block.items) return contentMismatch('A bullets study block is missing items');
    return { kind: 'bullets', items: block.items };
  }
  if (!block.text) return contentMismatch(`A ${block.kind} study block is missing text`);
  return { kind: block.kind, text: block.text };
}

function mapCostRows(
  rows: ApiContent['cost_rows'],
  lang: 'en' | 'te',
): [string, string, string][] {
  return (rows[lang] ?? []).map((row, index) => {
    if (row.length !== 3)
      return contentMismatch(`${lang} cost row ${index + 1} must have 3 cells`);
    return [row[0], row[1], row[2]];
  });
}

export function mapContent(value: ApiContent): AppContent {
  const studySections: StudySection[] = value.study_sections.map((section) => {
    const id = sectionId(section.id);
    return {
      id,
      labelKey: section.label_key,
      topics: section.topics.map((topic) => ({
        id: topic.id,
        section: sectionId(topic.section),
        title: topic.title,
        minutes: topic.minutes,
        blocks: topic.blocks.map(mapStudyBlock),
      })),
    };
  });

  return {
    version: value.version,
    notices: value.notices.map((notice) => ({
      id: notice.id,
      kind:
        notice.kind === 'admit_card'
          ? 'admitCard'
          : notice.kind === 'exam_date'
            ? 'examDate'
            : notice.kind,
      date: notice.date,
      title: notice.title,
      body: notice.body,
      link: notice.link ?? undefined,
    })),
    affairs: value.affairs,
    studySections,
    studyTopics: studySections.flatMap((section) => section.topics),
    examInfo: { pwtDate: value.exam_info.pwt_date, label: value.exam_info.label },
    categories: value.categories.map((category) => ({
      id: categoryId(category.id),
      labelKey: category.label_key,
      qualifyingPct: category.qualifying_pct,
    })),
    costRows: {
      en: mapCostRows(value.cost_rows, 'en'),
      te: mapCostRows(value.cost_rows, 'te'),
    },
    physicalStandards: value.physical_standards.map((standards) => ({
      post: standards.post,
      gender: standards.gender,
      group: standards.group,
      height: standards.height,
      chest: standards.chest ?? undefined,
      run1600m: standards.run_1600m ?? undefined,
      run800m: standards.run_800m ?? undefined,
      run100m: standards.run_100m ?? undefined,
      longJump: standards.long_jump,
      shotPut: standards.shot_put,
      shotKg: standards.shot_kg,
    })),
    standardsNotificationYear: value.standards_notification_year || undefined,
  };
}

// Compatibility defaults keep pure views and the legacy imported-paper route renderable while
// production routes pass live API data explicitly.
export const TESTS: TestMeta[] = [];
export const STUDY_SECTIONS: StudySection[] = [];
export const STUDY_TOPICS: StudyTopic[] = [];
export const EXAM_INFO = { pwtDate: '', label: { en: '', te: '' } };
export const COST_ROWS: CostRows = { en: [], te: [] };
export const CATEGORIES: ContentCategory[] = (
  ['oc', 'ews', 'bc', 'sc', 'st', 'exs'] as const
).map((id) => ({ id, labelKey: `onboarding.cats.${id}` }));
export const STANDARDS_NOTIFICATION_YEAR = '';
export const SI_MOCK_01_ID = 'si-brolly-01';
export const isImportedTest = (id: string | undefined): boolean => id === SI_MOCK_01_ID;

const EMPTY_CONTENT: AppContent = {
  version: '',
  notices: [],
  affairs: [],
  studySections: [],
  studyTopics: [],
  examInfo: EXAM_INFO,
  categories: CATEGORIES,
  costRows: COST_ROWS,
  physicalStandards: [],
  standardsNotificationYear: undefined,
};

type ContentState = {
  data: AppContent;
  loading: boolean;
  loaded: boolean;
  error?: ApiError;
  load: (force?: boolean) => Promise<void>;
  reset: () => void;
};

export const useContentStore = create<ContentState>((set, get) => ({
  data: EMPTY_CONTENT,
  loading: false,
  loaded: false,
  error: undefined,
  load: async (force = false) => {
    const state = get();
    if (state.loading || (state.loaded && !force)) return;
    set({ loading: true, error: undefined });
    let usedCache = false;
    try {
      const read = await (await getPublicReadCache()).readContent();
      if (read.cached) {
        try {
          set({
            data: mapContent(read.cached),
            loaded: true,
            loading: true,
            error: undefined,
          });
          usedCache = true;
        } catch {
          // The raw cache was contract-valid but not usable by the stricter UI mapper.
        }
      }
      const data = mapContent(await read.fresh);
      set({ data, loaded: true, loading: false, error: undefined });
    } catch (error) {
      if (usedCache) {
        set({ loading: false, error: undefined });
        return;
      }
      set({
        loading: false,
        error: error instanceof ApiError ? error : new ApiError(0, 'content_load_failed'),
      });
    }
  },
  reset: () => set({ data: EMPTY_CONTENT, loading: false, loaded: false, error: undefined }),
}));

/** Loads content once per app session and re-renders callers when the validated response arrives. */
export function useContentData(): AppContent {
  const data = useContentStore((state) => state.data);
  const load = useContentStore((state) => state.load);
  useEffect(() => {
    void load();
  }, [load]);
  return data;
}

export function latestNotices(limit: number | undefined, notices: readonly Notice[] = []): Notice[] {
  const count = limit ?? notices.length;
  return [...notices]
    .sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? 1 : -1))
    .slice(0, Math.max(0, count));
}

export function latestAffairs(limit: number | undefined, affairs: readonly Affair[] = []): Affair[] {
  const count = limit ?? affairs.length;
  return [...affairs]
    .sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? 1 : -1))
    .slice(0, Math.max(0, count));
}

export function standardsFor(
  post: Post,
  gender: Gender,
  group: StandardsGroup,
  standards: readonly PhysicalStandards[] = [],
): PhysicalStandards {
  return (
    standards.find(
      (candidate) =>
        candidate.post === post && candidate.gender === gender && candidate.group === group,
    ) ?? {
      post,
      gender,
      group,
      height: { value: 0, dir: 'min', verified: false },
      longJump: { value: 0, dir: 'min', verified: false },
      shotPut: { value: 0, dir: 'min', verified: false },
      shotKg: 0,
    }
  );
}

export function sectionIndexOf(pattern: ExamPattern, questionNo: number): number {
  let acc = 0;
  for (let i = 0; i < pattern.sections.length; i++) {
    acc += pattern.sections[i].questions;
    if (questionNo <= acc) return i;
  }
  return pattern.sections.length - 1;
}

export function firstQuestionOf(pattern: ExamPattern, sectionIndex: number): number {
  return (
    pattern.sections.slice(0, sectionIndex).reduce((n, section) => n + section.questions, 0) + 1
  );
}

export const studySectionMinutes = (section: StudySection): number =>
  section.topics.reduce((n, topic) => n + topic.minutes, 0);

export function findStudyTopic(
  id: string | undefined,
  sections: readonly StudySection[] = [],
): { topic: StudyTopic; section: StudySection } | undefined {
  if (!id) return undefined;
  for (const section of sections) {
    const topic = section.topics.find((candidate) => candidate.id === id);
    if (topic) return { topic, section };
  }
  return undefined;
}

export function standardEntries(
  standards: PhysicalStandards,
): { key: StandardKey; standard: Standard }[] {
  const entry = (key: StandardKey, standard: Standard | undefined) =>
    standard ? [{ key, standard }] : [];
  return [
    ...entry('height', standards.height),
    ...entry('chest', standards.chest?.unexpanded),
    ...entry('chestExpansion', standards.chest?.expansion),
    ...entry('run1600m', standards.run1600m),
    ...entry('run800m', standards.run800m),
    ...entry('run100m', standards.run100m),
    ...entry('longJump', standards.longJump),
    ...entry('shotPut', standards.shotPut),
  ];
}

export const allVerified = (standards: PhysicalStandards): boolean =>
  standardEntries(standards).every((entry) => entry.standard.verified);
