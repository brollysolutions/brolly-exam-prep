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
 * `hivis` is the old name of `accent`, kept one cycle.
 */
export type SegmentedTone = 'accent' | 'quiet' | 'hivis';

export type SegmentedChipsProps<V extends string> = Omit<ViewProps, 'children'> & {
  value: V;
  onChange: (value: V) => void;
  options: SegmentedOption<V>[];
  tone?: SegmentedTone;
  /** Fill the row, every segment an equal share, instead of hugging the reading-start edge. */
  block?: boolean;
};

const selectedFill: Record<'accent' | 'quiet', string> = {
  accent: 'bg-accentSoft',
  quiet: 'bg-surface2',
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
      <Text
        variant="body"
        weight="700"
        color={active ? 'ink' : 'ink3'}
        align="center"
        lang={lang}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** The bordered language switcher from the prototype header: 48 px tall, cells ≥ 48 px wide. */
export function SegmentedChips<V extends string>({
  value,
  onChange,
  options,
  tone: toneProp = 'accent',
  block = false,
  className,
  ...rest
}: SegmentedChipsProps<V>) {
  const d = useDir();
  const tone = toneProp === 'hivis' ? 'accent' : toneProp;
  const last = options.length - 1;
  return (
    <Row
      accessibilityRole="radiogroup"
      {...rest}
      className={cx(
        'h-touch overflow-hidden rounded-sm border border-line2',
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
              'h-full min-w-touch items-center justify-center px-3',
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
