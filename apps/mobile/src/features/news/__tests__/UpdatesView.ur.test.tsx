import { render, screen, userEvent } from '@testing-library/react-native';
import { NOTICES } from '@tslprb/fixtures';
import { initI18n } from '@tslprb/i18n';

import { useLangStore } from '@/data/lang';

import { UpdatesView } from '../UpdatesView';

/** Two notices — one with a link, one without: enough to mirror, small enough to read. */
const FEED = [
  NOTICES.find((n) => n.id === 'nt-2026-hall-ticket')!,
  NOTICES.find((n) => n.id === 'nt-2026-exam-date')!,
];

describe('UpdatesView (ur)', () => {
  beforeAll(() => {
    useLangStore.setState({ lang: 'ur' });
    initI18n('ur');
  });

  it('mirrors the screen and turns the caret and the link chevron round', async () => {
    await render(
      <UpdatesView notices={FEED} lang="ur" onBack={jest.fn()} onOpenLink={jest.fn()} />,
    );
    expect(screen.getByTestId('updates-header')).toHaveStyle({ flexDirection: 'row-reverse' });

    // Collapsed, the caret points along the reading direction — leftwards in Urdu.
    const caret = () =>
      screen.getByTestId('update-caret-nt-2026-hall-ticket', { includeHiddenElements: true });
    expect(caret()).toHaveTextContent('◂');

    await userEvent.press(screen.getByTestId('update-row-nt-2026-hall-ticket'));
    expect(caret()).toHaveTextContent('▾');
    expect(screen.getByTestId('update-body-nt-2026-hall-ticket')).toHaveTextContent(
      FEED[0].body.ur,
    );
    // Chevrons are drawn in the Latin face: Nastaliq has no U+2039/U+203A.
    expect(screen.getByTestId('update-link-nt-2026-hall-ticket')).toHaveTextContent(/‹/);

    expect(screen.toJSON()).toMatchSnapshot();
  });
});
