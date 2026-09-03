import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import { standardsFor } from '@tslprb/fixtures';
import { i18n, initI18n } from '@tslprb/i18n';

import { EligibilityView, type EligibilityViewProps } from '../EligibilityView';
import { evaluate, toInput, type MeasureValues } from '../evaluate';

const PASSING: MeasureValues = {
  height: '172',
  chest: '90',
  chestExpansion: '6',
  run800m: '160',
  run100m: '14',
  longJump: '4.2',
  shotPut: '6.1',
};

const result = (values: MeasureValues, over: Partial<EligibilityViewProps> = {}) => {
  const post = over.post ?? 'pc';
  const gender = over.gender ?? 'male';
  const group = over.group ?? 'general';
  return evaluate(toInput(post, gender, group, values), standardsFor(post, gender, group));
};

const props = (over: Partial<EligibilityViewProps> = {}): EligibilityViewProps => ({
  post: 'pc',
  gender: 'male',
  group: 'general',
  values: {},
  onPost: jest.fn(),
  onGender: jest.fn(),
  onGroup: jest.fn(),
  onChange: jest.fn(),
  onCheck: jest.fn(),
  onBack: jest.fn(),
  ...over,
});

const t = (key: string) => i18n.t(key);

beforeAll(() => {
  initI18n('en');
});

describe('EligibilityView — the form', () => {
  it('opens on the title, the disclaimer and no verdict', async () => {
    await render(<EligibilityView {...props()} />);
    expect(screen.getByText(t('eligibility.title'))).toBeOnTheScreen();
    expect(screen.getByTestId('eligibility-disclaimer')).toHaveTextContent('TSLPRB', {
      exact: false,
    });
    expect(screen.queryByTestId('eligibility-verdict')).toBeNull();
  });

  it('asks a man for all seven measurements, chest included', async () => {
    await render(<EligibilityView {...props()} />);
    ['height', 'chest', 'chestExpansion', 'run800m', 'run100m', 'longJump', 'shotPut'].forEach(
      (key) => expect(screen.getByTestId(`eligibility-field-${key}`)).toBeOnTheScreen(),
    );
  });

  // The fields come from `standardEntries`, so the screen cannot ask a woman for a chest
  // measurement the PMT never takes.
  it('drops the chest fields for a woman', async () => {
    await render(<EligibilityView {...props({ gender: 'female' })} />);
    expect(screen.queryByTestId('eligibility-field-chest')).toBeNull();
    expect(screen.queryByTestId('eligibility-field-chestExpansion')).toBeNull();
    expect(screen.getByTestId('eligibility-field-height')).toBeOnTheScreen();
  });

  it('shows what was typed and reports every edit against its own standard', async () => {
    const onChange = jest.fn();
    await render(<EligibilityView {...props({ values: { height: '167.6' }, onChange })} />);
    expect(screen.getByTestId('eligibility-field-height')).toHaveProp('value', '167.6');
    fireEvent.changeText(screen.getByTestId('eligibility-field-run800m'), '168');
    expect(onChange).toHaveBeenCalledWith('run800m', '168');
  });

  it('takes decimals on a numeric keypad', async () => {
    await render(<EligibilityView {...props()} />);
    expect(screen.getByTestId('eligibility-field-longJump')).toHaveProp(
      'keyboardType',
      'decimal-pad',
    );
  });

  it('moves the three pickers', async () => {
    const p = props();
    await render(<EligibilityView {...p} />);
    await userEvent.press(screen.getByLabelText(t('onboarding.siTitle')));
    await userEvent.press(screen.getByLabelText(t('eligibility.female')));
    await userEvent.press(screen.getByLabelText(t('eligibility.st')));
    expect(p.onPost).toHaveBeenCalledWith('si');
    expect(p.onGender).toHaveBeenCalledWith('female');
    expect(p.onGroup).toHaveBeenCalledWith('st');
  });

  it('checks on the primary action and leaves on the back chevron', async () => {
    const p = props();
    await render(<EligibilityView {...p} />);
    await userEvent.press(screen.getByTestId('eligibility-check'));
    expect(p.onCheck).toHaveBeenCalled();
    await userEvent.press(screen.getByTestId('eligibility-header-back'));
    expect(p.onBack).toHaveBeenCalled();
  });
});

describe('EligibilityView — the verdict', () => {
  it('says so, and marks every row, when the standards are met', async () => {
    await render(<EligibilityView {...props({ values: PASSING, result: result(PASSING) })} />);
    expect(screen.getByTestId('eligibility-verdict')).toHaveTextContent(t('eligibility.eligible'), {
      exact: false,
    });
    expect(screen.getAllByLabelText(t('eligibility.pass'))).toHaveLength(7);
    expect(screen.queryByLabelText(t('eligibility.fail'))).toBeNull();
  });

  it('prints the required figure beside the entered one on every row', async () => {
    await render(<EligibilityView {...props({ values: PASSING, result: result(PASSING) })} />);
    const height = screen.getByTestId('eligibility-row-height');
    expect(height).toHaveTextContent(t('eligibility.required'), { exact: false });
    expect(height).toHaveTextContent('167.6', { exact: false });
    expect(height).toHaveTextContent(t('eligibility.yours'), { exact: false });
    expect(height).toHaveTextContent('172', { exact: false });
  });

  it('names what to work on when a standard is missed', async () => {
    const values = { ...PASSING, height: '160', run800m: '190' };
    await render(<EligibilityView {...props({ values, result: result(values) })} />);
    const verdict = screen.getByTestId('eligibility-verdict');
    expect(verdict).toHaveTextContent(t('eligibility.notYet'), { exact: false });
    expect(verdict).toHaveTextContent(t('eligibility.improve'), { exact: false });
    expect(screen.getByTestId('eligibility-improve-height')).toHaveTextContent(
      t('eligibility.height'),
      { exact: false },
    );
    expect(screen.getByTestId('eligibility-improve-run800m')).toBeOnTheScreen();
    expect(screen.queryByTestId('eligibility-improve-shotPut')).toBeNull();
  });

  it('asks for the rest of the form rather than guessing', async () => {
    const values = { height: '172', run100m: '14' };
    await render(<EligibilityView {...props({ values, result: result(values) })} />);
    expect(screen.getByTestId('eligibility-verdict')).toHaveTextContent(
      t('eligibility.incomplete'),
      { exact: false },
    );
    // Nothing has failed, so there is nothing to improve — only rows still unanswered.
    expect(screen.queryByTestId('eligibility-improve-height')).toBeNull();
    expect(screen.getAllByLabelText(t('eligibility.notEntered'))).toHaveLength(5);
  });
});
