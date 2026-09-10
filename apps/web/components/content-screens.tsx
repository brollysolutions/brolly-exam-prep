'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AFFAIRS,
  NOTICES,
  STUDY_SECTIONS,
  STUDY_TOPICS,
  standardsFor,
  standardEntries,
  STANDARDS_NOTIFICATION_YEAR,
  type Post,
  type Gender,
  type StandardsGroup,
  type StandardKey,
} from '@tslprb/fixtures/src/runtime';
import { TESTS } from '@tslprb/fixtures/src/runtime';
import { useLangStore } from '@/data/lang';
import { useStudyStore } from '@/data/study';
import { useActivityStore } from '@/data/activity';
import { useEligibilityStore } from '@/data/eligibility';
import { useSessionStore } from '@/data/session';
import { evaluate, toInput, parseMeasure } from '@/features/eligibility/evaluate';
import { getApi } from '@/data/api';
import { attemptHref } from '@/lib/routes';
import { BackLink, Button, Empty, Notice, PageTitle, useCopy } from './web-ui';

export function Study() {
  const { t } = useTranslation();
  const lang = useLangStore((s) => s.lang);
  const read = useStudyStore((s) => s.read);
  return (
    <>
      <PageTitle title={t('study.title')} />
      {STUDY_SECTIONS.map((section) => (
        <section className="section" key={section.id}>
          <h2>{t(section.labelKey)}</h2>
          <div className="topic-grid">
            {section.topics.map((topic) => (
              <Link
                className="link-panel"
                key={topic.id}
                href={`/study/${encodeURIComponent(topic.id)}`}
              >
                <h3>{topic.title[lang]}</h3>
                <p>
                  {topic.minutes} {t('study.minutes')}
                  {read[topic.id] && <span className="badge">✓ {t('study.read')}</span>}
                </p>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
export function Topic({ id }: { id: string }) {
  const { t } = useTranslation();
  const lang = useLangStore((s) => s.lang);
  const study = useStudyStore();
  const topic = STUDY_TOPICS.find((item) => item.id === id);
  if (!topic)
    return (
      <>
        <BackLink href="/study" />
        <Empty>{t('study.notFound')}</Empty>
      </>
    );
  return (
    <article className="reading">
      <BackLink href="/study" />
      <PageTitle title={topic.title[lang]} sub={`${topic.minutes} ${t('study.minutes')}`} />
      <div className="prose">
        {topic.blocks.map((block, index) =>
          block.kind === 'bullets' ? (
            <ul key={index}>
              {block.items.map((item, i) => (
                <li key={i}>{item[lang]}</li>
              ))}
            </ul>
          ) : block.kind === 'heading' ? (
            <h2 key={index}>{block.text[lang]}</h2>
          ) : ['tip', 'example', 'formula'].includes(block.kind) ? (
            <aside className={`study-${block.kind}`} key={index}>
              {block.kind !== 'formula' && <strong>{t(`study.${block.kind}`)}</strong>}
              <p>{block.text[lang]}</p>
            </aside>
          ) : (
            <p key={index}>{block.text[lang]}</p>
          ),
        )}
      </div>
      <div className="actions">
        <Button
          disabled={Boolean(study.read[id])}
          onClick={() => {
            if (!useStudyStore.getState().read[id]) {
              study.markRead(id);
              useActivityStore.getState().bump('topicsRead');
            }
          }}
        >
          {t(study.read[id] ? 'study.read' : 'study.markRead')}
        </Button>
        <Button variant="outline" asChild>
          <Link href="/tests">{t('study.practise')}</Link>
        </Button>
      </div>
    </article>
  );
}
export function News({ kind }: { kind: 'updates' | 'affairs' }) {
  const { t } = useTranslation();
  const lang = useLangStore((s) => s.lang);
  const params = useSearchParams();
  const copy = useCopy();
  const [filter, setFilter] = useState('all');
  const categories = ['all', 'india', 'telangana', 'world', 'sports', 'awards'];
  useEffect(() => {
    const id = params.get('open');
    if (id) document.getElementById(id)?.scrollIntoView({ block: 'center' });
  }, [params]);
  return (
    <>
      <BackLink />
      <PageTitle title={t(`${kind}.title`)} />
      <Notice>
        {t('common.sampleData')} —{' '}
        {copy(
          'Illustrative content; not live news or an official notification.',
          'ఇవి నమూనాలు మాత్రమే; తాజా వార్తలు లేదా అధికారిక నోటిఫికేషన్ కాదు.',
        )}
      </Notice>
      {kind === 'affairs' && (
        <div className="filters">
          {categories.map((category) => (
            <Button
              key={category}
              variant={filter === category ? 'default' : 'outline'}
              aria-pressed={filter === category}
              onClick={() => setFilter(category)}
            >
              {category === 'all' ? t('solutions.filterAll') : t(`affairs.cat.${category}`)}
            </Button>
          ))}
        </div>
      )}
      <div className="reading news-list">
        {kind === 'updates'
          ? NOTICES.map((notice) => (
              <article className="panel" key={notice.id} id={notice.id}>
                <p className="eyebrow">
                  {t(`updates.kind.${notice.kind}`)} · {notice.date}
                </p>
                <h2>{notice.title[lang]}</h2>
                <p>{notice.body[lang]}</p>
                {notice.link && /^https:\/\//.test(notice.link) && (
                  <a href={notice.link} target="_blank" rel="noopener noreferrer">
                    {t('updates.open')} ↗
                  </a>
                )}
              </article>
            ))
          : AFFAIRS.filter((item) => filter === 'all' || item.category === filter).map((item) => (
              <article className="panel" key={item.id}>
                <p className="eyebrow">
                  {t(`affairs.cat.${item.category}`)} · {item.date}
                </p>
                <h2>{item.headline[lang]}</h2>
                <p>{item.summary[lang]}</p>
              </article>
            ))}
      </div>
    </>
  );
}
export function Eligibility() {
  const { t } = useTranslation();
  const copy = useCopy();
  const session = useSessionStore();
  const state = useEligibilityStore();
  const post = state.post ?? session.post ?? 'pc';
  const gender = state.gender ?? 'male';
  const group = state.group ?? (session.category === 'st' ? 'st' : 'general');
  const standards = standardsFor(post, gender, group);
  const entries = standardEntries(standards);
  const result = evaluate(toInput(post, gender, group, state.values));
  const invalid = (key: StandardKey) =>
    Boolean(state.values[key]?.trim()) && parseMeasure(state.values[key]) === undefined;
  const label = (key: string) =>
    key.startsWith('run')
      ? t('eligibility.run', { m: key.replace(/\D/g, '') })
      : t(`eligibility.${key}`);
  const unit = (key: string) =>
    key.startsWith('run')
      ? t('eligibility.sec')
      : ['longJump', 'shotPut'].includes(key)
        ? t('eligibility.m')
        : t('eligibility.cm');
  return (
    <>
      <BackLink />
      <PageTitle title={t('eligibility.title')} sub={t('eligibility.sub')} />
      <div className="profile-grid">
        <form
          className="panel form-stack"
          onSubmit={(e) => {
            e.preventDefault();
            state.check();
            const firstInvalid = entries.find(({ key }) => invalid(key));
            if (firstInvalid) document.getElementById(firstInvalid.key)?.focus();
          }}
        >
          <div className="picker-grid">
            <label>
              {t('eligibility.post')}
              <select value={post} onChange={(e) => state.setPost(e.target.value as Post)}>
                <option value="pc">{t('onboarding.pcTitle')}</option>
                <option value="si">{t('onboarding.siTitle')}</option>
              </select>
            </label>
            <label>
              {t('eligibility.gender')}
              <select value={gender} onChange={(e) => state.setGender(e.target.value as Gender)}>
                <option value="male">{t('eligibility.male')}</option>
                <option value="female">{t('eligibility.female')}</option>
              </select>
            </label>
            <label>
              {t('eligibility.group')}
              <select
                value={group}
                onChange={(e) => state.setGroup(e.target.value as StandardsGroup)}
              >
                <option value="general">{t('eligibility.general')}</option>
                <option value="st">{t('eligibility.st')}</option>
              </select>
            </label>
          </div>
          {entries.some((entry) => !entry.standard.verified) && (
            <Notice>{t('eligibility.unverifiedNote')}</Notice>
          )}
          <h2>{t('eligibility.measurements')}</h2>
          {entries.map(({ key, standard }) => (
            <label key={key} htmlFor={key}>
              {label(key)} ({unit(key)})
              <input
                id={key}
                inputMode="decimal"
                type="text"
                value={state.values[key] ?? ''}
                onChange={(e) => state.setValue(key, e.target.value)}
                aria-invalid={invalid(key) || undefined}
                aria-describedby={`${key}-hint${invalid(key) ? ` ${key}-error` : ''}`}
              />
              {invalid(key) && (
                <small className="error-text" id={`${key}-error`}>
                  {t('audit.invalidMeasure', { unit: unit(key) })}
                </small>
              )}
              <small id={`${key}-hint`}>
                {t('eligibility.required')}: {standard.dir === 'min' ? '≥' : '≤'} {standard.value}{' '}
                {unit(key)}
                {!standard.verified && ` · ${t('eligibility.unverified')}`}
              </small>
            </label>
          ))}
          <Button type="submit">{t('eligibility.check')}</Button>
        </form>
        <section className="panel" aria-live="polite">
          <h2>{state.checked ? t(`eligibility.${result.verdict}`) : t('eligibility.required')}</h2>
          {state.checked ? (
            result.rows.map((row) => (
              <div className="content-row" key={row.key}>
                <span>
                  {label(row.key)}
                  <small>
                    {t('eligibility.yours')}: {row.actual ?? '—'}
                  </small>
                </span>
                <strong
                  className={row.pass === false ? 'error-text' : row.pass ? 'success-text' : ''}
                >
                  {t(
                    invalid(row.key)
                      ? 'audit.invalid'
                      : row.pass === undefined
                        ? 'eligibility.notEntered'
                        : row.pass
                          ? 'eligibility.pass'
                          : 'eligibility.fail',
                  )}
                  {!row.verified && <small>{t('eligibility.unverified')}</small>}
                </strong>
              </div>
            ))
          ) : (
            <p>
              {copy(
                'Enter measurements to compare with the saved standards.',
                'సేవ్ చేసిన ప్రమాణాలతో పోల్చడానికి కొలతలను నమోదు చేయండి.',
              )}
            </p>
          )}
          <p className="muted">
            {t('eligibility.disclaimer', { year: STANDARDS_NOTIFICATION_YEAR })}
          </p>
        </section>
      </div>
    </>
  );
}
export function Paper({ id }: { id: string }) {
  const { t } = useTranslation();
  const lang = useLangStore((s) => s.lang);
  const [paper, setPaper] = useState<import('@/data/api').PaperQuestion[]>([]);
  const [failed, setFailed] = useState(false);
  const [page, setPage] = useState(0);
  const meta = TESTS.find((test) => test.id === id);
  useEffect(() => {
    let live = true;
    void getApi()
      .getPaper(id)
      .then((value) => {
        if (live) setPaper(value);
      })
      .catch(() => {
        if (live) setFailed(true);
      });
    return () => {
      live = false;
    };
  }, [id]);
  // Reading access is for previous-year papers only. Practice answer keys stay behind submission.
  if (!meta || meta.kind !== 'previous')
    return (
      <>
        <BackLink href="/tests" />
        <Empty>{t('paper.notFound')}</Empty>
      </>
    );
  return (
    <>
      <BackLink href="/tests?kind=previous" />
      <PageTitle title={meta.title[lang]} sub={t('paper.title')}>
        <Button asChild>
          <Link href={attemptHref(id)}>{t('library.practise')}</Link>
        </Button>
      </PageTitle>
      {meta.demo && <Notice>{t('audit.demoPaperNote')}</Notice>}
      {failed ? (
        <Notice error>{t('paper.notFound')}</Notice>
      ) : paper.length === 0 ? (
        <Notice>{t('audit.loadingPaper')}</Notice>
      ) : (
        <>
          <div className="reading question-list">
            {paper.slice(page * 20, (page + 1) * 20).map((q, index) => (
              <article className="panel" key={q.id}>
                <p className="eyebrow">
                  {t(`test.sections.${q.section}`)} · {t('test.qLabel')} {page * 20 + index + 1}
                </p>
                <h2 className="question-text">{q.text[lang]}</h2>
                <ol type="A">
                  {q.options[lang].map((option, i) => (
                    <li key={i}>{option}</li>
                  ))}
                </ol>
                {q.correct !== undefined && q.explanation && (
                  <details>
                    <summary>{t('solutions.correctAnswer')}</summary>
                    <p>{q.options[lang][q.correct]}</p>
                    <p>{q.explanation[lang]}</p>
                  </details>
                )}
              </article>
            ))}
          </div>
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
              {page + 1} / {Math.ceil(paper.length / 20)}
            </span>
            <Button
              variant="outline"
              disabled={(page + 1) * 20 >= paper.length}
              onClick={() => {
                setPage(page + 1);
                window.scrollTo(0, 0);
              }}
            >
              {t('test.next')}
            </Button>
          </div>
        </>
      )}
    </>
  );
}
