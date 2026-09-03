import type { SectionId } from './exam-pattern';
import type { Localized } from './questions';

/**
 * F-21 — study material.
 *
 * Short, exam-register notes for the PWT syllabus: one screen of reading per topic, ending in
 * a single worked example and a single tip. Everything is localised, because a candidate who
 * sits the paper in Telugu has to revise in Telugu.
 *
 * Content sources (checked 2026-09-03): TSLPRB PWT syllabus, NCERT polity, the Telangana State
 * Portal (statehood dates, district reorganisation). Facts kept to the ones that do not move:
 * dates, articles, river names, the shape of the police hierarchy.
 */

export type StudyBlockKind = 'heading' | 'para' | 'bullets' | 'formula' | 'example' | 'tip';

/**
 * One paragraph-sized unit of a topic.
 *
 * `bullets` is the one kind that carries a list instead of a sentence, so it is its own arm of
 * the union and the reader switches on `kind` rather than guessing which field is populated.
 */
export type StudyBlock =
  | { kind: Exclude<StudyBlockKind, 'bullets'>; text: Localized }
  | { kind: 'bullets'; items: Localized[] };

export type StudyTopic = {
  id: string;
  section: SectionId;
  title: Localized;
  /** Reading time in minutes, shown on the list row and above the first block. */
  minutes: number;
  blocks: StudyBlock[];
};

export type StudySection = {
  id: SectionId;
  /** i18n key under `test.sections.*` — the same label the paper and the palette use. */
  labelKey: string;
  topics: StudyTopic[];
};

/**
 * Formulas are written in Latin notation in all three languages on purpose.
 *
 * A formula renders through `<Num>` — Latin face, tabular figures, LTR-isolated — so that
 * `18/5` never re-orders inside an Urdu line and the digits line up column-wise. Telugu or
 * Nastaliq words inside that face would fall back to a different font mid-line, and every
 * Telugu- and Urdu-medium exam guide prints these expressions in Latin notation anyway.
 * The prose around the formula carries the meaning; the box carries the arithmetic.
 */

