import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { act, render, screen } from '@testing-library/react-native';
import { initI18n } from '@tslprb/i18n';
import { createRef } from 'react';
import { Text as RNText } from 'react-native';

import { Sheet, type SheetHandle } from '../Sheet';

/**
 * The guard that made the question palette openable again (fix wave 1, D13).
 *
 * `BottomSheetModal.dismiss()` on a modal that was never presented does not close it — it
 * sets the modal's internal status to `DISMISSING` and calls `forceClose()` on a `BottomSheet`
 * ref that is still `null`, so nothing ever moves the status on. `handlePortalRender` then
 * returns early for a `DISMISSING` modal, and every later `present()` renders nothing at all,
 * for the life of the screen.
 *
 * Both callers do exactly that: the gallery's effect dismisses on mount, and the attempt
 * screen dismisses the palette whenever a dialog opens. So an exit tap, or a resume, before
 * the first palette tap killed the palette on every platform.
 */
describe('Sheet present / dismiss', () => {
  beforeAll(() => {
    initI18n('en');
  });

  const renderSheet = async () => {
    const ref = createRef<SheetHandle>();
    await render(
      <Sheet ref={ref} title="Questions" snapPoints={['82%']}>
        <RNText>body</RNText>
      </Sheet>,
    );
    return ref;
  };

  it('ignores a dismiss that arrives before the sheet has ever been presented', async () => {
    const dismiss = jest.spyOn(BottomSheetModal.prototype, 'dismiss');
    const ref = await renderSheet();

    await act(async () => ref.current?.dismiss());
    expect(dismiss).not.toHaveBeenCalled();

    dismiss.mockRestore();
  });

  it('dismisses a sheet that is open, and only once', async () => {
    const present = jest.spyOn(BottomSheetModal.prototype, 'present');
    const dismiss = jest.spyOn(BottomSheetModal.prototype, 'dismiss');
    const ref = await renderSheet();

    await act(async () => ref.current?.present());
    expect(present).toHaveBeenCalledTimes(1);

    await act(async () => ref.current?.dismiss());
    expect(dismiss).toHaveBeenCalledTimes(1);

    // A second dismiss on a closed sheet is the poisoning call: it must not reach the modal.
    await act(async () => ref.current?.dismiss());
    expect(dismiss).toHaveBeenCalledTimes(1);

    // And the sheet still opens afterwards.
    await act(async () => ref.current?.present());
    expect(present).toHaveBeenCalledTimes(2);

    present.mockRestore();
    dismiss.mockRestore();
  });

  it('renders its title, its close control and its body', async () => {
    await renderSheet();
    expect(screen.getByText('Questions')).toBeOnTheScreen();
    expect(screen.getByLabelText('Close')).toBeOnTheScreen();
    expect(screen.getByText('body')).toBeOnTheScreen();
  });
});
