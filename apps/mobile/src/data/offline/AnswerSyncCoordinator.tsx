import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { offlineUserId, useSessionStore } from '../session';
import { useNetwork } from '../useNetwork';
import { requestAnswerSyncForCurrentUser } from './answerSync';
import { requestSubmissionSyncForCurrentUser } from './submissionSync';

/** Starts foreground-only answer sync on login, reconnect, startup, and app foreground. */
export function AnswerSyncCoordinator({
  onSubmitted,
}: {
  onSubmitted?: (resultId: string) => void;
} = {}) {
  const token = useSessionStore((state) => state.token);
  const userId = useSessionStore(offlineUserId);
  const { offline } = useNetwork();
  const openedResults = useRef(new Set<string>());

  const run = useCallback(
    async (resumeAuthentication = false) => {
      await requestAnswerSyncForCurrentUser(resumeAuthentication);
      const submissions = await requestSubmissionSyncForCurrentUser(resumeAuthentication);
      for (const completed of submissions?.completed ?? []) {
        if (openedResults.current.has(completed.resultId)) continue;
        openedResults.current.add(completed.resultId);
        onSubmitted?.(completed.resultId);
      }
    },
    [onSubmitted],
  );

  useEffect(() => {
    if (token && userId) void run(true).catch(() => undefined);
  }, [run, token, userId]);

  useEffect(() => {
    if (!offline && token && userId) void run().catch(() => undefined);
  }, [offline, run, token, userId]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void run().catch(() => undefined);
    });
    return () => subscription.remove();
  }, [run]);

  return null;
}
