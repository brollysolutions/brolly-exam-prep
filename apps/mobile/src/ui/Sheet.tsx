import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { colors, radius } from '@tslprb/design-tokens';
import { forwardRef, useCallback, useImperativeHandle, useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable } from 'react-native';

import { cx } from './cx';
import { pressedClass, usePressed } from './pressable';
import { Row } from './Row';
import { Text } from './Text';

export type SheetHandle = { present: () => void; dismiss: () => void };

export type SheetProps = {
  title?: string;
  /** Omit for content-sized sheets. */
  snapPoints?: (string | number)[];
  /** Body scrolls inside the sheet (palette grid). */
  scroll?: boolean;
  /**
   * Pinned below the body, outside the scroll area (the palette's Submit button).
   * Only meaningful with `snapPoints`: a content-sized sheet has no leftover height to pin to.
   */
  footer?: ReactNode;
  onClose?: () => void;
  children: ReactNode;
};

/**
 * `@gorhom/bottom-sheet` modal in house style: `surface`, `xl` top corners, 3 px gold top edge,
 * warm scrim backdrop. Grabber: iOS only (HIG), tinted `line2`; none on Android (ruling 2026-09-02).
 */
export const Sheet = forwardRef<SheetHandle, SheetProps>(function Sheet(
  { title, snapPoints, scroll = false, footer, onClose, children },
  ref,
) {
  const { t } = useTranslation();
  const modal = useRef<BottomSheetModal>(null);
  const { pressed, handlers } = usePressed();
  /**
   * Has this sheet ever been presented?
   *
   * `dismiss()` on a sheet that was never presented does not close it — it POISONS it.
   * `BottomSheetModal.dismiss` sets its internal status to `DISMISSING` and then calls
   * `forceClose()` on a `BottomSheet` ref that is still null, so nothing ever moves the status
   * on; and `handlePortalRender` returns early for a `DISMISSING` modal, so every later
   * `present()` sets `mount: true` and renders nothing at all, for the life of the screen.
   *
   * That is why the question palette never opened: `AttemptStates`' effect dismisses on mount,
   * and the real screen dismisses the palette whenever a dialog opens — so an exit tap or a
   * resume before the first palette tap killed the palette for the rest of the screen, on
   * EVERY platform, not only in the browser. The review's percentage-`snapPoints` diagnosis
   * was wrong: `'82%'` mounts identically once this guard is in (fix wave 1, D13).
   */
  const presented = useRef(false);
  useImperativeHandle(ref, () => ({
    present: () => {
      presented.current = true;
      modal.current?.present();
    },
    dismiss: () => {
      if (!presented.current) return;
      presented.current = false;
      modal.current?.dismiss();
    },
  }));

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={1}
        pressBehavior="close"
        style={[props.style, { backgroundColor: colors.scrim }]}
      />
    ),
    [],
  );

  const Body = scroll ? BottomSheetScrollView : BottomSheetView;
  return (
    <BottomSheetModal
      ref={modal}
      snapPoints={snapPoints}
      enableDynamicSizing={!snapPoints}
      // However it closed — a button, the backdrop, a swipe — the sheet is no longer
      // presented, so the next `dismiss()` must not reach a modal that has nothing open.
      onDismiss={() => {
        presented.current = false;
        onClose?.();
      }}
      handleComponent={Platform.OS === 'ios' ? undefined : null}
      handleIndicatorStyle={{ backgroundColor: colors.line2 }}
      handleStyle={{ backgroundColor: colors.surface }}
      backdropComponent={renderBackdrop}
      backgroundStyle={{
        backgroundColor: colors.surface,
        borderTopLeftRadius: radius.xl,
        borderTopRightRadius: radius.xl,
        borderTopWidth: 3,
        borderTopColor: colors.accentStrong,
      }}
    >
      {title !== undefined && (
        <Row align="center" className="px-3 pb-1 pt-2">
          <Text variant="bodyLg" weight="600" className="flex-1">
            {title}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
            onPress={() => modal.current?.dismiss()}
            {...handlers}
            // Pressed = a `surface2` fill (see `pressedClass`); never a `style` callback.
            className={cx(
              'h-touch w-touch items-center justify-center rounded-sm',
              pressed && pressedClass,
            )}
          >
            <Text variant="subtitle" color="ink3">
              ✕
            </Text>
          </Pressable>
        </Row>
      )}
      {/* A fixed-height sheet gives the scrollable body the leftover space, so `footer` stays pinned. */}
      <Body style={scroll && snapPoints ? { flex: 1 } : undefined}>{children}</Body>
      {footer}
    </BottomSheetModal>
  );
});
