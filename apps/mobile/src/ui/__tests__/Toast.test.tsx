import { render, screen } from '@testing-library/react-native';
import { shadow } from '@tslprb/design-tokens';
import { initI18n } from '@tslprb/i18n';

import { Toast } from '../Toast';

describe('Toast', () => {
  beforeAll(() => {
    initI18n('en');
  });

  it('is a floating card: 16 px inset, md corners, raised on the warm shadow, announced politely', async () => {
    await render(<Toast text="5 minutes left" testID="toast" />);
    const outer = screen.getByTestId('toast');
    expect(outer.props.accessibilityRole).toBe('alert');
    expect(outer.props.accessibilityLiveRegion).toBe('polite');
    const card = screen.getByTestId('toast-card');
    expect(card.props.className).toMatch(/\bmx-4\b/);
    expect(card.props.className).toMatch(/\brounded-md\b/);
    expect(card.props.style).toBeDefined();
    expect(card.props.style.boxShadow).toBe(shadow.raised);
  });

  it.each([
    // The 5-minute notice: soft gold with ink text.
    ['accent', 'bg-accentSoft', 'text-ink'],
    // One red for "critical" (D12): the last-minute warning is the solid dangerInk with cream
    // text, the same pair as the ≤ 60 s timer — never `danger` (#f87171) with cream at 2.5:1.
    ['danger', 'bg-dangerInk', 'text-onInk'],
    // A locked section: ink fill, cream text.
    ['info', 'bg-ink', 'text-onInk'],
  ] as const)('tone %s fills %s with %s text', async (tone, fill, color) => {
    await render(<Toast text="Notice" tone={tone} testID="toast" />);
    const card = screen.getByTestId('toast-card');
    expect(card.props.className).toMatch(new RegExp(`\\b${fill}\\b`));
    // One fill slot: the tone's class and nothing else.
    expect(card.props.className.match(/\bbg-/g)).toHaveLength(1);
    expect(screen.getByText('Notice').props.className).toMatch(new RegExp(`\\b${color}\\b`));
  });

  it('never fills the light red: cream on #f87171 is 2.5:1', async () => {
    await render(<Toast text="1 minute left" tone="danger" testID="toast" />);
    expect(screen.getByTestId('toast-card').props.className).not.toMatch(/\bbg-danger\b/);
  });
});
