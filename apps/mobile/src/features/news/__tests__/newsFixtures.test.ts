import {
  AFFAIRS,
  latestAffairs,
  latestNotices,
  NOTICES,
  type AffairCategory,
  type Localized,
  type NoticeKind,
} from '@tslprb/fixtures';
import { en } from '@tslprb/i18n';

import { isIsoDay } from '../format';

const LANGS = ['en', 'te', 'ur'] as const;

const KINDS: NoticeKind[] = ['notification', 'admitCard', 'examDate', 'result', 'pet'];
const CATEGORIES: AffairCategory[] = ['india', 'telangana', 'world', 'sports', 'awards'];

/** The value a dotted i18n path resolves to in `en.json`, or `undefined`. */
const lookup = (key: string): unknown =>
  key
    .split('.')
    .reduce<unknown>((o, part) => (o as Record<string, unknown> | undefined)?.[part], en);

/** Every language of a localised string is present and not blank. */
function expectAllLanguages(text: Localized) {
  for (const lang of LANGS) {
    expect(typeof text[lang]).toBe('string');
    expect(text[lang].trim().length).toBeGreaterThan(0);
  }
}

describe('notice fixtures', () => {
  it('seeds one full recruitment cycle', () => {
    expect(NOTICES).toHaveLength(6);
    const ids = NOTICES.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  // The chip on the row is the whole point of `kind`: a candidate scans for "Hall ticket"
  // without reading a word of the notice. Every kind has to be exercised by the seed data,
  // or a chip ships that nobody has ever seen rendered.
  it('exercises every kind of notice', () => {
    const kinds = new Set(NOTICES.map((n) => n.kind));
    for (const kind of KINDS) expect(kinds).toContain(kind);
  });

  it('dates every notice as a real calendar day in the 2026 cycle', () => {
    for (const notice of NOTICES) {
      expect(isIsoDay(notice.date)).toBe(true);
      expect(notice.date >= '2026-08-01' && notice.date <= '2026-10-31').toBe(true);
    }
  });

  it.each(NOTICES.map((n) => [n.id, n] as const))(
    '%s is written in all three languages',
    (_id, notice) => {
      expectAllLanguages(notice.title);
      expectAllLanguages(notice.body);
    },
  );

  it('links only to the Board, over https', () => {
    const linked = NOTICES.filter((n) => n.link !== undefined);
    expect(linked.length).toBeGreaterThan(0);
    // Not every notice has somewhere to go: the link row must be optional in practice, not
    // just in the type, or the view's "no link" branch is never rendered.
    expect(linked.length).toBeLessThan(NOTICES.length);
    for (const notice of linked) expect(notice.link).toMatch(/^https:\/\/(www\.)?tslprb\.in/);
  });

  it('labels every kind with a key the locale files actually hold', () => {
    for (const kind of KINDS) expect(typeof lookup(`updates.kind.${kind}`)).toBe('string');
  });

  it('returns the newest notices first', () => {
    const all = latestNotices();
    expect(all).toHaveLength(NOTICES.length);
    const dates = all.map((n) => n.date);
    expect([...dates].sort().reverse()).toEqual(dates);
    expect(all[0].date).toBe('2026-10-24');
    expect(all[all.length - 1].date).toBe('2026-08-04');
  });

  it('takes only as many as it was asked for, and never mutates the seed', () => {
    expect(latestNotices(3).map((n) => n.id)).toEqual([
      'nt-2026-pmt-pet',
      'nt-2026-hall-ticket',
      'nt-2026-exam-date',
    ]);
    expect(latestNotices(0)).toEqual([]);
    expect(latestNotices(-1)).toEqual([]);
    expect(latestNotices(99)).toHaveLength(NOTICES.length);
    // The sort is on a copy: the exported array keeps the order the file declares.
    expect(NOTICES[0].id).toBe('nt-2026-notification');
  });
});

describe('current-affairs fixtures', () => {
  it('seeds ten items with unique ids', () => {
    expect(AFFAIRS).toHaveLength(10);
    const ids = AFFAIRS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('covers every category', () => {
    const categories = new Set(AFFAIRS.map((a) => a.category));
    for (const category of CATEGORIES) expect(categories).toContain(category);
  });

  it('dates every item as a real calendar day', () => {
    for (const affair of AFFAIRS) expect(isIsoDay(affair.date)).toBe(true);
  });

  // The screen groups by day, so a feed of ten distinct days would never render a group with
  // more than one card in it and the grouping would go untested by the fixtures.
  it('puts several items on the same day, over more than one day', () => {
    const days = AFFAIRS.map((a) => a.date);
    const unique = new Set(days);
    expect(unique.size).toBeGreaterThan(1);
    expect(unique.size).toBeLessThan(days.length);
  });

  it.each(AFFAIRS.map((a) => [a.id, a] as const))(
    '%s is written in all three languages',
    (_id, affair) => {
      expectAllLanguages(affair.headline);
      expectAllLanguages(affair.summary);
    },
  );

  it('labels every category with a key the locale files actually hold', () => {
    for (const category of CATEGORIES) {
      expect(typeof lookup(`affairs.cat.${category}`)).toBe('string');
    }
  });

  it('returns the newest items first, same-day order preserved', () => {
    const all = latestAffairs();
    expect(all).toHaveLength(AFFAIRS.length);
    const dates = all.map((a) => a.date);
    expect([...dates].sort().reverse()).toEqual(dates);
    expect(all.slice(0, 4).map((a) => a.id)).toEqual([
      'af-metro-corridor',
      'af-rural-roads',
      'af-inter-district-final',
      'af-short-film-prize',
    ]);
  });

  it('takes only as many as it was asked for, and never mutates the seed', () => {
    expect(latestAffairs(3)).toHaveLength(3);
    expect(latestAffairs(0)).toEqual([]);
    expect(latestAffairs(99)).toHaveLength(AFFAIRS.length);
    expect(AFFAIRS[0].id).toBe('af-metro-corridor');
  });
});
