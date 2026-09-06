import { findStudyTopic } from '@tslprb/fixtures';
import { type ReactNode } from 'react';
import { View } from 'react-native';

import { useLangStore } from '@/data/lang';
import { StudyView } from '@/features/study/StudyView';
import { TopicView } from '@/features/study/TopicView';
import { Kicker, Stack, Text } from '@/ui';

/** Developer-only gallery labels — not product copy, so deliberately outside the locale files. */
const DEV = {
  study: 'Study material (F-21)',
  list: 'StudyView — one topic read, the rest open',
  topic: 'TopicView — every block kind, unread',
  topicRead: 'TopicView — read: a badge instead of a button, the ink fill on the drills',
  topicMissing: 'TopicView — an id the shelf does not hold',
} as const;

/** Dev frame: every screen is `flex-1`, so a preview inside a scroll needs a bounded height. */
const PREVIEW_H = 560;

function Preview({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Stack gap={2}>
      <Text variant="caption" color="ink3">
        {label}
      </Text>
      <View className="overflow-hidden rounded-md border border-line" style={{ height: PREVIEW_H }}>
        {children}
      </View>
    </Stack>
  );
}

const noop = () => {};

// Time, speed and distance is the one topic that carries all six block kinds at once.
const SPEED = findStudyTopic('st-ar-speed');

/**
 * F-21 in the gallery. Its own file so the study screens can land without fighting
 * `StatesView.tsx` for the same lines.
 */
export function StudyStates({ index }: { index: string }) {
  const lang = useLangStore((s) => s.lang);
  const setLang = useLangStore((s) => s.setLang);

  return (
    <Stack gap={3} className="mt-6">
      <Kicker index={index} color="ink3" uppercase>
        {DEV.study}
      </Kicker>

      <Preview label={DEV.list}>
        <StudyView lang={lang} read={{ 'st-re-coding': true }} onOpen={noop} />
      </Preview>
      <Preview label={DEV.topic}>
        <TopicView
          topic={SPEED?.topic}
          section={SPEED?.section}
          lang={lang}
          onLang={setLang}
          onBack={noop}
          onMarkRead={noop}
          onPractise={noop}
        />
      </Preview>
      <Preview label={DEV.topicRead}>
        <TopicView
          topic={SPEED?.topic}
          section={SPEED?.section}
          lang={lang}
          onLang={setLang}
          read
          onBack={noop}
          onMarkRead={noop}
          onPractise={noop}
        />
      </Preview>
      <Preview label={DEV.topicMissing}>
        <TopicView lang={lang} onLang={setLang} onBack={noop} onMarkRead={noop} onPractise={noop} />
      </Preview>
    </Stack>
  );
}
