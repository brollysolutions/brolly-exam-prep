import { colors } from '@tslprb/design-tokens';
import { CATEGORIES, type CategoryId, type Post } from '@tslprb/fixtures';
import { LANGS, useDir, type Lang } from '@tslprb/i18n';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import {
  Button,
  Card,
  cx,
  Dialog,
  Glyph,
  Kicker,
  Row,
  Screen,
  SegmentedChips,
  Stack,
  Text,
  Toggle,
  usePressed,
} from '@/ui';

const POST_TITLE: Record<Post, string> = {
  pc: 'onboarding.pcTitle',
  si: 'onboarding.siTitle',
};

/** 56 px settings row: label at the start, value/control at the end, hairline underneath. */
function SettingRow({
  label,
  children,
  onPress,
  testID,
  first = false,
}: {
  label: string;
  children: ReactNode;
  onPress?: () => void;
  testID?: string;
  first?: boolean;
}) {
  const { pressed, handlers } = usePressed();
  const body = (
    <Row
      testID={testID ? `${testID}-row` : undefined}
      gap={3}
      align="center"
      justify="between"
      className="h-touchLg"
    >
      <Text variant="body" weight="600" className="flex-1">
        {label}
      </Text>
      {children}
    </Row>
  );
  const border = cx(!first && 'border-t border-line');
  if (!onPress) {
    return (
      <View testID={testID} className={border}>
        {body}
      </View>
    );
  }
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      android_ripple={{ color: colors.hivisTint3 }}
      onPress={onPress}
      {...handlers}
      className={border}
      style={pressed ? { opacity: 0.85 } : undefined}
    >
      {body}
    </Pressable>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Stack gap={2} className="mt-6">
      <Kicker>{title}</Kicker>
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
  const d = useDir();
  const [confirming, setConfirming] = useState(false);
  const langOptions = LANGS.map((l: Lang) => ({ value: l, label: t(`lang.${l}Short`), lang: l }));
  const categoryLabel = CATEGORIES.find((c) => c.id === category)?.labelKey;

  const chevron = (
    <Glyph color="dim" accessibilityElementsHidden importantForAccessibility="no">
      {d.chevronNext}
    </Glyph>
  );

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
          tone="flag"
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
      <Text variant="titleLg" weight="600" className="mt-5">
        {t('profile.title')}
      </Text>

      <Section title={t('profile.sectionExam')}>
        <SettingRow
          first
          testID="profile-post"
          label={t('profile.post')}
          onPress={onEditPost}
        >
          <Row gap={2} align="center">
            <Text variant="body" color="dim">
              {post ? t(POST_TITLE[post]) : '—'}
            </Text>
            {chevron}
          </Row>
        </SettingRow>
        <SettingRow testID="profile-category" label={t('profile.category')} onPress={onEditCategory}>
          <Row gap={2} align="center">
            <Text variant="body" color="dim">
              {categoryLabel ? t(categoryLabel) : '—'}
            </Text>
            {chevron}
          </Row>
        </SettingRow>
      </Section>

      <Section title={t('profile.sectionApp')}>
        <SettingRow first testID="profile-language" label={t('profile.language')}>
          <SegmentedChips
            value={lang}
            onChange={onLang}
            options={langOptions}
            testID="profile-lang"
          />
        </SettingRow>
        {/* One control, one accessibility node: the `Toggle` carries the switch role and its
            own hit slop, so the row around it stays a plain label. */}
        <SettingRow label={t('profile.notifications')}>
          <Toggle
            testID="profile-notifications"
            value={notifications}
            onValueChange={onNotifications}
            accessibilityLabel={t('profile.notifications')}
          />
        </SettingRow>
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
            {/* Solid flag lives inside the dialog, where the press actually destroys something. */}
            <Button
              testID="profile-delete"
              variant="dangerOutline"
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
            <Text variant="caption" color="dim">
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

      <Text variant="caption" color="dim" testID="profile-version" className="mt-6">
        {t('profile.version', { v: version })}
      </Text>
    </Screen>
  );
}