const ARITHMETIC: StudyTopic[] = [
  {
    id: 'st-ar-percentages',
    section: 'arithmetic',
    title: {
      en: 'Percentages',
      te: 'శాతాలు',
      ur: 'فیصد',
    },
    minutes: 8,
    blocks: [
      {
        kind: 'heading',
        text: {
          en: 'What a percentage really is',
          te: 'శాతం అంటే ఏమిటి',
          ur: 'فیصد کیا ہے',
        },
      },
      {
        kind: 'para',
        text: {
          en: 'A percentage is nothing but a fraction whose denominator is 100. When a question says 40%, it is saying 40 out of every 100 — so 40% of 250 is 250 × 40 ÷ 100 = 100.',
          te: 'శాతం అంటే హారం 100 ఉన్న భిన్నం మాత్రమే. ప్రశ్నలో 40% అని ఉంటే, ప్రతి 100కి 40 అని అర్థం — కాబట్టి 250లో 40% అంటే 250 × 40 ÷ 100 = 100.',
          ur: 'فیصد دراصل ایک ایسا کسر ہے جس کا مخرج 100 ہوتا ہے۔ اگر سوال میں ⁦40%⁩ لکھا ہو تو مطلب ہے ہر 100 میں سے 40 — یعنی 250 کا ⁦40%⁩ برابر ہے ⁦250 × 40 ÷ 100 = 100⁩۔',
        },
      },
      {
        kind: 'para',
        text: {
          en: 'Percentages are worth fixing first because they do not stay in their own questions. Profit and loss, simple and compound interest, discount and data interpretation are all percentage questions wearing a different name.',
          te: 'శాతాలను ముందుగా పట్టుకోవడం అవసరం, ఎందుకంటే అవి తమ ప్రశ్నలకే పరిమితం కావు. లాభనష్టాలు, బారువడ్డీ–చక్రవడ్డీ, డిస్కౌంట్, డేటా ఇంటర్‌ప్రిటేషన్ — ఇవన్నీ వేరే పేరుతో వచ్చే శాతం ప్రశ్నలే.',
          ur: 'فیصد کو سب سے پہلے مضبوط کرنا ضروری ہے کیونکہ یہ صرف اپنے سوالوں تک محدود نہیں رہتا۔ نفع و نقصان، سادہ اور مرکب سود، رعایت اور ڈیٹا انٹرپریٹیشن — یہ سب دراصل مختلف نام کے فیصد ہی کے سوال ہیں۔',
        },
      },
      {
        kind: 'para',
        text: {
          en: 'In an increase or a decrease, always keep the base straight: the change is measured on the original value, never on the new one. A price that rises from 200 to 250 has risen by 25%, not by 20%.',
          te: 'పెరుగుదల లేదా తగ్గుదలలో ఆధారాన్ని స్పష్టంగా ఉంచుకోవాలి: మార్పును ఎప్పుడూ పాత విలువపైనే లెక్కిస్తారు, కొత్త విలువపై కాదు. 200 నుండి 250కి పెరిగిన ధర 25% పెరిగింది, 20% కాదు.',
          ur: 'اضافے یا کمی میں بنیاد ہمیشہ واضح رکھیں: تبدیلی ہمیشہ پرانی قیمت پر ناپی جاتی ہے، نئی پر نہیں۔ جو قیمت 200 سے بڑھ کر 250 ہوئی، وہ ⁦25%⁩ بڑھی ہے، ⁦20%⁩ نہیں۔',
        },
      },
      {
        kind: 'bullets',
        items: [
          {
            en: 'Learn the fraction forms by heart: 50% = 1/2, 25% = 1/4, 20% = 1/5, 12.5% = 1/8, 16⅔% = 1/6, 33⅓% = 1/3.',
            te: 'భిన్న రూపాలను కంఠస్థం చేయండి: 50% = 1/2, 25% = 1/4, 20% = 1/5, 12.5% = 1/8, 16⅔% = 1/6, 33⅓% = 1/3.',
            ur: 'کسری شکلیں یاد کر لیں: ⁦50% = 1/2⁩، ⁦25% = 1/4⁩، ⁦20% = 1/5⁩، ⁦12.5% = 1/8⁩، ⁦16⅔% = 1/6⁩، ⁦33⅓% = 1/3⁩۔',
          },
          {
            en: 'The word "of" means multiply: 30% of 60 is 60 × 3/10 = 18.',
            te: '"యొక్క" అంటే గుణించడం: 60లో 30% అంటే 60 × 3/10 = 18.',
            ur: '"کا" کا مطلب ضرب ہے: 60 کا ⁦30%⁩ یعنی ⁦60 × 3/10 = 18⁩۔',
          },
          {
            en: 'Two changes one after the other do not add. A 10% rise followed by a 10% fall leaves you 1% below where you started.',
            te: 'వరుసగా వచ్చే రెండు మార్పులు కలవవు. 10% పెరిగి తర్వాత 10% తగ్గితే, మొదటి విలువ కంటే 1% తక్కువగా మిగులుతుంది.',
            ur: 'یکے بعد دیگرے دو تبدیلیاں جمع نہیں ہوتیں۔ ⁦10%⁩ اضافہ اور پھر ⁦10%⁩ کمی کے بعد آپ ابتدائی قیمت سے ⁦1%⁩ نیچے رہ جاتے ہیں۔',
          },
          {
            en: 'If A is 25% more than B, then B is 20% less than A — the two percentages are never the same.',
            te: 'A అనేది B కంటే 25% ఎక్కువ అయితే, B అనేది A కంటే 20% తక్కువ — ఈ రెండు శాతాలు ఎప్పుడూ సమానం కావు.',
            ur: 'اگر A، B سے ⁦25%⁩ زیادہ ہے تو B، A سے ⁦20%⁩ کم ہے — یہ دونوں فیصد کبھی برابر نہیں ہوتے۔',
          },
        ],
      },
      {
        kind: 'formula',
        text: {
          en: 'Percentage change = (New − Old) ÷ Old × 100\nSuccessive change = a + b + (a × b) ÷ 100',
          te: 'శాతం మార్పు = (కొత్త − పాత) ÷ పాత × 100\nవరుస మార్పు = a + b + (a × b) ÷ 100',
          ur: 'فیصد تبدیلی = (نیا − پرانا) ÷ پرانا × 100\nیکے بعد دیگرے تبدیلی = ⁦a + b + (a × b) ÷ 100⁩',
        },
      },
      {
        kind: 'example',
        text: {
          en: 'A candidate scores 156 marks out of 200. What percentage is that? Percentage = 156 ÷ 200 × 100. Cancel first: 156 ÷ 2 = 78, so the answer is 78%. Notice that dividing by 200 and multiplying by 100 is only a halving — never reach for the full multiplication.',
          te: 'ఒక అభ్యర్థి 200 మార్కులకు 156 సాధించాడు. అది ఎంత శాతం? శాతం = 156 ÷ 200 × 100. ముందు కుదించండి: 156 ÷ 2 = 78, కాబట్టి జవాబు 78%. 200తో భాగించి 100తో గుణించడం అంటే సగం చేయడమే — పూర్తి గుణకారానికి వెళ్లవద్దు.',
          ur: 'ایک امیدوار نے 200 میں سے 156 نمبر حاصل کیے۔ یہ کتنے فیصد ہوئے؟ فیصد = ⁦156 ÷ 200 × 100⁩۔ پہلے تخفیف کریں: ⁦156 ÷ 2 = 78⁩، چنانچہ جواب ⁦78%⁩ ہے۔ دھیان رہے کہ 200 سے تقسیم اور 100 سے ضرب کا مطلب صرف آدھا کرنا ہے — پوری ضرب کی ضرورت نہیں۔',
        },
      },
      {
        kind: 'tip',
        text: {
          en: 'Convert the percentage to a fraction before you multiply. In a 180-minute paper the seconds you save on 12.5% = 1/8 are the seconds you spend on the Telangana section.',
          te: 'గుణించే ముందు శాతాన్ని భిన్నంగా మార్చండి. 180 నిమిషాల పేపర్‌లో 12.5% = 1/8 వద్ద ఆదా చేసిన సెకన్లే తెలంగాణ విభాగానికి ఉపయోగపడతాయి.',
          ur: 'ضرب سے پہلے فیصد کو کسر میں بدل لیں۔ 180 منٹ کے پرچے میں ⁦12.5% = 1/8⁩ پر بچائے گئے سیکنڈ ہی تلنگانہ کے حصے میں کام آتے ہیں۔',
        },
      },
    ],
  },
  {
    id: 'st-ar-speed',
    section: 'arithmetic',
    title: {
      en: 'Time, speed and distance',
      te: 'కాలం, వేగం, దూరం',
      ur: 'وقت، رفتار اور فاصلہ',
    },
    minutes: 10,
    blocks: [
      {
        kind: 'heading',
        text: {
          en: 'One relation, three questions',
          te: 'ఒకే సంబంధం, మూడు ప్రశ్నలు',
          ur: 'ایک تعلق، تین سوال',
        },
      },
      {
        kind: 'para',
        text: {
          en: 'Distance, speed and time are one relation read three ways. Fix any two and the third is decided. Almost every question in this topic is that relation plus one unit conversion.',
          te: 'దూరం, వేగం, కాలం — ఇవి ఒకే సంబంధాన్ని మూడు విధాలుగా చదవడమే. వీటిలో ఏవైనా రెండు తెలిస్తే మూడోది నిర్ణయమవుతుంది. ఈ అంశంలో దాదాపు ప్రతి ప్రశ్నా ఆ సంబంధం, దానికి ఒక యూనిట్ మార్పు అంతే.',
          ur: 'فاصلہ، رفتار اور وقت ایک ہی تعلق کو تین طرح پڑھنے کے نام ہیں۔ کوئی سی دو معلوم ہوں تو تیسری خود طے ہو جاتی ہے۔ اس موضوع کا تقریباً ہر سوال یہی تعلق اور ایک اکائی کی تبدیلی ہوتا ہے۔',
        },
      },
      {
        kind: 'para',
        text: {
          en: 'The conversion between km/h and m/s decides more marks here than the algebra does. Multiply by 5/18 to go from km/h to m/s, and by 18/5 to come back.',
          te: 'ఇక్కడ బీజగణితం కంటే కి.మీ/గం మరియు మీ/సె మధ్య మార్పిడే ఎక్కువ మార్కులు నిర్ణయిస్తుంది. కి.మీ/గం నుండి మీ/సెకి 5/18తో గుణించండి, తిరిగి రావడానికి 18/5తో గుణించండి.',
          ur: 'یہاں الجبرا سے زیادہ نمبر کلومیٹر/گھنٹہ اور میٹر/سیکنڈ کے درمیان تبدیلی طے کرتی ہے۔ کلومیٹر/گھنٹہ سے میٹر/سیکنڈ کے لیے ⁦5/18⁩ سے ضرب دیں اور واپسی کے لیے ⁦18/5⁩ سے۔',
        },
      },
      {
        kind: 'para',
        text: {
          en: 'For trains, the distance is the length that has to pass the object. Crossing a pole means the train covers its own length; crossing a platform means its own length plus the platform.',
          te: 'రైళ్ల విషయంలో, వస్తువును దాటడానికి ప్రయాణించాల్సిన పొడవే దూరం. స్తంభాన్ని దాటడమంటే రైలు తన సొంత పొడవును ప్రయాణించడం; ప్లాట్‌ఫారం దాటడమంటే తన పొడవుతో పాటు ప్లాట్‌ఫారం పొడవు కూడా.',
          ur: 'ریل گاڑی کے سوالوں میں فاصلہ وہ لمبائی ہے جو شے کے سامنے سے گزرنی ہے۔ کھمبا عبور کرنے کا مطلب گاڑی اپنی ہی لمبائی طے کرے؛ پلیٹ فارم عبور کرنے کا مطلب اپنی لمبائی کے ساتھ پلیٹ فارم کی لمبائی بھی۔',
        },
      },
      {
        kind: 'bullets',
        items: [
          {
            en: 'Two bodies moving in opposite directions: add the speeds. Same direction: subtract them.',
            te: 'రెండు వస్తువులు వ్యతిరేక దిశలో కదిలితే వేగాలను కూడాలి. ఒకే దిశలో అయితే తీసివేయాలి.',
            ur: 'دو اجسام مخالف سمت میں چل رہے ہوں تو رفتاریں جمع کریں۔ ایک ہی سمت میں ہوں تو تفریق کریں۔',
          },
          {
            en: 'Same distance at two speeds: the average speed is 2ab ÷ (a + b), never (a + b) ÷ 2.',
            te: 'ఒకే దూరాన్ని రెండు వేగాలతో ప్రయాణిస్తే సగటు వేగం 2ab ÷ (a + b), ఎప్పుడూ (a + b) ÷ 2 కాదు.',
            ur: 'ایک ہی فاصلہ دو رفتاروں سے طے ہو تو اوسط رفتار ⁦2ab ÷ (a + b)⁩ ہوتی ہے، ⁦(a + b) ÷ 2⁩ ہرگز نہیں۔',
          },
          {
            en: 'Downstream speed = boat + stream; upstream speed = boat − stream.',
            te: 'ప్రవాహ దిశలో వేగం = పడవ + ప్రవాహం; ప్రవాహానికి ఎదురుగా వేగం = పడవ − ప్రవాహం.',
            ur: 'بہاؤ کے ساتھ رفتار = کشتی + دھارا؛ بہاؤ کے خلاف رفتار = کشتی − دھارا۔',
          },
          {
            en: 'If speed and time are inversely related, a 25% faster speed cuts the time by 20%.',
            te: 'వేగం, కాలం విలోమానుపాతంలో ఉంటాయి కాబట్టి 25% ఎక్కువ వేగం కాలాన్ని 20% తగ్గిస్తుంది.',
            ur: 'رفتار اور وقت معکوس تناسب میں ہیں، اس لیے ⁦25%⁩ زیادہ رفتار وقت میں ⁦20%⁩ کمی کرتی ہے۔',
          },
        ],
      },
      {
        kind: 'formula',
        text: {
          en: 'Speed = Distance ÷ Time\nkm/h → m/s: × 5/18      m/s → km/h: × 18/5',
          te: 'వేగం = దూరం ÷ సమయం\nకి.మీ/గం → మీ/సె: × 5/18      మీ/సె → కి.మీ/గం: × 18/5',
          ur: 'رفتار = فاصلہ ÷ وقت\nکلومیٹر/گھنٹہ → میٹر/سیکنڈ: ⁦× 5/18⁩      میٹر/سیکنڈ → کلومیٹر/گھنٹہ: ⁦× 18/5⁩',
        },
      },
      {
        kind: 'example',
        text: {
          en: 'A train 180 metres long crosses a pole in 9 seconds. To cross a pole it travels its own length, so speed = 180 ÷ 9 = 20 m/s. Convert with 18/5: 20 × 18 ÷ 5 = 72 km/h.',
          te: '180 మీటర్ల పొడవున్న రైలు ఒక స్తంభాన్ని 9 సెకన్లలో దాటుతుంది. స్తంభాన్ని దాటాలంటే అది తన సొంత పొడవునే ప్రయాణిస్తుంది, కాబట్టి వేగం = 180 ÷ 9 = 20 మీ/సె. 18/5తో మార్చండి: 20 × 18 ÷ 5 = 72 కి.మీ/గం.',
          ur: '180 میٹر لمبی ریل گاڑی ایک کھمبے کو 9 سیکنڈ میں عبور کرتی ہے۔ کھمبا عبور کرنے کے لیے وہ اپنی ہی لمبائی طے کرتی ہے، لہٰذا رفتار = ⁦180 ÷ 9 = 20⁩ میٹر/سیکنڈ۔ ⁦18/5⁩ سے تبدیل کریں: ⁦20 × 18 ÷ 5 = 72⁩ کلومیٹر/گھنٹہ۔',
        },
      },
      {
        kind: 'tip',
        text: {
          en: 'Write the unit next to every number you copy down. Half the wrong answers in this topic are right arithmetic on a metre that should have been a kilometre.',
          te: 'మీరు రాసుకునే ప్రతి సంఖ్య పక్కన యూనిట్ రాయండి. ఈ అంశంలో సగం తప్పు జవాబులు, కిలోమీటరు ఉండాల్సిన చోట మీటరు పెట్టి చేసిన సరైన లెక్కలే.',
          ur: 'جو عدد بھی لکھیں، اس کے ساتھ اکائی ضرور لکھیں۔ اس موضوع کے آدھے غلط جواب دراصل درست حساب ہوتے ہیں جو کلومیٹر کی جگہ میٹر پر کیے گئے۔',
        },
      },
    ],
  },
  {
    id: 'st-ar-profit',
    section: 'arithmetic',
    title: {
      en: 'Profit and loss',
      te: 'లాభం, నష్టం',
      ur: 'نفع اور نقصان',
    },
    minutes: 8,
    blocks: [
      {
        kind: 'heading',
        text: {
          en: 'Everything is measured on cost price',
          te: 'అంతా కొన్న ధరపైనే లెక్క',
          ur: 'ہر چیز لاگت پر ناپی جاتی ہے',
        },
      },
      {
        kind: 'para',
        text: {
          en: 'Cost price (CP) is what the seller paid, selling price (SP) is what the buyer paid. Profit and loss percentages are always measured on the cost price unless a question says otherwise.',
          te: 'కొన్న ధర (కొ.ధ) అంటే అమ్మేవాడు చెల్లించినది, అమ్మిన ధర (అ.ధ) అంటే కొనేవాడు చెల్లించినది. ప్రశ్నలో వేరేగా చెప్పకపోతే లాభ, నష్ట శాతాలను ఎప్పుడూ కొన్న ధరపైనే లెక్కిస్తారు.',
          ur: 'لاگت قیمت (ل.ق) وہ ہے جو بیچنے والے نے ادا کی، اور فروخت قیمت (ف.ق) وہ جو خریدار نے ادا کی۔ جب تک سوال میں کچھ اور نہ کہا جائے، نفع اور نقصان کا فیصد ہمیشہ لاگت پر ناپا جاتا ہے۔',
        },
      },
      {
        kind: 'para',
        text: {
          en: 'Discount is the one exception. A discount is always measured on the marked price (MP), not on the cost price, which is why a shop can offer 20% off and still make a profit.',
          te: 'డిస్కౌంట్ ఒక్కటే మినహాయింపు. డిస్కౌంట్‌ను ఎప్పుడూ ముద్రిత ధర (ము.ధ)పైనే లెక్కిస్తారు, కొన్న ధరపై కాదు. అందుకే దుకాణం 20% తగ్గించినా లాభం పొందగలుగుతుంది.',
          ur: 'رعایت اس کا واحد استثنا ہے۔ رعایت ہمیشہ لکھی ہوئی قیمت (م.ق) پر ناپی جاتی ہے، لاگت پر نہیں — اسی لیے دکاندار ⁦20%⁩ رعایت دے کر بھی نفع کما لیتا ہے۔',
        },
      },
      {
        kind: 'para',
        text: {
          en: 'When two articles are sold at the same price, one at x% profit and the other at x% loss, the seller always loses. The loss is x² ÷ 100 per cent, whatever the price was.',
          te: 'రెండు వస్తువులను ఒకే ధరకు అమ్మి, ఒకదానిపై x% లాభం, మరొకదానిపై x% నష్టం వస్తే అమ్మేవాడికి ఎప్పుడూ నష్టమే. ధర ఎంతైనా, ఆ నష్టం x² ÷ 100 శాతం.',
          ur: 'اگر دو چیزیں ایک ہی قیمت پر بیچی جائیں، ایک پر ⁦x%⁩ نفع اور دوسری پر ⁦x%⁩ نقصان، تو بیچنے والے کو ہمیشہ نقصان ہوتا ہے۔ قیمت کچھ بھی ہو، یہ نقصان ⁦x² ÷ 100⁩ فیصد ہوتا ہے۔',
        },
      },
      {
        kind: 'bullets',
        items: [
          {
            en: 'SP greater than CP is profit; SP less than CP is loss. Compare before you compute.',
            te: 'అ.ధ అనేది కొ.ధ కంటే ఎక్కువైతే లాభం; తక్కువైతే నష్టం. లెక్క వేసే ముందు పోల్చండి.',
            ur: 'ف.ق، ل.ق سے زیادہ ہو تو نفع؛ کم ہو تو نقصان۔ حساب سے پہلے موازنہ کریں۔',
          },
          {
            en: 'A 25% profit means CP : SP = 4 : 5. Ratios are faster than decimals here.',
            te: '25% లాభం అంటే కొ.ధ : అ.ధ = 4 : 5. ఇక్కడ దశాంశాల కంటే నిష్పత్తులే వేగవంతం.',
            ur: '⁦25%⁩ نفع کا مطلب ل.ق : ف.ق = ⁦4 : 5⁩ ہے۔ یہاں اعشاریہ سے تناسب زیادہ تیز ہے۔',
          },
          {
            en: 'Two successive discounts of a% and b% are not a + b; they come to a + b − (a × b) ÷ 100.',
            te: 'a% మరియు b% వరుస డిస్కౌంట్లు a + b కావు; అవి a + b − (a × b) ÷ 100 అవుతాయి.',
            ur: '⁦a%⁩ اور ⁦b%⁩ کی دو یکے بعد دیگرے رعایتیں ⁦a + b⁩ نہیں بنتیں؛ یہ ⁦a + b − (a × b) ÷ 100⁩ ہوتی ہیں۔',
          },
          {
            en: 'False weights: selling 1000 g worth of goods on a 900 g weight is a gain of 100 ÷ 900 × 100 = 11⅑%.',
            te: 'తప్పుడు తూకాలు: 900 గ్రాముల తూకంతో 1000 గ్రాముల సరుకు అమ్మితే లాభం 100 ÷ 900 × 100 = 11⅑%.',
            ur: 'غلط باٹ: 900 گرام کے باٹ سے 1000 گرام کا سودا بیچنے پر نفع ⁦100 ÷ 900 × 100 = 11⅑%⁩ ہوتا ہے۔',
          },
        ],
      },
      {
        kind: 'formula',
        text: {
          en: 'Profit % = (SP − CP) ÷ CP × 100\nSP = CP × (100 + Profit %) ÷ 100',
          te: 'లాభం % = (అ.ధ − కొ.ధ) ÷ కొ.ధ × 100\nఅ.ధ = కొ.ధ × (100 + లాభం %) ÷ 100',
          ur: 'نفع % = (ف.ق − ل.ق) ÷ ل.ق × 100\nف.ق = ل.ق × (100 + نفع %) ÷ 100',
        },
      },
      {
        kind: 'example',
        text: {
          en: 'An article sold at a 15% profit fetches ₹460. What did it cost? The selling price is 115% of the cost, so CP = 460 × 100 ÷ 115 = ₹400. Check it back: 15% of 400 is 60, and 400 + 60 = 460.',
          te: 'ఒక వస్తువును 15% లాభంతో అమ్మితే ₹460 వచ్చింది. దాని కొన్న ధర ఎంత? అమ్మిన ధర కొన్న ధరలో 115%, కాబట్టి కొ.ధ = 460 × 100 ÷ 115 = ₹400. సరిచూసుకోండి: 400లో 15% అంటే 60, మరి 400 + 60 = 460.',
          ur: 'ایک چیز ⁦15%⁩ نفع پر ₹460 میں فروخت ہوئی۔ اس کی لاگت کیا تھی؟ فروخت قیمت لاگت کا ⁦115%⁩ ہے، لہٰذا ل.ق = ⁦460 × 100 ÷ 115 = ₹400⁩۔ جانچ لیں: 400 کا ⁦15%⁩ یعنی 60، اور ⁦400 + 60 = 460⁩۔',
        },
      },
      {
        kind: 'tip',
        text: {
          en: 'Take the cost price as 100 whenever the question does not give it. Every percentage in the question then becomes a rupee figure you can read straight off.',
          te: 'ప్రశ్నలో కొన్న ధర ఇవ్వకపోతే దాన్ని 100గా తీసుకోండి. అప్పుడు ప్రశ్నలోని ప్రతి శాతం నేరుగా చదవగలిగే రూపాయి విలువ అవుతుంది.',
          ur: 'اگر سوال میں لاگت نہ دی ہو تو اسے 100 فرض کر لیں۔ پھر سوال کا ہر فیصد سیدھا روپے کی رقم بن جاتا ہے۔',
        },
      },
    ],
  },
];

