import type { TestKind } from '@tslprb/fixtures';
import { useLocalSearchParams } from 'expo-router';

import { useLangStore } from '@/data/lang';
import { useRequireAuth } from '@/data/requireAuth';
import { LibraryView } from '@/features/library/LibraryView';

const KINDS: TestKind[] = ['full', 'sectional', 'previous'];
const isKind = (value: string | undefined): value is TestKind => KINDS.includes(value as TestKind);

/** F-08 — the test library. Readable as a guest; sitting a paper is what asks for an account. */
export default function LibraryRoute() {
  // `?kind=sectional` — how a study topic sends you here to drill its section (F-21).
  const { kind } = useLocalSearchParams<{ kind?: string }>();
  const lang = useLangStore((s) => s.lang);
  const { ensure } = useRequireAuth();
  const shelf = isKind(kind) ? kind : undefined;
  // A locked paper never reaches here: `LibraryView` answers that tap with its own toast, and
  // a paywall is not a reason to make someone sign in.
  return (
    <LibraryView
      // The shelf is `LibraryView`'s own state after mount, so arriving with a different
      // `kind` on an already-mounted tab has to remount it — otherwise the link opens the
      // library on whichever shelf it was last left.
      key={shelf ?? 'full'}
      lang={lang}
      initialKind={shelf}
      onOpen={(id) => ensure(`/test/${id}`)}
    />
  );
}
