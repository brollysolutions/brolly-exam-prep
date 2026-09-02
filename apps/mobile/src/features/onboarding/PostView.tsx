import type { Post } from '@tslprb/fixtures';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';

import { Button, Card, Num, Screen, Stack, Text } from '@/ui';

/** Step 1 of 2: the two post families the PWT is written for. */
const POSTS: readonly { id: Post; titleKey: string; subKey: string }[] = [
  { id: 'pc', titleKey: 'onboarding.pcTitle', subKey: 'onboarding.pcSub' },
  { id: 'si', titleKey: 'onboarding.siTitle', subKey: 'onboarding.siSub' },
];

export type PostViewProps = {
  /** The post already on file, if the user is revisiting the step. */
  initialPost?: Post;
  busy?: boolean;
  onSubmit: (post: Post) => void;
};

/**
 * Onboarding 1/2. The post decides the exam pattern, the physical standards and which tests
 * the library offers, so nothing else can be chosen until it is.
 */
export function PostView({ initialPost, busy = false, onSubmit }: PostViewProps) {
  const { t } = useTranslation();
  const [post, setPost] = useState<Post | undefined>(initialPost);

  return (
    <Screen testID="post-screen">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-3 pt-6"
        showsVerticalScrollIndicator={false}
      >
        <Num variant="kicker" weight="700" color="hazard" tracking="kicker" testID="post-step">
          {t('onboarding.step', { n: 1, total: 2 })}
        </Num>
        <Text variant="title" weight="600" className="mt-3">
          {t('onboarding.postTitle')}
        </Text>
        <Text variant="small" color="dim" className="mt-2">
          {t('onboarding.postSub')}
        </Text>
        <Stack testID="post-cards" gap={3} className="mt-6">
          {POSTS.map((p) => (
            <Card
              key={p.id}
              testID={`post-card-${p.id}`}
              title={t(p.titleKey)}
              subtitle={t(p.subKey)}
              selected={post === p.id}
              onPress={() => setPost(p.id)}
            />
          ))}
        </Stack>
      </ScrollView>
      <View className="px-3 pb-4">
        <Button
          testID="post-continue"
          size="lg"
          label={t('common.continue')}
          disabled={post === undefined || busy}
          onPress={() => post !== undefined && onSubmit(post)}
        />
      </View>
    </Screen>
  );
}
