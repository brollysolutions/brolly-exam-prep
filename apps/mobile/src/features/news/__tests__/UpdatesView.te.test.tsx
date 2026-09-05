import { render, screen, userEvent } from '@testing-library/react-native';
import { NOTICES } from '@tslprb/fixtures';
import { initI18n } from '@tslprb/i18n';

import { useLangStore } from '@/data/lang';

import { UpdatesView } from '../UpdatesView';

/** Two notices — one with a link, one without: enough to open, small enough to read. */
const FEED = [
  NOTICES.find((n) => n.id === 'nt-2026-hall-ticket')!,
  NOTICES.find((n) => n.id === 'nt-2026-exam-date')!,
];

describe('UpdatesView (te)', () => {
  beforeAll(() => {
    useLangStore.setState({ lang: 'te' });
    initI18n('te');
  });

  it('sets the notices in Telugu and turns the caret down on open', async () => {
    await render(
      <UpdatesView notices={FEED} lang="te" onBack={jest.fn()} onOpenLink={jest.fn()} />,
    );
    expect(screen.getByTestId('updates-header')).toHaveStyle({ flexDirection: 'row' });

    // Collapsed, the caret points along the reading direction — rightwards — and turns
    // inwards to point down, so it never swings out through the card's edge.
    const caret = () =>
      screen.getByTestId('update-caret-nt-2026-hall-ticket', { includeHiddenElements: true });
    const box = () =>
      screen.getByTestId('update-caret-box-nt-2026-hall-ticket', { includeHiddenElements: true });
    expect(caret()).toHaveTextContent('▸');
    expect(caret()).toHaveStyle({ fontFamily: 'Archivo_400Regular' });

    await userEvent.press(screen.getByTestId('update-row-nt-2026-hall-ticket'));
    expect(caret()).toHaveTextContent('▸');
    expect(box()).toHaveStyle({ transform: [{ rotate: '90deg' }] });
    const body = screen.getByTestId('update-body-nt-2026-hall-ticket');
    expect(body).toHaveTextContent(FEED[0].body.te);
    expect(body).toHaveStyle({ fontFamily: 'NotoSansTelugu_400Regular' });
    // Chevrons are drawn in the Latin face whatever the UI language.
    expect(screen.getByTestId('update-link-nt-2026-hall-ticket')).toHaveTextContent(/›/);

    expect(screen.toJSON()).toMatchSnapshot();
  });
});