const REASONING: StudyTopic[] = [
  {
    id: 'st-re-coding',
    section: 'reasoning',
    title: {
      en: 'Coding and decoding',
      te: 'కోడింగ్ – డీకోడింగ్',
      ur: 'کوڈنگ اور ڈی کوڈنگ',
    },
    minutes: 7,
    blocks: [
      {
        kind: 'heading',
        text: {
          en: 'Find the rule, then apply it',
          te: 'ముందు నియమాన్ని కనుక్కోండి, తర్వాత వర్తింపజేయండి',
          ur: 'پہلے اصول تلاش کریں، پھر لاگو کریں',
        },
      },
      {
        kind: 'para',
        text: {
          en: 'A coding question hides one rule and asks you to apply it to a new word. The rule is almost always a shift in letter position, a reversal, or a swap of letters within the word.',
          te: 'కోడింగ్ ప్రశ్న ఒక నియమాన్ని దాచి, దాన్ని కొత్త పదానికి వర్తింపజేయమని అడుగుతుంది. ఆ నియమం దాదాపు ఎప్పుడూ అక్షర స్థానంలో మార్పు, తిరగబడటం, లేదా పదంలోని అక్షరాల స్థానమార్పిడి అయి ఉంటుంది.',
          ur: 'کوڈنگ کا سوال ایک اصول چھپاتا ہے اور آپ سے کہتا ہے کہ اسے نئے لفظ پر لاگو کریں۔ یہ اصول تقریباً ہمیشہ حرف کی جگہ میں تبدیلی، الٹ پھیر، یا لفظ کے اندر حروف کا تبادلہ ہوتا ہے۔',
        },
      },
      {
        kind: 'para',
        text: {
          en: 'Everything rests on knowing the position of each letter. Write A to Z with 1 to 26 under it on the rough sheet in the first minute of the paper and you will never count on your fingers again.',
          te: 'ఇదంతా ప్రతి అక్షర స్థానం తెలియడంపైనే ఆధారపడి ఉంటుంది. పేపర్ మొదటి నిమిషంలోనే రఫ్ షీట్‌పై A నుండి Z వరకు, కింద 1 నుండి 26 వరకు రాసుకుంటే మళ్లీ వేళ్లపై లెక్కపెట్టాల్సిన అవసరం ఉండదు.',
          ur: 'سب کچھ ہر حرف کی جگہ جاننے پر منحصر ہے۔ پرچے کے پہلے منٹ میں رف شیٹ پر A سے Z اور نیچے 1 سے 26 لکھ لیں، پھر انگلیوں پر گننے کی نوبت نہیں آئے گی۔',
        },
      },
      {
        kind: 'para',
        text: {
          en: 'Check your rule against every letter of the given pair before you use it. A rule that explains three letters out of four is the wrong rule.',
          te: 'నియమాన్ని ఉపయోగించే ముందు ఇచ్చిన జతలోని ప్రతి అక్షరంపై దాన్ని సరిచూడండి. నాలుగులో మూడు అక్షరాలను మాత్రమే వివరించే నియమం తప్పు నియమం.',
          ur: 'اصول استعمال کرنے سے پہلے دیے گئے جوڑے کے ہر حرف پر اسے جانچ لیں۔ جو اصول چار میں سے تین حروف کی وضاحت کرے، وہ غلط اصول ہے۔',
        },
      },
      {
        kind: 'bullets',
        items: [
          {
            en: 'Forward shift: each letter moves ahead by a fixed number. CAT → DBU is a shift of +1.',
            te: 'ముందుకు మార్పు: ప్రతి అక్షరం స్థిర సంఖ్యలో ముందుకు కదులుతుంది. CAT → DBU అంటే +1 మార్పు.',
            ur: 'آگے کی تبدیلی: ہر حرف ایک مقررہ عدد آگے بڑھتا ہے۔ ⁦CAT → DBU⁩ یعنی ⁦+1⁩ کی تبدیلی۔',
          },
          {
            en: 'Opposite letter: A ↔ Z, B ↔ Y, C ↔ X. The two positions always add up to 27.',
            te: 'వ్యతిరేక అక్షరం: A ↔ Z, B ↔ Y, C ↔ X. ఆ రెండు స్థానాల మొత్తం ఎప్పుడూ 27.',
            ur: 'مخالف حرف: ⁦A ↔ Z⁩، ⁦B ↔ Y⁩، ⁦C ↔ X⁩۔ دونوں جگہوں کا مجموعہ ہمیشہ 27 ہوتا ہے۔',
          },
          {
            en: 'Number coding: the code may be the sum of the letter positions, or the position multiplied by a constant.',
            te: 'సంఖ్యా కోడింగ్: కోడ్ అనేది అక్షర స్థానాల మొత్తం కావచ్చు, లేదా స్థానాన్ని ఒక స్థిరాంకంతో గుణించినది కావచ్చు.',
            ur: 'عددی کوڈنگ: کوڈ حروف کی جگہوں کا مجموعہ ہو سکتا ہے، یا جگہ کو کسی مستقل عدد سے ضرب دیا گیا ہو۔',
          },
          {
            en: 'Substitution coding ("if sky is called sea"): answer from the new names only, never from the real world.',
            te: 'ప్రత్యామ్నాయ కోడింగ్ ("ఆకాశాన్ని సముద్రం అంటే"): కొత్త పేర్ల ఆధారంగానే జవాబు ఇవ్వండి, వాస్తవ ప్రపంచం ఆధారంగా కాదు.',
            ur: 'متبادل کوڈنگ ("اگر آسمان کو سمندر کہا جائے"): جواب صرف نئے ناموں سے دیں، حقیقی دنیا سے نہیں۔',
          },
        ],
      },
      {
        kind: 'formula',
        text: {
          en: 'A = 1, B = 2, … Z = 26\nOpposite letter position = 27 − position',
          te: 'A = 1, B = 2, … Z = 26\nవ్యతిరేక అక్షర స్థానం = 27 − స్థానం',
          ur: '⁦A = 1, B = 2, … Z = 26⁩\nمخالف حرف کا مقام = 27 − مقام',
        },
      },
      {
        kind: 'example',
        text: {
          en: 'If CAT is coded as DBU, how is DOG coded? Check every letter: C → D, A → B, T → U — each one moves ahead by 1. Apply the same shift: D → E, O → P, G → H. The answer is EPH.',
          te: 'CATను DBU అని కోడ్ చేస్తే, DOGను ఎలా కోడ్ చేస్తారు? ప్రతి అక్షరాన్ని సరిచూడండి: C → D, A → B, T → U — ప్రతి ఒక్కటీ 1 ముందుకు కదిలింది. అదే మార్పును వర్తింపజేయండి: D → E, O → P, G → H. జవాబు EPH.',
          ur: 'اگر CAT کا کوڈ DBU ہے تو DOG کا کوڈ کیا ہوگا؟ ہر حرف جانچیں: ⁦C → D⁩، ⁦A → B⁩، ⁦T → U⁩ — ہر ایک 1 آگے بڑھا ہے۔ وہی تبدیلی لاگو کریں: ⁦D → E⁩، ⁦O → P⁩، ⁦G → H⁩۔ جواب EPH ہے۔',
        },
      },
      {
        kind: 'tip',
        text: {
          en: 'Letters near the end of the alphabet are where mistakes live. Remember that Z + 1 comes back to A, so a shift never runs off the end.',
          te: 'వర్ణమాల చివరి అక్షరాల దగ్గరే పొరపాట్లు జరుగుతాయి. Z + 1 తిరిగి Aకి వస్తుందని గుర్తుంచుకోండి, కాబట్టి మార్పు ఎప్పుడూ చివర దాటి పోదు.',
          ur: 'غلطیاں عموماً حروف تہجی کے آخری حصے میں ہوتی ہیں۔ یاد رکھیں کہ ⁦Z + 1⁩ دوبارہ A پر آ جاتا ہے، اس لیے تبدیلی کبھی آخر سے باہر نہیں جاتی۔',
        },
      },
    ],
  },
  {
    id: 'st-re-blood',
    section: 'reasoning',
    title: {
      en: 'Blood relations',
      te: 'రక్త సంబంధాలు',
      ur: 'خونی رشتے',
    },
    minutes: 7,
    blocks: [
      {
        kind: 'heading',
        text: {
          en: 'Draw the family, do not hold it in your head',
          te: 'కుటుంబాన్ని గీయండి, మనసులో పెట్టుకోవద్దు',
          ur: 'خاندان کا خاکہ بنائیں، ذہن میں نہ رکھیں',
        },
      },
      {
        kind: 'para',
        text: {
          en: 'A blood relation question is a small family tree written as a sentence. Redraw it as a tree and the answer is usually visible before you have finished reading the options.',
          te: 'రక్త సంబంధాల ప్రశ్న అంటే ఒక వాక్యంగా రాసిన చిన్న వంశవృక్షమే. దాన్ని వృక్షంగా గీస్తే, ఆప్షన్లు చదవడం పూర్తి కాకముందే జవాబు కనిపిస్తుంది.',
          ur: 'خونی رشتے کا سوال دراصل ایک چھوٹا شجرۂ نسب ہے جو جملے کی شکل میں لکھا گیا ہے۔ اسے خاکے میں دوبارہ بنائیں تو جواب اکثر آپشن پڑھنے سے پہلے ہی سامنے آ جاتا ہے۔',
        },
      },
      {
        kind: 'para',
        text: {
          en: 'Keep generations on their own rows: grandparents on top, parents below them, children below that. Marriage is a horizontal link; a child hangs on a vertical line.',
          te: 'తరాలను వేర్వేరు వరుసల్లో ఉంచండి: పైన తాతముత్తాతలు, వారి కింద తల్లిదండ్రులు, ఆ కింద పిల్లలు. వివాహం అడ్డ గీత; పిల్లవాడు నిలువు గీతకు వేలాడతాడు.',
          ur: 'ہر نسل کو اپنی الگ قطار میں رکھیں: اوپر دادا دادی، ان کے نیچے والدین، اور اس کے نیچے بچے۔ شادی کو افقی لکیر سے اور اولاد کو عمودی لکیر سے جوڑیں۔',
        },
      },
      {
        kind: 'para',
        text: {
          en: 'Read a "pointing to a photograph" sentence from the far end backwards. In "the son of my father\'s only son", start with "my father\'s only son" — that is the speaker himself.',
          te: '"ఫోటో చూపిస్తూ" అనే వాక్యాన్ని చివరి నుండి వెనక్కి చదవండి. "నా తండ్రి ఏకైక కుమారుడి కుమారుడు"లో ముందుగా "నా తండ్రి ఏకైక కుమారుడు" తీసుకోండి — అది మాట్లాడేవాడే.',
          ur: '"تصویر کی طرف اشارہ کرتے ہوئے" والا جملہ آخر سے الٹا پڑھیں۔ "میرے والد کے اکلوتے بیٹے کا بیٹا" میں پہلے "میرے والد کا اکلوتا بیٹا" لیں — وہ خود بولنے والا ہے۔',
        },
      },
      {
        kind: 'bullets',
        items: [
          {
            en: 'Never assume a gender from a name. The question tells you, or it does not matter.',
            te: 'పేరును బట్టి లింగాన్ని ఊహించవద్దు. ప్రశ్నే చెబుతుంది, లేదా అది అవసరం ఉండదు.',
            ur: 'نام سے جنس کا اندازہ ہرگز نہ لگائیں۔ یا تو سوال خود بتاتا ہے، یا اس کی ضرورت نہیں ہوتی۔',
          },
          {
            en: '"Only son" and "only daughter" are the clues that close a branch. Mark them first.',
            te: '"ఏకైక కుమారుడు", "ఏకైక కుమార్తె" అనేవి ఒక కొమ్మను మూసివేసే సూచనలు. వాటిని ముందుగా గుర్తించండి.',
            ur: '"اکلوتا بیٹا" اور "اکلوتی بیٹی" وہ اشارے ہیں جو ایک شاخ بند کر دیتے ہیں۔ انہیں پہلے نشان زد کریں۔',
          },
          {
            en: "Maternal is the mother's side, paternal the father's. Questions in Telugu and Urdu name these directly, so learn both words.",
            te: 'మాతృ వైపు అంటే తల్లి వైపు, పితృ వైపు అంటే తండ్రి వైపు. తెలుగు, ఉర్దూ ప్రశ్నలు వీటిని నేరుగా పేర్కొంటాయి, కాబట్టి రెండు పదాలూ నేర్చుకోండి.',
            ur: 'ننھیال ماں کی طرف اور ددھیال باپ کی طرف ہے۔ تلگو اور اردو کے سوال ان کا نام براہِ راست لیتے ہیں، اس لیے دونوں الفاظ یاد رکھیں۔',
          },
          {
            en: 'In-law relations come through the horizontal marriage link, never through a vertical one.',
            te: 'వియ్యంకుల సంబంధాలు అడ్డ వివాహ గీత ద్వారానే వస్తాయి, నిలువు గీత ద్వారా కాదు.',
            ur: 'سسرالی رشتے ہمیشہ افقی شادی کی لکیر سے آتے ہیں، عمودی لکیر سے کبھی نہیں۔',
          },
        ],
      },
      {
        kind: 'formula',
        text: {
          en: 'Notation:  + male    − female    = married couple    | child of',
          te: 'సంకేతాలు:  + పురుషుడు    − స్త్రీ    = దంపతులు    | సంతానం',
          ur: 'علامات:  + مرد    − عورت    = میاں بیوی    | اولاد',
        },
      },
      {
        kind: 'example',
        text: {
          en: "Pointing to a photograph a man says, \"He is the son of my father's only son.\" Work backwards: my father's only son is the speaker. So the man in the photograph is the speaker's own son.",
          te: 'ఒక వ్యక్తి ఫోటో చూపిస్తూ, "అతను నా తండ్రి ఏకైక కుమారుడి కుమారుడు" అన్నాడు. వెనక్కి ఆలోచించండి: నా తండ్రి ఏకైక కుమారుడు అంటే మాట్లాడేవాడే. కాబట్టి ఫోటోలోని వ్యక్తి మాట్లాడేవాడి సొంత కుమారుడు.',
          ur: 'ایک شخص تصویر کی طرف اشارہ کرتے ہوئے کہتا ہے، "یہ میرے والد کے اکلوتے بیٹے کا بیٹا ہے۔" الٹا سوچیں: میرے والد کا اکلوتا بیٹا خود بولنے والا ہے۔ لہٰذا تصویر والا شخص بولنے والے کا اپنا بیٹا ہے۔',
        },
      },
      {
        kind: 'tip',
        text: {
          en: 'If you cannot answer in thirty seconds, you have drawn the tree wrong. Start the diagram again rather than re-reading the sentence.',
          te: 'ముప్పై సెకన్లలో జవాబు రాకపోతే, మీరు వృక్షాన్ని తప్పుగా గీశారని అర్థం. వాక్యాన్ని మళ్లీ చదవడం కంటే బొమ్మను కొత్తగా మొదలుపెట్టండి.',
          ur: 'اگر تیس سیکنڈ میں جواب نہ ملے تو سمجھیں خاکہ غلط بنا ہے۔ جملہ دوبارہ پڑھنے کے بجائے خاکہ نئے سرے سے بنائیں۔',
        },
      },
    ],
  },
  {
    id: 'st-re-seating',
    section: 'reasoning',
    title: {
      en: 'Seating arrangement',
      te: 'సీటింగ్ అరేంజ్‌మెంట్',
      ur: 'نشست کی ترتیب',
    },
    minutes: 9,
    blocks: [
      {
        kind: 'heading',
        text: {
          en: 'Start from the clue that cannot move',
          te: 'కదలని సూచన నుండి మొదలుపెట్టండి',
          ur: 'اُس اشارے سے شروع کریں جو بدل نہیں سکتا',
        },
      },
      {
        kind: 'para',
        text: {
          en: 'A seating puzzle gives you several statements, only one or two of which fix a person to a definite place. Place those first, then let the relative clues hang off them.',
          te: 'సీటింగ్ పజిల్ చాలా వాక్యాలు ఇస్తుంది, కానీ వాటిలో ఒకటి రెండు మాత్రమే ఒక వ్యక్తిని నిర్దిష్ట స్థానంలో స్థిరపరుస్తాయి. వాటిని ముందుగా అమర్చి, మిగతా సాపేక్ష సూచనలను వాటికి జోడించండి.',
          ur: 'نشست کی پہیلی کئی جملے دیتی ہے، مگر ان میں سے صرف ایک دو کسی شخص کی جگہ حتمی طور پر طے کرتے ہیں۔ پہلے انہیں رکھیں، پھر باقی نسبتی اشارے ان کے ساتھ جوڑیں۔',
        },
      },
      {
        kind: 'para',
        text: {
          en: 'Direction is where marks are lost. If people sit in a circle facing the centre, their left is your right on the page. If they face outward, their left is your left.',
          te: 'దిశ దగ్గరే మార్కులు పోతాయి. వృత్తంలో కేంద్రం వైపు చూస్తూ కూర్చుంటే, వారి ఎడమ వైపు కాగితంపై మీ కుడి వైపు అవుతుంది. బయటికి చూస్తే వారి ఎడమ మీ ఎడమే.',
          ur: 'نمبر عموماً سمت پر ضائع ہوتے ہیں۔ اگر لوگ دائرے میں مرکز کی طرف منہ کیے بیٹھے ہوں تو ان کا بایاں کاغذ پر آپ کا دایاں ہوگا۔ باہر کی طرف منہ ہو تو ان کا بایاں آپ کا بایاں ہی رہے گا۔',
        },
      },
      {
        kind: 'para',
        text: {
          en: 'Where a clue allows two placements, draw both diagrams side by side. One of them will contradict a later statement, and eliminating it is faster than starting over.',
          te: 'ఒక సూచన రెండు అమరికలను అనుమతిస్తే, రెండు బొమ్మలనూ పక్కపక్కనే గీయండి. వాటిలో ఒకటి తర్వాతి వాక్యానికి విరుద్ధమవుతుంది; దాన్ని తొలగించడం మళ్లీ మొదటి నుండి మొదలుపెట్టడం కంటే వేగవంతం.',
          ur: 'اگر کوئی اشارہ دو ممکنہ ترتیبیں دے تو دونوں خاکے ساتھ ساتھ بنا لیں۔ ان میں سے ایک بعد کے کسی جملے سے ٹکرا جائے گی، اور اسے خارج کرنا نئے سرے سے شروع کرنے سے تیز ہے۔',
        },
      },
      {
        kind: 'bullets',
        items: [
          {
            en: '"Immediately to the left of" fixes a neighbour; "to the left of" only fixes a side.',
            te: '"వెంటనే ఎడమ వైపు" అంటే పక్కనున్న వ్యక్తిని స్థిరపరుస్తుంది; "ఎడమ వైపు" అంటే కేవలం దిశను మాత్రమే.',
            ur: '"بالکل بائیں طرف" پڑوسی کو طے کرتا ہے؛ "بائیں طرف" صرف سمت طے کرتا ہے۔',
          },
          {
            en: "In a row facing north, left and right on the page match the people's own left and right.",
            te: 'ఉత్తరం వైపు చూస్తున్న వరుసలో, కాగితంపై ఎడమ–కుడి వ్యక్తుల ఎడమ–కుడితో సరిపోతాయి.',
            ur: 'شمال کی طرف منہ کیے قطار میں، کاغذ کا بایاں اور دایاں لوگوں کے اپنے بائیں دائیں سے ملتا ہے۔',
          },
          {
            en: 'In a circle of n people, the person opposite is n ÷ 2 seats away — only when n is even.',
            te: 'n మంది ఉన్న వృత్తంలో, ఎదురుగా ఉన్న వ్యక్తి n ÷ 2 స్థానాల దూరంలో ఉంటాడు — n సరిసంఖ్య అయినప్పుడే.',
            ur: 'n افراد کے دائرے میں سامنے والا شخص ⁦n ÷ 2⁩ نشستوں کے فاصلے پر ہوتا ہے — صرف اُس وقت جب n جفت ہو۔',
          },
          {
            en: 'Count the people the question names. A missing person is usually the clue you skipped.',
            te: 'ప్రశ్నలో పేర్కొన్న వ్యక్తులను లెక్కపెట్టండి. ఒకరు తగ్గితే, అది మీరు వదిలేసిన సూచనే.',
            ur: 'سوال میں نامزد افراد کو گن لیں۔ کوئی فرد کم ہو تو عموماً وہی اشارہ ہے جو آپ نے چھوڑ دیا۔',
          },
        ],
      },
      {
        kind: 'formula',
        text: {
          en: 'Facing centre:   their left  = your right\nFacing outward:  their left  = your left',
          te: 'కేంద్రం వైపు:   వారి ఎడమ  = మీ కుడి\nబయటి వైపు:  వారి ఎడమ  = మీ ఎడమ',
          ur: 'مرکز کی طرف منہ:   ان کا بایاں  = آپ کا دایاں\nباہر کی طرف منہ:  ان کا بایاں  = آپ کا بایاں',
        },
      },
      {
        kind: 'example',
        text: {
          en: 'Five friends sit in a row facing north. B is at the extreme left. D is immediately to the right of A. C is between B and A. E takes the last seat. Place B first, then C, then A, then D — B, C, A, D, E. E sits at the extreme right.',
          te: 'ఐదుగురు స్నేహితులు ఉత్తరం వైపు చూస్తూ ఒక వరుసలో కూర్చున్నారు. B అత్యంత ఎడమ చివర ఉన్నాడు. D అనేవాడు A కి వెంటనే కుడి వైపు ఉన్నాడు. C అనేవాడు B, A ల మధ్య ఉన్నాడు. E చివరి స్థానం తీసుకున్నాడు. ముందుగా B, తర్వాత C, తర్వాత A, తర్వాత D అమర్చండి — B, C, A, D, E. E అత్యంత కుడి చివర కూర్చుంటాడు.',
          ur: 'پانچ دوست شمال کی طرف منہ کیے ایک قطار میں بیٹھے ہیں۔ B سب سے بائیں سرے پر ہے۔ D، A کے بالکل دائیں طرف ہے۔ C، B اور A کے درمیان ہے۔ E آخری نشست لیتا ہے۔ پہلے B، پھر C، پھر A، پھر D رکھیں — B، C، A، D، E۔ E سب سے دائیں سرے پر بیٹھا ہے۔',
        },
      },
      {
        kind: 'tip',
        text: {
          en: 'Draw the seats as empty boxes before you read the clues. A diagram waiting to be filled is faster than one you keep redrawing.',
          te: 'సూచనలు చదవడానికి ముందే స్థానాలను ఖాళీ పెట్టెలుగా గీయండి. నింపడానికి సిద్ధంగా ఉన్న బొమ్మ, పదేపదే గీసే బొమ్మ కంటే వేగవంతం.',
          ur: 'اشارے پڑھنے سے پہلے نشستوں کے خالی خانے بنا لیں۔ بھرنے کے لیے تیار خاکہ، بار بار بنائے جانے والے خاکے سے تیز ہوتا ہے۔',
        },
      },
    ],
  },
];

