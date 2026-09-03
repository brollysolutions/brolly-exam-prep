import { colors, type Lang } from '@tslprb/design-tokens';
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

export type SegmentedChipsProps<V extends string> = Omit<ViewProps, 'children'> & {
  value: V;
  onChange: (value: V) => void;
  options: SegmentedOption<V>[];
};

/**
 * One cell. Its own component so the press delta can live in state: a `style` callback next to
 * `className` loses its static values under css-interop on web (see `usePressed`).
 */
function Segment({
  label,
  lang,
  active,
  className,
  onPress,
}: {
  label: string;
  lang?: Lang;
  active: boolean;
  className?: string;
  onPress: () => void;
}) {
  const { pressed, handlers } = usePressed();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: active }}
      accessibilityLabel={label}
      android_ripple={{ color: active ? colors.pressTint : colors.hivisTint3 }}
      onPress={onPress}
      {...handlers}
      className={className}
      // One flattened object, never a callback: see `usePressed`.
      style={pressed && !active ? { opacity: 0.85 } : undefined}
    >
      <Text variant="body" weight="700" color={active ? 'tar' : 'dim'} align="center" lang={lang}>
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
  className,
  ...rest
}: SegmentedChipsProps<V>) {
  const d = useDir();
  const last = options.length - 1;
  return (
    <Row
      accessibilityRole="radiogroup"
      {...rest}
      className={cx('h-touch self-start overflow-hidden rounded-sm border border-line', className)}
    >
      {options.map((o, i) => {
        const active = o.value === value;
        return (
          <Segment
            key={o.value}
            label={o.label}
            lang={o.lang}
            active={active}
            onPress={() => {
              if (active) return;
              haptics.select();
              onChange(o.value);
            }}
            className={cx(
              'h-full min-w-touch items-center justify-center px-2',
              active && 'bg-hivis',
              i < last && cx('border-line', dir(d, 'border-r', 'border-l')),
            )}
          />
        );
      })}
    </Row>
  );
}
