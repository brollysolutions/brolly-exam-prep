import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import { i18n, initI18n } from '@tslprb/i18n';

import EligibilityRoute from '@/app/eligibility';
import { useEligibilityStore } from '@/data/eligibility';
import { useSessionStore } from '@/data/session';

const mockRouter = { push: jest.fn(), replace: jest.fn(), navigate: jest.fn(), back: jest.fn() };

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => ({}),
}));

const t = (key: string) => i18n.t(key);

beforeAll(() => {
  initI18n('en');
});

beforeEach(() => {
  jest.clearAllMocks();
  useEligibilityStore.getState().reset();
  useSessionStore.getState().logout();
});

describe('EligibilityRoute', () => {
  // The standards are published and the answer is a measurement, not a score: an account buys
  // the reader nothing, so nothing here may send them to the sign-in.
  it('opens for a guest with no gate', async () => {
    await render(<EligibilityRoute />);
    expect(screen.getByTestId('eligibility-screen')).toBeOnTheScreen();
    expect(mockRouter.push).not.toHaveBeenCalled();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('starts a guest on constable, men and general', async () => {
    await render(<EligibilityRoute />);
    expect(screen.getByRole('radio', { name: t('onboarding.pcTitle') })).toBeChecked();
    expect(screen.getByRole('radio', { name: t('eligibility.male') })).toBeChecked();
    expect(screen.getByRole('radio', { name: t('eligibility.general') })).toBeChecked();
  });

  it('prefills the post and the category group from the profile', async () => {
    useSessionStore.getState().setPost('si');
    useSessionStore.getState().setCategory('st');
    await render(<EligibilityRoute />);
    expect(screen.getByRole('radio', { name: t('onboarding.siTitle') })).toBeChecked();
    expect(screen.getByRole('radio', { name: t('eligibility.st') })).toBeChecked();
  });

  // Checking a friend's numbers must not rewrite the exam settings the whole app reads.
  it('overrides the profile here without writing back to the session', async () => {
    useSessionStore.getState().setPost('pc');
    await render(<EligibilityRoute />);
    await userEvent.press(screen.getByLabelText(t('onboarding.siTitle')));
    expect(useEligibilityStore.getState().post).toBe('si');
    expect(useSessionStore.getState().post).toBe('pc');
  });

  it('keeps what was typed and only answers once Check is pressed', async () => {
    await render(<EligibilityRoute />);
    fireEvent.changeText(screen.getByTestId('eligibility-field-height'), '172');
    expect(useEligibilityStore.getState().values.height).toBe('172');
    expect(screen.queryByTestId('eligibility-verdict')).toBeNull();

    await userEvent.press(screen.getByTestId('eligibility-check'));
    expect(useEligibilityStore.getState().checked).toBe(true);
    expect(screen.getByTestId('eligibility-verdict')).toHaveTextContent(
      t('eligibility.incomplete'),
      { exact: false },
    );
  });

  it('comes back to the numbers and the verdict a returning user left behind', async () => {
    useEligibilityStore.setState({
      gender: 'female',
      values: { height: '158', run800m: '190', run100m: '15', longJump: '3', shotPut: '4.5' },
      checked: true,
    });
    await render(<EligibilityRoute />);
    expect(screen.getByTestId('eligibility-field-height')).toHaveProp('value', '158');
    expect(screen.getByTestId('eligibility-verdict')).toHaveTextContent(t('eligibility.eligible'), {
      exact: false,
    });
  });

  it('re-answers the moment a picker moves', async () => {
    useEligibilityStore.setState({
      values: { height: '162', chest: '90', chestExpansion: '6' },
      checked: true,
    });
    await render(<EligibilityRoute />);
    expect(screen.getByTestId('eligibility-verdict')).toHaveTextContent(t('eligibility.notYet'), {
      exact: false,
    });
    // The ST column relaxes the height to 160 cm, so the same 162 cm stops being a shortfall.
    await userEvent.press(screen.getByLabelText(t('eligibility.st')));
    expect(screen.queryByTestId('eligibility-improve-height')).toBeNull();
  });

  it('leaves on the back chevron', async () => {
    await render(<EligibilityRoute />);
    await userEvent.press(screen.getByTestId('eligibility-header-back'));
    expect(mockRouter.back).toHaveBeenCalled();
  });
});
