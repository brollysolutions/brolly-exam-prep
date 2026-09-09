'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { firstQuestionOf, type Question } from '@tslprb/fixtures';
import { TESTS, isImportedTest } from '@/lib/test-catalog';
import { useAttemptStore, type Choice } from '@/data/attempt';
import {
  cellState,
  counts,
  isSectionLocked,
  sectionOf,
  sectionRange,
} from '@/data/attempt.selectors';
import { useLangStore } from '@/data/lang';
import { useCompletedTestsStore } from '@/data/completedTests';
import { useActivityStore } from '@/data/activity';
import { getApi } from '@/data/api';
import { saveCompletedAttempt } from '@/data/complete';
import {
  buildSolutionRows,
  filterSolutionRows,
  type SolutionFilter,
} from '@/features/result/solutions';
import { attemptHref, solutionsHref } from '@/lib/routes';
import { BackLink, Button, Empty, Modal, Notice, PageTitle, useCopy } from './web-ui';

import { useStorageStatus } from './storage-notice';
import {
  Candidate,
  ExamHeader,
  ExamLanguage,
  ExamLegend,
  ExamPreparation,
  GeneralInstructions,
  SubmitSummary,
  TestInstructions,
} from './exam-instructions';

const clock = (sec: number) =>
  `${String(Math.floor(sec / 3600)).padStart(2, '0')}:${String(Math.floor(sec / 60) % 60).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;

export function Exam({ id }: { id: string }) {
  const { t } = useTranslation();
  const meta = TESTS.find((test) => test.id === id);
  if (!meta || !meta.free)
    return (
      <>
        <BackLink href="/tests" />
        <Empty>{t(meta ? 'library.lockedToast' : 'paper.notFound')}</Empty>
      </>
    );
  return <Attempt id={id} />;
}

function Attempt({ id }: { id: string }) {
  const { t } = useTranslation();
  const copy = useCopy();
  const router = useRouter();
  const attempt = useAttemptStore();
  const storageStatus = useStorageStatus();
  const lang = useLangStore((s) => s.lang);
  const [paper, setPaper] = useState<Question[]>([]);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const [now, setNow] = useState(Date.now);
  const [offline, setOffline] = useState(() => !navigator.onLine);
  const [dialog, setDialog] = useState<'submit' | 'exit' | 'resume' | null>(null);
  const [palette, setPalette] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [finished, setFinished] = useState(false);
  const [preparingRetake, setPreparingRetake] = useState(false);
  const [starting, setStarting] = useState(false);
  const [resource, setResource] = useState<'instructions' | 'paper' | null>(null);
  const [sidebarHidden, setSidebarHidden] = useState(false);
  const [message, setMessage] = useState('');
  const meta = TESTS.find((test) => test.id === id)!;
  const active = attempt.testId === id && attempt.status === 'running';
  const remaining = Math.max(0, Math.ceil(((attempt.endsAt ?? now) - now) / 1000));
  const loaded = paper.length === meta.pattern.totalQuestions;
  const syncChain = useRef(Promise.resolve());
  const questionHeading = useRef<HTMLLegendElement>(null);
  const mounted = useRef(true);
  const startPending = useRef(false);
  const focusPending = useRef(false);
  const currentQuestion = attempt.current;
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (!focusPending.current || palette || resource) return;
    // Wait for the palette dialog to restore its opener before focusing the new question.
    const frame = requestAnimationFrame(() => {
      questionHeading.current?.focus({ preventScroll: true });
      questionHeading.current?.scrollIntoView({ block: 'start' });
      focusPending.current = false;
    });
    return () => cancelAnimationFrame(frame);
  }, [currentQuestion, palette, resource]);

  const start = useCallback(
    async (isCurrent: () => boolean = () => true) => {
      if (!isCurrent()) return;
      if (useAttemptStore.getState().status === 'running') return;
      if (isImportedTest(id)) {
        useAttemptStore.getState().start(meta);
        return;
      }
      try {
        const created = await getApi().createAttempt({ test_id: id });
        if (!isCurrent()) return;
        // Never let a delayed response replace an attempt started while it was in flight.
        const current = useAttemptStore.getState();
        if (current.status !== 'running')
          current.start(meta, { attemptId: created.id, endsAt: Date.parse(created.ends_at) });
      } catch {
        if (!isCurrent()) return;
        const current = useAttemptStore.getState();
        if (current.status !== 'running') current.start(meta);
      }
    },
    [id, meta],
  );

  useEffect(() => {
    let live = true;
    void getApi()
      .getPaper(id)
      .then((questions) => {
        if (!live) return;
        setPaper(questions);
        setFailed(false);
        const current = useAttemptStore.getState();
        if (current.status === 'running') {
          if (current.testId !== id) setConflict(true);
          else if ((current.endsAt ?? 0) > Date.now()) setDialog('resume');
        }
      })
      .catch(() => {
        if (live) setFailed(true);
      });
    return () => {
      live = false;
    };
  }, [id, retry]);

  const finish = useCallback(
    (automatic: boolean) => {
      const current = useAttemptStore.getState();
      if (current.testId !== id || current.status !== 'running' || !loaded) return;
      if (automatic || (current.endsAt ?? Infinity) <= Date.now()) current.autoSubmit();
      else current.submit();
      saveCompletedAttempt(paper);
      setDialog(null);
      setResource(null);
      setPalette(false);
      setFinished(true);
      if (current.attemptId && !isImportedTest(id) && !current.attemptId.startsWith('local-')) {
        const attemptId = current.attemptId;
        // Flush the final snapshot in order before submission so quick edits cannot race it.
        syncChain.current = syncChain.current
          .catch(() => undefined)
          .then(async () => {
            for (let n = 1; n <= paper.length; n++) {
              if (current.visited[n] || current.answers[n] !== undefined || current.marked[n])
                await getApi().patchAttemptAnswer(attemptId, {
                  question_id: paper[n - 1].id,
                  choice: current.answers[n] ?? null,
                  marked: current.marked[n] === true,
                });
            }
            await getApi().submitAttempt(attemptId);
          })
          .catch(() => undefined);
      }
    },
    [id, loaded, paper],
  );

  useEffect(() => {
    const tick = () => {
      const instant = Date.now();
      setNow(instant);
      setOffline(!navigator.onLine);
      const state = useAttemptStore.getState();
      if (
        state.testId === id &&
        state.status === 'running' &&
        state.endsAt !== undefined &&
        instant >= state.endsAt
      )
        finish(true);
    };
    tick();
    const interval = setInterval(tick, 500);
    window.addEventListener('focus', tick);
    window.addEventListener('online', tick);
    window.addEventListener('offline', tick);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', tick);
      window.removeEventListener('online', tick);
      window.removeEventListener('offline', tick);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [id, finish]);
  useEffect(() => {
    if (!active) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [active]);

  const canWrite = () => {
    const state = useAttemptStore.getState();
    if (state.testId !== id || state.status !== 'running') return false;
    // Called only by input handlers; use the real deadline even between timer ticks.
    // eslint-disable-next-line react-hooks/purity
    if ((state.endsAt ?? 0) <= Date.now()) {
      finish(true);
      return false;
    }
    return true;
  };
  const patch = (n: number) => {
    const state = useAttemptStore.getState();
    const question = paper[n - 1];
    if (isImportedTest(id) || !state.attemptId || state.attemptId.startsWith('local-') || !question)
      return;
    const attemptId = state.attemptId;
    const body = {
      question_id: question.id,
      choice: state.answers[n] ?? null,
      marked: state.marked[n] === true,
    };
    syncChain.current = syncChain.current
      .catch(() => undefined)
      .then(() => getApi().patchAttemptAnswer(attemptId, body))
      .then(() => undefined)
      .catch(() => undefined);
  };
  const answer = (choice: Choice) => {
    if (!canWrite()) return;
    const state = useAttemptStore.getState();
    const n = state.current;
    const previous = state.answers[n];
    state.answer(n, choice);
    if (previous === undefined && useAttemptStore.getState().answers[n] !== undefined)
      useActivityStore.getState().bump('answered');
    patch(n);
  };
  const go = (n: number) => {
    if (!canWrite()) return;
    const state = useAttemptStore.getState();
    focusPending.current = true;
    const outcome = state.goto(n);
    if (outcome === 'locked') {
      focusPending.current = false;
      const section = meta.pattern.sections[sectionOf(state, n)];
      setMessage(
        t('test.lockedMsg', {
          section: t(section.labelKey),
          previous: t(`test.sections.${section.unlockAfter}`),
        }),
      );
    } else {
      setMessage('');
      setPalette(false);
      setResource(null);
      window.scrollTo(0, 0);
    }
  };

  if (
    finished ||
    (!preparingRetake &&
      attempt.testId === id &&
      ['submitted', 'autoSubmitted'].includes(attempt.status) &&
      loaded)
  )
    return (
      <Results
        id={id}
        autoSubmitted={attempt.status === 'autoSubmitted'}
        onRetake={() => {
          setFinished(false);
          setPreparingRetake(true);
        }}
      />
    );
  if (failed)
    return (
      <>
        <BackLink href="/tests" />
        <Notice error>{t('paper.notFound')}</Notice>
        <Button onClick={() => setRetry(retry + 1)}>{t('result.retry')}</Button>
      </>
    );
  if (conflict)
    return (
      <div className="narrow">
        <PageTitle title={copy('A test is already running', 'ఒక పరీక్ష ఇప్పటికే జరుగుతోంది')} />
        <Notice>
          {copy(
            'You can resume it, or replace it with this test. Replacing it discards that unfinished attempt.',
            'దాన్ని కొనసాగించవచ్చు లేదా ఈ పరీక్షతో భర్తీ చేయవచ్చు. భర్తీ చేస్తే అసంపూర్తి పరీక్ష తొలగించబడుతుంది.',
          )}
        </Notice>
        <div className="actions">
          <Button asChild>
            <Link href={attemptHref(attempt.testId!)}>{t('test.resume')}</Link>
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              useAttemptStore.getState().reset();
              setConflict(false);
              setPreparingRetake(false);
            }}
          >
            {copy('Replace unfinished test', 'అసంపూర్తి పరీక్షను భర్తీ చేయండి')}
          </Button>
        </div>
      </div>
    );
  if (!loaded)
    return <Notice>{copy('Loading your paper…', 'మీ ప్రశ్నపత్రం లోడ్ అవుతోంది…')}</Notice>;
  if (!active)
    return (
      <ExamPreparation
        meta={meta}
        starting={starting}
        onBegin={() => {
          if (startPending.current) return;
          const current = useAttemptStore.getState();
          if (current.status === 'running') {
            if (current.testId !== id) setConflict(true);
            return;
          }
          startPending.current = true;
          setStarting(true);
          void start(() => mounted.current).finally(() => {
            startPending.current = false;
            if (mounted.current) {
              setStarting(false);
              setPreparingRetake(false);
              setNow(Date.now());
            }
          });
        }}
      />
    );
  const q = paper[attempt.current - 1];
  const totals = counts(attempt);
  const sectionIndex = sectionOf(attempt, attempt.current);
  const range = sectionRange(meta.pattern, sectionIndex);
  const openSummary = () => {
    if (canWrite()) setDialog('submit');
  };
  const next = () => {
    if (attempt.current < paper.length) go(attempt.current + 1);
    else openSummary();
  };
  const paletteContent = (
    <div className="cbt-palette-content">
      <ExamLegend attempt={attempt} />
      <label className="cbt-palette-section">
        <span>{copy('Section', 'సెక్షన్')}</span>
        <select
          value={sectionIndex}
          onChange={(event) => go(firstQuestionOf(meta.pattern, Number(event.target.value)))}
        >
          {meta.pattern.sections.map((section, index) => (
            <option key={section.id} value={index}>
              {t(section.labelKey)}
              {isSectionLocked(attempt, index) ? ' · ' + t('test.locked') : ''}
            </option>
          ))}
        </select>
      </label>
      <div className="question-palette cbt-palette">
        {paper.slice(range.first - 1, range.last).map((_, index) => {
          const n = range.first + index;
          return (
            <button
              key={n}
              type="button"
              data-state={cellState(attempt, n)}
              aria-current={attempt.current === n ? 'step' : undefined}
              aria-label={
                t('test.qLabel') +
                ' ' +
                n +
                ', ' +
                t(
                  'test.' +
                    (
                      {
                        a: 'answered',
                        na: 'notAnswered',
                        m: 'marked',
                        nv: 'notVisited',
                        am: 'both',
                      } as const
                    )[cellState(attempt, n)],
                )
              }
              onClick={() => go(n)}
            >
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );
  const resources = (
    <div className="cbt-resource-buttons">
      <Button
        variant="outline"
        onClick={() => {
          setPalette(false);
          setResource('paper');
        }}
      >
        {copy('Question Paper', 'ప్రశ్నపత్రం')}
      </Button>
      <Button
        variant="outline"
        onClick={() => {
          setPalette(false);
          setResource('instructions');
        }}
      >
        {copy('Instructions', 'సూచనలు')}
      </Button>
    </div>
  );
  return (
    <div className="cbt-shell cbt-workspace">
      <ExamHeader title={meta.title[lang]}>
        <div
          className={'timer' + (remaining <= 60 ? ' timer-critical' : '')}
          role="timer"
          aria-label={t('test.timeLeft')}
        >
          <small>{t('test.timeLeft')}</small>
          <strong>{clock(remaining)}</strong>
        </div>
        <Button variant="ghost" onClick={() => setDialog('exit')}>
          {copy('Exit test', 'బయటకు')}
        </Button>
      </ExamHeader>
      <div className="cbt-alerts">
        {meta.demo && <Notice>{t('audit.demoPaperNote')}</Notice>}
        {offline && <Notice>{t('test.offline')}</Notice>}
        {remaining <= 300 && (
          <Notice error={remaining <= 60}>
            {t(remaining <= 60 ? 'test.warn1' : 'test.warn5')}
          </Notice>
        )}
        {message && <Notice>{message}</Notice>}
      </div>
      <div className="cbt-work-grid" data-sidebar-hidden={sidebarHidden}>
        <section
          className="cbt-question-pane"
          aria-label={copy('Question workspace', 'ప్రశ్న కార్యస్థలం')}
        >
          <nav className="cbt-sections" aria-label={copy('Test sections', 'పరీక్ష సెక్షన్లు')}>
            <span>{copy('Sections', 'సెక్షన్లు')}</span>
            {meta.pattern.sections.map((section, index) => (
              <Button
                key={section.id}
                variant={q.section === section.id ? 'default' : 'ghost'}
                aria-pressed={q.section === section.id}
                onClick={() => go(firstQuestionOf(meta.pattern, index))}
              >
                {t(section.labelKey)}
                {isSectionLocked(attempt, index) && ' · ' + t('test.locked')}
              </Button>
            ))}
          </nav>
          <div className="cbt-question-meta">
            <strong>
              {t('test.qLabel')} {attempt.current} <span className="muted">/ {paper.length}</span>
            </strong>
            <div className="cbt-marks">
              <span>{copy('Marks', 'మార్కులు')}</span>
              <div>
                <b
                  aria-label={
                    copy('Correct answer', 'సరైన సమాధానం') + ': +' + meta.pattern.marksPerCorrect
                  }
                >
                  +{meta.pattern.marksPerCorrect}
                </b>
                <b
                  data-negative={meta.pattern.negativePerWrong > 0}
                  aria-label={
                    copy('Wrong answer penalty', 'తప్పు సమాధానానికి కోత') +
                    ': ' +
                    meta.pattern.negativePerWrong
                  }
                >
                  {meta.pattern.negativePerWrong > 0 ? '−' + meta.pattern.negativePerWrong : '0'}
                </b>
              </div>
            </div>
            <div className="cbt-question-time">
              <span>{t('test.timeOnQ')}</span>
              <span>
                {clock(Math.max(0, Math.floor((now - (attempt.currentEnteredAt ?? now)) / 1000)))}
              </span>
            </div>
            <ExamLanguage />
          </div>
          <div className="cbt-question-scroll">
            <fieldset className="answer-group">
              <legend ref={questionHeading} tabIndex={-1} className="question-text">
                <span className="sr-only">
                  {t('test.qLabel')} {attempt.current} / {paper.length}.{' '}
                </span>
                {q.text[lang]}
              </legend>
              {q.options[lang].map((option, index) => (
                <label
                  className="answer-option"
                  data-selected={attempt.answers[attempt.current] === index}
                  key={index}
                >
                  <input
                    type="radio"
                    name={q.id}
                    checked={attempt.answers[attempt.current] === index}
                    onChange={() => answer(index as Choice)}
                  />
                  <span className="option-key">{'ABCD'[index]}.</span>
                  <span>{option}</span>
                </label>
              ))}
            </fieldset>
            <p className="cbt-save-note">
              {storageStatus === 'temporary'
                ? copy(
                    'Saving unavailable · Keep this tab open and retry saving.',
                    'సేవింగ్ అందుబాటులో లేదు · ఈ ట్యాబ్‌ను తెరిచి ఉంచి మళ్లీ ప్రయత్నించండి.',
                  )
                : copy(
                    'Answers save automatically in this browser.',
                    'సమాధానాలు ఈ బ్రౌజర్‌లో స్వయంచాలకంగా సేవ్ అవుతాయి.',
                  )}
            </p>
            {attempt.marked[attempt.current] && (
              <Button
                variant="ghost"
                onClick={() => {
                  if (canWrite()) {
                    attempt.toggleMark(attempt.current);
                    patch(attempt.current);
                  }
                }}
              >
                {t('test.unmark')}
              </Button>
            )}
          </div>
          <footer className="cbt-exam-footer">
            <div className="cbt-answer-actions">
              <Button
                variant="outline"
                onClick={() => {
                  if (!canWrite()) return;
                  if (!attempt.marked[attempt.current]) attempt.toggleMark(attempt.current);
                  patch(attempt.current);
                  next();
                }}
              >
                {copy('Mark for Review & Next', 'సమీక్షకు గుర్తించి తర్వాతి ప్రశ్న')}
              </Button>
              <Button
                variant="outline"
                disabled={attempt.answers[attempt.current] === undefined}
                onClick={() => {
                  if (canWrite()) {
                    attempt.clear(attempt.current);
                    patch(attempt.current);
                  }
                }}
              >
                {copy('Clear Response', 'సమాధానం తొలగించు')}
              </Button>
            </div>
            <div className="cbt-navigation-actions">
              <Button
                variant="ghost"
                disabled={attempt.current === 1}
                onClick={() => go(attempt.current - 1)}
              >
                {t('test.previous')}
              </Button>
              <Button onClick={next}>
                {attempt.current === paper.length
                  ? copy('Review & submit', 'సమీక్షించి సమర్పించు')
                  : copy('Save & Next', 'సేవ్ చేసి తర్వాతి ప్రశ్న')}
              </Button>
            </div>
            <div className="cbt-mobile-actions">
              <Button variant="outline" onClick={() => setPalette(true)}>
                {t('test.palette')}
              </Button>
              <Button variant="outline" onClick={openSummary}>
                {t('test.submit')} ({totals.answered}/{paper.length})
              </Button>
            </div>
          </footer>
        </section>
        <Button
          className="cbt-sidebar-toggle"
          variant="outline"
          aria-expanded={!sidebarHidden}
          aria-controls="exam-sidebar"
          aria-label={
            sidebarHidden
              ? copy('Show question sidebar', 'ప్రశ్నల సైడ్‌బార్ చూపించు')
              : copy('Hide question sidebar', 'ప్రశ్నల సైడ్‌బార్ దాచు')
          }
          onClick={() => setSidebarHidden(!sidebarHidden)}
        >
          {sidebarHidden ? '‹' : '›'}
        </Button>
        <aside
          id="exam-sidebar"
          className="cbt-sidebar"
          aria-label={t('test.palette')}
          hidden={sidebarHidden}
        >
          <Candidate compact />
          {paletteContent}
          <footer className="cbt-sidebar-footer">
            {resources}
            <Button onClick={openSummary}>{t('test.submit')}</Button>
          </footer>
        </aside>
      </div>
      {palette && (
        <Modal title={t('test.palette')} onClose={() => setPalette(false)}>
          {paletteContent}
          {message && <Notice>{message}</Notice>}
          {resources}
        </Modal>
      )}
      {resource && (
        <Modal
          title={
            resource === 'paper'
              ? copy('Question Paper', 'ప్రశ్నపత్రం')
              : copy('Instructions', 'సూచనలు')
          }
          onClose={() => setResource(null)}
        >
          <p className="muted">
            {copy('Your timer is still running.', 'మీ టైమర్ కొనసాగుతోంది.')} {t('test.timeLeft')}:{' '}
            {clock(remaining)}
          </p>
          {resource === 'instructions' ? (
            <>
              <TestInstructions meta={meta} />
              <GeneralInstructions />
            </>
          ) : (
            <div className="cbt-paper-preview">
              <p>
                {copy(
                  'Select a question to return to the test. Solutions become available after submission.',
                  'పరీక్షకు తిరిగి వెళ్లడానికి ప్రశ్నను ఎంచుకోండి. సమర్పించిన తర్వాత పరిష్కారాలు అందుబాటులోకి వస్తాయి.',
                )}
              </p>
              {meta.pattern.sections.map((section, index) => {
                const bounds = sectionRange(meta.pattern, index);
                const locked = isSectionLocked(attempt, index);
                return (
                  <section key={section.id}>
                    <h3>
                      {t(section.labelKey)}
                      {locked ? ' · ' + t('test.locked') : ''}
                    </h3>
                    {!locked && (
                      <ol start={bounds.first}>
                        {paper.slice(bounds.first - 1, bounds.last).map((question, offset) => (
                          <li key={question.id}>
                            <button type="button" onClick={() => go(bounds.first + offset)}>
                              <span className="sr-only">
                                {t('test.qLabel')} {bounds.first + offset}.{' '}
                              </span>
                              {question.text[lang]}
                            </button>
                            <ol type="A">
                              {question.options[lang].map((option, optionIndex) => (
                                <li key={optionIndex}>{option}</li>
                              ))}
                            </ol>
                          </li>
                        ))}
                      </ol>
                    )}
                  </section>
                );
              })}
            </div>
          )}
        </Modal>
      )}
      {dialog && (
        <Modal
          title={
            dialog === 'resume'
              ? copy('Continue your test', 'మీ పరీక్షను కొనసాగించండి')
              : dialog === 'submit'
                ? copy('Submit your test', 'మీ పరీక్షను సమర్పించండి')
                : t('test.exitTitle')
          }
          onClose={() => setDialog(null)}
        >
          <p>
            {storageStatus === 'temporary'
              ? copy(
                  'Recent answers are held in this tab only. Retry saving before leaving or reloading. Submission makes answers final, but the result cannot be guaranteed saved until browser saving recovers.',
                  'ఇటీవలి సమాధానాలు ఈ ట్యాబ్‌లో మాత్రమే ఉన్నాయి. వెళ్లే ముందు లేదా రీలోడ్ చేసే ముందు సేవ్ చేయడానికి మళ్లీ ప్రయత్నించండి. సమర్పణతో సమాధానాలు ఖరారవుతాయి; నిల్వ మళ్లీ పని చేసే వరకు ఫలితం సేవ్ అవుతుందని హామీ లేదు.',
                )
              : dialog === 'submit'
                ? copy(
                    'Your answers will be final. A result will be saved in this browser even if you are offline.',
                    'మీ సమాధానాలు తుది నిర్ణయం అవుతాయి. ఆఫ్‌లైన్‌లో ఉన్నా ఫలితం ఈ బ్రౌజర్‌లో సేవ్ అవుతుంది.',
                  )
                : dialog === 'resume'
                  ? copy(
                      'The timer kept running. Continue from the last saved question.',
                      'టైమర్ కొనసాగుతూనే ఉంది. చివరిగా సేవ్ చేసిన ప్రశ్న నుండి కొనసాగించండి.',
                    )
                  : copy(
                      'The timer will keep running. You can return to this saved attempt in this browser.',
                      'టైమర్ కొనసాగుతూనే ఉంటుంది. ఈ బ్రౌజర్‌లో సేవ్ చేసిన ఈ ప్రయత్నానికి తిరిగి రావచ్చు.',
                    )}
          </p>
          {dialog === 'submit' && <SubmitSummary attempt={attempt} />}
          <div className="actions cbt-dialog-actions">
            <Button variant="outline" onClick={() => setDialog(null)}>
              {dialog === 'submit'
                ? copy('Close', 'మూసివేయి')
                : t(dialog === 'exit' ? 'test.stay' : 'test.resume')}
            </Button>
            {dialog === 'submit' && (
              <Button onClick={() => finish(false)}>{t('test.submitYes')}</Button>
            )}
            {dialog === 'exit' && (
              <Button variant="destructive" onClick={() => router.push('/tests')}>
                {t('test.leave')}
              </Button>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

export function Results({
  id,
  solutions = false,
  autoSubmitted = false,
  onRetake,
}: {
  id: string;
  solutions?: boolean;
  autoSubmitted?: boolean;
  onRetake?: () => void;
}) {
  const { t } = useTranslation();
  const copy = useCopy();
  const lang = useLangStore((s) => s.lang);
  const attempt = useAttemptStore();
  const storageStatus = useStorageStatus();
  const completed = useCompletedTestsStore((s) => s.tests[id]);
  const [paper, setPaper] = useState<Question[]>([]);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const [filter, setFilter] = useState<SolutionFilter>('wrong');
  const [page, setPage] = useState(0);
  const [showSolutions, setShowSolutions] = useState(solutions);
  useEffect(() => {
    let live = true;
    void getApi()
      .getPaper(id)
      .then((questions) => {
        if (live) {
          setPaper(questions);
          setFailed(false);
          if (useAttemptStore.getState().testId === id) saveCompletedAttempt(questions);
        }
      })
      .catch(() => {
        if (live) setFailed(true);
      });
    return () => {
      live = false;
    };
  }, [id, retry]);
  if (attempt.testId === id && attempt.status === 'running')
    return (
      <>
        <BackLink href="/tests" />
        <Notice>
          {copy(
            'Submit this attempt before viewing results or solutions.',
            'ఫలితాలు లేదా వివరణలను చూడటానికి ముందు ఈ ప్రయత్నాన్ని సమర్పించండి.',
          )}
        </Notice>
        <Button asChild>
          <Link href={attemptHref(id)}>{t('test.resume')}</Link>
        </Button>
      </>
    );
  if (failed)
    return (
      <>
        <Notice error>{t('result.loadError')}</Notice>
        <Button onClick={() => setRetry(retry + 1)}>{t('result.retry')}</Button>
      </>
    );
  if (!paper.length) return <Notice>{copy('Loading result…', 'ఫలితం లోడ్ అవుతోంది…')}</Notice>;
  if (!completed)
    return (
      <>
        <BackLink href="/tests" />
        <Empty>
          {copy(
            'No submitted attempt is saved for this paper.',
            'ఈ ప్రశ్నపత్రానికి సమర్పించిన ప్రయత్నం సేవ్ కాలేదు.',
          )}
        </Empty>
        <Link href="/tests">{t('library.title')}</Link>
      </>
    );
  const result = completed.result;
  const rows = filterSolutionRows(buildSolutionRows(result.review, paper), filter);
  const title = result.title?.[lang] ?? TESTS.find((test) => test.id === id)?.title[lang] ?? id;
  return (
    <>
      <BackLink href="/tests" />
      <PageTitle
        title={showSolutions ? t('solutions.title') : title}
        sub={showSolutions ? title : copy('Practice result', 'సాధన ఫలితం')}
      />
      {TESTS.find((test) => test.id === id)?.demo && <Notice>{t('audit.demoPaperNote')}</Notice>}
      {autoSubmitted && <Notice>{t('test.autoTitle')}</Notice>}
      {!showSolutions ? (
        <>
          <div className="result-grid">
            <section className="hero-panel">
              <p>{t('result.yourScore')}</p>
              <div className="score-number">
                {result.score}
                <small> / {result.maxScore}</small>
              </div>
              <p>
                {t(result.qualified ? 'result.qualified' : 'result.notQualified')} ·{' '}
                {t('result.cutoff')} {result.cutoffPct}%
              </p>
              <Button onClick={() => setShowSolutions(true)}>{t('result.seeWrong')}</Button>
            </section>
            <section className="panel">
              <h2>{t('result.r2')}</h2>
              <dl className="stats">
                <div>
                  <dt>{t('result.right')}</dt>
                  <dd>{result.correct}</dd>
                </div>
                <div>
                  <dt>{t('result.wrong')}</dt>
                  <dd>{result.wrong}</dd>
                </div>
                <div>
                  <dt>{t('result.skipped')}</dt>
                  <dd>{result.skipped}</dd>
                </div>
                <div>
                  <dt>{t('result.accuracy')}</dt>
                  <dd>{result.accuracyPct}%</dd>
                </div>
                <div>
                  <dt>{t('result.negMarks')}</dt>
                  <dd>{result.negativeMarks}</dd>
                </div>
                <div>
                  <dt>{t('result.perQ')}</dt>
                  <dd>{Math.round(result.avgSecondsPerQuestion)}s</dd>
                </div>
              </dl>
              <p className="muted">
                {storageStatus === 'temporary'
                  ? copy(
                      'This result is held in this tab only. Retry saving before leaving. No rank is available.',
                      'ఈ ఫలితం ఈ ట్యాబ్‌లో మాత్రమే ఉంది. వెళ్లే ముందు సేవ్ చేయడానికి మళ్లీ ప్రయత్నించండి. ర్యాంక్ అందుబాటులో లేదు.',
                    )
                  : copy(
                      'Saved locally in this browser. No rank is available.',
                      'ఈ బ్రౌజర్‌లో స్థానికంగా సేవ్ చేయబడింది. ర్యాంక్ అందుబాటులో లేదు.',
                    )}
              </p>
            </section>
          </div>
          <div className="actions section">
            <Button variant="outline" asChild>
              <Link href={solutionsHref(id)}>{t('solutions.title')}</Link>
            </Button>
            {onRetake ? (
              <Button variant="outline" onClick={onRetake}>
                {copy('Practise again', 'మళ్లీ సాధన చేయండి')}
              </Button>
            ) : (
              <Button variant="outline" asChild>
                <Link href={attemptHref(id)}>{copy('Practise again', 'మళ్లీ సాధన చేయండి')}</Link>
              </Button>
            )}
            <Link href="/study">{t('study.title')}</Link>
          </div>
        </>
      ) : (
        <>
          <div className="filters">
            <Button variant="outline" onClick={() => setShowSolutions(false)}>
              {t('result.yourScore')}
            </Button>
            {(['wrong', 'all'] as SolutionFilter[]).map((value) => (
              <Button
                key={value}
                variant={filter === value ? 'default' : 'outline'}
                aria-pressed={filter === value}
                onClick={() => {
                  setFilter(value);
                  setPage(0);
                }}
              >
                {t(value === 'wrong' ? 'solutions.filterWrong' : 'solutions.filterAll')}
              </Button>
            ))}
          </div>
          {rows.length === 0 ? (
            <Empty>{t('solutions.allCorrect')}</Empty>
          ) : (
            <div className="reading question-list">
              {rows.slice(page * 20, (page + 1) * 20).map((row) => (
                <article className="panel" key={row.questionNo}>
                  <p className="eyebrow">
                    {t('test.qLabel')} {row.questionNo} ·{' '}
                    {t(`test.sections.${row.question.section}`)}
                  </p>
                  <h2 className="question-text">{row.question.text[lang]}</h2>
                  <ol className="solution-options" type="A">
                    {row.question.options[lang].map((option, index) => (
                      <li
                        key={index}
                        data-correct={index === row.correct}
                        data-wrong={index === row.your && !row.isCorrect}
                      >
                        {option}
                        {index === row.correct && (
                          <strong> · {t('solutions.correctAnswer')}</strong>
                        )}
                        {index === row.your && <span> · {t('solutions.yourAnswer')}</span>}
                      </li>
                    ))}
                  </ol>
                  {row.your === null && <p>{t('result.skipped')}</p>}
                  <h3>{t('solutions.why')}</h3>
                  <p className="question-text">{row.question.explanation[lang]}</p>
                </article>
              ))}
            </div>
          )}
          {rows.length > 20 && (
            <div className="actions pagination">
              <Button
                variant="outline"
                disabled={page === 0}
                onClick={() => {
                  setPage(page - 1);
                  window.scrollTo(0, 0);
                }}
              >
                {t('test.previous')}
              </Button>
              <span>
                {page + 1}/{Math.ceil(rows.length / 20)}
              </span>
              <Button
                variant="outline"
                disabled={(page + 1) * 20 >= rows.length}
                onClick={() => {
                  setPage(page + 1);
                  window.scrollTo(0, 0);
                }}
              >
                {t('test.next')}
              </Button>
            </div>
          )}
        </>
      )}
    </>
  );
}
