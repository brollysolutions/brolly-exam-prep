import { size } from '@tslprb/design-tokens';
import { dir, useDir } from '@tslprb/i18n';
import type { ExamPattern } from '@tslprb/fixtures';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import type { PaletteCounts } from '@/data/attempt.selectors';
import { Banner, cx, Dialog, Kicker, Num, Row, Stack, Text, Toast } from '@/ui';

/** The four confirmation cards of the attempt screen (prototype `D` map). */
export type AttemptDialogKind = 'exit' | 'submit' | 'resume' | 'auto';

export type AttemptToast = {
  text: string;
  tone: 'hazard' | 'flag';
  /** Distinguishes one notice from the next so a repeat re-announces. */
  key: string;
};

/**
 * "The Telangana section unlocks after you finish General Studies." Pure, so the route and the
 * dev gallery build the identical string.
 */
export function lockedMessage(
  t: TFunction,
  pattern: ExamPattern | undefined,
  sectionIndex: number,
): string {
  const section = pattern?.sections[sectionIndex];
  const gate = pattern?.sections.find((s) => s.id === section?.unlockAfter);
  return t('test.lockedMsg', {
    section: section ? t(section.labelKey) : '',
    previous: gate ? t(gate.labelKey) : '',
  });
}

export type AttemptNoticesProps = {
  offline?: boolean;
  toast?: AttemptToast | null;
};

/** Offline banner and timer/locked toast, in flow directly under the header. */
export function AttemptNotices({ offline = false, toast }: AttemptNoticesProps) {
  return (
    <>
      {offline && <Banner testID="attempt-offline" />}
      {toast && (
        <Toast key={toast.key} text={toast.text} tone={toast.tone} testID="attempt-toast" />
      )}
    </>
  );
}

export type AttemptDialogsProps = {
  kind: AttemptDialogKind | null;
  counts: PaletteCounts;
  /** Close the dialog and go back to the paper (Stay / Go back / Continue). */
  onDismiss: () => void;
  /** Exit dialog, secondary: leave the attempt. */
  onLeave: () => void;
  /** Submit dialog, primary: submit and open the result. */
  onSubmit: () => void;
  /** Auto-submit dialog, primary: open the (queued) result. */
  onSeeResult: () => void;
};

/** All four attempt dialogs; at most one is visible, so they share `Screen`'s overlay slot. */
export function AttemptDialogs({
  kind,
  counts,
  onDismiss,
  onLeave,
  onSubmit,
  onSeeResult,
}: AttemptDialogsProps) {
  const { t } = useTranslation();
  return (
    <>
      <Dialog
        visible={kind === 'exit'}
        tone="hazard"
        kicker={t('test.exitKicker')}
        title={t('test.exitTitle')}
        body={t('test.exitBody')}
        primary={{ label: t('test.stay'), onPress: onDismiss }}
        secondary={{ label: t('test.leave'), onPress: onLeave }}
        testID="dialog-exit"
      />
      <Dialog
        visible={kind === 'submit'}
        tone="hivis"
        kicker={t('test.submitKicker')}
        title={t('test.submitTitle')}
        body={t('test.submitBody')}
        stats={[
          { num: counts.answered, label: t('test.answered') },
          { num: counts.notAnswered, label: t('test.notAnswered') },
          { num: counts.marked, label: t('test.marked') },
        ]}
        primary={{ label: t('test.submitYes'), onPress: onSubmit }}
        secondary={{ label: t('test.submitNo'), onPress: onDismiss }}
        testID="dialog-submit"
      />
      <Dialog
        visible={kind === 'resume'}
        tone="hivis"
        kicker={t('test.resumeKicker')}
        title={t('test.resumeTitle')}
        body={t('test.resumeBody')}
        primary={{ label: t('test.resume'), onPress: onDismiss }}
        testID="dialog-resume"
      />
      <Dialog
        visible={kind === 'auto'}
        tone="flag"
        kicker={t('test.autoKicker')}
        title={t('test.autoTitle')}
        body={t('test.autoBody')}
        primary={{ label: t('test.seeQueue'), onPress: onSeeResult }}
        testID="dialog-auto"
      />
    </>
  );
}

/** Placeholder caller for the simulated interruption; never a real number. */
const CALL_NUMBER = '+91 90000 12345';

export type CallOverlayProps = {
  visible: boolean;
  /** Both buttons end the simulation; the screen then raises the resume dialog. */
  onEnd: () => void;
};

/**
 * The simulated incoming call. Demo-only: it exists to show that an OS interruption does not
 * end the attempt, so only the dev states gallery mounts it — the route never does.
 */
export function CallOverlay({ visible, onEnd }: CallOverlayProps) {
  const { t } = useTranslation();
  const d = useDir();
  if (!visible) return null;
  return (
    <View
      testID="call-overlay"
      accessibilityViewIsModal
      className="absolute inset-0 items-center justify-between bg-ink px-6 pb-10 pt-16"
    >
      <Stack align="center" gap={2}>
        <Kicker color="steel" align="center">
          {t('test.incomingCall')}
        </Kicker>
        <Num variant="display" weight="600" align="center">
          {CALL_NUMBER}
        </Num>
        <Text variant="body" color="steel" align="center">
          {t('test.simulatedCall')}
        </Text>
      </Stack>

      <View
        className={cx(
          'w-full border border-line px-3 py-3',
          dir(d, 'border-l-3 border-l-hivis', 'border-r-3 border-r-hivis'),
        )}
      >
        <Text variant="small" color="chalk2">
          {t('test.callNote')}
        </Text>
      </View>

      <Row gap={6}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('test.callDecline')}
          onPress={onEnd}
          testID="call-decline"
          className="items-center justify-center rounded-full bg-flag"
          style={({ pressed }) => [
            { width: size.call, height: size.call },
            pressed ? { opacity: 0.85 } : null,
          ]}
        >
          <Text variant="glyph" color="white">
            ✕
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('test.callAccept')}
          onPress={onEnd}
          testID="call-accept"
          className="items-center justify-center rounded-full bg-success"
          style={({ pressed }) => [
            { width: size.call, height: size.call },
            pressed ? { opacity: 0.85 } : null,
          ]}
        >
          <Text variant="glyph" color="white">
            ✓
          </Text>
        </Pressable>
      </Row>
    </View>
  );
}
