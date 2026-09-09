import { render, screen } from '@testing-library/react-native';
import { shadow, spacing } from '@tslprb/design-tokens';
import { initI18n } from '@tslprb/i18n';
import type { ReactNode } from 'react';
import { Text as RNText } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { ActionBar } from '../ActionBar';
import { Button } from '../Button';

/** A handset with a home indicator: 34 px of bottom inset under the bar. */
const withInset = (bottom: number, node: ReactNode) => (
  <SafeAreaInsetsContext.Provider value={{ top: 0, bottom, left: 0, right: 0 }}>
    {node}
  </SafeAreaInsetsContext.Provider>
);

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

  it('drops the line AND the shadow for a footer that ends a full-bleed pager', async () => {
    await render(
      <ActionBar
        testID="bar"
        bordered={false}
        primary={<Button size="lg" label="Next" onPress={jest.fn()} />}
      />,
    );
    const bar = screen.getByTestId('bar');
    expect(String(bar.props.className)).not.toMatch(/border-t/);
    // A shadow with no line to cast it reads as a smudge: both belong to `bordered`.
    expect(bar.props.style.boxShadow).toBeUndefined();
  });

  // The bar sits on the screen's bottom edge, so it owns the home-indicator inset rather than
  // floating above a strip of canvas the `Screen` padded for it.
  it('grows its bottom padding by the home-indicator inset', async () => {
    await render(
      withInset(
        0,
        <ActionBar testID="flat" primary={<Button size="lg" label="Go" onPress={jest.fn()} />} />,
      ),
    );
    expect(screen.getByTestId('flat').props.style.paddingBottom).toBe(spacing['4']);

    await render(
      withInset(
        34,
        <ActionBar testID="inset" primary={<Button size="lg" label="Go" onPress={jest.fn()} />} />,
      ),
    );
    expect(screen.getByTestId('inset').props.style.paddingBottom).toBe(spacing['4'] + 34);
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
    expect(fills[0]).toHaveStyle({ minHeight: 56 });
  });

  // The actions follow the reading direction, so the quiet partner leads and the primary
  // lands at the reading end without a mirrored class of its own.
  it('lays the actions out in reading order, quiet partner first', async () => {
    await render(
      <ActionBar
        testID="bar"
        secondary={<Button variant="ghost" label="Skip" onPress={jest.fn()} />}
        primary={<Button size="lg" label="Continue" onPress={jest.fn()} />}
      />,
    );
    expect(screen.getByTestId('bar-row')).toHaveStyle({ flexDirection: 'row' });
    const [first, second] = screen.getAllByRole('button');
    expect(first).toHaveTextContent('Skip');
    expect(second).toHaveTextContent('Continue');
  });

  // The attempt footer's Next is 112 px wide and its row carries two more controls, so the
  // remaining width has to go to the secondary slot rather than to a wrapper the button
  // cannot grow into.
  it('lets a fixed-width primary hug its own width', async () => {
    await render(
      <ActionBar
        testID="bar"
        grow={false}
        secondary={<Button variant="secondary" label="Questions" onPress={jest.fn()} />}
        primary={<Button size="lg" label="Next" onPress={jest.fn()} style={{ width: 112 }} />}
      />,
    );
    const row = screen.getByTestId('bar-row');
    const kids = row.children.filter((c) => typeof c !== 'string');
    // Two children, both buttons: no `flex-1` wrapper between the row and the primary.
    expect(kids).toHaveLength(2);
    expect(screen.getByText('Next').parent).toBeTruthy();
    expect(screen.getAllByRole('button')[1]).toHaveStyle({ width: 112 });
  });

  it('wraps a growing primary so it takes the remaining width', async () => {
    await render(
      <ActionBar testID="bar" primary={<Button size="lg" label="Next" onPress={jest.fn()} />} />,
    );
    const row = screen.getByTestId('bar-row');
    const kids = row.children.filter((c) => typeof c !== 'string');
    expect(kids).toHaveLength(1);
    expect(typeof kids[0] === 'object' && kids[0].props.className).toBe('flex-1');
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
