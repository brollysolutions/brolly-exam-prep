import type { SectionId } from './exam-pattern';

export type Lang = 'en' | 'te';
export type Localized = Record<Lang, string>;

export type Question = {
  id: string;
  section: SectionId;
  text: Localized;
  options: Record<Lang, [string, string, string, string]>;
  correct: 0 | 1 | 2 | 3;
  explanation: Localized;
  /** crowd average seconds, for the solutions screen */
  avgSeconds: number;
};

/** Seed questions copied from the approved prototype, then extended per section. */
export const QUESTIONS: Question[] = [
  {
    id: 'q-ar-001',
    section: 'arithmetic',
    text: {
      en: 'A train 180 metres long crosses a pole in 9 seconds. What is its speed in kilometres per hour?',
      te: '180 మీటర్ల పొడవున్న రైలు ఒక స్తంభాన్ని 9 సెకన్లలో దాటుతుంది. దాని వేగం గంటకు ఎన్ని కిలోమీటర్లు?',
    },
    options: {
      en: ['60 km/h', '64 km/h', '72 km/h', '80 km/h'],
      te: ['60 కి.మీ/గం', '64 కి.మీ/గం', '72 కి.మీ/గం', '80 కి.మీ/గం'],
    },
    correct: 2,
    explanation: {
      en: 'To cross a pole the train travels its own length. Speed = 180 ÷ 9 = 20 m/s. Convert by multiplying by 18/5: 20 × 18/5 = 72 km/h.',
      te: 'స్తంభాన్ని దాటడానికి రైలు తన పొడవునే ప్రయాణించాలి. వేగం = 180 ÷ 9 = 20 మీ/సె. కి.మీ/గం లోకి మార్చడానికి 18/5 తో గుణించాలి: 20 × 18/5 = 72.',
    },
    avgSeconds: 52,
  },
  {
    id: 'q-re-001',
    section: 'reasoning',
    text: {
      en: 'Find the odd one out: 8, 27, 64, 100, 125',
      te: 'క్రింది వాటిలో సరిపోని దానిని గుర్తించండి: 8, 27, 64, 100, 125',
    },
    options: { en: ['27', '64', '100', '125'], te: ['27', '64', '100', '125'] },
    correct: 2,
    explanation: {
      en: 'Of the numbers given, 8, 27, 64 and 125 are all perfect cubes (2³, 3³, 4³, 5³). 100 is a perfect square (10²), not a cube — so 100 is the odd one.',
      te: 'ఇచ్చిన వాటిలో 8, 27, 64, 125 అన్నీ ఘనాలు (2³, 3³, 4³, 5³). 100 మాత్రం ఒక వర్గం (10²) — ఘనం కాదు. కాబట్టి 100 సరిపోదు.',
    },
    avgSeconds: 48,
  },
  {
    id: 'q-ar-002',
    section: 'arithmetic',
    text: {
      en: 'An article sold at a 15% profit fetches ₹460. What was its cost price?',
      te: 'ఒక వస్తువును 15% లాభంతో అమ్మితే ₹460 వస్తుంది. ఆ వస్తువు కొన్న ధర ఎంత?',
    },
    options: { en: ['₹380', '₹400', '₹410', '₹425'], te: ['₹380', '₹400', '₹410', '₹425'] },
    correct: 1,
    explanation: {
      en: 'Selling price = 115% of cost. Cost = 460 ÷ 1.15 = ₹400.',
      te: 'అమ్మకపు ధర = కొన్న ధరలో 115%. కొన్న ధర = 460 ÷ 1.15 = ₹400.',
    },
    avgSeconds: 44,
  },
  {
    id: 'q-re-002',
    section: 'reasoning',
    text: {
      en: 'In a code language POLICE is written as QPMJDF. How is GUARD written in the same language?',
      te: 'ఒక సంకేత భాషలో POLICE అనే పదాన్ని QPMJDF అని రాస్తే, అదే భాషలో GUARD అనే పదాన్ని ఎలా రాస్తారు?',
    },
    options: { en: ['HVBSE', 'HVBRE', 'HUBSE', 'GVBSE'], te: ['HVBSE', 'HVBRE', 'HUBSE', 'GVBSE'] },
    correct: 0,
    explanation: {
      en: 'Each letter moves one step forward in the alphabet: P→Q, O→P, L→M, I→J, C→D, E→F. Applying the same rule, GUARD becomes HVBSE.',
      te: 'ప్రతి అక్షరాన్ని ఇంగ్లిష్ వర్ణమాలలో ఒక స్థానం ముందుకు జరపాలి: P→Q, O→P, L→M, I→J, C→D, E→F. అదే నియమంతో GUARD → HVBSE.',
    },
    avgSeconds: 55,
  },
  {
    id: 'q-gs-001',
    section: 'gs',
    text: {
      en: 'Which river is known as the Dakshina Ganga?',
      te: 'దక్షిణ గంగా అని పిలువబడే నది ఏది?',
    },
    options: { en: ['Krishna', 'Godavari', 'Tungabhadra', 'Manjeera'], te: ['కృష్ణా', 'గోదావరి', 'తుంగభద్ర', 'మంజీరా'] },
    correct: 1,
    explanation: {
      en: 'The Godavari is called the Dakshina Ganga. It is the largest river flowing through Telangana.',
      te: 'గోదావరి నదిని దక్షిణ గంగా అని పిలుస్తారు. ఇది తెలంగాణ గుండా ప్రవహించే అతిపెద్ద నది.',
    },
    avgSeconds: 34,
  },
  {
    id: 'q-te-001',
    section: 'telangana',
    text: {
      en: 'Telangana was formed as the 29th state of India on which date?',
      te: 'తెలంగాణ భారతదేశంలో 29వ రాష్ట్రంగా ఏ తేదీన ఏర్పడింది?',
    },
    options: { en: ['1 June 2014', '2 June 2014', '15 August 2014', '26 January 2015'], te: ['1 జూన్ 2014', '2 జూన్ 2014', '15 ఆగస్టు 2014', '26 జనవరి 2015'] },
    correct: 1,
    explanation: {
      en: 'Telangana came into existence on 2 June 2014 under the Andhra Pradesh Reorganisation Act, 2014.',
      te: 'ఆంధ్రప్రదేశ్ పునర్విభజన చట్టం, 2014 ప్రకారం తెలంగాణ 2 జూన్ 2014న ఏర్పడింది.',
    },
    avgSeconds: 22,
  },
];

/** Repeat the seed bank to fill a pattern of N questions per section, keeping section order. */
export function buildPaper(sectionSizes: { id: SectionId; questions: number }[]): Question[] {
  const paper: Question[] = [];
  for (const s of sectionSizes) {
    const pool = QUESTIONS.filter((q) => q.section === s.id);
    const fallback = QUESTIONS;
    for (let i = 0; i < s.questions; i++) {
      const src = (pool.length ? pool : fallback)[i % (pool.length ? pool.length : fallback.length)];
      paper.push({ ...src, id: `${src.id}#${paper.length + 1}`, section: s.id });
    }
  }
  return paper;
}
