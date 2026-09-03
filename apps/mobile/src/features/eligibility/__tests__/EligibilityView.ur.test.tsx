import { render, screen } from '@testing-library/react-native';
import { standardsFor } from '@tslprb/fixtures';
import { i18n, initI18n } from '@tslprb/i18n';

import { useLangStore } from '@/data/lang';

import { EligibilityView } from '../EligibilityView';
import { evaluate, toInput, type MeasureValues } from '../evaluate';

/** A constable woman one centimetre short: one failing row, one banner, four rows to mirror. */
const VALUES: MeasureValues = {
  height: '151',
  run800m: '300',
  longJump: '3',
  shotPut: '4.5',
};

const RESULT = evaluate(
  toInput('pc', 'female', 'general', VALUES),
  standardsFor('pc', 'female', 'general'),
);

/** An SI woman: every figure unconfirmed, so every row carries the tag and the note shows. */
const SI_VALUES: MeasureValues = { height: '158', run800m: '190', run100m: '15' };

const SI_RESULT = evaluate(
  toInput('si', 'female', 'general', SI_VALUES),
  standardsFor('si', 'female', 'general'),
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

    // A measurement is typed in Latin figures in every language, so the field's writing
    // direction never mirrors — but the caret sits on the reading side, which is the right.
    expect(screen.getByTestId('eligibility-field-height')).toHaveStyle({
      textAlign: 'right',
      writingDirection: 'ltr',
    });
    expect(screen.getByTestId('eligibility-field-run800m-min')).toHaveStyle({
      textAlign: 'right',
      writingDirection: 'ltr',
    });

    // Urdu copy from the locale file is on screen, and so is the verdict.
    expect(screen.getByText(i18n.t('eligibility.title'))).toBeOnTheScreen();
    expect(screen.getByTestId('eligibility-verdict')).toHaveTextContent(
      i18n.t('eligibility.notYet'),
      { exact: false },
    );
    expect(screen.getByTestId('eligibility-improve-height')).toBeOnTheScreen();

    // Every constable figure is confirmed: no tag, no note.
    expect(screen.queryByText(i18n.t('eligibility.unverified'))).toBeNull();
    expect(screen.queryByTestId('eligibility-unverified-note')).toBeNull();

    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('carries the unconfirmed tag and the note in Urdu', async () => {
    await render(
      <EligibilityView
        post="si"
        gender="female"
        group="general"
        values={SI_VALUES}
        result={SI_RESULT}
        onPost={noop}
        onGender={noop}
        onGroup={noop}
        onChange={noop}
        onCheck={noop}
        onBack={noop}
      />,
    );
    expect(screen.getByTestId('eligibility-unverified-note')).toHaveTextContent(
      i18n.t('eligibility.unverifiedNote'),
    );
    expect(screen.getAllByText(i18n.t('eligibility.unverified'))).toHaveLength(5);
    expect(screen.getByTestId('eligibility-unverified-run100m')).toBeOnTheScreen();
  });
});
