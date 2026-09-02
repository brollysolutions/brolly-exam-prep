import { render, screen, userEvent } from '@testing-library/react-native';
import { initI18n } from '@tslprb/i18n';

import {
  DEMO_ATTEMPT,
  DEMO_ELAPSED_SEC,
  DEMO_PAPER,
  DEMO_REMAINING_SEC,
} from '@/features/dev/sections/attemptDemo';

import { AttemptView, formatClock, type AttemptViewProps } from '../AttemptView';

/** `Num` wraps its digits in LRI…PDI isolation. */
const num = (s: string | number) => `⁦${s}⁩`;

const QUESTION = DEMO_PAPER[DEMO_ATTEMPT.current - 1];

const callbacks = () => ({
  onLangChange: jest.fn(),
  onExit: jest.fn(),
  onSectionPress: jest.fn(),
  onLockedTap: jest.fn(),
  onAnswer: jest.fn(),
  onClear: jest.fn(),
  onToggleMark: jest.fn(),
  onPrev: jest.fn(),
  onNext: jest.fn(),
  onOpenPalette: jest.fn(),
});

async function renderView(over: Partial<AttemptViewProps> = {}) {
  const cb = callbacks();
  const props: AttemptViewProps = {
    attempt: DEMO_ATTEMPT,
    question: QUESTION,
    remainingSec: DEMO_REMAINING_SEC,
    elapsedSec: DEMO_ELAPSED_SEC,
    lang: 'en',
    ...cb,
    ...over,
  };
  await render(<AttemptView {...props} />);
  return cb;
}

describe('AttemptView', () => {
  beforeAll(() => {
    initI18n('en');
  });

  it('formats the deadline as mm:ss', () => {
    expect(formatClock(3504)).toBe('58:24');
    expect(formatClock(0)).toBe('00:00');
    expect(formatClock(59)).toBe('00:59');
  });

  it('renders the question and its four options', async () => {
    await renderView();
    expect(screen.getByTestId('question-text')).toHaveTextContent(QUESTION.text.en);
    for (let i = 0; i < 4; i += 1) {
      expect(screen.getByTestId(`option-${i}`)).toBeOnTheScreen();
      expect(screen.getByText(QUESTION.options.en[i])).toBeOnTheScreen();
    }
  });

  it('reports the chosen option to onAnswer', async () => {
    const cb = await renderView();
    await userEvent.press(screen.getByTestId('option-3'));
    expect(cb.onAnswer).toHaveBeenCalledWith(3);
  });

  it('routes a locked section tab to onLockedTap and an open one to onSectionPress', async () => {
    const cb = await renderView();
    await userEvent.press(screen.getByTestId('section-chip-3'));
    expect(cb.onLockedTap).toHaveBeenCalledWith(3);
    expect(cb.onSectionPress).not.toHaveBeenCalled();

    await userEvent.press(screen.getByTestId('section-chip-0'));
    expect(cb.onSectionPress).toHaveBeenCalledWith(0);
  });

  it('shows 58:24 for the demo deadline', async () => {
    await renderView();
    expect(screen.getByTestId('timer-value')).toHaveTextContent(num('58:24'));
  });

  it('shows "No negative marking" for the free mock', async () => {
    await renderView();
    expect(screen.getByTestId('marks-chip')).toHaveTextContent('No negative marking');
  });

  it('shows the marked chip and the unmark label on a marked question', async () => {
    await renderView({ attempt: { ...DEMO_ATTEMPT, current: 8 } });
    expect(screen.getByTestId('marked-chip')).toBeOnTheScreen();
    expect(screen.getByTestId('btn-mark')).toHaveTextContent('Remove mark');
  });

  it('shows the answered / total tally on the palette button', async () => {
    await renderView();
    expect(screen.getByTestId('btn-palette')).toHaveTextContent(`Questions${num('8 / 40')}`);
  });

  it('wires exit, clear, mark, prev, next and palette to their callbacks', async () => {
    const cb = await renderView();
    const wiring = [
      ['btn-exit', cb.onExit],
      ['btn-clear', cb.onClear],
      ['btn-mark', cb.onToggleMark],
      ['btn-prev', cb.onPrev],
      ['btn-next', cb.onNext],
      ['btn-palette', cb.onOpenPalette],
    ] as const;
    for (const [testID, fn] of wiring) {
      await userEvent.press(screen.getByTestId(testID));
      expect(fn).toHaveBeenCalledTimes(1);
    }
  });

  it('renders nothing but an empty question stem before the paper loads', async () => {
    await renderView({ question: undefined });
    expect(screen.getByTestId('question-text')).toHaveTextContent('');
    expect(screen.queryByTestId('option-0')).toBeNull();
  });

  it('switches question and options with the language prop', async () => {
    await renderView({ lang: 'te' });
    expect(screen.getByTestId('question-text')).toHaveTextContent(QUESTION.text.te);
    expect(screen.getByText(QUESTION.options.te[0])).toBeOnTheScreen();
  });
});
