import {
  findStudyTopic,
  STUDY_SECTIONS,
  STUDY_TOPICS,
  studySectionMinutes,
  type StudyBlock,
} from '@tslprb/fixtures';
import { en } from '@tslprb/i18n';

const LANGS = ['en', 'te', 'ur'] as const;

/** Every string a block carries, whichever arm of the union it is. */
const stringsOf = (block: StudyBlock) => (block.kind === 'bullets' ? block.items : [block.text]);

/** The text of every formula box in the material, in all three languages. */
const FORMULAS = STUDY_TOPICS.flatMap((topic) =>
  topic.blocks.flatMap((block) => (block.kind === 'formula' ? [block.text] : [])),
);

describe('study fixtures', () => {
  it('covers every section of the paper with at least two topics', () => {
    expect(STUDY_SECTIONS.map((s) => s.id)).toEqual(['arithmetic', 'reasoning', 'gs', 'telangana']);
    for (const section of STUDY_SECTIONS) {
      expect(section.topics.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('gives every topic a unique id, its own section and a real reading time', () => {
    const ids = STUDY_TOPICS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const section of STUDY_SECTIONS) {
      for (const topic of section.topics) {
        expect(topic.section).toBe(section.id);
        expect(topic.minutes).toBeGreaterThan(0);
      }
    }
  });

  // The whole point of the fixture: a candidate sitting the paper in Telugu revises in Telugu.
  it.each(STUDY_TOPICS.map((t) => [t.id, t] as const))(
    '%s is written in all three languages',
    (_id, topic) => {
      for (const lang of LANGS) {
        expect(topic.title[lang].length).toBeGreaterThan(0);
      }
      expect(topic.blocks.length).toBeGreaterThanOrEqual(4);
      for (const block of topic.blocks) {
        for (const text of stringsOf(block)) {
          for (const lang of LANGS) {
            expect(typeof text[lang]).toBe('string');
            expect(text[lang].trim().length).toBeGreaterThan(0);
          }
        }
      }
    },
  );

  it('opens every topic with a heading and closes it with an example and a tip', () => {
    for (const topic of STUDY_TOPICS) {
      const kinds = topic.blocks.map((b) => b.kind);
      expect(kinds[0]).toBe('heading');
      expect(kinds.filter((k) => k === 'example')).toHaveLength(1);
      expect(kinds.filter((k) => k === 'tip')).toHaveLength(1);
      expect(kinds).toContain('bullets');
    }
  });

  // A formula box copied verbatim into te and ur left "New ÷ Old" and "SP − CP" on a page
  // whose reader may not read English at all — the one place in the material where that was
  // ever true. Copying it is only honest when there is nothing left to translate.
  it('translates the words in every formula box', () => {
    expect(FORMULAS.length).toBeGreaterThan(0);
    for (const text of FORMULAS) {
      for (const lang of ['te', 'ur'] as const) {
        if (text[lang] !== text.en) continue;
        // Pure symbols and digits read the same in every script; a Latin letter does not.
        expect(text.en).not.toMatch(/[A-Za-z]/);
      }
    }
  });

  // The variables (a, b, A…Z) stay Latin; whole English words must not survive.
  it('leaves no English word in a Telugu or Urdu formula box', () => {
    for (const text of FORMULAS) {
      for (const lang of ['te', 'ur'] as const) {
        expect(text[lang]).not.toMatch(/[A-Za-z]{2,}/);
      }
    }
  });

  it('labels each section with a key the locale files actually hold', () => {
    for (const section of STUDY_SECTIONS) {
      const value = section.labelKey
        .split('.')
        .reduce<unknown>((o, part) => (o as Record<string, unknown>)[part], en);
      expect(typeof value).toBe('string');
    }
  });

  it('sums a section reading time from its topics', () => {
    const arithmetic = STUDY_SECTIONS[0];
    expect(studySectionMinutes(arithmetic)).toBe(
      arithmetic.topics.reduce((n, t) => n + t.minutes, 0),
    );
  });

  it('finds a topic with the section it belongs to, and nothing for an unknown id', () => {
    const found = findStudyTopic('st-ar-percentages');
    expect(found?.topic.title.en).toBe('Percentages');
    expect(found?.section.id).toBe('arithmetic');
    expect(findStudyTopic('st-nope')).toBeUndefined();
    expect(findStudyTopic(undefined)).toBeUndefined();
  });
});
