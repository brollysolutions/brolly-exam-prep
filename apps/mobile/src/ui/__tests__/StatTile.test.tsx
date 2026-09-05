import { render, screen } from '@testing-library/react-native';
import { initI18n } from '@tslprb/i18n';

import { iso } from '../Num';
import { StatTile } from '../StatTile';

describe('StatTile', () => {
  beforeAll(() => {
    initI18n('en');
  });

  it('is a surface2 tile with an ink figure over an ink3 caption', async () => {
    await render(<StatTile value="62%" label="Best score" testID="tile" />);
    const tile = screen.getByTestId('tile');
    expect(tile.props.className).toMatch(/\bbg-surface2\b/);
    expect(tile.props.className).toMatch(/\bborder-line\b/);
    expect(screen.getByText(iso('62%')).props.className).toContain('text-ink');
    expect(screen.getByText('Best score').props.className).toContain('text-ink3');
  });

  // No paper sat is not a score of zero: the dash is the honest value, and it steps back to
  // ink3 — `ink4` is 2.8:1 and a candidate still has to read it.
  it('draws an em dash in ink3 when there is nothing to count yet', async () => {
    await render(<StatTile label="Best score" testID="tile" />);
    expect(screen.getByText(iso('—'))).toBeOnTheScreen();
    expect(screen.getByText(iso('—')).props.className).toContain('text-ink3');
  });

  it('keeps a real zero and quiets it', async () => {
    await render(<StatTile value={0} label="Papers practised" empty testID="tile" />);
    expect(screen.getByText(iso(0)).props.className).toContain('text-ink3');
  });

  // "62%" and "Best score" are one fact to a screen reader, and two stops otherwise.
  it('reads as one node', async () => {
    await render(<StatTile value="62%" label="Best score" testID="tile" />);
    const tile = screen.getByTestId('tile');
    expect(tile.props.accessible).toBe(true);
    expect(tile.props.accessibilityLabel).toBe('Best score 62%');
  });

  it('centres inside a dialog and starts on a screen', async () => {
    await render(<StatTile value={31} label="Answered" align="center" testID="tile" />);
    expect(screen.getByTestId('tile').props.className).toMatch(/\bitems-center\b/);

    await render(<StatTile value={31} label="Answered" testID="plain" />);
    expect(screen.getByTestId('plain').props.className).not.toMatch(/\bitems-center\b/);
  });

  it('keeps the figure tabular and Latin in every language', async () => {
    await render(<StatTile value="5/11" label="Topics read" />);
    expect(screen.getByText(iso('5/11'))).toHaveStyle({ fontFamily: 'Inter_700Bold' });
  });
});
