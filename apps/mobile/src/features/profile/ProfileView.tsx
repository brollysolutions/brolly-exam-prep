import { CATEGORIES, type CategoryId, type Post } from '@tslprb/fixtures';
import { LANGS, type Lang } from '@tslprb/i18n';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  Button,
  Card,
  Dialog,
  MarkerRow,
  PageHeader,
  Pill,
  Screen,
  SegmentedChips,
  Stack,
  Text,
  Toggle,
} from '@/ui';

const POST_TITLE: Record<Post, string> = {
  pc: 'onboarding.pcTitle',
  si: 'onboarding.siTitle',
};

/** A pill heading over one card of rows: the group is the card, not a run of boxes. */
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Stack gap={2} className="mt-7">
      <Pill label={title} />
      <Card>{children}</Card>
    </Stack>
  );
}

export type ProfileViewProps = {
  post?: Post;
  category?: CategoryId;
  /**
   * F-19: a guest gets the same settings and an invitation instead of an account section.
   * There is nothing to log out of and nothing to delete, so neither exit is offered.
   */
  signedIn: boolean;
  lang: Lang;
  notifications: boolean;
  /** From `expoConfig.version` — the number a support call asks for first. */
  version: string;
  onLang: (lang: Lang) => void;
  onNotifications: (on: boolean) => void;
  onSignIn: () => void;
  onEditPost: () => void;
  onEditCategory: () => void;
  onLogout: () => void;
  /**
   * Confirmed account deletion, phase 1: same local reset as sign-out; the
   * account-deletion endpoint lands with F-17 phase 2.
   */
  onDelete: () => void;
};

/**
 * F-14 — profile and settings. Two answers the app was given during onboarding, two
 * preferences, and the two ways out. The destructive one is last, red, and asks first.
 */
export function ProfileView({
  post,
  category,
  signedIn,
  lang,
  notifications,
  version,
  onLang,
  onNotifications,
  onSignIn,
  onEditPost,
  onEditCategory,
  onLogout,
  onDelete,
}: ProfileViewProps) {
  const { t } = useTranslation();
  const [confirming, setConfirming] = useState(false);
  const langOptions = LANGS.map((l: Lang) => ({ value: l, label: t(`lang.${l}Short`), lang: l }));
  const categoryLabel = CATEGORIES.find((c) => c.id === category)?.labelKey;
  /** An answer the app has not been given yet, drawn rather than guessed. */
  const EM_DASH = '—';

  return (
    <Screen
      scroll
      padded
      bottomInset={false}
      testID="profile-screen"
      overlay={
        !signedIn ? undefined : (
          <Dialog
            testID="profile-delete-dialog"
            visible={confirming}
            tone="danger"
            kicker={t('profile.deleteAccount')}
            title={t('profile.deleteTitle')}
            body={t('profile.deleteConfirm')}
            primary={{
              label: t('profile.deleteYes'),
              onPress: () => {
                setConfirming(false);
                onDelete();
              },
            }}
            secondary={{ label: t('common.cancel'), onPress: () => setConfirming(false) }}
          />
        )
      }
    >
      <PageHeader testID="profile-header" title={t('profile.title')} />

      <Section title={t('profile.sectionExam')}>
        <MarkerRow
          first
          testID="profile-post"
          title={t('profile.post')}
          onPress={onEditPost}
          chevron
          accessibilityLabel={t('profile.post')}
          trailing={
            <Text variant="body" color="ink3">
              {post ? t(POST_TITLE[post]) : EM_DASH}
            </Text>
          }
        />
        <MarkerRow
          testID="profile-category"
          title={t('profile.category')}
          onPress={onEditCategory}
          chevron
          accessibilityLabel={t('profile.category')}
          trailing={
            <Text variant="body" color="ink3">
              {categoryLabel ? t(categoryLabel) : EM_DASH}
            </Text>
          }
        />
      </Section>

      <Section title={t('profile.sectionApp')}>
        <MarkerRow
          first
          testID="profile-language"
          title={t('profile.language')}
          trailing={
            <SegmentedChips
              value={lang}
              onChange={onLang}
              options={langOptions}
              testID="profile-lang"
            />
          }
        />
        {/* One control, one accessibility node: the `Toggle` carries the switch role and its
            own hit slop, so the row around it stays a plain label. */}
        <MarkerRow
          title={t('profile.notifications')}
          trailing={
            <Toggle
              testID="profile-notifications"
              value={notifications}
              onValueChange={onNotifications}
              accessibilityLabel={t('profile.notifications')}
            />
          }
        />
      </Section>

      <Section title={t('profile.sectionAccount')}>
        {signedIn ? (
          <Stack gap={3}>
            <Button
              testID="profile-logout"
              variant="secondary"
              label={t('profile.logout')}
              onPress={onLogout}
            />
            {/* Solid red lives inside the dialog, where the press actually destroys something. */}
            <Button
              testID="profile-delete"
              variant="danger"
              label={t('profile.deleteAccount')}
              onPress={() => setConfirming(true)}
            />
          </Stack>
        ) : (
          /* The one place on the screen that says what an account is for. It is an offer, not
             a wall: everything above it works without one. */
          <Stack gap={2} testID="profile-signed-out">
            <Text variant="subtitle" weight="700">
              {t('profile.signedOutTitle')}
            </Text>
            {/* Body, not caption: this is the one paragraph on the screen, and 12 px
                under a 19 px title read as small print (design review D13). */}
            <Text variant="body" color="ink3">
              {t('profile.signedOutBody')}
            </Text>
            <Button
              testID="profile-signin"
              label={t('common.signIn')}
              onPress={onSignIn}
              className="mt-2"
            />
          </Stack>
        )}
      </Section>

      <Text variant="caption" color="ink3" testID="profile-version" className="mt-7">
        {t('profile.version', { v: version })}
      </Text>
    </Screen>
  );
}
