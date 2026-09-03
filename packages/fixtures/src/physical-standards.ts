import type { Post } from './exam-pattern';

/**
 * PMT (Physical Measurement Test) and PET (Physical Efficiency Test) standards, config-driven
 * so a wrong number can be corrected without touching a screen.
 *
 * Researched 2026-09-03 against the TSLPRB 2022 notification as reported by the coaching press
 * (testbook.com, education.sakshi.com, manabadi.co.in, adda247 and freshersnow, cross-checked
 * against one another); the official PDFs on tslprb.in are scanned images and could not be read
 * by machine, so "confirmed" below means every source states the same figure and attributes it
 * to the notification.
 *
 * CONFIRMED (`verified: true`):
 * - PMT, men: height 167.6 cm, chest 86.3 cm unexpanded with 5 cm expansion.
 * - PMT, women: height 152.5 cm; women are not chest-measured.
 * - ST / agency-area height relaxation: 160 cm men, 150 cm women.
 * - Constable PET is THREE events. Men: 1600 m in 7 min 15 s (435 s), long jump 4.00 m,
 *   shot put (7.26 kg) 6.00 m. Women: 800 m in 5 min 20 s (320 s), long jump 2.50 m, shot put
 *   (4 kg) 4.00 m. The 100 m is NOT a Constable event.
 *
 * UNCONFIRMED (`verified: false`), tagged on the row by the eligibility screen:
 * - ST men's chest relaxation, 80 cm + 3 cm: reported by some sources only (medium confidence).
 * - EVERYTHING on the SI rows. The sources conflict about the SI events; the table keeps the
 *   four-event set the coaching sites quote — 100 m in 15 s men / 16 s women, 800 m in 170 s /
 *   200 s, long jump 3.80 m / 2.75 m, shot put 5.60 m / 4.25 m — plus the same PMT as a
 *   constable, none of it checked against the notification. The screen prints
 *   `eligibility.siUnverified` under the pickers while SI is selected.
 *
 * The eligibility screen prints `eligibility.disclaimer` under every verdict regardless.
 */

/** The notification the table was researched against; printed in the screen's disclaimer. */
export const STANDARDS_NOTIFICATION_YEAR = 2022;

export type Gender = 'male' | 'female';

/** Scheduled Tribe and agency-area candidates measure against the relaxed column. */
export type StandardsGroup = 'general' | 'st';

export type StandardKey =
  | 'height'
  | 'chest'
  | 'chestExpansion'
  | 'run1600m'
  | 'run800m'
  | 'run100m'
  | 'longJump'
  | 'shotPut';

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
  /**
   * The run events differ per post and gender — a constable man runs 1600 m, a constable
   * woman 800 m, an SI applicant 100 m and 800 m — so each is optional and, like the chest,
   * its absence is what keeps the row off the screen. Each is a maximum in seconds.
   */
  run1600m?: Standard;
  /** Maximum seconds for the 800 m run. */
  run800m?: Standard;
  /** Maximum seconds for the 100 m run. */
  run100m?: Standard;
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
  run1600m: max(435, true),
  longJump: min(4, true),
  shotPut: min(6, true),
  shotKg: 7.26,
};

const PC_MALE_ST: PhysicalStandards = {
  ...PC_MALE_GENERAL,
  group: 'st',
  height: min(160, true),
  // The relaxed chest is reported by fewer sources than the relaxed height; medium confidence.
  chest: { unexpanded: min(80), expansion: min(3) },
};

const PC_FEMALE_GENERAL: PhysicalStandards = {
  post: 'pc',
  gender: 'female',
  group: 'general',
  height: min(152.5, true),
  run800m: max(320, true),
  longJump: min(2.5, true),
  shotPut: min(4, true),
  shotKg: 4,
};

const PC_FEMALE_ST: PhysicalStandards = {
  ...PC_FEMALE_GENERAL,
  group: 'st',
  height: min(150, true),
};

// SI: nothing below is confirmed — see the header. Deliberately not spread from the constable
// rows, so a confirmed constable figure can never leak into an SI row by accident.
const SI_MALE_GENERAL: PhysicalStandards = {
  post: 'si',
  gender: 'male',
  group: 'general',
  height: min(167.6),
  chest: { unexpanded: min(86.3), expansion: min(5) },
  run800m: max(170),
  run100m: max(15),
  longJump: min(3.8),
  shotPut: min(5.6),
  shotKg: 7.26,
};

const SI_MALE_ST: PhysicalStandards = {
  ...SI_MALE_GENERAL,
  group: 'st',
  height: min(160),
  chest: { unexpanded: min(80), expansion: min(3) },
};

const SI_FEMALE_GENERAL: PhysicalStandards = {
  post: 'si',
  gender: 'female',
  group: 'general',
  height: min(152.5),
  run800m: max(200),
  run100m: max(16),
  longJump: min(2.75),
  shotPut: min(4.25),
  shotKg: 4,
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
