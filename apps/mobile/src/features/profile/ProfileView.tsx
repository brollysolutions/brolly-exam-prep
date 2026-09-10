import { CATEGORIES, type CategoryId, type Post } from '@tslprb/fixtures/src/runtime';
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
  /**
   * The *confirmed* sign-out. Signing out erases this phone's practice record — scores,
   * streak, topics read, measurements — and none of it is stored anywhere else yet, so the
   * screen asks before calling this.
   */
  onLogout: () => void;
  /**
   * Confirmed account deletion, phase 1: everything sign-out erases plus the language and the
   * welcome flag, leaving a fresh install. The account-deletion endpoint lands with the
   * database (F-17 phase 2); until then there is no account on a server to delete.
   */
  onDelete: () => void;
};

/** Which destructive exit is waiting on a yes. One at a time: the screen has one overlay. */
type PendingExit = 'logout' | 'delete';

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
  const [pending, setPending] = useState<PendingExit | undefined>(undefined);
  const langOptions = LANGS.map((l: Lang) => ({ value: l, label: t(`lang.${l}Short`), lang: l }));
  const categoryLabel = CATEGORIES.find((c) => c.id === category)?.labelKey;
  /** An answer the app has not been given yet, drawn rather than guessed. */
  const EM_DASH = t('audit.notSelected');

  return (
    <Screen
      scroll
      padded
      bottomInset={false}
      testID="profile-screen"
      overlay={
        !signedIn ? undefined : (
          <>
            {/* Gold, not red: this card asks, it does not deliver a verdict — the same tone
                the attempt screen's "leave this paper?" wears. The words carry the warning,
                because nothing signed out is recoverable from a server yet. */}
            <Dialog
              testID="profile-logout-dialog"
              visible={pending === 'logout'}
              onDismiss={() => setPending(undefined)}
              kicker={t('profile.logout')}
              title={t('profile.logoutTitle')}
              body={t('profile.logoutConfirm')}
              primary={{
                label: t('profile.logoutYes'),
                onPress: () => {
                  setPending(undefined);
                  onLogout();
                },
              }}
              secondary={{ label: t('common.cancel'), onPress: () => setPending(undefined) }}
            />
            <Dialog
              testID="profile-delete-dialog"
              visible={pending === 'delete'}
              onDismiss={() => setPending(undefined)}
              tone="danger"
              kicker={t('profile.deleteAccount')}
              title={t('profile.deleteTitle')}
              body={t('profile.deleteConfirm')}
              primary={{
                label: t('profile.deleteYes'),
                onPress: () => {
                  setPending(undefined);
                  onDelete();
                },
              }}
              secondary={{ label: t('common.cancel'), onPress: () => setPending(undefined) }}
            />
          </>
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
          trailingLabel={post ? t(POST_TITLE[post]) : EM_DASH}
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
          trailingLabel={categoryLabel ? t(categoryLabel) : EM_DASH}
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
            {/* Both exits ask first. Signing out is no longer just dropping a token: it
                erases the practice record this phone holds, and holds alone. */}
            <Button
              testID="profile-logout"
              variant="secondary"
              label={t('profile.logout')}
              onPress={() => setPending('logout')}
            />
            {/* Solid red lives inside the dialog, where the press actually destroys something. */}
            <Button
              testID="profile-delete"
              variant="danger"
              label={t('profile.deleteAccount')}
              onPress={() => setPending('delete')}
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
