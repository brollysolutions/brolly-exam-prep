import { firstQuestionOf } from '@tslprb/fixtures';
import { Redirect, useRouter, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BackHandler } from 'react-native';

import { getApi, type PaperQuestion } from '@/data/api';
import { useAttemptStore, type Choice, type GotoResult } from '@/data/attempt';
import { counts, elapsedOnCurrentSec, sectionOf } from '@/data/attempt.selectors';
import { useLangStore } from '@/data/lang';
import { gateHref, useRequireAuth } from '@/data/requireAuth';
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
// Generic in name and in copy ("could not load, try again"), so the attempt screen borrows
// the result screens' placeholder rather than growing a second one.
import { LoadError } from '@/features/result/Placeholder';
import { haptics, Screen, type SheetHandle } from '@/ui';

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
export default function TestAttemptRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { signedIn, onboarded } = useRequireAuth();
  if (!signedIn || !onboarded)
    return <Redirect href={gateHref(`/test/${id}`, { signedIn, onboarded })} />;
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
    void (async () => {
      const api = getApi();
      let meta;
      try {
        const [loadedMeta, questions] = await Promise.all([api.getTestMeta(id), api.getPaper(id)]);
        if (cancelled) return;
        meta = loadedMeta;
        setPaper(questions);
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
      try {
        const created = await api.createAttempt({ test_id: id });
        if (cancelled) return;
        useAttemptStore
          .getState()
          .start(meta, { attemptId: created.id, endsAt: Date.parse(created.ends_at) });
      } catch {
        // Offline start: a local attempt id and a deadline computed from the pattern.
        if (!cancelled) useAttemptStore.getState().start(meta);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, loadAttempt]);

  // ------------------------------------------------------------------- clock

  const { remainingSec } = useCountdown({
    endsAt: attempt.endsAt,
    enabled: running,
    onWarn5: () => {
      haptics.warning();
      showToast({ key: 'warn5', text: t('test.warn5'), tone: 'hazard' });
    },
    onWarn1: () => {
      haptics.warning();
      showToast({ key: 'warn1', text: t('test.warn1'), tone: 'flag' });
    },
    onExpire: () => {
      useAttemptStore.getState().autoSubmit();
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
      if (!state.attemptId || !question) return;
      void getApi()
        .patchAttemptAnswer(state.attemptId, { question_id: question.id, choice, marked })
        .catch(() => undefined);
    },
    [paper],
  );

  const handleGoto = useCallback(
    (result: GotoResult, sectionIndex: number) => {
      if (result === 'locked') {
        showToast(
          {
            key: `locked-${sectionIndex}`,
            text: lockedMessage(t, useAttemptStore.getState().pattern, sectionIndex),
            tone: 'hazard',
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
      state.answer(n, choice);
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
    router.replace(`/test/${id}/result`);
  }, [id, router]);

  const onSubmit = useCallback(() => {
    const state = useAttemptStore.getState();
    haptics.success();
    state.submit();
    setDialog(null);
    if (state.attemptId)
      void getApi()
        .submitAttempt(state.attemptId)
        .catch(() => undefined);
    openResult();
  }, [openResult]);

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
      notices={<AttemptNotices offline={offline} toast={toast} />}
      overlay={overlay}
    />
  );
}
