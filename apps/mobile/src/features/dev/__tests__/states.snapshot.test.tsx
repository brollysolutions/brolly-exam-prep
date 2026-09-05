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
    await userEvent.press(screen.getByTestId('dialog-toggle'));
    expect(screen.getByTestId('dialog')).toBeOnTheScreen();
  });
});
