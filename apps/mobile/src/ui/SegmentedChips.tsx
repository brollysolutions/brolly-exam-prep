import { colors, type ColorName, type Lang } from '@tslprb/design-tokens';
import { dir, useDir } from '@tslprb/i18n';
import { Pressable, type ViewProps } from 'react-native';

import { cx } from './cx';
import * as haptics from './haptics';
import { usePressed } from './pressable';
import { Row } from './Row';
import { Text } from './Text';

export type SegmentedOption<V extends string> = {
  value: V;
  label: string;
  /** Face to draw the label with (a Telugu label stays in Noto Sans Telugu inside an English UI). */
  lang?: Lang;
};

/**
 * `hivis` is the header language switcher: one selected cell in yellow. `quiet` is for a form
 * picker — three of them stacked on the eligibility screen cannot each carry a yellow block
 * beside the one yellow action, so the selected cell is a raised panel instead.
 */
export type SegmentedTone = 'hivis' | 'quiet';

export type SegmentedChipsProps<V extends string> = Omit<ViewProps, 'children'> & {
  value: V;
  onChange: (value: V) => void;
  options: SegmentedOption<V>[];
  tone?: SegmentedTone;
  /** Fill the row, every segment an equal share, instead of hugging the reading-start edge. */
  block?: boolean;
};

const selectedFill: Record<SegmentedTone, string> = {
  hivis: 'bg-hivis',
  quiet: 'bg-panel3 border-line3',
};

const selectedColor: Record<SegmentedTone, ColorName> = { hivis: 'tar', quiet: 'chalk' };

/**
 * One cell. Its own component so the press delta can live in state: a `style` callback next to
 * `className` loses its static values under css-interop on web (see `usePressed`).
 */
function Segment({
  label,
  lang,
  active,
  color,
  ripple,
  className,
  onPress,
}: {
  label: string;
  lang?: Lang;
  active: boolean;
  color: ColorName;
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
      className={className}
      // One flattened object, never a callback: see `usePressed`.
      style={pressed && !active ? { opacity: 0.85 } : undefined}
    >
      <Text variant="body" weight="700" color={active ? color : 'dim'} align="center" lang={lang}>
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
  tone = 'hivis',
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
      className={cx(
        'h-touch overflow-hidden rounded-sm border border-line',
        block ? 'self-stretch' : 'self-start',
        className,
      )}
    >
      {options.map((o, i) => {
        const active = o.value === value;
        // This cell draws only its own trailing edge (the leading edge belongs to the cell
        // before it), so the divider must also light up when the NEXT cell is the quiet
        // selection — otherwise only the trailing side of a quiet selection reads `line3`.
        const nextActive = i < last && options[i + 1].value === value;
        const divider = tone === 'quiet' && (active || nextActive) ? 'border-line3' : 'border-line';
        return (
          <Segment
            key={o.value}
            label={o.label}
            lang={o.lang}
            active={active}
            color={selectedColor[tone]}
            ripple={active && tone === 'hivis' ? colors.pressTint : colors.hivisTint3}
            onPress={() => {
              if (active) return;
              haptics.select();
              onChange(o.value);
            }}
            className={cx(
              'h-full min-w-touch items-center justify-center px-3',
              block && 'flex-1',
              active && selectedFill[tone],
              i < last && cx(divider, dir(d, 'border-r', 'border-l')),
            )}
          />
        );
      })}
    </Row>
  );
}
