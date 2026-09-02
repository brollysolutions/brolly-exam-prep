/** Sample result matching the prototype's Result & analysis screen. */
export const SAMPLE_RESULT = {
  id: 'res-mock-07',
  testTitleN: 7,
  score: 62.25,
  maxScore: 100,
  cutoffPct: 40,
  qualified: true,
  rank: 1284,
  totalCandidates: 9033,
  accuracyPct: 71,
  avgSecondsPerQuestion: 54,
  negativeMarks: -6.75,
  wrong: 27,
  skipped: 6,
  /** "Do these three next" — sectional drills */
  actions: [
    { id: 'drill-seating', title: { en: 'Seating arrangement — 20-question sectional', te: 'సీటింగ్ అరేంజ్‌మెంట్ — 20 ప్రశ్నల సెక్షనల్', ur: 'سیٹنگ آرینجمنٹ — 20 سوالات کا سیکشنل' }, sub: { en: 'Your weakest topic · 18 minutes', te: 'మీ బలహీనమైన టాపిక్ · 18 నిమిషాలు', ur: 'آپ کا کمزور موضوع · 18 منٹ' } },
    { id: 'drill-blood', title: { en: 'Blood relations — 15 questions', te: 'బ్లడ్ రిలేషన్స్ — 15 ప్రశ్నలు', ur: 'بلڈ ریلیشنز — 15 سوالات' }, sub: { en: '12 minutes · 3 wrong yesterday', te: '12 నిమిషాలు · నిన్న 3 తప్పులు', ur: '12 منٹ · کل 3 غلط' } },
    { id: 'drill-timed', title: { en: 'Timed reasoning — 20 questions in 18 minutes', te: 'టైమ్డ్ రీజనింగ్ — 18 నిమిషాల్లో 20 ప్రశ్నలు', ur: 'ٹائمڈ ریزننگ — 18 منٹ میں 20 سوالات' }, sub: { en: 'To build speed', te: 'వేగం పెంచడానికి', ur: 'رفتار بڑھانے کے لیے' } },
  ],
  /** Per-question review rows: questionIndex into the paper, chosen option, seconds spent */
  review: [
    { questionNo: 6, your: 1 as const, correct: 2 as const, seconds: 82 },
    { questionNo: 12, your: 2 as const, correct: 0 as const, seconds: 124 },
    { questionNo: 3, your: 1 as const, correct: 2 as const, seconds: 107 },
    { questionNo: 15, your: 1 as const, correct: 1 as const, seconds: 19 },
  ],
} as const;

/** Localised "what cost you marks" rows (prototype COST). */
export const COST_ROWS = {
  en: [
    ['Reasoning accuracy', '54%', '78% in every other section'],
    ['Time per puzzle set', '92s', 'Average is 41s'],
    ['Negative marks', '−6.75', 'From 27 wrong answers'],
  ],
  te: [
    ['రీజనింగ్ కచ్చితత్వం', '54%', 'మిగతా విభాగాల్లో 78%'],
    ['పజిల్ సెట్‌కు సమయం', '92 సె', 'సగటు 41 సె'],
    ['నెగటివ్ మార్కులు', '−6.75', '27 తప్పు జవాబుల వల్ల'],
  ],
  ur: [
    ['ریزننگ درستگی', '54%', 'باقی سیکشنز میں 78%'],
    ['فی پزل سیٹ وقت', '92 سیکنڈ', 'اوسط 41 سیکنڈ'],
    ['منفی نمبر', '−6.75', '27 غلط جوابات سے'],
  ],
} as const;
