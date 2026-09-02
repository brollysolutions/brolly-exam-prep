import { parseLangParam, webLangOverride } from '../langOverride';

describe('parseLangParam', () => {
  it('reads every supported language', () => {
    expect(parseLangParam('?lang=en')).toBe('en');
    expect(parseLangParam('?lang=te')).toBe('te');
    expect(parseLangParam('?lang=ur')).toBe('ur');
  });

  it('reads the parameter wherever it sits in the query', () => {
    expect(parseLangParam('?screen=login&lang=ur')).toBe('ur');
    expect(parseLangParam('lang=te&x=1')).toBe('te');
  });

  it('ignores anything that is not one of the three languages', () => {
    expect(parseLangParam('?lang=fr')).toBeUndefined();
    expect(parseLangParam('?lang=EN')).toBeUndefined();
    expect(parseLangParam('?lang=')).toBeUndefined();
    expect(parseLangParam('?lng=te')).toBeUndefined();
    expect(parseLangParam('?post=si')).toBeUndefined();
  });

  it('ignores an empty or missing query string', () => {
    expect(parseLangParam('')).toBeUndefined();
    expect(parseLangParam(null)).toBeUndefined();
    expect(parseLangParam(undefined)).toBeUndefined();
  });
});

describe('webLangOverride', () => {
  it('is inert off the web, where there is no URL to read', () => {
    expect(webLangOverride()).toBeUndefined();
  });
});
