import {
  EXAM_INFO,
  latestAffairs,
  latestNotices,
  standardsFor,
  STUDY_TOPICS,
  TESTS,
} from '../content';
import { evaluate, toInput } from '../../features/eligibility/evaluate';

jest.unmock('@/data/api');
jest.unmock('@/data/content');

describe('mobile without bundled content', () => {
  it('does not expose sample catalogues, news, or an invented exam date', () => {
    expect(TESTS).toEqual([]);
    expect(STUDY_TOPICS).toEqual([]);
    expect(latestAffairs(undefined)).toEqual([]);
    expect(latestNotices(undefined)).toEqual([]);
    expect(EXAM_INFO.pwtDate).toBe('');
  });

  it('cannot declare someone eligible when no standards have been supplied', () => {
    const result = evaluate(
      toInput('pc', 'male', 'general', {}),
      standardsFor('pc', 'male', 'general', []),
    );
    expect(result.rows.map((row) => row.key)).toEqual(['height', 'longJump', 'shotPut']);
    expect(result.rows.every((row) => row.verified === false)).toBe(true);
    expect(result.verdict).toBe('incomplete');
  });
});
