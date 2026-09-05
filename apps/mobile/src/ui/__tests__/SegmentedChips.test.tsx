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
    expect(screen.getByRole('radio', { name: 'EN' }).props.className).toContain('min-w-touch ');
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
    expect(screen.getByTestId('seg').props.className).toContain('self-start');
    expect(screen.getByTestId('seg').props.className).toContain('border-line2');
    const active = screen.getByRole('radio', { name: 'Constable' });
    expect(active.props.className).toContain('bg-accentSoft');
    expect(active.props.className).toContain('px-3');
    expect(active.props.className).not.toContain('flex-1');
    expect(screen.getByText('Constable').props.className).toContain('text-ink');
    expect(screen.getByText('Sub-Inspector').props.className).toContain('text-ink3');
  });

  // Three stacked pickers on one screen cannot each carry a gold block: the selected cell
  // reads as a state (surface2, ink), and the gold stays with the header switcher.
  it('has a quiet tone whose selected cell is a raised panel, not gold', async () => {
    await render(
      <SegmentedChips value="pc" onChange={() => {}} options={posts} tone="quiet" testID="seg" />,
    );
    const active = screen.getByRole('radio', { name: 'Constable' });
    expect(active.props.className).toContain('bg-surface2');
    expect(active.props.className).not.toContain('bg-accentSoft');
    expect(screen.getByText('Constable').props.className).toContain('text-ink');
    expect(screen.getByText('Constable')).toHaveStyle({ fontFamily: 'Inter_700Bold' });
    expect(screen.getByText('Sub-Inspector').props.className).toContain('text-ink3');
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
    expect(screen.getByTestId('seg').props.className).toContain('self-stretch');
    expect(screen.getByTestId('seg').props.className).not.toContain('self-start');
    for (const name of ['Constable', 'Sub-Inspector']) {
      expect(screen.getByRole('radio', { name }).props.className).toContain('flex-1');
    }
  });
});
