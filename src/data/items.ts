/** Rules for items: trophies, playtime, seasons, episodes, chapters, releases. No UI. */
import { STATUS } from './constants';
import { store, uid } from './store';
import { TIERS, levelFromPoints } from './trophies';
import type { Item, Season, Trophy, Upcoming } from './types';

export const statusLabel = (item: Item) => STATUS[item.type]?.[item.status] || '';

/* ---------- Trophies across all games ---------- */

export function allTrophyStats(games = store.all('game')) {
  let pts = 0, earned = 0, total = 0;
  const counts = { bronze: 0, silver: 0, gold: 0, platinum: 0 };
  games.forEach(g => (g.trophies || []).forEach(t => {
    total++;
    if (t.done) { earned++; counts[t.tier]++; pts += TIERS[t.tier].points; }
  }));
  return { pts, counts, earned, total, level: levelFromPoints(pts) };
}

export function recentTrophies(limit = 6, games = store.all('game')) {
  const out: { t: Trophy; g: Item }[] = [];
  games.forEach(g => (g.trophies || []).forEach(t => { if (t.done && t.doneAt) out.push({ t, g }); }));
  return out.sort((a, b) => b.t.doneAt!.localeCompare(a.t.doneAt!)).slice(0, limit);
}

/* ---------- Playtime: own value wins over Steam/PlayStation ---------- */

export const hoursOf = (it: Item) => it.playH != null ? it.playH : it.playMin != null ? it.playMin / 60 : null;
/** "12,5", "12.5", "12 h" → 12.5; empty → null; nonsense → undefined. */
export function parseHours(v: unknown): number | null | undefined {
  const t = String(v ?? '').trim().replace(/\s*(h|hrs?|hours?|std\.?|stunden)$/i, '').replace(',', '.');
  if (!t) return null;
  const n = +t;
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 10) / 10 : undefined;
}

/* ---------- Seasons (series and anime) ---------- */

export const isImplicit = (x: Season) => String(x.id).startsWith('implicit');
/** Automatic names, English or from Nightshelf (German). */
const AUTO_LABEL = /^((Staffel|Season) \d+|(Film|Movie)( \d+)?)$/;

/** Renumber automatic names ("Season 3", "Movie 2") without gaps. Mutates and returns the list. */
export function relabel(list: Season[]) {
  const shows = list.filter(x => x.format !== 'MOVIE'), movies = list.filter(x => x.format === 'MOVIE');
  shows.forEach((x, i) => { if (!x.label || AUTO_LABEL.test(x.label)) x.label = `Season ${i + 1}`; });
  movies.forEach((x, i) => { if (!x.label || AUTO_LABEL.test(x.label)) x.label = movies.length > 1 ? `Movie ${i + 1}` : 'Movie'; });
  return list;
}

export function seasonsOf(item: Item): Season[] {
  if (item.seasonList?.length) return relabel(item.seasonList);
  if (item.type === 'series') {
    const n = Math.max(1, item.seasons || 1);
    return Array.from({ length: n }, (_, i) => ({
      id: `implicit-${i + 1}`, title: item.title, label: `Season ${i + 1}`, episodes: null, seen: 0,
      complete: i < (item.seasonSeen || 0), year: null, cover: '',
    }));
  }
  return [{ id: 'implicit-1', title: item.title, label: 'Season 1', format: 'TV', episodes: item.episodes || null, seen: item.episodesSeen || 0, year: item.year || null, cover: item.cover || '' }];
}

export function seasonTotals(list: Season[]) {
  const known = list.filter(x => x.episodes);
  const sum = known.reduce((a, x) => a + (x.episodes || 0), 0);
  return {
    episodes: known.length === list.length ? sum : (sum || null),
    episodesSeen: list.reduce((a, x) => a + (x.seen || 0), 0),
  };
}

export const seasonDone = (x: Season) => !!x.complete || (!!x.episodes && (x.seen || 0) >= x.episodes);

const currentIndex = (list: Season[]) => {
  let i = list.findIndex(x => (x.seen || 0) > 0 && !seasonDone(x));
  if (i < 0) i = list.findIndex(x => !seasonDone(x));
  return i < 0 ? list.length - 1 : i;
};
export const currentSeason = (item: Item) => { const l = seasonsOf(item); return l[currentIndex(l)]; };

