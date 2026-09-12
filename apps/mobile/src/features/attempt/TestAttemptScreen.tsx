import { firstQuestionOf, isImportedTest } from '@/data/content';
import { Redirect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BackHandler } from 'react-native';

import { useActivityStore } from '@/data/activity';
import { getApi, type PaperQuestion } from '@/data/api';
import { useAttemptStore, type Choice, type GotoResult } from '@/data/attempt';
import { counts, elapsedOnCurrentSec, sectionOf } from '@/data/attempt.selectors';
import { useHistoryStore } from '@/data/history';
import {
  completeImportedAttempt,
  getImportedPaper,
  getImportedTestMeta,
} from '@/data/importedAttempt';
import { useLangStore } from '@/data/lang';
import {
  getDurableAttemptService,
  getPublicReadCache,
  requestAnswerSyncForCurrentUser,
  requestCurrentAttemptSubmission,
  resolveCachedRead,
} from '@/data/offline';
import { gateHref, useRequireAuth } from '@/data/requireAuth';
import { offlineUserId, TEST_SESSION_TOKEN, useSessionStore } from '@/data/session';
import { testAttemptHref, testResultHref } from '@/data/testRoutes';
import { useCountdown } from '@/data/useCountdown';
import { useNetwork } from '@/data/useNetwork';
import {
  AttemptDialogs,
  AttemptNotices,
  lockedMessage,
  type AttemptDialogKind,
  type AttemptToast,
} from '@/features/attempt/AttemptOverlays';
import { AttemptView } from '@/features/attempt/AttemptView';
import { PaletteSheet } from '@/features/attempt/PaletteSheet';
import { useAttemptGuards } from '@/features/attempt/useAttemptGuards';
import { haptics, LoadError, Screen, type SheetHandle } from '@/ui';

/** A locked-section notice clears itself; the timer warnings stay until the next one lands. */
const LOCKED_TOAST_MS = 4000;

/**
 * F-19 — the gate stands in front of the attempt rather than inside it.
 *
 * A deep link is the one way into a paper that never passes `ensure`, and the screen below
 * creates an attempt, downloads a paper and arms a timer on mount. None of that may happen
 * for someone with no account to keep the result in, so the redirect has to come before the
 * first of those hooks runs — which is why the screen is two components and not one.
 */
export function TestAttemptScreen({ id }: { id: string }) {
  const { signedIn, onboarded } = useRequireAuth();
  if (!signedIn || !onboarded)
    return <Redirect href={gateHref(testAttemptHref(id), { signedIn, onboarded })} />;
  return <TestAttempt id={id} />;
}

