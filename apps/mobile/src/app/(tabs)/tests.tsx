import type { TestKind } from '@tslprb/fixtures';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useLangStore } from '@/data/lang';
import { useRequireAuth } from '@/data/requireAuth';
import { LibraryView } from '@/features/library/LibraryView';

const KINDS: TestKind[] = ['full', 'sectional', 'previous'];

/**
 * `?kind=` off the URL, and nothing else: the value arrives from a link, so an unknown shelf
 * name falls back to the default rather than leaving the list empty.
 */
function asKind(value: string | string[] | undefined): TestKind | undefined {
  return KINDS.find((k) => k === value);
}

/** F-08 — the test library. Readable as a guest; sitting a paper is what asks for an account. */
export default function LibraryRoute() {
  const lang = useLangStore((s) => s.lang);
  const { kind } = useLocalSearchParams<{ kind?: string }>();
  const { ensure } = useRequireAuth();
  const router = useRouter();
  // A locked paper never reaches `onOpen`: `LibraryView` answers that tap with its own toast,
  // and a paywall is not a reason to make someone sign in. Viewing a previous paper is not a
  // reason either — it is reading, not an attempt, so it goes straight there (F-22).
  return (
    <LibraryView
      lang={lang}
      initialKind={asKind(kind)}
      onOpen={(id) => ensure(`/test/${id}`)}
      // The object form, not `/paper/${id}`: expo-router encodes the param, so an id is never
      // pasted into a path (the same reason `withReturnTo` uses it).
      onViewPaper={(id) => router.push({ pathname: '/paper/[id]', params: { id } })}
    />
  );
}
