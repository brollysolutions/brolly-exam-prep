import { render, screen, within } from '@testing-library/react-native';
import { initI18n, ur } from '@tslprb/i18n';

import { useLangStore } from '@/data/lang';
import {
  DEMO_ATTEMPT,
  DEMO_ELAPSED_SEC,
  DEMO_PAPER,
  DEMO_REMAINING_SEC,
} from '@/features/dev/sections/attemptDemo';
import { iso } from '@/ui';

import { AttemptNotices } from '../AttemptOverlays';
import { AttemptView } from '../AttemptView';

const noop = () => undefined;

const props = {
  attempt: DEMO_ATTEMPT,
  question: DEMO_PAPER[DEMO_ATTEMPT.current - 1],
  remainingSec: DEMO_REMAINING_SEC,
  elapsedSec: DEMO_ELAPSED_SEC,
  lang: 'ur' as const,
  onLangChange: noop,
  onExit: noop,
  onSectionPress: noop,
  onLockedTap: noop,
  onAnswer: noop,
  onClear: noop,
  onToggleMark: noop,
  onPrev: noop,
  onNext: noop,
  onOpenPalette: noop,
};

describe('AttemptView (ur)', () => {
  beforeAll(() => {
    useLangStore.setState({ lang: 'ur' });
    initI18n('ur');
  });

  it('mirrors the header and footer, keeps the clock LTR, and matches the snapshot', async () => {
    await render(<AttemptView {...props} notices={<AttemptNotices offline />} />);

    // The Urdu question stem is on screen, in the Nastaliq face.
    expect(
      screen.getByTestId('question-text'),
    ).toHaveTextContent(DEMO_PAPER[DEMO_ATTEMPT.current - 1].text.ur);
    // The header mirrors to row-reverse under Urdu.
    expect(screen.getByTestId('attempt-header-row')).toHaveStyle({ flexDirection: 'row-reverse' });
    // The marks chip is a physical row: its digits never re-order inside an RTL line.
    expect(screen.getByTestId('q-badge')).toHaveStyle({ flexDirection: 'row' });
    // Chevrons flip: "next" points left in Urdu.
    expect(screen.getByTestId('btn-prev')).toHaveTextContent('›');
    expect(screen.getByTestId('btn-next')).toHaveTextContent('اگلا‹');
    // …and are drawn with the Latin face: Nastaliq has no chevron glyph.
    expect(screen.getByTestId('chevron-prev')).toHaveStyle({ fontFamily: 'Archivo_400Regular' });
    expect(screen.getByTestId('chevron-next')).toHaveStyle({ fontFamily: 'Archivo_400Regular' });

    expect(screen.toJSON()).toMatchSnapshot();
  });

  // The line used to be `<Num>{t('common.seconds', { count })}</Num>`, which forced the whole
  // string — Urdu unit included — through Archivo and drew the unit as tofu boxes.
  it('splits the time-on-question line: digits in Archivo, the unit in Nastaliq', async () => {
    await render(<AttemptView {...props} />);
    const line = within(screen.getByTestId('time-on-question'));

    expect(line.getByText(iso(String(DEMO_ELAPSED_SEC)))).toHaveStyle({
      fontFamily: 'Archivo_400Regular',
    });
    expect(line.getByText(` ${ur.common.unitS}`)).toHaveStyle({
      fontFamily: 'NotoNastaliqUrdu_400Regular',
    });
    // The flat string is still what a screen reader announces.
    expect(screen.getByLabelText(`${DEMO_ELAPSED_SEC} ${ur.common.unitS}`)).toBeOnTheScreen();
  });
});
