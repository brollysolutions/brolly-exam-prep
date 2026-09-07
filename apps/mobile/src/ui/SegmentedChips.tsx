import { colors, type Lang } from '@tslprb/design-tokens';
import { dir, useDir } from '@tslprb/i18n';
import { Pressable, type ViewProps } from 'react-native';

import { cx } from './cx';
import * as haptics from './haptics';
import { pressedClass, usePressed } from './pressable';
import { Row } from './Row';
import { Text } from './Text';

export type SegmentedOption<V extends string> = {
  value: V;
  label: string;
  /** Face to draw the label with (a Telugu label stays in Noto Sans Telugu inside an English UI). */
  lang?: Lang;
};

/**
 * `accent` is the header language switcher: one selected cell on the soft gold. `quiet` is for
 * a form picker — three of them stacked on the eligibility screen cannot each carry a gold
 * block beside the one ink action, so the selected cell is a raised `surface2` panel instead.
 *
 * The pre-rebrand name `hivis` was retired in Phase E (F-32).
 */
export type SegmentedTone = 'accent' | 'quiet';

export type SegmentedChipsProps<V extends string> = Omit<ViewProps, 'children'> & {
  value: V;
  onChange: (value: V) => void;
  options: SegmentedOption<V>[];
  tone?: SegmentedTone;
  /** Fill the row, every segment an equal share, instead of hugging the reading-start edge. */
  block?: boolean;
};

/**
 * Soft gold is 1.38:1 from the canvas and surface2 1.08:1: neither fill alone marks the
 * selected cell on every cream, so it also carries a 2 px inner bottom edge in the 3.4:1 gold.
 */
const selectedFill: Record<SegmentedTone, string> = {
  accent: 'bg-accentSoft border-b-2 border-b-accentStrong',
  quiet: 'bg-surface2 border-b-2 border-b-accentStrong',
};

/**
 * One cell. Its own component so the press delta can live in state: a `style` callback next to
 * `className` loses its static values under css-interop on web (see `usePressed`).
 */
function Segment({
  label,
  lang,
  active,
  ripple,
  className,
  onPress,
}: {
  label: string;
  lang?: Lang;
  active: boolean;
  ripple: string;
  className?: string;
  onPress: () => void;
}) {
  const { pressed, handlers } = usePressed();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: active }}
      accessibilityLabel={label}
      android_ripple={{ color: ripple }}
      onPress={onPress}
      {...handlers}
      // An inactive cell fills `surface2` while pressed; the active cell already has its fill.
      className={cx(className, pressed && !active && pressedClass)}
    >
      <Text variant="body" weight="700" color={active ? 'ink' : 'ink3'} align="center" lang={lang}>
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * The bordered language switcher from the prototype header. The 48 px floor belongs to the
 * CELL, not to the frame: a `h-touch` frame minus its own 1 px border leaves a 46 px target,
 * and `hitSlop` is not implemented in react-native-web, so the height has to be real.
 */
export function SegmentedChips<V extends string>({
  value,
  onChange,
  options,
  tone = 'accent',
  block = false,
  className,
  ...rest
}: SegmentedChipsProps<V>) {
  const d = useDir();
  const last = options.length - 1;
  return (
    <Row
      accessibilityRole="radiogroup"
      {...rest}
      // The frame is the 3:1 `outline` (a control); the dividers between cells stay `line2`.
      className={cx(
        'min-h-touch overflow-hidden rounded-sm border border-outline',
        block ? 'self-stretch' : 'self-start',
        className,
      )}
    >
      {options.map((o, i) => {
        const active = o.value === value;
        return (
          <Segment
            key={o.value}
            label={o.label}
            lang={o.lang}
            active={active}
            ripple={active && tone === 'accent' ? colors.pressTint : colors.accentTint}
            onPress={() => {
              if (active) return;
              haptics.select();
              onChange(o.value);
            }}
            className={cx(
              'min-h-touch min-w-touch items-center justify-center px-3',
              block && 'flex-1',
              active && selectedFill[tone],
              // This cell draws only its own trailing edge; the leading one belongs to the cell before it.
              i < last && cx('border-line2', dir(d, 'border-r', 'border-l')),
            )}
          />
        );
      })}
    </Row>
  );
}
