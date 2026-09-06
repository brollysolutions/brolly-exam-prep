import { Ionicons } from '@expo/vector-icons';
import { act, fireEvent, render, screen, userEvent, within } from '@testing-library/react-native';
import { colors, size } from '@tslprb/design-tokens';
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

/** The icon host is the glyph's Text: a name resolves to a code point in the icon font. */
const glyph = (name: keyof typeof Ionicons.glyphMap) => {
  const code = Ionicons.glyphMap[name];
  return typeof code === 'number' ? String.fromCodePoint(code) : code;
};

/** Every icon on this screen is hidden from assistive tech, so the queries have to say so. */
const hidden = { includeHiddenElements: true } as const;

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

  describe('timer colour state machine', () => {
    it('stays quiet before the attempt is armed, even at zero', async () => {
      await renderView({ remainingSec: 0, armed: false });
      expect(screen.getByTestId('timer-box')).toHaveStyle({
        backgroundColor: colors.surface2,
        borderColor: colors.line,
      });
      expect(screen.getByTestId('timer-value').props.className).toMatch(/\btext-ink\b/);
    });

    it('is quiet at 301 s', async () => {
      await renderView({ remainingSec: 301 });
      expect(screen.getByTestId('timer-box')).toHaveStyle({
        backgroundColor: colors.surface2,
        borderColor: colors.line,
      });
    });

    // Gold is the fill; ink carries the digits. `accentInk` on `accentSoft` is 3.34:1 — inside
    // AA for the 23 px numeral, under it for the label above, so neither takes it.
    it('fills soft gold under an accentStrong edge at 250 s, digits still ink', async () => {
      await renderView({ remainingSec: 250 });
      expect(screen.getByTestId('timer-box')).toHaveStyle({
        backgroundColor: colors.accentSoft,
        borderColor: colors.accentStrong,
      });
      expect(screen.getByTestId('timer-value').props.className).toMatch(/\btext-ink\b/);
    });

    // The one red: `dangerInk` with `onInk` at 5.79:1, never `danger` with cream at 2.77.
    it('fills solid dangerInk with cream digits at 47 s', async () => {
      await renderView({ remainingSec: 47 });
      expect(screen.getByTestId('timer-box')).toHaveStyle({
        backgroundColor: colors.dangerInk,
        borderColor: colors.dangerInk,
      });
      expect(screen.getByTestId('timer-value').props.className).toMatch(/\btext-onInk\b/);
    });

    it('fills gold exactly at the 300 s threshold', async () => {
      await renderView({ remainingSec: 300 });
      expect(screen.getByTestId('timer-box')).toHaveStyle({ backgroundColor: colors.accentSoft });
    });

    it('goes red, not gold, at the 60 s threshold', async () => {
      await renderView({ remainingSec: 60 });
      expect(screen.getByTestId('timer-box')).toHaveStyle({ backgroundColor: colors.dangerInk });
    });
  });

  // The critical-time signal is three static marks, not a pulsing rule: the band over the
  // header, the red timer box and the red progress fill. Nothing animates, so there is no
  // reduced-motion branch (ruling 2026-09-05, Phase D).
  describe('the critical-time signal', () => {
    it('raises a static band and turns the progress fill red inside the last minute', async () => {
      await renderView({ remainingSec: 47 });
      expect(screen.getByTestId('header-band', { includeHiddenElements: true })).toHaveStyle({
        backgroundColor: colors.dangerInk,
      });
      expect(screen.getByTestId('progress-fill').props.className).toMatch(/\bbg-dangerInk\b/);
      // The pulsing rail is gone from the screen entirely.
      expect(screen.queryByTestId('rail', { includeHiddenElements: true })).toBeNull();
    });

    it('shows neither band nor red fill above the last minute, or before the clock is armed', async () => {
      await renderView({ remainingSec: 61 });
      expect(screen.queryByTestId('header-band', { includeHiddenElements: true })).toBeNull();
      expect(screen.getByTestId('progress-fill').props.className).toMatch(/\bbg-accentStrong\b/);

      await renderView({ remainingSec: 0, armed: false });
      expect(screen.queryByTestId('header-band', { includeHiddenElements: true })).toBeNull();
    });
  });

  it('gives every option row the 58 px minimum as an object style', async () => {
    await renderView();
    const option = screen.getByTestId('option-0');
    expect(option).toHaveStyle({ minHeight: size.key });
    // Not a `style` CALLBACK: statics inside one never reach the DOM on web.
    expect(typeof option.props.style).not.toBe('function');
  });

  it('sizes the fixed footer buttons from the tokens', async () => {
    await renderView();
    expect(screen.getByTestId('btn-clear')).toHaveStyle({ width: size.clearBtn });
    expect(screen.getByTestId('btn-next')).toHaveStyle({ width: size.nextBtn });
  });

  it('shows "No negative marking" for the free mock', async () => {
    await renderView();
    expect(screen.getByTestId('marks-chip')).toHaveTextContent('No negative marking');
  });

  // Gold means the candidate's own input; the paper's marking scheme is not that, and
  // `accentInk` on the pill's `surface2` is 4.25:1 in any case. Ink rewards, red penalises.
  it('sets the marking scheme in ink and red, never in gold', async () => {
    const pattern = DEMO_ATTEMPT.pattern;
    await renderView({
      attempt: { ...DEMO_ATTEMPT, pattern: { ...pattern!, negativePerWrong: 0.25 } },
    });
    const pill = screen.getByTestId('marks-chip');
    expect(pill).toHaveTextContent(/\+1/);
    expect(pill).toHaveTextContent(/−0\.25/);
    expect(within(pill).getByText(num('+1')).props.className).toMatch(/\btext-ink\b/);
    expect(within(pill).getByText(num('−0.25')).props.className).toMatch(/\btext-dangerInk\b/);
    // The arithmetic never re-orders with the reading direction.
    expect(within(pill).getByText(num('+1')).parent).toHaveStyle({ flexDirection: 'row' });
  });

  it('shows the marked pill with a filled bookmark, and the unmark label', async () => {
    await renderView({ attempt: { ...DEMO_ATTEMPT, current: 8 } });
    const pill = screen.getByTestId('marked-chip');
    // Ink = a deliberate flag; the bookmark is filled once the flag is set.
    expect(pill.props.className).toMatch(/\bbg-ink\b/);
    expect(screen.getByTestId('marked-bookmark', hidden)).toHaveTextContent(glyph('bookmark'));
    expect(screen.getByTestId('btn-mark')).toHaveTextContent(/Remove mark/);
    expect(screen.getByTestId('btn-mark-icon', hidden)).toHaveTextContent(glyph('bookmark'));
  });

  // The Mark button toggles its icon, not its fill: a second filled control on the bar would
  // claim the rank the ink Next already holds (one ink fill per screen, every instance).
  it('keeps Mark an outline button in both states, and the bar to one ink fill', async () => {
    await renderView();
    expect(screen.getByTestId('btn-mark-icon', hidden)).toHaveTextContent(
      glyph('bookmark-outline'),
    );
    expect(String(screen.getByTestId('btn-mark').props.className)).not.toMatch(/\bbg-\w/);

    const fills = screen
      .getAllByRole('button')
      .filter((node) => /\bbg-ink\b/.test(String(node.props.className)));
    expect(fills).toHaveLength(1);
    expect(fills[0]).toHaveTextContent(/Next/);
  });

  // The lock is a mark in the chip's leading slot, not two spaces and a `⛌` concatenated
  // onto a translated label — only the Latin face carries that glyph.
  it('marks a locked section tab with the lock icon and the section name alone', async () => {
    await renderView();
    expect(screen.getByTestId('section-lock-3', hidden)).toHaveTextContent(
      glyph('lock-closed-outline'),
    );
    expect(screen.getByTestId('section-chip-3')).toHaveTextContent(/Telangana/);
    expect(screen.getByTestId('section-chip-3')).not.toHaveTextContent(/⛌/);
    expect(screen.queryByTestId('section-lock-0', hidden)).toBeNull();
    // Section tabs are pills.
    expect(screen.getByTestId('section-chip-0').props.className).toMatch(/\brounded-full\b/);
  });

  // Opacity is invisible between two creams, so every quiet control takes the `surface2` fill.
  it('fills an unselected option surface2 while held and dims the selected one', async () => {
    await renderView();
    const option = screen.getByTestId('option-1');
    expect(option.props.className).toMatch(/\bbg-surface\b/);
    await act(async () => {
      fireEvent(option, 'pressIn');
    });
    expect(screen.getByTestId('option-1').props.className).toMatch(/\bbg-surface2\b/);
    expect(screen.getByTestId('option-1')).not.toHaveStyle({ opacity: 0.85 });

    // Question 8 of the demo attempt is answered with option 1.
    await renderView({ attempt: { ...DEMO_ATTEMPT, current: 8 } });
    const chosen = screen.getByTestId(`option-${DEMO_ATTEMPT.answers[8]}`);
    expect(chosen.props.className).toMatch(/\bborder-accentStrong\b/);
    expect(chosen.props.className).toMatch(/\bbg-accentTint\b/);
    await act(async () => {
      fireEvent(chosen, 'pressIn');
    });
    expect(screen.getByTestId(`option-${DEMO_ATTEMPT.answers[8]}`)).toHaveStyle({ opacity: 0.85 });
  });

  // `surface` on `canvas` is 1.06:1, so a `line` hairline would leave four radio targets with
  // no boundary at all; `outline` is the rest border of every interactive outlined control.
  it('rests every option, and both quiet footer boxes, on the outline border', async () => {
    await renderView();
    for (let i = 0; i < 4; i += 1)
      expect(screen.getByTestId(`option-${i}`).props.className).toMatch(/\bborder-outline\b/);
    expect(screen.getByTestId('btn-prev').props.className).toMatch(/\bborder-outline\b/);
    expect(screen.getByTestId('btn-palette').props.className).toMatch(/\bborder-outline\b/);
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
