import { colors, type Lang } from '@tslprb/design-tokens';
import { dir, useDir } from '@tslprb/i18n';
import { Pressable, type ViewProps } from 'react-native';

import { cx } from './cx';
import * as haptics from './haptics';
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

/** The bordered language switcher from the prototype header: 48 px tall, cells ≥ 44 px wide. */
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
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: active }}
            accessibilityLabel={o.label}
            android_ripple={{ color: active ? colors.pressTint : colors.hivisTint3 }}
            onPress={() => {
              if (active) return;
              haptics.select();
              onChange(o.value);
            }}
            className={cx(
              'h-full min-w-touchMin items-center justify-center px-2',
              active && 'bg-hivis',
              i < last && cx('border-line', dir(d, 'border-r', 'border-l')),
            )}
            style={({ pressed }) => (pressed && !active ? { opacity: 0.85 } : null)}
          >
            <Text
              variant="body"
              weight="700"
              color={active ? 'tar' : 'dim'}
              align="center"
              lang={o.lang}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </Row>
  );
}