const GENERAL_STUDIES: StudyTopic[] = [
  {
    id: 'st-gs-polity',
    section: 'gs',
    title: {
      en: 'Indian polity: Constitution and fundamental rights',
      te: 'భారత రాజ్యాంగం, ప్రాథమిక హక్కులు',
      ur: 'ہندوستانی آئین اور بنیادی حقوق',
    },
    minutes: 10,
    blocks: [
      {
        kind: 'heading',
        text: {
          en: 'The dates and articles that are actually asked',
          te: 'నిజంగా అడిగే తేదీలు, అధికరణలు',
          ur: 'وہ تاریخیں اور دفعات جو واقعی پوچھی جاتی ہیں',
        },
      },
      {
        kind: 'para',
        text: {
          en: 'The Constituent Assembly adopted the Constitution on 26 November 1949 and it came into force on 26 January 1950. Dr B. R. Ambedkar chaired the drafting committee; Dr Rajendra Prasad was the president of the Assembly.',
          te: 'రాజ్యాంగ పరిషత్ 1949 నవంబర్ 26న రాజ్యాంగాన్ని ఆమోదించింది, అది 1950 జనవరి 26 నుండి అమల్లోకి వచ్చింది. ముసాయిదా కమిటీకి డా. బి. ఆర్. అంబేద్కర్ అధ్యక్షుడు; పరిషత్ అధ్యక్షుడు డా. రాజేంద్ర ప్రసాద్.',
          ur: 'دستور ساز اسمبلی نے 26 نومبر 1949 کو آئین منظور کیا اور یہ 26 جنوری 1950 سے نافذ ہوا۔ مسودہ کمیٹی کے صدر ڈاکٹر بی۔ آر۔ امبیڈکر تھے؛ اسمبلی کے صدر ڈاکٹر راجندر پرساد تھے۔',
        },
      },
      {
        kind: 'para',
        text: {
          en: 'Fundamental rights live in Part III, Articles 12 to 35. There are six of them today: the right to property was removed from Part III by the 44th Amendment in 1978 and is now a legal right under Article 300A.',
          te: 'ప్రాథమిక హక్కులు మూడవ భాగంలో, 12 నుండి 35 అధికరణల్లో ఉన్నాయి. ప్రస్తుతం ఆరు హక్కులు ఉన్నాయి: ఆస్తి హక్కును 1978లో 44వ సవరణ ద్వారా మూడవ భాగం నుండి తొలగించారు, ఇప్పుడు అది 300A అధికరణ కింద చట్టబద్ధ హక్కు.',
          ur: 'بنیادی حقوق حصہ سوم، دفعات 12 تا 35 میں ہیں۔ آج ان کی تعداد چھ ہے: جائیداد کا حق 1978 میں 44ویں ترمیم کے ذریعے حصہ سوم سے نکال دیا گیا اور اب یہ دفعہ 300A کے تحت ایک قانونی حق ہے۔',
        },
      },
      {
        kind: 'para',
        text: {
          en: 'Article 32 gives every citizen the right to move the Supreme Court directly when a fundamental right is violated. Dr Ambedkar called it the heart and soul of the Constitution, and that phrase is itself a common question.',
          te: 'ప్రాథమిక హక్కు ఉల్లంఘనకు గురైనప్పుడు నేరుగా సుప్రీంకోర్టును ఆశ్రయించే హక్కును 32వ అధికరణ ప్రతి పౌరుడికీ ఇస్తుంది. దీన్ని డా. అంబేద్కర్ రాజ్యాంగ హృదయం, ఆత్మ అని పిలిచారు; ఆ మాటే ఒక సాధారణ ప్రశ్న.',
          ur: 'دفعہ 32 ہر شہری کو یہ حق دیتی ہے کہ بنیادی حق کی خلاف ورزی پر وہ براہِ راست سپریم کورٹ سے رجوع کرے۔ ڈاکٹر امبیڈکر نے اسے آئین کا دل اور روح کہا تھا، اور یہی جملہ خود ایک عام سوال ہے۔',
        },
      },
      {
        kind: 'bullets',
        items: [
          {
            en: 'Right to equality — Articles 14 to 18.',
            te: 'సమానత్వ హక్కు — 14 నుండి 18 అధికరణలు.',
            ur: 'مساوات کا حق — دفعات 14 تا 18۔',
          },
          {
            en: 'Right to freedom — Articles 19 to 22, including the six freedoms under Article 19.',
            te: 'స్వేచ్ఛా హక్కు — 19 నుండి 22 అధికరణలు, 19వ అధికరణలోని ఆరు స్వేచ్ఛలతో సహా.',
            ur: 'آزادی کا حق — دفعات 19 تا 22، جن میں دفعہ 19 کی چھ آزادیاں شامل ہیں۔',
          },
          {
            en: 'Right against exploitation — Articles 23 and 24, which ban forced labour and child labour under 14.',
            te: 'దోపిడీకి వ్యతిరేక హక్కు — 23, 24 అధికరణలు; బలవంతపు చాకిరీని, 14 ఏళ్ల లోపు బాలకార్మికతను నిషేధిస్తాయి.',
            ur: 'استحصال کے خلاف حق — دفعات 23 اور 24، جو جبری مشقت اور 14 سال سے کم عمر کی مزدوری پر پابندی لگاتی ہیں۔',
          },
          {
            en: 'Right to freedom of religion — Articles 25 to 28.',
            te: 'మత స్వేచ్ఛా హక్కు — 25 నుండి 28 అధికరణలు.',
            ur: 'مذہبی آزادی کا حق — دفعات 25 تا 28۔',
          },
          {
            en: 'Cultural and educational rights — Articles 29 and 30; constitutional remedies — Article 32.',
            te: 'సాంస్కృతిక, విద్యా హక్కులు — 29, 30 అధికరణలు; రాజ్యాంగ పరిహారాల హక్కు — 32వ అధికరణ.',
            ur: 'ثقافتی اور تعلیمی حقوق — دفعات 29 اور 30؛ آئینی چارہ جوئی کا حق — دفعہ 32۔',
          },
        ],
      },
      {
        kind: 'example',
        text: {
          en: 'A typical PWT question: "Which article of the Constitution is described as its heart and soul?" The options will include 14, 19, 21 and 32. The answer is Article 32 — the right to constitutional remedies.',
          te: 'ఒక సాధారణ PWT ప్రశ్న: "రాజ్యాంగ హృదయం, ఆత్మ అని ఏ అధికరణను అంటారు?" ఆప్షన్లలో 14, 19, 21, 32 ఉంటాయి. జవాబు 32వ అధికరణ — రాజ్యాంగ పరిహారాల హక్కు.',
          ur: 'ایک عام PWT سوال: "آئین کی کون سی دفعہ کو اس کا دل اور روح کہا جاتا ہے؟" آپشنز میں 14، 19، 21 اور 32 ہوں گے۔ جواب دفعہ 32 ہے — آئینی چارہ جوئی کا حق۔',
        },
      },
      {
        kind: 'tip',
        text: {
          en: 'Learn polity by article number, not by topic name. The paper asks "Article 21 deals with…", never "which right protects life".',
          te: 'రాజకీయ వ్యవస్థను అంశం పేరుతో కాకుండా అధికరణ సంఖ్యతో నేర్చుకోండి. పేపర్ "21వ అధికరణ దేనికి సంబంధించినది…" అని అడుగుతుంది, "జీవించే హక్కును ఏ హక్కు కాపాడుతుంది" అని కాదు.',
          ur: 'سیاسیات کو موضوع کے نام سے نہیں، دفعہ کے نمبر سے یاد کریں۔ پرچہ پوچھتا ہے "دفعہ 21 کا تعلق کس سے ہے…"، یہ نہیں کہ "زندگی کی حفاظت کون سا حق کرتا ہے"۔',
        },
      },
    ],
  },
  {
    id: 'st-gs-rivers',
    section: 'gs',
    title: {
      en: 'Telangana rivers and geography',
      te: 'తెలంగాణ నదులు, భౌగోళికం',
      ur: 'تلنگانہ کے دریا اور جغرافیہ',
    },
    minutes: 9,
    blocks: [
      {
        kind: 'heading',
        text: {
          en: 'Two great rivers and one city river',
          te: 'రెండు మహా నదులు, ఒక నగర నది',
          ur: 'دو بڑے دریا اور ایک شہری دریا',
        },
      },
      {
        kind: 'para',
        text: {
          en: 'The Godavari is the largest river of Telangana and the second longest in India, which is why it is called Dakshina Ganga. It rises at Trimbakeshwar in Maharashtra, enters Telangana in Nizamabad district and runs east along the northern edge of the state.',
          te: 'గోదావరి తెలంగాణలో అతిపెద్ద నది, భారతదేశంలో రెండో పొడవైనది; అందుకే దీన్ని దక్షిణ గంగ అంటారు. ఇది మహారాష్ట్రలోని త్ర్యంబకేశ్వరం వద్ద పుట్టి, నిజామాబాద్ జిల్లాలో తెలంగాణలోకి ప్రవేశించి, రాష్ట్ర ఉత్తర సరిహద్దు వెంబడి తూర్పుగా ప్రవహిస్తుంది.',
          ur: 'گوداوری تلنگانہ کا سب سے بڑا اور ہندوستان کا دوسرا طویل ترین دریا ہے، اسی لیے اسے دکشن گنگا کہا جاتا ہے۔ یہ مہاراشٹر کے تریمبکیشور سے نکلتا ہے، نظام آباد ضلع سے تلنگانہ میں داخل ہوتا ہے اور ریاست کی شمالی حد کے ساتھ مشرق کی طرف بہتا ہے۔',
        },
      },
      {
        kind: 'para',
        text: {
          en: 'The Krishna is the second great river of the state and forms much of its southern boundary. Its Telangana tributaries include the Bhima, the Tungabhadra and the Musi, and the Nagarjuna Sagar and Srisailam projects stand on it.',
          te: 'కృష్ణా రాష్ట్రంలోని రెండో మహా నది; ఇది దక్షిణ సరిహద్దులో ఎక్కువ భాగాన్ని ఏర్పరుస్తుంది. తెలంగాణలో దీని ఉపనదులు భీమా, తుంగభద్ర, మూసీ; నాగార్జునసాగర్, శ్రీశైలం ప్రాజెక్టులు దీనిపైనే ఉన్నాయి.',
          ur: 'کرشنا ریاست کا دوسرا بڑا دریا ہے اور اس کی جنوبی سرحد کا بیشتر حصہ بناتا ہے۔ تلنگانہ میں اس کی معاون ندیوں میں بھیما، تنگابھدرا اور موسی شامل ہیں، اور ناگارجن ساگر اور سری سیلم منصوبے اسی پر قائم ہیں۔',
        },
      },
      {
        kind: 'para',
        text: {
          en: 'The Musi rises in the hills near Vikarabad, flows through Hyderabad and joins the Krishna at Wadapally in Nalgonda district. Osman Sagar and Himayat Sagar were built on it after the 1908 flood to protect the city.',
          te: 'మూసీ వికారాబాద్ సమీపంలోని కొండల్లో పుట్టి, హైదరాబాద్ గుండా ప్రవహించి, నల్గొండ జిల్లా వాడపల్లి వద్ద కృష్ణాలో కలుస్తుంది. 1908 వరద తర్వాత నగరాన్ని కాపాడేందుకు దీనిపై ఉస్మాన్ సాగర్, హిమాయత్ సాగర్ నిర్మించారు.',
          ur: 'موسی وکاراباد کے قریب پہاڑیوں سے نکلتا ہے، حیدرآباد سے گزرتا ہے اور نلگنڈہ ضلع کے واڈاپلی میں کرشنا سے مل جاتا ہے۔ 1908 کے سیلاب کے بعد شہر کے تحفظ کے لیے اسی پر عثمان ساگر اور حمایت ساگر بنائے گئے۔',
        },
      },
      {
        kind: 'bullets',
        items: [
          {
            en: 'Godavari tributaries in Telangana: Manjira, Pranhita, Indravati and Kinnerasani.',
            te: 'తెలంగాణలో గోదావరి ఉపనదులు: మంజీరా, ప్రాణహిత, ఇంద్రావతి, కిన్నెరసాని.',
            ur: 'تلنگانہ میں گوداوری کی معاون ندیاں: منجیرا، پرانہیتا، اندراوتی اور کنّیرسانی۔',
          },
          {
            en: 'The Kaleshwaram lift irrigation project stands on the Godavari where the Pranhita joins it.',
            te: 'ప్రాణహిత గోదావరిలో కలిసే చోట కాళేశ్వరం ఎత్తిపోతల ప్రాజెక్టు ఉంది.',
            ur: 'کالیشورم لفٹ ایریگیشن منصوبہ گوداوری پر اُس مقام پر ہے جہاں پرانہیتا اس میں شامل ہوتی ہے۔',
          },
          {
            en: 'Telangana sits on the Deccan plateau; its soils are chiefly red sandy and black cotton soil.',
            te: 'తెలంగాణ దక్కన్ పీఠభూమిపై ఉంది; ఇక్కడి నేలలు ప్రధానంగా ఎర్ర ఇసుక నేలలు, నల్ల రేగడి నేలలు.',
            ur: 'تلنگانہ سطح مرتفع دکن پر واقع ہے؛ یہاں کی مٹی بنیادی طور پر سرخ ریتلی اور کالی کپاس والی ہے۔',
          },
          {
            en: 'The state receives most of its rain from the south-west monsoon between June and September.',
            te: 'రాష్ట్రానికి వర్షపాతంలో ఎక్కువ భాగం జూన్ నుండి సెప్టెంబర్ మధ్య నైరుతి రుతుపవనాల ద్వారా వస్తుంది.',
            ur: 'ریاست کو زیادہ تر بارش جون تا ستمبر جنوب مغربی مانسون سے ملتی ہے۔',
          },
        ],
      },
      {
        kind: 'example',
        text: {
          en: 'A question asks: "The Musi river joins which river?" Options: Godavari, Krishna, Manjira, Pranhita. The Musi is a tributary of the Krishna, so the answer is the Krishna — even though the Musi flows through Hyderabad, which sits well north of it.',
          te: 'ఒక ప్రశ్న: "మూసీ నది ఏ నదిలో కలుస్తుంది?" ఆప్షన్లు: గోదావరి, కృష్ణా, మంజీరా, ప్రాణహిత. మూసీ కృష్ణా ఉపనది, కాబట్టి జవాబు కృష్ణా — మూసీ హైదరాబాద్ గుండా ప్రవహించినా, నగరం దానికి చాలా ఉత్తరాన ఉంది.',
          ur: 'سوال: "موسی دریا کس دریا میں شامل ہوتا ہے؟" آپشنز: گوداوری، کرشنا، منجیرا، پرانہیتا۔ موسی کرشنا کی معاون ندی ہے، لہٰذا جواب کرشنا ہے — اگرچہ موسی حیدرآباد سے گزرتا ہے جو اس سے کہیں شمال میں ہے۔',
        },
      },
      {
        kind: 'tip',
        text: {
          en: 'Learn the rivers with their districts and projects together. The paper often asks for the district a project stands in, not the river itself.',
          te: 'నదులను వాటి జిల్లాలు, ప్రాజెక్టులతో కలిపి నేర్చుకోండి. పేపర్ తరచుగా నది గురించి కాకుండా, ప్రాజెక్టు ఏ జిల్లాలో ఉందని అడుగుతుంది.',
          ur: 'دریاؤں کو ان کے اضلاع اور منصوبوں کے ساتھ ملا کر یاد کریں۔ پرچہ اکثر دریا کے بجائے یہ پوچھتا ہے کہ منصوبہ کس ضلع میں ہے۔',
        },
      },
    ],
  },
  {
    id: 'st-gs-current',
    section: 'gs',
    title: {
      en: 'How current affairs are asked',
      te: 'కరెంట్ అఫైర్స్ ఎలా అడుగుతారు',
      ur: 'حالاتِ حاضرہ کیسے پوچھے جاتے ہیں',
    },
    minutes: 6,
    blocks: [
      {
        kind: 'heading',
        text: {
          en: 'A narrow window, read every day',
          te: 'ఇరుకైన కాలపరిమితి, ప్రతిరోజూ చదవాలి',
          ur: 'محدود مدت، روزانہ کا مطالعہ',
        },
      },
      {
        kind: 'para',
        text: {
          en: 'Current affairs in the PWT come from roughly the last six to twelve months before the notification. Anything older belongs to static general studies and is asked as history or polity instead.',
          te: 'PWTలో కరెంట్ అఫైర్స్ నోటిఫికేషన్‌కు ముందు దాదాపు ఆరు నుండి పన్నెండు నెలల కాలం నుండి వస్తాయి. అంతకంటే పాతవి స్టాటిక్ జనరల్ స్టడీస్‌లోకి వస్తాయి, వాటిని చరిత్ర లేదా రాజకీయ వ్యవస్థగా అడుగుతారు.',
          ur: 'PWT میں حالاتِ حاضرہ عموماً نوٹیفکیشن سے پہلے کے چھ سے بارہ ماہ کے ہوتے ہیں۔ اس سے پرانی باتیں مستقل جنرل اسٹڈیز میں آتی ہیں اور تاریخ یا سیاسیات کے طور پر پوچھی جاتی ہیں۔',
        },
      },
      {
        kind: 'para',
        text: {
          en: 'Telangana news carries more weight than national news in this paper. State schemes, new districts, state awards, irrigation projects and police department decisions are all fair game.',
          te: 'ఈ పేపర్‌లో జాతీయ వార్తల కంటే తెలంగాణ వార్తలకే ఎక్కువ ప్రాధాన్యం. రాష్ట్ర పథకాలు, కొత్త జిల్లాలు, రాష్ట్ర పురస్కారాలు, సాగునీటి ప్రాజెక్టులు, పోలీసు శాఖ నిర్ణయాలు — అన్నీ అడగవచ్చు.',
          ur: 'اس پرچے میں قومی خبروں سے زیادہ وزن تلنگانہ کی خبروں کا ہے۔ ریاستی اسکیمیں، نئے اضلاع، ریاستی اعزازات، آبپاشی منصوبے اور محکمۂ پولیس کے فیصلے — سب پوچھے جا سکتے ہیں۔',
        },
      },
      {
        kind: 'para',
        text: {
          en: 'Questions are almost always factual pairs: a person and a post, a scheme and its department, a tournament and its winner. Revise in that shape rather than reading long articles.',
          te: 'ప్రశ్నలు దాదాపు ఎప్పుడూ వాస్తవ జతలుగా ఉంటాయి: వ్యక్తి–పదవి, పథకం–శాఖ, టోర్నమెంట్–విజేత. పొడవైన వ్యాసాలు చదవడం కంటే ఈ రూపంలోనే పునశ్చరణ చేయండి.',
          ur: 'سوال تقریباً ہمیشہ حقائق کے جوڑوں کی شکل میں ہوتے ہیں: شخص اور عہدہ، اسکیم اور محکمہ، ٹورنامنٹ اور فاتح۔ طویل مضامین پڑھنے کے بجائے اسی شکل میں دہرائیں۔',
        },
      },
      {
        kind: 'bullets',
        items: [
          {
            en: 'Appointments: governors, chief justices, DGPs, chairpersons of national bodies.',
            te: 'నియామకాలు: గవర్నర్లు, ప్రధాన న్యాయమూర్తులు, డీజీపీలు, జాతీయ సంస్థల అధ్యక్షులు.',
            ur: 'تقرریاں: گورنر، چیف جسٹس، ڈی جی پی، قومی اداروں کے سربراہان۔',
          },
          {
            en: 'Awards: Padma awards, Arjuna and Khel Ratna, state literary and police medals.',
            te: 'పురస్కారాలు: పద్మ పురస్కారాలు, అర్జున, ఖేల్ రత్న, రాష్ట్ర సాహిత్య, పోలీసు పతకాలు.',
            ur: 'اعزازات: پدما ایوارڈز، ارجن اور کھیل رتن، ریاستی ادبی اور پولیس تمغے۔',
          },
          {
            en: 'Sport: hosts, winners and venues of the last major tournaments.',
            te: 'క్రీడలు: ఇటీవలి ప్రధాన టోర్నమెంట్ల ఆతిథ్య దేశాలు, విజేతలు, వేదికలు.',
            ur: 'کھیل: حالیہ بڑے ٹورنامنٹس کے میزبان، فاتح اور مقامات۔',
          },
          {
            en: 'Schemes: the department that runs each one and the year it started.',
            te: 'పథకాలు: ప్రతి పథకాన్ని నిర్వహించే శాఖ, అది ప్రారంభమైన సంవత్సరం.',
            ur: 'اسکیمیں: ہر اسکیم چلانے والا محکمہ اور اس کے آغاز کا سال۔',
          },
        ],
      },
      {
        kind: 'example',
        text: {
          en: 'A recurring shape: "Which scheme is run by the Telangana department of women and child welfare?" You are not being asked what the scheme does — only which department owns it. Revise the pairing, not the paragraph.',
          te: 'తరచుగా వచ్చే రూపం: "తెలంగాణ మహిళా, శిశు సంక్షేమ శాఖ ఏ పథకాన్ని నిర్వహిస్తుంది?" పథకం ఏం చేస్తుందని అడగడం లేదు — ఏ శాఖ నిర్వహిస్తుందని మాత్రమే. వ్యాసాన్ని కాదు, జతను పునశ్చరణ చేయండి.',
          ur: 'ایک بار بار آنے والی شکل: "تلنگانہ کے محکمۂ خواتین و اطفال کی فلاح کون سی اسکیم چلاتا ہے؟" یہ نہیں پوچھا جا رہا کہ اسکیم کرتی کیا ہے — صرف یہ کہ کس محکمے کی ہے۔ مضمون نہیں، جوڑا دہرائیں۔',
        },
      },
      {
        kind: 'tip',
        text: {
          en: 'Keep one page per month with ten lines on it. Ten months of that page beats a year of reading you never revised.',
          te: 'నెలకు ఒక పేజీ చొప్పున, అందులో పది పంక్తులు రాసుకోండి. అలాంటి పది నెలల పేజీలు, ఎప్పుడూ పునశ్చరణ చేయని ఏడాది చదువు కంటే మేలు.',
          ur: 'ہر مہینے کے لیے ایک صفحہ رکھیں اور اس پر دس سطریں لکھیں۔ ایسے دس مہینوں کے صفحات، اُس سال بھر کے مطالعے سے بہتر ہیں جسے آپ نے کبھی دہرایا نہیں۔',
        },
      },
    ],
  },
];

