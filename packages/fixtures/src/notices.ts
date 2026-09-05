import type { Localized } from './questions';

/**
 * F-24 — sample data until the API serves live notices.
 *
 * Every item below is INVENTED: it is written in the register the Board actually uses for a
 * recruitment cycle (notification, application window, exam date, hall tickets, PMT/PET,
 * result) so the screen can be designed and reviewed against realistic copy, but none of it
 * is reportage and none of it should ever be shown as a real announcement. When
 * `GET /notices` lands, this file is deleted and the screen reads the API instead.
 *
 * Dates are plain `YYYY-MM-DD` calendar days, never timestamps: a notice belongs to the day
 * the Board dated it, not to a moment in the reader's time zone.
 */

/**
 * What a notice is about. The five kinds are the five things a candidate watches the Board's
 * site for; the chip on the row says which one without the reader having to open it.
 */
export type NoticeKind = 'notification' | 'admitCard' | 'examDate' | 'result' | 'pet';

export type Notice = {
  id: string;
  kind: NoticeKind;
  /** Calendar date the Board dated the notice, `YYYY-MM-DD`. */
  date: string;
  title: Localized;
  body: Localized;
  /** Where the full notice lives, when there is one to open. */
  link?: string;
};

/** The Board's own site — the only place a notice is ever authoritative. */
const BOARD = 'https://www.tslprb.in';

