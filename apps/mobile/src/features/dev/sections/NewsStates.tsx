import { latestAffairs, latestNotices } from '@tslprb/fixtures';
import { type ReactNode } from 'react';
import { View } from 'react-native';

import { useLangStore } from '@/data/lang';
import { AffairsView } from '@/features/news/AffairsView';
import { UpdatesView } from '@/features/news/UpdatesView';
import { Kicker, Stack, Text } from '@/ui';

/** Developer-only gallery labels — not product copy, so deliberately outside the locale files. */
const DEV = {
  news: 'Updates & current affairs (F-24)',
  updates: 'UpdatesView — six notices, every kind of chip',
  updatesEmpty: 'UpdatesView — nothing from the Board yet',
  affairs: 'AffairsView — three days, all five categories',
  affairsEmpty: 'AffairsView — no digest yet',
} as const;

/** Dev frame: every screen is `flex-1`, so a preview inside a scroll needs a bounded height. */
const PREVIEW_H = 560;

function Preview({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Stack gap={2}>
      <Text variant="caption" color="dim">
        {label}
      </Text>
      <View className="overflow-hidden rounded-md border border-line" style={{ height: PREVIEW_H }}>
        {children}
      </View>
    </Stack>
  );
}

const noop = () => {};

const NOTICE_FEED = latestNotices();
const AFFAIR_FEED = latestAffairs();

/**
 * F-24 in the gallery. Its own file so the news screens can land without fighting
 * `StatesView.tsx` for the same lines.
 */
export function NewsStates({ index }: { index: string }) {
  const lang = useLangStore((s) => s.lang);

  return (
    <Stack gap={3} className="mt-6">
      <Kicker index={index} color="dim" uppercase>
        {DEV.news}
      </Kicker>

      <Preview label={DEV.updates}>
        <UpdatesView notices={NOTICE_FEED} lang={lang} onBack={noop} onOpenLink={noop} />
      </Preview>
      <Preview label={DEV.updatesEmpty}>
        <UpdatesView notices={[]} lang={lang} onBack={noop} />
      </Preview>
      <Preview label={DEV.affairs}>
        <AffairsView affairs={AFFAIR_FEED} lang={lang} onBack={noop} />
      </Preview>
      <Preview label={DEV.affairsEmpty}>
        <AffairsView affairs={[]} lang={lang} onBack={noop} />
      </Preview>
    </Stack>
  );
}