const TELANGANA: StudyTopic[] = [
  {
    id: 'st-tg-statehood',
    section: 'telangana',
    title: {
      en: 'Statehood movement and formation',
      te: 'తెలంగాణ ఉద్యమం, రాష్ట్ర ఏర్పాటు',
      ur: 'تحریکِ ریاست اور تشکیل',
    },
    minutes: 10,
    blocks: [
      {
        kind: 'heading',
        text: {
          en: 'From 1956 to 2 June 2014',
          te: '1956 నుండి 2014 జూన్ 2 వరకు',
          ur: '1956 سے 2 جون 2014 تک',
        },
      },
      {
        kind: 'para',
        text: {
          en: "Telangana was merged with Andhra State in 1956 to form Andhra Pradesh, on the safeguards of the Gentlemen's Agreement. The feeling that those safeguards were not kept is where the whole movement begins.",
          te: 'జెంటిల్‌మెన్స్ అగ్రిమెంట్‌లోని రక్షణల ఆధారంగా 1956లో తెలంగాణను ఆంధ్ర రాష్ట్రంతో కలిపి ఆంధ్రప్రదేశ్ ఏర్పాటు చేశారు. ఆ రక్షణలు అమలు కాలేదన్న భావనే మొత్తం ఉద్యమానికి మూలం.',
          ur: '1956 میں جنٹلمینز ایگریمنٹ کی ضمانتوں پر تلنگانہ کو آندھرا ریاست کے ساتھ ملا کر آندھرا پردیش بنایا گیا۔ یہ احساس کہ وہ ضمانتیں پوری نہیں ہوئیں، پوری تحریک کی بنیاد ہے۔',
        },
      },
      {
        kind: 'para',
        text: {
          en: 'The first mass agitation came in 1969, led by students and carried forward by the Telangana Praja Samithi. It was suppressed, but the demand never went away.',
          te: 'మొదటి ప్రజా ఉద్యమం 1969లో వచ్చింది; విద్యార్థులు నడిపిన దాన్ని తెలంగాణ ప్రజా సమితి ముందుకు తీసుకెళ్లింది. అది అణచివేయబడినా, డిమాండ్ మాత్రం ఎప్పుడూ ఆగలేదు.',
          ur: 'پہلی عوامی تحریک 1969 میں اٹھی، جس کی قیادت طلبہ نے کی اور تلنگانہ پرجا سمیتی نے اسے آگے بڑھایا۔ اسے دبا دیا گیا، مگر مطالبہ کبھی ختم نہیں ہوا۔',
        },
      },
      {
        kind: 'para',
        text: {
          en: 'The Telangana Rashtra Samithi was formed in 2001 with statehood as its single demand. The centre announced the process in December 2009, appointed the Srikrishna Committee in 2010, and Parliament passed the Andhra Pradesh Reorganisation Act in February 2014.',
          te: 'రాష్ట్ర సాధనే ఏకైక డిమాండ్‌గా 2001లో తెలంగాణ రాష్ట్ర సమితి ఏర్పడింది. కేంద్రం 2009 డిసెంబర్‌లో ప్రక్రియను ప్రకటించి, 2010లో శ్రీకృష్ణ కమిటీని నియమించింది; పార్లమెంటు 2014 ఫిబ్రవరిలో ఆంధ్రప్రదేశ్ పునర్విభజన చట్టాన్ని ఆమోదించింది.',
          ur: '2001 میں تلنگانہ راشٹرا سمیتی قائم ہوئی جس کا واحد مطالبہ الگ ریاست تھا۔ مرکز نے دسمبر 2009 میں عمل کا اعلان کیا، 2010 میں سری کرشنا کمیٹی مقرر کی، اور پارلیمنٹ نے فروری 2014 میں آندھرا پردیش تنظیمِ نو ایکٹ منظور کیا۔',
        },
      },
      {
        kind: 'bullets',
        items: [
          {
            en: "1956 — Andhra Pradesh formed; the Gentlemen's Agreement lays down safeguards for Telangana.",
            te: '1956 — ఆంధ్రప్రదేశ్ ఏర్పాటు; జెంటిల్‌మెన్స్ అగ్రిమెంట్ తెలంగాణకు రక్షణలు నిర్దేశించింది.',
            ur: '1956 — آندھرا پردیش کی تشکیل؛ جنٹلمینز ایگریمنٹ نے تلنگانہ کے لیے ضمانتیں طے کیں۔',
          },
          {
            en: '1969 — the first Telangana agitation; the Telangana Praja Samithi leads it.',
            te: '1969 — మొదటి తెలంగాణ ఉద్యమం; తెలంగాణ ప్రజా సమితి నాయకత్వం.',
            ur: '1969 — پہلی تلنگانہ تحریک؛ قیادت تلنگانہ پرجا سمیتی نے کی۔',
          },
          {
            en: '2001 — the Telangana Rashtra Samithi is founded by K. Chandrashekar Rao.',
            te: '2001 — కె. చంద్రశేఖర రావు తెలంగాణ రాష్ట్ర సమితిని స్థాపించారు.',
            ur: '2001 — کے۔ چندر شیکھر راؤ نے تلنگانہ راشٹرا سمیتی قائم کی۔',
          },
          {
            en: '2 June 2014 — Telangana becomes the 29th state of India; Hyderabad is the common capital for up to ten years.',
            te: '2014 జూన్ 2 — తెలంగాణ భారతదేశంలో 29వ రాష్ట్రంగా ఏర్పడింది; పదేళ్ల వరకు హైదరాబాద్ ఉమ్మడి రాజధాని.',
            ur: '2 جون 2014 — تلنگانہ ہندوستان کی 29ویں ریاست بنی؛ حیدرآباد دس سال تک مشترکہ دارالحکومت رہا۔',
          },
          {
            en: 'K. Chandrashekar Rao became the first Chief Minister and E. S. L. Narasimhan the first Governor.',
            te: 'కె. చంద్రశేఖర రావు మొదటి ముఖ్యమంత్రి, ఈ. ఎస్. ఎల్. నరసింహన్ మొదటి గవర్నర్ అయ్యారు.',
            ur: 'کے۔ چندر شیکھر راؤ پہلے وزیر اعلیٰ اور ای۔ ایس۔ ایل۔ نرسمہن پہلے گورنر بنے۔',
          },
        ],
      },
      {
        kind: 'example',
        text: {
          en: 'A standard question: "Telangana was formed on which date, and as which numbered state of India?" The answer is 2 June 2014, as the 29th state. Note that Parliament passed the Act in February 2014 — the Act and the formation are two different dates, and the paper likes that gap.',
          te: 'ఒక ప్రామాణిక ప్రశ్న: "తెలంగాణ ఏ తేదీన, భారతదేశంలో ఎన్నో రాష్ట్రంగా ఏర్పడింది?" జవాబు 2014 జూన్ 2, 29వ రాష్ట్రంగా. పార్లమెంటు చట్టాన్ని 2014 ఫిబ్రవరిలో ఆమోదించిందని గుర్తుంచుకోండి — చట్టం, ఏర్పాటు రెండు వేర్వేరు తేదీలు; ఆ తేడానే పేపర్ ఇష్టపడుతుంది.',
          ur: 'ایک معیاری سوال: "تلنگانہ کس تاریخ کو اور ہندوستان کی کون سے نمبر کی ریاست کے طور پر بنی؟" جواب 2 جون 2014، 29ویں ریاست کے طور پر۔ یاد رہے کہ پارلیمنٹ نے ایکٹ فروری 2014 میں منظور کیا — ایکٹ اور تشکیل دو الگ تاریخیں ہیں، اور پرچہ اسی فرق کو پسند کرتا ہے۔',
        },
      },
      {
        kind: 'tip',
        text: {
          en: 'Write the timeline once as a single column of years. In the exam you will be recalling a sequence, not a story.',
          te: 'కాలక్రమాన్ని ఒక్కసారి సంవత్సరాల నిలువు వరుసగా రాయండి. పరీక్షలో మీరు గుర్తుచేసుకోవాల్సింది కథను కాదు, వరుసను.',
          ur: 'ٹائم لائن کو ایک بار سالوں کے ایک عمودی کالم کی شکل میں لکھ لیں۔ امتحان میں آپ کو کہانی نہیں، ترتیب یاد کرنی ہوگی۔',
        },
      },
    ],
  },
  {
    id: 'st-tg-districts',
    section: 'telangana',
    title: {
      en: 'Districts and administration',
      te: 'జిల్లాలు, పరిపాలన',
      ur: 'اضلاع اور انتظامیہ',
    },
    minutes: 8,
    blocks: [
      {
        kind: 'heading',
        text: {
          en: 'From ten districts to thirty-three',
          te: 'పది జిల్లాల నుండి ముప్పై మూడుకు',
          ur: 'دس اضلاع سے تینتیس تک',
        },
      },
      {
        kind: 'para',
        text: {
          en: 'Telangana was formed with ten districts. They were reorganised into 31 in October 2016, and Mulugu and Narayanpet were added in 2019, bringing the count to 33.',
          te: 'తెలంగాణ పది జిల్లాలతో ఏర్పడింది. 2016 అక్టోబర్‌లో వాటిని 31గా పునర్వ్యవస్థీకరించారు; 2019లో ములుగు, నారాయణపేట చేరడంతో సంఖ్య 33కి చేరింది.',
          ur: 'تلنگانہ دس اضلاع کے ساتھ وجود میں آئی۔ اکتوبر 2016 میں انہیں 31 میں تنظیمِ نو کیا گیا، اور 2019 میں ملوگو اور نارائن پیٹ کے اضافے سے تعداد 33 ہو گئی۔',
        },
      },
      {
        kind: 'para',
        text: {
          en: 'Revenue administration runs district, revenue division, mandal, village. The Collector heads the district, a Revenue Divisional Officer the division, and a Tahsildar the mandal.',
          te: 'రెవెన్యూ పరిపాలన జిల్లా, రెవెన్యూ డివిజన్, మండలం, గ్రామం అనే క్రమంలో నడుస్తుంది. జిల్లాకు కలెక్టర్, డివిజన్‌కు రెవెన్యూ డివిజనల్ ఆఫీసర్, మండలానికి తహసీల్దార్ అధిపతి.',
          ur: 'محصولات کی انتظامیہ ضلع، ریونیو ڈویژن، منڈل اور گاؤں کی ترتیب سے چلتی ہے۔ ضلع کا سربراہ کلکٹر، ڈویژن کا ریونیو ڈویژنل آفیسر اور منڈل کا تحصیلدار ہوتا ہے۔',
        },
      },
      {
        kind: 'para',
        text: {
          en: 'Police administration is the part a PWT candidate must know cold. The Director General of Police heads the force; a district is led by a Superintendent of Police, while the Hyderabad, Cyberabad and Rachakonda commissionerates are led by Commissioners.',
          te: 'PWT అభ్యర్థి కచ్చితంగా తెలుసుకోవాల్సిన భాగం పోలీసు పరిపాలన. డైరెక్టర్ జనరల్ ఆఫ్ పోలీస్ దళానికి అధిపతి; జిల్లాకు సూపరింటెండెంట్ ఆఫ్ పోలీస్ నాయకత్వం వహిస్తారు, హైదరాబాద్, సైబరాబాద్, రాచకొండ కమిషనరేట్లకు కమిషనర్లు అధిపతులు.',
          ur: 'PWT کے امیدوار کو پولیس انتظامیہ ازبر ہونی چاہیے۔ ڈائریکٹر جنرل آف پولیس محکمے کا سربراہ ہوتا ہے؛ ضلع کی قیادت سپرنٹنڈنٹ آف پولیس کرتا ہے، جبکہ حیدرآباد، سائبرآباد اور راچہ کنڈہ کمشنریٹس کے سربراہ کمشنر ہوتے ہیں۔',
        },
      },
      {
        kind: 'bullets',
        items: [
          {
            en: 'Police hierarchy in a district: SP → Additional SP → DSP (sub-division) → CI (circle) → SI (police station).',
            te: 'జిల్లాలో పోలీసు క్రమం: SP → అదనపు SP → DSP (సబ్ డివిజన్) → CI (సర్కిల్) → SI (పోలీస్ స్టేషన్).',
            // No arrows in this line on purpose: an arrow sitting between an Arabic word and a
            // Latin abbreviation is a bidi-mirrored neutral, so it flips and the chain reads
            // backwards. The order is spelled out in words instead.
            ur: 'ضلع میں پولیس کا درجہ اوپر سے نیچے: SP، پھر اضافی SP، پھر DSP (سب ڈویژن)، پھر CI (سرکل)، پھر SI (تھانہ)۔',
          },
          {
            en: 'The state has 119 assembly seats, 17 Lok Sabha seats and 7 Rajya Sabha seats.',
            te: 'రాష్ట్రంలో 119 అసెంబ్లీ స్థానాలు, 17 లోక్‌సభ స్థానాలు, 7 రాజ్యసభ స్థానాలు ఉన్నాయి.',
            ur: 'ریاست میں 119 اسمبلی نشستیں، 17 لوک سبھا اور 7 راجیہ سبھا نشستیں ہیں۔',
          },
          {
            en: 'Local bodies run in three tiers: gram panchayat, mandal parishad and zilla parishad.',
            te: 'స్థానిక సంస్థలు మూడు అంచెలుగా నడుస్తాయి: గ్రామ పంచాయతీ, మండల పరిషత్, జిల్లా పరిషత్.',
            ur: 'مقامی ادارے تین درجوں میں کام کرتے ہیں: گرام پنچایت، منڈل پریشد اور ضلع پریشد۔',
          },
          {
            en: 'Hyderabad is the state capital and the seat of the Telangana High Court, which was separated in 2019.',
            te: 'హైదరాబాద్ రాష్ట్ర రాజధాని; 2019లో విడిపోయిన తెలంగాణ హైకోర్టు కూడా ఇక్కడే ఉంది.',
            ur: 'حیدرآباد ریاست کا دارالحکومت اور تلنگانہ ہائی کورٹ کا مقام ہے، جو 2019 میں الگ ہوئی۔',
          },
        ],
      },
      {
        kind: 'example',
        text: {
          en: 'A question asks: "Who heads the police administration of a district in Telangana?" The options will offer Commissioner, DGP, SP and DSP. A district is headed by the Superintendent of Police; a Commissioner heads a commissionerate, which is a city, not a district.',
          te: 'ఒక ప్రశ్న: "తెలంగాణలో జిల్లా పోలీసు పరిపాలనకు ఎవరు అధిపతి?" ఆప్షన్లు కమిషనర్, డీజీపీ, SP, DSP ఇస్తాయి. జిల్లాకు సూపరింటెండెంట్ ఆఫ్ పోలీస్ అధిపతి; కమిషనర్ కమిషనరేట్‌కు అధిపతి, అది నగరం, జిల్లా కాదు.',
          ur: 'سوال: "تلنگانہ میں ضلع کی پولیس انتظامیہ کا سربراہ کون ہوتا ہے؟" آپشنز میں کمشنر، ڈی جی پی، SP اور DSP ہوں گے۔ ضلع کا سربراہ سپرنٹنڈنٹ آف پولیس ہے؛ کمشنر کمشنریٹ کا سربراہ ہوتا ہے، جو شہر ہے، ضلع نہیں۔',
        },
      },
      {
        kind: 'tip',
        text: {
          en: 'Learn the ranks with their insignia. Recruitment papers ask about the star-and-stripe badge as often as about the post itself.',
          te: 'హోదాలను వాటి చిహ్నాలతో కలిపి నేర్చుకోండి. రిక్రూట్‌మెంట్ పేపర్లు పదవి గురించి అడిగినంత తరచుగా నక్షత్రం–పట్టీ చిహ్నం గురించీ అడుగుతాయి.',
          ur: 'عہدوں کو ان کے نشانات کے ساتھ یاد کریں۔ بھرتی کے پرچے عہدے جتنا ہی اکثر ستارے اور پٹی کے بیج کے بارے میں پوچھتے ہیں۔',
        },
      },
    ],
  },
];

