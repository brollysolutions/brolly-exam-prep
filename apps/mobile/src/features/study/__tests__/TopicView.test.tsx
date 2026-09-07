import { Ionicons } from '@expo/vector-icons';
import { render, screen, userEvent, within } from '@testing-library/react-native';
import { colors } from '@tslprb/design-tokens';
import { findStudyTopic } from '@tslprb/fixtures';
import { initI18n } from '@tslprb/i18n';

import { iso } from '@/ui';

import { TopicView } from '../TopicView';

/** The icon host is the glyph's Text: a name resolves to a code point in the icon font. */
const CHECK_GLYPH = String.fromCodePoint(Ionicons.glyphMap['checkmark-circle'] as number);

const FOUND = findStudyTopic('st-ar-speed');

const props = () => ({
  topic: FOUND?.topic,
  section: FOUND?.section,
  lang: 'en' as const,
  onLang: jest.fn(),
  onBack: jest.fn(),
  onMarkRead: jest.fn(),
  onPractise: jest.fn(),
});

describe('TopicView', () => {
  beforeAll(() => {
    initI18n('en');
  });

  it('heads the page with the section, the title and the reading time', async () => {
    await render(<TopicView {...props()} />);
    expect(screen.getByText('Arithmetic')).toBeOnTheScreen();
    expect(screen.getByText('Time, speed and distance')).toBeOnTheScreen();
    expect(screen.getByTestId('topic-minutes')).toHaveTextContent(`${iso(10)}min`);
  });

  it('renders every kind of block the topic carries', async () => {
    await render(<TopicView {...props()} />);
    expect(screen.getByTestId('study-block-heading')).toBeOnTheScreen();
    expect(screen.getAllByTestId('study-block-para').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByTestId('study-block-bullets')).toBeOnTheScreen();
    expect(screen.getByTestId('study-block-formula')).toBeOnTheScreen();
    expect(screen.getByTestId('study-block-example')).toBeOnTheScreen();
    expect(screen.getByTestId('study-block-tip')).toBeOnTheScreen();
    expect(screen.getByTestId('study-block-example')).toHaveTextContent(/Worked example/);
    expect(screen.getByTestId('study-block-tip')).toHaveTextContent(/Exam tip/);
  });

  // F-30: the worked example is the one gold-edged card on the page (`accentStrong`, 3.4:1 —
  // the edge token, not the gold text one) and the exam tip is a quiet `surface2` inset with
  // no edge at all. Phase A had both on the same `#856a22` bar, told apart only by their label.
  it('gives the worked example the page own gold edge, and the tip none', async () => {
    await render(<TopicView {...props()} />);
    expect(screen.getByTestId('study-block-example')).toHaveStyle({
      borderLeftWidth: 3,
      borderLeftColor: colors.accentStrong,
    });
    const tip = screen.getByTestId('study-block-tip');
    expect(tip).not.toHaveStyle({ borderLeftWidth: 3 });
    expect(tip.props.className).toMatch(/\bbg-surface2\b/);
  });

  // The three blocks that step out of the prose start their text on ONE axis. The example is a
  // `Card`, so its content sits 17 px in — 16 px of padding behind a 1 px `line`, with the gold
  // edge compensated by the card itself — and the two borderless boxes pad to 17 to match.
  // `p-4` on them left a pixel, and the formula's `px-3` left four (design review D8).
  it('starts the example, the tip and the formula on the same text axis', async () => {
    await render(<TopicView {...props()} />);
    const example = screen.getByTestId('study-block-example');
    const exampleInset =
      (example.props.style.borderLeftWidth as number) + (example.props.style.paddingLeft as number);
    expect(exampleInset).toBe(17);
    for (const id of ['study-block-tip', 'study-block-formula']) {
      expect(screen.getByTestId(id).props.className).toMatch(/p-\[17px\]/);
      expect(screen.getByTestId(id).props.className).not.toMatch(/\bpx-3\b/);
    }
  });

  // A block head inside the prose is a `Pill`, not a 10.5 px `Kicker`: `ink3` below caption
  // size is under the floor the rules set for it (design review A2/D5).
  it('heads a prose block with a quiet pill rather than a sub-caption kicker', async () => {
    await render(<TopicView {...props()} />);
    const head = screen.getByTestId('study-block-heading');
    expect(head.props.className).toMatch(/\brounded-full\b/);
    expect(head.props.className).toMatch(/\bbg-surface2\b/);
  });

  it('reads the formula in the page own script, with the maths isolated', async () => {
    const p = props();
    const view = await render(<TopicView {...p} />);
    expect(screen.getByTestId('study-block-formula')).toHaveTextContent(/Speed = Distance ÷ Time/);

    // The words are translated — only the symbols and digits stay Latin.
    await view.rerender(<TopicView {...p} lang="te" />);
    const telugu = screen.getByTestId('study-block-formula');
    expect(telugu).toHaveTextContent(/వేగం = దూరం ÷ సమయం/);
    expect(telugu).toHaveTextContent(/× 18\/5/);
  });

  it('offers to mark the topic read, and swaps the button for a badge once it is', async () => {
    const p = props();
    const view = await render(<TopicView {...p} />);
    await userEvent.press(screen.getByTestId('topic-mark-read'));
    expect(p.onMarkRead).toHaveBeenCalledTimes(1);

    await view.rerender(<TopicView {...p} read />);
    expect(screen.queryByTestId('topic-mark-read')).toBeNull();
    // A quiet pill behind the same ink check the shelf ticks a read topic with.
    const badge = screen.getByTestId('topic-read');
    expect(badge).toHaveTextContent(/Read$/);
    expect(badge.props.className).toMatch(/\bbg-surface2\b/);
    expect(within(badge).getByText(CHECK_GLYPH, { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it('sends the reader on to the drills for the section', async () => {
    const p = props();
    await render(<TopicView {...p} />);
    await userEvent.press(screen.getByTestId('topic-practise'));
    expect(p.onPractise).toHaveBeenCalledTimes(1);
  });

  // The ink fill follows what is still to do: mark-read while there is reading left, then the drills.
  it('hands the primary fill to the drills once the topic is read', async () => {
    const p = props();
    const view = await render(<TopicView {...p} />);
    expect(screen.getByTestId('topic-mark-read').props.className).toMatch(/\bbg-ink\b/);
    expect(screen.getByTestId('topic-practise').props.className).not.toMatch(/\bbg-ink\b/);

    await view.rerender(<TopicView {...p} read />);
    expect(screen.getByTestId('topic-practise').props.className).toMatch(/\bbg-ink\b/);
  });

  it('switches the reading language from the header', async () => {
    const p = props();
    await render(<TopicView {...p} />);
    await userEvent.press(screen.getByLabelText('తె'));
    expect(p.onLang).toHaveBeenCalledWith('te');
  });

  // Phase E (F-32, D17): the topic reader wears the same leaf bar as Paper, Updates, Affairs,
  // Eligibility, Result and Solutions — `surface` under a `line`, a 48 px chevron target and
  // the language switcher in the trailing slot. The bar carries NO title: the topic's own
  // title is a display-face line in the body that is allowed to wrap to two.
  it('goes back from the leaf bar, which carries no title of its own', async () => {
    const p = props();
    await render(<TopicView {...p} />);
    await userEvent.press(screen.getByTestId('topic-header-back'));
    expect(p.onBack).toHaveBeenCalledTimes(1);
    // The one title on the screen, in the display face, inside the scroller.
    expect(screen.getAllByText(FOUND!.topic.title.en)).toHaveLength(1);
    expect(screen.getByTestId('topic-lang')).toBeOnTheScreen();
  });

  it('says so, and offers a way out, when the id is not in the shelf', async () => {
    const p = { ...props(), topic: undefined, section: undefined };
    await render(<TopicView {...p} />);
    // The same red dot `LoadError` wears, so the two not-found screens read as one mechanism.
    expect(screen.getByTestId('topic-not-found-pill-dot').props.className).toMatch(
      /\bbg-dangerInk\b/,
    );
    expect(screen.getByTestId('topic-not-found')).toHaveTextContent(
      /That topic is not in the study material./,
    );
    expect(screen.queryByTestId('topic-mark-read')).toBeNull();
    await userEvent.press(screen.getByTestId('topic-not-found-back'));
    expect(p.onBack).toHaveBeenCalledTimes(1);
  });
});
