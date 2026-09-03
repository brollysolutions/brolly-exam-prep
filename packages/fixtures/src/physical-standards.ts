import type { Post } from './exam-pattern';

/**
 * PMT (Physical Measurement Test) and PET (Physical Efficiency Test) standards, config-driven
 * so a wrong number can be corrected without touching a screen.
 *
 * Seeded 2026-09-03 from the TSLPRB 2022 notification as reported by the coaching press —
 * testbook.com/telangana-police-constable/physical-test,
 * education.sakshi.com (TSLPRB constable selection procedure),
 * manabadi.co.in/entrance-Exams/telangana-police-constable-physical-test.asp.
 *
 * `verified: true` marks only the figures every one of those sources states identically and
 * attributes to the notification: the men's 167.6 cm height with an 86.3 cm chest and 5 cm
 * expansion, and the women's 152.5 cm height. EVERYTHING ELSE IS `verified: false` and must be
 * checked against the notification PDF on tslprb.in before a candidate is told they qualify.
 *
 * Known disagreements at the time of writing, all left unverified here:
 * - the women's 800 m limit is quoted as both 2:50 and 5:20;
 * - the men's long jump is quoted as both 3.80 m and 4.00 m;
 * - the ST / agency-area height relaxation (160 cm men, 150 cm women) is widely reported but
 *   the exact wording — and whether the chest standard relaxes with it — is not confirmed;
 * - the SI rows are placeholders: the same PMT as a constable with the stricter event
 *   distances the coaching sites quote for SI. Nothing in them is confirmed.
 *
 * The eligibility screen prints `eligibility.disclaimer` under every verdict for this reason.
 */

export type Gender = 'male' | 'female';

/** Scheduled Tribe and agency-area candidates measure against the relaxed column. */
export type StandardsGroup = 'general' | 'st';

export type StandardKey =
  'height' | 'chest' | 'chestExpansion' | 'run800m' | 'run100m' | 'longJump' | 'shotPut';

/** `min` — the candidate has to reach the value; `max` — they have to stay at or under it. */
export type StandardDirection = 'min' | 'max';

export type Standard = {
  value: number;
  dir: StandardDirection;
  /** `false` = seeded from secondary reporting; confirm against the notification. */
  verified: boolean;
};

export type PhysicalStandards = {
  post: Post;
  gender: Gender;
  group: StandardsGroup;
  /** Minimum height, cm. */
  height: Standard;
  /**
   * Men only, cm. Women are not chest-measured at the PMT, and the absence of the field —
   * rather than a zero — is what tells the checker to leave those two rows off the screen.
   */
  chest?: { unexpanded: Standard; expansion: Standard };
  /** Maximum seconds for the 800 m run. */
  run800m: Standard;
  /** Maximum seconds for the 100 m run. */
  run100m: Standard;
  /** Minimum long jump, metres. */
  longJump: Standard;
  /** Minimum shot put, metres. */
  shotPut: Standard;
  /** Weight of the shot, kg (7.26 men / 4 women). Context for the label, never pass/fail. */
  shotKg: number;
};

const min = (value: number, verified = false): Standard => ({ value, dir: 'min', verified });
const max = (value: number, verified = false): Standard => ({ value, dir: 'max', verified });

const PC_MALE_GENERAL: PhysicalStandards = {
  post: 'pc',
  gender: 'male',
  group: 'general',
  height: min(167.6, true),
  chest: { unexpanded: min(86.3, true), expansion: min(5, true) },
  run800m: max(170),
  run100m: max(15),
  longJump: min(3.8),
  shotPut: min(5.6),
  shotKg: 7.26,
};

const PC_MALE_ST: PhysicalStandards = {
  ...PC_MALE_GENERAL,
  group: 'st',
  height: min(160),
  // The relaxation is reported for height; whether the chest relaxes with it is not stated,
  // so the general figures are carried over unverified rather than invented.
  chest: { unexpanded: min(86.3), expansion: min(5) },
};

const PC_FEMALE_GENERAL: PhysicalStandards = {
  post: 'pc',
  gender: 'female',
  group: 'general',
  height: min(152.5, true),
  run800m: max(200),
  run100m: max(16),
  longJump: min(2.75),
  shotPut: min(4.25),
  shotKg: 4,
};

const PC_FEMALE_ST: PhysicalStandards = {
  ...PC_FEMALE_GENERAL,
  group: 'st',
  height: min(150),
};

const SI_MALE_GENERAL: PhysicalStandards = {
  ...PC_MALE_GENERAL,
  post: 'si',
  height: min(167.6),
  chest: { unexpanded: min(86.3), expansion: min(5) },
  longJump: min(4),
  shotPut: min(6),
};

const SI_MALE_ST: PhysicalStandards = {
  ...SI_MALE_GENERAL,
  group: 'st',
  height: min(160),
};

const SI_FEMALE_GENERAL: PhysicalStandards = {
  ...PC_FEMALE_GENERAL,
  post: 'si',
  height: min(152.5),
  longJump: min(3),
  shotPut: min(4.75),
};

const SI_FEMALE_ST: PhysicalStandards = {
  ...SI_FEMALE_GENERAL,
  group: 'st',
  height: min(150),
};

/** post × gender × group. The only table; `standardsFor` is the only way in. */
export const PHYSICAL_STANDARDS: Record<
  Post,
  Record<Gender, Record<StandardsGroup, PhysicalStandards>>
> = {
  pc: {
    male: { general: PC_MALE_GENERAL, st: PC_MALE_ST },
    female: { general: PC_FEMALE_GENERAL, st: PC_FEMALE_ST },
  },
  si: {
    male: { general: SI_MALE_GENERAL, st: SI_MALE_ST },
    female: { general: SI_FEMALE_GENERAL, st: SI_FEMALE_ST },
  },
};

export const standardsFor = (
  post: Post,
  gender: Gender,
  group: StandardsGroup,
): PhysicalStandards => PHYSICAL_STANDARDS[post][gender][group];

/**
 * The standards that apply to one candidate, flattened into the order they are measured in.
 *
 * The single place the "women are not chest-measured" rule lives: the checker builds its rows
 * from this list and the screen builds its fields from the same list, so neither can drift.
 */
export function standardEntries(s: PhysicalStandards): { key: StandardKey; standard: Standard }[] {
  return [
    { key: 'height' as const, standard: s.height },
    ...(s.chest
      ? [
          { key: 'chest' as const, standard: s.chest.unexpanded },
          { key: 'chestExpansion' as const, standard: s.chest.expansion },
        ]
      : []),
    { key: 'run800m' as const, standard: s.run800m },
    { key: 'run100m' as const, standard: s.run100m },
    { key: 'longJump' as const, standard: s.longJump },
    { key: 'shotPut' as const, standard: s.shotPut },
  ];
}

/** True when every figure a candidate is measured against has been confirmed. */
export const allVerified = (s: PhysicalStandards): boolean =>
  standardEntries(s).every((e) => e.standard.verified);
