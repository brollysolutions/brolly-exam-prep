import { cx } from './cx';
import { Num } from './Num';
import { Stack } from './Stack';
import { Text } from './Text';

export type StatTileProps = {
  /** Nothing counted yet: leave it out and the tile draws an em dash in `ink3`. */
  value?: string | number;
  label: string;
  /**
   * A number that is real but means "nothing yet" (zero papers sat): the digit stays, the
   * emphasis goes. `ink3`, never `ink4` — a candidate still has to read it.
   */
  empty?: boolean;
  /** `start` on a screen, `center` inside a dialog. */
  align?: 'start' | 'center';
  testID?: string;
  className?: string;
};

/** No paper sat is not a score of zero, and a tile saying "0" would be the worse lie. */
const EM_DASH = '—';

/**
 * One number and what it counts: a `surface2` tile with the figure in `<Num variant="stat">` and
 * its caption in `ink3`. Home's progress row, the submit dialog's tallies and the category grid
 * are all this tile.
 *
 * Read as one node, because "62%" and "Best score" are one fact to a screen reader and two
 * stops otherwise. The hairline is what separates the tile from the cream under it: `surface2`
 * sits 1.08:1 from the canvas, so the fill alone is not a boundary.
 */
export function StatTile({ value, label, empty = false, align = 'start', testID, className }: StatTileProps) {
  const nothing = value === undefined;
  const shown = nothing ? EM_DASH : value;
  return (
    <Stack
      gap={1}
      testID={testID}
      accessible
      accessibilityLabel={`${label} ${shown}`}
      className={cx(
        'flex-1 rounded-md border border-line bg-surface2 p-3',
        align === 'center' && 'items-center',
        className,
      )}
    >
      <Num variant="stat" color={nothing || empty ? 'ink3' : 'ink'} align={align}>
        {shown}
      </Num>
      <Text variant="caption" color="ink3" align={align}>
        {label}
      </Text>
    </Stack>
  );
}