/** Save a season list: totals, watch log, and status (active/done) unless told not to. */
export function saveSeasons(item: Item, list: Season[], { autoStatus = true } = {}) {
  relabel(list);
  list.forEach(x => { if (x.episodes && (x.seen || 0) < x.episodes && x.complete) x.complete = false; });
  const tot = seasonTotals(list);
  const patch: Partial<Item> = { seasonList: list, ...tot };
  if (item.type === 'series') { patch.seasons = list.length; patch.seasonSeen = list.filter(seasonDone).length; }
  const before = item.episodesSeen ?? seasonTotals(seasonsOf(item)).episodesSeen;
  const delta = tot.episodesSeen - (before || 0);
  if (autoStatus && delta > 0) patch.watchLog = [...(item.watchLog || []), { at: new Date().toISOString(), n: delta }].slice(-3000);
  if (autoStatus && !['dropped', 'paused'].includes(item.status)) {
    if (list.every(seasonDone)) patch.status = 'done';
    else if (list.some(x => (x.seen || 0) > 0 || seasonDone(x))) patch.status = 'active';
  }
  return store.update(item.id, patch);
}

/** Seasons with real ids (implicit ones get one), ready to edit. */
export const materialize = (it: Item) => seasonsOf(it).map(x => ({ ...x, id: isImplicit(x) ? uid() : x.id }));
export const lastShow = (it: Item) => [...seasonsOf(it)].reverse().find(x => x.format !== 'MOVIE');

/* ---------- New episodes and chapters ---------- */

/** Released episodes of a season: from airing data, else the total. */
export const released = (x: Season) => x.aired != null ? (x.episodes ? Math.min(x.aired, x.episodes) : x.aired) : (x.episodes || 0);
export const epTotal = (x: Season) => x.episodes || (x.aired != null && x.aired > 0 ? x.aired : null);
/** Counts as new: a season that got new episodes, or a running season you have started. */
export const countsAsNew = (x: Season) =>
  x.format !== 'MOVIE' && !x.complete && (!!x.newAt || (x.airing === 'RELEASING' && (x.seen || 0) > 0));

export function episodesBehind(item: Item) {
  if (!['anime', 'series'].includes(item.type) || !item.seasonList?.length) return 0;
  return item.seasonList.filter(countsAsNew).reduce((a, x) => a + Math.max(0, released(x) - (x.seen || 0)), 0);
}
export const mangaBehind = (m: Item) => (m.chapters != null ? Math.max(0, m.chapters - (m.chaptersRead || 0)) : 0);
export const newCount = (it: Item) => it.type === 'manga' ? mangaBehind(it) : episodesBehind(it);
export const showsNew = (it: Item) => ['active', 'paused', 'done'].includes(it.status) && newCount(it) > 0;
export const newItems = () => store.all().filter(showsNew).sort((a, b) =>
  (b.newEpisodeAt || b.newChapterAt || b.updatedAt || '').localeCompare(a.newEpisodeAt || a.newChapterAt || a.updatedAt || ''));

export function saveManga(item: Item, patch: Partial<Item>) {
  const read = patch.chaptersRead ?? item.chaptersRead ?? 0;
  const total = Math.max(patch.chapters ?? item.chapters ?? 0, read) || null;
  const delta = read - (item.chaptersRead || 0);
  const p: Partial<Item> = { ...patch, chaptersRead: read, chapters: total };
  if (delta > 0) p.readLog = [...(item.readLog || []), { at: new Date().toISOString(), n: delta }].slice(-3000);
  if (!['dropped', 'paused'].includes(item.status)) {
    if (total && read >= total && item.mdStatus === 'completed') p.status = 'done';
    else if (read > 0 && item.status !== 'done') p.status = 'active';
    else if (read > 0 && item.status === 'done' && total && read < total) p.status = 'active';
  }
  return store.update(item.id, p);
}

/** Progress 0..1 for running items (episodes, chapters), or null. */
export function mediaProgress(item: Item): number | null {
  if (['anime', 'series'].includes(item.type) && item.seasonList?.length) {
    const shows = item.seasonList.filter(x => x.format !== 'MOVIE');
    const total = shows.reduce((a, x) => a + (released(x) || 0), 0);
    const seen = shows.reduce((a, x) => a + Math.min(x.seen || 0, released(x) || x.seen || 0), 0);
    return total ? seen / total : null;
  }
  if (item.type === 'anime' && item.episodes) return (item.episodesSeen || 0) / item.episodes;
  if (item.type === 'manga' && item.chapters) return Math.min(1, (item.chaptersRead || 0) / item.chapters);
  return null;
}

/* ---------- +1: next episode, chapter, season or trophy ---------- */

export function plusOneLabel(item: Item): 'Trophy' | 'Season' | 'Chapter' | 'Episode' | null {
  if (item.type === 'game') return (item.trophies || []).some(t => !t.done && t.tier !== 'platinum') ? 'Trophy' : null;
  if (item.type === 'series' && !item.seasonList?.some(x => x.episodes)) return item.seasons && (item.seasonSeen || 0) < item.seasons ? 'Season' : null;
  if (item.type === 'manga') return item.chapters && (item.chaptersRead || 0) >= item.chapters ? null : 'Chapter';
  if (!['series', 'anime'].includes(item.type)) return null;
  const cur = currentSeason(item);
  if (!cur || cur.format === 'MOVIE' || seasonDone(cur)) return null;
  const max = epTotal(cur);
  return max && (cur.seen || 0) < max ? 'Episode' : null;
}

