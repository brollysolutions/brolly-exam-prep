import type { TestKind } from '@tslprb/fixtures';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';

import { useLangStore } from '@/data/lang';
import { useRequireAuth } from '@/data/requireAuth';
import { testAttemptHref } from '@/data/testRoutes';
import { LibraryView } from '@/features/library/LibraryView';

const KINDS: TestKind[] = ['full', 'previous'];

/**
 * `?kind=` off the URL, and nothing else: the value arrives from a link, so an unknown shelf
 * name falls back to the default rather than leaving the list empty.
 */
function asKind(value: string | string[] | undefined): TestKind | undefined {
  return KINDS.find((k) => k === value);
}

/** F-08 — the test library. Readable as a guest; sitting a paper is what asks for an account. */
export default function LibraryRoute() {
  // `?kind=previous` from Home's card (F-20). The Tests tab is already mounted when the card is
  // pressed, so the shelf has to move on the link too — `LibraryView` adjusts its own state,
  // which keeps the scroll position a remount would throw away. A study topic's Practise button
  // sends the reader here without a `?kind=`, and an older build's `?kind=sectional` bookmark
  // falls back to the default shelf: that shelf was dropped along with its drills.
  const { kind } = useLocalSearchParams<{ kind?: string }>();
  const lang = useLangStore((s) => s.lang);
  const { ensure } = useRequireAuth();
  const router = useRouter();
  // Pressing Home's card twice sends the *same* `?kind=previous` both times, so a shelf that
  // watched the value would ignore every request after the first — the candidate would tap the
  // card and stay on whatever chip they had chosen. The counter makes each arrival on this tab
  // its own identity, and `kindKey` is what `LibraryView` re-syncs on. Coming back from a paper
  // is an arrival too, and lands on the shelf the link named: within one visit the chip wins,
  // across visits the link does.
  const [visit, setVisit] = useState(0);
  useFocusEffect(
    useCallback(() => {
      setVisit((n) => n + 1);
    }, []),
  );
  // A locked paper never reaches `onOpen`: `LibraryView` answers that tap with its own toast,
  // and a paywall is not a reason to make someone sign in. Viewing a previous paper is not a
  // reason either — it is reading, not an attempt, so it goes straight there (F-22).
  return (
    <LibraryView
      lang={lang}
      initialKind={asKind(kind)}
      kindKey={`${kind}:${visit}`}
      onOpen={(id) => ensure(testAttemptHref(id))}
      // The object form, not `/paper/${id}`: expo-router encodes the param, so an id is never
      // pasted into a path (the same reason `withReturnTo` uses it).
      onViewPaper={(id) => router.push({ pathname: '/paper/[id]', params: { id } })}
    />
  );
}
