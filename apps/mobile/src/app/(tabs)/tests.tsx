import { useRouter } from 'expo-router';

import { LibraryView } from '@/features/library/LibraryView';

/** F-08 — the test library. */
export default function LibraryRoute() {
  const router = useRouter();
  return <LibraryView onOpen={(id) => router.push(`/test/${id}`)} />;
}
