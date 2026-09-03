import { render, screen, userEvent } from '@testing-library/react-native';
import { initI18n } from '@tslprb/i18n';

import { useLangStore } from '@/data/lang';

import { StatesView } from '../StatesView';

describe('dev states screen (ur)', () => {
  beforeAll(() => {
    useLangStore.setState({ lang: 'ur' });
    initI18n('ur');
  });

  // No whole-gallery snapshot: a 1.5 MB blob nobody reads, invalidated by every primitive
  // change. The per-view `ur` snapshots stay; this file keeps the targeted assertions.
  it('renders every primitive mirrored', async () => {
    await render(<StatesView />);
    expect(screen.getByTestId('states-header')).toHaveStyle({ flexDirection: 'row-reverse' });
    // Numbers stay physical LTR even in Urdu.
    expect(screen.getByTestId('phone-live')).toHaveStyle({ flexDirection: 'row' });
    // Urdu copy from the locale file is on screen (login title).
    expect(screen.getAllByText('آپ کا فون نمبر', { exact: false }).length).toBeGreaterThan(0);
    // The Dialog lives in Screen's overlay slot (sibling of the ScrollView), not in the body.
    expect(screen.queryByTestId('dialog')).toBeNull();
    await userEvent.press(screen.getByTestId('dialog-toggle'));
    expect(screen.getByTestId('dialog')).toBeOnTheScreen();
  });
});
