import { render, screen } from '@testing-library/react-native';
import { initI18n } from '@tslprb/i18n';
import { Text, View } from 'react-native';

import { Screen } from '../Screen';

type Node = { type: string; props: Record<string, unknown>; children: (Node | string)[] | null };
const find = (n: Node | string | null, pred: (n: Node) => boolean): Node | null => {
  if (!n || typeof n === 'string') return null;
  if (pred(n)) return n;
  for (const c of n.children ?? []) {
    const hit = find(c, pred);
    if (hit) return hit;
  }
  return null;
};

describe('Screen', () => {
  beforeAll(() => {
    initI18n('en');
  });

  it('renders overlay as an absolute-fill sibling after the scroll body, not inside it', async () => {
    await render(
      <Screen scroll testID="screen" overlay={<View testID="dlg" />}>
        <Text>body</Text>
      </Screen>,
    );
    const root = screen.getByTestId('screen');
    const kids = root.children.filter((c) => typeof c !== 'string');
    const last = kids[kids.length - 1];
    expect(typeof last === 'object' && last.props.className).toBe('absolute inset-0');
    expect(typeof last === 'object' && last.props.pointerEvents).toBe('box-none');
    expect(screen.getByTestId('dlg')).toBeOnTheScreen();
    // The overlay is not a descendant of the ScrollView.
    const json = screen.toJSON();
    const tree = Array.isArray(json) ? json[0] : json;
    const scroll = find(tree, (n) => n.type === 'RCTScrollView');
    expect(scroll).toBeTruthy();
    expect(find(scroll, (n) => n.props?.testID === 'dlg')).toBeNull();
  });

  it('omits the overlay layer when none is given', async () => {
    await render(<Screen testID="screen" />);
    const root = screen.getByTestId('screen');
    const layers = root.children.filter(
      (c) => typeof c !== 'string' && c.props.pointerEvents === 'box-none',
    );
    expect(layers).toHaveLength(0);
  });
});
