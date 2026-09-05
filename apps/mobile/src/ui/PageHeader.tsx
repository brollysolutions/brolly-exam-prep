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

/** The offset every page opening starts on. It lives here so no call site invents its own. */
const TOP = 'mt-5';

/**
 * The hub header: the brand lockup and whatever sits beside it, then a pill, then the screen's
 * name in the display face (Playfair in English, Noto Serif Telugu in Telugu).
 *
 * Two stacks, not one: 12 px under the lockup and 8 px inside the pill–title–subtitle block, so
 * the three lines that belong together sit closer than the row that does not (proximity).
 * The title is `titleLg`, a display role: Playfair runs wider than Inter, so it is given a
 * two-line allowance rather than being truncated. A leaf screen uses `BackHeader` instead — a
 * bar with a way back, not a page opening.
 *
 * It owns the 20 px it starts on. Five screens had settled on five different top offsets
 * (16–28 px) because each padded its own scroller (design review D11); the header carries one
 * now, and its hosts pad for nothing.
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
    <Stack testID={testID} gap={3} className={cx(TOP, className)}>
      {top && (
        <Row
          testID={testID ? `${testID}-top` : undefined}
          align="center"
          justify={brand ? 'between' : 'end'}
          gap={2}
          wrap
        >
          {brand && <Brand testID={brandTestID} />}
          {trailing}
        </Row>
      )}
      <Stack gap={2}>
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
    </Stack>
  );
}
