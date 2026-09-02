import { render, screen, userEvent } from '@testing-library/react-native';
import { initI18n, LANGS, setLanguage, type Lang } from '@tslprb/i18n';
import { act } from 'react';

import { SegmentedChips } from '../SegmentedChips';

const LABEL: Record<Lang, string> = { en: 'EN', te: 'తె', ur: 'اُر' };
const options = LANGS.map((l) => ({ value: l, label: LABEL[l], lang: l }));

describe('SegmentedChips (language switcher)', () => {
  beforeAll(() => {
    initI18n('ur');
  });
  afterEach(async () => {
    await act(async () => {
      await setLanguage('ur');
    });
  });

  it.each(['ur', 'te', 'en'] as Lang[])(
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
    await render(<SegmentedChips value="ur" onChange={onChange} options={options} />);
    expect(screen.getByRole('radio', { name: 'اُر' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'EN' }).props.className).toContain('min-w-touch ');
    await userEvent.press(screen.getByRole('radio', { name: 'EN' }));
    expect(onChange).toHaveBeenCalledWith('en');
  });
});
