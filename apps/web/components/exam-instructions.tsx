'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { TestMeta } from '@tslprb/fixtures';
import { useLangStore } from '@/data/lang';
import type { AttemptState } from '@/data/attempt';
import { cellState, sectionCounts } from '@/data/attempt.selectors';
import { Button, useCopy } from './web-ui';
import { useStorageStatus } from './storage-notice';

const states = [
  ['a', 'answered'],
  ['na', 'notAnswered'],
  ['nv', 'notVisited'],
  ['m', 'marked'],
  ['am', 'both'],
] as const;

export function ExamLanguage() {
  const copy = useCopy();
  const { lang, setLang } = useLangStore();
  return (
    <label className="cbt-language">
      <span>{copy('View in', 'భాష')}</span>
      <select value={lang} onChange={(event) => setLang(event.target.value as 'en' | 'te')}>
        <option value="en">English</option>
        <option value="te">తెలుగు</option>
      </select>
    </label>
  );
}

export function ExamHeader({ title, children }: { title: string; children?: ReactNode }) {
  const copy = useCopy();
  const [fullscreen, setFullscreen] = useState(false);
  const [fullscreenError, setFullscreenError] = useState(false);
  useEffect(() => {
    const update = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', update);
    update();
    return () => document.removeEventListener('fullscreenchange', update);
  }, []);
  return (
    <header className="cbt-header">
      <div className="cbt-identity">
        <Image
          src="/brand/brolly-umbrella.png"
          alt="Brolly"
          width={40}
          height={40}
          priority
          unoptimized
        />
        <h1>{title}</h1>
      </div>
      {children}
      <Button
        className="cbt-fullscreen"
        variant="outline"
        onClick={async () => {
          try {
            if (document.fullscreenElement) await document.exitFullscreen();
            else await document.documentElement.requestFullscreen();
            setFullscreenError(false);
          } catch {
            setFullscreenError(true);
          }
        }}
      >
        {fullscreen
          ? copy('Exit full screen', 'పూర్తి స్క్రీన్ నుండి బయటకు')
          : copy('Full screen', 'పూర్తి స్క్రీన్')}
      </Button>
      {fullscreenError && (
        <p className="cbt-fullscreen-error" role="status">
          {copy(
            'Full screen is unavailable in this browser.',
            'ఈ బ్రౌజర్‌లో పూర్తి స్క్రీన్ అందుబాటులో లేదు.',
          )}
        </p>
      )}
    </header>
  );
}

export function Candidate({ compact = false }: { compact?: boolean }) {
  const copy = useCopy();
  return (
    <div className={`cbt-candidate${compact ? ' cbt-candidate-compact' : ''}`}>
      <div className="cbt-avatar" aria-hidden="true">
        <svg viewBox="0 0 48 48" fill="currentColor">
          <circle cx="24" cy="16" r="8" />
          <path d="M8 42v-5a16 16 0 0 1 32 0v5Z" />
        </svg>
      </div>
      <div>
        <strong>{copy('Candidate', 'అభ్యర్థి')}</strong>
        <span>{copy('Brolly exam practice', 'బ్రోలీ పరీక్ష సాధన')}</span>
      </div>
    </div>
  );
}

export function ExamLegend({ attempt }: { attempt?: AttemptState }) {
  const { t } = useTranslation();
  const stateCounts = { a: 0, na: 0, nv: 0, m: 0, am: 0 };
  if (attempt)
    for (let n = 1; n <= (attempt.pattern?.totalQuestions ?? 0); n++)
      stateCounts[cellState(attempt, n)]++;
  return (
    <ul className={`cbt-legend${attempt ? ' cbt-legend-counts' : ''}`}>
      {states.map(([state, label]) => (
        <li key={state}>
          <span className="cbt-state" data-state={state} aria-hidden={!attempt}>
            {attempt ? stateCounts[state] : state === 'am' ? '✓' : '1'}
          </span>
          <span>{t(`test.${label}`)}</span>
        </li>
      ))}
    </ul>
  );
}

