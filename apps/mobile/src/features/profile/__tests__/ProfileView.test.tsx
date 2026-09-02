import { act, render, screen, userEvent } from '@testing-library/react-native';
import { colors } from '@tslprb/design-tokens';
import { initI18n, setLanguage } from '@tslprb/i18n';

import { ProfileView } from '../ProfileView';

const handlers = () => ({
  onLang: jest.fn(),
  onNotifications: jest.fn(),
  onEditPost: jest.fn(),
  onEditCategory: jest.fn(),
  onLogout: jest.fn(),
  onDelete: jest.fn(),
});

const base = { post: 'si', category: 'bc', notifications: true, version: '1.0.0' } as const;

describe('ProfileView', () => {
  beforeAll(() => {
    initI18n('en');
  });

  it('shows the answers onboarding collected', async () => {
    await render(<ProfileView {...base} lang="en" {...handlers()} />);
    expect(screen.getByTestId('profile-post')).toHaveTextContent(/SI \/ ASI/);
    expect(screen.getByTestId('profile-category')).toHaveTextContent(/BC/);
    expect(screen.getByTestId('profile-version')).toHaveTextContent('Version 1.0.0');
    expect(screen.getByTestId('profile-language')).toHaveTextContent(/Language/);
  });

  it('leaves a dash where an answer is missing rather than guessing', async () => {
    await render(
      <ProfileView
        notifications={false}
        version="1.0.0"
        lang="en"
        {...handlers()}
      />,
    );
    expect(screen.getByTestId('profile-post')).toHaveTextContent(/—/);
    expect(screen.getByTestId('profile-category')).toHaveTextContent(/—/);
  });

  it('sends you back to the onboarding steps to change an answer', async () => {
    const h = handlers();
    await render(<ProfileView {...base} lang="en" {...h} />);
    await userEvent.press(screen.getByTestId('profile-post'));
    expect(h.onEditPost).toHaveBeenCalledTimes(1);
    await userEvent.press(screen.getByTestId('profile-category'));
    expect(h.onEditCategory).toHaveBeenCalledTimes(1);
  });

  it('toggles the daily reminder', async () => {
    const h = handlers();
    await render(<ProfileView {...base} lang="en" {...h} />);
    const toggle = screen.getByTestId('profile-notifications');
    expect(toggle.props.accessibilityState.checked).toBe(true);
    await userEvent.press(toggle);
    expect(h.onNotifications).toHaveBeenCalledWith(false);
  });

  it('draws the reminder switch from the palette, not the platform', async () => {
    const { rerender } = await render(<ProfileView {...base} lang="en" {...handlers()} />);
    expect(screen.getByTestId('profile-notifications')).toHaveStyle({
      backgroundColor: colors.hivis,
    });
    await act(async () =>
      rerender(<ProfileView {...base} notifications={false} lang="en" {...handlers()} />),
    );
    expect(screen.getByTestId('profile-notifications')).toHaveStyle({
      backgroundColor: colors.panel3,
    });
  });

  it('asks in outline and only commits in solid red', async () => {
    await render(<ProfileView {...base} lang="en" {...handlers()} />);
    // A solid red button sitting on a settings list reads as the screen's primary action.
    expect(screen.getByTestId('profile-delete').props.className).toContain('border-flag');
    expect(screen.getByTestId('profile-delete').props.className).not.toContain('bg-flag');
    await userEvent.press(screen.getByTestId('profile-delete'));
    expect(screen.getByTestId('profile-delete-dialog')).toBeOnTheScreen();
  });

  it('switches language inline', async () => {
    const h = handlers();
    await render(<ProfileView {...base} lang="en" {...h} />);
    await userEvent.press(screen.getByLabelText('اُر'));
    expect(h.onLang).toHaveBeenCalledWith('ur');
  });

  it('logs out without asking', async () => {
    const h = handlers();
    await render(<ProfileView {...base} lang="en" {...h} />);
    await userEvent.press(screen.getByTestId('profile-logout'));
    expect(h.onLogout).toHaveBeenCalledTimes(1);
  });

  it('asks before deleting the account, and only then deletes', async () => {
    const h = handlers();
    await render(<ProfileView {...base} lang="en" {...h} />);
    expect(screen.queryByTestId('profile-delete-dialog')).toBeNull();
    await userEvent.press(screen.getByTestId('profile-delete'));
    expect(screen.getByTestId('profile-delete-dialog')).toBeOnTheScreen();
    expect(h.onDelete).not.toHaveBeenCalled();
    await userEvent.press(screen.getByText('Delete everything'));
    expect(h.onDelete).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('profile-delete-dialog')).toBeNull();
  });

  it('backs out of the delete dialog without touching anything', async () => {
    const h = handlers();
    await render(<ProfileView {...base} lang="en" {...h} />);
    await userEvent.press(screen.getByTestId('profile-delete'));
    await userEvent.press(screen.getByText('Cancel'));
    expect(screen.queryByTestId('profile-delete-dialog')).toBeNull();
    expect(h.onDelete).not.toHaveBeenCalled();
  });
});

describe('ProfileView (ur)', () => {
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

  it('mirrors the setting rows and matches the snapshot', async () => {
    await render(<ProfileView {...base} lang="ur" {...handlers()} />);
    expect(screen.getByText('پروفائل')).toBeOnTheScreen();
    // The settings rows mirror like every other row on the screen.
    expect(screen.getByTestId('profile-post-row')).toHaveStyle({ flexDirection: 'row-reverse' });
    // "On" travels toward the reading end, which in Urdu is the left.
    expect(screen.getByTestId('profile-notifications-thumb')).toHaveStyle({ right: 23 });
    expect(screen.getByTestId('profile-notifications').props.accessibilityState.checked).toBe(true);
    // Chevrons must stay Latin-faced: Nastaliq has no U+203A.
    expect(screen.getAllByText('‹', { includeHiddenElements: true })[0]).toHaveStyle({
      fontFamily: 'Archivo_400Regular',
    });
    expect(screen.toJSON()).toMatchSnapshot();
  });
});
