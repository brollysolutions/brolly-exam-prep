import { render, screen } from '@testing-library/react-native';
import { shadow } from '@tslprb/design-tokens';
import { initI18n } from '@tslprb/i18n';
import { Text as RNText } from 'react-native';

import { ActionBar } from '../ActionBar';
import { Button } from '../Button';

describe('ActionBar', () => {
  beforeAll(() => {
    initI18n('en');
  });

  it('is a surface strip under a hairline, lifted by the sheet shadow', async () => {
    await render(
      <ActionBar
        testID="bar"
        primary={<Button size="lg" label="Continue" onPress={jest.fn()} />}
      />,
    );
    const bar = screen.getByTestId('bar');
    expect(bar.props.className).toMatch(/\bbg-surface\b/);
    expect(bar.props.className).toMatch(/\bborder-t border-line\b/);
    // Cast upward: the bar sits over the body, not under it.
    expect(bar.props.style.boxShadow).toBe(shadow.sheet);
  });

  it('drops the line for a footer that ends a full-bleed pager', async () => {
    await render(
      <ActionBar
        testID="bar"
        bordered={false}
        primary={<Button size="lg" label="Next" onPress={jest.fn()} />}
      />,
    );
    expect(String(screen.getByTestId('bar').props.className)).not.toMatch(/border-t/);
  });

  // One filled control per screen: the bar's partner is an outline or a ghost, never a
  // second ink fill.
  it('carries exactly one ink fill, whatever else is beside it', async () => {
    await render(
      <ActionBar
        testID="bar"
        secondary={<Button variant="ghost" label="Skip" onPress={jest.fn()} />}
        primary={<Button size="lg" label="Get started" onPress={jest.fn()} />}
      />,
    );
    const fills = screen
      .getAllByRole('button')
      .filter((node) => /\bbg-ink\b/.test(String(node.props.className)));
    expect(fills).toHaveLength(1);
    expect(fills[0]).toHaveTextContent('Get started');
    expect(fills[0]).toHaveStyle({ height: 56 });
  });

  // The actions follow the reading direction, so the quiet partner leads and the primary
  // lands at the reading end without a mirrored class of its own.
  it('lays the actions out in reading order', async () => {
    await render(
      <ActionBar
        testID="bar"
        primary={<Button size="lg" label="Continue" onPress={jest.fn()} />}
      />,
    );
    expect(screen.getByTestId('bar-row')).toHaveStyle({ flexDirection: 'row' });
  });

  it('hosts the keypad above the actions', async () => {
    await render(
      <ActionBar testID="bar" primary={<Button size="lg" label="Verify" onPress={jest.fn()} />}>
        <RNText testID="keypad">keypad</RNText>
      </ActionBar>,
    );
    expect(screen.getByTestId('keypad')).toBeOnTheScreen();
  });
});
