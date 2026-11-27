import { beforeEach, describe, expect, it, vi } from 'vitest';

// in-memory localStorage before the store module reads it
vi.hoisted(() => {
  const m = new Map<string, string>();
  const ls = {
    getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, String(v)); },
    removeItem: (k: string) => { m.delete(k); }, clear: () => m.clear(), key: () => null, get length() { return m.size; },
  };
  Object.defineProperty(globalThis, 'localStorage', { value: ls, configurable: true });
});

vi.mock('./airing', () => ({
  anime: vi.fn(), animeSequels: vi.fn(), series: vi.fn(), sleep: () => Promise.resolve(),
}));
vi.mock('./worker', () => ({ workerFetch: vi.fn() }));

import * as Airing from './airing';
import { workerFetch } from './worker';
import { showsNew } from './items';
import { store } from './store';
import { checkChapters, checkEpisodes } from './watch';

const anime = vi.mocked(Airing.anime), sequels = vi.mocked(Airing.animeSequels), series = vi.mocked(Airing.series), worker = vi.mocked(workerFetch);
const airing = (aired: number, status = 'RELEASING') => ({ status, episodes: 12, aired, start: '2026-10-01', next: null, schedule: [] });

beforeEach(() => {
  store.clear();
  localStorage.clear();
  vi.resetAllMocks();
  sequels.mockResolvedValue(new Map());
});

describe('episode check', () => {
  it('finds new anime episodes and marks the item as new', async () => {
    const it0 = store.add({ type: 'anime', title: 'Frieren', status: 'active', seasonList: [{ id: 's1', anilistId: 7, episodes: 12, seen: 3, aired: 3, airing: 'RELEASING' }] });
    anime.mockResolvedValue(new Map([[7, airing(5)]]));
    const r = await checkEpisodes({ force: true });
    expect(r.news.map(n => n.text)).toEqual(['Episodes 4–5 are out']);
    const it = store.get(it0.id)!;
    expect(it.seasonList![0].aired).toBe(5);
    expect(it.seasonList![0].newAt).toBeTruthy();
    expect(it.newEpisodeAt).toBeTruthy();
    expect(showsNew(it)).toBe(true);
  });

  it('says nothing on the first check of a season with no known count', async () => {
    store.add({ type: 'anime', title: 'A', status: 'active', seasonList: [{ id: 's1', anilistId: 7, episodes: 12, seen: 0 }] });
    anime.mockResolvedValue(new Map([[7, airing(5)]]));
    expect((await checkEpisodes({ force: true })).news).toEqual([]);
  });

  it('skips dropped shows', async () => {
    store.add({ type: 'anime', title: 'Dropped', status: 'dropped', seasonList: [{ id: 's1', anilistId: 7, aired: 1 }] });
    anime.mockResolvedValue(new Map([[7, airing(5)]]));
    expect((await checkEpisodes({ force: true })).news).toEqual([]);
    expect(anime).not.toHaveBeenCalled();
  });

  it('adds an announced sequel, but not one the user removed', async () => {
    const seq = { anilistId: 9, title: 'S2', format: 'TV', episodes: null, year: 2027, start: '2027-01-10', airing: 'NOT_YET_RELEASED', cover: '' };
    const a = store.add({ type: 'anime', title: 'A', status: 'active', seasonList: [{ id: 's1', anilistId: 7, aired: 12, airing: 'FINISHED' }] });
    const b = store.add({ type: 'anime', title: 'B', status: 'active', removedSeasons: [19], seasonList: [{ id: 's1', anilistId: 17, aired: 12, airing: 'FINISHED' }] });
    sequels.mockResolvedValue(new Map([[7, [seq]], [17, [{ ...seq, anilistId: 19 }]]]));
    anime.mockResolvedValue(new Map());
    const r = await checkEpisodes({ force: true });
    expect(r.news).toHaveLength(1);
    expect(r.news[0].text).toMatch(/^New season announced · from/);
    expect(store.get(a.id)!.seasonList).toHaveLength(2);
    expect(store.get(b.id)!.seasonList).toHaveLength(1);
  });

  it('finds new series episodes from TVmaze', async () => {
    store.add({ type: 'series', title: 'Show', status: 'active', external: 'tvmaze:1', seasonList: [{ id: 's1', tvmazeId: 100, episodes: 10, seen: 4, aired: 4 }] });
    series.mockResolvedValue({ status: 'Running', seasons: [{ tvmazeId: 100, number: 1, name: '', premiere: '2026-10-01', episodes: 10, aired: 5, cover: '' }], upcoming: [] });
    const r = await checkEpisodes({ force: true });
    expect(r.news.map(n => n.text)).toEqual(['New episode · Season 1, episode 5']);
  });

  it('waits 3 hours between unforced checks', async () => {
    store.add({ type: 'anime', title: 'A', status: 'active', seasonList: [{ id: 's1', anilistId: 7, aired: 1 }] });
    anime.mockResolvedValue(new Map([[7, airing(1)]]));
    await checkEpisodes();
    await checkEpisodes();
    expect(anime).toHaveBeenCalledTimes(1);
  });
});

describe('chapter check', () => {
  it('raises the chapter count and reports it', async () => {
    const m = store.add({ type: 'manga', title: 'Berserk', status: 'active', mangadexId: 'md1', chapters: 370, chaptersRead: 370 });
    worker.mockResolvedValue({ series: { md1: { latest: 372, status: 'ongoing' } } });
    const r = await checkChapters({ force: true });
    expect(r.news.map(n => n.text)).toEqual(['Chapters 371–372 are out']);
    expect(store.get(m.id)!.chapters).toBe(372);
    expect(showsNew(store.get(m.id)!)).toBe(true);
  });

  it('passes the worker error on (no sync key)', async () => {
    store.add({ type: 'manga', title: 'M', status: 'active', mangadexId: 'md1' });
    worker.mockRejectedValue(Object.assign(new Error('key'), { code: 'key_required' }));
    expect((await checkChapters({ force: true })).error).toBe('key_required');
  });
});
