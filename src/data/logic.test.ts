import { describe, expect, it } from 'vitest';
import { generate, levelFromPoints, parse, progress, syncPlatinum } from './trophies';
import { merge } from './sync';
import { episodesBehind, mangaBehind, mediaProgress, parseHours, plusOneLabel, relabel, releaseInfo, seasonTotals, seasonsOf } from './items';
import type { Item, Season, Trophy } from './types';

const T = (tier: Trophy['tier'], done = false, dlc?: boolean): Trophy => ({ id: Math.random().toString(36), name: tier, desc: '', tier, done, dlc });
const item = (p: Partial<Item>): Item => ({ id: 'i', type: 'anime', title: 'X', status: 'active', addedAt: '2026-01-01', updatedAt: '2026-01-01', ...p });

describe('trophies', () => {
  it('earns platinum when every non-DLC trophy is done, and loses it again', () => {
    const list = [T('platinum'), T('gold', true), T('bronze', true), T('silver', false, true)];
    expect(syncPlatinum(list)).toBe('earned');
    expect(list[0].done).toBe(true);
    list[1].done = false;
    expect(syncPlatinum(list)).toBe('lost');
    expect(syncPlatinum([T('gold')])).toBeNull();
  });

  it('counts points and progress', () => {
    const p = progress([T('platinum', true), T('gold', true), T('bronze')]);
    expect(p.pts).toBe(390);
    expect(p.max).toBe(405);
    expect(p.counts.gold).toEqual([1, 1]);
    expect(p.done).toBe(2);
  });

  it('levels up at 100, then 140 more', () => {
    expect(levelFromPoints(0).level).toBe(1);
    expect(levelFromPoints(100).level).toBe(2);
    expect(levelFromPoints(239).level).toBe(2);
    expect(levelFromPoints(240).level).toBe(3);
  });

  it('generates the same list for the same game, platinum first', () => {
    const a = generate('Hollow Knight', 'platformer');
    const b = generate('Hollow Knight', 'platformer');
    expect(a.map(t => t.name)).toEqual(b.map(t => t.name));
    expect(a).toHaveLength(13);
    expect(a[0].tier).toBe('platinum');
  });

  it('parses a pasted own-format list and a PSNProfiles-style block', () => {
    const own = parse('Big Win | Win it all | Gold\nSmall Win | Win once | 45.2%');
    expect(own.map(t => [t.name, t.tier])).toEqual([['Big Win', 'gold'], ['Small Win', 'bronze']]);
    const block = parse('Platinum\nMaster\nGet all trophies\nFirst Steps\nStart the game\nUnlocked 3 Jan 2025\n3.1%');
    expect(block[0]).toMatchObject({ name: 'Master', tier: 'platinum' });
    expect(block[1]).toMatchObject({ name: 'First Steps', done: true, rarity: 3.1, tier: 'gold' });
  });
});

describe('sync merge', () => {
  const it1 = (id: string, updatedAt: string, title = id) => item({ id, updatedAt, title });
  it('keeps the newer copy of each item', () => {
    const m = merge({ items: [it1('a', '2026-02-01', 'local')], deleted: [] }, { items: [it1('a', '2026-01-01', 'remote')], deleted: [] });
    expect(m.items[0].title).toBe('local');
  });
  it('deletion wins over older copies, newer edits win over deletion', () => {
    const m = merge(
      { items: [it1('a', '2026-01-01'), it1('b', '2026-03-01')], deleted: [] },
      { items: [], deleted: [{ id: 'a', at: '2026-02-01' }, { id: 'b', at: '2026-02-01' }] },
    );
    expect(m.items.map(i => i.id)).toEqual(['b']);
    expect(m.deleted.map(d => d.id)).toEqual(['a']);
  });
});

describe('seasons and progress', () => {
  it('renames Nightshelf labels to English and keeps own names', () => {
    const list: Season[] = [{ id: '1', label: 'Staffel 1' }, { id: '2', label: 'Final Act' }, { id: '3', label: 'Film', format: 'MOVIE' }];
    expect(relabel(list).map(x => x.label)).toEqual(['Season 1', 'Final Act', 'Movie']);
  });

  it('builds implicit seasons for series without a list', () => {
    const s = seasonsOf(item({ type: 'series', seasons: 3, seasonSeen: 1 }));
    expect(s.map(x => x.complete)).toEqual([true, false, false]);
  });

  it('totals episodes only when all are known', () => {
    expect(seasonTotals([{ id: '1', episodes: 12, seen: 12 }, { id: '2', episodes: 10, seen: 3 }])).toEqual({ episodes: 22, episodesSeen: 15 });
    expect(seasonTotals([{ id: '1', episodes: 12 }, { id: '2' }]).episodes).toBe(12);
  });

  it('counts new episodes of started running seasons', () => {
    const it = item({ seasonList: [{ id: '1', episodes: 12, aired: 8, seen: 5, airing: 'RELEASING' }, { id: '2', episodes: 12, aired: 0, seen: 0 }] });
    expect(episodesBehind(it)).toBe(3);
    expect(mediaProgress(it)).toBeCloseTo(5 / 8);
    expect(plusOneLabel(it)).toBe('Episode');
  });

  it('counts chapters behind for manga', () => {
    expect(mangaBehind(item({ type: 'manga', chapters: 120, chaptersRead: 100 }))).toBe(20);
    expect(mangaBehind(item({ type: 'manga', chapters: null }))).toBe(0);
  });

  it('knows when something is not out yet', () => {
    const next = `${new Date().getFullYear() + 1}-06-01`;
    expect(releaseInfo(item({ type: 'movie', released: next }))).toEqual({ date: next });
    expect(releaseInfo(item({ type: 'movie', released: '2020-01-01' }))).toBeNull();
  });

  it('parses hours in several spellings', () => {
    expect(parseHours('12,5')).toBe(12.5);
    expect(parseHours('3 h')).toBe(3);
    expect(parseHours('')).toBeNull();
    expect(parseHours('abc')).toBeUndefined();
  });
});
