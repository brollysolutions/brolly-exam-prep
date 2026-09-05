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
      expect(screen.getByText('EN')).toHaveStyle({ fontFamily: 'Archivo_700Bold' });
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

  it('is hi-vis, self-sized and 8 px-padded by default — the header switcher', async () => {
    await render(<SegmentedChips value="pc" onChange={() => {}} options={posts} testID="seg" />);
    expect(screen.getByTestId('seg').props.className).toContain('self-start');
    const active = screen.getByRole('radio', { name: 'Constable' });
    expect(active.props.className).toContain('bg-hivis');
    expect(active.props.className).toContain('px-3');
    expect(active.props.className).not.toContain('flex-1');
    expect(screen.getByText('Constable').props.className).toContain('text-tar');
  });

  // Three stacked pickers on one screen cannot each carry a yellow block: the selected cell
  // reads as a state (panel3, chalk), and the yellow stays with the one action.
  it('has a quiet tone whose selected cell is a raised panel, not yellow', async () => {
    await render(
      <SegmentedChips value="pc" onChange={() => {}} options={posts} tone="quiet" testID="seg" />,
    );
    const active = screen.getByRole('radio', { name: 'Constable' });
    expect(active.props.className).toContain('bg-panel3');
    expect(active.props.className).toContain('border-line3');
    expect(active.props.className).not.toContain('bg-hivis');
    expect(screen.getByText('Constable').props.className).toContain('text-chalk');
    expect(screen.getByText('Constable')).toHaveStyle({ fontFamily: 'Archivo_700Bold' });
    expect(screen.getByText('Sub-Inspector').props.className).toContain('text-dim');
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
