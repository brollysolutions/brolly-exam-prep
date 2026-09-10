import { latestNotices } from '@tslprb/fixtures/src/runtime';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Linking } from 'react-native';

import { useLangStore } from '@/data/lang';
import { UpdatesView } from '@/features/news/UpdatesView';

/**
 * Sorted once at module scope: the feed is a fixture, so re-sorting it on every render would
 * only hand the list a new array to diff. When the API lands this becomes a query.
 */
const FEED = latestNotices();

/**
 * F-24 — the Board's notice board.
 *
 * No gate. Whether the hall tickets are out is public information; asking a guest for a phone
 * number before showing it would cost more than it could ever buy.
 *
 * `?open=<id>` is what a tapped card on Home sends: the list opens with that notice expanded.
 */
export default function UpdatesRoute() {
  const router = useRouter();
  const { open } = useLocalSearchParams<{ open?: string }>();
  const lang = useLangStore((s) => s.lang);

  return (
    <UpdatesView
      notices={FEED}
      lang={lang}
      openId={open}
      onBack={() => router.back()}
      onOpenLink={(link) => {
        // The only failure here is a device with nothing registered for https, which leaves
        // the reader exactly where they were, on a screen that already carries the notice in
        // full. There is nothing useful to say about it, so the rejection is swallowed.
        Linking.openURL(link).catch(() => undefined);
      }}
    />
  );
}
