import { render, screen, within } from '@testing-library/react-native';
import { initI18n, te } from '@tslprb/i18n';

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
  lang: 'te' as const,
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

describe('AttemptView (te)', () => {
  beforeAll(() => {
    useLangStore.setState({ lang: 'te' });
    initI18n('te');
  });

  it('sets the paper in the Telugu face, keeps the clock Latin, and matches the snapshot', async () => {
    await render(<AttemptView {...props} notices={<AttemptNotices offline />} />);

    // The Telugu question stem is on screen, in the Telugu face.
    expect(screen.getByTestId('question-text')).toHaveTextContent(
      DEMO_PAPER[DEMO_ATTEMPT.current - 1].text.te,
    );
    expect(screen.getByTestId('question-text')).toHaveStyle({
      fontFamily: 'NotoSansTelugu_400Regular',
    });
    expect(screen.getByTestId('attempt-header-row')).toHaveStyle({ flexDirection: 'row' });
    // The Q badge is the paper viewer's pill: the label in the Telugu face, the number Latin
    // and isolated. (The old assertion read the badge's own `flexDirection`; a `Pill` keeps
    // that on the row inside it, and the physical-order guarantee that mattered — "+1 / −0.25"
    // — moved to the marks pill, which `AttemptView.test` asserts.)
    expect(screen.getByTestId('q-badge')).toHaveTextContent(
      new RegExp(`${te.test.qLabel}.?${iso(DEMO_ATTEMPT.current)}`),
    );
    // Chevrons point along the reading direction.
    expect(screen.getByTestId('btn-prev')).toHaveTextContent('‹');
    expect(screen.getByTestId('btn-next')).toHaveTextContent(`${te.test.next}›`);
    // …and are drawn with the Latin face, whatever the UI language.
    expect(screen.getByTestId('chevron-prev')).toHaveStyle({ fontFamily: 'Inter_400Regular' });
    expect(screen.getByTestId('chevron-next')).toHaveStyle({ fontFamily: 'Inter_400Regular' });

    expect(screen.toJSON()).toMatchSnapshot();
  });

  // The line used to be `<Num>{t('common.seconds', { count })}</Num>`, which forced the whole
  // string — Telugu unit included — through Inter and drew the unit as tofu boxes.
  it('splits the time-on-question line: digits in Inter, the unit in the Telugu face', async () => {
    await render(<AttemptView {...props} />);
    const line = within(screen.getByTestId('time-on-question'));

    expect(line.getByText(iso(String(DEMO_ELAPSED_SEC)))).toHaveStyle({
      fontFamily: 'Inter_400Regular',
    });
    expect(line.getByText(` ${te.common.unitS}`)).toHaveStyle({
      fontFamily: 'NotoSansTelugu_400Regular',
    });
    // The flat string is still what a screen reader announces.
    expect(screen.getByLabelText(`${DEMO_ELAPSED_SEC} ${te.common.unitS}`)).toBeOnTheScreen();
  });
});
