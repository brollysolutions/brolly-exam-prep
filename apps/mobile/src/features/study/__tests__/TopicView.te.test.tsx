import { render, screen } from '@testing-library/react-native';
import { findStudyTopic } from '@tslprb/fixtures';
import { initI18n } from '@tslprb/i18n';

import { useLangStore } from '@/data/lang';

import { TopicView } from '../TopicView';

const FOUND = findStudyTopic('st-tg-statehood');

describe('TopicView (te)', () => {
  beforeAll(() => {
    useLangStore.setState({ lang: 'te' });
    initI18n('te');
  });

  it('sets the page in the Telugu face, keeps the block accents on the left, and matches the snapshot', async () => {
    await render(
      <TopicView
        topic={FOUND?.topic}
        section={FOUND?.section}
        lang="te"
        onLang={() => {}}
        onBack={() => {}}
        onMarkRead={() => {}}
        onPractise={() => {}}
      />,
    );

    expect(screen.getByTestId('topic-header')).toHaveStyle({ flexDirection: 'row' });
    // The 3 px accent is a physical border resolved from `useDir()`: the left edge here, and
    // it would move to the right under an RTL language without any screen change.
    expect(screen.getByTestId('study-block-example')).toHaveStyle({ borderLeftWidth: 3 });
    expect(screen.getByTestId('study-block-example')).not.toHaveStyle({ borderRightWidth: 3 });
    expect(screen.getByTestId('study-block-tip')).toHaveStyle({ borderLeftWidth: 3 });
    // Telugu copy from the fixture, not a fallback to English.
    const title = FOUND!.topic.title;
    expect(title.te).not.toBe(title.en);
    expect(screen.getByText(title.te)).toHaveStyle({ fontFamily: 'NotoSansTelugu_600SemiBold' });
    expect(screen.toJSON()).toMatchSnapshot();
  });
});
