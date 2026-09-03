import {
  allVerified,
  PHYSICAL_STANDARDS,
  standardEntries,
  standardsFor,
  type Gender,
  type Post,
  type StandardKey,
  type StandardsGroup,
} from '@tslprb/fixtures';

const POSTS: Post[] = ['pc', 'si'];
const GENDERS: Gender[] = ['male', 'female'];
const GROUPS: StandardsGroup[] = ['general', 'st'];

const every = (fn: (post: Post, gender: Gender, group: StandardsGroup) => void) =>
  POSTS.forEach((post) =>
    GENDERS.forEach((gender) => GROUPS.forEach((group) => fn(post, gender, group))),
  );

const keys = (post: Post, gender: Gender, group: StandardsGroup): StandardKey[] =>
  standardEntries(standardsFor(post, gender, group)).map((e) => e.key);

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
        expect(standard.dir).toBe(key.startsWith('run') ? 'max' : 'min');
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
});

describe('physical standards — the events per post', () => {
  // The Constable PET is three events: one run, the long jump and the shot put. The 100 m is
  // an SI event and must never be asked of a constable applicant.
  it('runs a constable man over 1600 m and nothing else', () => {
    GROUPS.forEach((group) => {
      expect(keys('pc', 'male', group)).toEqual([
        'height',
        'chest',
        'chestExpansion',
        'run1600m',
        'longJump',
        'shotPut',
      ]);
    });
  });

  it('runs a constable woman over 800 m and nothing else', () => {
    GROUPS.forEach((group) => {
      expect(keys('pc', 'female', group)).toEqual(['height', 'run800m', 'longJump', 'shotPut']);
    });
  });

  it('keeps the 100 m off every constable row', () => {
    GENDERS.forEach((gender) =>
      GROUPS.forEach((group) => {
        expect(standardsFor('pc', gender, group).run100m).toBeUndefined();
        expect(keys('pc', gender, group)).not.toContain('run100m');
      }),
    );
  });

  it('runs an SI applicant over both 100 m and 800 m, never 1600 m', () => {
    GENDERS.forEach((gender) =>
      GROUPS.forEach((group) => {
        const k = keys('si', gender, group);
        expect(k).toContain('run100m');
        expect(k).toContain('run800m');
        expect(k).not.toContain('run1600m');
      }),
    );
  });

  it('lists the events in measuring order', () => {
    expect(keys('si', 'male', 'general')).toEqual([
      'height',
      'chest',
      'chestExpansion',
      'run800m',
      'run100m',
      'longJump',
      'shotPut',
    ]);
  });
});

describe('physical standards — the figures', () => {
  it('holds a constable man to the 2022 notification', () => {
    const s = PHYSICAL_STANDARDS.pc.male.general;
    expect(s.height.value).toBe(167.6);
    expect(s.chest?.unexpanded.value).toBe(86.3);
    expect(s.chest?.expansion.value).toBe(5);
    expect(s.run1600m?.value).toBe(435);
    expect(s.longJump.value).toBe(4);
    expect(s.shotPut.value).toBe(6);
    expect(s.shotKg).toBe(7.26);
  });

  it('holds a constable woman to the 2022 notification', () => {
    const s = PHYSICAL_STANDARDS.pc.female.general;
    expect(s.height.value).toBe(152.5);
    expect(s.run800m?.value).toBe(320);
    expect(s.longJump.value).toBe(2.5);
    expect(s.shotPut.value).toBe(4);
    expect(s.shotKg).toBe(4);
  });

  it('relaxes the height and the chest for ST / agency-area candidates', () => {
    expect(PHYSICAL_STANDARDS.pc.male.st.height.value).toBe(160);
    expect(PHYSICAL_STANDARDS.pc.female.st.height.value).toBe(150);
    expect(PHYSICAL_STANDARDS.pc.male.st.chest?.unexpanded.value).toBe(80);
    expect(PHYSICAL_STANDARDS.pc.male.st.chest?.expansion.value).toBe(3);
  });
});

describe('physical standards — what is confirmed', () => {
  it('confirms every constable figure except the ST chest', () => {
    expect(allVerified(PHYSICAL_STANDARDS.pc.male.general)).toBe(true);
    expect(allVerified(PHYSICAL_STANDARDS.pc.female.general)).toBe(true);
    expect(allVerified(PHYSICAL_STANDARDS.pc.female.st)).toBe(true);

    const st = PHYSICAL_STANDARDS.pc.male.st;
    expect(allVerified(st)).toBe(false);
    expect(st.height.verified).toBe(true);
    expect(st.chest?.unexpanded.verified).toBe(false);
    expect(st.chest?.expansion.verified).toBe(false);
    expect(st.run1600m?.verified).toBe(true);
    expect(st.longJump.verified).toBe(true);
    expect(st.shotPut.verified).toBe(true);
  });

  // The sources disagree about the SI events, so nothing on an SI row may claim to be confirmed
  // until the notification PDF has been read: the screen tags every one of these.
  it('confirms nothing for SI', () => {
    GENDERS.forEach((gender) =>
      GROUPS.forEach((group) => {
        expect(allVerified(standardsFor('si', gender, group))).toBe(false);
        standardEntries(standardsFor('si', gender, group)).forEach(({ standard }) => {
          expect(standard.verified).toBe(false);
        });
      }),
    );
  });
});
