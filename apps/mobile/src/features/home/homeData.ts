import type { Localized } from '@tslprb/fixtures';

/**
 * The board's own announcements. `kind` names the four things TSLPRB actually posts, so a
 * card can be read at a glance without opening it.
 */
export type HomeNoticeKind = 'notification' | 'admitCard' | 'examDate' | 'result';

export type HomeNotice = {
  id: string;
  kind: HomeNoticeKind;
  /** `YYYY-MM-DD`, local calendar date. */
  date: string;
  title: Localized;
};

export type HomeAffairCategory = 'india' | 'telangana' | 'world' | 'sports' | 'awards';

export type HomeAffair = {
  id: string;
  /** `YYYY-MM-DD`, local calendar date. */
  date: string;
  category: HomeAffairCategory;
  headline: Localized;
};

/**
 * TEMPORARY SAMPLE DATA — not facts.
 *
 * Home has to render its notice and affairs shelves before F-24 exists, and a shelf with no
 * rows is a screen nobody can review. These three of each are invented, dated to the 2026
 * cycle, and phrased the way the board phrases things; nothing here should ever be quoted to
 * a candidate as true.
 *
 * F-24 replaces with @tslprb/fixtures (`notices.ts` / `affairs.ts`), and this file goes with
 * the import that replaces it.
 */
export const SAMPLE_NOTICES: HomeNotice[] = [
  {
    id: 'sample-notice-1',
    kind: 'notification',
    date: '2026-08-28',
    title: {
      en: 'Recruitment notification for SCT PC (Civil) posts published',
      te: 'SCT PC (సివిల్) పోస్టుల నియామక నోటిఫికేషన్ విడుదల',
      ur: 'ایس سی ٹی پی سی (سول) اسامیوں کا بھرتی نوٹیفکیشن جاری',
    },
  },
  {
    id: 'sample-notice-2',
    kind: 'examDate',
    date: '2026-09-01',
    title: {
      en: 'Preliminary Written Test scheduled for 18 October',
      te: 'ప్రిలిమినరీ రాత పరీక్ష అక్టోబర్ 18న',
      ur: 'پریلیمنری تحریری امتحان 18 اکتوبر کو',
    },
  },
  {
    id: 'sample-notice-3',
    kind: 'admitCard',
    date: '2026-09-02',
    title: {
      en: 'Hall tickets open for download two weeks before the test',
      te: 'పరీక్షకు రెండు వారాల ముందు హాల్ టికెట్ల డౌన్‌లోడ్',
      ur: 'امتحان سے دو ہفتے قبل ہال ٹکٹ ڈاؤن لوڈ کے لیے دستیاب',
    },
  },
];

/** TEMPORARY SAMPLE DATA — see `SAMPLE_NOTICES`. F-24 replaces with @tslprb/fixtures. */
export const SAMPLE_AFFAIRS: HomeAffair[] = [
  {
    id: 'sample-affair-1',
    date: '2026-09-03',
    category: 'telangana',
    headline: {
      en: 'State adds two police districts under the reorganisation order',
      te: 'పునర్‌వ్యవస్థీకరణ ఉత్తర్వుతో రాష్ట్రంలో రెండు కొత్త పోలీసు జిల్లాలు',
      ur: 'ری آرگنائزیشن آرڈر کے تحت ریاست میں دو نئے پولیس اضلاع',
    },
  },
  {
    id: 'sample-affair-2',
    date: '2026-09-03',
    category: 'india',
    headline: {
      en: 'Home Ministry clears a coastal security upgrade for eight states',
      te: 'ఎనిమిది రాష్ట్రాలకు తీర భద్రత ఆధునికీకరణకు హోం శాఖ ఆమోదం',
      ur: 'وزارت داخلہ کی آٹھ ریاستوں کے لیے ساحلی سلامتی اپ گریڈ کی منظوری',
    },
  },
  {
    id: 'sample-affair-3',
    date: '2026-09-02',
    category: 'sports',
    headline: {
      en: 'India retain the Asia Cup hockey title in the final at Chennai',
      te: 'చెన్నై ఫైనల్‌లో ఆసియా కప్ హాకీ టైటిల్‌ను నిలబెట్టుకున్న భారత్',
      ur: 'چنئی کے فائنل میں بھارت نے ایشیا کپ ہاکی ٹائٹل برقرار رکھا',
    },
  },
];

const DAY_MS = 86_400_000;

/** `YYYY-MM-DD` split into its three numbers, or `undefined` for anything else. */
function parts(isoDate: string): [number, number, number] | undefined {
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return undefined;
  return [y, m, d];
}

/**
 * Whole calendar days from today to an exam date, floored at 0.
 *
 * Both ends are pinned to LOCAL midnight before subtracting. `new Date('2026-10-18')` parses
 * as UTC midnight, which is 5:30 am in Chennai — subtract that from a local `now` and the
 * count is a day out for every candidate reading Home in the evening.
 */
export function daysUntil(isoDate: string, now: number = Date.now()): number {
  const ymd = parts(isoDate);
  if (!ymd) return 0;
  const target = new Date(ymd[0], ymd[1] - 1, ymd[2]).getTime();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((target - today.getTime()) / DAY_MS));
}

/**
 * Dates render as digits, never as words: `18-10` and `18-10-2026`.
 *
 * A month name would have to be translated into three languages and would leave the Latin
 * face mid-line in Telugu and Urdu; a numeric date goes through `<Num>` instead — tabular,
 * LTR-isolated, and identical in all three. Day-first, which is how India writes them.
 */
export const shortDate = (isoDate: string): string => {
  const ymd = parts(isoDate);
  return ymd ? `${String(ymd[2]).padStart(2, '0')}-${String(ymd[1]).padStart(2, '0')}` : isoDate;
};

/** `DD-MM-YYYY` — the long form, for the one date on the screen that carries a year. */
export const fullDate = (isoDate: string): string => {
  const ymd = parts(isoDate);
  return ymd ? `${shortDate(isoDate)}-${ymd[0]}` : isoDate;
};
