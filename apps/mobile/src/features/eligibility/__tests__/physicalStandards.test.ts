import {
  allVerified,
  PHYSICAL_STANDARDS,
  standardEntries,
  standardsFor,
  type Gender,
  type Post,
  type StandardsGroup,
} from '@tslprb/fixtures';

const POSTS: Post[] = ['pc', 'si'];
const GENDERS: Gender[] = ['male', 'female'];
const GROUPS: StandardsGroup[] = ['general', 'st'];

const every = (fn: (post: Post, gender: Gender, group: StandardsGroup) => void) =>
  POSTS.forEach((post) =>
    GENDERS.forEach((gender) => GROUPS.forEach((group) => fn(post, gender, group))),
  );

describe('physical standards table', () => {
  it('answers for every post × gender × category group', () => {
    every((post, gender, group) => {
      const s = standardsFor(post, gender, group);
      expect(s).toBeDefined();
      expect([s.post, s.gender, s.group]).toEqual([post, gender, group]);
    });
  });

  it('measures men for chest and women not at all', () => {
    every((post, _gender, group) => {
      expect(standardsFor(post, 'male', group).chest).toBeDefined();
      expect(standardsFor(post, 'female', group).chest).toBeUndefined();
    });
  });

  // A run is a limit and everything else is a floor; getting one backwards would pass the
  // slowest candidate on the ground and fail the fastest.
  it('reads the runs as limits and the rest as floors', () => {
    every((post, gender, group) => {
      standardEntries(standardsFor(post, gender, group)).forEach(({ key, standard }) => {
        expect(standard.dir).toBe(key === 'run800m' || key === 'run100m' ? 'max' : 'min');
        expect(standard.value).toBeGreaterThan(0);
      });
    });
  });

  it('never asks an ST candidate for more height than a general one', () => {
    POSTS.forEach((post) =>
      GENDERS.forEach((gender) => {
        expect(standardsFor(post, gender, 'st').height.value).toBeLessThanOrEqual(
          standardsFor(post, gender, 'general').height.value,
        );
      }),
    );
  });

  it('holds men to a heavier shot than women', () => {
    every((post, _gender, group) => {
      expect(standardsFor(post, 'male', group).shotKg).toBeGreaterThan(
        standardsFor(post, 'female', group).shotKg,
      );
    });
  });

  /**
   * The table is seeded from secondary reporting, so this is a reminder rather than a
   * requirement: nothing is fully confirmed yet, and the screen carries the disclaimer that
   * says so. When someone checks the notification PDF and flips these to `verified: true`,
   * this expectation is the line to update.
   */
  it('is still awaiting confirmation against the notification', () => {
    every((post, gender, group) => {
      expect(allVerified(standardsFor(post, gender, group))).toBe(false);
    });
    expect(PHYSICAL_STANDARDS.pc.male.general.height.verified).toBe(true);
  });
});