export const NOTICES: Notice[] = [
  {
    id: 'nt-2026-notification',
    kind: 'notification',
    date: '2026-08-04',
    title: {
      en: 'SCT PC and SI recruitment notification released',
      te: 'SCT PC, SI నియామక నోటిఫికేషన్ విడుదల',
    },
    body: {
      en: 'The Board has released the notification for Stipendiary Cadet Trainee Police Constable and Sub-Inspector posts in the civil and armed wings. Read the post-wise vacancies, the qualification and the age limits in the notification before you apply.',
      te: 'సివిల్, ఆర్మ్‌డ్ విభాగాల్లో స్టైపెండరీ క్యాడెట్ ట్రైనీ పోలీస్ కానిస్టేబుల్, సబ్-ఇన్‌స్పెక్టర్ పోస్టులకు బోర్డు నోటిఫికేషన్ విడుదల చేసింది. దరఖాస్తు చేసే ముందు పోస్టుల వారీగా ఖాళీలు, అర్హత, వయోపరిమితిని నోటిఫికేషన్‌లో చూడండి.',
    },
    link: BOARD,
  },
  {
    id: 'nt-2026-application',
    kind: 'notification',
    date: '2026-08-18',
    title: {
      en: 'Online applications open until 5 September',
      te: 'ఆన్‌లైన్ దరఖాస్తులు సెప్టెంబర్ 5 వరకు',
    },
    body: {
      en: 'Applications are taken only on the Board’s website. One application per post, with the fee paid online at the end of the form. Keep the application number safe — the hall ticket is downloaded with it.',
      te: 'దరఖాస్తులను బోర్డు వెబ్‌సైట్‌లో మాత్రమే స్వీకరిస్తారు. ఒక్కో పోస్టుకు ఒక దరఖాస్తు; ఫారం చివర ఫీజును ఆన్‌లైన్‌లో చెల్లించాలి. దరఖాస్తు నంబర్‌ను భద్రంగా ఉంచుకోండి — హాల్ టికెట్ దానితోనే డౌన్‌లోడ్ అవుతుంది.',
    },
    link: BOARD,
  },
  {
    id: 'nt-2026-final-list',
    kind: 'result',
    date: '2026-08-26',
    title: {
      en: 'Final selection list of the earlier recruitment published',
      te: 'గత నియామకపు తుది ఎంపిక జాబితా విడుదల',
    },
    body: {
      en: 'The Board has published the final list of selected candidates for the earlier Police Constable recruitment, with the cut-off marks for every post and category. The marks and the answer key of that test stay on the Board’s website.',
      te: 'గత పోలీస్ కానిస్టేబుల్ నియామకానికి సంబంధించి ఎంపికైన అభ్యర్థుల తుది జాబితాను, ప్రతి పోస్టు, కేటగిరీ కటాఫ్ మార్కులతో కలిపి బోర్డు విడుదల చేసింది. ఆ పరీక్ష మార్కులు, కీ బోర్డు వెబ్‌సైట్‌లో అలాగే ఉంటాయి.',
    },
    link: BOARD,
  },
  {
    id: 'nt-2026-exam-date',
    kind: 'examDate',
    date: '2026-09-09',
    title: {
      en: 'Preliminary Written Test set for 18 October',
      te: 'ప్రిలిమినరీ రాత పరీక్ష అక్టోబర్ 18న',
    },
    body: {
      en: 'The PWT for the Constable posts will be held in one session on Sunday, 18 October, from 10 a.m. to 1 p.m. Centres are allotted district-wise and printed on the hall ticket.',
      te: 'కానిస్టేబుల్ పోస్టులకు PWT అక్టోబర్ 18 ఆదివారం ఉదయం 10 నుంచి మధ్యాహ్నం 1 వరకు ఒకే సెషన్‌లో జరుగుతుంది. కేంద్రాలను జిల్లాల వారీగా కేటాయిస్తారు; అవి హాల్ టికెట్‌పై ఉంటాయి.',
    },
  },
  {
    id: 'nt-2026-hall-ticket',
    kind: 'admitCard',
    date: '2026-10-06',
    title: {
      en: 'Hall tickets to download from 10 October',
      te: 'హాల్ టికెట్లు అక్టోబర్ 10 నుంచి',
    },
    body: {
      en: 'Download the hall ticket with your application number and date of birth. Carry a printed copy and one original photo identity card; a candidate without both is not let into the hall.',
      te: 'దరఖాస్తు నంబర్, పుట్టిన తేదీతో హాల్ టికెట్ డౌన్‌లోడ్ చేసుకోండి. ప్రింట్ చేసిన కాపీని, ఒక ఒరిజినల్ ఫోటో గుర్తింపు కార్డును తీసుకెళ్లండి; రెండూ లేని అభ్యర్థిని పరీక్ష హాలులోకి అనుమతించరు.',
    },
    link: BOARD,
  },
  {
    id: 'nt-2026-pmt-pet',
    kind: 'pet',
    date: '2026-10-24',
    title: {
      en: 'PMT and PET schedule for shortlisted candidates',
      te: 'షార్ట్‌లిస్ట్ అభ్యర్థులకు PMT, PET షెడ్యూల్',
    },
    body: {
      en: 'The Physical Measurement and Physical Efficiency Tests begin at the district headquarters in the last week of November. The events, the qualifying standards and the reporting time are in the schedule; measure yourself against the standards before you report.',
      te: 'ఫిజికల్ మెజర్‌మెంట్, ఫిజికల్ ఎఫిషియెన్సీ పరీక్షలు నవంబర్ చివరి వారంలో జిల్లా కేంద్రాల్లో మొదలవుతాయి. ఈవెంట్లు, అర్హత ప్రమాణాలు, రిపోర్టింగ్ సమయం షెడ్యూల్‌లో ఉన్నాయి; రిపోర్ట్ చేసే ముందు ప్రమాణాలతో మిమ్మల్ని మీరు సరిచూసుకోండి.',
    },
  },
];

/**
 * The `n` most recent notices, newest first.
 *
 * `YYYY-MM-DD` sorts lexicographically the same way it sorts chronologically, so no `Date`
 * is built and no time zone can move a notice to the wrong day. Same-day notices keep the
 * order the file lists them in.
 */
export function latestNotices(n: number = NOTICES.length): Notice[] {
  return [...NOTICES]
    .sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? 1 : -1))
    .slice(0, Math.max(0, n));
}
