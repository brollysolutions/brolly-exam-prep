import type { Localized } from './questions';

/**
 * The notified exam, as a fixture until the API serves it.
 *
 * `pwtDate` is a plain `YYYY-MM-DD` rather than a `Date`: the countdown is a difference of
 * calendar days in the candidate's own timezone, not an instant, and a stored `Date` would
 * drag a UTC midnight into that subtraction and be a day out for half of India's evening.
 */
export type ExamInfo = {
  /** `YYYY-MM-DD`, local calendar date. */
  pwtDate: string;
  label: Localized;
};

/**
 * SAMPLE. TSLPRB has not notified a 2026 PWT date at the time of writing; this is a
 * placeholder so Home has something to count down to. Replace with the notified date the
 * day it is published.
 */
export const EXAM_INFO: ExamInfo = {
  pwtDate: '2026-10-18',
  label: {
    en: 'Preliminary Written Test',
    te: 'ప్రిలిమినరీ రాత పరీక్ష',
  },
};
