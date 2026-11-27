/**
 * Background checks for new episodes (AniList for anime, TVmaze for series) and new manga chapters
 * (MangaDex through the worker). Ported from Nightshelf `watch.jsx`: same fields, same localStorage
 * timers, so both apps can share the synced data. No UI here: callers get a list of news back.
 */
import * as Airing from './airing';
import { lastShow, saveSeasons, seasonsOf } from './items';
import { store, uid } from './store';
import type { Item, Season, Upcoming } from './types';
import { workerFetch } from './worker';

export interface News { item: Item; kind: 'ep' | 'season' | 'chapter'; text: string }
export interface CheckResult { news: News[]; error: string | null }

const INTERVAL = 3 * 3600 * 1000;
const SEQUEL_INTERVAL = 20 * 3600 * 1000;
const AIR_KEY = 'afterglow.airCheck';
const SEQUEL_KEY = 'afterglow.sequelCheck';
const MANGA_KEY = 'afterglow.mangaCheck';

const lsNum = (k: string) => { try { return +(localStorage.getItem(k) || 0); } catch { return 0; } };
const lsNow = (k: string) => { try { localStorage.setItem(k, String(Date.now())); } catch { /* ignore */ } };
const isoNow = () => new Date().toISOString();
const fmtDate = (d: string) => new Date(d.length === 10 ? d + 'T00:00:00' : d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
/** A date within the last `days` days (or in the future). */
export const recentDate = (d: string | null | undefined, days: number) => !!d && Date.parse(d) > Date.now() - days * 86400000;
const fmtCh = (n: number) => String(Math.round(n * 10) / 10);
const tracked = (it: Item) => it.status !== 'dropped';

/** Store a changed season list. Returns false when nothing changed (no write, no sync). */
function storeSeasons(it: Item, list: Season[], extra: Partial<Item>) {
  const strip = (l: Season[]) => JSON.stringify(l.map(({ id: _id, ...x }) => x));
  const before = strip(seasonsOf(it)) + JSON.stringify({ u: it.upcoming || [], s: it.showStatus || '' });
  const after = strip(list) + JSON.stringify({ u: extra.upcoming || [], s: extra.showStatus || it.showStatus || '' });
  if (before === after) return false;
  store.update(it.id, extra);
  saveSeasons(store.get(it.id)!, list, { autoStatus: false });
  return true;
}

async function checkAnime(only: string[] | null, news: News[]) {
  const items = store.all('anime').filter(it => tracked(it) && it.seasonList?.some(x => x.anilistId) && (!only || only.includes(it.id)));
  if (!items.length) return;
  const want = new Set<number>();
  items.forEach(it => it.seasonList!.forEach(x => {
    if (x.anilistId && (only || !['FINISHED', 'CANCELLED'].includes(x.airing || ''))) want.add(x.anilistId);
  }));
  let sequels = new Map<number, Airing.Sequel[]>();
  if (only || Date.now() - lsNum(SEQUEL_KEY) > SEQUEL_INTERVAL) {
    const lastIds = [...new Set(items.map(it => lastShow(it)?.anilistId).filter((x): x is number => !!x))];
    sequels = await Airing.animeSequels(lastIds).catch(() => new Map());
    sequels.forEach(l => l.forEach(s => want.add(s.anilistId)));
    if (!only) lsNow(SEQUEL_KEY);
  }
  const info = want.size ? await Airing.anime([...want]) : new Map<number, Airing.AnimeAiring>();
  const now = isoNow();
  for (const it0 of items) {
    const it = store.get(it0.id);
    if (!it) continue;
    const list = seasonsOf(it).map(x => ({ ...x }));
    const removed = it.removedSeasons || [];
    const lastId = lastShow(it)?.anilistId;
    (lastId ? sequels.get(lastId) || [] : []).forEach(s => {
      if (list.some(x => x.anilistId === s.anilistId) || removed.includes(s.anilistId)) return;
      if (s.airing === 'FINISHED' && !recentDate(s.start, 300)) return; // older parts the user left out on purpose
      const what = s.format === 'MOVIE' ? 'New movie' : 'New season';
      const announced = s.airing === 'NOT_YET_RELEASED';
      list.push({ ...s, id: uid(), label: '', seen: 0, complete: false, newAt: now, aired: announced ? 0 : null });
      news.push({ item: it, kind: 'season', text: announced ? `${what} announced${s.start ? ` · from ${fmtDate(s.start)}` : ''}` : `${what} is out` });
    });
    const shows = list.filter(x => x.format !== 'MOVIE').length;
    const upcoming: Upcoming[] = [];
    list.forEach(x => {
      const a = x.anilistId ? info.get(x.anilistId) : undefined;
      if (!a) return;
      x.airing = a.status;
      if (a.episodes) x.episodes = a.episodes;
      if (a.aired != null) {
        if (x.aired != null && a.aired > x.aired && x.format !== 'MOVIE') {
          x.newAt = now;
          const n = a.aired - x.aired;
          news.push({ item: it, kind: 'ep', text: `${n > 1 ? `Episodes ${x.aired + 1}–${a.aired} are` : `Episode ${a.aired} is`} out${shows > 1 ? ` · ${x.label}` : ''}` });
        }
        x.aired = a.aired;
      }
      x.nextAt = a.next?.at || null;
      x.start = a.start || x.start || null;
      a.schedule.forEach(s => upcoming.push({ at: s.at, kind: 'ep', ep: s.ep, season: shows > 1 ? x.label : '', last: !!(x.episodes && s.ep === x.episodes) }));
      if (a.status === 'NOT_YET_RELEASED' && !a.schedule.length && a.start) {
        upcoming.push({ at: a.start + 'T00:00:00', dateOnly: true, kind: x.format === 'MOVIE' ? 'movie' : 'start', season: x.label });
      }
    });
    upcoming.sort((a, b) => a.at.localeCompare(b.at));
    storeSeasons(it, list, { upcoming: upcoming.slice(0, 12), airCheckedAt: now });
  }
}

async function checkSeries(only: string[] | null, news: News[]) {
  const items = store.all('series').filter(it => tracked(it) && /^tvmaze:\d+$/.test(it.external || '') && (only ? only.includes(it.id) : it.showStatus !== 'Ended'));
  let failed = 0;
  for (const it0 of items) {
    let s: Awaited<ReturnType<typeof Airing.series>>;
    try { s = await Airing.series(+it0.external!.split(':')[1]); } catch { failed++; continue; }
    await Airing.sleep(300); // TVmaze allows about 20 calls per 10 seconds
    const it = store.get(it0.id);
    if (!it) continue;
    const now = isoNow();
    const hasIds = !!it.seasonList?.some(x => x.tvmazeId);
    const list = seasonsOf(it).map(x => ({ ...x }));
    if (hasIds) {
      s.seasons.forEach(ts => {
        const running = s.upcoming.some(u => u.season === ts.number) && ts.aired > 0;
        const airing = ts.aired === 0 ? 'NOT_YET_RELEASED' : running || (ts.episodes && ts.aired < ts.episodes) ? 'RELEASING' : 'FINISHED';
        const x = list.find(o => o.tvmazeId === ts.tvmazeId);
        if (!x) {
          if ((it.removedSeasons || []).includes(ts.tvmazeId) || !recentDate(ts.premiere, 300)) return;
          list.push({
            id: uid(), tvmazeId: ts.tvmazeId, label: '', title: ts.name || '', episodes: ts.episodes,
            year: ts.premiere ? +ts.premiere.slice(0, 4) : null, cover: ts.cover || it.cover || '', format: 'TV',
            seen: 0, complete: false, newAt: now, aired: ts.aired, airing,
          });
          news.push({ item: it, kind: 'season', text: ts.aired ? `Season ${ts.number} is out` : `Season ${ts.number} announced${ts.premiere ? ` · from ${fmtDate(ts.premiere)}` : ''}` });
          return;
        }
        if (ts.episodes && ts.episodes > (x.episodes || 0)) x.episodes = ts.episodes;
        if (x.aired != null && ts.aired > x.aired) {
          x.newAt = now;
          const n = ts.aired - x.aired;
          news.push({ item: it, kind: 'ep', text: n > 1 ? `${n} new episodes · Season ${ts.number}` : `New episode · Season ${ts.number}, episode ${ts.aired}` });
        }
        x.aired = ts.aired;
        x.airing = airing;
        x.nextAt = s.upcoming.find(u => u.season === ts.number)?.at || null;
        x.start = ts.premiere || x.start || null;
      });
    }
    const upcoming: Upcoming[] = s.upcoming.map(u => ({ at: u.at, kind: 'ep', ep: u.ep, season: `Season ${u.season}`, name: u.name, dateOnly: u.dateOnly }));
    s.seasons
      .filter(ts => ts.aired === 0 && ts.premiere && !s.upcoming.some(u => u.season === ts.number) && Date.parse(ts.premiere) > Date.now() - 86400000)
      .forEach(ts => upcoming.push({ at: ts.premiere + 'T00:00:00', dateOnly: true, kind: 'start', season: `Season ${ts.number}` }));
    upcoming.sort((a, b) => a.at.localeCompare(b.at));
    const extra: Partial<Item> = { upcoming: upcoming.slice(0, 12), showStatus: s.status, airCheckedAt: now };
    if (hasIds) storeSeasons(it, list, extra);
    else if (JSON.stringify(it.upcoming || []) !== JSON.stringify(extra.upcoming) || it.showStatus !== s.status) store.update(it.id, extra);
  }
  if (failed && failed === items.length) throw new Error('network');
}

let airRunning = false;
/** New episodes and seasons. Runs at most every 3 hours unless forced; `ids` checks just those items. */
export async function checkEpisodes({ force = false, ids = null }: { force?: boolean; ids?: string[] | null } = {}): Promise<CheckResult> {
  if (airRunning || (!force && Date.now() - lsNum(AIR_KEY) < INTERVAL)) return { news: [], error: null };
  airRunning = true;
  const news: News[] = [];
  let error: string | null = null;
  try {
    await checkAnime(ids, news).catch(() => { error = 'network'; });
    await checkSeries(ids, news).catch(() => { error = 'network'; });
    if (!ids && !error) lsNow(AIR_KEY);
    const stamp = isoNow();
    [...new Set(news.map(n => n.item.id))].forEach(id => store.update(id, { newEpisodeAt: stamp }));
  } finally { airRunning = false; }
  return { news, error };
}

let mangaRunning = false;
/** New chapters from MangaDex (through the worker, needs the sync key). `ids` are MangaDex ids. */
export async function checkChapters({ force = false, ids = null }: { force?: boolean; ids?: string[] | null } = {}): Promise<CheckResult> {
  if (mangaRunning || (!force && Date.now() - lsNum(MANGA_KEY) < INTERVAL)) return { news: [], error: null };
  const list = store.all('manga').filter(m => m.mangadexId && tracked(m) && (ids ? ids.includes(m.mangadexId) : m.mdStatus !== 'completed'));
  if (!list.length) return { news: [], error: null };
  mangaRunning = true;
  const news: News[] = [];
  try {
    const all = [...new Set(list.map(m => m.mangadexId!))];
    for (let i = 0; i < all.length; i += 40) {
      const data = await workerFetch<{ series?: Record<string, { latest?: number; status?: string }> }>('/manga/latest', { method: 'POST', body: { ids: all.slice(i, i + 40) } });
      const now = isoNow();
      Object.entries(data.series || {}).forEach(([id, info]) => {
        store.all('manga').filter(m => m.mangadexId === id).forEach(m => {
          const patch: Partial<Item> = { chapterCheckedAt: now };
          if (info.status) patch.mdStatus = info.status;
          if (info.latest && info.latest > (m.chapters || 0)) {
            patch.chapters = info.latest;
            patch.lastUpload = now;
            patch.newChapterAt = now;
            const n = info.latest - (m.chapters || 0);
            news.push({ item: m, kind: 'chapter', text: n > 1 && m.chapters ? `Chapters ${fmtCh(m.chapters + 1)}–${fmtCh(info.latest)} are out` : `Chapter ${fmtCh(info.latest)} is out` });
          }
          store.update(m.id, patch);
        });
      });
    }
    if (!ids) lsNow(MANGA_KEY);
  } catch (e) {
    return { news, error: (e as { code?: string }).code || 'network' };
  } finally { mangaRunning = false; }
  return { news, error: null };
}
