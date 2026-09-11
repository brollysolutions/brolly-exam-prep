import { latestAffairs, useContentData } from '@/data/content';
import { useRouter } from 'expo-router';

import { useLangStore } from '@/data/lang';
import { AffairsView } from '@/features/news/AffairsView';

/**
 * Sorted once at module scope: the digest is a fixture, so re-sorting it on every render
 * would only hand the list a new array to diff. When the API lands this becomes a query.
 */
/**
 * F-24 — today's current affairs, grouped by day.
 *
 * No gate: this is general-studies revision, the same as the study material, and an account
 * buys a saved attempt rather than the reading.
 */
export default function AffairsRoute() {
  const content = useContentData();
  const router = useRouter();
  const lang = useLangStore((s) => s.lang);

  return (
    <AffairsView
      affairs={latestAffairs(undefined, content.affairs)}
      lang={lang}
      onBack={() => router.back()}
    />
  );
}