/** Test attempt (F-09/10/11): wires the attempt store, the mock API, the clock and the router. */
function TestAttempt({ id }: { id: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const attempt = useAttemptStore();
  const lang = useLangStore((s) => s.lang);
  const setLang = useLangStore((s) => s.setLang);
  const { offline } = useNetwork();

  const [paper, setPaper] = useState<PaperQuestion[]>([]);
  // The paper never arrived. Bumping `attempt` re-runs the load; the screen is otherwise
  // a blank stem with four blank options and no way out but the back gesture.
  const [failed, setFailed] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [dialog, setDialog] = useState<AttemptDialogKind | null>(null);
  const [submissionError, setSubmissionError] = useState<string>();
  const [toast, setToast] = useState<AttemptToast | null>(null);
  const sheet = useRef<SheetHandle>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const running = attempt.status === 'running';
  useAttemptGuards(running);

  // ------------------------------------------------------------------ notices

  const showToast = useCallback((next: AttemptToast, autoDismissMs?: number) => {
    clearTimeout(toastTimer.current);
    setToast(next);
    if (autoDismissMs !== undefined)
      toastTimer.current = setTimeout(() => setToast(null), autoDismissMs);
  }, []);

  const clearToast = useCallback(() => {
    clearTimeout(toastTimer.current);
    setToast(null);
  }, []);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  /** Any dialog owns the screen: the palette closes underneath it. */
  const openDialog = useCallback((kind: AttemptDialogKind) => {
    sheet.current?.dismiss();
    setDialog(kind);
  }, []);

  // --------------------------------------------------------------- paper + start

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const initial = useAttemptStore.getState();
    const resumingId =
      initial.testId === id && initial.status === 'running' ? initial.attemptId : undefined;
    void (async () => {
      const api = getApi();
      if (isImportedTest(id)) {
        const meta = getImportedTestMeta(id);
        const questions = getImportedPaper(id);
        if (!meta || questions.length === 0) {
          if (!cancelled) setFailed(true);
          return;
        }
        if (cancelled) return;
        setPaper(questions);
        setFailed(false);
        if (resumingId) completeImportedAttempt(questions);
        const state = useAttemptStore.getState();
        if (
          resumingId &&
          state.status === 'running' &&
          state.endsAt !== undefined &&
          state.endsAt <= Date.now()
        ) {
          state.autoSubmit();
          completeImportedAttempt(questions);
          setDialog('auto');
          return;
        }
        if (state.testId === id && state.status === 'running') return;
        state.start(meta);
        return;
      }

      const userId = offlineUserId(useSessionStore.getState());
      const scope = userId ? { userId } : undefined;
      const durable = scope
        ? await getDurableAttemptService().catch(() => undefined)
        : undefined;

      if (durable && scope) {
        try {
          const local = await durable.findLatest(scope, id);
          if (local) {
            const restored = await durable.restore(scope, local.id);
            if (!restored || cancelled) return;
            setPaper(restored.paper);
            useAttemptStore
              .getState()
              .hydrateLocal(restored.meta, restored.attempt, restored.answers, restored.paper);
            if (local.status !== 'running') {
              setSubmissionError(
                local.status === 'sync_failed' ? local.submissionLastError : undefined,
              );
              setDialog(
                local.status === 'sync_failed'
                  ? 'submitError'
                  : local.submissionAuto
                    ? 'auto'
                    : 'pending',
              );
            } else if (useAttemptStore.getState().status === 'autoSubmitted') {
              if (local.status === 'running') {
                void requestCurrentAttemptSubmission(local.id, true).catch(() => undefined);
              }
              setDialog('auto');
            }
            setFailed(false);
            return;
          }
        } catch {
          // Keep the local row intact. The public cache/network path below gets one chance to
          // reconstruct a paper before the existing load error is shown.
        }
      }

      const legacyServerId = initial.serverAttemptId ?? resumingId;
      const testing = useSessionStore.getState().token === TEST_SESSION_TOKEN;
      if (!testing && resumingId && legacyServerId && !legacyServerId.startsWith('local-')) {
        try {
          const [serverAttempt, serverMeta, serverPaper] = await Promise.all([
            api.getAttempt(legacyServerId),
            api.getAttemptMetaData(legacyServerId),
            api.getAttemptPaperData(legacyServerId),
          ]);
          if (cancelled) return;
          setPaper(serverPaper);
          useAttemptStore.getState().resumeServer(serverMeta, serverAttempt, serverPaper);
          if (durable && scope) {
            const adopted = await durable.adopt({
              scope,
              test: serverMeta,
              paper: serverPaper,
              state: useAttemptStore.getState(),
            });
            const restored = await durable.restore(scope, adopted.id);
            if (restored && !cancelled) {
              useAttemptStore
                .getState()
                .hydrateLocal(restored.meta, restored.attempt, restored.answers, restored.paper);
            }
          }
          setFailed(false);
          return;
        } catch {
          // The persisted local state remains usable if the server cannot be reached. The
          // public paper fallback below is only a reload, not offline reconciliation.
        }
      }

      let meta;
      let questions;
      try {
        const cache = await getPublicReadCache();
        [meta, questions] = await Promise.all([
          resolveCachedRead(cache.readTestMeta(id)),
          resolveCachedRead(cache.readTestPaper(id)),
        ]);
        if (cancelled) return;
        setPaper(questions);
        // An already-expired resumed clock can submit while the paper is loading.
        if (resumingId) completeImportedAttempt(questions);
        setFailed(false);
      } catch {
        // Creating the attempt is allowed to fail (offline start below); loading the paper
        // is not — without questions there is nothing to sit.
        if (!cancelled) setFailed(true);
        return;
      }
      const state = useAttemptStore.getState();
      // A running attempt on this same test is resumed, never restarted.
      if (state.testId === id && state.status === 'running') {
        if (durable && scope) {
          try {
            const adopted = await durable.adopt({ scope, test: meta, paper: questions, state });
            const restored = await durable.restore(scope, adopted.id);
            if (restored && !cancelled) {
              useAttemptStore
                .getState()
                .hydrateLocal(restored.meta, restored.attempt, restored.answers, restored.paper);
            }
          } catch {
            // The existing Zustand attempt remains usable if its one-time SQLite adoption fails.
          }
        }
        return;
      }
      if (resumingId && state.attemptId === resumingId) return;

      let startMeta = meta;
      let startPaper = questions;
      let serverAttemptId: string | undefined;
      let startedAt: number | undefined;
      let endsAt: number | undefined;
      if (!testing) {
        try {
          const created = await api.createAttempt({ test_id: id });
          if (cancelled) return;
          serverAttemptId = created.id;
          startedAt = Date.parse(created.started_at);
          endsAt = Date.parse(created.ends_at);
          try {
            const [serverAttempt, serverMeta, serverPaper] = await Promise.all([
              api.getAttempt(created.id),
              api.getAttemptMetaData(created.id),
              api.getAttemptPaperData(created.id),
            ]);
            if (cancelled) return;
            startMeta = serverMeta;
            startPaper = serverPaper;
            startedAt = Date.parse(serverAttempt.started_at);
            endsAt = Date.parse(serverAttempt.ends_at);
          } catch {
            // Creation succeeded, so its id/deadline remain authoritative even if optional
            // follow-up reads fail.
          }
        } catch {
          // A cached public paper is enough to create a durable local-only attempt.
        }
      }
      if (cancelled) return;
      setPaper(startPaper);
      if (durable && scope) {
        try {
          const local = await durable.create({
            scope,
            test: startMeta,
            paper: startPaper,
            serverAttemptId,
            startedAt,
            endsAt,
          });
          if (cancelled) return;
          useAttemptStore.getState().hydrateLocal(startMeta, local, [], startPaper);
          return;
        } catch {
          // SQLite failure must not break the established online attempt path.
        }
      }
      useAttemptStore.getState().start(startMeta, {
        attemptId: serverAttemptId,
        serverAttemptId,
        endsAt,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [id, loadAttempt]);

  const openResult = useCallback(
    (resultId?: string) => {
      completeImportedAttempt(paper);
      const target = isImportedTest(id)
        ? id
        : (resultId ?? useAttemptStore.getState().resultId);
      if (target) router.replace(testResultHref(target));
    },
    [id, paper, router],
  );

  const submitServerAttempt = useCallback(async (auto: boolean) => {
    const state = useAttemptStore.getState();
    if (state.resultId)
      return {
        resultId: state.resultId,
        permanentFailure: false,
        failureReason: undefined,
      };
    if (!state.attemptId || isImportedTest(state.testId))
      return {
        resultId: undefined,
        permanentFailure: false,
        failureReason: undefined,
      };

    const testId = state.testId ?? id;
    const summary = await requestCurrentAttemptSubmission(state.attemptId, auto);
    const completed = summary?.completed.find(
      (item) => item.localAttemptId === state.attemptId,
    );
    if (!completed) {
      return {
        resultId: undefined,
        permanentFailure: (summary?.permanentFailures ?? 0) > 0,
        failureReason: summary?.failureReason,
      };
    }
    const result_id = completed.resultId;
    const current = useAttemptStore.getState();
    current.completeSubmission(result_id, auto);
    void getApi()
      .getResult(result_id)
      .then((result) => {
        useHistoryStore.getState().record({
          id: result_id,
          testId,
          score: result.score,
          maxScore: result.max_score,
          at: Date.now(),
        });
      })
      .catch(() => undefined);
    return { resultId: result_id, permanentFailure: false, failureReason: undefined };
  }, [id]);

  // ------------------------------------------------------------------- clock

  const { remainingSec } = useCountdown({
    endsAt: attempt.endsAt,
    enabled: running,
    onWarn5: () => {
      haptics.warning();
      showToast({ key: 'warn5', text: t('test.warn5'), tone: 'accent' });
    },
    onWarn1: () => {
      haptics.warning();
      showToast({ key: 'warn1', text: t('test.warn1'), tone: 'danger' });
    },
    onExpire: () => {
      const state = useAttemptStore.getState();
      state.autoSubmit();
      completeImportedAttempt(paper);
      if (!isImportedTest(id)) {
        void (async () => {
          if (!state.attemptId) return;
          const outcome = await submitServerAttempt(true).catch(() => undefined);
          if (outcome?.resultId) openResult(outcome.resultId);
        })();
      }
      clearToast();
      openDialog('auto');
    },
    onResume: () => {
      // The resume card owns the screen, so the palette closes underneath it like any dialog.
      sheet.current?.dismiss();
      // Never demote the auto-submit card to a "welcome back".
      setDialog((current) => current ?? 'resume');
    },
  });

  // --------------------------------------------------------- hardware back

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      // Back dismisses whatever is on top first; only a bare paper raises the exit card.
      if (dialog !== null) {
        setDialog(null);
        return true;
      }
      openDialog('exit');
      return true;
    });
    return () => sub.remove();
  }, [dialog, openDialog]);

  // ---------------------------------------------------------------- actions

  const persistCurrent = useCallback((queueAnswerSync = false) => {
    const state = useAttemptStore.getState();
    const question = paper[state.current - 1];
    const userId = offlineUserId(useSessionStore.getState());
    if (!userId || !state.attemptId || !question || isImportedTest(state.testId)) return;
    void getDurableAttemptService()
      .then((durable) =>
        durable.saveProgress({
          scope: { userId },
          attemptId: state.attemptId as string,
          currentQuestion: state.current,
          currentQuestionId: question.id,
          currentEnteredAt: state.currentEnteredAt,
          sectionUnlocked: state.sectionUnlocked,
          choice: state.answers[state.current] ?? null,
          marked: state.marked[state.current] === true,
          visited: state.visited[state.current] === true,
          queueAnswerSync,
        }),
      )
      .then(() => {
        if (queueAnswerSync) void requestAnswerSyncForCurrentUser().catch(() => undefined);
      })
      .catch(() => undefined);
  }, [paper]);

  const handleGoto = useCallback(
    (result: GotoResult, sectionIndex: number) => {
      if (result === 'locked') {
        showToast(
          {
            key: `locked-${sectionIndex}`,
            text: lockedMessage(t, useAttemptStore.getState().pattern, sectionIndex),
            // A locked section is a fact about the paper, not a warning about the clock:
            // the ink toast, the same one the library raises on a locked test.
            tone: 'info',
          },
          LOCKED_TOAST_MS,
        );
        return;
      }
      if (result === 'ok') {
        clearToast();
        persistCurrent();
      }
    },
    [clearToast, persistCurrent, showToast, t],
  );

  const onLockedTap = useCallback(
    (sectionIndex: number) => handleGoto('locked', sectionIndex),
    [handleGoto],
  );

  const onSectionPress = useCallback(
    (sectionIndex: number) => {
      const state = useAttemptStore.getState();
      if (!state.pattern) return;
      const target = firstQuestionOf(state.pattern, sectionIndex);
      handleGoto(state.goto(target), sectionIndex);
    },
    [handleGoto],
  );

  const onAnswer = useCallback(
    (choice: Choice) => {
      const state = useAttemptStore.getState();
      const n = state.current;
      const wasAnswered = state.answers[n] !== undefined;
      state.answer(n, choice);
      // The day's target counts questions answered, not option taps: changing your mind on a
      // question already answered is not a second question, and a write the store refused
      // (locked section, expired paper) is not one at all. The store is the arbiter of both.
      // Bumped from the route, never from `attempt.ts`: a store that imports a store is a
      // cycle waiting for the next feature to close it (F-23).
      if (!wasAnswered && useAttemptStore.getState().answers[n] !== undefined)
        useActivityStore.getState().bump('answered');
      persistCurrent(true);
    },
    [persistCurrent],
  );

  const onClear = useCallback(() => {
    const state = useAttemptStore.getState();
    const n = state.current;
    state.clear(n);
    persistCurrent(true);
  }, [persistCurrent]);

  const onToggleMark = useCallback(() => {
    const state = useAttemptStore.getState();
    const n = state.current;
    state.toggleMark(n);
    persistCurrent(true);
  }, [persistCurrent]);

  const onNext = useCallback(() => {
    const state = useAttemptStore.getState();
    handleGoto(state.next(), sectionOf(state, state.current + 1));
  }, [handleGoto]);

  const onPrev = useCallback(() => {
    const state = useAttemptStore.getState();
    handleGoto(state.prev(), sectionOf(state, state.current - 1));
  }, [handleGoto]);

  const onPaletteGoto = useCallback(
    (n: number) => {
      const state = useAttemptStore.getState();
      handleGoto(state.goto(n), sectionOf(state, n));
      sheet.current?.dismiss();
    },
    [handleGoto],
  );

  const onSubmit = useCallback(() => {
    const state = useAttemptStore.getState();
    haptics.success();
    setSubmissionError(undefined);
    setDialog(null);
    if (isImportedTest(state.testId)) {
      state.submit();
      completeImportedAttempt(paper);
      openResult(id);
      return;
    }
    if (state.attemptId) {
      state.requestSubmission(false);
      openDialog('submitting');
      const testId = state.testId ?? id;
      // F-23 — Home's "papers practised" and "best score" come from this row.
      //
      // The score is asked for rather than computed: the server owns the marking scheme, and
      // a second opinion on this handset would be a second answer key to keep in step. Both
      // calls stay best-effort — the result screen loads on its own, so a failure here costs
      // one line on Home, not the paper. An attempt submitted with no network is therefore
      // not counted until the real API can be asked again.
      void submitServerAttempt(false)
        .then(async (outcome) => {
          const resultId = outcome.resultId;
          if (!resultId) {
            setSubmissionError(
              outcome.permanentFailure ? outcome.failureReason : undefined,
            );
            openDialog(outcome.permanentFailure ? 'submitError' : 'pending');
            return;
          }
          openResult(resultId);
          const result = await getApi().getResult(resultId);
          useHistoryStore.getState().record({
            id: resultId,
            testId,
            score: result.score,
            maxScore: result.max_score,
            at: Date.now(),
          });
        })
        .catch(() => openDialog('pending'));
    }
  }, [id, openDialog, openResult, paper, submitServerAttempt]);

  // ----------------------------------------------------------------- render

  const question = paper[attempt.current - 1];
  // `Date.now()` may not be read during render, so wall-clock is reconstructed from the deadline
  // and the countdown's own reading: `now = endsAt - remainingSec * 1000`, refreshed every tick.
  const elapsedSec =
    attempt.endsAt === undefined
      ? 0
      : elapsedOnCurrentSec(attempt, attempt.endsAt - remainingSec * 1000);
  const overlay = (
    <>
      <PaletteSheet
        ref={sheet}
        attempt={attempt}
        onGoto={onPaletteGoto}
        onSubmit={() => openDialog('submit')}
      />
      <AttemptDialogs
        kind={dialog}
        counts={counts(attempt)}
        submitErrorDetail={submissionError}
        onDismiss={() => setDialog(null)}
        onLeave={() => {
          setDialog(null);
          if (dialog === 'pending' || dialog === 'submitError') {
            router.replace('/(tabs)/tests');
          } else {
            router.back();
          }
        }}
        onSubmit={onSubmit}
        onSeeResult={() => {
          setSubmissionError(undefined);
          setDialog(null);
          if (isImportedTest(id)) {
            openResult(id);
            return;
          }
          const auto = useAttemptStore.getState().status === 'autoSubmitted';
          useAttemptStore.getState().beginSubmission();
          openDialog('submitting');
          void submitServerAttempt(auto)
            .then((outcome) => {
              if (outcome.resultId) {
                openResult(outcome.resultId);
              } else {
                setSubmissionError(
                  outcome.permanentFailure ? outcome.failureReason : undefined,
                );
                openDialog(outcome.permanentFailure ? 'submitError' : 'pending');
              }
            })
            .catch(() => openDialog('pending'));
        }}
      />
    </>
  );

  if (failed && !attempt.pattern)
    return (
      <Screen testID="attempt-screen">
        <LoadError onRetry={() => setLoadAttempt((n) => n + 1)} testID="attempt-load-error" />
      </Screen>
    );

  return (
    <AttemptView
      attempt={attempt}
      question={question}
      remainingSec={remainingSec}
      elapsedSec={elapsedSec}
      armed={attempt.endsAt !== undefined}
      lang={lang}
      onLangChange={setLang}
      onExit={() => openDialog('exit')}
      onSectionPress={onSectionPress}
      onLockedTap={onLockedTap}
      onAnswer={onAnswer}
      onClear={onClear}
      onToggleMark={onToggleMark}
      onPrev={onPrev}
      onNext={onNext}
      onOpenPalette={() => {
        clearToast();
        sheet.current?.present();
      }}
      onSubmit={() => openDialog('submit')}
      notices={<AttemptNotices offline={offline} toast={toast} />}
      overlay={overlay}
    />
  );
}
