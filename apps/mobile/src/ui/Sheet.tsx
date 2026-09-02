import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { colors } from '@tslprb/design-tokens';
import { forwardRef, useCallback, useImperativeHandle, useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';

import { Row } from './Row';
import { Text } from './Text';

export type SheetHandle = { present: () => void; dismiss: () => void };

export type SheetProps = {
  title?: string;
  /** Omit for content-sized sheets. */
  snapPoints?: (string | number)[];
  /** Body scrolls inside the sheet (palette grid). */
  scroll?: boolean;
  onClose?: () => void;
  children: ReactNode;
};

/** `@gorhom/bottom-sheet` modal in house style: `panel2`, 3 px hi-vis top edge, no grabber, scrim backdrop. */
export const Sheet = forwardRef<SheetHandle, SheetProps>(function Sheet(
  { title, snapPoints, scroll = false, onClose, children },
  ref,
) {
  const { t } = useTranslation();
  const modal = useRef<BottomSheetModal>(null);
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
      handleComponent={null}
      backdropComponent={renderBackdrop}
      backgroundStyle={{
        backgroundColor: colors.panel2,
        borderRadius: 0,
        borderTopWidth: 3,
        borderTopColor: colors.hivis,
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
            className="h-touch w-touch items-center justify-center"
            style={({ pressed }) => (pressed ? { opacity: 0.7 } : null)}
          >
            <Text variant="subtitle" color="dim">
              ✕
            </Text>
          </Pressable>
        </Row>
      )}
      <Body>{children}</Body>
    </BottomSheetModal>
  );
});
