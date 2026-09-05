import type { Localized } from './questions';

/**
 * F-24 — sample data until the API serves live current affairs.
 *
 * Every item below is INVENTED. It is written the way a current-affairs digest for this exam
 * reads — one headline, one summary, one category — so the screen can be designed and
 * reviewed against realistic copy, but it is not news and must never be presented as news.
 * Nothing here names a person, and nothing attributes a result to a real, identifiable event:
 * a placeholder that reads as a real report is worse than an obviously blank one. When
 * `GET /affairs` lands, this file is deleted and the screen reads the API instead.
 *
 * Dates are plain `YYYY-MM-DD` calendar days — the day the digest carried the item — and
 * several items share a day on purpose, because the screen groups by day.
 */

/**
 * The five buckets a PWT general-studies digest sorts an item into. `telangana` is its own
 * bucket rather than a sub-case of `india`: the paper gives the state its own section.
 */
export type AffairCategory = 'india' | 'telangana' | 'world' | 'sports' | 'awards';

export type Affair = {
  id: string;
  /** Calendar day the item belongs to, `YYYY-MM-DD`. */
  date: string;
  category: AffairCategory;
  headline: Localized;
  summary: Localized;
};

export const AFFAIRS: Affair[] = [
  {
    id: 'af-metro-corridor',
    date: '2026-09-02',
    category: 'telangana',
    headline: {
      en: 'First stretch of the airport metro corridor opens',
      te: 'ఎయిర్‌పోర్ట్ మెట్రో కారిడార్ తొలి దశ ప్రారంభం',
    },
    summary: {
      en: 'Trains now run on the first elevated section towards the airport. The remaining stations on the corridor are to open in phases.',
      te: 'ఎయిర్‌పోర్ట్ వైపు ఎలివేటెడ్ మార్గంలోని తొలి భాగంలో రైళ్లు నడుస్తున్నాయి. కారిడార్‌లో మిగిలిన స్టేషన్లను దశలవారీగా తెరుస్తారు.',
    },
  },
  {
    id: 'af-rural-roads',
    date: '2026-09-02',
    category: 'india',
    headline: {
      en: 'Cabinet extends the rural roads programme',
      te: 'గ్రామీణ రహదారుల పథకానికి కేబినెట్ పొడిగింపు',
    },
    summary: {
      en: 'The Union Cabinet cleared a further phase of the rural connectivity programme, with the outlay shared between the Centre and the states.',
      te: 'గ్రామీణ అనుసంధాన పథకానికి మరో దశకు కేంద్ర కేబినెట్ ఆమోదం తెలిపింది; వ్యయాన్ని కేంద్రం, రాష్ట్రాలు పంచుకుంటాయి.',
    },
  },
  {
    id: 'af-inter-district-final',
    date: '2026-09-02',
    category: 'sports',
    headline: {
      en: 'Inter-district cricket tournament ends in Warangal',
      te: 'వరంగల్‌లో అంతర్ జిల్లా క్రికెట్ టోర్నీ ముగింపు',
    },
    summary: {
      en: 'The state association’s inter-district tournament closed with the final at Warangal. The winning side takes a place in the zonal round.',
      te: 'రాష్ట్ర సంఘం నిర్వహించిన అంతర్ జిల్లా టోర్నీ ఫైనల్ వరంగల్‌లో జరిగింది. విజేత జట్టుకు జోనల్ రౌండ్‌లో చోటు దక్కుతుంది.',
    },
  },
  {
    id: 'af-short-film-prize',
    date: '2026-09-02',
    category: 'awards',
    headline: {
      en: 'Documentary on lake restoration wins a national short-film prize',
      te: 'చెరువుల పునరుద్ధరణపై డాక్యుమెంటరీకి జాతీయ షార్ట్ ఫిల్మ్ పురస్కారం',
    },
    summary: {
      en: 'A documentary about restoring the tanks around a Telangana district took the top prize in the non-feature section of a national short-film festival.',
      te: 'తెలంగాణలోని ఒక జిల్లా చెరువుల పునరుద్ధరణపై తీసిన డాక్యుమెంటరీకి జాతీయ షార్ట్ ఫిల్మ్ ఉత్సవం నాన్-ఫీచర్ విభాగంలో అగ్ర పురస్కారం లభించింది.',
    },
  },
  {
    id: 'af-water-grid',
    date: '2026-09-01',
    category: 'telangana',
    headline: {
      en: 'Piped drinking water reaches every mandal of two districts',
      te: 'రెండు జిల్లాల్లోని ప్రతి మండలానికీ నల్లా నీరు',
    },
    summary: {
      en: 'The state reported that the drinking-water grid now covers every mandal in two more districts, with the last habitations connected this month.',
      te: 'మరో రెండు జిల్లాల్లోని ప్రతి మండలానికీ తాగునీటి గ్రిడ్ చేరిందని, చివరి ఆవాసాలను ఈ నెలలో కలిపామని రాష్ట్రం తెలిపింది.',
    },
  },
  {
    id: 'af-health-records',
    date: '2026-09-01',
    category: 'india',
    headline: {
      en: 'Digital health record scheme opened to all districts',
      te: 'డిజిటల్ ఆరోగ్య రికార్డు పథకం అన్ని జిల్లాలకు',
    },
    summary: {
      en: 'The national digital health record scheme was extended to every district, letting a patient carry one record between government hospitals.',
      te: 'జాతీయ డిజిటల్ ఆరోగ్య రికార్డు పథకాన్ని అన్ని జిల్లాలకు విస్తరించారు; దీంతో రోగి ఒకే రికార్డును ప్రభుత్వ ఆసుపత్రుల మధ్య తీసుకెళ్లవచ్చు.',
    },
  },
  {
    id: 'af-climate-fund',
    date: '2026-09-01',
    category: 'world',
    headline: {
      en: 'Climate meeting agrees a timetable for the adaptation fund',
      te: 'అడాప్టేషన్ ఫండ్‌కు కాలపట్టికపై వాతావరణ సదస్సు అంగీకారం',
    },
    summary: {
      en: 'Delegates at a United Nations climate meeting agreed a timetable for paying into the adaptation fund that helps lower-income countries.',
      te: 'తక్కువ ఆదాయ దేశాలకు తోడ్పడే అడాప్టేషన్ ఫండ్‌కు నిధులు చెల్లించే కాలపట్టికపై ఐక్యరాజ్యసమితి వాతావరణ సదస్సు ప్రతినిధులు అంగీకరించారు.',
    },
  },
  {
    id: 'af-it-exports',
    date: '2026-08-31',
    category: 'telangana',
    headline: {
      en: 'State reports a record year for software exports',
      te: 'సాఫ్ట్‌వేర్ ఎగుమతుల్లో రాష్ట్రానికి రికార్డు సంవత్సరం',
    },
    summary: {
      en: 'The state’s annual review put software exports at their highest yet, and counted new jobs added outside the Hyderabad city limits.',
      te: 'రాష్ట్ర వార్షిక సమీక్షలో సాఫ్ట్‌వేర్ ఎగుమతులు ఇప్పటివరకు అత్యధిక స్థాయికి చేరాయని, హైదరాబాద్ నగర పరిధి బయట కొత్త ఉద్యోగాలు వచ్చాయని పేర్కొన్నారు.',
    },
  },
  {
    id: 'af-trade-forecast',
    date: '2026-08-31',
    category: 'world',
    headline: {
      en: 'Global trade body trims its growth forecast',
      te: 'ప్రపంచ వాణిజ్య సంస్థ వృద్ధి అంచనా తగ్గింపు',
    },
    summary: {
      en: 'A global trade body cut its forecast for merchandise trade growth this year, citing weaker demand and higher shipping costs.',
      te: 'డిమాండ్ తగ్గడం, రవాణా ఖర్చులు పెరగడం కారణంగా ఈ ఏడాది సరుకుల వాణిజ్య వృద్ధి అంచనాను ప్రపంచ వాణిజ్య సంస్థ తగ్గించింది.',
    },
  },
  {
    id: 'af-junior-athletics',
    date: '2026-08-31',
    category: 'sports',
    headline: {
      en: 'Junior athletics meet closes with a new state record',
      te: 'కొత్త రాష్ట్ర రికార్డుతో జూనియర్ అథ్లెటిక్స్ మీట్ ముగింపు',
    },
    summary: {
      en: 'The state junior athletics meet ended with a new record in the 800 m. The selected athletes go on to the national junior camp.',
      te: 'రాష్ట్ర జూనియర్ అథ్లెటిక్స్ మీట్ 800 మీ. విభాగంలో కొత్త రికార్డుతో ముగిసింది. ఎంపికైన అథ్లెట్లు జాతీయ జూనియర్ శిబిరానికి వెళ్తారు.',
    },
  },
];

/**
 * The `n` most recent items, newest first.
 *
 * `YYYY-MM-DD` sorts lexicographically the same way it sorts chronologically, so no `Date` is
 * built and no time zone can move an item to the wrong day. Items sharing a day keep the
 * order the file lists them in, which is the order the screen groups them in.
 */
export function latestAffairs(n: number = AFFAIRS.length): Affair[] {
  return [...AFFAIRS]
    .sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? 1 : -1))
    .slice(0, Math.max(0, n));
}
