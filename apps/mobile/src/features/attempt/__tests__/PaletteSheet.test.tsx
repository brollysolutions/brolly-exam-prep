import { fireEvent, render, screen } from '@testing-library/react-native';
import { initI18n } from '@tslprb/i18n';

import { DEMO_ATTEMPT } from '@/features/dev/sections/attemptDemo';

import { PaletteSheet } from '../PaletteSheet';

/** `Num` wraps its digits in LRI…PDI isolation. */
const num = (n: number | string) => `⁦${n}⁩`;

/** The gated Telangana section: questions 31-40. */
const LOCKED_GROUP = 3;

async function renderSheet() {
  const onGoto = jest.fn();
  const onSubmit = jest.fn();
  await render(<PaletteSheet attempt={DEMO_ATTEMPT} onGoto={onGoto} onSubmit={onSubmit} />);
  return { onGoto, onSubmit };
}

describe('PaletteSheet', () => {
  beforeAll(() => {
    initI18n('en');
  });

  it('counts the demo attempt in the legend', async () => {
    await renderSheet();
    expect(screen.getByTestId('legend-a')).toHaveTextContent(num(8));
    expect(screen.getByTestId('legend-na')).toHaveTextContent(num(4));
    expect(screen.getByTestId('legend-m')).toHaveTextContent(num(3));
    expect(screen.getByTestId('legend-nv')).toHaveTextContent(num(28));
    // Answered *and* marked: only Q8.
    expect(screen.getByTestId('legend-am')).toHaveTextContent(num(1));
  });

  it('labels every legend row', async () => {
    await renderSheet();
    for (const label of [
      'Answered',
      'Not answered',
      'Marked',
      'Not visited',
      'Answered + marked',
    ])
      expect(screen.getByText(label)).toBeOnTheScreen();
  });

  it('draws a cell for every question, grouped by section', async () => {
    await renderSheet();
    for (const n of [1, 12, 30, 40])
      expect(screen.getByTestId(`palette-cell-${n}`)).toBeOnTheScreen();
    expect(screen.getByTestId('palette-group-0')).toBeOnTheScreen();
    expect(screen.getByTestId(`palette-group-${LOCKED_GROUP}`)).toBeOnTheScreen();
  });

  it('marks the current question and jumps on a tap', async () => {
    const { onGoto } = await renderSheet();
    fireEvent.press(screen.getByTestId('palette-cell-5'));
    expect(onGoto).toHaveBeenCalledWith(5);
  });

  it('leaves the locked group dimmed and non-interactive', async () => {
    const { onGoto } = await renderSheet();
    const group = screen.getByTestId(`palette-group-${LOCKED_GROUP}`);
    expect(group).toHaveStyle({ opacity: 0.38 });
    expect(group.props.pointerEvents).toBe('none');

    const cell = screen.getByTestId('palette-cell-31');
    expect(cell.props.accessibilityState.disabled).toBe(true);
    fireEvent.press(cell);
    expect(onGoto).not.toHaveBeenCalled();
  });

  it('offers Submit test in the pinned footer', async () => {
    const { onSubmit } = await renderSheet();
    fireEvent.press(screen.getByTestId('palette-submit'));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
