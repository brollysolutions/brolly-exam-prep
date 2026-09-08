'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { firstQuestionOf, type Question } from '@tslprb/fixtures';
import { TESTS, isImportedTest } from '@/lib/test-catalog';
import { useAttemptStore, type Choice } from '@/data/attempt';
import { cellState, counts, isSectionLocked, sectionOf } from '@/data/attempt.selectors';
import { useSessionStore, isOnboarded } from '@/data/session';
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
import { attemptHref, resultHref, solutionsHref, withReturn } from '@/lib/routes';
import { BackLink, Button, Empty, Modal, Notice, PageTitle, useCopy } from './web-ui';

function useGate(destination: string) {
  const session = useSessionStore();
  const router = useRouter();
  const ready = Boolean(session.token) && isOnboarded(session);
  useEffect(() => {
    if (!ready) router.replace(withReturn(session.token ? '/post' : '/login', destination));
  }, [ready, session.token, router, destination]);
  return ready;
}
const clock = (sec: number) =>
  `${String(Math.floor(sec / 3600)).padStart(2, '0')}:${String(Math.floor(sec / 60) % 60).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;

export function Exam({ id }: { id: string }) {
  const ready = useGate(attemptHref(id));
  const { t } = useTranslation();
  const meta = TESTS.find((test) => test.id === id);
  if (!ready) return <Notice>{t('common.signIn')}…</Notice>;
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
  const [message, setMessage] = useState('');
  const meta = TESTS.find((test) => test.id === id)!;
  const active = attempt.testId === id && attempt.status === 'running';
  const remaining = Math.max(0, Math.ceil(((attempt.endsAt ?? now) - now) / 1000));
  const loaded = paper.length === meta.pattern.totalQuestions;
  const syncChain = useRef(Promise.resolve());

  const start = useCallback(
    async (isCurrent: () => boolean = () => true) => {
      if (!isCurrent()) return;
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
      .then(async (questions) => {
        if (!live) return;
        setPaper(questions);
        setFailed(false);
        const current = useAttemptStore.getState();
        if (current.status === 'running') {
          if (current.testId !== id) setConflict(true);
          else if ((current.endsAt ?? 0) > Date.now()) setDialog('resume');
        } else await start(() => live);
      })
      .catch(() => {
        if (live) setFailed(true);
      });
    return () => {
      live = false;
    };
  }, [id, retry, start]);

  const finish = useCallback(
    (automatic: boolean) => {
      const current = useAttemptStore.getState();
      if (current.testId !== id || current.status !== 'running' || !loaded) return;
      if (automatic || (current.endsAt ?? Infinity) <= Date.now()) current.autoSubmit();
      else current.submit();
      saveCompletedAttempt(paper);
      setDialog(null);
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
    const outcome = state.goto(n);
    if (outcome === 'locked') {
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
      window.scrollTo(0, 0);
    }
  };

  if (
    finished ||
    (attempt.testId === id && ['submitted', 'autoSubmitted'].includes(attempt.status) && loaded)
  )
    return (
      <Results
        id={id}
        autoSubmitted={attempt.status === 'autoSubmitted'}
        onRetake={() => {
          setFinished(false);
          void start();
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
              void start();
            }}
          >
            {copy('Replace unfinished test', 'అసంపూర్తి పరీక్షను భర్తీ చేయండి')}
          </Button>
        </div>
      </div>
    );
  if (!loaded || !active)
    return <Notice>{copy('Loading your paper…', 'మీ ప్రశ్నపత్రం లోడ్ అవుతోంది…')}</Notice>;
  const q = paper[attempt.current - 1];
  const totals = counts(attempt);
  const legend = [
    ['a', 'answered'],
    ['na', 'notAnswered'],
    ['m', 'marked'],
    ['nv', 'notVisited'],
    ['am', 'both'],
  ];
  const paletteContent = (
    <>
      <div className="palette-legend">
        {legend.map(([state, label]) => (
          <span key={state}>
            <i data-state={state} />
            {t(`test.${label}`)}
          </span>
        ))}
      </div>
      <div className="question-palette">
        {paper.map((_, index) => {
          const n = index + 1;
          return (
            <button
              key={n}
              type="button"
              data-state={cellState(attempt, n)}
              aria-current={attempt.current === n ? 'step' : undefined}
              aria-label={`${t('test.qLabel')} ${n}, ${t(`test.${({ a: 'answered', na: 'notAnswered', m: 'marked', nv: 'notVisited', am: 'both' } as const)[cellState(attempt, n)]}`)}`}
              onClick={() => go(n)}
            >
              {n}
            </button>
          );
        })}
      </div>
    </>
  );
  return (
    <>
      <div className="exam-heading">
        <div>
          <Button variant="ghost" onClick={() => setDialog('exit')}>
            ← {t('test.exit')}
          </Button>
          <h1>{meta.title[lang]}</h1>
        </div>
        <div
          className={`timer${remaining <= 60 ? ' timer-critical' : ''}`}
          role="timer"
          aria-label={t('test.timeLeft')}
        >
          <small>{t('test.timeLeft')}</small>
          <strong>{clock(remaining)}</strong>
        </div>
      </div>
      {offline && <Notice>{t('test.offline')}</Notice>}
      {remaining <= 300 && (
        <Notice error={remaining <= 60}>{t(remaining <= 60 ? 'test.warn1' : 'test.warn5')}</Notice>
      )}
      {message && <Notice>{message}</Notice>}
      <div className="filters sections">
        {meta.pattern.sections.map((section, index) => (
          <Button
            key={section.id}
            variant={q.section === section.id ? 'default' : 'outline'}
            aria-pressed={q.section === section.id}
            onClick={() => go(firstQuestionOf(meta.pattern, index))}
          >
            {t(section.labelKey)}
            {isSectionLocked(attempt, index) && ` · ${t('test.locked')}`}
          </Button>
        ))}
      </div>
      <div className="exam-grid">
        <section className="panel question-panel">
          <div className="question-meta">
            <span>
              {t('test.qLabel')} {attempt.current} / {paper.length}
            </span>
            <span>
              {t('test.timeOnQ')}:{' '}
              {Math.max(0, Math.floor((now - (attempt.currentEnteredAt ?? now)) / 1000))}s
            </span>
          </div>
          <fieldset className="answer-group">
            <legend className="question-text">{q.text[lang]}</legend>
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
                <span className="option-key">{'ABCD'[index]}</span>
                <span>{option}</span>
              </label>
            ))}
          </fieldset>
          <div className="actions question-tools">
            <Button
              variant="outline"
              onClick={() => {
                if (canWrite()) {
                  attempt.clear(attempt.current);
                  patch(attempt.current);
                }
              }}
            >
              {t('test.clear')}
            </Button>
            <Button
              variant="outline"
              aria-pressed={Boolean(attempt.marked[attempt.current])}
              onClick={() => {
                if (canWrite()) {
                  attempt.toggleMark(attempt.current);
                  patch(attempt.current);
                }
              }}
            >
              {t(attempt.marked[attempt.current] ? 'test.unmark' : 'test.mark')}
            </Button>
          </div>
          <div className="question-footer">
            <Button
              variant="outline"
              disabled={attempt.current === 1}
              onClick={() => go(attempt.current - 1)}
            >
              {t('test.previous')}
            </Button>
            <Button
              className="mobile-palette-button"
              variant="outline"
              onClick={() => setPalette(true)}
            >
              {t('test.palette')}
            </Button>
            <Button
              disabled={attempt.current === paper.length}
              onClick={() => go(attempt.current + 1)}
            >
              {t('test.next')}
            </Button>
          </div>
        </section>
        <aside className="panel palette-panel">
          <h2>{t('test.palette')}</h2>
          <p>
            {totals.answered} / {paper.length} {t('test.answered')}
          </p>
          {paletteContent}
          <Button className="submit-wide" onClick={() => setDialog('submit')}>
            {t('test.submit')}
          </Button>
        </aside>
      </div>
      <div className="mobile-submit">
        <Button onClick={() => setDialog('submit')}>
          {t('test.submit')} ({totals.answered}/{paper.length})
        </Button>
      </div>
      {palette && (
        <Modal title={t('test.palette')} onClose={() => setPalette(false)}>
          {paletteContent}
        </Modal>
      )}
      {dialog && (
        <Modal title={t(`test.${dialog}Title`)} onClose={() => setDialog(null)}>
          <p>
            {dialog === 'submit'
              ? copy(
                  'Your answers will be final. A result will be saved in this browser even if you are offline.',
                  'మీ సమాధానాలు తుది నిర్ణయం అవుతాయి. ఆఫ్‌లైన్‌లో ఉన్నా ఫలితం ఈ బ్రౌజర్‌లో సేవ్ అవుతుంది.',
                )
              : t(`test.${dialog}Body`)}
          </p>
          {dialog === 'submit' && (
            <dl className="stats">
              <div>
                <dt>{t('test.answered')}</dt>
                <dd>{totals.answered}</dd>
              </div>
              <div>
                <dt>{t('test.notAnswered')}</dt>
                <dd>{paper.length - totals.answered}</dd>
              </div>
              <div>
                <dt>{t('test.marked')}</dt>
                <dd>{totals.marked}</dd>
              </div>
            </dl>
          )}
          <div className="actions">
            <Button variant="outline" onClick={() => setDialog(null)}>
              {t(
                dialog === 'exit'
                  ? 'test.stay'
                  : dialog === 'submit'
                    ? 'test.submitNo'
                    : 'test.resume',
              )}
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
    </>
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
  const ready = useGate(solutions ? solutionsHref(id) : resultHref(id));
  const { t } = useTranslation();
  const copy = useCopy();
  const lang = useLangStore((s) => s.lang);
  const attempt = useAttemptStore();
  const completed = useCompletedTestsStore((s) => s.tests[id]);
  const [paper, setPaper] = useState<Question[]>([]);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const [filter, setFilter] = useState<SolutionFilter>('wrong');
  const [page, setPage] = useState(0);
  const [showSolutions, setShowSolutions] = useState(solutions);
  useEffect(() => {
    if (!ready) return;
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
  }, [id, ready, retry]);
  if (!ready) return null;
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
                {copy(
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
