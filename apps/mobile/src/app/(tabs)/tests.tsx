import { useLangStore } from '@/data/lang';
import { useRequireAuth } from '@/data/requireAuth';
import { LibraryView } from '@/features/library/LibraryView';

/** F-08 — the test library. Readable as a guest; sitting a paper is what asks for an account. */
export default function LibraryRoute() {
  const lang = useLangStore((s) => s.lang);
  const { ensure } = useRequireAuth();
  // A locked paper never reaches here: `LibraryView` answers that tap with its own toast, and
  // a paywall is not a reason to make someone sign in.
  return <LibraryView lang={lang} onOpen={(id) => ensure(`/test/${id}`)} />;
}
