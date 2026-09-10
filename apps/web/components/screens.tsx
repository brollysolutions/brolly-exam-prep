'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CATEGORIES,
  STUDY_TOPICS,
  EXAM_INFO,
  latestNotices,
  type CategoryId,
  type Post,
} from '@tslprb/fixtures/src/runtime';
import { TESTS } from '@tslprb/fixtures/src/runtime';
import { useSessionStore } from '@/data/session';
import { useLangStore } from '@/data/lang';
import { useStudyStore } from '@/data/study';
import { useHistoryStore, bestPercent } from '@/data/history';
import { useActivityStore, streakDays, todayProgress } from '@/data/activity';
import { useCompletedTestsStore } from '@/data/completedTests';
import { attemptHref, returnHref, resultHref } from '@/lib/routes';
import { BackLink, Button, Empty, Notice, PageTitle, useCopy } from './web-ui';

import { useStorageStatus } from './storage-notice';

export function Home() {
  const { t } = useTranslation();
  const copy = useCopy();
  const lang = useLangStore((s) => s.lang);
  const storageStatus = useStorageStatus();
  const history = useHistoryStore();
  const activity = useActivityStore();
  const read = useStudyStore((s) => s.read);
  const today = todayProgress(activity);
  const best = bestPercent(history);
  return (
    <>
      <PageTitle
        title={t('home.greetingPlain')}
        sub={copy('Your next step towards the uniform.', 'యూనిఫాం వైపు మీ తదుపరి అడుగు.')}
      />
      <div className="home-grid">
        <section className="hero-panel">
          <p className="eyebrow">Brolly Exam Prep</p>
          <h2>{copy('A little practice. Every day.', 'ప్రతిరోజూ కొద్దిగా సాధన.')}</h2>
          <p>{t('home.targetDone', today)}</p>
          <progress
            aria-label={t('home.todayTarget')}
            value={Math.min(today.done, today.target)}
            max={today.target}
          />
          <div className="actions">
            <Button asChild>
              <Link href="/tests">{t('library.title')}</Link>
            </Button>
            <Link href="/study">{t('study.title')} →</Link>
          </div>
          {streakDays(activity) > 0 && <p>{t('home.streak', { days: streakDays(activity) })}</p>}
        </section>
        <section className="panel">
          <h2>{t('home.progress')}</h2>
          <dl className="stats">
            <div>
              <dt>{t('home.papersPractised')}</dt>
              <dd>{history.attempts.length}</dd>
            </div>
            <div>
              <dt>{t('home.bestScore')}</dt>
              <dd>{best === undefined ? '—' : `${Math.round(best)}%`}</dd>
            </div>
            <div>
              <dt>{t('home.topicsRead')}</dt>
              <dd>{STUDY_TOPICS.filter((topic) => read[topic.id]).length}</dd>
            </div>
          </dl>
          <p className="muted">
            {storageStatus === 'persistent'
              ? copy('Progress is saved in this browser.', 'పురోగతి ఈ బ్రౌజర్‌లో సేవ్ అవుతుంది.')
              : copy(
                  'Progress is currently held in this tab only.',
                  'పురోగతి ప్రస్తుతం ఈ ట్యాబ్‌లో మాత్రమే ఉంది.',
                )}
          </p>
        </section>
      </div>
      <section className="section">
        <div className="section-heading">
          <h2>{t('home.updates')}</h2>
          <Link href="/updates">{t('home.allUpdates')} →</Link>
        </div>
        <p className="sample-label">{t('common.sampleData')}</p>
        {latestNotices(3).map((notice) => (
          <Link
            className="content-row"
            href={`/updates?open=${encodeURIComponent(notice.id)}`}
            key={notice.id}
          >
            <div>
              <small>{notice.date}</small>
              <h3>{notice.title[lang]}</h3>
            </div>
            <span aria-hidden="true">→</span>
          </Link>
        ))}
      </section>
      <div className="link-grid section">
        <Link className="link-panel" href="/eligibility">
          <h2>{t('home.physical')}</h2>
          <p>{t('home.physicalSub')}</p>
        </Link>
        <Link className="link-panel" href="/affairs">
          <h2>{t('home.affairs')}</h2>
          <p>{t('common.sampleData')}</p>
        </Link>
      </div>
      <p className="muted">
        {EXAM_INFO.label[lang]} · {EXAM_INFO.pwtDate} · {t('common.sampleData')}
      </p>
    </>
  );
}

