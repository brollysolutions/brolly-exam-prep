import { firstQuestionOf } from '@tslprb/fixtures/src/runtime';
import { Redirect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BackHandler } from 'react-native';

import { useActivityStore } from '@/data/activity';
import { getApi, ApiError, type PaperQuestion } from '@/data/api';
import { useAttemptStore, type Choice, type GotoResult } from '@/data/attempt';
import { counts, elapsedOnCurrentSec, sectionOf } from '@/data/attempt.selectors';
import { saveCompletedAttempt } from '@/data/complete';
import { useLangStore } from '@/data/lang';
import { gateHref, useRequireAuth } from '@/data/requireAuth';
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
import { Button, haptics, LoadError, Screen, Skeleton, Stack, Text, type SheetHandle } from '@/ui';

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
  return <TestAttempt key={id} id={id} />;
}

/** Test attempt (F-09/10/11): wires the attempt store, the mock API, the clock and the router. */
function TestAttempt({ id }: { id: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const attempt = useAttemptStore();
  const lang = useLangStore((s) => s.lang);
  const setLang = useLangStore((s) => s.setLang);
  const { offline } = useNetwork();
  const [submittedOnEntry] = useState(() => {
    const state = useAttemptStore.getState();
    return state.testId === id && ['submitted', 'autoSubmitted'].includes(state.status);
  });
  const conflict = attempt.status === 'running' && attempt.testId !== id;

  const [paper, setPaper] = useState<PaperQuestion[]>([]);
  // The paper never arrived. Bumping `attempt` re-runs the load; the screen is otherwise
  // a blank stem with four blank options and no way out but the back gesture.
  const [failed, setFailed] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [dialog, setDialog] = useState<AttemptDialogKind | null>(null);
  const [toast, setToast] = useState<AttemptToast | null>(null);
  const sheet = useRef<SheetHandle>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const syncChain = useRef(Promise.resolve());

  const running = attempt.testId === id && attempt.status === 'running';
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
    if (!id || conflict || submittedOnEntry) return;
    let cancelled = false;
    const initial = useAttemptStore.getState();
    const resumingId =
      initial.testId === id && initial.status === 'running' ? initial.attemptId : undefined;
    void (async () => {
      const api = getApi();
      let meta;
      try {
        const remoteResume = resumingId && !resumingId.startsWith('local-');
        const [loadedMeta, questions] = await Promise.all([
          remoteResume ? api.getAttemptMeta(resumingId) : api.getTestMeta(id),
          remoteResume ? api.getAttemptPaper(resumingId) : api.getPaper(id),
        ]);
        if (cancelled) return;
        meta = loadedMeta;
        setPaper(questions);
        // An already-expired resumed clock can submit while the paper is loading.
        if (resumingId) void saveCompletedAttempt(questions).catch(() => undefined);
        setFailed(false);
      } catch {
        // Creating the attempt is allowed to fail (offline start below); loading the paper
        // is not — without questions there is nothing to sit.
        if (!cancelled) setFailed(true);
        return;
      }
      const state = useAttemptStore.getState();
      // A running attempt on this same test is resumed, never restarted.
      if (state.testId === id && state.status === 'running') return;
      if (resumingId && state.attemptId === resumingId) return;
      try {
        const created = await api.createAttempt({ test_id: id });
        const [snapshotMeta, snapshotPaper] = await Promise.all([
          api.getAttemptMeta(created.id),
          api.getAttemptPaper(created.id),
        ]);
        if (cancelled) return;
        const current = useAttemptStore.getState();
        if (current.attemptId !== initial.attemptId || current.status === 'running') return;
        useAttemptStore
          .getState()
          .start(snapshotMeta, { attemptId: created.id, endsAt: Date.parse(created.ends_at) });
        setPaper(snapshotPaper);
      } catch (error) {
        if (!(error instanceof ApiError) || (error.status !== 0 && error.status < 500)) {
          if (!cancelled) setFailed(true);
          return;
        }
        // Offline start: a local attempt id and a deadline computed from the pattern.
        const current = useAttemptStore.getState();
        if (!cancelled && current.attemptId === initial.attemptId && current.status !== 'running')
          current.start(meta);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, loadAttempt, conflict, submittedOnEntry]);

  // ------------------------------------------------------------------- clock

  const { remainingSec } = useCountdown({
    endsAt: attempt.testId === id ? attempt.endsAt : undefined,
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
      useAttemptStore.getState().autoSubmit();
      void saveCompletedAttempt(paper).catch(() => undefined);
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

  /** Best-effort sync of one answer row; the attempt is fully playable offline. */
  const patchAnswer = useCallback(
    (n: number, choice: number | null, marked: boolean) => {
      const state = useAttemptStore.getState();
      const question = paper[n - 1];
      if (
        state.testId !== id ||
        state.status !== 'running' ||
        (state.endsAt !== undefined && Date.now() >= state.endsAt) ||
        !state.attemptId ||
        state.attemptId.startsWith('local-') ||
        !question
      )
        return;
      const attemptId = state.attemptId;
      syncChain.current = syncChain.current
        .catch(() => undefined)
        .then(() =>
          getApi().patchAttemptAnswer(attemptId, { question_id: question.id, choice, marked }),
        )
        .then(() => undefined)
        .catch(() => undefined);
    },
    [id, paper],
  );

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
      if (result === 'ok') clearToast();
    },
    [clearToast, showToast, t],
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
      patchAnswer(n, choice, state.marked[n] === true);
    },
    [patchAnswer],
  );

  const onClear = useCallback(() => {
    const state = useAttemptStore.getState();
    const n = state.current;
    state.clear(n);
    patchAnswer(n, null, state.marked[n] === true);
  }, [patchAnswer]);

  const onToggleMark = useCallback(() => {
    const state = useAttemptStore.getState();
    const n = state.current;
    state.toggleMark(n);
    patchAnswer(n, state.answers[n] ?? null, useAttemptStore.getState().marked[n] === true);
  }, [patchAnswer]);

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

  const openResult = useCallback(() => {
    void saveCompletedAttempt(paper).catch(() => undefined);
    router.replace(testResultHref(id));
  }, [id, paper, router]);

  const onSubmit = useCallback(() => {
    const state = useAttemptStore.getState();
    haptics.success();
    state.submit();
    void saveCompletedAttempt(paper).catch(() => undefined);
    setDialog(null);
    openResult();
  }, [openResult, paper]);

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
        onDismiss={() => setDialog(null)}
        onLeave={() => {
          setDialog(null);
          router.back();
        }}
        onSubmit={onSubmit}
        onSeeResult={() => {
          setDialog(null);
          openResult();
        }}
      />
    </>
  );

  if (submittedOnEntry) return <Redirect href={testResultHref(id)} />;

  if (conflict)
    return (
      <Screen>
        <Stack gap={4} className="p-4">
          <Text variant="title">{t('test.conflictTitle')}</Text>
          <Text>{t('test.conflictBody')}</Text>
          <Button
            label={t('test.resumeExisting')}
            onPress={() => router.replace(testAttemptHref(attempt.testId!))}
          />
          <Button label={t('common.back')} variant="secondary" onPress={() => router.back()} />
        </Stack>
      </Screen>
    );

  if (failed)
    return (
      <Screen testID="attempt-screen">
        <LoadError onRetry={() => setLoadAttempt((n) => n + 1)} testID="attempt-load-error" />
      </Screen>
    );

  if (attempt.testId !== id || paper.length !== attempt.pattern?.totalQuestions)
    return (
      <Screen>
        <Skeleton blocks={['kicker', 'card', 'row', 'row']} />
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
