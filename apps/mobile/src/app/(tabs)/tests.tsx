import { useRouter } from 'expo-router';

import { useLangStore } from '@/data/lang';
import { LibraryView } from '@/features/library/LibraryView';

/** F-08 — the test library. */
export default function LibraryRoute() {
  const router = useRouter();
  const lang = useLangStore((s) => s.lang);
  return <LibraryView lang={lang} onOpen={(id) => router.push(`/test/${id}`)} />;
}
