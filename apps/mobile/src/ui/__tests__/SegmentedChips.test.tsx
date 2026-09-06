import { render, screen, userEvent } from '@testing-library/react-native';
import { initI18n, LANGS, setLanguage, type Lang } from '@tslprb/i18n';
import { act } from 'react';

import { SegmentedChips } from '../SegmentedChips';

const LABEL: Record<Lang, string> = { en: 'EN', te: 'తె' };
const options = LANGS.map((l) => ({ value: l, label: LABEL[l], lang: l }));

describe('SegmentedChips (language switcher)', () => {
  beforeAll(() => {
    initI18n('te');
  });
  afterEach(async () => {
    await act(async () => {
      await setLanguage('te');
    });
  });

  it.each(['te', 'en'] as Lang[])(
    'shows every label, including "EN", when the UI language is %s',
    async (ui) => {
      await act(async () => {
        await setLanguage(ui);
      });
      await render(<SegmentedChips value={ui} onChange={() => {}} options={options} />);
      for (const l of LANGS) expect(screen.getByText(LABEL[l])).toBeOnTheScreen();
      expect(screen.getByText('EN')).toHaveStyle({ fontFamily: 'Inter_700Bold' });
    },
  );

  it('marks the active cell checked, cells are ≥ 48 px wide, and reports changes', async () => {
    const onChange = jest.fn();
    await render(<SegmentedChips value="te" onChange={onChange} options={options} />);
    expect(screen.getByRole('radio', { name: 'తె' })).toBeChecked();
    expect(screen.getAllByRole('radio')).toHaveLength(2);
    expect(screen.getByRole('radio', { name: 'EN' }).props.className).toMatch(/\bmin-w-touch\b/);
    await userEvent.press(screen.getByRole('radio', { name: 'EN' }));
    expect(onChange).toHaveBeenCalledWith('en');
  });
});

describe('SegmentedChips (form pickers)', () => {
  beforeAll(() => {
    initI18n('en');
  });

  const posts = [
    { value: 'pc', label: 'Constable' },
    { value: 'si', label: 'Sub-Inspector' },
  ];

  it('is soft gold, self-sized and 8 px-padded by default — the header switcher', async () => {
    await render(<SegmentedChips value="pc" onChange={() => {}} options={posts} testID="seg" />);
    expect(screen.getByTestId('seg').props.className).toMatch(/\bself-start\b/);
    // The frame is the 3:1 `outline`; the dividers between cells stay `line2` (D3).
    expect(screen.getByTestId('seg').props.className).toMatch(/\bborder-outline\b/);
    expect(screen.getByTestId('seg').props.className).not.toMatch(/\bborder-line2\b/);
    expect(screen.getByRole('radio', { name: 'Constable' }).props.className).toMatch(
      /\bborder-line2\b/,
    );
    const active = screen.getByRole('radio', { name: 'Constable' });
    expect(active.props.className).toMatch(/\bbg-accentSoft\b/);
    expect(active.props.className).toMatch(/\bpx-3\b/);
    expect(active.props.className).not.toMatch(/\bflex-1\b/);
    expect(screen.getByText('Constable').props.className).toMatch(/\btext-ink\b/);
    expect(screen.getByText('Sub-Inspector').props.className).toMatch(/\btext-ink3\b/);
  });

  // Three stacked pickers on one screen cannot each carry a gold block: the selected cell
  // reads as a state (surface2, ink), and the gold stays with the header switcher.
  it('has a quiet tone whose selected cell is a raised panel, not gold', async () => {
    await render(
      <SegmentedChips value="pc" onChange={() => {}} options={posts} tone="quiet" testID="seg" />,
    );
    const active = screen.getByRole('radio', { name: 'Constable' });
    expect(active.props.className).toMatch(/\bbg-surface2\b/);
    expect(active.props.className).not.toMatch(/\bbg-accentSoft\b/);
    expect(screen.getByText('Constable').props.className).toMatch(/\btext-ink\b/);
    expect(screen.getByText('Constable')).toHaveStyle({ fontFamily: 'Inter_700Bold' });
    expect(screen.getByText('Sub-Inspector').props.className).toMatch(/\btext-ink3\b/);
  });

  // Soft gold is 1.38:1 from the canvas and surface2 1.08:1 (D4): the selected cell carries
  // a 2 px inner bottom edge in the 3.4:1 gold in both tones, so the state reads on any cream.
  it.each(['accent', 'quiet'] as const)(
    'marks the selected cell with a 2 px accentStrong bottom edge in the %s tone',
    async (tone) => {
      await render(
        <SegmentedChips value="pc" onChange={() => {}} options={posts} tone={tone} testID="seg" />,
      );
      const active = screen.getByRole('radio', { name: 'Constable' });
      expect(active.props.className).toMatch(/\bborder-b-2\b/);
      expect(active.props.className).toMatch(/\bborder-b-accentStrong\b/);
      const idle = screen.getByRole('radio', { name: 'Sub-Inspector' });
      expect(idle.props.className).not.toMatch(/\bborder-b-2\b/);
      expect(idle.props.className).not.toMatch(/\bborder-b-accentStrong\b/);
    },
  );

  // The 48 px belongs to the CELL, not to the frame around it: `h-touch` on the frame minus its
  // own 1 px border left a 46 px target, six of them stacked on the eligibility screen, and
  // `hitSlop` is inert on web (design review D9).
  it('gives every cell the full 48 px, not the frame minus its border', async () => {
    await render(<SegmentedChips value="pc" onChange={() => {}} options={posts} testID="seg" />);
    const frame = screen.getByTestId('seg');
    expect(frame.props.className).toMatch(/\bmin-h-touch\b/);
    expect(frame.props.className).not.toMatch(/(^|\s)h-touch\b/);
    for (const name of ['Constable', 'Sub-Inspector']) {
      const cell = screen.getByRole('radio', { name });
      expect(cell.props.className).toMatch(/\bmin-h-touch\b/);
      expect(cell.props.className).not.toMatch(/\bh-full\b/);
    }
  });

  it('keeps `hivis` as the old name of the accent tone', async () => {
    await render(
      <SegmentedChips value="pc" onChange={() => {}} options={posts} tone="hivis" testID="seg" />,
    );
    expect(screen.getByRole('radio', { name: 'Constable' }).props.className).toContain(
      'bg-accentSoft',
    );
  });

  it('fills its row as a block, every segment an equal share', async () => {
    await render(
      <SegmentedChips value="pc" onChange={() => {}} options={posts} block testID="seg" />,
    );
    expect(screen.getByTestId('seg').props.className).toMatch(/\bself-stretch\b/);
    expect(screen.getByTestId('seg').props.className).not.toMatch(/\bself-start\b/);
    for (const name of ['Constable', 'Sub-Inspector']) {
      expect(screen.getByRole('radio', { name }).props.className).toMatch(/\bflex-1\b/);
    }
  });
});
