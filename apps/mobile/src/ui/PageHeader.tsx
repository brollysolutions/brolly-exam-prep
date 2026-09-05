import type { ReactNode } from 'react';

import { Brand } from './Brand';
import { cx } from './cx';
import { Row } from './Row';
import { Stack } from './Stack';
import { Text } from './Text';

export type PageHeaderProps = {
  /** The Brolly lockup above the title. Hubs (Home, Login, OTP) carry it; leaf steps do not. */
  brand?: boolean;
  /**
   * Beside the lockup, at the reading end: the language switcher, a sign-in pill. Inside a
   * `Row`, so it lands at the correct edge without a mirrored class of its own.
   */
  trailing?: ReactNode;
  /** Above the title: a `Pill` — the step counter, the section, the state. */
  pill?: ReactNode;
  title: string;
  /** One `ink3` line under the title. */
  subtitle?: string;
  testID?: string;
  /** The title carries the screen's own ID (`home-greeting`), so it stays queryable. */
  titleTestID?: string;
  subtitleTestID?: string;
  brandTestID?: string;
  className?: string;
};

/**
 * The hub header: the brand lockup and whatever sits beside it, then a pill, then the screen's
 * name in the display face (Playfair in English, Noto Serif Telugu in Telugu).
 *
 * The title is `titleLg`, a display role, so it is set in the serif: Playfair runs wider than
 * Inter, and every title is given a two-line allowance rather than being truncated.
 * A leaf screen uses `BackHeader` instead — a bar with a way back, not a page opening.
 */
export function PageHeader({
  brand = false,
  trailing,
  pill,
  title,
  subtitle,
  testID,
  titleTestID,
  subtitleTestID,
  brandTestID,
  className,
}: PageHeaderProps) {
  const top = brand || trailing !== undefined;
  return (
    <Stack testID={testID} gap={3} className={cx('items-start', className)}>
      {top && (
        <Row
          testID={testID ? `${testID}-top` : undefined}
          align="center"
          justify={brand ? 'between' : 'end'}
          gap={2}
          wrap
          className="w-full"
        >
          {brand && <Brand testID={brandTestID} />}
          {trailing}
        </Row>
      )}
      {pill}
      <Text testID={titleTestID} variant="titleLg" weight="600">
        {title}
      </Text>
      {subtitle !== undefined && (
        <Text testID={subtitleTestID} variant="body" color="ink3">
          {subtitle}
        </Text>
      )}
    </Stack>
  );
}
