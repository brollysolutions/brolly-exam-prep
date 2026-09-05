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
  useImperativeHandle(ref, () => ({
    present: () => modal.current?.present(),
    dismiss: () => modal.current?.dismiss(),
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
      onDismiss={onClose}
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