export function Library() {
  const { t } = useTranslation();
  const copy = useCopy();
  const params = useSearchParams();
  const router = useRouter();
  const lang = useLangStore((s) => s.lang);
  const completed = useCompletedTestsStore((s) => s.tests);
  const [message, setMessage] = useState('');
  const kind = ['si', 'pc', 'full', 'previous'].includes(params.get('kind') ?? '')
    ? params.get('kind')!
    : 'si';
  const filters = [
    ['si', 'siMockTest'],
    ['pc', 'constableMockTest'],
    ['full', 'fullMocks'],
    ['previous', 'previousYear'],
  ];
  const rows = TESTS.filter(
    (test) =>
      test.listed !== false &&
      (kind === 'previous'
        ? test.kind === 'previous'
        : kind === 'full'
          ? test.kind === 'full'
          : test.kind === 'full' && !test.fullMocksOnly && test.pattern.post === kind),
  );
  return (
    <>
      <BackLink href="https://brollyexamprep.com/government-exams/state/telangana/telangana-police/" />
      <PageTitle title={t('library.title')} />
      <div className="filters" aria-label={t('library.title')}>
        {filters.map(([value, key]) => (
          <Button
            key={value}
            variant={kind === value ? 'default' : 'outline'}
            aria-pressed={kind === value}
            onClick={() => router.replace(`/tests?kind=${value}`)}
          >
            {t(`library.${key}`)}
          </Button>
        ))}
      </div>
      {message && <Notice>{message}</Notice>}
      {rows.length === 0 ? (
        <Empty>{t('library.empty')}</Empty>
      ) : (
        <div className="test-list">
          {rows.map((test) => (
            <article className="test-card" key={test.id}>
              <div className="test-card-copy">
                <span className="badge">{t(test.free ? 'common.free' : 'common.locked')}</span>
                <h2>{test.title[lang]}</h2>
                {test.demo && <p className="sample-label">{t('audit.demoPaperNote')}</p>}
                <p>
                  {t('common.questions', { count: test.pattern.totalQuestions })} ·{' '}
                  {t('common.minutes', { count: test.pattern.durationMinutes })}
                </p>
                <p className="muted">
                  {test.pattern.negativePerWrong
                    ? t('common.marks', {
                        plus: test.pattern.marksPerCorrect,
                        minus: test.pattern.negativePerWrong,
                      })
                    : t('common.noNegative')}
                </p>
              </div>
              <div className="actions">
                {test.kind === 'previous' && (
                  <Button variant="outline" asChild>
                    <Link href={`/paper/${encodeURIComponent(test.id)}`}>
                      {t('library.viewPaper')}
                    </Link>
                  </Button>
                )}
                {test.free ? (
                  <Button asChild>
                    <Link href={attemptHref(test.id)}>{copy('Start', 'ప్రారంభించండి')}</Link>
                  </Button>
                ) : (
                  <Button onClick={() => setMessage(t('library.lockedToast'))}>
                    {t('common.locked')}
                  </Button>
                )}
                {completed[test.id] && (
                  <Link href={resultHref(test.id)}>
                    {t('result.yourScore')}: {completed[test.id].result.score}
                  </Link>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}

export function Onboarding({ step }: { step: 'post' | 'category' }) {
  const { t } = useTranslation();
  const copy = useCopy();
  const router = useRouter();
  const params = useSearchParams();
  const session = useSessionStore();
  const [post, setPost] = useState<Post | undefined>(session.post);
  const [category, setCategory] = useState<CategoryId | undefined>(session.category);
  const destination = returnHref(params.get('returnTo') ?? '/profile');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (step === 'post' && post) {
      session.setPost(post);
      if (session.category) session.completeOnboarding();
      router.replace(destination);
    }
    if (step === 'category' && category) {
      session.setCategory(category);
      if (session.post) session.completeOnboarding();
      router.replace(destination);
    }
  };
  return (
    <div className="narrow">
      <BackLink href="/profile" />
      <PageTitle
        title={t(step === 'post' ? 'onboarding.postTitle' : 'onboarding.catTitle')}
        sub={
          step === 'post'
            ? copy(
                'Sets your default physical standards. Choose any test from the Tests page. You can change this later.',
                'మీ డిఫాల్ట్ శారీరక ప్రమాణాలను సెట్ చేస్తుంది. పరీక్షల పేజీ నుండి ఏ పరీక్షనైనా ఎంచుకోవచ్చు. దీన్ని తర్వాత మార్చవచ్చు.',
              )
            : t('onboarding.catSub')
        }
      />
      <form onSubmit={submit} className="form-stack">
        <fieldset>
          <legend className="sr-only">
            {t(step === 'post' ? 'profile.post' : 'profile.category')}
          </legend>
          {step === 'post'
            ? (['pc', 'si'] as Post[]).map((value) => (
                <label className="choice-card" key={value}>
                  <input
                    type="radio"
                    name="post"
                    value={value}
                    checked={post === value}
                    onChange={() => setPost(value)}
                  />
                  <span>
                    <strong>{t(`onboarding.${value}Title`)}</strong>
                    <small>{t(`onboarding.${value}Sub`)}</small>
                  </span>
                </label>
              ))
            : CATEGORIES.map((value) => (
                <label className="choice-card" key={value.id}>
                  <input
                    type="radio"
                    name="category"
                    checked={category === value.id}
                    onChange={() => setCategory(value.id)}
                  />
                  <span>
                    <strong>{t(value.labelKey)}</strong>
                    <small>
                      {t('onboarding.catQual')} {value.qualifyingPct}%
                    </small>
                  </span>
                </label>
              ))}
        </fieldset>
        <Button type="submit" disabled={step === 'post' ? !post : !category}>
          {t('common.continue')}
        </Button>
      </form>
    </div>
  );
}

export function Profile() {
  const { t } = useTranslation();
  const copy = useCopy();
  const session = useSessionStore();
  const lang = useLangStore((s) => s.lang);
  const setLang = useLangStore((s) => s.setLang);
  const history = useHistoryStore((s) => s.attempts);
  const storageStatus = useStorageStatus();
  return (
    <>
      <PageTitle title={t('profile.title')} />
      <div className="profile-grid">
        <section className="panel">
          <h2>{copy('Practice preferences', 'సాధన ప్రాధాన్యతలు')}</h2>
          <p>
            {storageStatus === 'persistent'
              ? copy(
                  'Your progress is saved in this browser.',
                  'మీ పురోగతి ఈ బ్రౌజర్‌లో సేవ్ అవుతుంది.',
                )
              : copy(
                  'Your recent changes are held in this tab only.',
                  'మీ ఇటీవలి మార్పులు ఈ ట్యాబ్‌లో మాత్రమే ఉన్నాయి.',
                )}
          </p>
          <Link className="content-row" href="/post?returnTo=%2Fprofile">
            <span>{t('profile.post')}</span>
            <strong>
              {session.post ? t(`onboarding.${session.post}Title`) : t('audit.notSelected')} →
            </strong>
          </Link>
          <Link className="content-row" href="/category?returnTo=%2Fprofile">
            <span>{t('profile.category')}</span>
            <strong>
              {session.category ? t(`onboarding.cats.${session.category}`) : t('audit.notSelected')}{' '}
              →
            </strong>
          </Link>
          <label className="content-row">
            {t('profile.language')}
            <select value={lang} onChange={(e) => setLang(e.target.value as 'en' | 'te')}>
              <option value="en">English</option>
              <option value="te">తెలుగు</option>
            </select>
          </label>
          <h3 className="section">{t('profile.notifications')}</h3>
          <p className="muted">
            {copy(
              'Reminders are not available on this website yet.',
              'ఈ వెబ్‌సైట్‌లో రిమైండర్లు ఇంకా అందుబాటులో లేవు.',
            )}
          </p>
        </section>
        <section className="panel">
          <h2>{copy('Practice history', 'సాధన చరిత్ర')}</h2>
          {history.length ? (
            history.map((row) => (
              <div key={row.id} className="content-row">
                <span>
                  {TESTS.find((test) => test.id === row.testId)?.title[lang] ?? row.testId}
                  <small>
                    {new Date(row.at).toLocaleDateString(lang === 'te' ? 'te-IN' : 'en-IN')}
                  </small>
                </span>
                <strong>
                  {row.score} / {row.maxScore}
                </strong>
              </div>
            ))
          ) : (
            <Empty>
              <p>
                {copy(
                  'Complete a test to see your practice history here.',
                  'మీ సాధన చరిత్రను ఇక్కడ చూడటానికి ఒక పరీక్షను పూర్తి చేయండి.',
                )}
              </p>
              <Button asChild>
                <Link href="/tests">{t('library.title')}</Link>
              </Button>
            </Empty>
          )}
        </section>
      </div>
    </>
  );
}

export function Welcome() {
  const { t } = useTranslation();
  const copy = useCopy();
  const router = useRouter();
  const params = useSearchParams();
  const [step, setStep] = useState(1);
  return (
    <div className="narrow">
      <PageTitle title={t(`onboarding.welcome${step}Title`)} />
      <section className="hero-panel">
        <p>
          {step === 3
            ? copy(
                'Review your score, answers, and explanations after submission.',
                'సమర్పించిన తర్వాత స్కోరు, సమాధానాలు మరియు వివరణలను సమీక్షించండి.',
              )
            : step === 1
              ? copy(
                  'Each test card shows its question count, duration, and marking rules. Check these before starting.',
                  'ప్రతి పరీక్ష కార్డులో ప్రశ్నల సంఖ్య, సమయం, మార్కుల నియమాలు ఉంటాయి. ప్రారంభించే ముందు వాటిని చూడండి.',
                )
              : copy(
                  'Once a paper has loaded, you can answer and submit offline. Progress saves in this browser when storage is available; a warning appears if saving fails.',
                  'ప్రశ్నపత్రం లోడ్ అయిన తర్వాత ఆఫ్‌లైన్‌లో సమాధానాలు ఇచ్చి సమర్పించవచ్చు. నిల్వ అందుబాటులో ఉంటే పురోగతి ఈ బ్రౌజర్‌లో సేవ్ అవుతుంది; సేవ్ కాకపోతే హెచ్చరిక కనిపిస్తుంది.',
                )}
        </p>
        <p>{step} / 3</p>
        <div className="actions">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(step - 1)}>
              {t('common.back')}
            </Button>
          )}
          <Button
            onClick={() => {
              if (step < 3) setStep(step + 1);
              else {
                useSessionStore.getState().markWelcomeSeen();
                router.replace(returnHref(params.get('returnTo')));
              }
            }}
          >
            {step < 3 ? t('common.next') : t('common.getStarted')}
          </Button>
        </div>
      </section>
    </div>
  );
}