export function GeneralInstructions() {
  const copy = useCopy();
  return (
    <div className="cbt-instruction-copy">
      <h3>{copy('General instructions', 'సాధారణ సూచనలు')}</h3>
      <ol>
        <li>
          {copy(
            'The countdown starts when you select “I am ready to begin”. The timer shows the time left. When it reaches zero, your test is submitted automatically.',
            '“పరీక్ష ప్రారంభించడానికి సిద్ధంగా ఉన్నాను” ఎంచుకున్నప్పుడు టైమర్ మొదలవుతుంది. మిగిలిన సమయం టైమర్‌లో కనిపిస్తుంది. సమయం ముగిసిన వెంటనే పరీక్ష స్వయంచాలకంగా సమర్పించబడుతుంది.',
          )}
        </li>
        <li>
          {copy(
            'The timer continues if you leave the test, reload, go offline or open instructions. Return to the same browser to resume your saved attempt.',
            'పరీక్ష నుండి బయటకు వెళ్లినా, రీలోడ్ చేసినా, ఆఫ్‌లైన్‌లో ఉన్నా లేదా సూచనలు తెరిచినా టైమర్ కొనసాగుతుంది. సేవ్ చేసిన పరీక్షను కొనసాగించడానికి ఇదే బ్రౌజర్‌కు తిరిగి రండి.',
          )}
        </li>
        <li>
          {copy(
            'The question palette uses these five states. Every question also has a number and an answer-state label.',
            'ప్రశ్నల జాబితాలో ఈ ఐదు స్థితులు కనిపిస్తాయి. ప్రతి ప్రశ్నకు సంఖ్య మరియు సమాధాన స్థితి లేబుల్ కూడా ఉంటాయి.',
          )}
          <ExamLegend />
        </li>
        <li>
          {copy(
            'Marking a question for review helps you find it later. An answer marked for review is still evaluated when you submit.',
            'ప్రశ్నను సమీక్ష కోసం గుర్తిస్తే తర్వాత సులభంగా కనుగొనవచ్చు. సమీక్ష కోసం గుర్తించిన సమాధానం కూడా సమర్పణలో మూల్యాంకనం చేయబడుతుంది.',
          )}
        </li>
      </ol>
      <h3>{copy('Navigating the test', 'పరీక్షలో నావిగేషన్')}</h3>
      <ol>
        <li>
          {copy(
            'Select a section or a question number to open it. Locked sections show their prerequisite; finish that section first.',
            'సెక్షన్ లేదా ప్రశ్న సంఖ్యను ఎంచుకుని తెరవండి. లాక్ చేసిన సెక్షన్‌ను తెరవడానికి అవసరమైన ముందరి సెక్షన్‌ను మొదట పూర్తి చేయండి.',
          )}
        </li>
        <li>
          {copy(
            'Save & Next moves to the next question. Mark for Review & Next flags this question and moves ahead. Previous returns to the preceding question.',
            '“సేవ్ చేసి తర్వాతి ప్రశ్న” తర్వాతి ప్రశ్నకు తీసుకెళ్తుంది. “సమీక్షకు గుర్తించి తర్వాతి ప్రశ్న” ఈ ప్రశ్నను గుర్తించి ముందుకు తీసుకెళ్తుంది. “మునుపటి”తో వెనుక ప్రశ్నకు వెళ్లవచ్చు.',
          )}
        </li>
        <li>
          {copy(
            'Use Question Paper to view the questions together, or Instructions to reopen these rules. Your timer keeps running.',
            'ప్రశ్నలను ఒకేచోట చూడటానికి “ప్రశ్నపత్రం”, ఈ నియమాలను మళ్లీ చూడటానికి “సూచనలు” ఎంచుకోండి. టైమర్ కొనసాగుతూనే ఉంటుంది.',
          )}
        </li>
      </ol>
      <h3>{copy('Answering and saving', 'సమాధానాలు మరియు సేవింగ్')}</h3>
      <ol>
        <li>
          {copy(
            'Select one option for each multiple-choice question. Select another option to change your answer, or Clear Response to remove it.',
            'ప్రతి బహుళైచ్ఛిక ప్రశ్నకు ఒక ఎంపికను ఎంచుకోండి. సమాధానాన్ని మార్చడానికి మరో ఎంపికను, తీసివేయడానికి “సమాధానం తొలగించు” ఎంచుకోండి.',
          )}
        </li>
        <li>
          {copy(
            'Answers save automatically in this browser as you select them, including when you navigate using the palette. If a saving warning appears, keep this tab open and retry saving before leaving.',
            'ఎంపిక చేసిన వెంటనే సమాధానాలు ఈ బ్రౌజర్‌లో స్వయంచాలకంగా సేవ్ అవుతాయి. ప్రశ్నల జాబితా ద్వారా మారినా అవి నిలిచి ఉంటాయి. సేవింగ్ హెచ్చరిక కనిపిస్తే ఈ ట్యాబ్‌ను తెరిచి ఉంచి, వెళ్లే ముందు సేవ్ చేయడానికి మళ్లీ ప్రయత్నించండి.',
          )}
        </li>
        <li>
          {copy(
            'You can change the question language between English and Telugu at any time. Your selected answers stay the same.',
            'ఎప్పుడైనా ప్రశ్న భాషను English లేదా తెలుగుకు మార్చవచ్చు. మీరు ఎంచుకున్న సమాధానాలు అలాగే ఉంటాయి.',
          )}
        </li>
        <li>
          {copy(
            'Submit Test opens a section-by-section summary. Check your unanswered questions before confirming. Submission makes your answers final.',
            '“పరీక్ష సమర్పించు” సెక్షన్ల వారీ సారాంశాన్ని చూపిస్తుంది. నిర్ధారించే ముందు సమాధానం ఇవ్వని ప్రశ్నలను చూడండి. సమర్పించిన తర్వాత సమాధానాలను మార్చలేరు.',
          )}
        </li>
      </ol>
    </div>
  );
}

