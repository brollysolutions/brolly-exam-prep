import { render, screen, userEvent } from '@testing-library/react-native';
import { initI18n } from '@tslprb/i18n';

import { useLangStore } from '@/data/lang';

import { StatesView } from '../StatesView';

describe('dev states screen (te)', () => {
  beforeAll(() => {
    useLangStore.setState({ lang: 'te' });
    initI18n('te');
  });

  // No whole-gallery snapshot: a 1.5 MB blob nobody reads, invalidated by every primitive
  // change. The per-view `te` snapshots stay; this file keeps the targeted assertions.
  it('renders every primitive in the Telugu face', async () => {
    await render(<StatesView />);
    expect(screen.getByTestId('states-header')).toHaveStyle({ flexDirection: 'row' });
    // Numbers stay physical LTR in every language.
    expect(screen.getByTestId('phone-live')).toHaveStyle({ flexDirection: 'row' });
    // Telugu copy from the locale file is on screen (login title).
    expect(screen.getAllByText('మీ ఫోన్ నంబర్', { exact: false }).length).toBeGreaterThan(0);
    // The Dialog lives in Screen's overlay slot (sibling of the ScrollView), not in the body.
    expect(screen.queryByTestId('dialog')).toBeNull();
    // Both dialog tones have a frame since fix wave 1 (C2): the `danger` card is worn by the
    // auto-submit report and by Profile's delete-account ask, and had no gallery until now.
    // Only its presence is pinned here — opening it needs a second `StatesView` render, and
    // that pushed this suite past its 15 s timeout under a full parallel `pnpm test`. What
    // the card LOOKS like is pinned in `Dialog.test` and in `ProfileView.test`.
    expect(screen.getByTestId('dialog-danger-toggle')).toBeOnTheScreen();
    await userEvent.press(screen.getByTestId('dialog-toggle'));
    expect(screen.getByTestId('dialog')).toBeOnTheScreen();
  });
});