export function plusOne(item: Item) {
  if (item.type === 'series' && !item.seasonList?.some(x => x.episodes)) {
    store.update(item.id, { seasonSeen: Math.min(item.seasons || Infinity, (item.seasonSeen || 0) + 1) });
    return;
  }
  if (item.type === 'manga') { saveManga(item, { chaptersRead: Math.floor(item.chaptersRead || 0) + 1 }); return; }
  const list = materialize(item), x = list[currentIndex(seasonsOf(item))];
  x.seen = Math.min(epTotal(x) || Infinity, (x.seen || 0) + 1);
  if (!x.episodes || x.seen < x.episodes) x.complete = false;
  saveSeasons(item, list);
}

/* ---------- Releases and the calendar ---------- */

const isoDay = /^\d{4}-\d{2}-\d{2}/;
const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };

/** Not out yet: the date (or year) it comes out, else null. */
export function releaseInfo(item: Item): { date?: string | null; year?: number } | null {
  const today = startOfToday();
  const future = (d?: string | null) => !!d && isoDay.test(d) && Date.parse(d.slice(0, 10) + 'T00:00:00') > today;
  if (['game', 'movie'].includes(item.type) && future(item.released)) return { date: item.released!.slice(0, 10) };
  if (['anime', 'series'].includes(item.type) && item.seasonList?.length) {
    const shows = item.seasonList.filter(x => x.format !== 'MOVIE');
    if (shows.length && shows.every(x => x.airing === 'NOT_YET_RELEASED' || (x.aired === 0 && !x.seen))) {
      const x = shows[0];
      return { date: x.nextAt ? x.nextAt.slice(0, 10) : x.start || (future(item.released) ? item.released!.slice(0, 10) : null) };
    }
  }
  if (!item.released && item.year && item.year > new Date().getFullYear() && item.type !== 'manga') return { year: item.year };
  return null;
}

export type CalendarEntry = Upcoming & { it: Item; t: number };

/** Everything coming up from your own items, soonest first. */
export function upcomingEntries(items = store.all()): CalendarEntry[] {
  const today = startOfToday(), now = Date.now(), out: CalendarEntry[] = [];
  items.forEach(it => {
    if (it.status === 'dropped') return;
    (it.upcoming || []).forEach(u => { const t = Date.parse(u.at); if (u.dateOnly ? t >= today : t > now) out.push({ it, ...u, t }); });
    if ((it.type === 'movie' || it.type === 'game') && isoDay.test(it.released || '')) {
      const t = Date.parse(it.released!.slice(0, 10) + 'T00:00:00');
      if (t >= today) out.push({ it, at: it.released!, t, dateOnly: true, kind: it.type });
    }
  });
  return out.sort((a, b) => a.t - b.t);
}

export function upcomingText(u: CalendarEntry) {
  if (u.kind === 'ep') return [u.season, `Episode ${u.ep}${u.last ? ' (finale)' : ''}`, u.name].filter(Boolean).join(' · ');
  if (u.kind === 'start') return `${u.season} starts`;
  if (u.kind === 'movie') return u.it.type === 'movie' ? 'In cinemas' : `${u.season} comes out`;
  if (u.kind === 'game') return `Comes out${u.it.platform ? ` on ${u.it.platform}` : ''}`;
  return '';
}

/* ---------- Anime movies: find the series they belong to ---------- */

export const normTitle = (t?: string) => (t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '');
const titleSegment = (t?: string) => normTitle(String(t || '').split(/[:!]| - |-(?=[A-Za-z])/)[0]);

export function findAnimeFor({ anilistId, relatedIds = [], title }: { anilistId: number; relatedIds?: number[]; title: string }) {
  const anime = store.all('anime');
  const idsOf = (a: Item) => [a.anilistId, ...(a.seasonList || []).map(x => x.anilistId)].filter(Boolean) as number[];
  const own = anime.find(a => idsOf(a).includes(anilistId));
  if (own) return { item: own, already: true };
  const rel = anime.find(a => idsOf(a).some(id => relatedIds.includes(id)));
  if (rel) return { item: rel, already: false };
  const seg = titleSegment(title);
  const byName = seg.length >= 6 ? anime.find(a => { const sa = titleSegment(a.title); return sa.length >= 6 && (seg.startsWith(sa) || sa.startsWith(seg)); }) : undefined;
  return byName ? { item: byName, already: false } : null;
}

export function attachMovies(item: Item, movies: Season[]) {
  const list = materialize(item);
  movies.forEach(mv => {
    if (mv.anilistId && list.some(x => x.anilistId === mv.anilistId)) return;
    list.push({ ...mv, id: uid(), format: 'MOVIE', label: undefined });
  });
  saveSeasons(item, list, { autoStatus: false });
}
