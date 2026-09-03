import { render, screen, userEvent } from '@testing-library/react-native';
import { findStudyTopic } from '@tslprb/fixtures';
import { initI18n } from '@tslprb/i18n';

import { iso } from '@/ui';

import { TopicView } from '../TopicView';

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

  it('accents the example in hi-vis and the tip in sand, on the reading-start side', async () => {
    await render(<TopicView {...props()} />);
    expect(screen.getByTestId('study-block-example')).toHaveStyle({ borderLeftWidth: 3 });
    expect(screen.getByTestId('study-block-tip')).toHaveStyle({ borderLeftWidth: 3 });
    // Two different accents, so the reader can tell the worked answer from the advice.
    expect(screen.getByTestId('study-block-example')).not.toHaveStyle(
      screen.getByTestId('study-block-tip').props.style,
    );
  });

  it('reads the formula in the page own script, with the maths isolated', async () => {
    const p = props();
    const view = await render(<TopicView {...p} />);
    expect(screen.getByTestId('study-block-formula')).toHaveTextContent(/Speed = Distance ÷ Time/);

    // The words are translated — only the symbols and digits stay Latin.
    await view.rerender(<TopicView {...p} lang="te" />);
    expect(screen.getByTestId('study-block-formula')).toHaveTextContent(/వేగం = దూరం ÷ సమయం/);

    // And each Urdu maths run carries its own LRI…PDI, so `18/5` cannot re-order in the line.
    await view.rerender(<TopicView {...p} lang="ur" />);
    const urdu = screen.getByTestId('study-block-formula');
    expect(urdu).toHaveTextContent(/رفتار = فاصلہ ÷ وقت/);
    expect(urdu).toHaveTextContent(new RegExp(iso('× 18/5')));
  });

  it('offers to mark the topic read, and swaps the button for a badge once it is', async () => {
    const p = props();
    const view = await render(<TopicView {...p} />);
    await userEvent.press(screen.getByTestId('topic-mark-read'));
    expect(p.onMarkRead).toHaveBeenCalledTimes(1);

    await view.rerender(<TopicView {...p} read />);
    expect(screen.queryByTestId('topic-mark-read')).toBeNull();
    expect(screen.getByTestId('topic-read')).toHaveTextContent(/✓Read/);
  });

  it('sends the reader on to the drills for the section', async () => {
    const p = props();
    await render(<TopicView {...p} />);
    await userEvent.press(screen.getByTestId('topic-practise'));
    expect(p.onPractise).toHaveBeenCalledTimes(1);
  });

  // Hi-vis follows what is still to do: mark-read while there is reading left, then the drills.
  it('hands the hi-vis to the drills once the topic is read', async () => {
    const p = props();
    const view = await render(<TopicView {...p} />);
    expect(screen.getByTestId('topic-mark-read').props.className).toContain('bg-hivis');
    expect(screen.getByTestId('topic-practise').props.className).not.toContain('bg-hivis');

    await view.rerender(<TopicView {...p} read />);
    expect(screen.getByTestId('topic-practise').props.className).toContain('bg-hivis');
  });

  it('switches the reading language from the header', async () => {
    const p = props();
    await render(<TopicView {...p} />);
    await userEvent.press(screen.getByLabelText('తె'));
    expect(p.onLang).toHaveBeenCalledWith('te');
  });

  it('goes back from the back row', async () => {
    const p = props();
    await render(<TopicView {...p} />);
    await userEvent.press(screen.getByTestId('topic-back'));
    expect(p.onBack).toHaveBeenCalledTimes(1);
  });

  it('says so, and offers a way out, when the id is not in the shelf', async () => {
    const p = { ...props(), topic: undefined, section: undefined };
    await render(<TopicView {...p} />);
    expect(screen.getByTestId('topic-not-found')).toHaveTextContent(
      /That topic is not in the study material./,
    );
    expect(screen.queryByTestId('topic-mark-read')).toBeNull();
    await userEvent.press(screen.getByTestId('topic-not-found-back'));
    expect(p.onBack).toHaveBeenCalledTimes(1);
  });
});
