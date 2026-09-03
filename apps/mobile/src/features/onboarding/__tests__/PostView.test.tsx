import { act, render, screen, userEvent } from '@testing-library/react-native';
import { initI18n, setLanguage } from '@tslprb/i18n';

import { iso } from '@/ui';

import { PostView } from '../PostView';

describe('PostView', () => {
  beforeAll(() => {
    initI18n('en');
  });

  it('keeps continue disabled until a post is chosen', async () => {
    await render(<PostView onSubmit={jest.fn()} />);
    expect(screen.getByTestId('post-continue')).toBeDisabled();
    await userEvent.press(screen.getByTestId('post-card-pc'));
    expect(screen.getByTestId('post-continue')).toBeEnabled();
  });

  it('marks only the chosen card as selected', async () => {
    await render(<PostView onSubmit={jest.fn()} />);
    await userEvent.press(screen.getByTestId('post-card-si'));
    expect(screen.getByTestId('post-card-si').props.accessibilityState.selected).toBe(true);
    expect(screen.getByTestId('post-card-pc').props.accessibilityState.selected).toBe(false);
    await userEvent.press(screen.getByTestId('post-card-pc'));
    expect(screen.getByTestId('post-card-pc').props.accessibilityState.selected).toBe(true);
    expect(screen.getByTestId('post-card-si').props.accessibilityState.selected).toBe(false);
  });

  it('opens on the post already stored', async () => {
    await render(<PostView initialPost="si" onSubmit={jest.fn()} />);
    expect(screen.getByTestId('post-card-si').props.accessibilityState.selected).toBe(true);
    expect(screen.getByTestId('post-continue')).toBeEnabled();
  });

  it('submits the chosen post', async () => {
    const onSubmit = jest.fn();
    await render(<PostView onSubmit={onSubmit} />);
    await userEvent.press(screen.getByTestId('post-card-si'));
    await userEvent.press(screen.getByTestId('post-continue'));
    expect(onSubmit).toHaveBeenCalledWith('si');
  });

  it('shows step 1 of 2', async () => {
    await render(<PostView onSubmit={jest.fn()} />);
    expect(screen.getByText(iso('1 / 2'))).toBeOnTheScreen();
  });
});

describe('PostView (ur)', () => {
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

  it('mirrors the copy and matches the snapshot', async () => {
    await render(<PostView initialPost="pc" onSubmit={jest.fn()} />);
    expect(screen.getByText('کانسٹیبل')).toHaveStyle({ textAlign: 'right' });
    // The cards stack, so the mirroring shows in the copy; the step counter loses its tracking.
    expect(screen.getByTestId('post-cards')).toHaveStyle({ flexDirection: 'column' });
    expect(screen.getByTestId('post-step')).toHaveStyle({ letterSpacing: 0 });
    expect(screen.toJSON()).toMatchSnapshot();
  });
});
