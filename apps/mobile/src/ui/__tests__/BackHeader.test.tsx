import { act, fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import { initI18n } from '@tslprb/i18n';
import { Text as RNText } from 'react-native';

import { BackHeader } from '../BackHeader';

describe('BackHeader', () => {
  beforeAll(() => {
    initI18n('en');
  });

  it('names the way back for a screen reader and calls it', async () => {
    const onBack = jest.fn();
    await render(<BackHeader title="Your result" onBack={onBack} testID="header" />);
    const back = screen.getByTestId('header-back');
    expect(back.props.accessibilityLabel).toBe('Back');
    await userEvent.press(back);
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('keeps the title to one Inter line beside the 48 px target', async () => {
    await render(<BackHeader title="Your result" onBack={jest.fn()} testID="header" />);
    const title = screen.getByText('Your result');
    expect(title.props.numberOfLines).toBe(1);
    expect(title).toHaveStyle({ fontFamily: 'Inter_600SemiBold', fontSize: 16 });
    expect(screen.getByTestId('header-back').props.className).toMatch(/\bh-touch w-touch\b/);
  });

  it('fills surface2 while held — an opacity dim is invisible between two creams', async () => {
    await render(<BackHeader title="Your result" onBack={jest.fn()} testID="header" />);
    expect(screen.getByTestId('header-back').props.className).not.toMatch(/\bbg-surface2\b/);
    await act(async () => {
      fireEvent(screen.getByTestId('header-back'), 'pressIn');
    });
    expect(screen.getByTestId('header-back').props.className).toMatch(/\bbg-surface2\b/);
    expect(typeof screen.getByTestId('header-back').props.style).not.toBe('function');
  });

  it('renders a trailing slot after the title and a second row under it', async () => {
    await render(
      <BackHeader
        title="Updates"
        onBack={jest.fn()}
        trailing={<RNText testID="tag">Sample data</RNText>}
        testID="header"
      >
        <RNText testID="filters">Filters</RNText>
      </BackHeader>,
    );
    expect(screen.getByTestId('tag')).toBeOnTheScreen();
    expect(screen.getByTestId('filters')).toBeOnTheScreen();
  });

  // The chevron is a symbol, not a word: it renders in the Latin face whatever the UI
  // language, or a face without U+2039 draws tofu.
  it('draws the chevron in the Latin face and hides it from the reader', async () => {
    await render(<BackHeader title="Updates" onBack={jest.fn()} testID="header" />);
    const chevron = screen.getByText('‹', { includeHiddenElements: true });
    expect(chevron).toHaveStyle({ fontFamily: 'Inter_400Regular' });
    expect(chevron.props.className).toMatch(/\btext-ink2\b/);
  });
});