/** The study shelf, in the order the paper puts its sections. */
export const STUDY_SECTIONS: StudySection[] = [
  { id: 'arithmetic', labelKey: 'test.sections.arithmetic', topics: ARITHMETIC },
  { id: 'reasoning', labelKey: 'test.sections.reasoning', topics: REASONING },
  { id: 'gs', labelKey: 'test.sections.gs', topics: GENERAL_STUDIES },
  { id: 'telangana', labelKey: 'test.sections.telangana', topics: TELANGANA },
];

/** Every topic, flattened — the shape a lookup by id wants. */
export const STUDY_TOPICS: StudyTopic[] = STUDY_SECTIONS.flatMap((s) => s.topics);

/** Total reading time of a section, in minutes. */
export const studySectionMinutes = (section: StudySection): number =>
  section.topics.reduce((n, topic) => n + topic.minutes, 0);

/**
 * A topic and the section it belongs to, or `undefined` for an id that is not in the shelf.
 * The reader needs both — the section supplies the kicker above the title.
 */
export function findStudyTopic(
  id: string | undefined,
): { topic: StudyTopic; section: StudySection } | undefined {
  if (!id) return undefined;
  for (const section of STUDY_SECTIONS) {
    const topic = section.topics.find((t) => t.id === id);
    if (topic) return { topic, section };
  }
  return undefined;
}
