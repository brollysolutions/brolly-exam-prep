import { act, render, screen, userEvent, within } from '@testing-library/react-native';
import { initI18n, setLanguage } from '@tslprb/i18n';

import { CategoryView } from '../CategoryView';

/** `Num` isolates its content in LRI…PDI, so matching rendered digits needs the same wrapper. */
const iso = (value: string) => `\u2066${value}\u2069`;

const noops = () => ({ onBack: jest.fn() });

describe('CategoryView', () => {
  beforeAll(() => {
    initI18n('en');
  });

  it('keeps the primary action disabled until a category is chosen', async () => {
    await render(<CategoryView onSubmit={jest.fn()} {...noops()} />);
    expect(screen.getByTestId('category-start')).toBeDisabled();
    await userEvent.press(screen.getByTestId('category-card-bc'));
    expect(screen.getByTestId('category-start')).toBeEnabled();
  });

  it('marks only the chosen card as selected', async () => {
    await render(<CategoryView onSubmit={jest.fn()} {...noops()} />);
    await userEvent.press(screen.getByTestId('category-card-sc'));
    expect(screen.getByTestId('category-card-sc').props.accessibilityState.selected).toBe(true);
    await userEvent.press(screen.getByTestId('category-card-oc'));
    expect(screen.getByTestId('category-card-oc').props.accessibilityState.selected).toBe(true);
    expect(screen.getByTestId('category-card-sc').props.accessibilityState.selected).toBe(false);
  });

  it('renders all six categories with their qualifying percentage', async () => {
    await render(<CategoryView onSubmit={jest.fn()} {...noops()} />);
    expect(screen.getByTestId('category-card-exs')).toBeOnTheScreen();
    expect(within(screen.getByTestId('category-card-bc')).getByText(iso('35%'))).toBeOnTheScreen();
    expect(within(screen.getByTestId('category-card-oc')).getByText(iso('40%'))).toBeOnTheScreen();
  });

  it('submits the chosen category', async () => {
    const onSubmit = jest.fn();
    await render(<CategoryView onSubmit={onSubmit} {...noops()} />);
    await userEvent.press(screen.getByTestId('category-card-st'));
    await userEvent.press(screen.getByTestId('category-start'));
    expect(onSubmit).toHaveBeenCalledWith('st');
  });

  it('opens on the category already stored and can go back', async () => {
    const onBack = jest.fn();
    await render(<CategoryView initialCategory="ews" onSubmit={jest.fn()} onBack={onBack} />);
    expect(screen.getByTestId('category-card-ews').props.accessibilityState.selected).toBe(true);
    await userEvent.press(screen.getByTestId('category-back'));
    expect(onBack).toHaveBeenCalled();
  });

  it('shows step 2 of 2', async () => {
    await render(<CategoryView onSubmit={jest.fn()} {...noops()} />);
    expect(screen.getByText(iso('2 / 2'))).toBeOnTheScreen();
  });
});

describe('CategoryView (ur)', () => {
  beforeAll(async () => {
    await act(async () => {
      await setLanguage('ur');
    });
  });

  afterAll(async () => {
    await act(async () => {
      await setLanguage('en');
    });
  });

  it('mirrors the grid and matches the snapshot', async () => {
    await render(<CategoryView initialCategory="bc" onSubmit={jest.fn()} {...noops()} />);
    expect(screen.getByText('آپ کا زمرہ')).toBeOnTheScreen();
    expect(screen.getByTestId('category-row-0')).toHaveStyle({ flexDirection: 'row-reverse' });
    expect(screen.toJSON()).toMatchSnapshot();
  });
});
