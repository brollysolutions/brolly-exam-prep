import { fireEvent, render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { standardsFor } from '@tslprb/fixtures';
import { i18n, initI18n } from '@tslprb/i18n';
import { ScrollView } from 'react-native';

import { iso } from '@/ui';

import { EligibilityView, type EligibilityViewProps } from '../EligibilityView';
import { evaluate, toInput, type MeasureValues } from '../evaluate';
import { joinRunTime } from '../runTime';

/** A constable man who clears all six standards. */
const PASSING: MeasureValues = {
  height: '172',
  chest: '90',
  chestExpansion: '6',
  run1600m: '420',
  longJump: '4.2',
  shotPut: '6.1',
};

/** The same man as an SI applicant: timed over 100 m and 800 m instead. */
const SI_PASSING: MeasureValues = {
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

/** The long runs are two fields: minutes and seconds. */
const runField = (key: 'run1600m' | 'run800m', part: 'min' | 'sec') =>
  screen.getByTestId(`eligibility-field-${key}-${part}`);

beforeAll(() => {
  initI18n('en');
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('EligibilityView — the form', () => {
  it('opens on the title, the disclaimer and no verdict', async () => {
    await render(<EligibilityView {...props()} />);
    expect(screen.getByText(t('eligibility.title'))).toBeOnTheScreen();
    expect(screen.getByTestId('eligibility-disclaimer')).toHaveTextContent('TSLPRB', {
      exact: false,
    });
    // The year is a digit passed in, isolated, never typed into the locale file.
    expect(screen.getByTestId('eligibility-disclaimer')).toHaveTextContent(iso('2022'), {
      exact: false,
    });
    expect(screen.queryByTestId('eligibility-verdict')).toBeNull();
  });

  it('asks a constable man for six measurements: chest, the 1600 m, no 100 m', async () => {
    await render(<EligibilityView {...props()} />);
    ['height', 'chest', 'chestExpansion', 'longJump', 'shotPut'].forEach((key) =>
      expect(screen.getByTestId(`eligibility-field-${key}`)).toBeOnTheScreen(),
    );
    expect(runField('run1600m', 'min')).toBeOnTheScreen();
    expect(runField('run1600m', 'sec')).toBeOnTheScreen();
    expect(screen.queryByTestId('eligibility-field-run100m')).toBeNull();
    expect(screen.queryByTestId('eligibility-field-run800m-min')).toBeNull();
    // The distance is a digit passed in, isolated, never typed into the locale file.
    expect(screen.getByText(i18n.t('eligibility.run', { m: iso(1600) }))).toBeOnTheScreen();
  });

  // The fields come from `standardEntries`, so the screen cannot ask a woman for a chest
  // measurement the PMT never takes, nor for the men's 1600 m.
  it('asks a constable woman for the 800 m and no chest', async () => {
    await render(<EligibilityView {...props({ gender: 'female' })} />);
    expect(screen.queryByTestId('eligibility-field-chest')).toBeNull();
    expect(screen.queryByTestId('eligibility-field-chestExpansion')).toBeNull();
    expect(screen.queryByTestId('eligibility-field-run1600m-min')).toBeNull();
    expect(screen.getByTestId('eligibility-field-height')).toBeOnTheScreen();
    expect(runField('run800m', 'min')).toBeOnTheScreen();
  });

  it('asks an SI applicant for the 100 m and the 800 m', async () => {
    await render(<EligibilityView {...props({ post: 'si' })} />);
    expect(screen.getByTestId('eligibility-field-run100m')).toBeOnTheScreen();
    expect(runField('run800m', 'sec')).toBeOnTheScreen();
    expect(screen.queryByTestId('eligibility-field-run1600m-min')).toBeNull();
  });

  it('shows what was typed and reports every edit against its own standard', async () => {
    const onChange = jest.fn();
    await render(<EligibilityView {...props({ values: { height: '167.6' }, onChange })} />);
    expect(screen.getByTestId('eligibility-field-height')).toHaveProp('value', '167.6');
    await fireEvent.changeText(screen.getByTestId('eligibility-field-longJump'), '4.1');
    expect(onChange).toHaveBeenCalledWith('longJump', '4.1');
  });

  // A run typed as "7.15" in a seconds field passed as 7.15 seconds (review I4). Minutes and
  // seconds are two fields, joined into the seconds the store and the checker keep.
  it('takes the long runs as minutes and seconds and stores them as seconds', async () => {
    const onChange = jest.fn();
    await render(<EligibilityView {...props({ onChange })} />);
    await fireEvent.changeText(runField('run1600m', 'min'), '7');
    expect(onChange).toHaveBeenLastCalledWith('run1600m', '420');
    await fireEvent.changeText(runField('run1600m', 'sec'), '15');
    expect(onChange).toHaveBeenLastCalledWith('run1600m', '435');
  });

  it('shows a stored run time back as minutes and seconds', async () => {
    await render(<EligibilityView {...props({ values: { run1600m: '435' } })} />);
    expect(runField('run1600m', 'min')).toHaveProp('value', '7');
    expect(runField('run1600m', 'sec')).toHaveProp('value', '15');
  });

  it('holds a run one second over the limit as a miss', async () => {
    const values = { ...PASSING, run1600m: joinRunTime('7', '16') };
    await render(<EligibilityView {...props({ values, result: result(values) })} />);
    expect(screen.getByTestId('eligibility-improve-run1600m')).toBeOnTheScreen();
    const ok = { ...PASSING, run1600m: joinRunTime('7', '15') };
    expect(result(ok).verdict).toBe('eligible');
  });

  it('takes decimals on a numeric keypad, and whole minutes and seconds on a number pad', async () => {
    await render(<EligibilityView {...props()} />);
    expect(screen.getByTestId('eligibility-field-longJump')).toHaveProp(
      'keyboardType',
      'decimal-pad',
    );
    expect(runField('run1600m', 'min')).toHaveProp('keyboardType', 'number-pad');
    expect(runField('run1600m', 'sec')).toHaveProp('keyboardType', 'number-pad');
  });

  // The standard's own figure is the placeholder (design 12): the empty field says what a
  // plausible entry looks like, and the border no longer has to do that alone.
  it('places the standard in every empty field', async () => {
    await render(<EligibilityView {...props()} />);
    expect(screen.getByTestId('eligibility-field-height')).toHaveProp('placeholder', '167.6');
    expect(screen.getByTestId('eligibility-field-longJump')).toHaveProp('placeholder', '4');
    expect(runField('run1600m', 'min')).toHaveProp('placeholder', '7');
    expect(runField('run1600m', 'sec')).toHaveProp('placeholder', '15');
  });

  it('heads the fields with a kicker and keeps the picker kickers in sentence case', async () => {
    await render(<EligibilityView {...props()} />);
    expect(screen.getByText(t('eligibility.measurements'))).toBeOnTheScreen();
    expect(screen.getByText(t('eligibility.post')).props.style.textTransform).toBeUndefined();
  });

  // Three stacked pickers cannot each carry a yellow block beside the one yellow action:
  // quiet, and full-width so the cells line up (design 5, 6).
  it('draws the pickers quiet and full-width', async () => {
    await render(<EligibilityView {...props()} />);
    const cell = screen.getByRole('radio', { name: t('onboarding.pcTitle') });
    expect(cell.props.className).toContain('bg-surface2');
    expect(cell.props.className).toContain('flex-1');
    expect(cell.props.className).not.toContain('bg-accentSoft');
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

describe('EligibilityView — unconfirmed figures', () => {
  // A figure from sources that disagree has to be flagged where the reader is looking —
  // beside the pickers — not only in the small print at the bottom. `allVerified` decides,
  // so the ST constable chest triggers it as well as every SI row (review M1).
  it('warns under the pickers whenever any figure on the table is unconfirmed', async () => {
    const { rerender } = await render(<EligibilityView {...props({ post: 'si' })} />);
    expect(screen.getByTestId('eligibility-unverified-note')).toHaveTextContent(
      t('eligibility.unverifiedNote'),
    );
    await rerender(<EligibilityView {...props({ post: 'pc', group: 'st' })} />);
    expect(screen.getByTestId('eligibility-unverified-note')).toBeOnTheScreen();
    await rerender(<EligibilityView {...props({ post: 'pc' })} />);
    expect(screen.queryByTestId('eligibility-unverified-note')).toBeNull();
  });

  it('tags every SI result row as unconfirmed', async () => {
    await render(
      <EligibilityView
        {...props({ post: 'si', values: SI_PASSING, result: result(SI_PASSING, { post: 'si' }) })}
      />,
    );
    expect(screen.getAllByText(t('eligibility.unverified'))).toHaveLength(7);
    expect(screen.getByTestId('eligibility-unverified-run100m')).toBeOnTheScreen();
  });

  it('tags nothing on a fully confirmed constable row', async () => {
    await render(<EligibilityView {...props({ values: PASSING, result: result(PASSING) })} />);
    expect(screen.queryByText(t('eligibility.unverified'))).toBeNull();
    expect(screen.queryByTestId('eligibility-unverified-height')).toBeNull();
  });

  it('tags only the ST chest on a constable ST man', async () => {
    const r = result(PASSING, { group: 'st' });
    await render(<EligibilityView {...props({ group: 'st', values: PASSING, result: r })} />);
    expect(screen.getAllByText(t('eligibility.unverified'))).toHaveLength(2);
    expect(screen.getByTestId('eligibility-unverified-chest')).toBeOnTheScreen();
    expect(screen.getByTestId('eligibility-unverified-chestExpansion')).toBeOnTheScreen();
    expect(screen.queryByTestId('eligibility-unverified-height')).toBeNull();
  });
});

describe('EligibilityView — the verdict', () => {
  it('says so, and marks every row, when the standards are met', async () => {
    await render(<EligibilityView {...props({ values: PASSING, result: result(PASSING) })} />);
    expect(screen.getByTestId('eligibility-verdict')).toHaveTextContent(t('eligibility.eligible'), {
      exact: false,
    });
    expect(screen.getAllByLabelText(t('eligibility.pass'))).toHaveLength(6);
    expect(screen.queryByLabelText(t('eligibility.fail'))).toBeNull();
  });

  it('prints the required figure beside the entered one on every row', async () => {
    await render(<EligibilityView {...props({ values: PASSING, result: result(PASSING) })} />);
    const height = screen.getByTestId('eligibility-row-height');
    expect(height).toHaveTextContent(t('eligibility.required'), { exact: false });
    expect(height).toHaveTextContent('167.6', { exact: false });
    expect(height).toHaveTextContent(t('eligibility.yours'), { exact: false });
    expect(height).toHaveTextContent('172', { exact: false });
    // The run limit reads the way the notification writes it, so an entry can be checked
    // against it by eye; the sprint stays in seconds.
    const run = screen.getByTestId('eligibility-row-run1600m');
    expect(run).toHaveTextContent('7:15', { exact: false });
    expect(run).toHaveTextContent('7:00', { exact: false });
    expect(run).not.toHaveTextContent('435', { exact: false });
  });

  it('rules between the rows and gives the marks their own column', async () => {
    await render(<EligibilityView {...props({ values: PASSING, result: result(PASSING) })} />);
    expect(screen.getByTestId('eligibility-row-height').props.className).toContain('border-b');
    expect(screen.getByTestId('eligibility-row-shotPut').props.className).not.toContain(
      'border-b',
    );
    expect(screen.getByTestId('eligibility-mark-height').props.className).toContain('w-6');
  });

  // The verdict lands below the fold, under the button (design 10): once it is laid out,
  // the screen scrolls to it — 16 px above it, so the banner is not flush to the top edge.
  it('scrolls to the verdict once Check has been pressed and it has a place on screen', async () => {
    const p = props({ values: PASSING });
    const { rerender } = await render(<EligibilityView {...p} />);
    await userEvent.press(screen.getByTestId('eligibility-check'));
    expect(p.onCheck).toHaveBeenCalled();
    await rerender(<EligibilityView {...p} result={result(PASSING)} />);
    await fireEvent(screen.getByTestId('eligibility-result'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 900, width: 360, height: 400 } },
    });
    await waitFor(() =>
      expect(ScrollView.prototype.scrollTo).toHaveBeenCalledWith({ y: 884, animated: true }),
    );
  });

  it('does not scroll on its own when a verdict is merely on screen', async () => {
    await render(<EligibilityView {...props({ values: PASSING, result: result(PASSING) })} />);
    await fireEvent(screen.getByTestId('eligibility-result'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 900, width: 360, height: 400 } },
    });
    expect(ScrollView.prototype.scrollTo).not.toHaveBeenCalled();
  });

  it('names what to work on when a standard is missed', async () => {
    const values = { ...PASSING, height: '160', run1600m: '450' };
    await render(<EligibilityView {...props({ values, result: result(values) })} />);
    const verdict = screen.getByTestId('eligibility-verdict');
    expect(verdict).toHaveTextContent(t('eligibility.notYet'), { exact: false });
    expect(verdict).toHaveTextContent(t('eligibility.improve'), { exact: false });
    expect(screen.getByTestId('eligibility-improve-height')).toHaveTextContent(
      t('eligibility.height'),
      { exact: false },
    );
    expect(screen.getByTestId('eligibility-improve-run1600m')).toHaveTextContent(
      i18n.t('eligibility.run', { m: iso(1600) }),
      { exact: false },
    );
    expect(screen.queryByTestId('eligibility-improve-shotPut')).toBeNull();
  });

  it('asks for the rest of the form rather than guessing', async () => {
    const values = { height: '172', run1600m: '420' };
    await render(<EligibilityView {...props({ values, result: result(values) })} />);
    expect(screen.getByTestId('eligibility-verdict')).toHaveTextContent(
      t('eligibility.incomplete'),
      { exact: false },
    );
    // Nothing has failed, so there is nothing to improve — only rows still unanswered.
    expect(screen.queryByTestId('eligibility-improve-height')).toBeNull();
    expect(screen.getAllByLabelText(t('eligibility.notEntered'))).toHaveLength(4);
  });
});
