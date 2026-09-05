import { Ionicons } from '@expo/vector-icons';
import { colors, size } from '@tslprb/design-tokens';
import type { Post } from '@tslprb/fixtures';
import { useDir } from '@tslprb/i18n';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView } from 'react-native';

import { ActionBar, BackRow, Button, Card, Num, PageHeader, Pill, Screen, Stack } from '@/ui';

/** Step 1 of 2: the two post families the PWT is written for. */
const POSTS: readonly { id: Post; titleKey: string; subKey: string }[] = [
  { id: 'pc', titleKey: 'onboarding.pcTitle', subKey: 'onboarding.pcSub' },
  { id: 'si', titleKey: 'onboarding.siTitle', subKey: 'onboarding.siSub' },
];

/** The chosen card's mark: a filled circle reads as chosen where a bare tick reads as a tip. */
const CHECK = size.iconLg;

export type PostViewProps = {
  /** The post already on file, if the user is revisiting the step. */
  initialPost?: Post;
  onSubmit: (post: Post) => void;
  /**
   * Since F-19 step 1 can be reached from anywhere, so there has to be a way back. Omitted on
   * a first-run sign-up, where the step is the beginning and there is nothing behind it.
   */
  onBack?: () => void;
};

/**
 * Onboarding 1/2. The post decides the exam pattern, the physical standards and which tests
 * the library offers, so nothing else can be chosen until it is.
 */
export function PostView({ initialPost, onSubmit, onBack }: PostViewProps) {
  const { t } = useTranslation();
  const d = useDir();
  const [post, setPost] = useState<Post | undefined>(initialPost);

  return (
    // The `ActionBar` at the foot owns the bottom inset, the way the tab bar does (I1).
    <Screen testID="post-screen" bottomInset={false}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-3"
        showsVerticalScrollIndicator={false}
      >
        {onBack && <BackRow testID="post-back" label={t('common.back')} onPress={onBack} />}
        <PageHeader
          testID="post-header"
          pill={
            <Pill
              leading={
                <Num
                  variant="caption"
                  weight="700"
                  testID="post-step"
                  tracking={d.lang === 'en' ? 'kicker' : 'none'}
                >
                  {t('onboarding.step', { n: 1, total: 2 })}
                </Num>
              }
            />
          }
          title={t('onboarding.postTitle')}
          subtitle={t('onboarding.postSub')}
        />
        <Stack testID="post-cards" gap={3} className="mt-6">
          {POSTS.map((p) => (
            <Card
              key={p.id}
              // The step's own corner: the spec draws the post cards one radius softer than
              // the app's 8 px card, which `Card` can now say without a second class (F-30).
              radius="lg"
              testID={`post-card-${p.id}`}
              title={t(p.titleKey)}
              subtitle={t(p.subKey)}
              selected={post === p.id}
              onPress={() => setPost(p.id)}
              trailing={
                post === p.id ? (
                  <Ionicons
                    testID={`post-check-${p.id}`}
                    name="checkmark-circle"
                    size={CHECK}
                    color={colors.accentStrong}
                    accessibilityElementsHidden
                    importantForAccessibility="no"
                  />
                ) : undefined
              }
            />
          ))}
        </Stack>
      </ScrollView>
      <ActionBar
        testID="post-bar"
        primary={
          <Button
            testID="post-continue"
            size="lg"
            label={t('common.continue')}
            disabled={post === undefined}
            onPress={() => post !== undefined && onSubmit(post)}
          />
        }
      />
    </Screen>
  );
}