export function TestInstructions({ meta }: { meta: TestMeta }) {
  const copy = useCopy();
  const { t } = useTranslation();
  const lang = useLangStore((s) => s.lang);
  const { pattern } = meta;
  return (
    <div className="cbt-instruction-copy">
      <h3 className="cbt-test-title">{meta.title[lang]}</h3>
      <dl className="cbt-test-facts">
        <div>
          <dt>{copy('Duration', 'వ్యవధి')}</dt>
          <dd>
            {pattern.durationMinutes} {copy('minutes', 'నిమిషాలు')}
          </dd>
        </div>
        <div>
          <dt>{copy('Maximum marks', 'గరిష్ఠ మార్కులు')}</dt>
          <dd>{pattern.totalQuestions * pattern.marksPerCorrect}</dd>
        </div>
      </dl>
      <h3>{copy('Test-specific instructions', 'ఈ పరీక్షకు సంబంధించిన సూచనలు')}</h3>
      <ul>
        <li>
          {copy(
            `This test contains ${pattern.totalQuestions} multiple-choice questions across ${pattern.sections.length} sections.`,
            `ఈ పరీక్షలో ${pattern.sections.length} సెక్షన్లలో ${pattern.totalQuestions} బహుళైచ్ఛిక ప్రశ్నలు ఉంటాయి.`,
          )}
        </li>
        <li>
          {copy(
            `Each correct answer earns ${pattern.marksPerCorrect} ${pattern.marksPerCorrect === 1 ? 'mark' : 'marks'}.`,
            `ప్రతి సరైన సమాధానానికి ${pattern.marksPerCorrect} మార్కులు లభిస్తాయి.`,
          )}
        </li>
        <li>
          {pattern.negativePerWrong === 0
            ? copy(
                'There is no negative marking. Unanswered questions earn zero marks.',
                'నెగటివ్ మార్కింగ్ లేదు. సమాధానం ఇవ్వని ప్రశ్నలకు సున్నా మార్కులు.',
              )
            : copy(
                `Wrong answers receive a penalty of ${pattern.negativePerWrong} marks. Unanswered questions earn zero marks.`,
                `ప్రతి తప్పు సమాధానానికి ${pattern.negativePerWrong} మార్కులు తగ్గుతాయి. సమాధానం ఇవ్వని ప్రశ్నలకు సున్నా మార్కులు.`,
              )}
        </li>
        <li>
          {copy(
            'This is a practice test. After submission, you can review solutions and choose to practise again.',
            'ఇది సాధన పరీక్ష. సమర్పించిన తర్వాత పరిష్కారాలను చూసి మళ్లీ సాధన చేయవచ్చు.',
          )}
        </li>
        {meta.demo && <li>{t('audit.demoPaperNote')}</li>}
      </ul>
      <div
        className="cbt-table-scroll"
        role="region"
        aria-label={copy('Test sections', 'పరీక్ష సెక్షన్లు')}
        tabIndex={0}
      >
        <table className="cbt-table">
          <thead>
            <tr>
              <th scope="col">{copy('Section', 'సెక్షన్')}</th>
              <th scope="col">{copy('Questions', 'ప్రశ్నలు')}</th>
              <th scope="col">{copy('Marks', 'మార్కులు')}</th>
            </tr>
          </thead>
          <tbody>
            {pattern.sections.map((section) => (
              <tr key={section.id}>
                <th scope="row">
                  {t(section.labelKey)}
                  {section.unlockAfter && (
                    <small>
                      {copy('Opens after completing', 'పూర్తి చేసిన తర్వాత తెరుచుకుంటుంది')}:{' '}
                      {t(`test.sections.${section.unlockAfter}`)}
                    </small>
                  )}
                </th>
                <td>{section.questions}</td>
                <td>{section.questions * pattern.marksPerCorrect}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ExamPreparation({
  meta,
  starting,
  onBegin,
}: {
  meta: TestMeta;
  starting: boolean;
  onBegin: () => void;
}) {
  const copy = useCopy();
  const lang = useLangStore((s) => s.lang);
  const storageStatus = useStorageStatus();
  const [step, setStep] = useState(0);
  const [agreed, setAgreed] = useState(false);
  const [testLanguage, setTestLanguage] = useState<'en' | 'te' | ''>('');
  const heading = useRef<HTMLHeadingElement>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const changeStep = (next: number) => {
    setStep(next);
    requestAnimationFrame(() => {
      scroll.current?.scrollTo(0, 0);
      heading.current?.focus();
    });
  };
  return (
    <div className="cbt-shell cbt-preparation">
      <ExamHeader title={meta.title[lang]}>
        <ExamLanguage />
      </ExamHeader>
      <div className="cbt-prep-layout">
        <div className="cbt-prep-main">
          <div className="cbt-prep-scroll" ref={scroll}>
            <div className="cbt-step-heading">
              <span>{copy(`Step ${step + 1} of 2`, `దశ ${step + 1} / 2`)}</span>
              <h2 ref={heading} tabIndex={-1}>
                {step === 0
                  ? copy('Instructions', 'సూచనలు')
                  : copy('Before you begin', 'ప్రారంభించే ముందు')}
              </h2>
            </div>
            {step === 0 ? (
              <GeneralInstructions />
            ) : (
              <>
                <TestInstructions meta={meta} />
                <div className="cbt-declaration">
                  <label className="cbt-language">
                    <span>{copy('Test language', 'పరీక్ష భాష')}</span>
                    <select
                      required
                      value={testLanguage}
                      aria-describedby="exam-language-hint"
                      onChange={(event) => setTestLanguage(event.target.value as 'en' | 'te')}
                    >
                      <option value="" disabled>
                        {copy('Select language', 'భాష ఎంచుకోండి')}
                      </option>
                      <option value="en">English</option>
                      <option value="te">తెలుగు</option>
                    </select>
                  </label>
                  <p id="exam-language-hint">
                    {copy(
                      'Choose English or Telugu to begin. You can change the language during the test; your answers will be preserved.',
                      'ప్రారంభించడానికి English లేదా తెలుగు ఎంచుకోండి. పరీక్ష సమయంలో భాష మార్చవచ్చు; మీ సమాధానాలు అలాగే ఉంటాయి.',
                    )}
                  </p>
                  <label className="cbt-agreement">
                    <input
                      type="checkbox"
                      checked={agreed}
                      onChange={(event) => setAgreed(event.target.checked)}
                    />
                    <span>
                      {copy(
                        'I have read and understood the instructions and agree to begin this practice test.',
                        'నేను సూచనలను చదివి అర్థం చేసుకున్నాను. ఈ సాధన పరీక్షను ప్రారంభించడానికి అంగీకరిస్తున్నాను.',
                      )}
                    </span>
                  </label>
                  {storageStatus === 'temporary' && (
                    <p role="alert">
                      {copy(
                        'Browser saving is unavailable. Your attempt will be held in this tab only until saving is restored.',
                        'బ్రౌజర్‌లో సేవ్ చేయడం సాధ్యం కావడం లేదు. సేవింగ్ పునరుద్ధరించే వరకు మీ పరీక్ష ఈ ట్యాబ్‌లో మాత్రమే ఉంటుంది.',
                      )}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
          <footer className="cbt-prep-footer">
            {step === 0 ? (
              <Button variant="ghost" asChild>
                <Link href="/tests">← {copy('Go to Tests', 'పరీక్షలకు వెళ్లండి')}</Link>
              </Button>
            ) : (
              <Button variant="outline" disabled={starting} onClick={() => changeStep(0)}>
                ← {copy('Previous', 'మునుపటి')}
              </Button>
            )}
            {step === 0 ? (
              <Button onClick={() => changeStep(1)}>{copy('Next', 'తర్వాతి')} →</Button>
            ) : (
              <Button
                disabled={!testLanguage || !agreed || starting}
                onClick={() => {
                  if (!testLanguage || !agreed || starting) return;
                  useLangStore.getState().setLang(testLanguage);
                  onBegin();
                }}
              >
                {starting
                  ? copy('Starting…', 'ప్రారంభమవుతోంది…')
                  : copy('I am ready to begin', 'పరీక్ష ప్రారంభించడానికి సిద్ధంగా ఉన్నాను')}
              </Button>
            )}
          </footer>
        </div>
        <aside className="cbt-prep-aside">
          <Candidate />
          <p>
            {copy(
              'Your timer starts only when you begin the test.',
              'మీరు పరీక్ష ప్రారంభించినప్పుడే టైమర్ మొదలవుతుంది.',
            )}
          </p>
        </aside>
      </div>
    </div>
  );
}

export function SubmitSummary({ attempt }: { attempt: AttemptState }) {
  const copy = useCopy();
  const { t } = useTranslation();
  return (
    <div className="cbt-submit-summary">
      <div
        className="cbt-table-scroll"
        role="region"
        aria-label={copy('Submission summary by section', 'సెక్షన్ల వారీ సమర్పణ సారాంశం')}
        tabIndex={0}
      >
        <table className="cbt-table">
          <thead>
            <tr>
              {[
                copy('Section', 'సెక్షన్'),
                copy('No. of questions', 'ప్రశ్నల సంఖ్య'),
                t('test.answered'),
                t('test.notAnswered'),
                t('test.marked'),
                t('test.notVisited'),
              ].map((label) => (
                <th scope="col" key={label}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {attempt.pattern?.sections.map((section, index) => {
              const total = sectionCounts(attempt, index);
              return (
                <tr key={section.id}>
                  <th scope="row">{t(section.labelKey)}</th>
                  <td>{section.questions}</td>
                  <td>{total.answered}</td>
                  <td>{total.notAnswered}</td>
                  <td>{total.marked}</td>
                  <td>{total.notVisited}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="muted">
        {copy(
          'Not Answered counts opened questions without a response. Not Visited counts unopened questions. Review flags can overlap either answered or unanswered questions; marked answers are evaluated.',
          '“సమాధానం ఇవ్వలేదు” అనేది తెరిచి సమాధానం ఇవ్వని ప్రశ్నల సంఖ్య. “చూడలేదు” అనేది తెరవని ప్రశ్నల సంఖ్య. సమీక్షకు గుర్తించిన ప్రశ్నలకు సమాధానం ఉండవచ్చు లేదా ఉండకపోవచ్చు; గుర్తించిన సమాధానాలు కూడా మూల్యాంకనం చేయబడతాయి.',
        )}
      </p>
    </div>
  );
}
