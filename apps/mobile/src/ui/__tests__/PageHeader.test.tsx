import { act, render, screen } from '@testing-library/react-native';
import { initI18n, setLanguage } from '@tslprb/i18n';
import { Text as RNText } from 'react-native';

import { PageHeader } from '../PageHeader';
import { Pill } from '../Pill';

describe('PageHeader', () => {
  beforeAll(() => {
    initI18n('en');
  });

  it('sets the title in the display face and names it with the screen’s own ID', async () => {
    await render(<PageHeader title="Ready?" titleTestID="home-greeting" testID="header" />);
    const title = screen.getByTestId('home-greeting');
    expect(title).toHaveTextContent('Ready?');
    expect(title).toHaveStyle({ fontFamily: 'PlayfairDisplay_400Regular', fontSize: 26 });
  });

  it('draws no lockup row unless there is a brand or something beside it', async () => {
    await render(<PageHeader title="Profile" testID="header" />);
    expect(screen.queryByTestId('header-top')).toBeNull();
  });

  it('puts the lockup and its trailing slot on one row', async () => {
    await render(
      <PageHeader
        brand
        brandTestID="home-brand"
        trailing={<RNText testID="switcher">en</RNText>}
        title="Ready?"
        testID="header"
      />,
    );
    expect(screen.getByTestId('home-brand')).toBeOnTheScreen();
    expect(screen.getByTestId('switcher')).toBeOnTheScreen();
    expect(screen.getByTestId('header-top')).toHaveStyle({ justifyContent: 'space-between' });
  });

  it('pushes a lone trailing slot to the reading end', async () => {
    await render(
      <PageHeader trailing={<RNText testID="switcher">en</RNText>} title="Step" testID="header" />,
    );
    expect(screen.getByTestId('header-top')).toHaveStyle({ justifyContent: 'flex-end' });
  });

  it('takes a pill above the title and an ink3 line under it', async () => {
    await render(
      <PageHeader
        pill={<Pill label="Step" testID="step" />}
        title="Which post?"
        subtitle="You can change it later."
        subtitleTestID="sub"
        testID="header"
      />,
    );
    expect(screen.getByTestId('step')).toBeOnTheScreen();
    expect(screen.getByTestId('sub').props.className).toContain('text-ink3');
  });
});

describe('PageHeader (te)', () => {
  beforeAll(async () => {
    await act(async () => {
      await setLanguage('te');
    });
  });

  afterAll(async () => {
    await act(async () => {
      await setLanguage('en');
    });
  });

  // Playfair has no Telugu: the display role falls to Noto Serif Telugu 700 on a 1.5 line.
  it('sets the Telugu title in the Telugu serif', async () => {
    await render(<PageHeader title="ప్రొఫైల్" titleTestID="title" />);
    expect(screen.getByTestId('title')).toHaveStyle({
      fontFamily: 'NotoSerifTelugu_700Bold',
      fontSize: 26,
      lineHeight: 39,
    });
  });
});
