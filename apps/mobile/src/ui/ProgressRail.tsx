import { useDir } from '@tslprb/i18n';
import { View, type ViewProps } from 'react-native';

import { cx } from './cx';

export type ProgressRailProps = ViewProps & {
  /** 0–1. */
  fraction: number;
  /** Number of sections; draws `ticks - 1` dividers. */
  ticks?: number;
  /** Gold by default; red while the attempt clock is critical. */
  tone?: 'accent' | 'danger';
};

/** 6 px rounded track on `surface2` with a gold fill that grows from the reading start, plus section ticks. */
export function ProgressRail({
  fraction,
  ticks = 4,
  tone = 'accent',
  className,
  ...rest
}: ProgressRailProps) {
  const d = useDir();
  const f = Math.min(1, Math.max(0, Number.isFinite(fraction) ? fraction : 0));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(f * 100) }}
      {...rest}
      className={cx('h-progress overflow-hidden rounded-full bg-surface2', className)}
    >
      <View
        testID="progress-fill"
        className={cx(
          'absolute bottom-0 top-0 rounded-full',
          tone === 'danger' ? 'bg-dangerInk' : 'bg-accentStrong',
        )}
        style={{ [d.start]: 0, width: `${f * 100}%` }}
      />
      {Array.from({ length: Math.max(0, ticks - 1) }, (_, i) => (
        <View
          key={i}
          testID="progress-tick"
          className="absolute bottom-0 top-0 w-px bg-canvas"
          style={{ [d.start]: `${((i + 1) / ticks) * 100}%` }}
        />
      ))}
    </View>
  );
}
