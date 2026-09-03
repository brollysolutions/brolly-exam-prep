import { render, screen } from '@testing-library/react-native';
import { findStudyTopic } from '@tslprb/fixtures';
import { initI18n } from '@tslprb/i18n';

import { useLangStore } from '@/data/lang';

import { TopicView } from '../TopicView';

const FOUND = findStudyTopic('st-tg-statehood');

describe('TopicView (ur)', () => {
  beforeAll(() => {
    useLangStore.setState({ lang: 'ur' });
    initI18n('ur');
  });

  it('mirrors the header and the block accents, and matches the snapshot', async () => {
    await render(
      <TopicView
        topic={FOUND?.topic}
        section={FOUND?.section}
        lang="ur"
        onLang={() => {}}
        onBack={() => {}}
        onMarkRead={() => {}}
        onPractise={() => {}}
      />,
    );

    expect(screen.getByTestId('topic-header')).toHaveStyle({ flexDirection: 'row-reverse' });
    // The 3 px accent is a physical border resolved from `useDir()`, so in Urdu it moves to
    // the right edge — `borderStartWidth` would have followed `I18nManager` instead.
    expect(screen.getByTestId('study-block-example')).toHaveStyle({ borderRightWidth: 3 });
    expect(screen.getByTestId('study-block-example')).not.toHaveStyle({ borderLeftWidth: 3 });
    expect(screen.getByTestId('study-block-tip')).toHaveStyle({ borderRightWidth: 3 });
    // Urdu copy from the fixture, not a fallback to English.
    expect(screen.getByText('تحریکِ ریاست اور تشکیل')).toBeOnTheScreen();
    expect(screen.toJSON()).toMatchSnapshot();
  });
});
