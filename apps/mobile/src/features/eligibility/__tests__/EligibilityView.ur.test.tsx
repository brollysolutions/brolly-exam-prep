import { render, screen } from '@testing-library/react-native';
import { standardsFor } from '@tslprb/fixtures';
import { i18n, initI18n } from '@tslprb/i18n';

import { useLangStore } from '@/data/lang';

import { EligibilityView } from '../EligibilityView';
import { evaluate, toInput, type MeasureValues } from '../evaluate';

/** A woman one centimetre short: one failing row, one banner, five rows to mirror. */
const VALUES: MeasureValues = {
  height: '151',
  run800m: '190',
  run100m: '15',
  longJump: '3',
  shotPut: '4.5',
};

const RESULT = evaluate(
  toInput('pc', 'female', 'general', VALUES),
  standardsFor('pc', 'female', 'general'),
);

const noop = () => {};

describe('EligibilityView (ur)', () => {
  beforeAll(() => {
    useLangStore.setState({ lang: 'ur' });
    initI18n('ur');
  });

  it('mirrors the screen while the digits stay left-to-right', async () => {
    await render(
      <EligibilityView
        post="pc"
        gender="female"
        group="general"
        values={VALUES}
        result={RESULT}
        onPost={noop}
        onGender={noop}
        onGroup={noop}
        onChange={noop}
        onCheck={noop}
        onBack={noop}
      />,
    );

    expect(screen.getByTestId('eligibility-header')).toHaveStyle({
      flexDirection: 'row-reverse',
    });
    expect(screen.getByTestId('eligibility-row-height')).toHaveStyle({
      flexDirection: 'row-reverse',
    });

    // A measurement is typed in Latin figures in every language: the field never mirrors.
    expect(screen.getByTestId('eligibility-field-height')).toHaveStyle({
      textAlign: 'left',
      writingDirection: 'ltr',
    });

    // Urdu copy from the locale file is on screen, and so is the verdict.
    expect(screen.getByText(i18n.t('eligibility.title'))).toBeOnTheScreen();
    expect(screen.getByTestId('eligibility-verdict')).toHaveTextContent(
      i18n.t('eligibility.notYet'),
      { exact: false },
    );
    expect(screen.getByTestId('eligibility-improve-height')).toBeOnTheScreen();

    expect(screen.toJSON()).toMatchSnapshot();
  });
});
