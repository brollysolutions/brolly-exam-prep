import { render, screen } from '@testing-library/react-native';
import { initI18n } from '@tslprb/i18n';

import { useLangStore } from '@/data/lang';

import { StatesView } from '../StatesView';

describe('dev states screen (ur)', () => {
  beforeAll(() => {
    useLangStore.setState({ lang: 'ur' });
    initI18n('ur');
  });

  it('renders every primitive mirrored and matches the snapshot', async () => {
    await render(<StatesView />);
    expect(screen.getByTestId('states-header')).toHaveStyle({ flexDirection: 'row-reverse' });
    // Numbers stay physical LTR even in Urdu.
    expect(screen.getByTestId('phone-live')).toHaveStyle({ flexDirection: 'row' });
    // Urdu copy from the locale file is on screen (login title).
    expect(screen.getAllByText('آپ کا فون نمبر', { exact: false }).length).toBeGreaterThan(0);
    expect(screen.toJSON()).toMatchSnapshot();
  });
});
